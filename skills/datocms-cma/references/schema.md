# Schema: Models, Fields, and Fieldsets

Models (item types) define content structure. Fields define attributes. Fieldsets group fields visually.

> For endpoint shapes, payload attributes, and TS signatures, consult `npx datocms cma:docs itemTypes <action> --types-depth 2`, `cma:docs fields <action> --types-depth 2`, or `cma:docs fieldsets <action> --types-depth 2`. The per-field-type validator and appearance shapes are not inlined at depth 2 — pass `--expand-types LinkFieldValidators` (or `StructuredTextFieldValidators`, `RichTextFieldValidators`, `SlugFieldValidators`, etc.) to drill into a specific one. This file only covers what the docs don't carry.

## Build order: model → fields → meta-relationships

Many model attributes are **field references**: `title_field`, `image_preview_field`, `excerpt_field`, `presentation_title_field`, `presentation_image_field`, `ordering_field`. They cannot be set on `itemTypes.create` because the fields don't exist yet. The ordering that always works:

1. `itemTypes.create({ name, api_key, ... })` — without any field-relationship attributes.
2. `fields.create(model.id, { ... })` — for each field, in any order.
3. `itemTypes.update(model.id, { title_field: { id: titleField.id, type: "field" }, ... })` — wire up the relationships now that the field IDs exist.

Skipping step 3 is a common mistake when scripting migrations: the model is created and populated but the editor UI lacks the title preview / SEO fallbacks because nothing was wired.

`itemTypes.reorderFieldsAndFieldsets(modelId, { data: [...] })` is the migration-friendly way to control field display order. Each `data` entry is either `{ id, type: "field", position, fieldset: { id, type: "fieldset" } | null }` (the `fieldset` slot moves the field in/out of a fieldset, `null` puts it at top level) or `{ id, type: "fieldset", position }`.

## Block models: a constrained subset

A block model is just a model with `modular_block: true`, but several flags are not legal on it: `sortable`, `tree`, `draft_mode_active`, `draft_saving_active`, `singleton`, `inverse_relationships_enabled` must all be `false`. The API rejects the create otherwise. The reason: blocks are **inline children** of parent records, not standalone entities — they have no independent publication state, no list page, no tree position.

Block records are never created via `client.items.create` directly; they appear inside a parent record's Modular Content / Single Block / Structured Text field payload (see `references/editing-records.md`).

`itemTypes.list()` returns regular models and block models mixed; filter on `m.modular_block` when you only want one kind.

## Singletons auto-create their record

Setting `singleton: true` on a model causes DatoCMS to **lazily auto-create** the singleton record. After create, `model.meta.has_singleton_item` is `false` and `model.singleton_item` is `null` until something (UI visit, API call) materializes it. Once it exists, `singleton_item` points at the record id. To pre-populate from a script, just `items.create({ item_type: { id, type: "item_type" } })` — the API enforces "exactly one" for you.

## Reference-cascade strategies (the non-obvious part of link/structured-text validators)

`item_item_type` (single link), `items_item_type` (multiple links), and `structured_text_links` validators all share three cascade-strategy fields beyond the `item_types` allowlist:

- **`on_publish_with_unpublished_references_strategy`** — `"fail"` (refuse the publish; default) | `"publish_references"` (auto-publish the dependencies). Use the latter only when the model graph genuinely cascades top-down (a "Page" publishing should publish its embedded "Author").
- **`on_reference_unpublish_strategy`** — `"fail"` | `"unpublish"` | `"delete_references"`. Behavior when an upstream record is unpublished while a referrer is still published. `"delete_references"` removes the reference from the referrer (it becomes `null` for single, dropped from array for multiple).
- **`on_reference_delete_strategy`** — `"fail"` | `"delete_references"` | `"set_to_null"`. Behavior when an upstream record is hard-deleted.

These don't auto-document — pick deliberately. `"fail"` everywhere is the safe default for editorial content; `"set_to_null"` / `"delete_references"` make sense only when the referrer is meant to gracefully degrade.

## Structured-text: three overlapping validators, three roles

A `structured_text` field actually accepts three `*_blocks`-shaped validators that look similar but address different parts of the DAST tree:

- **`structured_text_blocks`** — the allowlist for **block** nodes (block-level, between paragraphs).
- **`structured_text_inline_blocks`** — the allowlist for **inlineBlock** nodes (inline within paragraphs/headings; mid-flow content like badges, mentions, equations).
- **`structured_text_links`** — the allowlist for **itemLink** / **inlineItem** nodes (record references rendered as link or chip), and where the cascade-strategy fields live.

Setting `structured_text_blocks` does not implicitly authorize inline blocks or links — wire each to the models that should be permitted. For a "no embedded blocks" structured text, set `structured_text_blocks: { item_types: [] }` (and the same for inline / links). See `references/editing-records.md` § Structured Text for how the resulting DAST is constructed.

## Slug auto-fill

The `slug_title_field` validator binds a slug field to a string field for editor auto-generation:

```ts
validators: {
  slug_title_field: { title_field_id: titleField.id },
  slug_format: { predefined_pattern: "webpage_slug" },
}
```

Without `slug_title_field`, the slug is editor-typed only. With it, the editor pre-fills and updates from the bound title until the user manually edits the slug. Useful in migration scripts that recreate models with the editor UX users expect.

## Localized defaults take a locale-keyed object

For a localized field, `default_value` is `{ [locale]: value }`, not a bare value:

```ts
default_value: { en: "Untitled", it: "Senza titolo" }
```

Passing a bare value on a `localized: true` field is silently accepted and then doesn't apply (or yields odd behavior) — TypeScript's discriminated union catches this when you've passed the right `localized` literal.

## Schema mutations are async jobs

`itemTypes.create / update / destroy / duplicate` and `fields.create / update / destroy / duplicate` all run as background jobs. The simplified client awaits them — no special handling needed — but they take longer than data operations (seconds, sometimes tens of seconds). Set timeouts and progress logging accordingly when scripting bulk schema changes; consider running them inside a sandbox environment first (see `references/environments.md` § Fork → migrate → promote).

## Impact analysis before deleting

- `itemTypes.referencing(modelId)` — models that link to this one (via link/links/structured-text-links validators allowing this model). Use before deleting a model to find what would break.
- `fields.referencing(modelId)` — same shape but at field granularity.

Both are read-only queries. Run them as a pre-check; the destroy itself does not surface impact.

## Editor appearance — defaults vs explicit

Each `field_type` has a default editor (e.g. `string` → `"single_line"`, `text` → `"markdown"`, `link` → `"link_select"`). The `appearance` object only needs to be set when overriding (selecting a non-default editor like `"string_select"` for a string with a fixed enum, or `"wysiwyg"`/`"textarea"` for text), or when wiring a plugin-provided editor / addons. Omitting `appearance` is the right move for the common case.
