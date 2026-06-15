# Design Tokens

Reference for DatoCMS Canvas variables available inside `<Canvas>`: `ctx.cssDesignTokens` colors and shadows, plus Canvas typography, spacing, motion, and runtime theme values.

Use Canvas variables directly for plugin UI. Add custom variables or concrete values only for user-requested styling, vendor widgets, media treatments, data visualization, or effects the Canvas vocabulary cannot express.

## Contents

- Usage rules
- Neutral text, surface, and border
- Primary, selected, disabled, and focus
- Danger and soft signal states
- Diff, publication status, and highlight
- Backdrop, overlay, and stacked surfaces
- Progress, tooltip, code, and scrollbar
- Field type groups
- Shadows
- Other Canvas variables

## Usage rules

- Use Canvas tokens and variables directly for plugin UI: semantic color/shadow tokens, typography variables, spacing variables, and easing variables.
- Do not define local aliases that only rename Canvas tokens or variables, such as `--plugin-border: var(--color--border)`, `--text-light: var(--color--ink-subtle)`, or `--gap: var(--spacing-m)`.
- Do not use `color-mix(...)` to simulate text hierarchy, selected states, disabled states, borders, focus rings, status panels, or standard shadows.
- Keep context families together: when a surface comes from one family, use that same family's ink, border, and outline when available.
- Use custom variables, hardcoded values, or `color-mix(...)` only for real customization outside Canvas semantics: user-requested product styling, media overlays, data visualization, vendor widgets, artwork, or effects the Canvas vocabulary cannot express.
- If a third-party library hoists styles or portals outside `<Canvas>`, pass concrete values from `ctx.cssDesignTokens`; otherwise prefer CSS `var(--color--...)` inside `<Canvas>`.

The main catalog covers the color/shadow vocabulary supplied through `ctx.cssDesignTokens`; the final section lists other Canvas variables available in plugin CSS.

## Neutral text, surface, and border

Use on ordinary plugin pages, panels, rows, inputs, captions, and links.

| Token | Use |
| - | - |
| `--color--border` | Default 1px divider between cards, rows and sections |
| `--color--border-hover` | Border of an input or card when hovered |
| `--color--ink` | Primary body text |
| `--color--ink-danger` | Error text or icon on a neutral surface |
| `--color--ink-disabled` | Label color on disabled inputs and buttons |
| `--color--ink-hover` | Toolbar icon and link fill on hover |
| `--color--ink-link` | Inline links and accent text |
| `--color--ink-muted` | Deemphasized text that should recede |
| `--color--ink-placeholder` | Empty-input placeholder text |
| `--color--ink-primary` | Theme-colored text and icons for branded labels |
| `--color--ink-subtle` | Secondary text, captions, helper labels |
| `--color--ink-success` | Success text or icon on a neutral surface |
| `--color--ink-warning` | Warning text or icon on a neutral surface |
| `--color--surface` | Page background that everything else sits on |
| `--color--surface-hover` | Hovered row inside lists and tables |
| `--color--surface-muted` | Background of muted section panels and quiet cards |
| `--color--surface-raised` | Elevated layer for modals, dropdowns and popovers |
| `--color--surface-raised-active` | Focused or pressed option inside a dropdown menu |
| `--color--surface-raised-hover` | Hovered option inside a dropdown menu |

## Primary, selected, disabled, and focus

Use for brand actions, selected choices, disabled controls, and focus affordances.

| Token | Use |
| - | - |
| `--color--disabled--ink` | Disabled button or control: muted background with low-contrast label |
| `--color--disabled--surface` | Disabled button or control: muted background with low-contrast label |
| `--color--focus--border` | Border color of the focused element |
| `--color--focus--outline` | Soft outline ring drawn around the focused element |
| `--color--primary--border` | Thin border drawn on top of a primary surface |
| `--color--primary--ink` | Text and icon color sitting on any primary surface |
| `--color--primary--surface` | Resting background of a primary call-to-action button |
| `--color--primary--surface-active` | Pressed primary button background |
| `--color--primary--surface-hover` | Hovered primary button background |
| `--color--primary--surface-muted` | Muted variant of the primary surface |
| `--color--primary--surface-secondary` | Quieter brand surface for accent badges and inline chips |
| `--color--primary-soft--border` | Thin border drawn on top of a soft brand surface |
| `--color--primary-soft--ink` | Text and icon color on a soft brand surface |
| `--color--primary-soft--surface` | Resting background of secondary brand-tinted buttons |
| `--color--primary-soft--surface-active` | Pressed tinted button background |
| `--color--primary-soft--surface-hover` | Hovered tinted button background |
| `--color--selected--border` | Border or outline ring drawn around a selected option or card |
| `--color--selected--ink` | Text and icon color inside the selected entry |
| `--color--selected--surface` | Background of the currently active entry in a list or tree |
| `--color--selected--surface-hover` | Hover on an entry that is already selected |

## Danger and soft signal states

Use context families together: surface with its matching ink, border, and outline.

| Token | Use |
| - | - |
| `--color--danger--ink` | Text and icon color on a destructive action surface |
| `--color--danger--surface` | Background of a destructive action button |
| `--color--danger-soft--border` | Border around an invalid input or alert toast |
| `--color--danger-soft--ink` | Error message text and the icon inside an error panel |
| `--color--danger-soft--outline` | Soft halo around an invalid field on focus |
| `--color--danger-soft--surface` | Background of error banners and alert toasts |
| `--color--success-soft--border` | Border around success banners |
| `--color--success-soft--ink` | Text inside success toasts and success banners |
| `--color--success-soft--outline` | Soft halo for success emphasis |
| `--color--success-soft--surface` | Background of success toasts |
| `--color--warning-soft--border` | Border around warning banners and modified-state pills |
| `--color--warning-soft--ink` | Text inside warning banners and warning toasts |
| `--color--warning-soft--outline` | Soft halo for warning emphasis |
| `--color--warning-soft--surface` | Background of warning banners and plugin notices |

## Diff, publication status, and highlight

Use for content-versioning, publishing workflow markers, and rich-text highlights.

| Token | Use |
| - | - |
| `--color--diff-added--ink` | Left-border color of a positive rule when it was recently changed (vivid) |
| `--color--diff-added--ink-subtle` | Left-border color of a positive rule when it was not recently changed |
| `--color--diff-added--outline` | Outline drawn around a block-level added revision panel |
| `--color--diff-added--surface` | Background of inline added text inside a text diff |
| `--color--diff-changed--outline` | Outline drawn around a block-level changed revision panel |
| `--color--diff-changed--surface` | Background of inline changed text inside a text diff |
| `--color--diff-removed--ink` | Left-border color of a negative rule when it was recently changed (vivid) |
| `--color--diff-removed--ink-subtle` | Left-border color of a negative rule when it was not recently changed |
| `--color--diff-removed--outline` | Outline drawn around a block-level removed revision panel |
| `--color--diff-removed--surface` | Background of inline removed text inside a text diff |
| `--color--highlight--surface` | Background of a highlighted span inside a rich text editor |
| `--color--status-draft--ink` | Dot color for records that exist only as a draft |
| `--color--status-outdated--ink` | Dot color for published records with unpublished changes |
| `--color--status-published--ink` | Dot color for fully published records |

## Backdrop, overlay, and stacked surfaces

Use for modal scrims, media overlays, and layered upload/media controls.

| Token | Use |
| - | - |
| `--color--backdrop--ink` | Full-screen modal dim with icon color for close controls |
| `--color--backdrop--surface` | Full-screen modal dim with icon color for close controls |
| `--color--overlay--ink` | Text and icon color inside reversed buttons on overlay surfaces |
| `--color--overlay--surface` | Scrim painted over media thumbnails and image cards |
| `--color--overlay--surface-active` | Pressed background of a reversed button on dark media |
| `--color--overlay--surface-hover` | Hover background of a reversed button floating on dark media |
| `--color--stacked--border` | Column rules and dividers inside a stacked panel |
| `--color--stacked--ink` | Main text and values on a stacked surface |
| `--color--stacked--ink-subtle` | Field labels and secondary text on a stacked surface |
| `--color--stacked--surface` | Base layer of a dark inline panel |
| `--color--stacked--surface-action` | Resting background of action buttons inside a stacked panel (transparent) |
| `--color--stacked--surface-action-active` | Pressed action button inside a stacked panel |
| `--color--stacked--surface-action-hover` | Hovered action button inside a stacked panel |
| `--color--stacked--surface-upper` | Inner detail panel sitting one layer above the base |

## Progress, tooltip, code, and scrollbar

Use for progress bars, tooltips, code/log blocks, and native scrollbar thumbs.

| Token | Use |
| - | - |
| `--color--code--ink` | Dark monospaced surface with its text color |
| `--color--code--surface` | Dark monospaced surface with its text color |
| `--color--progress--fill` | Filled portion of the bar, drawn in the brand color |
| `--color--progress--fill-hover` | Fill color when the bar is hovered |
| `--color--progress--track` | Empty portion of the bar (the background track) |
| `--color--scrollbar--fill` | Native scrollbar thumb color across the app |
| `--color--tooltip--ink` | Primary text inside a tooltip |
| `--color--tooltip--ink-subtle` | Secondary text inside a tooltip, e.g. the keyboard shortcut hint |
| `--color--tooltip--surface` | Background of standard and keyboard-hint tooltips |
| `--color--tooltip--surface-hover` | Hover background for interactive controls living inside a tooltip |

## Field type groups

Use for fixed-hue field-type chips and icons, not generic status or brand accents.

| Token | Use |
| - | - |
| `--color--field-group-boolean--ink` | Boolean fields |
| `--color--field-group-boolean--surface` | Boolean fields |
| `--color--field-group-color--ink` | Color fields |
| `--color--field-group-color--surface` | Color fields |
| `--color--field-group-datetime--ink` | Date and date-time fields |
| `--color--field-group-datetime--surface` | Date and date-time fields |
| `--color--field-group-json--ink` | JSON fields |
| `--color--field-group-json--surface` | JSON fields |
| `--color--field-group-location--ink` | Lat/lon fields |
| `--color--field-group-location--surface` | Lat/lon fields |
| `--color--field-group-media--ink` | File, gallery and video fields |
| `--color--field-group-media--surface` | File, gallery and video fields |
| `--color--field-group-number--ink` | Integer and float fields |
| `--color--field-group-number--surface` | Integer and float fields |
| `--color--field-group-reference--ink` | Link and links fields |
| `--color--field-group-reference--surface` | Link and links fields |
| `--color--field-group-rich-text--ink` | Rich-text and single-block fields |
| `--color--field-group-rich-text--surface` | Rich-text and single-block fields |
| `--color--field-group-seo--ink` | Slug and SEO fields |
| `--color--field-group-seo--surface` | Slug and SEO fields |
| `--color--field-group-text--ink` | Text / string / structured-text fields |
| `--color--field-group-text--surface` | Text / string / structured-text fields |

## Shadows

Use directly in `box-shadow`; avoid rebuilding standard elevation with `color-mix(...)` or hardcoded rgba shadows.

| Token | Use |
| - | - |
| `--shadow--ambient` | Largest ambient panel shadow for broad elevated surfaces |
| `--shadow--floating` | Popover, menu, tooltip, and floating layer shadow |
| `--shadow--lifted` | Stronger card or panel elevation when an element is lifted above the page |
| `--shadow--raised` | Subtle control or card elevation above the base surface |

## Other Canvas variables

These variables are available inside `<Canvas>` but are not part of `ctx.cssDesignTokens`. They are still the default Canvas design vocabulary for typography, spacing, and motion; use them directly before inventing local values.

| Variable | Use |
| - | - |
| `--base-font-family` | Default DatoCMS UI font family. |
| `--monospaced-font-family` | DatoCMS monospace font family for code, JSON, logs, and technical values. |
| `--font-weight-bold` | DatoCMS bold weight, currently `500`, for emphasis that matches DatoCMS text weight. |
| `--font-size-xxs` | Tiny badges and compact metadata. |
| `--font-size-xs` | Field meta, small labels, and compact helper text. |
| `--font-size-s` | Hints and secondary metadata. |
| `--font-size-m` | Default body, controls, and inputs. |
| `--font-size-l` | Toolbar titles and emphasized row labels. |
| `--font-size-xl` | Section and modal titles. |
| `--font-size-xxl` | Large page headings. |
| `--font-size-xxxl` | Largest page titles. |
| `--spacing-s` | Small gaps and compact inline separation. |
| `--spacing-m` | Default inner spacing and toolbar gaps. |
| `--spacing-l` | Standard form and card spacing. |
| `--spacing-xl` | Large section or panel spacing. |
| `--spacing-xxl` | Major empty-state or page spacing. |
| `--spacing-xxxl` | Very large isolation spacing. |
| `--negative-spacing-s` | Negative counterpart to `--spacing-s`. |
| `--negative-spacing-m` | Negative counterpart to `--spacing-m`. |
| `--negative-spacing-l` | Negative counterpart to `--spacing-l`. |
| `--negative-spacing-xl` | Negative counterpart to `--spacing-xl`. |
| `--negative-spacing-xxl` | Negative counterpart to `--spacing-xxl`. |
| `--negative-spacing-xxxl` | Negative counterpart to `--spacing-xxxl`. |
| `--material-ease` | Default CMS easing curve for hover, focus, and state transitions. |
| `--inertial-ease` | Faster entrance/exit curve for dropdowns, popovers, and temporary UI. |

Runtime theme values are also available: `ctx.colorScheme` is `light` or `dark`, and the SDK sets `data-color-scheme` plus CSS `color-scheme` on the document element. Use them only for non-CSS choices such as third-party widget modes, alternate assets, or syntax-highlighting themes.
