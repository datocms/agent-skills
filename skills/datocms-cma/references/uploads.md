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

`upload.default_field_metadata` = fallback metadata, applied when a record's File/Gallery field references the upload **without** overrides:

```ts
hero_image: { upload_id: upload.id }                           // uses upload's defaults
hero_image: { upload_id: upload.id, alt: "Custom for here" }  // override per usage
```

**Two shapes exist — gated on the per-project `non_localized_focal_points` env flag** (Configuration → Available updates; one-way, can't be turned back off; defaults on for projects created after the 2026-06-11 rollout, existing projects opt in, forks inherit the source env's value). Picking the wrong one is the upload gotcha that bites:

- **Unmigrated (legacy default):** locale-first — `{ [locale]: { alt, title, custom_data, focal_point, poster_time } }`. Every key is per-locale (incl. `focal_point`/`poster_time`).
- **Migrated (and all new projects):** field-first — `{ alt: { [locale]: … }, title: { [locale]: … }, custom_data: { [locale]: … }, focal_point: { x, y } | null, poster_time: number | null }`. `focal_point`/`poster_time` are **non-localized** (one value shared across locales).

Sending the wrong shape fails on write: on a migrated project the legacy locale-first payload is rejected (`INVALID_FIELD`, `details.code: INVALID_FORMAT`) with message `"<locale>" is not a permitted key` (top-level key must be a field name). The CMA still returns + accepts the legacy shape on unmigrated projects by default; after migration only field-first is accepted.

**Detect which shape a project uses** — no documented flag: read back any upload and inspect `default_field_metadata`'s top-level keys (locale codes → legacy; `alt`/`title`/… → migrated). `@datocms/cma-client` needs **5.5.0+** for the new shape; older clients' generated types (and `cma:docs`, which reflects the installed version) only model the legacy locale-first shape — on a migrated project don't trust the type, confirm by read-back.

**Record-side override is a separate, locale-first shape** (`{ [locale]: { upload_id, alt, title, custom_data, focal_point } }`, see `references/localization.md`) — shallow per-field, not merged: provide any of `alt | title | custom_data | focal_point` → provide all four (others → `null`/`{}`, not upload defaults). No overrides → omit; `{ upload_id }` is cleaner.

`smart_tags` (auto-populated by Dato's image analysis) appear on read-back asynchronously after upload — not present immediately on response from `create()`. Don't filter on `smart_tags` until you've waited for indexing.

## `uploads.references(id)` — find what uses asset

```ts
const records = await client.uploads.references("upload-id", { nested: true });
```

Returns records that link to this upload via any File / Gallery / Modular Content / Structured Text field. Use before deleting asset to surface broken links — `destroy()` will succeed even if records still reference upload, and those references will silently render as "missing asset".

Pass `nested: true` if you need full block payloads in returned records (page-cap-30 rule from `references/filtering-and-pagination.md` applies).
