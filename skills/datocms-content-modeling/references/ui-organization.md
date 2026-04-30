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
Editors don't care that `callout` is a block model — they never see
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

- **Co-locate related blocks** within the blocks tree. `hero`, `cta`,
  `callout` under a "Page sections" group. `code_sample`, `quote`,
  `image_with_caption` under "Article inserts." `seo_override`,
  `social_card` under "Metadata blocks." Without grouping, the Blocks
  Library is just an alphabetical pile.
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
- A block used everywhere (e.g. `image_with_caption`) → top of its
  block group.
- A one-off block used by exactly one parent → near that parent's
  model in the schema menu, or inside a "Single-use blocks" group if
  there are several.

## Menu items are auto-created — curate or opt out

Every call to `itemTypes.create` (creating a model **or** a block
model) creates a corresponding menu entry by default:

- A regular model gets a `menu_item` in the **Content tab** menu.
- A block model gets a `schema_menu_item` (with `kind: "modular_block"`)
  in the **Schema tab** blocks tree.

This is convenient for the first ten models. After that, the menu
sprawls — every block ever created sits at the top level of the
blocks tree in creation order. The fix is awareness at script time:

`itemTypes.create` accepts three query-param flags that govern this:

| Flag | Effect |
|---|---|
| `skip_menu_item_creation: true` | No menu entry is created. Use when scripting bulk creation and you'll wire menus separately afterwards. |
| `menu_item_id: "<id>"` | Wire the new model to a *specific existing* menu item rather than creating a new one. Useful when promoting a placeholder menu entry to a real model. |
| `schema_menu_item_id: "<id>"` | Same idea for the schema menu — attach the new model/block to a pre-existing schema menu node (e.g. the "Page sections" group you already created). |

```ts
// Bulk creation without polluting menus — wire them up after
await client.itemTypes.create(
  { name: "Hero", api_key: "hero", modular_block: true },
  { skip_menu_item_creation: true },
);

// Or: create the block directly inside an existing "Page sections" group
await client.itemTypes.create(
  { name: "Hero", api_key: "hero", modular_block: true },
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

### Inspect the project before suggesting a convention

Different projects pick different emoji vocabularies (concrete-objects
vs abstract-symbols, two-tone vs flat, etc.). Before recommending one,
inspect what the project already uses — `npx datocms schema:inspect`
plus a look at existing menu items and item types. Match the
convention; don't impose taste from elsewhere.

If the project has no emojis yet and the user asks for a convention,
ask them whether they want one before scattering emojis across the
schema. Some teams deliberately keep things plain.

### Default suggestions when the team wants a convention

When the team is starting from scratch and wants guidance:

- **Emojis everywhere *except* container menu items.** Leaf entries
  (a single model, a saved view, an external link) get an emoji.
  Container entries — folders that group other menu items, like
  "Marketing pages" or "Settings" — stay plain. Folders are visually
  identified by their disclosure triangle; an emoji adds noise without
  navigational value. Same rule applies to container schema menu
  items.
- **Model/block emoji should match the emoji of its menu entry.** If
  the `Article` model lives at `🗞️ Articles` in the content menu,
  the model itself should be named `🗞️ Article`. Visual continuity
  from sidebar to record makes the connection obvious — the editor
  clicks a 🗞️ in the sidebar and sees 🗞️ at the top of the record.
- **Saved views (filter-based menu items) get their own distinct
  emoji.** When a single model has multiple menu entries via
  `item_type_filter` — e.g. `🗞️ Articles` (all) and `📥 Awaiting
  review` (filtered) — the filter-based entry should signal *what
  the filter does*, not just duplicate the model's emoji. The whole
  point is to make the inbox visually distinguishable from the
  full collection.
- **No emojis on fields, ever.** Fields render in record edit forms,
  not in navigation. Emoji prefixes on field labels are visual noise
  the editor scans past every time they edit a record. Use the field
  hint for context instead.

### Worked example

```
Content tab menu (📋 = container, plain in our convention):

  Marketing pages          (container — no emoji)
    ├── 🏠 Home
    ├── 💰 Pricing
    └── 📞 Contact
  🗞️ Articles               (leaf — model)
  📥 Awaiting review        (leaf — saved view, distinct from 🗞️)
  🏷️ Tags                   (leaf — taxonomy)
  Settings                 (container — no emoji)
    ├── ⚙️ Site settings    (singleton)
    └── 🔁 Redirects
```

The corresponding model/block names match: `🗞️ Article`, `🏷️ Tag`,
`🏠 Home page`, `⚙️ Site settings`. The "Awaiting review" entry uses
📥 because *the filter* is the inbox, not the model.

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
