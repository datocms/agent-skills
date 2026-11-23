---
name: datocms-content-modeling
description: >-
  Load BEFORE advising on or deciding how DatoCMS content should be modelled,
  and before designing a schema that will then be created. Decisions, not
  implementation: model vs block; single block vs Modular Content vs Structured
  Text; link vs embedded block; inside Structured Text, record link vs inline
  record vs block vs inline block; taxonomies; record size and nesting limits;
  model behaviour (singleton, draft mode, all locales required, ordering); which
  field type, validator and editor fit a need; whether a field is worth adding;
  the editor's experience: hints, fieldsets, menu organisation, saved views.
  Also schema reviews. Making a decided change: `datocms-cma` or `datocms-cli`.
  Queries and rendering: `datocms-cda`, `datocms-frontend-integrations`.
---

# DatoCMS Content Modeling

Design reusable, editor-friendly DatoCMS schemas. Advice needs no CLI, MCP, login, or setup. Use supplied requirements/schema; inspect live schema through an available authorized route only when needed. Decide shape here; route implementation below.

## Core principles

1. **Content is data, not pages.** Structure for meaning, not presentation.
2. **Single source of truth.** Avoid content duplication.
3. **Don't recreate built-ins.** Record meta (`created_at`, `published_at`, …), asset meta (`alt`, `title`, `custom_data`, `focal_point`), and ordering (`position`) all exist already — never add sibling fields, on records or blocks. See `references/separation-of-concerns.md` and `references/model-configuration.md` § Behaviour — ordering.
4. **Future-proof.** Design for unknown channels and redesigns.
5. **Editor-centric.** Optimize for editors, not developers. **Always add hints** to fields, fieldsets, models unless obvious — schema is editor UI. See `references/separation-of-concerns.md` § Hints.

## Routing

Once modeling decision made:

- **Implementation** — `datocms-cli` (migrations; it asks first when the user has no preference and the repo has no migration convention) or `datocms-cma` (user opts out of migrations / wants immediate schema mutation).
- **Querying / rendering** — `datocms-cda` for GraphQL reads and Structured Text query fragments; `datocms-frontend-integrations` for framework rendering.
- **Validator and cascade-strategy mechanics** — `datocms-cma/references/schema.md` (link/structured-text validators, `on_reference_delete_strategy`, etc.).
- **Building, editing, or validating DAST** — **datocms-structured-text**: [document model](../datocms-structured-text/references/document-model.md), [editing](../datocms-structured-text/references/editing.md); source import/export → [conversion](../datocms-structured-text/references/conversion.md). CMA persists the finished payload.

Missing sibling reference → modeling advice here still stands; for implementation mechanics install that skill from `datocms/agent-skills` or update the full bundle.

## References

**Mandatory** — never propose models, blocks, or fields from memory. Before any structured question or schema suggestion, load every reference whose decision is in scope.

Match decision → file:

- `references/separation-of-concerns.md` — naming/shaping for meaning, not appearance; redesign test; record-meta + file/gallery-meta + position duplication anti-patterns.
- `references/models-vs-blocks.md` — model vs block; structural rules (no orphans, no link-field references, locale inheritance); per-record limits (1 MB / 1,000 blocks / 5 levels; Enterprise 3 MB / 3,000 / 5 levels); locale multiplier.
- `references/block-fields-and-structured-text.md` — `single_block` vs `rich_text` (Modular Content) vs `structured_text`; inline-vs-block-vs-itemLink-vs-inlineItem matrix; native-node modeling choices; **native nodes (`blockquote`, `code`, `list`, `heading`, `thematicBreak`, `link`) — never recreate as blocks**; image/gallery/video block shape (no `caption` sibling).
- `references/content-reuse.md` — link fields, project-level Blocks Library, built-in `seo`, frameless single-block, fieldset grouping, block-library hygiene.
- `references/taxonomy-classification.md` — flat tags, tree models, faceted classification via multiple links, cascade strategies.
- `references/ui-organization.md` — Content tab `menu_item` (editors), Schema tab `schema_menu_item` (devs), saved views via `item_type_filter`, emoji conventions, IA heuristics.
- `references/model-configuration.md` — singleton, draft mode, `all_locales_required`, sortable/tree/ordering, `inverse_relationships_enabled`, `presentation_title_field`, `presentation_image_field`, `collection_appearance`, CDA SEO fallbacks; create-then-wire mechanic.
- `references/field-configuration.md` — validators (enum, format, length, unique, `slug_title_field`, `required_alt_title`, `required_seo_fields`, `transformable_image`, dimensions, structured-text size); `appearance` editors (`string_select`+enum, markdown/wysiwyg/textarea, framed vs frameless `single_block`, `link_select` vs `link_embed`, structured_text nodes/marks/heading_levels, SEO previews, slug `url_prefix`, color presets).
