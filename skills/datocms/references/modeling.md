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
3. **Don't recreate built-ins.** Record meta (`created_at`, `published_at`, …), asset meta (`alt`, `title`, `custom_data`, `focal_point`), and ordering (`position`) all exist already — never add sibling fields, on records or blocks. See `modeling/separation-of-concerns.md` and `modeling/model-configuration.md` § Behaviour — ordering.
4. **Future-proof.** Design for unknown channels and redesigns.
5. **Editor-centric.** Optimize for editors, not developers. **Always add hints** to fields, fieldsets, models unless obvious — schema is editor UI. See `modeling/separation-of-concerns.md` § Hints.

## Routing

Once modeling decision made:

- **Implementation** — [CLI guide](cli.md) (migrations, default) or [CMA guide](cma.md) (user opts out of migrations / wants immediate schema mutation).
- **Querying / rendering** — [CDA guide](cda.md) for GraphQL reads and Structured Text query fragments; [Frontend guide](frontend.md) for framework rendering.
- **Validator and cascade-strategy mechanics** — `cma/schema.md` (link/structured-text validators, `on_reference_delete_strategy`, etc.).
- **Building or editing actual DAST tree** — `cma/editing-records.md` (full DAST grammar, dastdown round-trip, typed guards).

## References

**Mandatory** — never propose models, blocks, or fields from memory. Before any structured question or schema suggestion, load every reference whose decision is in scope.

Match decision → file:

- `modeling/separation-of-concerns.md` — naming/shaping for meaning, not appearance; redesign test; record-meta + file/gallery-meta + position duplication anti-patterns.
- `modeling/models-vs-blocks.md` — model vs block; structural rules (no orphans, no link-field references, locale inheritance); per-record limits (300 KB / 500 blocks / 5 levels); locale multiplier.
- `modeling/block-fields-and-structured-text.md` — `single_block` vs `rich_text` (Modular Content) vs `structured_text`; inline-vs-block-vs-itemLink-vs-inlineItem matrix; DAST cheatsheet; **native nodes (`blockquote`, `code`, `list`, `heading`, `thematicBreak`, `link`) — never recreate as blocks**; image/gallery/video block shape (no `caption` sibling); container-shape effects on limits.
- `modeling/content-reuse.md` — link fields, project-level Blocks Library, built-in `seo`, frameless single-block, tree taxonomies, fieldset grouping, block-library hygiene.
- `modeling/taxonomy-classification.md` — flat tags, tree models, faceted classification via multiple links, cascade strategies.
- `modeling/ui-organization.md` — Content tab `menu_item` (editors), Schema tab `schema_menu_item` (devs), saved views via `item_type_filter`, emoji conventions, IA heuristics.
- `modeling/model-configuration.md` — singleton, draft mode, `all_locales_required`, sortable/tree/ordering, `inverse_relationships_enabled`, `presentation_title_field`, `presentation_image_field`, `collection_appearance`, CDA SEO fallbacks; create-then-wire mechanic.
- `modeling/field-configuration.md` — validators (enum, format, length, unique, `slug_title_field`, `required_alt_title`, `required_seo_fields`, `transformable_image`, dimensions, structured-text size); `appearance` editors (`string_select`+enum, markdown/wysiwyg/textarea, framed vs frameless `single_block`, `link_select` vs `link_embed`, structured_text nodes/marks/heading_levels, SEO previews, slug `url_prefix`, color presets).
