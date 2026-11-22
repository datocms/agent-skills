# Field types: values, validators, editors

Complete catalog of the 20 `field_type` values: what each stores, every validator it accepts, every built-in editor (the dashboard's "presentation") with its parameters. Use it to build `fields.create` / `fields.update` payloads and record values without guessing. Mechanics of creating models and fields: `references/schema.md`. Block and Structured Text record payloads: `references/editing-records.md`.

## Contents

- Rules for every field
- Text: `string`, `text`, `slug`, `json`
- Numbers, booleans, dates: `integer`, `float`, `boolean`, `date`, `date_time`
- Structured values: `color`, `lat_lon`, `seo`, `video`
- Assets: `file`, `gallery`
- Record links: `link`, `links`
- Blocks: `rich_text`, `single_block`, `structured_text`
- Validator parameters
- Plugin editors and addons

## Rules for every field

- **Required validators.** `link`, `links`, `rich_text`, `single_block` and `structured_text` are rejected on create without their item-type validators (marked **required** below) — `INVALID_FIELD`, `details.code: VALIDATION_REQUIRED`, `details.field: validators.<name>`.
- **Requiredness is a validator**: `validators: { required: {} }`. Not every type has it (see each type); `boolean` has no validators at all.
- **A validator belongs to specific types.** One the type does not list → `VALIDATION_INVALID`. Never copy a validator set across types.
- **`appearance` is all-or-nothing**: `{ editor, parameters, addons }`, all three keys, even `parameters: {}` and `addons: []`. Unknown parameter keys are rejected. Omit `appearance` entirely to get the type's default editor (listed first below).
- **Update semantics.** `validators` replaces the whole object: send every validator the field should keep. `appearance.parameters` merge into the stored ones while `editor` stays the same; changing `editor` resets them.
- **Narrowing an allowlist deletes content.** Removing a model from `item_types` on a link or block validator deletes existing links to it / destroys existing blocks of it.
- **`default_value`** only on `boolean`, `color`, `date`, `date_time`, `float`, `integer`, `json`, `lat_lon`, `string`, `text` (else `FIELD_DOES_NOT_SUPPORT_DEFAULT_VALUE`). Localized field → object with exactly the environment's locales as keys (else `FIELD_DEFAULT_VALUE_LOCALES_MISMATCH_ENVIRONMENT_LOCALES`).
- **Localized values** are `{ <locale>: value }` in the shapes below. Any type can be localized, except fields of block models.
- **Fields of block models**: no `localized`, no `unique`, no fieldset, no `deep_filtering_enabled`.
- **`api_key`** (fields and models): lowercase, starts with a letter, at least 2 characters, no `__`, no trailing `_`, no `_` right before a digit (`field_1` invalid, `field1` valid) → `API_KEY_FORMAT_INVALID`. Model keys must also be singular (`blog_post`) → `VALIDATION_PLURAL`.
- **Changing `field_type`** works only for `string`↔`text`, `integer`↔`float`, `file`↔`gallery`, `link`↔`links`, `rich_text`↔`single_block`. That request ignores every other attribute and resets validators and appearance: send other changes in a second call.

Entries below: **Value** = what the CMA takes and returns. **Validators** / **Editors** = everything allowed; parameters in braces, `?` = optional, `=` = default.

## Text: `string`, `text`, `slug`, `json`

### `string` (Single-line string)

- Value: string. `null` is stored and read back as `""`.
- Validators: `required`, `unique`, `length`, `format`, `enum`.
- Editors: `single_line` { `heading`=false, `placeholder`? } · `string_select` { `options`: \[{ `label`, `value`, `hint`? }] } · `string_radio_group` { `radios`: \[{ `label`, `value`, `hint`? }] }. Pair the last two with an `enum` validator holding the same values.
- Only type usable as a slug source and as the model's `title_field`.

### `text` (Multiple-paragraph text)

- Value: string (Markdown, HTML or plain, depending on the editor). `null` reads back as `""`.
- Validators: `required`, `length`, `format`, `sanitized_html`.
- Editors: `markdown` { `toolbar`=all of `heading` `bold` `italic` `strikethrough` `code` `unordered_list` `ordered_list` `quote` `link` `image` `fullscreen` } · `wysiwyg` { `toolbar`: from `format` `bold` `italic` `strikethrough` `code` `ordered_list` `unordered_list` `quote` `table` `link` `image` `show_source` `undo` `redo` `align_left` `align_center` `align_right` `align_justify` `outdent` `indent` `fullscreen` } · `textarea` { `placeholder`? }.

### `slug`

- Value: string or `null`. The API never generates it: `slug_title_field` only makes the dashboard pre-fill it, so scripts send the slug themselves.
- Validators: `required`, `unique`, `length`, `slug_format`, `slug_title_field`.
- Editor: `slug` { `url_prefix`?, `placeholder`? }.

### `json`

- Value: a **JSON-encoded string** (`JSON.stringify(data)`), read back as a re-indented string (`JSON.parse` it). `null` allowed.
- Validators: `required`.
- Editors: `json` · `string_multi_select` { `options`: \[{ `label`, `value`, `hint`? }] } · `string_checkbox_group` { same }. With the last two the stored value is a JSON array of the chosen `value` strings.

## Numbers, booleans, dates: `integer`, `float`, `boolean`, `date`, `date_time`

### `integer`, `float`

- Value: number or `null`.
- Validators: `required`, `number_range`.
- Editors: `integer` { `placeholder`? } for `integer`, `float` { `placeholder`? } for `float`.

### `boolean`

- Value: `true` / `false`. `null` is stored as `false`.
- Validators: none.
- Editors: `boolean` (switch) · `boolean_radio_group` { `positive_radio`: { `label`, `hint`? }, `negative_radio`: { `label`, `hint`? } }.

### `date`

- Value: `"YYYY-MM-DD"` or `null`.
- Validators: `required`, `date_range`.
- Editor: `date_picker`.

### `date_time`

- Value: ISO 8601 string with offset (`"2026-03-01T09:30:00+01:00"`) or `null`. Read back in the project's timezone.
- Validators: `required`, `date_time_range`.
- Editor: `date_time_picker`.

## Structured values: `color`, `lat_lon`, `seo`, `video`

### `color`

- Value: `{ red, green, blue, alpha }` — four integers 0–255, all required (alpha too: 255 = opaque). Not a hex string. Or `null`.
- Validators: `required`.
- Editor: `color_picker` { `enable_alpha`=false, `preset_colors`=\[] (hex strings) }.

### `lat_lon` (Geolocation)

- Value: `{ latitude, longitude }` (floats, both required) or `null`.
- Validators: `required`.
- Editor: `map`.

### `seo`

- Value: `{ title?, description?, image?: <upload id>, twitter_card?: "summary" | "summary_large_image", no_index?: boolean }` or `null`. Unknown keys rejected. Reads return all five keys.
- Validators: `required_seo_fields`, `title_length`, `description_length`, `file_size`, `image_dimensions`, `image_aspect_ratio`. No `required`.
- Editor: `seo` { `fields`=all of `title` `description` `image` `no_index` `twitter_card`, `previews`=all of `google` `twitter` `facebook` `telegram` `whatsapp` `slack` `linkedin` }.

### `video` (External video)

- Value: `{ provider: "youtube" | "vimeo" | "facebook", provider_uid, url, width, height, thumbnail_url, title }`, every key required (nothing is fetched for you), or `null`.
- Validators: `required`.
- Editor: `video`.

## Assets: `file`, `gallery`

### `file` (Single asset)

- Value on write: `{ upload_id }`, plus optional `alt`, `title`, `custom_data` ({ string: string }), `focal_point` ({ `x`, `y` } 0–1, images), `poster_time` (seconds, Mux video). Read: always the full object with those keys. `null` to clear. Metadata defaults: `references/uploads.md`.
- Validators: `required`, `extension`, `file_size`, `image_dimensions`, `image_aspect_ratio`, `required_alt_title`.
- Editor: `file`.

### `gallery` (Asset gallery)

- Value: array of `file` objects; `null` becomes `[]`.
- Validators: `size`, `extension`, `file_size`, `image_dimensions`, `image_aspect_ratio`, `required_alt_title`. No `required`: use `size: { min: 1 }`.
- Editor: `gallery`.

## Record links: `link`, `links`

Link validators accept only regular models in `item_types`, never block models.

### `link` (Single link)

- Value: record ID string or `null`.
- Validators: `item_item_type` (**required**), `required`, `unique`.
- Editors: `link_select` (compact) · `link_embed` (expanded card). Both { `filters`=\[] }.

### `links` (Multiple links)

- Value: array of record ID strings; `null` becomes `[]`.
- Validators: `items_item_type` (**required**), `size`. No `required`: use `size: { min: 1 }`.
- Editors: `links_select` · `links_embed`. Both { `filters`=\[] }.

## Blocks: `rich_text`, `single_block`, `structured_text`

Block validators accept only block models (`modular_block: true`) in `item_types`. Payloads for creating, editing, keeping and deleting blocks: `references/editing-records.md`.

### `rich_text` (Modular content — the API name is not `modular_content`)

- Value: array of blocks, each a block ID string or a block object; `null` becomes `[]`. Reads return IDs unless `nested: true`.
- Validators: `rich_text_blocks` (**required**), `size`. No `required`: use `size: { min: 1 }`.
- Editor: `rich_text` { `start_collapsed`=false }.

### `single_block`

- Value: one block ID string, one block object, or `null`.
- Validators: `single_block_blocks` (**required**), `required`.
- Editors: `framed_single_block` { `start_collapsed`=false } · `frameless_single_block` (no parameters; the block's fields show inline as if they belonged to the record).

### `structured_text`

- Value: `{ schema: "dast", document: { type: "root", children: [...] } }` or `null`. `block` / `inlineBlock` nodes hold a block ID or block object in `item`; `itemLink` / `inlineItem` nodes hold a record ID.
- Validators: `structured_text_blocks` (**required**; `item_types: []` = no blocks), `structured_text_links` (**required**; `item_types: []` = no record links), `structured_text_inline_blocks` (optional; omitted = no inline blocks), `required`, `length` (counts text characters).
- Editor: `structured_text` { `nodes`=all of `blockquote` `code` `heading` `link` `list` `thematicBreak` `inlineItem` `itemLink`, `marks`=all of `strong` `emphasis` `underline` `strikethrough` `code` `highlight`, `heading_levels`=\[1,2,3,4,5,6], `blocks_start_collapsed`=false, `show_links_target_blank`=true, `show_links_meta_editor`=false }. These restrict the editor toolbar only: the API does not reject a document that uses a node, mark or heading level left out here.

## Validator parameters

| Validator | Parameters |
| - | - |
| `required`, `unique` | `{}` |
| `length` | `min`?, `max`?, `eq`? — at least one |
| `size` | `min`?, `max`?, `eq`?, `multiple_of`? — at least one of the first three |
| `number_range` | `min`?, `max`? — at least one |
| `date_range` | `min`?, `max`? as `"YYYY-MM-DD"` — at least one |
| `date_time_range` | `min`?, `max`? as ISO 8601 with offset — at least one |
| `enum` | `values`: string\[] |
| `format` | `predefined_pattern`: `"email"` \| `"url"`, or `custom_pattern`: regex string with optional `description` (the message editors see) — exactly one of the two patterns. A custom pattern matches anywhere in the value: anchor it (`^[A-Z0-9]{6}$`) to constrain the whole value |
| `slug_format` | `predefined_pattern`: `"webpage_slug"`, or `custom_pattern` with optional `description` |
| `slug_title_field` | `title_field_id`: ID of a `string` field of the same model |
| `sanitized_html` | `sanitize_before_validation`=false |
| `extension` | `predefined_list`: `"image"` \| `"transformable_image"` \| `"video"` \| `"document"`, or `extensions`: string\[] without the dot (`["pdf", "docx"]`; `".pdf"` is stored as given and then matches no file). `"document"` covers office formats too, not only PDF |
| `file_size` | `min_value` + `min_unit` and/or `max_value` + `max_unit`; units `"B"` \| `"KB"` \| `"MB"` (1 MB = 1024 × 1024 bytes) |
| `image_dimensions` | `width_min_value` + `height_min_value` and/or `width_max_value` + `height_max_value` (pixels; width and height together) |
| `image_aspect_ratio` | `min_ar_numerator` + `min_ar_denominator`, `eq_ar_*`, `max_ar_*` — positive integers, at least one pair |
| `required_alt_title` | `alt`=false, `title`=false — at least one true |
| `required_seo_fields` | `title`, `description`, `image`, `twitter_card` (booleans, default false) — at least one true |
| `title_length`, `description_length` | `min`?, `max`? |
| `item_item_type`, `items_item_type`, `structured_text_links` | `item_types`: model IDs, plus the three strategies below |
| `rich_text_blocks`, `single_block_blocks`, `structured_text_blocks`, `structured_text_inline_blocks` | `item_types`: block model IDs |

Strategies on the three link validators:

| Parameter | Values (default first) | Decides |
| - | - | - |
| `on_publish_with_unpublished_references_strategy` | `fail`, `publish_references` | Publishing a record that links to unpublished records: refuse, or publish them too |
| `on_reference_unpublish_strategy` | `delete_references`, `fail`, `unpublish` | A linked record is unpublished: drop the link, refuse, or unpublish the linking record too |
| `on_reference_delete_strategy` | `delete_references`, `fail` | A linked record is deleted: drop the link (the linking record stays), or refuse |

## Plugin editors and addons

- Plugin as the field's editor: `appearance: { editor: <plugin id>, field_extension: <extension id>, parameters: {...}, addons: [] }`.
- Plugin addon under any editor: an `addons` entry `{ id: <plugin id>, field_extension: <extension id>, parameters: {...} }`.
- `parameters` plus `addons` hold at most 10 KB of plugin data per field → `FIELD_APPEARANCE_PLUGIN_DATA_TOO_LARGE`.
