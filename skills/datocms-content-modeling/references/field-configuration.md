# Field configuration: validators and appearance

Every field carries two settings beyond its `field_type`: **validators**
(what values are accepted) and **appearance** (which editor renders the
field, plus its parameters). Defaults are sensible — most fields don't
need an explicit `appearance`. This reference covers the choices that
*do* matter for content modeling.

> For the full TypeScript shape of any per-field-type validator or
> appearance, run `npx datocms cma:docs fields create
> --expand-types '<TypeName>'` (e.g. `StringFieldValidators`,
> `FileFieldAppearance`).

## Defaults are usually right

Each `field_type` has a default editor — `string` → `single_line`,
`text` → `markdown`, `link` → `link_select`, `boolean` → `boolean`,
`structured_text` → `structured_text`, etc. Omit `appearance` for the
common case; only set it when:

- A different built-in editor fits better (`textarea` vs `markdown`,
  `string_select` to pair with an `enum` validator).
- You need to tune editor parameters (a `slug` `url_prefix`, a
  `color` preset palette, a `single_line` `heading: true`).
- You're wiring a plugin-provided editor or add-on.

Validators are different — defaults give you "anything goes." Reach
for them whenever the field has a meaningful constraint editors
should be helped (or stopped) by.

---

## Validators worth remembering

Organized by what they let you express, not by `field_type`.

### Constrain a string to a fixed set of values — `enum`

```ts
// string field
validators: { enum: { values: ["draft", "review", "published"] } }
appearance: { editor: "string_select", parameters: { options: [
  { label: "Draft", value: "draft" },
  { label: "In review", value: "review" },
  { label: "Published", value: "published" },
]}}
```

Always pair `enum` with `string_select` or `string_radio_group` — a
plain `single_line` doesn't enforce the choice in the UI, even
though the validator rejects bad values at save time. The enum is
the structural guarantee; the dropdown is the affordance.

This is the right shape for **semantic variants** (`tone`,
`emphasis`, `severity`) — see `separation-of-concerns.md`.

### Constrain string format — `format` and `length`

```ts
// email
validators: { format: { predefined_pattern: "email" } }

// custom pattern with a human-readable description
validators: {
  format: {
    custom_pattern: "^[A-Z]{2}-\\d{4}$",
    description: "Two uppercase letters, dash, four digits (e.g. AB-1234)",
  },
}
```

The `description` matters: without it, the editor sees the regex
itself as the error message. With it, they see plain English.

`length` accepts `min`, `max`, or `eq` — useful for ISBN, country
codes, anything with a fixed length.

### Force uniqueness — `unique`

Available on `string`, `slug`, `link`. Use for natural keys
(slug, SKU, internal codename). DatoCMS enforces uniqueness across
the whole collection — no scoping by another field.

### Constrain numeric/date ranges

```ts
// integer / float
validators: { number_range: { min: 0, max: 100 } }

// date / date_time
validators: { date_range: { min: "2024-01-01" } }
validators: { date_time_range: { min: "2024-01-01T00:00:00Z" } }
```

### Constrain files and images

| Validator | Use for |
|---|---|
| `extension: { predefined_list: 'image' \| 'transformable_image' \| 'video' \| 'document' }` | Restrict by category. **`'transformable_image'` is the one to use for hero/cover images** — only these support `responsiveImage` transformations on the CDA. |
| `extension: { extensions: ["pdf", "epub"] }` | Custom allowlist. |
| `image_dimensions: { width_min_value, width_max_value, height_min_value, height_max_value }` | Reject images that are too small for the design. |
| `image_aspect_ratio: { eq_ar_numerator: 16, eq_ar_denominator: 9 }` | Force editorial consistency (also `min_*` / `max_*` form for ranges). |
| `file_size: { max_value: 2, max_unit: "MB" }` | Cap upload size. |
| `required_alt_title: { alt: true }` | Force alt text — wire on every user-facing image field. Accessibility and SEO depend on it; editors will skip alt unless DatoCMS blocks them. |
| `size: { min, max }` (gallery only) | Limit the number of images. |

### Constrain links between records

`item_item_type` (link), `items_item_type` (links), and
`structured_text_links` carry the **cascade strategies**
(`on_reference_delete_strategy`, etc.) — see
`../../datocms-cma/references/schema.md` § Reference-cascade
strategies. Set the allowlist deliberately; default to `"fail"` for
editorial content.

### Auto-fill a slug from a title — `slug_title_field`

```ts
validators: {
  slug_title_field: { title_field_id: titleField.id },
  slug_format: { predefined_pattern: "webpage_slug" },
}
```

Without `slug_title_field`, editors type the slug by hand. With it,
the slug pre-fills from the bound title and updates as the editor
types — until they manually edit the slug. Wire this on every URL
slug.

`slug_format` accepts `predefined_pattern: "webpage_slug"` (lowercase,
hyphens, ASCII) or a `custom_pattern` regex.

### Require specific SEO sub-fields

```ts
// seo field
validators: {
  required_seo_fields: { title: true, description: true, image: true },
  title_length: { max: 60 },
  description_length: { max: 160 },
}
```

`title_length` / `description_length` show editors a live character
counter — invaluable because Google truncates around 60/160. Wire
both on every public-facing model's SEO field.

### Limit a Modular Content / Structured Text container

```ts
// rich_text
validators: { rich_text_blocks: { item_types: [...] }, size: { min: 1, max: 30 } }

// structured_text — see schema.md for the three overlapping validators
validators: {
  structured_text_blocks: { item_types: [...] },
  structured_text_inline_blocks: { item_types: [...] },
  structured_text_links: { item_types: [...] },
  length: { max: 5000 }, // character cap for plain-text portion
}
```

`size` on `rich_text` and `length` on `structured_text` help keep
records under the 300 KB / 600-block limits — see
`models-vs-blocks.md`.

### Sanitize HTML for `text` fields

```ts
validators: { sanitized_html: { sanitize_before_validation: true } }
```

Use when the `text` field stores HTML the frontend will render.
Without it, an editor can paste a `<script>` tag and get it back
verbatim from the API.

---

## Appearance — when defaults aren't enough

### Single-editor field types

These have one built-in editor; the only configuration is its
parameters. Don't reach for `appearance` unless tuning a parameter.

| `field_type` | Default editor | Tunable parameters of note |
|---|---|---|
| `boolean` | `boolean` | none (or use `boolean_radio_group`, see below) |
| `color` | `color_picker` | `enable_alpha`, `preset_colors` (lock to a brand palette) |
| `date` | `date_picker` | none |
| `date_time` | `date_time_picker` | none |
| `file` | `file` | none |
| `float` / `integer` | `float` / `integer` | `placeholder` |
| `gallery` | `gallery` | none |
| `lat_lon` | `map` | none |
| `link` | `link_select` (or `link_embed`) | see § "Multi-editor" |
| `slug` | `slug` | `url_prefix` (e.g. `https://site.com/blog/`), `placeholder` |
| `video` | `video` | none |

### Multi-editor field types — the real choices

#### `boolean`: `boolean` vs `boolean_radio_group`

Default is a checkbox-style toggle. Switch to `boolean_radio_group`
when **the labels matter**:

```ts
appearance: {
  editor: "boolean_radio_group",
  parameters: {
    positive_radio: { label: "Featured on homepage", hint: "Limit 4 active" },
    negative_radio: { label: "Hide from homepage" },
  },
}
```

A toggle labeled "Featured" is ambiguous — featured *where*? A radio
group with explicit labels removes the guess.

#### `string`: `single_line` vs `string_radio_group` vs `string_select`

- `single_line` — free text. Default. `heading: true` makes the input
  visually larger and is conventionally used for the field that
  represents the record's title/headline (presentation cue, not
  validation).
- `string_select` — dropdown. Pair with `enum` (always).
- `string_radio_group` — radios laid out flat. Pair with `enum` when
  there are 2-4 options and editors should see all at once.

#### `text`: `markdown` vs `wysiwyg` vs `textarea`

Three different editor experiences. The choice changes what editors
can produce.

| Editor | Output | When |
|---|---|---|
| `markdown` (default) | Markdown source | Editors are technical; output is parsed downstream; you want predictable output |
| `wysiwyg` | HTML | Non-technical editors; "looks like Word" is desired; output is HTML you'll render |
| `textarea` | Plain text | Multi-line plain text — meta descriptions, transcripts, alt text — no formatting |

**For new structured editorial work, prefer `structured_text` over
any of these.** It gives you typed AST, embedded blocks, controlled
nodes/marks, and a frontend rendering story. `text` field types are
right for legacy-shaped content (Markdown source, raw HTML) or pure
plain text.

If you do pick `markdown` or `wysiwyg`, the `toolbar` parameter
constrains what editors can do — drop `image`, `table`, etc. when
you don't want them.

#### `json`: raw JSON vs multi-select vs checkbox-group

The same `json` field type has three radically different editors:

```ts
// editor: "json" — raw JSON textarea. Use for true free-form JSON.

// editor: "string_multi_select" — dropdown of preset options
appearance: {
  editor: "string_multi_select",
  parameters: { options: [
    { label: "Vegetarian", value: "vegetarian" },
    { label: "Gluten-free", value: "gluten_free" },
  ]},
}
// stored as: ["vegetarian", "gluten_free"]

// editor: "string_checkbox_group" — same shape, checkboxes instead
```

`string_multi_select` and `string_checkbox_group` are the right
shape for **a fixed set of tags** (dietary flags, badge types,
feature toggles). The value is a JSON array of strings, queryable
on the CDA.

For a free-form, editor-typed list of strings that *isn't* a fixed
set, prefer creating a tag *model* and a `links` field — see
`taxonomy-classification.md`.

#### `single_block`: `framed_single_block` vs `frameless_single_block`

This is a content-reuse decision, not just a UI one. The frameless
variant is DatoCMS's "shared field set" pattern — see
`content-reuse.md` § Frameless Single Block.

Quick version: **frameless** when the block is a transparent way to
share fields (the editor sees the block's fields as if they were
inline on the parent); **framed** when the block is a meaningful
nested entity the editor should perceive as a unit.

#### `link` / `links`: `*_select` vs `*_embed`

Both editors do the same thing — pick / create a referenced record.
The difference is **preview density**.

- `link_select` / `links_select` — compact chips. The linked record
  shows up as a small tag with its title and an `x` to remove. Right
  for high-density many-link fields where editors recognize records
  by name alone (tags, technologies, categories).
- `link_embed` / `links_embed` — rich card. The linked record shows
  up with its presentation image, model name, title, and publication
  status. Right when editors benefit from a visual cue or when
  publication state matters at a glance (a featured Author, a
  selected Project on a case-study page).

Both variants offer the same "Create new…" and "From library"
actions, and both keep the linked record as a real reference —
neither edits the upstream record inline. Pick by how much
information the editor needs to scan to identify the link.

### `structured_text` editor parameters

The structured-text editor is the most configurable in the system:

```ts
appearance: {
  editor: "structured_text",
  parameters: {
    nodes: ["heading", "list", "link", "blockquote", "code", "thematicBreak"],
    marks: ["strong", "emphasis", "code", "highlight"],
    heading_levels: [2, 3],
    show_links_target_blank: true,
    show_links_meta_editor: false,
    blocks_start_collapsed: false,
  },
}
```

The decisions to make per field:

- **`nodes`** — which block-level node types editors can insert.
  Constrain aggressively. An "Article body" might allow everything;
  a "Quote attribution" might allow only `link`.
- **`marks`** — inline formatting. Drop `underline` if your design
  doesn't use it (otherwise editors will use it inconsistently).
- **`heading_levels`** — which `<h2>`–`<h6>` the editor can produce.
  `<h1>` is always reserved for the page itself; for body content,
  `[2, 3]` is the common pick.
- **`show_links_target_blank`** — gives editors the "open in new tab"
  toggle. Disable if your frontend handles target attribution
  globally.

### `seo` editor parameters

```ts
appearance: {
  editor: "seo",
  parameters: {
    fields: ["title", "description", "image"], // hide twitter_card / no_index if unused
    previews: ["google", "facebook", "twitter"],
  },
}
```

Hiding sub-fields the project doesn't use declutters the editor.
Showing only the previews that match the channels you publish to
(typically Google + one social) keeps the form scannable.

---

## Cross-cutting field attributes

### `default_value`

Per-type default. For localized fields, it's a locale-keyed object,
not a bare value:

```ts
// non-localized
default_value: "Untitled"

// localized
default_value: { en: "Untitled", it: "Senza titolo" }
```

Pairs well with required-but-rarely-changed fields (record status,
visibility flags) so editors don't have to think about them.

### `addons`

`appearance.addons` is an array of plugin add-ons that wrap the
editor — translation helpers, AI assist, character counters,
validation hints. The first-party editor is unchanged; addons
appear alongside it. Most projects don't need this; reach for it
only when a specific plugin solves a recurring editor pain.

### `deep_filtering_enabled`

Flag on `rich_text`, `single_block`, and `structured_text` fields.
When `true`, the GraphQL CDA exposes filters that look *inside* the
embedded blocks of records — e.g. "find all pages whose body
contains a `cta_block` with `tone: 'urgent'`."

**Use when** the frontend genuinely needs to query block contents
(filtering pages by embedded promo type, building a "blocks
mentioning X" report).

**Skip when** the frontend always reads block content top-down from
the parent record. Deep filtering adds GraphQL surface and can be
expensive on high-volume models.

---

## Common mistakes

- **Adding an `enum` validator without `string_select`/`string_radio_group`.**
  Validator catches bad input at save; UI still shows a free-text
  box. Pair them.
- **Using `extension: { predefined_list: 'image' }` for hero images.**
  Some image formats can't be transformed by the CDA's
  `responsiveImage`. Use `'transformable_image'` for any image you
  plan to render with responsive crops.
- **Skipping `required_alt_title`.** Editors forget alt text;
  accessibility audits and SEO suffer. Wire it on user-facing image
  fields.
- **Skipping `slug_title_field` on slug fields.** Editors hand-type
  slugs and they drift from titles. Always bind.
- **Skipping `title_length` / `description_length` on SEO fields.**
  Editors write copy that gets truncated by Google. The character
  counter prevents it.
- **Using `text` + `wysiwyg` for new editorial content.** Prefer
  `structured_text` — typed, queryable, embeds blocks, configurable
  nodes/marks. Use `text` for legacy or pure plain text.
- **Using a `json` field with the raw `json` editor for a fixed tag
  set.** Reach for `string_multi_select` / `string_checkbox_group` —
  editors get a curated UI, the data is still a JSON array of strings.
- **Defaulting to `link_select` for fields where editors need a
  visual cue.** Compact chips are great for tag-like fields (lots of
  short identifiers) but force editors to recognize records by title
  alone. For curated picks like a featured Author or a chosen
  Project, `link_embed` shows the thumbnail and publication status
  and is easier to scan.
- **Setting a bare-value `default_value` on a localized field.** It's
  silently ignored. Pass a locale-keyed object.
