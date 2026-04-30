# Separation of Content and Presentation

The most important principle in structured content: **separate what
content IS from how it LOOKS**. A schema that encodes the current
design becomes technical debt the moment the design changes.

## The problem

When content is tied to presentation:

- Redesigns require a content migration, not just a CSS change.
- Content can't be reused across channels (web, mobile app, voice,
  email, syndication).
- Editors make design decisions instead of content decisions.
- A/B testing and seasonal variants require duplicating content.

## The principle

Model content based on **meaning and purpose**, not visual appearance.
The frontend is responsible for presentation; the schema is responsible
for what the content *is*.

### Bad: presentation-focused

```
big_hero_text       → what if we want small heroes?
red_button          → what if brand colors change?
three_column_layout → what about mobile (one column)?
left_sidebar        → position is a frontend concern
mobile_image        → device-specific content is fragile
```

### Good: meaning-focused

```
headline           → the main message (render however)
call_to_action     → an action we want users to take
features           → a list of things (columns decided by frontend)
related_content    → a relationship (positioned by context)
image              → one image with responsive crops
```

## The redesign test

Ask: *"If we completely redesigned the site tomorrow, would these
field names still make sense?"*

- `three_column_features` → ❌ fails (what if 2 columns next year?)
- `features` → ✅ works (describes the content's purpose: a list of
  product features)
- `blue_highlight_box` → ❌ fails (what if we go purple?)
- `callout` → ✅ works (describes the role: an attention-grabbing aside)

If the answer is "we'd have to rename the field," the field is
presentation-shaped.

## DatoCMS implementation

Use `api_key` values that describe the content's role, not its visual
treatment. When variants matter, encode them as enum-validated string
fields the frontend interprets.

```ts
// ❌ presentation in field names
fields.create(modelId, { api_key: "big_hero_text", field_type: "string" });
fields.create(modelId, { api_key: "font_size",     field_type: "integer" });
fields.create(modelId, { api_key: "background_color", field_type: "color" });

// ✅ meaning in field names; variant as data, not as type
fields.create(modelId, { api_key: "headline", field_type: "string" });
fields.create(modelId, {
  api_key: "emphasis",
  field_type: "string",
  validators: { enum: { values: ["standard", "prominent"] } },
});
fields.create(modelId, {
  api_key: "tone",
  field_type: "string",
  validators: { enum: { values: ["neutral", "warning", "success"] } },
});
```

The frontend translates `tone: "warning"` into whatever visual style is
current. Content stays semantic across redesigns.

For the validator + appearance pairing that makes the enum show up as
a real dropdown (not a free-text input that accidentally accepts bad
values), see `field-configuration.md` § "Constrain a string to a
fixed set of values — enum".

## Don't recreate built-in record meta

Every DatoCMS record exposes a `meta` object with fields that already
exist on every model. **Don't add custom fields with these names** —
you'll get two parallel sources of truth that drift the moment an
editor edits one and not the other.

| Built-in (on `record.meta`) | What it is | Editor-editable? |
|---|---|---|
| `created_at` | Timestamp the record was first created | ✅ yes, like a regular field |
| `updated_at` | Timestamp of the last update | ✅ yes |
| `published_at` | Timestamp of the most recent publication | ✅ yes |
| `first_published_at` | Timestamp of the first-ever publication | ✅ yes |
| `publication_scheduled_at` | Timestamp of a future scheduled publication | ✅ yes |
| `status` | `'draft' \| 'updated' \| 'published'` | derived |
| `is_valid` | Whether the record passes its validators | derived |

Common anti-pattern:

```ts
// ❌ Don't do this — duplicates record.meta.published_at
fields.create(modelId, {
  api_key: "published_at",
  field_type: "date_time",
  label: "Publication date",
});

// ✅ Just read record.meta.published_at on the frontend.
// If the editor needs to backdate, they can edit it directly in the admin —
// the meta timestamps are user-editable.
```

In GraphQL the meta fields are exposed as `_createdAt`, `_updatedAt`,
`_publishedAt`, `_firstPublishedAt`, `_publicationScheduledAt`,
`_status`. If a domain concept genuinely differs from "when was this
published" (for example an `event_date` on an event model, or an
`effective_from` on a pricing rule), that's a real field — the test
is whether the value can change independently of the publication
lifecycle.

## Don't recreate file/gallery metadata either

Same trap, applied to uploads. Every asset carries `alt`, `title`,
`custom_data` (arbitrary JSON), and (for images) `focal_point` —
all per-locale. The key insight is that these properties exist at
**two levels**, and either one is enough to avoid creating sibling
fields:

| Level | Where | Use for |
|---|---|---|
| **Upload-level default** | Set on the upload itself in the Media Area (`default_field_metadata`) | The asset's "true" alt/title that travels with it everywhere it's used. The CDA also serves these as fallbacks when no per-record override exists. |
| **Per-record override** | Set on the `file` / `gallery` field of the specific record (the asset selector exposes the same fields) | When *this record* needs a different alt or title than the upload's default — a hero image whose alt should reference the article's headline, a product photo whose title should mention the product variant. |

**There is no third "in-record-but-not-on-the-upload" case** that
justifies a sibling field. Whether the editor wants a global value
or a per-record one, the answer is to fill the metadata on the
upload or on the field — never `image_alt`, `image_title`,
`image_label`, `image_caption` as separate fields.

Common anti-patterns:

```ts
// ❌ Don't do this — duplicates the asset's built-in metadata
fields.create(modelId, { api_key: "image_alt",     field_type: "string" });
fields.create(modelId, { api_key: "image_title",   field_type: "string" });
fields.create(modelId, { api_key: "image_label",   field_type: "string" });
fields.create(modelId, { api_key: "image_caption", field_type: "string" });

// ✅ Use the file/gallery field's own metadata. For a per-locale
//    record-level alt/title, the editor edits it right inside the
//    asset selector. Force editors to fill alt with
//    required_alt_title — see field-configuration.md § "Constrain
//    files and images".
fields.create(modelId, {
  api_key: "hero_image",
  field_type: "file",
  validators: { required_alt_title: { alt: true } },
});

// ✅ For free-form record-specific data on the asset (e.g. a
//    "display variant" the frontend reads), use custom_data on the
//    file field — still no extra field needed.
```

In GraphQL, asset metadata is exposed on the upload itself
(`hero.alt`, `hero.title`, `hero.customData`, `hero.focalPoint`),
and the CDA automatically resolves the per-record override on top
of the upload-level default. The `responsiveImage` helpers pick
`alt` and `title` through the same chain.

The same logic applies to upload-level attributes set in the Media
Area (`copyright`, `author`, `notes`, `tags`, `upload_collection`).
Don't recreate them as fields — they're already there.

## Don't recreate `position` either — use model ordering

Same trap, different field. To order records in a list, **don't add a
`position` integer field**. The model itself owns ordering:

| What you want | Model attribute | Editor experience |
|---|---|---|
| Editors drag records into a curated order | `sortable: true` | Drag-and-drop handle in the collection |
| Hierarchical parent → children with order inside each level | `tree: true` | Drag-and-drop with indenting; `parent` and `position` are managed for you |
| Automatic order by a domain field (e.g. `priority`, `event_date`) | `ordering_field: { id, type: "field" }` + `ordering_direction` | Records sort automatically |
| Automatic order by a meta timestamp | `ordering_meta: 'created_at' \| 'updated_at' \| 'first_published_at' \| 'published_at'` + `ordering_direction` | Pure chronological feeds |

These four strategies are mutually exclusive — pick one. See
`model-configuration.md` § Behaviour — ordering for the full
decision shortcuts and the constraints on block models.

## Hints — the schema's running commentary

A field name says what the field *is*. A hint says what the editor
should *do* with it. Names are constrained by `api_key` rules and
brevity; hints are free-form and live right under the field in the
record form. Use them.

**The rule: always add a hint unless the field is genuinely obvious.**
"Title" doesn't need a hint. Almost everything else does. The cost
of a hint is one string; the cost of a confused editor guessing
is recurring forever.

### Where hints live

DatoCMS supports hints in three places — all the same `hint` string,
all rendered in the editor UI under the relevant element:

| On | Use for |
|---|---|
| `field.hint` | What this field is for, what format the value should take, why it might be required, examples of good values |
| `fieldset.hint` | Why these fields are grouped together; what context the whole section serves |
| `item_type.hint` | What this model represents in the project, when an editor should reach for it instead of a similar-looking model |

### What to write

Good hints answer the questions an editor would otherwise have to ask
in Slack:

- **Format and constraints.** "Used in the URL — keep it lowercase,
  use hyphens, no special characters." (For a slug.)
- **Where the value shows up.** "Appears as the page's `<title>` and
  in social shares." (For an SEO title.)
- **Decision guidance.** "Choose 'Featured' to surface this article
  on the homepage carousel — limit 4 active at a time."
- **Format examples.** "e.g. `2026-04-30T14:00:00+02:00`."
- **Cross-references.** "Editing this updates every product card on
  the site. To override copy on a specific page, use the
  page-specific override block instead."
- **Why it's required.** "Required because the public site falls back
  to this when no per-locale value is set."

### What *not* to write

- **Don't restate the field name.** "The title of the article" under
  a field called "Title" is noise.
- **Don't write hints that rot.** "Used by the homepage hero on
  marketing.example.com (added Q3 2024)" — the hint outlives the
  context. Describe the *purpose*, not the current usage.
- **Don't use hints as documentation.** A multi-paragraph hint means
  the field is doing too much, or there's a deeper concept the model
  hint should explain instead.
- **Don't put validation rules in hints when the validator already
  enforces them.** The validator's error message is where editors
  see "must be at least 10 characters" — duplicating it in the hint
  is noise unless it adds *why*.

### Apply consistently when scripting bulk model creation

When migrations or scripts create many fields at once, it's tempting
to ship without hints and "add them later." Later doesn't come. Add
the hint at create time — even a thin one — because the field's
purpose is freshest in the schema author's mind right then.

The same applies to model and fieldset hints: write them while
designing, not as a retroactive cleanup pass.

## The same trap, applied to blocks

Block model names suffer the same problem more visibly because they
end up in the project's Blocks Library where editors see them.

- `homepage_hero_block` → ❌ ties the block to a page
- `hero_block` → ✅ a hero is a hero on any page
- `three_card_grid_block` → ❌ a layout description, not a content shape
- `card_grid_block` (with a `cards` array) → ✅ the frontend chooses 2/3/4
  columns
- `blue_callout_block`, `yellow_callout_block`, `red_callout_block` → ❌
  three near-duplicate blocks
- one `callout_block` with a `tone` enum → ✅ one shape, frontend maps
  tone → color

(All block `api_key`s in these examples carry the `_block` suffix —
see `models-vs-blocks.md` § "Naming convention" for why.)

See `content-reuse.md` for more on block-library hygiene.
