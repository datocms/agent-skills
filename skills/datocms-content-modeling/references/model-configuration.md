# Model configuration

Models in DatoCMS carry a lot of attributes beyond their fields. Most of them are decisions you make once at creation time and live with for the project's lifetime. This reference categorizes them so the next person (or you, six months from now) understands _what each flag actually changes_.

## Three camps, not two

Common framing splits model attributes into "UI" vs "behaviour." That misses a third camp that bites teams who don't know it exists.

| Camp | What it changes | Examples |
| - | - | - |
| **Behaviour** | How records work — lifecycle, ordering, locale rules, GraphQL surface | `singleton`, `draft_mode_active`, `tree`, `ordering_field`, `all_locales_required` |
| **UI** | How editors see the model in the admin | `presentation_title_field`, `presentation_image_field`, `collection_appearance` |
| **CDA SEO fallbacks** | What the public site renders in `<head>` when an SEO field is empty | `title_field`, `image_preview_field`, `excerpt_field` |

The UI vs SEO-fallback split is the trap: `title_field` and `presentation_title_field` _look_ similar but live in different worlds. See § "Don't confuse `title_field` with `presentation_title_field`."

## Reserved model `api_key` values

The following identifiers are reserved and **cannot be used as a model's `api_key`** — they collide with the GraphQL CDA's built-in `Site` query surface (`_site`, `_allItems`, etc.) and the API will reject them at create time:

```
id, find, site, environment, available_locales, item_types,
single_instance_item_types, collection_item_types, items_of_type,
model
```

Pick a different `api_key` (for example `model_definition` instead of `model`, `place` instead of `site`).

## Field-reference attributes need a two-step create

Before going through the camps: many of these attributes (`title_field`, `image_preview_field`, `excerpt_field`, `presentation_title_field`, `presentation_image_field`, `ordering_field`) are _references to fields that don't exist yet_ when the model is first created. They have to be wired up after the fields exist:

1. `itemTypes.create` — without any field-relationship attributes
2. `fields.create` for each field
3. `itemTypes.update` — wire `title_field`, `presentation_title_field`, etc. to the now-existing field IDs

For the full mechanic and ordering rules, see `../../datocms-cma/references/schema.md` § "Build order: model → fields → meta-relationships."

---

## Behaviour — lifecycle

### `singleton`

Marks a model as single-instance. DatoCMS lazily auto-creates the record on first UI visit or API call — `model.meta.has_singleton_item` is initially `false`, then flips when the record materializes.

**Use for:** site settings, global config, footer, header, homepage, "about the company" — anything where there's exactly one record by definition.

**Don't use for:** anything where the team might want a second one later. Once the model has fields, undoing `singleton` and adding more records is friction. If in doubt, leave singleton off and seed one record manually.

Block models can't be singletons (the API enforces `singleton: false` for `modular_block: true`).

### `draft_mode_active`

Adds a draft/published distinction to records — editors save drafts and explicitly publish. Required for visual editing and preview workflows.

**Use for:** any user-facing content where you want a "save without going live" capability — articles, marketing pages, products, anything editorial.

**Skip for:** internal-only data, taxonomy roots, settings models where every save _is_ live by intent. Adding `draft_mode_active` later is fine; turning it off is fine but loses any pending drafts.

Block models can't have draft mode (blocks have no independent publication state — they inherit from the parent record).

### `draft_saving_active`

Lets editors save drafts that **don't satisfy field validations**. Validations only apply at publish time.

**Use when:** editors routinely work on long records over multiple sessions and would otherwise be blocked from saving by required fields they haven't filled in yet. Common for articles, complex landing pages.

**Skip when:** the model represents data that should never exist in an invalid state, even as a draft. Settings, configuration, data-integrity-sensitive records.

**Invalid drafts still cannot be published.** The flag relaxes only the _save_ gate — publishing a record always requires every validator to pass. So `draft_saving_active: true` is a pure ergonomics win for editors mid-flight; it never lets bad data reach the public CDA.

This is the missing half of the **required-by-default** strategy: make every field the frontend needs `required`, then turn on `draft_saving_active` so editors can still save incomplete drafts. See `field-configuration.md` § "Make fields required by default" for the full reasoning.

The flag has no effect unless `draft_mode_active: true` is also set. Both must be `false` on block models.

### `all_locales_required`

When `true`, every localized field must have a value in every project locale before the record can be published.

**Use when:** the team operates strict translation parity (legal content, structured data feeds, consistent product catalogs).

**Skip when:** locales fall back gracefully or content is added per locale on a rolling basis (typical editorial workflow). Forcing `all_locales_required: true` on an editorial site usually backfires — editors stop publishing because Italian translations aren't ready.

The default (`false`) lets you publish a record with only some locales populated; the CDA serves whatever is there.

---

## Behaviour — ordering (the mutually-exclusive set)

A model can use exactly one ordering strategy at a time. Setting two of these together either fails or has one silently overriding the other. Pick deliberately.

| Strategy | Set | Editors see | Use for |
| - | - | - | - |
| **Manual sort** | `sortable: true` | Drag-and-drop handle on each record | Curated lists where order is editorial: featured products, homepage cards, navigation |
| **Hierarchical tree** | `tree: true` | Drag-and-drop with indenting; parent/children built in | Categories, doc sections, anything that's "X is a kind of Y." See `taxonomy-classification.md`. |
| **By a field** | `ordering_field: { id, type: "field" }` + `ordering_direction` | Records sort by that field automatically | A natural sort key the model already has: `published_at`, `priority`, `position_in_album` |
| **By a meta timestamp** | `ordering_meta: 'created_at' \| 'updated_at' \| 'first_published_at' \| 'published_at'` + `ordering_direction` | Records sort by record metadata | Pure chronological feeds where the model has no domain-specific date field |
| **None (default)** | All of the above null/false | Records appear in creation order | Reference data, lookup tables, anything where order is irrelevant |

### Decision shortcuts

- _"Do editors care about the order?"_ → no → leave it default.
- _"Is the order editorial / curated?"_ → yes → `sortable` (flat) or `tree` (hierarchical).
- _"Is there a domain field that defines order?"_ → `ordering_field`.
- _"Order is purely chronological and the model has no date field?"_ → `ordering_meta`.

`sortable`, `tree`, and `ordering_field` / `ordering_meta` are mutually exclusive in practice — sortable means _manual_ order, while the ordering\_\* set means _automatic_ order. Block models must have all three off.

### Allowed field types for `ordering_field` and `ordering_meta`

`ordering_field` only accepts fields of these types — anything else (text, structured\_text, link, file, json, color, etc.) is rejected:

```
string, date, date_time, integer, float, boolean
```

`ordering_meta` only accepts these record-meta timestamps:

```
created_at, updated_at, first_published_at, published_at
```

If the natural sort key isn't one of the orderable field types, either add a sibling field of an allowed type (e.g. a `priority` integer alongside a free-form `notes` text) or fall back to manual `sortable: true`.

---

## Behaviour — GraphQL surface

### `inverse_relationships_enabled`

When `true`, the GraphQL CDA exposes inverse relationship fields on this model — given an Author, you can query "all Articles that link to this Author" without writing the reverse query manually.

**Use when:** the frontend genuinely benefits from reverse traversal (an author page that lists the author's articles; a category page that lists products in the category).

**Skip when:** the frontend always queries the relationship from the forward side. Inverse relationships add to the GraphQL schema surface and don't auto-paginate the way collection queries do — they can be expensive on high-fan-out models.

Block models can't enable inverse relationships.

---

## UI — how editors see the model

These attributes only affect the admin interface. They have no impact on the public CDA, and changing them never causes a content migration.

### `presentation_title_field` and `presentation_image_field`

What editors see when this model's records appear in:

- The model's collection (list view)
- Reference / link picker dialogs
- "Recent records" widgets and search results
- Visual editing references

Wire `presentation_title_field` to a field that _editors_ can use to identify a record at a glance — usually the human name, sometimes an internal codename. Wire `presentation_image_field` to whichever image field gives the clearest preview.

**Allowed field types** (the API rejects anything else):

| Attribute | Accepted field types |
| - | - |
| `presentation_title_field` | `string`, `text`, `structured_text`, `slug`, `single_block`, `link`, `date`, `date_time`, `integer`, `float`, `color`, `lat_lon`, `video` |
| `presentation_image_field` | `file`, `gallery`, `single_block`, `link`, `color`, `date`, `date_time`, `lat_lon`, `video` |

The non-obvious entries are intentional: `link` resolves through to the linked record's own presentation fields, and `single_block` resolves through to the block's. Pure data fields like `boolean`, `json`, `seo`, `rich_text`, and `links` (multi) cannot be used.

### `collection_appearance`

Either `'table'` or `'compact'`. These are **two very different layouts**, not just density variants — pick based on the model's role, not on visual taste.

- `'table'` (default, and what you almost always want) — full-width table view with one column per configured field, image previews, saved views, advanced filters, sorting by column. This is the standard "list of records" experience editors expect.
- `'compact'` — a narrow vertical **sidebar** of records on the left, with the selected record opening to the right of it. No image previews. No advanced filters — only a plain text-search box. No per-column sorting. The trade-off is that editors can edit a record while still seeing the surrounding list.

`'compact'` is only appropriate for **small reference / taxonomy-style models** where the collection is short, the records are tiny (often just a label), and editors mostly jump between records to make small edits — e.g. `Tag`, `Category`, `Redirect`, `Author`. Anything larger (blog posts, products, pages) belongs on `'table'`: editors need the filters, the saved views, and the image previews that compact hides.

If in doubt, leave it at the default (`'table'`).

(There's a typo'd alias `collection_appeareance` in the API surface; ignore it and use `collection_appearance`.)

---

## Data — SEO fallbacks for `_seoMetaTags`

`title_field`, `image_preview_field`, and `excerpt_field` look like their `presentation_*` siblings but they don't drive the admin UI. They feed the **CDA's `_seoMetaTags` GraphQL field** (see `../../datocms-cda/references/seo-and-meta.md`):

| Model attr | Fallback for `_seoMetaTags` value | Allowed field types | When the fallback kicks in |
| - | - | - | - |
| `title_field` | `<title>`, `og:title`, `twitter:title` | `string` only | The model has no SEO field, or the SEO field's title is empty |
| `image_preview_field` | `og:image`, `twitter:image` | `file`, `gallery` | SEO field has no image set |
| `excerpt_field` | `<meta name="description">`, `og:description`, `twitter:description` | `string`, `text`, `structured_text` | SEO field has no description set |

The type allowlists are stricter than for `presentation_*_field` because these values feed real `<meta>` tags — `title_field` must be plain text (no `slug`, no `text`, no `structured_text`), and `excerpt_field` must be something that can be serialized to a string description.

### Always wire these on user-facing models

If the model represents a public-facing page or record, wire all three. Editors will routinely forget to fill the dedicated SEO field; the fallbacks ensure the page still ships with sensible meta tags instead of empty strings.

### Don't confuse `title_field` with `presentation_title_field`

They can be the same field, and on simple models often are. But they serve different audiences:

- `presentation_title_field` is for **editors** browsing the admin.
- `title_field` is for the **public site's `<head>`** when the SEO field is empty.

Worked example where they diverge:

```
Project model
  ├── codename             (string — internal: "Project Apollo")
  ├── public_name          (string — "Apollo Lunar Module Restoration")
  ├── cover_image          (file)
  └── seo                  (seo field)

presentation_title_field → codename     # editors recognize "Project Apollo"
title_field               → public_name  # the public site shows the real name
presentation_image_field  → cover_image
image_preview_field       → cover_image
```

Editors browsing the admin see "Project Apollo" everywhere — fast identification. The public site, when SEO is unfilled, falls back to "Apollo Lunar Module Restoration" — the name visitors should see.

---

## Block model constraints (recap)

When `modular_block: true`, the API enforces these flags as `false`:

- `singleton`
- `sortable`
- `tree`
- `draft_mode_active`
- `draft_saving_active`
- `inverse_relationships_enabled`

`ordering_field`, `ordering_meta`, `ordering_direction` and the `title_field` / `image_preview_field` / `excerpt_field` SEO fallbacks also don't apply meaningfully to blocks (block records aren't queried from `_seoMetaTags`; they live inside parent records).

`presentation_title_field` and `presentation_image_field` _do_ apply to blocks — they control how block instances appear in the editor's block picker and inside Modular Content / Structured Text fields. Wire them when the block has more than two or three fields, otherwise the picker shows generic placeholders.

For the model-vs-block decision itself, see `models-vs-blocks.md`.

---

## Common mistakes

- **Setting `singleton: true` and then needing two records.** Hard to walk back. Default to non-singleton; promote later only if the "exactly one" constraint is genuinely permanent.
- **Skipping `title_field` / `image_preview_field` / `excerpt_field` on user-facing models.** The site ships with empty meta tags whenever an editor forgets the SEO field. Wire fallbacks.
- **Wiring `presentation_title_field` to the SEO title field.** The SEO title is optimized for search engines, not for editor recognition. Use a separate human-friendly field for the admin preview.
- **Setting `sortable: true` on a model with thousands of records.** Manual drag-and-drop doesn't scale. Use `ordering_field` or `ordering_meta` for high-cardinality models.
- **Setting `draft_saving_active: true` without `draft_mode_active`.** No effect — drafts don't exist without draft mode.
- **`all_locales_required: true` on editorial content.** Editors stop being able to publish until every translation is in. Almost always wrong outside of legal/structured-data contexts.
- **Forgetting that field-reference attributes need a second `itemTypes.update` after fields are created.** The model is created fine but the editor sees placeholders instead of titles, and the CDA's `_seoMetaTags` fallback chain has nothing to fall back to.
