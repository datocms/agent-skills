# Taxonomy and classification

Taxonomies organize content for filtering, navigation, and relationships. DatoCMS gives you native primitives for the three classification shapes that cover almost every case — flat tags, hierarchical trees, and faceted classification.

## The three shapes

### Flat taxonomy

A simple list of terms with no hierarchy. The terms are interchangeable peers; an item can have many of them.

**Use for:** blog tags, content topics, simple flag-like categories.

```
Tag model (standalone records)
  ├── label
  └── slug

Article.tags    (links → [Tag])
```

### Hierarchical taxonomy — use a tree model

Terms with parent-child relationships. **Use DatoCMS's built-in `tree: true` flag** — don't roll your own `parent` self-reference. A tree model gives you parent/child wiring and sortable position out of the box, plus an editor UI that understands the hierarchy.

**Use for:** product categories, content sections, documentation chapters, anything with "X is a kind of Y".

```
Category model (tree: true)
  ├── label
  └── slug

Product.category   (link → Category)
```

The tree is managed in the DatoCMS UI as an actual tree — drag-and-drop reordering, indenting, collapsing. The `parent_id` and `position` attributes are first-class on tree records. For how `tree: true` relates to the other ordering strategies (`sortable`, `ordering_field`, `ordering_meta`) and why they're mutually exclusive, see `model-configuration.md` § Behaviour — ordering.

**Self-referencing models without `tree: true` are an anti-pattern** when the intent is hierarchy. The editor UX is much worse, position isn't tracked, and you reinvent what the platform already provides. The only time to do it manually is when the hierarchy isn't really a hierarchy (e.g. a "see also" graph that happens to use the same model).

### Faceted classification

Multiple **independent** dimensions, where filtering combines them (`color: red AND size: medium AND price < 50`). Each dimension is its own taxonomy model; the consumer record has one Link field per dimension.

**Use for:** e-commerce filters, complex catalog navigation, anything where users combine filters.

```
Color model     (records: red, blue, green, …)
Size model      (records: S, M, L, XL)
Material model  (records: cotton, wool, polyester)

Product.color      (link → Color)
Product.sizes      (links → [Size])
Product.material   (link → Material)
```

Don't try to encode facets as enum values on a single field — you lose per-facet metadata (slug, swatch image, sort order) and can't add values without a migration.

## Design principles

### 1. Mutual exclusivity (when appropriate)

Categories should be distinct. If items frequently belong to many categories, you wanted tags.

- **Categories** — one primary classification. Tree-shaped, exclusive.
- **Tags** — many optional classifications. Flat, inclusive.

A common mistake: modeling everything as "categories" and then allowing many per record. That's tags wearing a category costume.

### 2. User-centric naming

Use the terms your audience uses, not your internal jargon.

- ❌ "Content assets" (internal)
- ✅ "Resources" or "Downloads" (user-facing)

This applies to taxonomy _labels_ and to the `api_key` of the model itself — both leak into URLs, the editor UI, and sometimes the public GraphQL schema.

### 3. Balanced depth

- Too shallow → everything lumped together, no useful filtering.
- Too deep → editors and users can't find anything.

**Rule of thumb: 3–4 levels max** for hierarchies. If you find yourself needing 5+, the leaves are usually facets in disguise.

### 4. Scalable structure

Design for 10× growth. _"Will this still work with 10,000 items and 500 categories?"_ If the answer is "the editor will manage it manually" — it won't.

## Cascade strategies on taxonomy links

Link validators (`item_item_type`, `items_item_type`, `structured_text_links`) carry three cascade-strategy fields that govern what happens when the linked record's state changes. For taxonomies these matter because deleting a category should **not** silently delete every product in it.

| Strategy field | Safe taxonomy default | Why |
| - | - | - |
| `on_publish_with_unpublished_references_strategy` | `"fail"` | Don't accidentally publish a product whose category is still draft |
| `on_reference_unpublish_strategy` | `"fail"` | Unpublishing a category should require explicit handling, not silent breakage |
| `on_reference_delete_strategy` | `"fail"` or `"set_to_null"` | Almost never `"delete_references"` for taxonomy — that would delete the products |

For the full validator/cascade reference, see `../../datocms-cma/references/schema.md`; for where these strategies are configured on link / links / structured\_text\_links validators in the modeling guide, see `field-configuration.md` § Constrain links between records.

## Querying taxonomies

For GraphQL read patterns (filtering by taxonomy, getting items in a category-or-its-children, building category trees), see the `datocms-cda` skill. The query shapes belong there, not here.

## Common mistakes

### Over-categorization

A category for everything → mostly-empty categories, useless filtering. **Fix:** start minimal, add categories as content grows.

### Inconsistent granularity

Some categories broad (`Technology`), others narrow (`React 18 Server
Components`). Both can't sit at the same tree level coherently. **Fix:** define explicit criteria for what merits a category vs a tag.

### No governance

If anyone can create taxonomy records, you'll get duplicates (`JavaScript`, `Javascript`, `JS`, `javascript`). **Fix:** restrict who can create/edit taxonomy records via roles, and validate slugs against duplicates.

### Hierarchy modeled without `tree: true`

A category model with a `parent` link to itself, a manually-managed `position` integer, and an editor UI that has no idea any of this is a tree. **Fix:** rebuild as a tree model. The migration is a one-time cost.

### Tag values stored as a free-text string field

Comma-separated tags in a single `string` field. No deduplication, no slugs, no governance, can't query by tag without `LIKE`-style hacks. **Fix:** model tags as a Tag model + `links` field on the consumer.
