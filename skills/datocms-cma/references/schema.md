# Schema: models, block models, fields, fieldsets

How to create and change the schema through the CMA, and the rules the API enforces. What each field type stores, every validator and every editor with its parameters: `references/field-types.md`.

> In CLI mode, endpoint shapes / payloads / TS signatures: `npx datocms cma:docs {itemTypes|fields|fieldsets} <action>` (add `--expand-types '*'` for full TS definitions).

## Contents

- Build order: model → fields → meta-relationships
- Worked example: a model with blocks and Structured Text
- Model settings
- Block models: a constrained subset
- Fields: create, update, convert, delete
- Fieldsets
- Singletons auto-create their record
- Reference-cascade strategies (the non-obvious part of link/structured-text validators)
- Schema mutations are async jobs
- Impact analysis before deleting

## Build order: model → fields → meta-relationships

Many model attributes are **field references**: `title_field`, `image_preview_field`, `excerpt_field`, `presentation_title_field`, `presentation_image_field`, `ordering_field`. Can't set on `itemTypes.create` — fields don't exist yet. Order that always works:

1. Block models first (a field's block validator needs their IDs), then models: `itemTypes.create({ name, api_key, ... })` — without field-relationship attributes.
2. `fields.create(model.id, { ... })` — for each field. Create a `string` field before the `slug` field that derives from it, and linked models before the `link` fields that point to them.
3. `itemTypes.update(model.id, { title_field: { id: titleField.id, type: "field" }, ... })` — wire up relationships now that field IDs exist.

The first `string` field of a model becomes its `title_field` and `presentation_title_field` automatically, and the first `file` field its `image_preview_field` and `presentation_image_field`; step 3 is for everything else (`excerpt_field`, `ordering_field`, a different title).

Automatic order: `ordering_field` or `ordering_meta` requires `ordering_direction` (`"asc"` / `"desc"`; newest first = `"desc"`) in the same call — API rejects either without the other and reports the error on the ordering attribute, not the direction.

Display order: `fields.update(fieldId, { position, fieldset: { id, type: "fieldset" } | null })` (also on `fields.create`; `fieldset` moves field in/out of fieldset, `null` = top level) and `fieldsets.update(fieldsetId, { position })`. No `itemTypes.reorderFieldsAndFieldsets` (only private, deprecated `rawReorderFieldsAndFieldsets`).

## Worked example: a model with blocks and Structured Text

```ts
// 1. Block model and its fields (no localized fields, no fieldsets inside blocks)
const cta = await client.itemTypes.create({ name: "CTA", api_key: "cta", modular_block: true });
await client.fields.create(cta.id, {
  label: "Label", api_key: "label", field_type: "string",
  validators: { required: {}, length: { max: 40 } },
});
await client.fields.create(cta.id, {
  label: "Style", api_key: "style", field_type: "string",
  validators: { required: {}, enum: { values: ["primary", "secondary"] } },
  appearance: {
    editor: "string_select",
    parameters: { options: [{ label: "Primary", value: "primary" }, { label: "Secondary", value: "secondary" }] },
    addons: [],
  },
});

// 2. Model, then fields
const article = await client.itemTypes.create({ name: "Article", api_key: "article", draft_mode_active: true });
const title = await client.fields.create(article.id, {
  label: "Title", api_key: "title", field_type: "string",
  validators: { required: {} },
});
await client.fields.create(article.id, {
  label: "Slug", api_key: "slug", field_type: "slug",
  validators: { required: {}, unique: {}, slug_title_field: { title_field_id: title.id }, slug_format: { predefined_pattern: "webpage_slug" } },
});
await client.fields.create(article.id, {
  label: "Body", api_key: "body", field_type: "structured_text",
  validators: {
    structured_text_blocks: { item_types: [cta.id] },        // required
    structured_text_links: { item_types: [article.id] },     // required ([] = no record links)
    structured_text_inline_blocks: { item_types: [] },       // optional; omitted or [] = no inline blocks
  },
  appearance: {
    editor: "structured_text",
    parameters: { heading_levels: [2, 3], marks: ["strong", "emphasis", "code"] },
    addons: [],
  },
});
await client.fields.create(article.id, {
  label: "Sections", api_key: "sections", field_type: "rich_text", // Modular Content
  validators: { rich_text_blocks: { item_types: [cta.id] }, size: { max: 20 } },
});
```

## Model settings

Create: `client.itemTypes.create({ name, api_key, ...settings })`. All settings default to `false` / `null` unless noted.

| Setting | Rule |
| - | - |
| `name`, `api_key` | Required, unique. `api_key`: lowercase, starts with a letter, 2+ characters, no `__`, no trailing `_`, no `_` right before a digit, and **singular** (`blog_post`; `blog_posts` → `VALIDATION_PLURAL`). Reserved: `id`, `find`, `site`, `environment`, `available_locales`, `item_types`, `single_instance_item_types`, `collection_item_types`, `items_of_type`, `model` |
| `modular_block` | `true` = block model. Fixed at creation: a model cannot become a block model or the reverse |
| `singleton` | One record only. Not with `sortable`, `tree` or an ordering. Turning it on fails with `MULTIPLE_INSTANCES_OF_SINGLETON` when the model has more than one record |
| `sortable` / `tree` | Manual ordering / parent-child hierarchy. Mutually exclusive with `ordering_field` and `ordering_meta` |
| `ordering_field` + `ordering_direction` | Default sort by a field of type `string`, `date`, `date_time`, `integer`, `float`, `boolean`; direction `"asc"` \| `"desc"` required |
| `ordering_meta` + `ordering_direction` | Default sort by `created_at`, `updated_at`, `first_published_at` or `published_at`; not together with `ordering_field` |
| `draft_mode_active` | Records have a draft and a published version. Default: the environment's setting (normally `true`) |
| `draft_saving_active` | Invalid records can be saved as drafts; validators are enforced at publish. Needs `draft_mode_active` |
| `all_locales_required` | Every locale must be present in every localized field. Default `false` through the CMA |
| `collection_appearance` | `"compact"` (default) or `"table"` |
| `inverse_relationships_enabled` | Exposes `_allReferencing…` queries in the CDA |
| `hint` | Text shown to editors |
| `title_field` | SEO title fallback; a `string` field |
| `image_preview_field` | SEO image fallback; `file` or `gallery` |
| `excerpt_field` | SEO description fallback; `string`, `text` or `structured_text` |
| `presentation_title_field` | Title shown in the dashboard; `string`, `text`, `structured_text`, `slug`, `date`, `date_time`, `integer`, `float`, `color`, `lat_lon`, `video`, `link`, `single_block` |
| `presentation_image_field` | Image shown in the dashboard; `file`, `gallery`, `link`, `video`, `color`, `date`, `date_time`, `lat_lon`, `single_block` |
| `workflow` | Relationship to a workflow (plan feature: `PLAN_UPGRADE_REQUIRED`) |

Field relationships (`{ id, type: "field" }`) must point to fields of the same model (`FIELD_DOES_NOT_BELONG_TO_ITEM_TYPE`).

## Block models: a constrained subset

Block model is model with `modular_block: true`. Blocks are **inline children** of a record, not standalone content, so:

- These must stay `false` / unset: `singleton`, `sortable`, `tree`, `draft_mode_active`, `draft_saving_active`, `inverse_relationships_enabled`, `title_field`, `image_preview_field`, `excerpt_field`. API rejects create otherwise.
- Their fields cannot be `localized` (the field that contains the block is what gets localized), cannot use the `unique` validator, cannot sit in a fieldset, cannot enable `deep_filtering_enabled`. Everything else is allowed, including block fields of their own (nesting) and link fields to records.
- A block model can only be listed in block validators (`rich_text_blocks`, `single_block_blocks`, `structured_text_blocks`, `structured_text_inline_blocks`); a regular model only in link validators (`item_item_type`, `items_item_type`, `structured_text_links`).
- Block records never created via `client.items.create` directly; appear inside parent record's Modular Content / Single Block / Structured Text field payload (see `references/editing-records.md`).
- Deleting a block model that a field still allows fails with `MODULAR_BLOCK_IN_USE`: remove it from those validators first (which destroys its existing blocks).

`itemTypes.list()` returns regular models and block models mixed; filter on `m.modular_block` when you only want one kind.

## Fields: create, update, convert, delete

`client.fields.create(modelIdOrApiKey, { label, api_key, field_type, ... })`. Required: `label` (unique within the model), `api_key`, `field_type`. Optional: `localized`, `validators`, `appearance`, `hint`, `default_value`, `position`, `fieldset`, `deep_filtering_enabled`, `content_link_enabled`.

Which validators and editors a type accepts, their exact names and parameters, value shapes and `default_value` support are in `references/field-types.md`: look them up there instead of inferring them. The rules that most often reject a field:

- Requiredness is a validator, not a top-level field property: `validators: { required: {} }`, or `validators: {}` for an optional field. Do not send `required: false`. Types without `required`: `boolean` (no validators at all), `gallery`, `links`, `rich_text` (use `size: { min: 1 }`), `seo` (use `required_seo_fields`).

- `link`, `links`, `rich_text`, `single_block` and `structured_text` need their item-type validators at creation. `structured_text` needs both `structured_text_blocks` and `structured_text_links`, and accepts inline blocks only through `structured_text_inline_blocks`.

- `appearance`, when sent, carries `editor`, `parameters` and `addons` together (`{}` and `[]` when empty); unknown parameters are rejected. Omit it to get the type's default editor.

- Names often confused: `length` (characters) vs `size` (number of items), `number_range` (not `numeric_range`), `rich_text_blocks` / `single_block_blocks` (block allowlists).

- For validator and editor **choices** rather than payload mechanics, load `../../datocms-content-modeling/references/field-configuration.md`.

- `api_key` format: same as models, without the singular rule. Reserved: `position`, `is_valid`, `id`, `type`, `updated_at`, `created_at`, `attributes`, `fields`, `item_type`, `is_singleton`, `seo_meta_tags`, `parent_id`, `parent`, `children`, `status`, `meta`, `eq`, `neq`, `all_in`, `any_in`, `creator`, `exists` (`VALIDATION_RESERVED`).

- `hint` accepts a little HTML: `a`, `b`, `i`, `em`, `strong`, `u`, `code`, `br`.

- `deep_filtering_enabled`: only on `rich_text`, `single_block`, `structured_text` fields of regular models. `content_link_enabled` (default `true`) can be turned off only on `string`, `text`, `structured_text`.

- **Update:** `validators` replaces the whole object (send all of them); `appearance.parameters` merge while the editor stays the same.

- **Changing `field_type`:** only `string`↔`text`, `integer`↔`float`, `file`↔`gallery`, `link`↔`links`, `rich_text`↔`single_block`. The request ignores every other attribute sent with it; values, `hint` and `default_value` are kept. Validators carried over: `string` → `text` all but `enum`, `unique`, `length`; `text` → `string` all but `length`; `integer`↔`float` all but `number_range`; `link`↔`links` and `rich_text`↔`single_block` only the item-type allowlist; `file`↔`gallery` none. The editor becomes the new type's default (`link_select`↔`links_select`, `link_embed`↔`links_embed`), keeping only the parameters both editors share. Re-apply what was dropped in a second request (`rich_text` → `single_block` keeps the first block only). `string` → `text` is refused with `USED_AS_SLUG_SOURCE` while a slug derives from it. Any other change of type: create a new field and migrate the values.

- **Toggling `localized`:** `false` → `true` copies the current value into every locale; `true` → `false` keeps the main locale's value and drops the others.

- **Narrowing an allowlist** (removing a model from `item_types` of a link or block validator, or sending the list empty) rewrites every record at once: links to that model are removed, its blocks are destroyed, and in Structured Text an `itemLink` becomes plain text. Widening the list again brings nothing back.

- Tightening validators does not reject: existing records are re-validated in the background and may become invalid (they then fail on their next save or publish).

- **Deleting a field** deletes its values in every record. Fork a sandbox first (see `references/environments.md`).

## Fieldsets

`client.fieldsets.create(modelId, { title, hint?, position?, collapsible?, start_collapsed? })`. `title` unique per model; `start_collapsed` needs `collapsible: true`; positions share one sequence with the fields outside fieldsets. Not available on block models (`VALIDATION_NOT_ALLOWED_ON_BLOCK_MODELS`). Put a field in one with `fieldset: { id, type: "fieldset" }`.

## Singletons auto-create their record

Setting `singleton: true` on model causes DatoCMS to **lazily auto-create** singleton record. After create, `model.meta.has_singleton_item` is `false` and `model.singleton_item` is `null` until something (UI visit, API call) materializes it. Once exists, `singleton_item` points at record id. To pre-populate from script, just `items.create({ item_type: { id, type: "item_type" } })` — API enforces "exactly one" for you.

## Reference-cascade strategies (the non-obvious part of link/structured-text validators)

`item_item_type` (single link), `items_item_type` (multiple links), and `structured_text_links` validators all share three cascade-strategy fields beyond `item_types` allowlist:

- **`on_publish_with_unpublished_references_strategy`** — `"fail"` (refuse publish; default) | `"publish_references"` (auto-publish dependencies). Use latter only when model graph genuinely cascades top-down ("Page" publishing should publish embedded "Author").
- **`on_reference_unpublish_strategy`** — `"delete_references"` (default) | `"fail"` | `"unpublish"`. Behavior when upstream record unpublished while referrer still published. `"delete_references"` removes reference from referrer (`null` for single, dropped from array for multiple).
- **`on_reference_delete_strategy`** — `"delete_references"` (default) | `"fail"`. On upstream delete: `"fail"` blocks it; `"delete_references"` unlinks referrers (never deletes them; fails if field `required`).

Pick deliberately — the defaults silently unlink. `"fail"` safe for editorial content; `"delete_references"` when referrer should gracefully degrade. In Structured Text, `delete_references` rewrites the document: an `itemLink` is replaced by its text, an `inlineItem` is dropped.

Native Structured Text nodes (`heading`, `list`, `code`, `blockquote`, `link`, `thematicBreak`) and marks are editor settings, not validators: `appearance.parameters.nodes` / `marks` / `heading_levels` (omitted = all). To enable one, update appearance with the current list plus the new entry — never replace the list or model it as a block.

## Schema mutations are async jobs

`itemTypes.create / update / destroy / duplicate` and `fields.create / update / destroy / duplicate` all run as background jobs. Simplified client awaits them — no special handling needed — but take longer than data operations (seconds, sometimes tens of seconds). Set timeouts and progress logging accordingly when scripting bulk schema changes; consider running them inside sandbox environment first (see `references/environments.md` § Fork → migrate → promote).

## Impact analysis before deleting

- `itemTypes.referencing(modelId)` — models that link to this one (via link/links/structured-text-links validators allowing this model). Use before deleting model to find what would break.
- `fields.referencing(modelId)` — same shape but at field granularity.

Both are read-only queries. Run as pre-check; destroy itself does not surface impact.
