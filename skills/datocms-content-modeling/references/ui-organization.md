# Admin UI organization — Content menu and Schema menu

Once a project has more than ~10 models, the default flat lists in
the DatoCMS admin become noisy. DatoCMS gives you two parallel menu
systems for organizing the admin UI — one for editors, one for
developers — and they're a content-modeling concern, not a cosmetic
one. A clear menu is part of the schema's contract with its users.

## Two audiences, two menus

| Menu | API resource | Audience | Contains |
|---|---|---|---|
| **Content tab menu** | `menu_item` | Editors | Item types only, plus saved views (`item_type_filter` links) and external URLs |
| **Schema tab menu** | `schema_menu_item` | Developers / schema owners | Item types **and** modular blocks (`kind: "item_type" \| "modular_block"`) |

The split exists because the two audiences need different things.
Editors don't care that `callout_block` is a block model — they never see
block records as standalone entities. Developers do care, because
they're authoring the block model. Mixing them — or leaving both as
the default flat list — punishes both audiences.

For the actual API mechanics (`menuItems.create`,
`schemaMenuItems.create`, `item_type_filter` payload), see
`../../datocms-cma/references/schema.md` and
`../../datocms-cma/references/project-settings-and-usage.md`. This
file covers the *modeling* decisions.

## Content menu — IA for editors

The content menu is the closest DatoCMS gets to a navigation surface
that editors live in all day. Treat it like product UX, not like a
table of contents.

### Principles

- **Group by editorial purpose, not by data type.** "Marketing pages"
  / "Blog" / "Settings" beats "Singletons" / "Collections" / "Trees."
  Editors think in workflows; data shape is irrelevant to them.
- **Surface high-traffic models at the top.** The first thing editors
  click 50 times a day deserves position 1.
- **Bury rarely-edited config behind a group.** "Site settings" /
  "Redirects" / "Footer links" go inside a "Settings" group, not at
  the top level. (These are typically `singleton: true` models — see
  `model-configuration.md` § singleton.)
- **Mirror the editorial workflow, not the data model.** If editors
  think "draft → review → publish," the menu can show "Drafts" and
  "Awaiting review" as distinct entries (see saved views below).
- **3–4 items per group max.** Beyond that, regroup or split.

### Saved views via `item_type_filter`

This is the single highest-leverage move and almost no one uses it. A
`menu_item` can link to an `item_type_filter` instead of (or in
addition to) an item type. The editor sees a sidebar entry that
*pre-applies* a filter — effectively a named saved view.

Useful patterns:

- **Inboxes**: "Awaiting review" → a filter on `Article` where
  `_status = draft AND author = current_user`. Editors get a real
  workflow inbox.
- **Owned content**: "My pages" → a filter scoped to the current user.
- **Time-boxed views**: "Published this week," "Updated this month."
- **Quality flags**: "Missing SEO," "No featured image" — filters on
  models with the relevant validation gaps.
- **Localization gaps**: "Untranslated to French" using a locale-aware
  filter.

The filter does the work; the menu makes it discoverable. Editors who
would never go build a filter manually start using these heavily
within days.

#### Group multi-entry models under a container

As soon as a single model has **more than one** menu entry — typically
the model itself plus one or more `item_type_filter` saved views —
wrap them in a parent menu group named after the model. Two flat
siblings in the sidebar (e.g. `🗞️ Articles` and `📥 Awaiting review`)
read as two unrelated destinations; the editor has to learn that the
second one is a filter on the first. A container makes the
relationship structural instead of implicit:

```
Articles                       (container — no emoji)
  ├── 🗞️ All articles         (leaf — points to the model)
  ├── 📥 Awaiting review       (leaf — saved view)
  └── 📅 Published this week   (leaf — saved view)
```

The container itself stays plain (per the emoji rules — containers
don't get emoji). The leaf pointing to the unfiltered model usually
reads better as `All <model>` than repeating the model name, so it's
clearly the "everything" entry next to the filtered siblings. The
filtered entries follow the saved-view emoji rule (signal *what the
filter does*, not the model).

Single-entry models — most models — stay flat at the top level. The
group is the cue that "there's more than one way to enter this
model."

### External URLs

`menu_item.external_url` (with optional `open_in_new_tab`) links to
arbitrary URLs from the editor sidebar. Small but high-leverage:

- Link to the editorial style guide.
- Link to the team's content calendar.
- Link to a Slack channel for "Content ops" questions.
- Link to a public-facing preview of the staging site.

Don't overdo this — the menu is for daily work, not a list of
bookmarks. 1–3 well-chosen external links per project is the sweet
spot.

## Schema menu — IA for developers

The schema menu organizes the Settings → Models / Blocks area. The
audience is anyone with schema-edit permissions: developers, lead
editors, schema owners.

Models and blocks already render as **two separate trees** in the
schema settings page — the `schema_menu_item.kind` field
(`'item_type' | 'modular_block'`) discriminates them, and the UI
shows each tree in its own panel. Don't waste time trying to
"separate" them; that's free. The work is *organizing within each
tree*.

### Principles

- **Co-locate related blocks** within the blocks tree. `hero_block`,
  `cta_block`, `callout_block` under a "Page sections" group.
  `code_sample_block`, `quote_block`, `image_with_caption_block`
  under "Article inserts." `seo_override_block`, `social_card_block`
  under "Metadata blocks." Without grouping, the Blocks Library is
  just an alphabetical pile.
- **Surface frequently-edited models at the top** of the models tree.
  `Page`, `Article`, `Product` — whatever the team modifies most.
  Bury rarely-touched taxonomy roots and singletons further down.
- **Group taxonomy models together.** `Category`, `Tag`, `Topic`,
  `Author` are related — group them under "Taxonomy" or
  "Classification" so they don't pollute the main model list.

### What goes where

- A new model the team is iterating on heavily → top of its content
  group.
- A stable, rarely-edited singleton like "Site settings" → bottom or
  inside a "Settings" group.
- A block used everywhere (e.g. `image_with_caption_block`) → top of its
  block group.
- A one-off block used by exactly one parent → near that parent's
  model in the schema menu, or inside a "Single-use blocks" group if
  there are several.

## Menu items are auto-created — curate or opt out

Every call to `itemTypes.create` auto-creates menu entries by default:

- A regular model gets a `menu_item` in the **Content tab** menu **and**
  a `schema_menu_item` (with `kind: "item_type"`) in the **Schema tab**.
- A block model gets only a `schema_menu_item` (with
  `kind: "modular_block"`) in the **Schema tab** blocks tree — block
  models don't appear in the Content tab.

The `schema_menu_item` is **always** created — there is no flag to
skip it. You can only redirect where it ends up. The Content tab
`menu_item` is the only one that can be skipped outright.

This is convenient for the first ten models. After that, the menu
sprawls — every block ever created sits at the top level of the
blocks tree in creation order. The fix is awareness at script time:

`itemTypes.create` accepts three query-param flags that govern menu
placement:

| Flag | Effect |
|---|---|
| `skip_menu_item_creation: true` | Skips the Content tab `menu_item` only. The `schema_menu_item` is still created. No-op for block models (they have no Content tab entry). |
| `menu_item_id: "<id>"` | Wire the new model's Content tab entry to a *specific existing* `menu_item` rather than creating a new one. Useful when promoting a placeholder menu entry to a real model. |
| `schema_menu_item_id: "<id>"` | Place the auto-created `schema_menu_item` *under* an existing schema menu node (e.g. the "Page sections" group you already created), instead of at the top level. |

```ts
// Bulk creation without polluting the Content tab menu — Schema tab
// entries are still created and can be reorganized after the fact.
await client.itemTypes.create(
  { name: "Article", api_key: "article" },
  { skip_menu_item_creation: true },
);

// Or: create the block directly inside an existing "Page sections" group
await client.itemTypes.create(
  { name: "Hero", api_key: "hero_block", modular_block: true },
  { schema_menu_item_id: pageSectionsGroupId },
);
```

The modeling implication: **menu organization is part of the
migration**, not a follow-up cleanup. When a script creates ten
blocks, it should also place them where they belong. Otherwise the
default behavior wins and the menu degrades one model at a time.

For the full `itemTypes.create` API surface (including these query
params), check `npx datocms cma:docs itemTypes create --types-depth 2`
or `../../datocms-cma/references/schema.md`.

## Emoji prefixes — the icon system

DatoCMS parses a leading emoji from labels and renders it as the
sidebar icon, replacing the default placeholder. This works on:

- `menu_item.label`
- `schema_menu_item.label`
- `item_type.name` (regular models and block models)
- `fieldset.title`

The mechanism is just the string itself — `"🎯 Frontend technologies"`
becomes a target icon next to the menu item, no separate icon field.
This is the canonical way DatoCMS projects get visual identity in the
admin UI.

It does **not** work on `field.label`. Don't put emojis on fields.
The model name is also what shows up in collection views and link
pickers via `presentation_title_field` /
`presentation_image_field` — see `model-configuration.md` §
"presentation_title_field and presentation_image_field" for how the
admin preview is composed.

### The convention is on by default

Apply emoji prefixes across the schema by default. They are the only
icon system DatoCMS exposes, they make the sidebar scannable, and the
visual continuity from menu → record is what gives them their value.
Don't ask the user whether they want emoji — apply the rules below.

The only time you don't apply the convention is when the project
**already has** an established convention you should match instead.
Before generating new labels, inspect what the project already uses
(`npx datocms schema:inspect` plus a look at existing menu items and
item types) — different projects pick different vocabularies
(concrete-objects vs abstract-symbols, two-tone vs flat, etc.). Match
the existing taste; don't import a different one.

### Rules

- **Apply emoji on every surface that supports them, *except*
  container entries.** That means leaf `menu_item.label`, leaf
  `schema_menu_item.label`, `item_type.name` (regular and block
  models), and `fieldset.title`. Container entries — folders that
  group other menu items, like "Marketing pages" or "Settings" —
  stay plain. Folders are visually identified by their disclosure
  triangle; an emoji adds noise without navigational value. Same
  rule for container schema menu items.
- **Emoji is paired across menu entry and model — never one without
  the other.** If the `Article` model lives at `🗞️ Articles` in the
  content menu, the model itself must be named `🗞️ Article`. The
  whole point of the convention is visual continuity: the editor
  clicks 🗞️ in the sidebar and sees 🗞️ at the top of the record.
  Putting an emoji on the menu entry but leaving the model name plain
  (or vice versa) breaks that continuity and is worse than no emoji
  at all — don't pick-and-choose surfaces.
- **Saved views (filter-based menu items) get their own distinct
  emoji.** When a single model has multiple menu entries via
  `item_type_filter` — e.g. `🗞️ Articles` (all) and `📥 Awaiting
  review` (filtered) — the filter-based entry should signal *what
  the filter does*, not just duplicate the model's emoji. The whole
  point is to make the inbox visually distinguishable from the
  full collection.
- **No emojis on fields, ever.** `field.label` doesn't render the
  prefix as an icon, and fields appear in record edit forms, not in
  navigation. Emoji on field labels is just noise the editor scans
  past every edit. Use the field hint for context instead.

### Worked example

```
Content tab menu (containers are plain; leaves carry the emoji):

  Marketing pages          (container — no emoji)
    ├── 🏠 Home
    ├── 💰 Pricing
    └── 📞 Contact
  Articles                 (container — Article has multiple entries)
    ├── 🗞️ All articles    (leaf — points to the model)
    └── 📥 Awaiting review (leaf — saved view, distinct emoji)
  🏷️ Tags                   (leaf — taxonomy, single entry)
  Settings                 (container — no emoji)
    ├── ⚙️ Site settings    (singleton)
    └── 🔁 Redirects
```

The corresponding model/block names match: `🗞️ Article`, `🏷️ Tag`,
`🏠 Home page`, `⚙️ Site settings`. Note the `Articles` container:
because the model has both a model-pointing entry and a filter-based
entry, they're grouped under a plain container to make the
relationship explicit. `Tags` has a single entry, so it stays flat.
The "Awaiting review" entry uses 📥 because *the filter* is the
inbox, not the model.

## Heuristics that apply to both menus

- **Don't auto-show every item type.** Curate. The default behavior
  surfaces all models; that's a starting point, not a ship-it
  configuration.
- **Match the team's mental model, not the alphabet.** Position is
  meaningful — use it.
- **Revisit organization when the project grows past ~20 models or
  ~30 blocks.** What worked at 8 models doesn't work at 25.
- **Schema changes are content menu changes.** Adding a new
  high-traffic model means re-sorting the menu; treat menu updates as
  part of the migration, not a follow-up.
- **Both menus support hierarchy** via the `parent` /  `children`
  fields. Two levels deep is enough; three is rarely worth the cost
  of an extra click.

## Common mistakes

- **Leaving the default flat list.** Inertia is the most common cause
  of bad menus. The fix is 30 minutes of work that pays back daily
  for the life of the project.
- **Grouping by data shape.** "Singletons," "Trees," "Collections" —
  meaningless to editors and barely useful to devs. Group by purpose.
- **Trying to surface block models in the Content tab.** Not
  possible: the Content tab menu only lists item types editors can
  open as standalone records. Block models live in the Schema tab's
  blocks tree (`schema_menu_item.kind = "modular_block"`) and editors
  reach block instances through the parent record that embeds them.
- **Using menu items as documentation.** Long labels, all-caps prefixes
  ("ADMIN ONLY!!"), emoji warnings. The menu is for navigation. Put
  guidance in role descriptions, model hints, or a pinned external-URL
  link to the style guide.
- **Saved views that go stale.** A "Q3 launch content" filter that's
  still in the menu six months later. Treat saved views like any other
  ephemeral resource — schedule a cleanup pass.
- **Ignoring the schema menu.** Teams polish the content menu and
  leave the schema menu as-is. Developers also benefit from
  organization — and a clean schema menu makes onboarding new schema
  owners much faster.
