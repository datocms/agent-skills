# Structured Text document model

## Representations

| Input | Document location | Reference data |
| - | - | - |
| Standalone DAST | `{ schema: "dast", document: { type: "root", children: [...] } }` | IDs; no implied project access |
| CMA Structured Text field | Selected locale's value is DAST or `null`; a localized field may wrap values in a locale map | Default reads use block IDs; nested reads may carry block objects |
| CDA field response | Envelope's `value` contains DAST | `blocks`, `links`, `inlineBlocks` resolve referenced records |
| Plugin editor value | Slate value in SDK form state | Different representation; use plugin-specific conversion |

Never save a CDA envelope as a CMA field or pass raw DAST as a native Slate form value. Work on the document while preserving integration-specific reference data. Extracting `value` alone does not copy linked/embedded records into another project.

## Shape and nodes

```json
{
  "schema": "dast",
  "document": {
    "type": "root",
    "children": [
      {
        "type": "paragraph",
        "children": [{ "type": "span", "value": "Hello, world!" }]
      }
    ]
  }
}
```

| Node | Children / content |
| - | - |
| `root` | `paragraph`, `heading`, `list`, `code`, `blockquote`, `block`, `thematicBreak` |
| `paragraph`, `heading` | `span`, `link`, `itemLink`, `inlineItem`, `inlineBlock`; heading `level` is 1–6 |
| `list` | `listItem`; `style` is `bulleted` or `numbered` |
| `listItem` | `paragraph`, nested `list` |
| `blockquote` | `paragraph`; optional `attribution` |
| `link`, `itemLink` | `span` children; no nested links or inline embeds |
| `span` | Text in `value`; optional `marks`; newline is literal `\n` |
| `code` | Text in `code`; optional `language`, zero-based `highlight` line numbers |
| `block`, `inlineBlock`, `inlineItem` | Leaf reference in `item` |
| `thematicBreak` | Leaf separator |

`block` is root-only; `inlineBlock` lives in paragraph/heading text flow. No native table or image node. Images require an explicit representation, commonly a schema-specific image block.

Default marks: `strong`, `emphasis`, `code`, `underline`, `strikethrough`, `highlight`. Preserve custom marks and paragraph/heading `style` when editing; a project may restrict which values are allowed. External `link` uses `url`; `itemLink` and `inlineItem` use record IDs. Link metadata is an array of `{ id, value }`, not an attribute object.

## Reference identity

- Distinguish normal record links from embedded block identities. Never invent IDs to make a payload look complete.
- Dastdown serializes block IDs even when the original document contains nested objects; it does not reveal their fields. Keep the original document for rehydration.
- Moving content across records, fields, locales, or projects can require duplicating blocks and remapping references. The CMA integration owns those write rules.
- A normal URL does not automatically resolve to an `itemLink`. Require an explicit URL-to-record mapping.

## Validation and diagnosis

Use `datocms-structured-text-utils` for structural checks; check the wrapper explicitly when an actual document is required. Null may represent an unset field, but is not a converted document.

```js
import { validate } from 'datocms-structured-text-utils';

export function assertDocument(document) {
  if (!document || document.schema !== 'dast' || document.document?.type !== 'root') {
    throw new Error('Expected a DAST document wrapper');
  }
  let result;
  try {
    result = validate(document);
  } catch (error) {
    throw new Error(`DAST validation failed: ${error instanceof Error ? error.message : String(error)}. Check node types and required properties.`);
  }
  if (!result.valid) throw new Error(result.message);
  return document;
}
```

Validation layers answer different questions:

1. **Document structure:** node types, attributes, children, wrapper. Use library types/guards as well as runtime validation; the validator is not a complete schema or semantic checker.
2. **Source preservation:** expected text, marks, links, structure, and embedded references survived the requested transformation. Valid JSON/DAST is insufficient.
3. **Destination constraints:** allowed nodes/marks/headings, block models, inline-block models, linked-record models, required fields and locale. Inspect the actual field when writing.
4. **Reference resolution and API acceptance:** records/uploads exist in the intended environment; embedded block ownership and version/locale rules are satisfied. Verify through the integration owner.

For invalid input, report the offending node/path and expected shape before proposing the smallest correction. Example: a root-level `span` needs a containing `paragraph`; do not replace the whole document or drop the text. Do not flatten unsupported structure just to make validation pass.

## Source authority

[DAST types](https://github.com/datocms/structured-text/blob/97fc3da80b466267f91ba87f064f173f907af5f9/packages/utils/src/types.ts#L24-L75), [link child types](https://github.com/datocms/structured-text/blob/97fc3da80b466267f91ba87f064f173f907af5f9/packages/utils/src/types.ts#L364-L415), [runtime validator](https://github.com/datocms/structured-text/blob/97fc3da80b466267f91ba87f064f173f907af5f9/packages/utils/src/validate.ts#L9-L17). Check installed versions when implementation behavior differs.
