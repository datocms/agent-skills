# Records (Items)

Records: model instances. Most-used CMA resource.

> Endpoint shapes / payloads / TS sigs: `npx datocms cma:docs {items|itemVersions} <action>` (add `--expand-types '*'` for full TS definitions). Only what docs don't carry below.

## Reading: `nested: true` is the primary knob

Records with Modular Content / Structured Text / Single Block fields default to returning **block IDs**, not block content. To get full block payloads inline, pass `nested: true`:

```ts
const record  = await client.items.find<Schema.BlogPost>("id"); // blocks as ID strings
const nested  = await client.items.find<Schema.BlogPost>("id", { nested: true }); // blocks as full objects
```

Two consequences:

- Without `nested: true`, you only have block ids — must re-fetch parent with nested to read contents.
- With `nested: true`, iterator max page size drops from 500 to 30 (see `references/filtering-and-pagination.md`). Plan for round-trip cost on large scans.

For ordinary `find`, `list`, and paged reads, `version: "current"` (the default) returns the latest edits, including drafts; `version: "published"` reads the published versions. Use `current` when inspecting preview content. A record with unpublished edits can have different current and published values.

Reference-discovery endpoints have a separate `version` contract: `published-or-current` searches links in either version. It does not mean "prefer published content, otherwise return the draft" and is not an ordinary record-read preview option. Check `cma:docs items references` for that endpoint's options.

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

`itemVersions.listPagedIterator(recordId)` walks history. `itemVersions.restore(versionId)` creates a **new version** whose content matches the restored one — it does not delete history, and it does not re-publish: the record's publication state stays where it was. If the record was published before the restore and you want the restored content live, call `publish` explicitly afterward.

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

## Structured Text create, update, and reads

For `items.create` / `items.update` involving Structured Text, load the [document model](../../datocms-structured-text/references/document-model.md); choose [editing](../../datocms-structured-text/references/editing.md) for existing DAST or [conversion](../../datocms-structured-text/references/conversion.md) for Markdown/HTML. Keep CMA request types, nested block payloads, locale merging, and version checks in [editing records](editing-records.md). Preflight with `validateNew` / `validateExisting` as appropriate; structural DAST validation alone does not establish target-field validity.

For inspection, Dastdown syntax and round-trips live in [editing](../../datocms-structured-text/references/editing.md); plain-text/HTML export lives in [conversion](../../datocms-structured-text/references/conversion.md). Read the parent with `nested: true` when the task needs block fields. Dastdown placeholders remain opaque IDs even with expanded blocks; inspect the original response for block contents.

If a required specialist reference is missing, install `datocms-structured-text` from `datocms/agent-skills` or update the full bundle. Ordinary reads, publishing, and scalar field updates remain covered here.

## Bulk operations are async + 200-cap

`bulkPublish`, `bulkUnpublish`, `bulkDestroy`, `bulkMoveToStage` accept `{ items: [{ id, type: "item" }] }` and run as background jobs (the simplified client awaits completion). Max **200 items per request** — chunk larger sets. See `references/client-types-and-behaviors.md` § Technical Limits.

## Typed records via generated `Schema.X`

Every method that returns or accepts a record (`find`, `list`, `create`, `update`, `publish`, etc.) takes a generic `Shape.X`. Pass a generated `Schema.BlogPost` marker and TypeScript knows the per-field shape — `record.title` is `string`, `record.cover_image` is the file shape, etc. — instead of `unknown`.

```ts
const post = await client.items.find<Schema.BlogPost>(id);          // blocks as ID strings
const nested = await client.items.find<Schema.BlogPost>(id, { nested: true }); // blocks expanded
```

To extract the type of a specific field for an intermediate variable, index `ApiTypes.Item<Schema.BlogPost>["field_api_key"]` (or `ApiTypes.ItemInNestedResponse<…>["…"]` when reading nested). For create/update payloads, `ApiTypes.ItemCreateSchema<Schema.BlogPost>` / `ApiTypes.ItemUpdateSchema<Schema.BlogPost>`. See `references/type-generation.md` for the generation step.
