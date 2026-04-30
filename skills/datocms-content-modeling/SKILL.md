---
name: datocms-content-modeling
description: >-
  Principles and decision frameworks for designing DatoCMS content models —
  schema architecture, field shapes, content reuse, taxonomies,
  separation of content from presentation, and admin UI organization
  (Content tab and Schema tab menus). Use when the task is a modeling
  *decision* rather than an implementation: should this be a model or a
  block, single_block vs Modular Content vs Structured Text, when to use
  references vs embedded blocks, how to organize taxonomies (flat / tree /
  faceted), how to refactor a presentation-shaped or page-shaped schema
  into reusable structured content, how many locales × blocks fit inside
  the 300 KB / 600-block / 5-level record limits, how to organize the
  admin UI so editors and devs aren't overwhelmed (menu items, schema
  menu items, saved views via item_type_filter), or how to configure
  a model's behaviour and presentation (singleton, draft mode,
  all_locales_required, sortable vs tree vs ordering_field vs
  ordering_meta, presentation_title_field vs title_field,
  collection_appearance, inverse_relationships_enabled), or how to
  configure individual fields (which validators and which editor
  appearance to pick — enum + string_select pairing, slug auto-fill,
  required_alt_title, structured_text node/mark allowlists, framed vs
  frameless single_block, etc.). Also use when reviewing a schema for
  reusability, editor ergonomics, or omnichannel fitness.
  For *creating* the schema once a decision is made, route to
  `datocms-cli` (migrations, the safe default) or `datocms-cma`
  (programmatic schema mutation). For querying or rendering the resulting
  content, route to `datocms-cda` and `datocms-frontend-integrations`.
  For validator and cascade-strategy detail, route to
  `datocms-cma/references/schema.md`.
---

# DatoCMS Content Modeling

Principles for designing structured content in DatoCMS that's reusable,
editor-friendly, and survives redesigns. This skill answers *"how should I
model X?"* — not *"how do I create the model?"*.

## When to apply

- Starting a new project and laying out the content model
- Deciding whether something is a model or a block
- Picking between `single_block`, `rich_text` (Modular Content), and
  `structured_text` for a block-bearing field
- Choosing between a link to a reusable model vs an embedded block
- Designing taxonomies (categories, tags, hierarchies, facets)
- Refactoring a page-shaped, redesign-fragile, or duplication-heavy schema
- Diagnosing record-size / block-count / nesting-depth limit failures, or
  designing around them when locales multiply block volume
- Organizing the admin UI: the Content tab menu for editors, the
  Schema tab menu for devs, and saved views via `item_type_filter`
- Configuring a model's behaviour and presentation: should this be a
  singleton, sortable, tree, draft-mode, all-locales-required; what
  to wire as `presentation_title_field` vs `title_field`;
  collection_appearance; ordering strategies
- Configuring individual fields: which validator to apply, which
  editor `appearance` to pick (e.g. `string_select` to pair with an
  `enum`, `framed` vs `frameless` single_block, `link_select` vs
  `link_embed`), and which editor parameters matter (slug
  auto-fill, structured_text nodes/marks, SEO previews,
  `required_alt_title`, etc.)

## Core principles

1. **Content is data, not pages.** Structure for meaning, not presentation.
2. **Single source of truth.** Avoid copying content the editor will have
   to update in N places.
3. **Don't recreate built-in record meta.** Every record already exposes
   `created_at`, `updated_at`, `published_at`, `first_published_at`, and
   `publication_scheduled_at` on `record.meta` — all editor-editable in
   the admin UI. Never add a `published_at` / `first_published_at` /
   `created_at` field to a model. Likewise, never add a `position` field
   for ordering: use the model's `sortable: true` (manual order) or
   `tree: true` (parent + position hierarchy) instead, or
   `ordering_field` / `ordering_meta` for automatic order. The same
   trap applies to *upload* metadata: don't add `image_alt`,
   `image_title`, `image_label`, `image_caption` etc. — `alt`,
   `title`, `custom_data`, and `focal_point` already live per-locale
   on every `file` / `gallery` asset. See
   `references/separation-of-concerns.md` § Don't recreate built-in
   record meta, § Don't recreate file/gallery metadata, and
   `references/model-configuration.md` § Behaviour — ordering.
4. **Future-proof.** Design for channels and redesigns that don't exist yet.
5. **Editor-centric.** Optimize for the people creating content, not the
   developer reading the schema once. **Always add hints** to fields,
   fieldsets, and models unless the purpose is genuinely obvious — the
   schema is a user interface for editors, and a one-line hint at
   create time saves recurring confusion forever. See
   `references/separation-of-concerns.md` § Hints for what to write.

## Routing

Once a modeling decision is made:

- **Implementation** — `datocms-cli` (migrations, the safe default) or
  `datocms-cma` (when the user explicitly opts out of migrations or wants
  schema mutation embedded in a larger automation script).
- **Querying / rendering** — `datocms-cda` for GraphQL reads and
  Structured Text query fragments; `datocms-frontend-integrations` for
  framework rendering.
- **Validator and cascade-strategy mechanics** —
  `datocms-cma/references/schema.md` (link/structured-text validators,
  `on_reference_delete_strategy`, etc.).
- **Building or editing the actual DAST tree** —
  `datocms-cma/references/editing-records.md` (full DAST grammar, dastdown
  round-trip, typed guards).

## References

Load the reference that matches the decision in front of you. Do not load
the whole set up front.

- `references/separation-of-concerns.md` — naming and shaping content
  for meaning, not visual appearance. Includes the redesign test.
- `references/models-vs-blocks.md` — the central DatoCMS modeling
  decision: when content should be its own model vs a block. Covers
  the structural rules (no orphans, no link-field references, locale
  inheritance from the containing field), the per-record limits
  (300 KB / 600 blocks / 5 levels deep) and how the locale multiplier
  forces the model decision when content compounds.
- `references/block-fields-and-structured-text.md` — picking between
  `single_block`, `rich_text` (Modular Content), and `structured_text`;
  the inline-vs-block-vs-itemLink-vs-inlineItem decision matrix;
  inline DAST node cheatsheet for modeling decisions; container-shape
  effects on the limits.
- `references/content-reuse.md` — link fields, the project-level Blocks
  Library, the built-in `seo` field type, the frameless single-block
  pattern (DatoCMS's "shared field set" equivalent), tree-model
  taxonomies, fieldset grouping, and block-library hygiene
  anti-patterns.
- `references/taxonomy-classification.md` — flat tags, hierarchical tree
  models, faceted classification via multiple link fields, and the
  cascade strategies that govern deletion behavior.
- `references/ui-organization.md` — organizing the admin UI: the
  Content tab menu (`menu_item`) for editors, the Schema tab menu
  (`schema_menu_item`) for developers, saved views via
  `item_type_filter`, emoji-prefix conventions, the auto-creation
  flow on `itemTypes.create`, and IA heuristics for both audiences.
- `references/model-configuration.md` — the full set of model-level
  attributes split into three camps: behaviour (singleton, draft
  mode, all_locales_required, sortable / tree / ordering strategies,
  inverse_relationships_enabled), UI (presentation_title_field,
  presentation_image_field, collection_appearance), and CDA SEO
  fallbacks (title_field, image_preview_field, excerpt_field that
  feed `_seoMetaTags`). Plus the create-then-wire mechanic for
  field-reference attributes and block-model constraints.
- `references/field-configuration.md` — curated guide to per-field
  validators and `appearance` editors. Validators worth remembering
  (enum, format, length, unique, slug_title_field, required_alt_title,
  required_seo_fields, file extension predefined lists including
  `transformable_image`, image_dimensions / aspect_ratio, structured
  text size/length). Appearance choices that change the editor
  experience (boolean radio group, string_select pairing with enum,
  markdown vs wysiwyg vs textarea, json multi_select / checkbox_group,
  framed vs frameless single_block, link_select vs link_embed,
  structured_text nodes/marks/heading_levels, SEO fields/previews,
  slug url_prefix, color preset palette, single_line heading).
