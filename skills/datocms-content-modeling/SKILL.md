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
  the 300 KB / 500-block / 5-level record limits, how to organize the
  admin UI so editors and devs aren't overwhelmed, or how to configure
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

Principles for designing structured content in DatoCMS that's reusable, editor-friendly, and survives redesigns. This skill answers _"how should I model X?"_ — not _"how do I create the model?"_.

## When to apply

- New project content model layout
- Model vs block decisions
- Choosing `single_block`, `rich_text`, `structured_text` for block fields
- Reusable model link vs embedded block
- Taxonomy design: categories, tags, hierarchies, facets
- Refactor page-shaped, redesign-fragile, duplication-heavy schemas
- Diagnose record-size/block-count/nesting-depth limits; design around locale-multiplied block volume
- Admin UI organization: Content tab menu (editors), Schema tab menu (devs), saved views via `item_type_filter`
- Model behavior/presentation config: singleton, sortable, tree, draft-mode, all-locales-required; `presentation_title_field` vs `title_field`; `collection_appearance`; ordering
- Field config: validators, `appearance` choices (`string_select`+`enum`, `framed` vs `frameless` `single_block`, `link_select` vs `link_embed`); editor parameters (slug auto-fill, `structured_text` nodes/marks, SEO previews, `required_alt_title`)

## Core principles

1. **Content is data, not pages.** Structure for meaning, not presentation.
2. **Single source of truth.** Avoid content duplication.
3. **Don't recreate built-in record meta.** Every record exposes `created_at`, `updated_at`, `published_at`, `first_published_at`, `publication_scheduled_at` on `record.meta` — all editor-editable. Never add `published_at` / `first_published_at` / `created_at` fields. Never add `position` fields; use modal's `sortable: true`, `tree: true`, or `ordering_field` / `ordering_meta`. Same for upload metadata: don't add `image_alt`, `image_title`, etc. — `alt`, `title`, `custom_data`, `focal_point` exist on every `file` / `gallery` asset. See `references/separation-of-concerns.md` § Don't recreate built-in record meta, § Don't recreate file/gallery metadata, and `references/model-configuration.md` § Behaviour — ordering.
4. **Future-proof.** Design for unknown channels and redesigns.
5. **Editor-centric.** Optimize for editors, not developers. **Always add hints** to fields, fieldsets, models unless obvious — schema is editor UI. See `references/separation-of-concerns.md` § Hints.

## Routing

Once modeling decision made:

- **Implementation** — `datocms-cli` (migrations, default) or `datocms-cma` (user opts out of migrations / wants immediate schema mutation).
- **Querying / rendering** — `datocms-cda` for GraphQL reads and Structured Text query fragments; `datocms-frontend-integrations` for framework rendering.
- **Validator and cascade-strategy mechanics** — `datocms-cma/references/schema.md` (link/structured-text validators, `on_reference_delete_strategy`, etc.).
- **Building or editing actual DAST tree** — `datocms-cma/references/editing-records.md` (full DAST grammar, dastdown round-trip, typed guards).

## References

Load reference matching your decision. Don't load whole set upfront.

- `references/separation-of-concerns.md` — naming/shaping content for meaning, not appearance. Includes redesign test.
- `references/models-vs-blocks.md` — central DatoCMS modeling decision: model vs block. Structural rules (no orphans, no link-field references, locale inheritance from containing field); per-record limits (300 KB / 500 blocks / 5 levels deep); locale multiplier forces model decision when content compounds.
- `references/block-fields-and-structured-text.md` — picking `single_block`, `rich_text` (Modular Content), `structured_text`; inline-vs-block-vs-itemLink-vs-inlineItem matrix; inline DAST node cheatsheet; container-shape effects on limits.
- `references/content-reuse.md` — link fields, project-level Blocks Library, built-in `seo` field type, frameless single-block pattern (DatoCMS "shared field set" equivalent), tree-model taxonomies, fieldset grouping, block-library hygiene anti-patterns.
- `references/taxonomy-classification.md` — flat tags, hierarchical tree models, faceted classification via multiple link fields, cascade strategies governing deletion behavior.
- `references/ui-organization.md` — admin UI organization: Content tab menu (`menu_item`) for editors, Schema tab menu (`schema_menu_item`) for developers, saved views via `item_type_filter`, emoji-prefix conventions, auto-creation flow on `itemTypes.create`, IA heuristics for both audiences.
- `references/model-configuration.md` — full model-level attributes: behaviour (singleton, draft mode, all_locales_required, sortable / tree / ordering strategies, inverse_relationships_enabled), UI (presentation_title_field, presentation_image_field, collection_appearance), CDA SEO fallbacks (title_field, image_preview_field, excerpt_field feeding `_seoMetaTags`). Create-then-wire mechanic for field-reference attributes and block-model constraints.
- `references/field-configuration.md` — per-field validators, `appearance` editors. Validators: enum, format, length, unique, slug_title_field, required_alt_title, required_seo_fields, file extension predefined lists (`transformable_image`), image_dimensions / aspect_ratio, structured text size/length. Appearance choices: boolean radio group, string_select+enum, markdown vs wysiwyg vs textarea, json multi_select / checkbox_group, framed vs frameless single_block, link_select vs link_embed, structured_text nodes/marks/heading_levels, SEO fields/previews, slug url_prefix, color preset palette, single_line heading.
