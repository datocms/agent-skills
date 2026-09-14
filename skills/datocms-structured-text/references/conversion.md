# Conversion

Convert local Markdown/HTML to DAST, or render a document to another representation. Document acquisition, uploads, schema changes, and record writes belong to their integration owners. No DatoCMS credentials needed here.

## Local conversion helper

Use Node **>=20.19.0**, the minimum required by the locked dependencies. Copy the runtime into task-local scratch, then install once and reuse it. Replace `/absolute/path/to/datocms-structured-text` with this installed skill's actual path and use absolute input/output paths.

```bash
runtime_dir="$(mktemp -d "${TMPDIR:-/tmp}/structured-text.XXXXXX")"
cp /absolute/path/to/datocms-structured-text/scripts/convert.mjs "$runtime_dir/"
cp /absolute/path/to/datocms-structured-text/scripts/package.json "$runtime_dir/"
cp /absolute/path/to/datocms-structured-text/scripts/package-lock.json "$runtime_dir/"
(cd "$runtime_dir" && npm ci --ignore-scripts --no-audit --no-fund)
node "$runtime_dir/convert.mjs" \
  --input /absolute/path/source.md \
  --format markdown \
  --output /absolute/path/document.json \
  --report /absolute/path/report.json
```

Use `--format html` for HTML. Never install dependencies into the shipped skill directory or package `node_modules`. Installation needs the npm registry; conversion itself reads/writes local files and makes no network requests.

Exit `0`: audited supported source, structurally valid DAST written atomically, JSON report written. Exit `1`: inspect diagnostics; requested DAST output remains unchanged. Reports use `{version: 1, ok, format, diagnostics, normalizations}`; each diagnostic includes `code`, `message`, `action`, and a source position when available. Invalid/aliased file paths produce JSON on stderr instead of risking an input/output overwrite. Use distinct input, output, and report files.

The helper recognizes supported prose, not every document accepted by its parsers:

| Input | Supported directly | Requires mapping or explicit source adaptation |
| - | - | - |
| Markdown | Headings, paragraphs, lists, blockquotes within DAST nesting rules, emphasis/strong/code/strikethrough, links, fenced code, thematic breaks, Unicode | Images, tables, task-list semantics, footnotes, embedded raw HTML, custom list numbering, incompatible nesting |
| HTML | Semantic paragraphs/headings/lists, compatible blockquotes, links, code, supported marks and basic inline font-weight/font-style/underline | Images/media/embeds, tables, unknown attributes/CSS, layout semantics, unsupported tags or nesting |
| Google Docs export | Supported prose in an exported Markdown file; supported semantic HTML after inspection | Comments/suggestions, document layout, arbitrary export CSS, inaccessible images, and other features without an explicit mapping |

Root-level inline HTML needs a paragraph. Ordered lists start at one. Empty list items require explicit content or a custom mapping to preserve list positions; the helper reports `EMPTY_LIST_ITEM`. DAST blockquotes contain paragraphs; list items contain paragraphs or nested lists. Metadata, comments, document wrappers, whitespace, and final code newlines have documented normalizations in the report. Review those alongside the output.

## Fidelity and unsupported features

Markdown follows `remark-parse` + `remark-gfm` → `mdast-util-to-hast` → `hastToStructuredText`. GFM recognition enables detection; it does not create native DAST table/task/image nodes. HTML follows parse5 → `parse5ToStructuredText`. Source auditing runs before conversion because default converter handlers may omit unsupported features without proving fidelity.

On an unsupported feature, keep the source and failed report. Decide the destination representation before retrying: an image block, linked record, plain prose with an explicitly accepted loss, or another schema-specific mapping. Do not silently strip content to make validation pass. Raw HTML embedded in Markdown is initially unsupported even if its tags look simple.

Google Docs is an acquisition format, not an authentication feature of this skill. Use a supplied Markdown/HTML export or an already-authorized document connector. Inspect the export's actual features and available media. Do not start Google authentication merely to convert a local file, promise layout fidelity, or treat inaccessible media as successfully imported.

## Task-specific mappings

For unsupported content, use the official converter in task code. Reuse the scratch dependencies when sufficient. Inspect the installed handler types: handlers return DAST nodes (or arrays/undefined) and receive conversion context; `preprocess` transforms the HAST tree. The Node entrypoints are `hastToStructuredText` and `parse5ToStructuredText`; `htmlToStructuredText` expects a browser DOM parser.

Resolve a mapping in this order:

1. Inventory unsupported nodes and source identifiers/URLs; decide their destination meaning.
2. With the integration owner, inspect the existing field's permitted blocks/records and choose an explicit mapping. Upload/create only when that is part of the authorized task.
3. Build a lookup from source identifiers to destination references or typed block payloads. Keep cross-project IDs out of the destination unless resolved there.
4. Supply narrow converter handlers for those nodes. For an image handler, return a `block` at a valid block position; split paragraphs or preprocess standalone images when necessary. Inline placement requires a permitted inline representation. Do not insert a root block inside paragraph children.
5. Audit the rest of the source too, validate the result, check mapping completeness, and let the integration owner write/read back the field.

The helper has no mapping language, upload support, or automatic block creation. Do not bypass its failed audit by calling a default converter and claiming success. A custom conversion must account explicitly for all reported features. Converter options such as `allowedBlocks`, `allowedMarks`, and `allowedHeadingLevels` control conversion; they do not verify destination schema or preserve excluded content automatically.

## Output and extraction

Use `datocms-structured-text-to-plain-text` for readable text and `datocms-structured-text-to-html-string` for framework-independent HTML. Both expose `render`. Install only the selected package in task scratch. For React/Vue/Svelte/Astro component rendering, use `datocms-frontend-integrations` instead.

```js
import { render as toPlainText } from 'datocms-structured-text-to-plain-text';
import { render as toHtml } from 'datocms-structured-text-to-html-string';

// Prose-only DAST document: no unresolved embedded references.
const text = toPlainText(document);
const html = toHtml(document);
```

Plain-text output loses marks and link destinations. Its default handling can omit embedded records/blocks; resolve them and provide callbacks when their content matters. HTML rendering requires suitable handlers/data for embedded references and throws for missing required renderers. A bare document has IDs/payloads, not the CDA records needed for rendering; `datocms-cda` owns querying and assembling the response envelope. Verify that every referenced item intended for output is resolved.

Use renderer callbacks for block/inline content and `adapter.renderNode` for HTML elements so text/attributes are escaped. Apply the application's URL policy to supplied links/media. Do not interpolate untrusted content into raw HTML strings. Dastdown is the editing/round-trip notation described in [Editing](editing.md); it is not plain-text extraction or a general Markdown fidelity guarantee.

## Implementation sources

- [Converter entrypoints/options](https://github.com/datocms/structured-text/blob/97fc3da80b466267f91ba87f064f173f907af5f9/packages/html-to-structured-text/src/index.ts#L24-L75) and [default handlers](https://github.com/datocms/structured-text/blob/97fc3da80b466267f91ba87f064f173f907af5f9/packages/html-to-structured-text/src/handlers.ts#L512-L578): implementation authority for converter behavior.
- [Image lifting](https://github.com/datocms/structured-text-migration-example/blob/7ca8373c335e669bbe4678fa6562153b2ab93480/migrations/utils/convertImgsToBlocks.ts#L21-L87) and [image-to-block mapping](https://github.com/datocms/structured-text-migration-example/blob/7ca8373c335e669bbe4678fa6562153b2ab93480/migrations/utils/convertImgsToBlocks.ts#L88-L109): worked migration patterns; adapt older dependencies and APIs to the installed packages.
- [Plain-text renderer](https://github.com/datocms/structured-text/blob/97fc3da80b466267f91ba87f064f173f907af5f9/packages/to-plain-text/src/index.ts#L138-L248) and [HTML renderer](https://github.com/datocms/structured-text/blob/97fc3da80b466267f91ba87f064f173f907af5f9/packages/to-html-string/src/index.ts#L119-L252): reference resolution and callbacks.
