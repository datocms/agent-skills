# Block-bearing fields and Structured Text

Once you've decided something is a block (see `models-vs-blocks.md`),
the next question is *which container holds it*. DatoCMS has three,
and the choice shapes editing UX, query shape, and how the content
scales with locales.

## Picking the container

| Field type | Shape | Use when |
|---|---|---|
| `single_block` | Exactly one block (or `null`) | A fixed slot: hero on a landing page, SEO block on any record, address on a contact page. The shape is known and singular. |
| `rich_text` (Modular Content) | Ordered list of blocks, no prose between | A page-builder / sequence-of-sections experience. Editors compose pages from a fixed palette of block types. No interleaved free-form text. |
| `structured_text` | Prose tree (DAST) with blocks interleaved | Long-form editorial content where blocks live *inside* the writing — articles with embedded quotes, galleries, CTAs; documentation with code samples; rich editorial pages. |

### Decision shortcuts

- **No prose? → `rich_text`.** Landing pages, page builders, dashboards.
  If editors are stacking sections, not writing paragraphs, this is the
  right field.
- **Prose with embedded structured pieces? → `structured_text`.**
  Articles, blog posts, docs, knowledge base.
- **Exactly one of something? → `single_block`.** SEO, hero, address,
  any "the X for this record" slot. Avoid using a 1-element `rich_text`
  to fake this — `single_block` is purpose-built and queries simpler.
  When the goal is to share a *field set* across many models, use the
  required + frameless variant — see `content-reuse.md` § Pattern 4
  (frameless single_block) and `field-configuration.md` § single_block
  for the appearance setting.

### Anti-patterns

- **Modular Content used for prose.** A "paragraph block" with a single
  text field, repeated, is a Structured Text in disguise. Use
  `structured_text` and the editor gets a real prose UX.
- **Structured Text used as a page builder.** Page sections aren't prose
  — there's no narrative tying them together. Use `rich_text`.
- **A `rich_text` of one allowed block type used as a poor man's
  `single_block`.** Editors get an "add block" UI that can only
  produce one thing, and the query has to handle a 0-or-1 array.

## Validators come in three flavors

A `structured_text` field has **three separate** allowlists, and they
do not imply each other:

- `structured_text_blocks` — which block models may appear as
  block-level (`type: "block"`) nodes.
- `structured_text_inline_blocks` — which block models may appear as
  inline (`type: "inlineBlock"`) nodes.
- `structured_text_links` — which models may appear as `itemLink` /
  `inlineItem` nodes (and where the cascade-strategy fields live).

Setting `structured_text_blocks` does **not** authorize inline blocks
or record links. Wire each one explicitly. For "no embedded blocks at
all" set the array to `[]` rather than omitting the validator.

For full validator shapes and cascade-strategy detail, see
`../../datocms-cma/references/schema.md`. For the editor parameters
that govern which `nodes` / `marks` / `heading_levels` editors can
produce in a `structured_text` field, see `field-configuration.md`
§ structured_text editor parameters.

## DAST node cheatsheet

Modeling-relevant subset only. For the full grammar (children rules per
node type, marks list, and how to actually build/edit DAST), see
`../../datocms-cma/references/editing-records.md` § DAST grammar.

| Node | Role | Where it can live |
|---|---|---|
| `block` | Embedded **block-level** record | Direct child of `root` only — never inside a paragraph |
| `inlineBlock` | Embedded **inline** record (badge, equation, mid-flow widget) | Inside `paragraph` and `heading` |
| `itemLink` | Hyperlink whose target is a DatoCMS record, with inner text | Inside `paragraph` and `heading` |
| `inlineItem` | Reference to a record with **no inner text** — frontend chooses how to render (chip, mention, auto-title link) | Inside `paragraph` and `heading` |
| `link` | Plain external hyperlink with optional `meta` (`rel`, `target`, etc.) | Inside `paragraph` and `heading` |
| `span` | Leaf text node, with optional `marks` | Inside `paragraph`, `heading`, `link`, `itemLink` |
| `marks` on span | `strong`, `emphasis`, `code`, `underline`, `strikethrough`, `highlight` | — |

### The two pairs that get confused

**`block` vs `inlineBlock`** — same idea (an embedded block record),
different layout role.

- `block` is block-level. It sits *between* paragraphs at the root,
  like an `<aside>` or `<figure>`. The author hits enter, drops a
  block, hits enter, keeps writing.
- `inlineBlock` lives *inside* prose. Use for things like equations,
  user mentions, badges, dynamic-data widgets — anything that flows
  with the surrounding text.

If a designer tells you "a quote appears between paragraphs" → `block`.
If they tell you "a stock ticker appears mid-sentence" → `inlineBlock`.

**`itemLink` vs `inlineItem`** — both point at a record, but only one
has inner text.

- `itemLink` is an `<a href>`-shaped link to a record — the *author*
  writes the link text. Use when the author wants to control how the
  link reads in flow ("see [our Q3 earnings post] for context").
- `inlineItem` is a record reference with no inner content — the
  *frontend* decides what to render (the record's title? a chip? a
  hovercard?). Use when the rendering should adapt to the linked
  record's current state, or when the surface is non-textual.

If editors should be able to say "click here" or "this article" → use
`itemLink`. If the rendering should always reflect the target's
current title or visual treatment → use `inlineItem`.

## Container choice and the limits

Block-bearing fields are bounded by per-record limits (size, block
count, nesting depth) — see `models-vs-blocks.md` § Hard limits and
the locale multiplier for the numbers and the canonical mitigations.

The container choice has knock-on effects on those limits:

- **Localized prose with shared structure.** If the structural
  composition is the same across locales but only the prose differs,
  localize a `structured_text` field for the prose and keep
  non-localized sibling fields for the structural blocks. This drops
  the per-record block count dramatically vs localizing a whole
  `rich_text` page builder.
- **Single block vs one-element rich_text.** A `single_block` field
  holds one block, period. A `rich_text` with `max_items: 1` holds an
  array of length ≤ 1 — same data shape, slightly more weight in the
  block budget and a worse editor UX. Pick `single_block` when you
  mean "exactly one."
- **Audit blocks for over-decomposition.** A "spacer" block, a
  "divider" block, a "callout" with one text field — every block is
  paid for in the 600 budget. Consolidate aggressive decomposition
  before reaching for limit increases.
