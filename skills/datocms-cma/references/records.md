# Records (Items)

Records: model instances. Most-used CMA resource.

> In CLI mode, endpoint shapes / payloads / TS signatures: `npx datocms cma:docs {items|itemVersions} <action>` (add `--expand-types '*'` for full TS definitions). Only what docs don't carry below.

## Contents

- Reading: `nested: true` is the primary knob
- Selective publish / unpublish
- `validateNew` / `validateExisting` — preflight without commit
- Versions and restore
- Field value formats — beyond the simple types
- Reading structured text as dastdown markdown
- Bulk operations are async + 200-cap
- Typed records via generated `Schema.X`

## Reading: `nested: true` is the primary knob

Records with Modular Content / Structured Text / Single Block fields default to returning **block IDs**, not block content. To get full block payloads inline, pass `nested: true`:

```ts
const record  = await client.items.find<Schema.BlogPost>("id"); // blocks as ID strings
const nested  = await client.items.find<Schema.BlogPost>("id", { nested: true }); // blocks as full objects
```

Two consequences:

- Without `nested: true`, you only have block ids — must re-fetch parent with nested to read contents.
- With `nested: true`, API max page size drops from 500 to 30; iterator won't lower `perPage` for you (see `references/filtering-and-pagination.md`). Plan for round-trip cost on large scans.

For ordinary `find`, `list`, and paged reads, `version: "current"` (the default) returns the latest edits, including drafts; `version: "published"` reads the published versions. Use `current` when inspecting preview content. A record with unpublished edits can have different current and published values.

Check `meta.published_at` before fetching the published version for preservation checks. A never-published draft has no published version: `find(id, { version: "published" })` returns `NOT_FOUND`, not a fallback to current content. Verify that such a record remains unpublished through its metadata.

Reference-discovery endpoints have a separate `version` contract: `published-or-current` searches links in either version. It does not mean "prefer published content, otherwise return the draft" and is not an ordinary record-read preview option. Consult the reference-discovery method documentation for its options.

## Selective publish / unpublish

Body is optional — omit it to publish/unpublish the entire record. Pass an object to limit to specific locales or non-localized content only:

```ts
await client.items.publish(id, {
  content_in_locales: ["en", "it"],
  non_localized_content: true,
});
```

Useful when some locales finish before others — publish ready locales now without lying about field values to satisfy validators.

For tree-model records, `{ recursive: true }` as the third argument auto-cascades:

- `publish` with `recursive: true` auto-publishes unpublished parents (avoids `UNPUBLISHED_PARENT`).
- `unpublish` with `recursive: true` auto-unpublishes published children (avoids dangling published descendants).

Linked-record publication is a different mechanism: the linking field's `on_publish_with_unpublished_references_strategy` decides whether an unpublished reference blocks publication (`fail`) or is published with it (`publish_references`). See `schema.md` → "Reference-cascade strategies" for the field settings.

A single cascading publication runs in a transaction: a blocked or invalid dependency can abort the requested publication and its cascade. Inspect the API error's available dependency details (including the cascade path when provided) to identify the blocker. Do not assume partial success, blindly retry unchanged content, change validators, or publish additional records outside the user's authorization. This transaction boundary does not imply that an entire bulk job is atomic; inspect its result separately.

## `validateNew` / `validateExisting` — preflight without commit

Same input shapes as `create` / `update` respectively, but no commit. Throw the same `ApiError` shape on validation failure.

## Versions and restore

`itemVersions.listPagedIterator(recordId)` walks history. `itemVersions.restore(versionId)` creates a **new current version** from the selected version without deleting history. Publication depends on the model's `draft_mode_active` setting:

- **Draft mode enabled:** the restored version is unpublished; any previously published version stays live. Publish the restored content only when authorized.
- **Draft mode disabled:** restoring automatically publishes the restored content. A request to restore without changing live content cannot use this operation on that model; explain the constraint before writing, and do not change the model's draft-mode setting without authorization.

Check the model setting before restoring and verify the current and published content afterward. Do not promise that restoration leaves publication unchanged.

## Field value formats — beyond the simple types

Scalar types (`string`, `integer`, `float`, `boolean`, `date`, `date_time`, `slug`, `text`, `json` as a stringified JSON) take the values their TypeScript types suggest. The structural ones below are the ones that surprise:

- **Color**: `{ red, green, blue, alpha }` — each 0–255, including alpha (not 0–1).
- **LatLon**: `{ latitude, longitude }`.
- **SEO**: `{ title, description, image: <upload-id> | null, twitter_card: "summary" | "summary_large_image" | null, no_index: boolean | null }`.
- **Video (external)**: `{ url, title, width, height, provider, provider_uid, thumbnail_url }` — providers are `youtube` | `vimeo` | `facebook`. The CMA does not auto-fetch metadata; you must populate all fields.
- **Single file**: minimal `{ upload_id }` (uses upload's `default_field_metadata`); to override, provide all four `{ upload_id, alt, title, custom_data, focal_point }` (omitted ones become `null`/`{}`, not the upload's defaults — see `references/uploads.md` § Metadata).
- **Gallery**: array of single-file objects (same shape as above, per element).
- **Single link**: a record id string or `null`.
- **Multiple links**: array of record id strings.

Modular Content, Structured Text, and Single Block fields are complex enough to merit their own reference — see `references/editing-records.md`.

## Reading structured text as dastdown markdown

Pure DAST inspection and conversion belongs to `datocms-structured-text` when that skill is available. This section keeps the CMA read and Dastdown behavior needed by runtimes that retrieve this reference directly.

The `datocms-structured-text-dastdown` package serializes a DAST tree to a markdown-like string (and parses it back). For read-only use — displaying content, feeding to an LLM, extracting plain text, diffing — `serialize` alone is enough; `parse` is for the editing round-trip (see `editing-records.md` § Pass 1).

> If the selected runtime already supplies `parse` / `serialize`, omit their imports; otherwise import them as shown.

```ts
import { serialize } from "datocms-structured-text-dastdown";

const article = await client.items.find<Schema.Article>(id, { nested: true });
if (article.content) {
  const text = serialize(article.content);
  // text is dastdown markdown — paragraphs, headings, lists, blocks-as-id placeholders
}
```

`nested: true` matters here too: without it, blocks inside the structured text are id strings only, and `serialize` encodes them as `<block id="…"/>` placeholders without any block content visible.

### dastdown syntax — what's NOT plain markdown

Markdown-identical: `# H1`–`###### H6`, paragraphs, `- ` / `1. ` lists (2-space indent for nesting), `> ` blockquote, ` ```lang ` fences, `---` thematic break, `**strong**` `*emphasis*` `` `code` `` `~~strike~~`, `[text](url)`, `\` escapes.

**Tables are NOT supported!**

The following example uses placeholder record IDs; substitute IDs from the original document before an editing round-trip:

````markdown
# Heading {style="display"}

Paragraph with ==highlight==, ++underline++, <m k="footnote-ref">custom mark</m>, and a<br/>line break.
{style="lead"}

> Quote body.
{attribution="Oscar Wilde"}

```js {highlight=[0,2]}
const first = 1;
const second = 2;
console.log(first + second);
```

[External link](https://example.com){rel="nofollow" target="_blank"}
[Record link](dato:item/RECORD_ID){rel="nofollow"}
<inlineItem id="INLINE_RECORD_ID"/> <inlineBlock id="INLINE_BLOCK_ID"/>

<block id="BLOCK_ID"/>
````

Rules that bite:

- `<block|inlineBlock|inlineItem id="…"/>` and `dato:item/ID`: opaque record refs. Don't invent ids — `parse(text, original)` throws on unknown `block`/`inlineBlock` ids; create them in Pass 2 (see `editing-records.md`) instead.
- Mark canonical order outer→inner: `highlight → strikethrough → underline → strong → emphasis → code`; custom marks innermost, alphabetical. Serializer rewrites freely — don't depend on input order.
- Canonicalization also drops empty spans and coalesces adjacent same-marks spans. `parse(null|undefined)` → `null`; `parse("")` → single empty paragraph.

## Bulk operations are async + 200-cap

`bulkPublish`, `bulkUnpublish`, `bulkDestroy`, `bulkMoveToStage` accept `{ items: [{ id, type: "item" }] }` and run as background jobs (the simplified client awaits completion). Max **200 items per request** — chunk larger sets. See `references/client-types-and-behaviors.md` § Technical Limits.

## Typed records via generated `Schema.X`

Every method that returns or accepts a record (`find`, `list`, `create`, `update`, `publish`, etc.) takes a generic `Schema.X`. Pass a generated `Schema.BlogPost` marker and TypeScript knows the per-field shape — `record.title` is `string | null`, `record.cover_image` is the file shape, etc. — instead of `unknown`.

```ts
const post = await client.items.find<Schema.BlogPost>(id);          // blocks as ID strings
const nested = await client.items.find<Schema.BlogPost>(id, { nested: true }); // blocks expanded
```

To extract the type of a specific field for an intermediate variable, index `ApiTypes.Item<Schema.BlogPost>["field_api_key"]` (or `ApiTypes.ItemInNestedResponse<…>["…"]` when reading nested). For create/update payloads, `ApiTypes.ItemCreateSchema<Schema.BlogPost>` / `ApiTypes.ItemUpdateSchema<Schema.BlogPost>`. For local scripts that need generated types, see `references/type-generation.md`.
