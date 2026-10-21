# Opt-in Project Updates

Use this reference when code or advice depends on API defaults or data formats in a project you didn't create, or must work across projects (plugins, shared scripts, starters).

## How updates work

- DatoCMS ships some API changes as opt-in updates, listed under "Available updates" in an environment's configuration.
- Projects created after an update ships get it automatically. Older projects keep the old behavior until someone activates it.
- Activation is one-way and per environment.
- The API docs describe the updated behavior only.
- No API call deactivates an update, so a newly created project shows only the updated behavior.

## Reading the flags

- CMA: `client.site.find()` returns each flag in `meta`, for the client's environment. Any role with access to the environment can read it.
- Plugins: `ctx.site.meta` carries the same flags for the environment the user has open, with no extra permission.
- `false` means the environment hasn't activated that update.

## Differences

| Flag (links to the announcement) | Without the update | With the update | Affects |
| - | - | - | - |
| [`improved_items_listing`](https://www.datocms.com/product-updates/improved-items-listing) | Listing records (`GET /items`) without `version` returns published versions only. | The same call returns the latest versions, drafts and updates included. Single-record reads (`GET /items/:id`) return the latest version either way. | CMA |
| [`draft_mode_default`](https://www.datocms.com/product-updates/activate-draft-mode-as-default) | A model created without `draft_mode_active` gets draft mode off. | The same model gets draft mode on. | CMA |
| [`improved_boolean_fields`](https://www.datocms.com/product-updates/improved-boolean-fields) | Boolean field values can be `null`: on existing records when a field is added without a default, and after writing `null`. | Boolean values are always `true` or `false`; `null` becomes `false`. | CMA, CDA |
| [`milliseconds_in_datetime`](https://www.datocms.com/product-updates/milliseconds-in-datetime) | Datetimes serialize without milliseconds (`2025-12-05T14:30:00+00:00`). | Datetimes include milliseconds (`2025-12-05T14:30:00.345+00:00`). | CMA, CDA |
| [`improved_timezone_management`](https://www.datocms.com/product-updates/improved-timezone-management) | DateTime fields store no timezone. The CMA ignores the offset you send, keeps the wall-clock time, and outputs it in the project timezone, so changing the project timezone moves every stored instant. | DateTime fields store the instant. The API outputs it converted to the project timezone. | CMA, CDA |
| [`improved_validation_at_publishing`](https://www.datocms.com/product-updates/force-validations-on-records-when-publishing) | Publishing a record that fails the model's current validations succeeds, unless the model allows saving invalid drafts. | Publishing an invalid record fails with `INVALID_DRAFT`. | CMA, CMS |
| [`non_localized_focal_points`](https://www.datocms.com/product-updates/non-localized-focal-points) | Upload `default_field_metadata` is locale-keyed: `{ en: { alt, title, custom_data, focal_point } }`. | It's field-keyed: `{ alt: { en }, title: { en }, custom_data: { en }, focal_point }`. The CMA rejects the locale-keyed shape on write. `@datocms/cma-client` types it from 5.5.0. | CMA |
| [`improved_hex_management`](https://www.datocms.com/product-updates/improved-hex-management) | Color `hex` uses 6 digits (`#RRGGBB`), without alpha. | Color `hex` uses 8 digits (`#RRGGBBAA`). | CDA |
| [`improved_gql_multilocale_fields`](https://www.datocms.com/product-updates/improved-gql-multilocale-fields) | `locale` and `fallbackLocales` on multi-locale fields (`_allTitleLocales`), and `fallbackLocales` on meta fields, are ignored. | Both arguments apply. | CDA |
| [`improved_gql_visibility_control`](https://www.datocms.com/product-updates/improved-gql-visibility-control) | A token with limited permissions can introspect models and fields outside its scope. | Introspection hides what the token can't access. | CDA |
| [`improved_exposure_of_inline_blocks_in_cda`](https://www.datocms.com/product-updates/improved-exposure-of-inline-blocks-in-cda) | Structured Text inline blocks appear in `blocks`. | Inline blocks have their own `inlineBlocks` selector. | CDA |
