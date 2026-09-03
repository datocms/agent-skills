# Uploads (Assets)

Asset management: uploads, metadata, collections (folders), references.

> Endpoint shapes / payloads / TS sigs: `npx datocms cma:docs {uploads|uploadRequest|uploadCollections} <action>` (add `--expand-types '*'` for full TS definitions). Only what docs don't carry below.

## Picking upload method

CMA upload surface looks large because same operation has different ergonomics per runtime:

| Runtime | What you have | Use |
| - | - | - |
| Node.js (`@datocms/cma-client-node`) | Local path or HTTP URL | `createFromLocalFile({ localPath })` / `createFromUrl({ url })` |
| Browser (`@datocms/cma-client-browser`) | `File` or `Blob` | `createFromFileOrBlob({ file })` |
| Edge / no convenience | Anything | 3-step raw flow (below) |

_FromLocalFile / FromUrl / FromFileOrBlob_ helpers do all three steps in one call (request signed URL, PUT to S3, create upload record). Use by default; fall back to raw flow when runtime's helper unavailable.

`updateFromLocalFile(id, { localPath })` / `updateFromUrl(id, { url })` / `updateFromFileOrBlob(id, { file })` replace underlying file of existing upload while keeping id and metadata — useful for in-place asset rotation.

## 3-step raw flow

Convenience methods are sugar over this sequence — perform manually only when no helper:

1. `client.uploadRequest.create({ filename })` — returns `{ id (S3 path), url, request_headers }`.
2. `PUT` binary body to `url`, sending headers from `request_headers` verbatim. PUT goes directly to S3, **not** DatoCMS API — no API token, just signed URL.
3. `client.uploads.create({ path: id, default_field_metadata, tags, ... })` — registers uploaded file as Upload resource in DatoCMS.

Step 2 must succeed before step 3, and step 3 references path (`id` from step 1, **not** URL) — this is where "upload exists in S3 but DatoCMS doesn't know about it" failure happens if step 3 skipped or errors.

## Helper-only options

`createFromLocalFile` / `createFromUrl` / `createFromFileOrBlob` schemas extend base `UploadCreateSchema` with three properties that don't exist in raw `uploads.create`:

- **`skipCreationIfAlreadyExists: true`** — computes file's MD5 and, if upload with that hash already exists in project, returns existing one instead of creating duplicate. Hashing is content-based, so renames and metadata changes don't defeat dedup. Essential when migration scripts may re-run.
- **`onProgress(info)`** — receives tagged-union event stream during upload. Sequence (skipping fields specific to `createFromUrl`):
  - `REQUESTING_UPLOAD_URL` (one-shot): fetching signed URL.
  - `DOWNLOADING_FILE` (only `createFromUrl`, repeated with `progress` 0–100): downloading source URL locally before pushing to S3.
  - `UPLOADING_FILE` (repeated, `progress` 0–100): pushing to S3.
  - `CREATING_UPLOAD_OBJECT` (one-shot): registering upload record. Use to drive UI progress bars or log long uploads.
- Returned promise is `CancelablePromise<Upload>` — call `.cancel()` to abort in-flight upload (e.g., from UI cancel button or when shutting down worker mid-job).

## Metadata: defaults vs per-use overrides

`upload.default_field_metadata` is **field-keyed** object stored on upload itself: `alt` / `title` / `custom_data` keyed by locale, `focal_point` (images) and `poster_time` (videos) single value per asset — they're not localizable.

```ts
{
  alt: { en: "Hero shot", it: "Copertina" },
  title: { en: null, it: null },
  custom_data: { en: {}, it: {} },
  focal_point: { x: 0.5, y: 0.3 },  // one per asset, not per locale
  poster_time: null,                // one per asset, not per locale
}
```

Writes are a patch: send any subset of the five keys, missing ones keep stored value. (Record-side override below behaves the opposite way — read both.)

It's fallback that fills in when record's File/Gallery field references upload **without** overrides:

```ts
hero_image: { upload_id: upload.id }                           // uses upload's defaults
hero_image: { upload_id: upload.id, alt: "Custom for here" }  // override per usage
```

Override is **shallow per-field**, not merged: if you provide any of `alt | title | custom_data | focal_point` on field-side metadata, provide all four (others fall to `null`/`{}` rather than upload's defaults). When you don't need overrides, omit entirely — passing `{ upload_id }` is cleaner shape.

### Two wire shapes — simple methods normalize, raw don't

API serves `default_field_metadata` in one of two shapes, decided per environment by the [non-localized focal points](https://www.datocms.com/product-updates/non-localized-focal-points) opt-in:

| Opt-in | Wire shape |
| - | - |
| Active | field-keyed — `{ alt: { en } }` |
| Inactive (legacy) | locale-keyed — `{ en: { alt } }` |

Per-environment setting, not a version — projects created before the opt-in keep legacy shape until owner activates it. Each environment rejects the other shape with `422 INVALID_FORMAT`.

From `@datocms/cma-client` **6.0.0** simple methods (`create`, `update`, `find`, `list`, `listPagedIterator`, plus the `From*` helpers built on them) convert both directions, so you always read and write field-keyed regardless of environment. Reads need no lookup — shapes are told apart structurally. Writes ask environment once per client, memoized 20 min and shared by concurrent callers, so bulk write costs one extra request total, not one per upload. Client that never writes metadata never asks.

Raw methods (`rawCreate`, `rawFind`, `rawList`, ...) hand you wire payload untouched — that's the point of raw layer. Type those with exported `UploadLocaleKeyedDefaultFieldMetadata` / `UploadLocaleKeyedDefaultFieldMetadataInRequest`.

`smart_tags` (auto-populated by Dato's image analysis) appear on read-back asynchronously after upload — not present immediately on response from `create()`. Don't filter on `smart_tags` until you've waited for indexing.

## `uploads.references(id)` — find what uses asset

```ts
const records = await client.uploads.references("upload-id", { nested: true });
```

Returns records that link to this upload via any File / Gallery / Modular Content / Structured Text field. Use before deleting asset to surface broken links — `destroy()` will succeed even if records still reference upload, and those references will silently render as "missing asset".

Pass `nested: true` if you need full block payloads in returned records (page-cap-30 rule from `references/filtering-and-pagination.md` applies).
