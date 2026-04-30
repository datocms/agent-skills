# Uploads (Assets)

Covers asset management: file uploads, metadata, collections (folders), references.

> For endpoint shapes, payload attributes, and TS signatures, consult `npx datocms cma:docs uploads <action> --types-depth 2`, `cma:docs uploadRequest <action> --types-depth 2`, or `cma:docs uploadCollections <action> --types-depth 2` (raise the depth or use `--expand-types OnUploadProgressInfo`, `--expand-types CreateUploadFromLocalFileSchema` for deeper nested types). This file only covers what the docs don't carry.

## Picking an upload method

The CMA upload surface looks confusingly large because the same logical operation has different ergonomics per runtime:

| Runtime | What you have | Use |
| - | - | - |
| Node.js (`@datocms/cma-client-node`) | A local path or an HTTP URL | `createFromLocalFile({ localPath })` / `createFromUrl({ url })` |
| Browser (`@datocms/cma-client-browser`) | A `File` or `Blob` | `createFromFileOrBlob({ file })` |
| Edge / no convenience available | Anything | The 3-step raw flow (below) |

The _FromLocalFile / FromUrl / FromFileOrBlob_ helpers do all three steps below in one call (request signed URL, PUT to S3, create the upload record). Reach for them by default; only fall back to the raw flow when the runtime's helper isn't available.

`updateFromLocalFile(id, { localPath })` / `updateFromUrl(id, { url })` / `updateFromFileOrBlob(id, { file })` replace the underlying file of an existing upload while keeping its id and metadata — useful for in-place asset rotation.

## The 3-step raw flow

The convenience methods are sugar over this sequence — perform it manually only when you have no helper:

1. `client.uploadRequest.create({ filename })` — returns `{ id (the S3 path), url, request_headers }`.
2. `PUT` the binary body to `url`, sending the headers from `request_headers` verbatim. The PUT goes directly to S3, **not to the DatoCMS API** — no API token, just the signed URL.
3. `client.uploads.create({ path: id, default_field_metadata, tags, ... })` — registers the uploaded file as an Upload resource in DatoCMS.

Step 2 must succeed before step 3, and step 3 references the path (`id` from step 1, **not** a URL) — this is where the "upload exists in S3 but DatoCMS doesn't know about it" failure happens if step 3 is skipped or errors.

## Helper-only options

The `createFromLocalFile` / `createFromUrl` / `createFromFileOrBlob` schemas extend the base `UploadCreateSchema` with three properties that don't exist in the raw `uploads.create`:

- **`skipCreationIfAlreadyExists: true`** — computes the file's MD5 and, if an upload with that hash already exists in the project, returns the existing one instead of creating a duplicate. Hashing is content-based, so renames and metadata changes don't defeat the dedup. Essential when migration scripts may re-run.
- **`onProgress(info)`** — receives a tagged-union event stream during the upload. Sequence (skipping fields specific to `createFromUrl`):
  - `REQUESTING_UPLOAD_URL` (one-shot): fetching the signed URL.
  - `DOWNLOADING_FILE` (only `createFromUrl`, repeated with `progress` 0–100): downloading the source URL locally before pushing to S3.
  - `UPLOADING_FILE` (repeated, `progress` 0–100): pushing to S3.
  - `CREATING_UPLOAD_OBJECT` (one-shot): registering the upload record. Use it to drive UI progress bars or to log long uploads.
- The returned promise is a `CancelablePromise<Upload>` — call `.cancel()` to abort an in-flight upload (e.g., from a UI cancel button or when shutting down a worker mid-job).

## Metadata: defaults vs per-use overrides

`upload.default_field_metadata` is a **per-locale** object (`{ [locale]: { alt, title, custom_data, focal_point } }`) stored on the upload itself. It is the fallback that fills in when a record's File/Gallery field references the upload **without** overrides:

```ts
hero_image: { upload_id: upload.id }                           // uses upload's defaults
hero_image: { upload_id: upload.id, alt: "Custom for here" }  // override per usage
```

The override is **shallow per-field**, not merged: if you provide any of `alt | title | custom_data | focal_point` on the field-side metadata, you should provide all four (the others fall to `null`/`{}` rather than to the upload's defaults). When you don't need overrides, omit them entirely — passing `{ upload_id }` is the cleaner shape.

`smart_tags` (auto-populated by Dato's image analysis) appear on read-back asynchronously after upload — they're not present immediately on the response from `create()`. Don't filter on `smart_tags` until you've waited for indexing.

## `uploads.references(id)` — find what uses an asset

```ts
const records = await client.uploads.references("upload-id", { nested: true });
```

Returns the records that link to this upload via any File / Gallery / Modular Content / Structured Text field. Use before deleting an asset to surface broken links — `destroy()` will succeed even if records still reference the upload, and those references will silently render as "missing asset".

Pass `nested: true` if you need full block payloads in the returned records (the page-cap-30 rule from `references/filtering-and-pagination.md` applies).
