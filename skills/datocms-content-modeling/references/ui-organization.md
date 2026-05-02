# Admin UI organization — Content menu and Schema menu

Project with >10 models = noisy menus. DatoCMS has two menus — editors vs developers. Clear menu = part of schema contract.

## Contents

- Two audiences, two menus
- Content menu — IA for editors
- Schema menu — IA for developers
- Menu items are auto-created — curate or opt out
- Emoji prefixes — icon system
- Heuristics that apply to both menus
- Common mistakes

## Two audiences, two menus

| Menu | API resource | Audience | Contains |
| - | - | - | - |
| **Content tab menu** | `menu_item` | Editors | Item types only, plus saved views (`item_type_filter`) and URLs |
| **Schema tab menu** | `schema_menu_item` | Devs / schema owners | Item types **and** blocks (`kind: "item_type" \| "modular_block"`) |

Different audiences = different needs. Editors don't care `callout_block` is block model. Devs do care. Mixing = bad for both.

API mechanics: `../../datocms-cma/references/schema.md` and `../../datocms-cma/references/project-settings-and-usage.md`

## Content menu — IA for editors

Editor navigation surface = product UX, not TOC.

### Principles

- **Group by editorial purpose** not data type. "Marketing pages" / "Blog" / "Settings" beats "Singletons" / "Collections."
- **High-traffic at top.** Daily clicks = position 1.
- **Bury config behind group.** "Site settings" / "Redirects" / "Footer links" inside "Settings" group.
- **Mirror workflow, not data model.** Draft → review → publish? Show "Drafts" and "Awaiting review."
- **3–4 items per group max.** More? Regroup or split.

### Saved views via `item_type_filter`

Highest-leverage move, barely used. `menu_item` links to `item_type_filter` = named saved view. Editor sees sidebar entry with pre-applied filter.

Patterns:

- **Inboxes**: "Awaiting review" → filter on `Article` where `_status = draft AND author = current_user`. Real workflow inbox.
- **Owned content**: "My pages" → filter scoped to current user.
- **Time-boxed**: "Published this week," "Updated this month."
- **Quality flags**: "Missing SEO," "No featured image" — filter on validation gaps.
- **Localization gaps**: "Untranslated to French" — locale-aware filter.

Filter does work, menu makes discoverable. Editors use these heavily.

#### Group multi-entry models under container

Model has **>1** menu entry? Wrap in parent group named after model. Two flat siblings (`🗞️ Articles` + `📥 Awaiting review`) = unrelated destinations. Container makes relationship structural:

```
Articles                       (container — no emoji)
  ├── 🗞️ All articles         (leaf — points to the model)
  ├── 📥 Awaiting review       (leaf — saved view)
  └── 📅 Published this week   (leaf — saved view)
```

Container = plain (emoji rule — containers don't get emoji). Leaf pointing to unfiltered model = `All <model>` not model name repeat. Filtered entries follow saved-view emoji rule (signal _what filter does_, not model).

Single-entry models stay flat top level. Group = cue "multiple ways to enter this model."

### External URLs

`menu_item.external_url` (`open_in_new_tab` optional) links arbitrary URLs from editor sidebar. High-leverage:

- Link to editorial style guide
- Link to team content calendar
- Link to Slack "Content ops" channel
- Link to staging site preview

Don't overdo. Menu = daily work, not bookmarks. 1–3 links = sweet spot.

## Schema menu — IA for developers

Schema menu organizes Settings → Models / Blocks. Audience = schema-edit permissions: devs, lead editors, schema owners.

Models and blocks = **two separate trees** in schema settings. `schema_menu_item.kind` (`'item_type' | 'modular_block'`) discriminates. UI shows each tree in own panel. Don't "separate" them — free. Work = _organizing within each tree_.

### Principles

- **Co-locate related blocks** in blocks tree. `hero_block`, `cta_block`, `callout_block` under "Page sections." `code_sample_block`, `quote_block`, `image_with_caption_block` under "Article inserts." `seo_override_block`, `social_card_block` under "Metadata blocks." No grouping = alphabetical pile.
- **Surface frequently-edited at top** of models tree. `Page`, `Article`, `Product` — whatever team modifies most. Bury taxonomy and singletons.
- **Group taxonomy together.** `Category`, `Tag`, `Topic`, `Author` = related — group under "Taxonomy" or "Classification."

### What goes where

- New model, heavy iteration → top of content group
- Stable singleton like "Site settings" → bottom or "Settings" group
- Block used everywhere (e.g. `image_with_caption_block`) → top of block group
- One-off block used by one parent → near parent's model in schema menu, or "Single-use blocks" group

## Menu items are auto-created — curate or opt out

Every `itemTypes.create` auto-creates menu entries:

- Regular model → `menu_item` in **Content tab** **and** `schema_menu_item` (`kind: "item_type"`) in **Schema tab**
- Block model → only `schema_menu_item` (`kind: "modular_block"`) in **Schema tab** blocks tree — no Content tab entry

`schema_menu_item` **always** created — no skip flag. Can only redirect placement. Content tab `menu_item` = only one that can skip outright.

Convenient for first ten models. After? Menu sprawls — every block at top level in creation order. Fix = awareness at script time.

`itemTypes.create` accepts three query-param flags:

| Flag | Effect |
| - | - |
| `skip_menu_item_creation: true` | Skips Content tab `menu_item` only. `schema_menu_item` still created. No-op for blocks. |
| `menu_item_id: "<id>"` | Wire new model's Content tab entry to _specific existing_ `menu_item` vs creating new one. |
| `schema_menu_item_id: "<id>"` | Place auto-created `schema_menu_item` _under_ existing schema menu node, not top level. |

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

**Modeling implication: menu organization = part of migration**, not cleanup. Script creates ten blocks? Should also place them. Default behavior wins, menu degrades one model at time.

Full `itemTypes.create` API: `npx datocms cma:docs itemTypes create --types-depth 2` or `../../datocms-cma/references/schema.md`

## Emoji prefixes — icon system

DatoCMS parses leading emoji from labels, renders as sidebar icon. Works on:

- `menu_item.label`
- `schema_menu_item.label`
- `item_type.name` (regular and block models)
- `fieldset.title`

Mechanism = string itself — `"🎯 Frontend technologies"` becomes target icon. No separate icon field. Canonical way DatoCMS projects get visual identity in admin UI.

Does **not** work on `field.label`. Don't put emojis on fields. Model name = what shows in collection views and link pickers via `presentation_title_field` / `presentation_image_field` — see `model-configuration.md` § "presentation_title_field and presentation_image_field"

### Convention on by default

Apply emoji prefixes across schema by default. Only icon system DatoCMS exposes, makes sidebar scannable, visual continuity menu → record = value. Don't ask user whether they want emoji — apply rules below.

**Exception:** project **already has** established convention you should match. Before generating new labels, inspect existing (`npx datocms schema:inspect` plus look at existing menu items and item types) — different projects = different vocabularies. Match existing taste; don't import different one.

### Rules

- **Apply emoji on every surface that supports them, _except_ containers.** Leaf `menu_item.label`, leaf `schema_menu_item.label`, `item_type.name` (regular and block), `fieldset.title`. Container entries — folders grouping other menu items like "Marketing pages" or "Settings" — stay plain. Folders visually identified by disclosure triangle; emoji adds noise, no navigational value. Same for container schema menu items.
- **Emoji paired across menu entry and model — never one without other.** If `Article` model lives at `🗞️ Articles` in content menu, model itself must be named `🗞️ Article`. Point = visual continuity: editor clicks 🗞️ in sidebar, sees 🗞️ at top of record. Emoji on menu entry but plain model name (or vice versa) = breaks continuity, worse than no emoji. Don't pick-and-choose surfaces.
- **Saved views (filter-based menu items) get own distinct emoji.** Single model has multiple menu entries via `item_type_filter` — e.g. `🗞️ Articles` (all) and `📥 Awaiting review` (filtered) — filter-based entry should signal _what filter does_, not duplicate model's emoji. Point = make inbox visually distinguishable from full collection.
- **No emojis on fields, ever.** `field.label` doesn't render prefix as icon, fields appear in record edit forms not navigation. Emoji on field labels = noise editor scans past every edit. Use field hint for context instead.

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

Corresponding model/block names match: `🗞️ Article`, `🏷️ Tag`, `🏠 Home page`, `⚙️ Site settings`. Note `Articles` container: model has both model-pointing entry and filter-based entry, grouped under plain container to make relationship explicit. `Tags` has single entry, stays flat. "Awaiting review" uses 📥 because _filter_ is inbox, not model.

## Heuristics that apply to both menus

- **Don't auto-show every item type.** Curate. Default = all models; starting point, not ship-it config.
- **Match team's mental model, not alphabet.** Position meaningful — use it.
- **Revisit organization when project grows past \~20 models or \~30 blocks.** What worked at 8 ≠ 25.
- **Schema changes = content menu changes.** New high-traffic model = re-sort menu; treat menu updates as part of migration, not follow-up.
- **Both menus support hierarchy** via `parent` /  `children` fields. Two levels deep enough; three rarely worth extra click.

## Common mistakes

- **Leaving default flat list.** Inertia = most common bad menus cause. Fix = 30 minutes work, pays back daily for project life.
- **Grouping by data shape.** "Singletons," "Trees," "Collections" — meaningless to editors, barely useful to devs. Group by purpose.
- **Trying to surface block models in Content tab.** Not possible: Content tab menu only lists item types editors open as standalone records. Block models live in Schema tab blocks tree (`schema_menu_item.kind = "modular_block"`), editors reach block instances through parent record embedding them.
- **Using menu items as documentation.** Long labels, all-caps prefixes ("ADMIN ONLY!!"), emoji warnings. Menu = navigation. Put guidance in role descriptions, model hints, or pinned external-URL link to style guide.
- **Saved views that go stale.** "Q3 launch content" filter still in menu six months later. Treat saved views like ephemeral resource — schedule cleanup pass.
- **Ignoring schema menu.** Teams polish content menu, leave schema menu as-is. Devs also benefit from organization — clean schema menu makes onboarding new schema owners much faster.
