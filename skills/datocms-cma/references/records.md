# Records (Items)

Records are the content entries in DatoCMS. They are instances of models (item types). This is the most-used resource in the CMA.

## Quick Navigation

- [Creating Records](#creating-records)
- [Retrieving Records](#retrieving-records)
- [Listing Records](#listing-records)
- [Updating Records](#updating-records)
- [Publishing and Unpublishing](#publishing-and-unpublishing)
- [Deleting Records](#deleting-records)
- [Duplicating Records](#duplicating-records)
- [Bulk Operations](#bulk-operations)
- [Finding References](#finding-references)
- [Record Versions](#record-versions)
- [Field Value Formats](#field-value-formats)
- [Type Reference](#type-reference)
- [Complete Example: Create, Publish, Update, Delete](#complete-example-create-publish-update-delete)

---

## Creating Records

```ts
const record = await client.items.create({
  item_type: { id: "model_123", type: "item_type" },
  title: "My First Post",
  slug: "my-first-post",
});
```

The `item_type` relationship is **required** — it tells DatoCMS which model this record belongs to. You can use the model's numeric ID or its string ID. With the simplified API, always use the `id`.

### Finding the Model ID

```ts
// List all models and find by api_key
const models = await client.itemTypes.list();
const blogModel = models.find((m) => m.api_key === "blog_post");

// Or find directly if you know the ID
const model = await client.itemTypes.find("model_123");
```

### Creating a Record with All Meta Options

```ts
const record = await client.items.create({
  item_type: { id: modelId, type: "item_type" },
  // Field values — keys are field api_keys
  title: "Hello World",
  body: "Some content...",
  // Optional: provide a specific ID
  id: "custom-id-here",
  // Optional: set creator
  creator: { id: tokenId, type: "access_token" },
  // Optional: set meta (timestamps, status)
  meta: {
    status: "draft",
    created_at: "2024-01-01T00:00:00Z",
    first_published_at: null,
    current_version: "1",
  },
});
```

---

## Retrieving Records

### Find by ID

```ts
const record = await client.items.find("record-id");
```

### With Nested Blocks

When a record has modular content (`rich_text`), structured text (`structured_text`), or single block (`single_block`) fields, pass `nested: true` to inline the block records in the response:

```ts
const record = await client.items.find("record-id", {
  nested: true,
});
// Now record.content contains full block objects instead of just IDs
```

**Important:** Without `nested: true`, block fields contain arrays of block record IDs (strings). With `nested: true`, they contain full block objects with all their attributes. Always use `nested: true` when you need to read block content.

### With Version Info

```ts
const record = await client.items.find("record-id", {
  version: "current", // or "published" or "published-or-current"
});
```

---

## Listing Records

### Basic List (First Page)

```ts
const records = await client.items.list({
  filter: { type: "blog_post" }, // Filter by model api_key or ID
});
```

For auto-pagination, iterator options, counting, and filtering patterns, see `references/filtering-and-pagination.md`. Use that reference whenever a record query may span multiple pages.

---

## Updating Records

### Partial Update

```ts
await client.items.update("record-id", {
  title: "Updated Title",
});
```

Only the fields you specify are updated. Other fields remain unchanged.

### Optimistic Locking

To prevent overwriting concurrent changes, use `meta.current_version`:

```ts
const record = await client.items.find("record-id");

await client.items.update("record-id", {
  title: "Updated Title",
  meta: { current_version: record.meta.current_version },
});
```

If someone else updated the record between your `find` and `update`, the API returns a 409 (Conflict) error.

---

## Publishing and Unpublishing

### Publish a Record

```ts
await client.items.publish("record-id");
```

### Unpublish a Record

```ts
await client.items.unpublish("record-id");
```

### Selective Publication (Specific Locales)

```ts
await client.items.publish("record-id", {
  content_in_locales: ["en", "it"],
  non_localized_content: true,
});
```

This publishes only the specified locales' content and, optionally, non-localized fields.

### Recursive Publish/Unpublish (Tree Models)

For tree-structured models, use `recursive` to cascade to parent/child records:

```ts
// Publish a record and auto-publish its unpublished parents
await client.items.publish("record-id", undefined, { recursive: true });

// Unpublish a record and auto-unpublish its children
await client.items.unpublish("record-id", undefined, { recursive: true });
```

---

## Deleting Records

```ts
await client.items.destroy("record-id");
```

---

## Duplicating Records

```ts
const duplicated = await client.items.duplicate("record-id");
```

This is an async job — the client automatically waits for the job to complete and returns the new record.

---

## Bulk Operations

All bulk operations accept an `items` array of record references and are async jobs. **Maximum 200 items per request** — batch larger sets in groups of 200.

### Bulk Publish

```ts
await client.items.bulkPublish({
  items: [
    { id: "record-1", type: "item" },
    { id: "record-2", type: "item" },
  ],
});
```

### Bulk Unpublish

```ts
await client.items.bulkUnpublish({
  items: [
    { id: "record-1", type: "item" },
    { id: "record-2", type: "item" },
  ],
});
```

### Bulk Destroy

```ts
await client.items.bulkDestroy({
  items: [
    { id: "record-1", type: "item" },
    { id: "record-2", type: "item" },
  ],
});
```

### Bulk Move to Workflow Stage

```ts
await client.items.bulkMoveToStage({
  items: [
    { id: "record-1", type: "item" },
    { id: "record-2", type: "item" },
  ],
  stage: "stage-id",
});
```

---

## Finding References

Get all records that reference a given record:

```ts
const referencingRecords = await client.items.references("record-id", {
  nested: true,
});
```

With additional query params (version):

```ts
const refs = await client.items.references("record-id", {
  nested: true,
});
```

---

## Record Versions

List the version history of a record:

```ts
for await (const version of client.itemVersions.listPagedIterator(
  "record-id",
)) {
  console.log(version.id, version.meta.created_at);
}
```

### Finding a Specific Version

```ts
const version = await client.itemVersions.find("version-id");

console.log(version.id);
console.log(version.meta.created_at);
console.log(version.item); // the record snapshot at that version
```

### Restoring a Previous Version

Restoring a version creates a new version whose content matches the restored one. It does not delete any existing versions.

```ts
const restored = await client.itemVersions.restore("version-id");

console.log(restored.id); // the newly created version ID
```

**Important:** After restoring, the record's current content matches the restored version but the record remains in its current publication state. Publish explicitly if needed.

---

## Validation

Validate field values before creating or updating a record:

```ts
// Validate before creating a new record
await client.items.validateNew({
  item_type: { type: "item_type", id: "model-id" },
  title: "Hello",
});

// Validate an existing record's fields before saving
await client.items.validateExisting("record-id", {
  title: "Updated title",
});
```

Both methods throw an `ApiError` if validation fails, with the same error shape as a failed `create` or `update`.

---

## Current vs Published State

Compare the current (draft) version of a record with its published version:

```ts
const diff = await client.items.currentVsPublishedState("record-id");
```

Useful for audit workflows and migration scripts that need to know what changed before publishing.

---

## Field Value Formats

When creating or updating records, field values must match the expected format for each field type. All field values are keyed by the field's `api_key`.

### Simple Field Types

| Field type | Value format | Example |
|---|---|---|
| `string` | `string` | `"Hello World"` |
| `text` | `string` (can contain markdown) | `"# Title\n\nBody text"` |
| `boolean` | `boolean` | `true` |
| `integer` | `number` | `42` |
| `float` | `number` | `3.14` |
| `date` | `string` (ISO 8601 date) | `"2024-01-15"` |
| `date_time` | `string` (ISO 8601 datetime) | `"2024-01-15T10:30:00+00:00"` |
| `color` | `{ red, green, blue, alpha }` | `{ red: 255, green: 0, blue: 0, alpha: 255 }` |
| `json` | JSON-serialized string | `JSON.stringify({ key: "value" })` |
| `slug` | `string` | `"hello-world"` |

### Geo Location

```ts
{
  latitude: 40.7128,
  longitude: -74.0060,
}
```

### SEO / Meta Tags

```ts
{
  title: "Page Title",
  description: "Meta description",
  image: "upload-id", // upload ID string, or null
  twitter_card: "summary_large_image", // or null
  no_index: false, // or null
}
```

### Single File (upload)

Minimal — just the upload ID (uses the upload's default metadata):

```ts
{ upload_id: "upload-id" }
```

With per-field metadata overrides:

```ts
{
  upload_id: "upload-id",
  alt: "Alt text",            // optional, overrides upload default
  title: "Image title",       // optional, overrides upload default
  custom_data: {},             // optional
  focal_point: { x: 0.5, y: 0.5 }, // optional
}
```

### Gallery (multiple files)

Array of file objects (same shape as single file):

```ts
[
  { upload_id: "upload-id-1" },
  { upload_id: "upload-id-2", alt: "Custom alt", title: null, custom_data: {}, focal_point: null },
]
```

### Links

| Field type | Value format | Example |
|---|---|---|
| Single link | `string \| null` | `"linked-record-id"` |
| Multiple links | `string[]` | `["record-id-1", "record-id-2"]` |

### Video

```ts
{
  url: "https://www.youtube.com/watch?v=example",
  title: "Video title",
  width: 1920,
  height: 1080,
  provider: "youtube",
  provider_uid: "example",
  thumbnail_url: "https://img.youtube.com/...",
}
```

### Modular Content, Structured Text, Single Block

These are complex field types — see `references/editing-records.md`.

---

## Type Reference

**Import:** `import type { ApiTypes } from "@datocms/cma-client-node";`

Type properties are based on `@datocms/cma-client@5.x`. Properties may differ on other versions.

#### `ApiTypes.Item`

Returned by `client.items.find()`, `client.items.create()`, `client.items.update()`, `client.items.publish()`, etc.

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Record ID |
| `type` | `"item"` | Always `"item"` |
| `item_type` | `{ id: string; type: "item_type" }` | The model this record belongs to |
| `creator` | `AccountData \| AccessTokenData \| UserData \| SsoUserData \| OrganizationData` | Who created the record (optional) |
| `meta.created_at` | `string` | Date of creation |
| `meta.updated_at` | `string` | Last update time |
| `meta.published_at` | `string \| null` | Date of last publication |
| `meta.first_published_at` | `string \| null` | Date of first publication |
| `meta.publication_scheduled_at` | `string \| null` | Date of future publication |
| `meta.unpublishing_scheduled_at` | `string \| null` | Date of future unpublishing |
| `meta.status` | `"draft" \| "updated" \| "published" \| null` | Publication status |
| `meta.is_valid` | `boolean` | Whether the current record is valid |
| `meta.is_current_version_valid` | `boolean \| null` | Whether the current version is valid |
| `meta.is_published_version_valid` | `boolean \| null` | Whether the published version is valid |
| `meta.current_version` | `string` | The ID of the current record version |
| `meta.stage` | `string \| null` | Workflow stage the record is in |
| `meta.has_children` | `boolean \| null` | For tree models, whether the record has children |
| _dynamic fields_ | _varies_ | Plus dynamic field values keyed by field API key. With generated types (`D`), these become specific typed properties. |

#### `ApiTypes.ItemCreateSchema`

Input for `client.items.create()`.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | No | Provide a custom record ID |
| `type` | `"item"` | No | Always `"item"` |
| `item_type` | `{ id: string; type: "item_type" }` | **Yes** | The model this record belongs to |
| `creator` | `AccountData \| AccessTokenData \| UserData \| SsoUserData \| OrganizationData` | No | Set the creator |
| `meta.created_at` | `string` | No | Override creation date |
| `meta.updated_at` | `string` | No | Override last update time |
| `meta.published_at` | `string \| null` | No | Override last publication date |
| `meta.first_published_at` | `string \| null` | No | Override first publication date |
| `meta.publication_scheduled_at` | `string \| null` | No | Set future publication date |
| `meta.status` | `"draft" \| "updated" \| "published" \| null` | No | Override publication status |
| `meta.is_valid` | `boolean` | No | Override validity flag |
| `meta.is_current_version_valid` | `boolean \| null` | No | Override current version validity |
| `meta.is_published_version_valid` | `boolean \| null` | No | Override published version validity |
| `meta.current_version` | `string` | No | Set current version ID |
| _dynamic fields_ | _varies_ | _varies_ | Field values keyed by field API key |

#### `ApiTypes.ItemUpdateSchema`

Input for `client.items.update()`.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | No | Record ID |
| `type` | `"item"` | No | Always `"item"` |
| `item_type` | `{ id: string; type: "item_type" }` | No | The model this record belongs to |
| `creator` | `AccountData \| AccessTokenData \| UserData \| SsoUserData \| OrganizationData` | No | Set the creator |
| `meta.created_at` | `string` | No | Override creation date |
| `meta.updated_at` | `string` | No | Override last update time |
| `meta.published_at` | `string \| null` | No | Override last publication date |
| `meta.first_published_at` | `string \| null` | No | Override first publication date |
| `meta.publication_scheduled_at` | `string \| null` | No | Set future publication date |
| `meta.unpublishing_scheduled_at` | `string \| null` | No | Set future unpublishing date |
| `meta.status` | `"draft" \| "updated" \| "published" \| null` | No | Override publication status |
| `meta.is_valid` | `boolean` | No | Override validity flag |
| `meta.current_version` | `string` | No | For optimistic locking — pass the known version to prevent overwriting concurrent changes |
| `meta.is_current_version_valid` | `boolean \| null` | No | Override current version validity |
| `meta.is_published_version_valid` | `boolean \| null` | No | Override published version validity |
| `meta.stage` | `string \| null` | No | Move the record to a new workflow stage |
| `meta.has_children` | `boolean \| null` | No | Whether the record has children |
| _dynamic fields_ | _varies_ | No | Field values keyed by field API key (only changed fields needed) |

#### Extracting a concrete field type

The `_dynamic fields_` row is a placeholder for per-model field values. To materialize a specific field into a concrete TypeScript type — without chasing internal per-field-type names — pass a generated marker (`Schema.X`) as the generic and index the result:

```ts
import type { ApiTypes } from "@datocms/cma-client-node";
import * as Schema from "./cma-types";

type BlogPostCreate = ApiTypes.ItemCreateSchema<Schema.BlogPost>;
type BlogPostUpdate = ApiTypes.ItemUpdateSchema<Schema.BlogPost>;
type BlogPostRead   = ApiTypes.Item<Schema.BlogPost>;                 // block fields as ID strings
type BlogPostNested = ApiTypes.ItemInNestedResponse<Schema.BlogPost>; // block fields expanded

type Title   = BlogPostCreate["title"];
type Content = BlogPostCreate["content"];
type Cover   = BlogPostCreate["cover_image"];
```

Pick `Create` for `client.items.create()` payloads, `Update` for `client.items.update()` patches (most fields optional), `Item` for default `client.items.find()` reads (block fields as ID strings), `ItemInNestedResponse` for `nested: true` reads (block fields expanded). `Schema.X` itself is a phantom marker — not directly indexable.

#### `ApiTypes.ItemInstancesHrefSchema`

Query params for `client.items.list()`.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `nested` | `boolean` | No | If set, returns full payload for nested blocks instead of IDs |
| `filter.ids` | `string` | No | Comma-separated record IDs to fetch. Must not combine with `filter.type` or `filter.fields` |
| `filter.type` | `string` | No | Model ID or `api_key` to filter by. Must not combine with `filter.ids`. Comma-separated values accepted but must not combine with `filter.fields` |
| `filter.query` | `string` | No | Textual query to match. Uses `locale` if defined, otherwise the environment main locale |
| `filter.fields` | `object` | No | Field-specific filters — see the Filtering Records section above for usage patterns |
| `filter.only_valid` | `string` | No | When set, only valid records are included |
| `locale` | `string` | No | Locale for `filter.query` and `filter.fields`. Default: environment main locale |
| `page.offset` | `number` | No | Zero-based offset of the first entity (defaults to 0) |
| `page.limit` | `number` | No | Maximum entities to return (defaults to 30, max 500) |
| `order_by` | `string` | No | Sort order. Format: `<field>_(ASC\|DESC)`. Requires single-model `filter.type`. Supports field API keys and meta columns: `id`, `_updated_at`, `_created_at`, `_status`, `_published_at`, `_first_published_at`, `_publication_scheduled_at`, `_unpublishing_scheduled_at`, `_is_valid`, `position`. Comma-separated for multiple rules |
| `version` | `string` | No | `"published"` (default) or `"current"` for latest drafts |

#### `ApiTypes.ItemSelfHrefSchema`

Query params for `client.items.find()`.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `nested` | `boolean` | No | If set, returns full payload for nested blocks instead of IDs |
| `version` | `string` | No | `"published"` (default) or `"current"` for latest drafts |

#### `ApiTypes.ItemReferencesHrefSchema`

Query params for `client.items.references()`.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `nested` | `boolean` | No | If set, returns full payload for nested blocks instead of IDs |
| `version` | `null \| "current" \| "published" \| "published-or-current"` | No | Which version of referencing records to retrieve |

#### `ApiTypes.ItemPublishSchema`

Body for `client.items.publish()`. Pass `null` or `undefined` to publish the entire record, or an object for selective publication.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"selective_publish_operation"` | No | Must be set for selective publish |
| `content_in_locales` | `string[]` | **Yes** | Array of locale codes to publish |
| `non_localized_content` | `boolean` | **Yes** | Whether to also publish non-localized fields |

#### `ApiTypes.ItemPublishHrefSchema`

Query params for `client.items.publish()`.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `recursive` | `boolean` | No | For tree models: when `true`, auto-publishes unpublished parent records |

#### `ApiTypes.ItemUnpublishSchema`

Body for `client.items.unpublish()`. Pass `null` or `undefined` to unpublish entirely, or an object for selective unpublication.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `"selective_unpublish_operation"` | No | Must be set for selective unpublish |
| `content_in_locales` | `string[]` | **Yes** | Array of locale codes to unpublish |

#### `ApiTypes.ItemUnpublishHrefSchema`

Query params for `client.items.unpublish()`.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `recursive` | `boolean` | No | For tree models: when `true`, auto-unpublishes published child records |

#### `ApiTypes.ItemBulkPublishSchema`, `ItemBulkUnpublishSchema`, `ItemBulkDestroySchema`

All three share the same shape: `{ items: Array<{ type: "item"; id: string }> }`. Pass an array of record references. Maximum 200 items per request.

#### `ApiTypes.ItemBulkMoveToStageSchema`

Same as the other bulk schemas, plus a `stage` property: `{ items: Array<{ type: "item"; id: string }>; stage: string }`. The `stage` value is the workflow stage ID to move records into.

#### `ApiTypes.ItemValidateNewSchema`

Input for `client.items.validateNew()`. Same shape as `ItemCreateSchema` — pass `item_type` and field values to validate before creating.

#### `ApiTypes.ItemValidateExistingSchema`

Input for `client.items.validateExisting()`. Same shape as `ItemCreateSchema` — pass `item_type` and field values to validate before updating.

#### `ApiTypes.ItemCurrentVsPublishedState`

Returned by `client.items.currentVsPublishedState()`.

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Record ID |
| `type` | `"item_current_vs_published_state"` | Always `"item_current_vs_published_state"` |
| `current_version_locales` | `string[]` | Locales present in the current version |
| `published_version_locales` | `string[]` | Locales present in the published version |
| `changed_locales` | `string[]` | Locales that differ between current and published |
| `added_locales` | `string[]` | Locales added in the current version |
| `removed_locales` | `string[]` | Locales removed in the current version |
| `non_localized_fields_changed` | `boolean` | Whether non-localized fields differ |
| `current_version_invalid_locales` | `string[]` | Locales where the current version is invalid |
| `current_version_non_localized_fields_invalid` | `boolean` | Whether non-localized fields are invalid in current version |
| `scheduled_publication` | `{ type: "scheduled_publication"; id: string } \| null` | Scheduled publication info |
| `scheduled_unpublishing` | `{ type: "scheduled_unpublishing"; id: string } \| null` | Scheduled unpublishing info |
| `published_version` | `{ type: "item_version"; id: string } \| null` | Reference to the published version |

#### `ApiTypes.ItemVersion`

Returned by `client.itemVersions.find()`, listed via `client.itemVersions.listPagedIterator()`.

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Version ID |
| `type` | `"item_version"` | Always `"item_version"` |
| `item_type` | `{ id: string; type: "item_type" }` | The model this record belongs to |
| `item` | `{ id: string; type: "item" }` | Reference to the parent record |
| `editor` | `AccountData \| AccessTokenData \| UserData \| SsoUserData \| OrganizationData` | Who made this version |
| `meta.created_at` | `string` | Date of version creation |
| `meta.is_valid` | `boolean` | Whether this version is valid |
| `meta.is_published` | `boolean` | Whether this is the published version |
| `meta.is_current` | `boolean` | Whether this is the most recent version |

#### `ApiTypes.ItemVersionInstancesHrefSchema`

Query params for `client.itemVersions.listPagedIterator()`.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `nested` | `boolean` | No | If set, returns full payload for nested blocks instead of IDs |
| `page.offset` | `number` | No | Zero-based offset of the first entity (defaults to 0) |
| `page.limit` | `number` | No | Maximum entities to return (defaults to 15, max 50) |

---

## Complete Example: Create, Publish, Update, Delete

```ts
import { buildClient, ApiError } from "@datocms/cma-client-node";

const client = buildClient({
  apiToken: process.env.DATOCMS_API_TOKEN!,
});

async function main() {
  // Find the model
  const models = await client.itemTypes.list();
  const blogModel = models.find((m) => m.api_key === "blog_post");
  if (!blogModel) throw new Error("blog_post model not found");

  // Create a draft record
  const record = await client.items.create({
    item_type: { id: blogModel.id, type: "item_type" },
    title: "My New Post",
    slug: "my-new-post",
    body: "This is the body content.",
  });
  console.log("Created:", record.id);

  // Publish it
  await client.items.publish(record.id);
  console.log("Published");

  // Update it
  await client.items.update(record.id, {
    title: "My Updated Post",
  });
  console.log("Updated");

  // Re-publish after update
  await client.items.publish(record.id);
  console.log("Re-published");

  // Delete it
  await client.items.destroy(record.id);
  console.log("Deleted");
}

main().catch((error) => {
  if (error instanceof ApiError) {
    console.error("API Error:", error.response.status, error.errors);
  } else {
    console.error(error);
  }
  process.exit(1);
});
```
