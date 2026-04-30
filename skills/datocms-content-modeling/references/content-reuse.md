# Content reuse patterns

DatoCMS gives you three primitives for reuse: **link fields** (one
record points at another), the **project-level Blocks Library**
(block models reusable across many parent models), and **fieldsets**
(grouping fields visually within one model). Each solves a different
problem; mixing them up creates duplication or over-abstraction.

## The reuse spectrum

```
Full duplication ←———————————————————————→ Full reference
(copy fields per model)                     (link to one source)

   fields           single_block          link / links
  duplicated         block model           to a model
  per model        in Blocks Library
```

Most decisions sit in the middle. The choice depends on **edit
propagation** (does editing one place update others?) and **lifecycle
independence** (does this thing exist on its own?).

## Pattern 1 — Reusable model + Link fields

The canonical "shared" pattern in DatoCMS. Use when the same content
appears in multiple places and edits should propagate.

```
Author model (standalone records, one per author)
  ├── name
  ├── bio
  └── photo

Article model
  └── author    (link → Author)

Article model B
  └── authors   (links → [Author])
```

**Use for:** authors, products, categories/tags, canonical CTAs,
locations, team members, anything with its own page or admin lifecycle.

The cascade-strategy fields on link validators decide what happens
when an upstream record is unpublished or deleted while a referrer
is still published — pick deliberately. See
`../../datocms-cma/references/schema.md` for cascade detail.

## Pattern 2 — Block model in the Blocks Library

A block model defined once and used across many parent models, via
`single_block`, `rich_text` (Modular Content), or `structured_text`
fields. Each *use* is an independent instance — no edit propagation
across parents.

```
Block model: callout_block
  ├── tone (enum: neutral / warning / success)
  ├── heading
  └── body

Page model.body            (rich_text, allows callout_block)
Article model.content      (structured_text, allows callout_block block-level)
Landing model.sections     (rich_text, allows callout_block)
```

**Use for:** structural shapes that appear all over the project but
where each instance is its own snapshot — heroes, callouts, image
galleries, FAQ blocks, testimonial cards, code samples.

When the *same content* (not just the same shape) needs to appear in
multiple places, use Pattern 1, not this one.

## Pattern 3 — `seo` field type (the canonical SEO pattern)

DatoCMS has a built-in `seo` field type covering title, description,
image, twitter card, etc. It is the right answer for per-record SEO
metadata. Don't roll your own.

```ts
fields.create(modelId, {
  api_key: "seo",
  field_type: "seo",
});
```

For project-wide global SEO (default OG image, sitewide twitter handle,
etc.), use a `singleton: true` "Site settings" model with `seo` and
other fields directly on it. See `model-configuration.md` § singleton
for the lifecycle, and `field-configuration.md` § "Require specific
SEO sub-fields" for `required_seo_fields` / `title_length` /
`description_length`.

## Pattern 4 — Frameless single_block (the "shared field set")

DatoCMS does not have a "spread shared fields" primitive like some
other CMSes. The DatoCMS-native equivalent is a **block model in a
required, frameless `single_block` field** — sometimes called the
"frameless single block" pattern. It is the canonical answer when
multiple models need the same subset of fields and you want them to
appear *as if they were native fields* in each model.

### When to use it

When several models share a meaningful subset of fields and you want:

- one source of truth for the shape (add a field once, every consumer
  gets it)
- the editor experience to feel like the fields belong to the parent
  model (no extra "open this block" click)
- per-record values (each consumer record has its own values; this is
  not edit-propagation reuse — for that, use Pattern 1)

Classic example: a "Bloggable" shape (title, subtitle, author, tags,
hero image) shared across `BlogPost`, `NewsArticle`, and
`ProductReview`, each of which adds its own model-specific fields
(`body`, `summary`, `rating`). Note that the publish date isn't a
field — it lives on `record.meta.published_at` (see
`separation-of-concerns.md` § "Don't recreate built-in record meta").

### How it works

1. Create a block model with the shared fields. Name it for the *role*
   (`bloggable_block`, `cardable_block`, `geolocated_block`), not for
   any one consumer.
2. On each consumer model, add a `single_block` field that:
   - allows **only** that block model
   - has the **required** validation active
   - uses the **Frameless** presentation mode (set
     `appearance.editor: "frameless_single_block"` — see
     `field-configuration.md` § single_block)

The frameless presentation hides the Modular Content frame in the
editor — the block's fields render inline as if they were defined
directly on the consumer model. From the editor's point of view,
`title`, `author`, `tags`, etc. are fields of `BlogPost`. From the
schema's point of view, they live in one place.

```
Block model: bloggable_block
  ├── title
  ├── subtitle    (string, optional)
  ├── author      (link → Author)
  ├── tags        (links → [Tag])
  └── hero_image  (file)

BlogPost
  ├── shared       (single_block → bloggable_block, required, frameless)
  └── body         (structured_text)

NewsArticle
  ├── shared       (single_block → bloggable_block, required, frameless)
  └── summary      (text)

ProductReview
  ├── shared       (single_block → bloggable_block, required, frameless)
  └── rating       (integer)
```

### Trade-offs

- **Querying** — the shared fields live one level deep
  (`blogPost.shared.title`). GraphQL fragments make this manageable;
  see `datocms-cda` for fragment patterns.
- **Renaming** — adding/removing a field on the shared block updates
  every consumer at once. That's the point, but also means schema
  changes have wider blast radius. Treat the shared block like a
  shared library.
- **Not reuse-of-content, reuse-of-shape.** Each consumer record holds
  its own values. If you want editing one place to update many, this
  is the wrong pattern — use a model + Link (Pattern 1).
- **Don't combine with non-required or non-frameless.** If the field
  isn't required, editors see an "add the shared block" button and the
  whole illusion breaks. If it isn't frameless, editors see a wrapper
  frame around their fields.

## Pattern 5 — Tree-model taxonomies

For hierarchical classification (Electronics > Phones > Smartphones),
use a model with `tree: true`. DatoCMS gives you parent/child and
sortable position out of the box — no need to model `parent` as a
self-reference manually.

See `taxonomy-classification.md` for the full taxonomy guide and
`model-configuration.md` § Behaviour — ordering for how `tree`
interacts with `sortable` / `ordering_field` / `ordering_meta`.

## Pattern 6 — Fieldsets for grouping

Fieldsets group fields **visually** within one model. They don't reuse
content — they organize a long form into editor-friendly sections.

```
Article model
  ├── fieldset: "Content"
  │     ├── title
  │     ├── slug
  │     └── body
  ├── fieldset: "SEO"
  │     └── seo
  └── fieldset: "Publishing"
        ├── published_at
        └── author
```

Use fieldsets to ease editor cognitive load, not as a reuse
mechanism. The same fieldset structure can't be "shared" across
models — if you find yourself wanting that, you probably want the
frameless single-block pattern (Pattern 4) instead.

## Block-library hygiene anti-patterns

The Blocks Library is project-level, so it accretes. The first hygiene
move is the naming convention — every block model `api_key` ends with
`_block` (see `models-vs-blocks.md` § "Naming convention"). The rest of
this section assumes that baseline. Watch for these:

- **Single-use blocks.** A block model used in exactly one parent's
  one field. There's almost no value in the indirection — the fields
  could live on the parent directly. Inline them, or note that this
  block is intentionally page-shaped (e.g. a complex hero only the
  homepage uses).
- **Near-duplicate blocks.** `hero_blue_block`, `hero_yellow_block`,
  `hero_red_block`, or `hero_v1_block`, `hero_v2_block`. Collapse to
  one block with a `tone` / `variant` enum field. The frontend maps
  the variant to design.
- **Page-shaped block names.** `homepage_hero_block`,
  `pricing_page_cta_block`, `blog_index_header_block`. The block
  can't be reused on other pages even when the shape would fit.
  Rename to the *role* (`hero_block`, `cta_block`,
  `index_header_block`) and let the frontend customize per page.
- **God blocks.** A `section_block` with 40 optional fields covering
  every variant the site has ever needed. Editor UX collapses, and
  validation can't enforce which fields belong with which variant.
  Split into focused blocks (`text_section_block`,
  `media_section_block`, `feature_grid_section_block`).
- **Blocks that would be better as models.** If the same conceptual
  content appears as a block in many parents and editors keep asking
  *"can we reuse the same one?"* — they want a model + Link, not a
  block. See `models-vs-blocks.md`.

### Signs of over-abstraction in the other direction

Not everything needs to be reusable.

- A model with three records, all only ever linked from one parent
  each, where editors complain about navigating between records to
  edit one logical thing → should probably be a block.
- A block extracted "just in case it gets reused later" and then
  never reused → inline it.
- A complex hybrid (link + override block + override fields on the
  parent) for content that only exists in one place → simplify.

When in doubt: **start simple, promote later**. It's easier to
extract a block model from inlined fields than to inline a block
model that's been used in 30 records.
