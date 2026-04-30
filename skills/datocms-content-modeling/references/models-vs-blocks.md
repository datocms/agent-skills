# Models vs Blocks

The central modeling decision in DatoCMS: should this content be its
own **model** (a record that exists on its own), or a **block** (a
structured fragment that lives only inside a parent record)? Get this
right and reuse, lifecycle, and limits all fall out naturally. Get it
wrong and you fight the platform.

## The three decision questions

Pulled directly from the DatoCMS guidance — apply them in order:

1. **Will I ever want to reference this content from outside the
   record it's defined in?** → if yes, **model**.
2. **Does this content have standalone value, or does it only make
   sense inside a parent record?** → standalone → **model**;
   only-in-parent → **block**.
3. **If the parent were deleted, do I want this content deleted with
   it, or to remain?** → deleted-with-parent → **block**;
   should-remain → **model**.

If the three questions disagree, question 1 wins: anything that needs
to be linked from elsewhere has to be a model. Blocks cannot be the
target of a Link field.

## Structural rules that constrain the choice

These are not preferences — they are platform rules. Letting them
inform the decision avoids dead-ends later.

- **Blocks have no independent existence.** A block only lives inside a
  `single_block` field, a `rich_text` (Modular Content) field, or a
  `structured_text` field. There is no "list of blocks" page in the UI;
  there is no `client.items.find(blockId)` workflow that returns a
  detached block.
- **Blocks don't count toward your plan's record limit.** This makes
  blocks the right choice for content that would otherwise inflate
  record counts (e.g. dozens of layout sections per page).
- **Blocks cannot be linked to.** A Link field's `item_item_type` /
  `items_item_type` validators only accept models, never blocks. If
  another record needs to point at this content, it has to be a model.
- **Deleting the parent deletes its blocks.** No orphaned blocks remain
  in the project. If you want the content to outlive its current
  parent, it's a model.
- **Block fields are not localized at the block level.** Localization
  lives one level up: the *containing* `rich_text` / `single_block` /
  `structured_text` field is what carries `localized: true`, and each
  locale holds its own collection of blocks. See
  `block-fields-and-structured-text.md` for the locale-multiplier
  consequences.
- **Block models have a constrained subset of model flags.** `sortable`,
  `tree`, `draft_mode_active`, `draft_saving_active`, `singleton`, and
  `inverse_relationships_enabled` must all be `false` on block models.
  This is enforced by the API. Anything that needs those flags has to
  be a model. For what each flag actually does, see
  `model-configuration.md` § Behaviour.

## Hard limits — they force the model decision

Block-bearing fields are bounded per-record. When content compounds,
these limits push the decision *toward models* even when blocks would
otherwise feel right.

| Limit | Default value | Notes |
|---|---|---|
| Maximum record size | **300 KB** | Includes content in nested blocks. Linked records and asset uploads do **not** count. Higher limits available on some plans. |
| Maximum blocks per record | **600** | Counts blocks across all block-bearing fields and all nesting levels in one record. |
| Maximum nested-block depth | **5 levels** | A block inside a block inside a block… 5 deep, total. |

A record that approaches any of these is a **modeling smell**.
Promoting compounding blocks into a linked model is the standard
fix — linked records don't count toward the host's size or block
budget.

### The locale multiplier

Block-bearing fields are localized at the *containing field* level. A
`rich_text` field marked `localized: true` holds an independent block
list per locale. That means:

```
total blocks counted toward the 600/record cap
  = sum over (each locale × each block-bearing field × blocks in that locale)
```

Worst-offender shape: a long landing page with many `rich_text` fields,
each with dozens of blocks, in 6+ locales. The math compounds. Heavy
locales + page-builder is the top reason teams blow the limit.

### Mitigations (in rough order of preference)

All three of the first mitigations are model-vs-block reframes — they
move content from blocks-inside-the-parent into models-linked-from-the-parent.

1. **Move repeating compositions into linked records.** Instead of a
   `rich_text` with 50 "section" blocks, make a `Section` model and
   link to a list of sections. Linked records don't count toward the
   parent's block budget or 300 KB size.
2. **Promote the page itself to a parent + children model.** A `Page`
   record with a `links` field to `PageSection` records. Each section
   has its own localized fields. Edits are scoped, limits are
   per-section.
3. **Localize at a coarser grain.** Sometimes only the *prose* needs
   to be localized, not the whole composition. A localized
   `structured_text` field with non-localized sibling fields for the
   structural blocks can drop the multiplier dramatically. (This one
   is a container-shape decision — see
   `block-fields-and-structured-text.md`.)
4. **Audit blocks for over-decomposition.** A "callout" with one text
   field, a "spacer" block, a "divider" block — every block is paid
   for in the 600 budget. Consolidate. (Also see `content-reuse.md`
   for block-library hygiene.)

### Diagnosing existing limit failures

When an existing record fails to save with a size or block-count
error, the question to ask first is *which field and which locale is
the worst contributor?* The mitigation usually applies to that one
locale × field combination, not the whole schema.

## Quick examples

| Content | Model or block | Why |
|---|---|---|
| Author profile | model | Reused across many articles, has standalone value, survives article deletion |
| Product | model | Linked from many places, has its own page, lifecycle independent of any one parent |
| Category | model | Many records reference it, lives in a taxonomy that exists on its own |
| Hero section on a landing page | block | Page-specific, makes no sense outside the page, deleted with the page |
| Image gallery on a project page | block | Project-specific composition; each project has its own gallery |
| Quote pulled mid-article | block | Inline composition inside the article's prose; no independent value |
| Reusable testimonial shown on many pages | model (or block, depending on reuse) | If the *same* testimonial appears in multiple places and edits should propagate, model. If each page has its own snapshot, block. |
| SEO metadata for a record | the built-in `seo` field type | Purpose-built field type covering title/description/image/twitter card; don't roll your own |
| Address of a store | depends | One canonical store record → fields directly on the model. Reusable address shape across stores/contacts/employees → block in a `single_block` field |

## Reusable across pages: model or block?

This is where teams hesitate most. The deciding question is **edit
propagation**, not appearance:

- *"If I edit this once, should every place it appears update?"* →
  model + Link field. One source of truth, edits propagate.
- *"Each page has its own copy that drifts independently?"* → block.
  Snapshot semantics, no propagation.

Common examples:

- **Authors** → model. The bio updates across every article.
- **Testimonials shown verbatim on many pages** → model. Editing the
  quote updates everywhere.
- **CTAs** → model when there's a small library of canonical CTAs the
  marketing team curates; block when each page composes its own.
- **Product cards on landing pages** → almost always a model link. The
  product owns its name/price/image; the page references it. (For
  per-context overrides, use the hybrid pattern below.)

## The hybrid: link + override

When content is reusable but a specific context needs to tweak it,
combine a link to the canonical model with override fields in a block.

```
block model: featured_product
  ├── product            (link → product model)
  ├── override_title     (string, optional)
  └── override_blurb     (text, optional)
```

The frontend resolves with `coalesce(override_title, product.title)`.
The product stays canonical; the page-specific tweak is local. See
`datocms-cda` for query patterns.

## Common mistakes

- **Modeling a reusable thing as a block** because "the editor sees it
  on the page." Result: editing one place doesn't update the others;
  the block library fills with near-duplicates.
- **Modeling a page-specific composition as a model** to make it "feel
  reusable later." Result: a model that's only ever used once, plus an
  extra Link field, plus the editor has to navigate two records to edit
  one page.
- **Forcing a tree, sortable, or singleton requirement onto a block.**
  The API will reject it. If the content needs those flags, it's a
  model. See `model-configuration.md` for what each flag changes.
- **Trying to reference a block from another record.** Blocks aren't
  link targets. If another record needs to point at this content,
  promote it to a model.
