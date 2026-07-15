# Schema: Models, Fields, and Fieldsets

Models define structure. Fields define attributes. Fieldsets group fields visually.

> Endpoint shapes / payloads / TS sigs: `npx datocms cma:docs {itemTypes|fields|fieldsets} <action>` (add `--expand-types '*'` for full TS definitions). Only what docs don't carry below.

## Build order: model → fields → meta-relationships

Many model attributes are **field references**: `title_field`, `image_preview_field`, `excerpt_field`, `presentation_title_field`, `presentation_image_field`, `ordering_field`. Can't set on `itemTypes.create` — fields don't exist yet. Order that always works:

1. `itemTypes.create({ name, api_key, ... })` — without field-relationship attributes.
2. `fields.create(model.id, { ... })` — for each field, any order.
3. `itemTypes.update(model.id, { title_field: { id: titleField.id, type: "field" }, ... })` — wire up relationships now that field IDs exist.

Skipping step 3 is common mistake when scripting migrations: model created and populated but editor UI lacks title preview / SEO fallbacks because nothing wired.

`itemTypes.reorderFieldsAndFieldsets(modelId, { data: [...] })` is migration-friendly way to control field display order. Each `data` entry is either `{ id, type: "field", position, fieldset: { id, type: "fieldset" } | null }` (`fieldset` slot moves field in/out of fieldset, `null` puts at top level) or `{ id, type: "fieldset", position }`.

## Block models: a constrained subset

Block model is model with `modular_block: true`, but several flags not legal: `sortable`, `tree`, `draft_mode_active`, `draft_saving_active`, `singleton`, `inverse_relationships_enabled` must all be `false`. API rejects create otherwise. Reason: blocks are **inline children** of parent records, not standalone — no independent publication state, no list page, no tree position.

Block records never created via `client.items.create` directly; appear inside parent record's Modular Content / Single Block / Structured Text field payload (see `references/editing-records.md`).

`itemTypes.list()` returns regular models and block models mixed; filter on `m.modular_block` when you only want one kind.

## Singletons auto-create their record

Setting `singleton: true` on model causes DatoCMS to **lazily auto-create** singleton record. After create, `model.meta.has_singleton_item` is `false` and `model.singleton_item` is `null` until something (UI visit, API call) materializes it. Once exists, `singleton_item` points at record id. To pre-populate from script, just `items.create({ item_type: { id, type: "item_type" } })` — API enforces "exactly one" for you.

## Validator payload gotchas

`field.validators` is a per-`field_type` map — never copy a validator set between field types. Use `npx datocms cma:docs fields {create|update}` or the [field doc § Validators](https://www.datocms.com/docs/content-management-api/resources/field#validators) for the authoritative keys and exact shapes. For validator and editor **choices** rather than payload mechanics, load `../../datocms-content-modeling/references/field-configuration.md`.

The names most often confused are `length` (characters on string/text/slug/structured text) vs `size` (linked records or Modular Content blocks), `number_range` (not `numeric_range`), and the block allowlists `rich_text_blocks` / `single_block_blocks`. The non-obvious reference-cascade, Structured Text, slug, and localized-default mechanics remain below.

## Reference-cascade strategies (the non-obvious part of link/structured-text validators)

`item_item_type` (single link), `items_item_type` (multiple links), and `structured_text_links` validators all share three cascade-strategy fields beyond `item_types` allowlist:

- **`on_publish_with_unpublished_references_strategy`** — `"fail"` (refuse publish; default) | `"publish_references"` (auto-publish dependencies). Use latter only when model graph genuinely cascades top-down ("Page" publishing should publish embedded "Author").
- **`on_reference_unpublish_strategy`** — `"fail"` | `"unpublish"` | `"delete_references"`. Behavior when upstream record unpublished while referrer still published. `"delete_references"` removes reference from referrer (`null` for single, dropped from array for multiple).
- **`on_reference_delete_strategy`** — `"fail"` | `"delete_references"` | `"set_to_null"`. Behavior when upstream record hard-deleted.

These don't auto-document — pick deliberately. `"fail"` everywhere is safe default for editorial content; `"set_to_null"` / `"delete_references"` make sense only when referrer meant to gracefully degrade.

## Structured-text: three overlapping validators, three roles

`structured_text` field actually accepts three `*_blocks`-shaped validators that look similar but address different parts of DAST tree:

- **`structured_text_blocks`** — allowlist for **block** nodes (block-level, between paragraphs).
- **`structured_text_inline_blocks`** — allowlist for **inlineBlock** nodes (inline within paragraphs/headings; mid-flow content like badges, mentions, equations).
- **`structured_text_links`** — allowlist for **itemLink** / **inlineItem** nodes (record references rendered as link or chip), and where cascade-strategy fields live.

Setting `structured_text_blocks` does not implicitly authorize inline blocks or links — wire each to models that should be permitted. For "no embedded blocks" structured text, set `structured_text_blocks: { item_types: [] }` (and same for inline / links). See `references/editing-records.md` § Structured Text for how resulting DAST is constructed.

## Slug auto-fill

`slug_title_field` validator binds slug field to string field for editor auto-generation:

```ts
validators: {
  slug_title_field: { title_field_id: titleField.id },
  slug_format: { predefined_pattern: "webpage_slug" },
}
```

Without `slug_title_field`, slug is editor-typed only. With it, editor pre-fills and updates from bound title until user manually edits slug. Useful in migration scripts that recreate models with editor UX users expect.

## Localized defaults take a locale-keyed object

For localized field, `default_value` is `{ [locale]: value }`, not bare value:

```ts
default_value: { en: "Untitled", it: "Senza titolo" }
```

Passing bare value on `localized: true` field is silently accepted and then doesn't apply (or yields odd behavior) — TypeScript's discriminated union catches this when you've passed right `localized` literal.

## Schema mutations are async jobs

`itemTypes.create / update / destroy / duplicate` and `fields.create / update / destroy / duplicate` all run as background jobs. Simplified client awaits them — no special handling needed — but take longer than data operations (seconds, sometimes tens of seconds). Set timeouts and progress logging accordingly when scripting bulk schema changes; consider running them inside sandbox environment first (see `references/environments.md` § Fork → migrate → promote).

## Impact analysis before deleting

- `itemTypes.referencing(modelId)` — models that link to this one (via link/links/structured-text-links validators allowing this model). Use before deleting model to find what would break.
- `fields.referencing(modelId)` — same shape but at field granularity.

Both are read-only queries. Run as pre-check; destroy itself does not surface impact.

## Editor appearance — defaults vs explicit

Each `field_type` has a default editor (`string` → `single_line`, `text` → `markdown`, `link` → `link_select`, single block → `framed_single_block`, modular content → `rich_text`). Omitting `appearance` uses that default — right for the common case. Set it only to override (e.g. `string_select` for a string with a fixed `enum`, `wysiwyg`/`textarea` for text) or to wire a plugin editor/addons.

When you set `appearance`, supply all three keys: `editor`, `parameters`, and `addons`. Parameters are editor-specific and sometimes required, so never copy them between editors; use `npx datocms cma:docs fields create --expand-types '*'` or the [field doc § Specifying the appearance](https://www.datocms.com/docs/content-management-api/resources/field#specifying-the-appearance) for the exact shape. Plugin editors additionally require `field_extension`; addon entries use `{ id, field_extension, parameters }`. For guidance on choosing an editor, load `../../datocms-content-modeling/references/field-configuration.md`.
