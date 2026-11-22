# Color tokens

Components use only the **semantic tokens** of this page. Never use the
primitive ramps (`--wash-*`, `--pigment-*`, `--red-*`...) or a hex value in a
component. Each token has a light and a dark value: use the toggle in the sidebar
to see the dark values. This page is the only source of the grammar and of
the meaning of each token. The samples at the end of the page show each
token with its value.

## Grammar

```
--color--{property}-{variant}            standalone (one level)
--color--{context}--{property}-{variant} context pair (two levels)
```

- **Standalone** (one `--` after `--color`): for a neutral surface (the page,
  a card, a field). For example `--color--ink-subtle`, `--color--border-hover`.
- **Context** (two `--`): a visual environment with its own surface, ink and
  border. For example `--color--danger-soft--surface` with
  `--color--danger-soft--ink`.
- The properties are `surface` (a background), `ink` (a text or an icon),
  `border`, `outline` (a ring outside the border), `fill` (a graphic mark) and
  `track` (the background of a progress bar).

**Variant, not recipe.** A suffix is legal only if it changes one property on
its own: a **variant** that you combine freely (`-hover`, `-active`, `-muted`,
`-subtle`, `-placeholder`, `-secondary`). A treatment that changes the surface
and the ink together is a **recipe**, so it is a context of its own. There
is no `ink-soft` next to `ink`: the soft recipe is a separate `-soft` context.
The force is in the name of the context, never on the property:

- the bare name is the solid recipe, a saturated surface with a light ink
  (`danger`);
- the name with `-soft` is the soft recipe, a tint of the hue as the surface
  and the hue as the ink (`danger-soft`): a pale surface with a deep ink in
  light mode, a deep surface with a light ink in dark mode. The ink of a soft
  context is never white.

**Never cross two contexts on one element.** Inside a context, combine any
surface variant with any ink variant.

**Tone-on-neutral against context ink.** `--color--ink-danger` and
`--color--fill-danger` are for a neutral surface. Inside a toned panel, use
the ink of its context (`--color--danger-soft--ink`).

If no token here has the role that you need, do not use a primitive.

## Surfaces

| Token | Use |
| - | - |
| `--color--surface` | The page |
| `--color--surface-hover` | A row or an item on the page, on hover |
| `--color--surface-raised` | A card, a field, a floating surface (a menu, a dialog, a popover) |
| `--color--surface-raised-hover` | A card or a field, on hover |
| `--color--surface-raised-active` | A card or a field, when it is pressed or active |
| `--color--surface-muted` | A quiet area: the background of a section, a note |

In light mode, the page and the raised surface are both white: the border
separates them. In dark mode, the raised surface is one step above the page.

## Inks

| Token | Use |
| - | - |
| `--color--ink` | The text of the page |
| `--color--ink-subtle` | A label, a description, a secondary text |
| `--color--ink-placeholder` | The placeholder of a field |
| `--color--ink-disabled` | A disabled text or icon |
| `--color--ink-muted` | A graphic ink that is not a text: the track of a switch, a strike line |
| `--color--ink-hover` | A text on hover |
| `--color--ink-link` | A link in a text |
| `--color--ink-primary` | A text or an icon in the brand color on a neutral surface |
| `--color--ink-danger` | A danger text or icon on a neutral surface |
| `--color--ink-warning` | A warning text or icon on a neutral surface |
| `--color--ink-success` | A success text or icon on a neutral surface |

The text ladder goes from `ink` to `ink-subtle` to `ink-placeholder`. The
placeholder is still a text, so it reaches 4.5:1 on the page. `ink-muted`
does not reach the contrast of a text: never use it for a text.

`ink-hover` is darker than the ink in light mode and brighter in dark mode.
`ink-link` is the brand color in light mode and white in dark mode. The tone
inks reach 4.5:1 on a neutral surface.

## Fills

| Token | Use |
| - | - |
| `--color--fill-danger` | A graphic mark of the danger tone on a neutral surface: a dot, the part of a bar over a limit |
| `--color--fill-warning` | A graphic mark of the warning tone on a neutral surface |
| `--color--fill-success` | A graphic mark of the success tone on a neutral surface |

A fill is vivid and reaches 3:1 only, so never use it for a text. Use the
ink of the tone for a text.

## Borders

| Role | Examples | Token |
| - | - | - |
| Structure | The edge of a pane, the line under a toolbar, the hairlines of a section title | `--color--border` |
| Cards | A group of a page, a card list, the frame of a table | `--color--border` |
| Row dividers | The rows of a table or of a settings list, the separators of a menu | `--color--border` |
| Fields | A text input, a select | `--color--border` |
| Hover | The border of a field or of a card, on hover | `--color--border-hover` |
| Small controls | A checkbox, a radio, a switch | `--color--border-control`, `--color--border-control-hover` on hover |
| Floating surfaces | A menu, a dialog, a popover | `--color--border-raised` |

The border is translucent, so it is the same small step above the surface
of its own element: the page, a card or a muted section. A hover border and a
control border are solid, because they must reach a contrast on their own.
A small control must read as a control on its own: the border of a field is
too light for a box of one em.

The ring of a floating surface is stronger than the border, because the
content under it can be a card lighter than the page. A floating surface has
the ring and a shadow composite together. The shadow has no edge of its own.

A card and a field have the same box: the raised surface, the border and the
radius. The shadow tells them apart, and the role decides it, not the look.

- A card holds content that the page shows (a group of a page, a card list, a
  table, a block of a record, a link card, a media card). It rests on the
  page, so it has `--shadow--resting` with its border.
- A field is a control that you operate (you type, pick, toggle or drop in
  it: an input frame, a group of options, an empty slot). It has the border
  alone.

A card that holds the value of a field stays a card (a media card in a
gallery, a link card). The field has no frame around it, so the card rests on
the page.

Inside a frame, nothing has a shadow of its own: a chip in an input frame, a
row in a card list, a block in a block. The body of a block is the page
again: a field or a card in it is raised with the same contrast as on the
page.

## Shadows

| Token | Use |
| - | - |
| `--shadow--floating` | A surface that floats over the content: a menu, a popover |
| `--shadow--lifted` | A dialog, at the maximum elevation |
| `--shadow--ambient` | A glow on all sides, with no vertical offset: a halo, a rim |
| `--shadow--resting` | A card at rest on the page (see "Borders") |

Use only these composites for a `box-shadow`. Do not write an offset and a
blur by hand with a color token.

## Contexts

| Context | Properties | Use |
| - | - | - |
| `primary` | `surface`, `surface-hover`, `surface-active`, `surface-muted`, `surface-secondary`, `ink`, `border` | A solid brand surface: a primary button, a badge, the navigation bar. `surface-secondary` is a quieter solid brand surface with the same white ink |
| `primary-soft` | `surface`, `surface-hover`, `surface-active`, `ink`, `border` | A soft brand panel: a pale brand surface with a saturated brand ink |
| `primary-inverse` | `surface`, `surface-hover`, `surface-active`, `ink` | A control on a solid brand surface (the main action of a floating bar). It is white with a dark ink in both color schemes: it is the inverse of `primary`, not of the color scheme |
| `selected` | `surface`, `surface-hover`, `surface-active`, `ink`, `border` | A selected row, an active item, a selected text (`::selection`). `surface-active` is a ghost button on a selected row, on hover |
| `disabled-field` | `surface`, `ink`, `ink-placeholder`, `fill` | A disabled field: a text input, a select, an editor, a group of options, a link card or an asset card. `fill` is the fill of a checked checkbox, radio or switch |
| `danger` | `surface`, `ink` | A destructive action button: a solid red surface with a white ink |
| `focus` | `border`, `outline` | A focus ring |
| `danger-soft` | `surface`, `ink`, `border`, `outline` | A soft red panel: a validation error, a destructive notice |
| `warning-soft` | `surface`, `ink`, `border`, `outline` | A soft amber panel: a warning. In dark mode it is yellow, because a dark amber is brown |
| `success-soft` | `surface`, `ink`, `border`, `outline` | A soft green panel: a success confirmation |
| `highlight` | `surface` | An inline highlight in a rich text |
| `status-draft` | `ink` | The draft badge of the publishing workflow |
| `status-outdated` | `ink` | The outdated badge of the publishing workflow |
| `status-published` | `ink`, `fill`, `outline` | The published badge of the publishing workflow |
| `diff-added` | `surface`, `outline`, `ink`, `ink-subtle` | Added content in a version diff (green) |
| `diff-removed` | `surface`, `outline`, `ink`, `ink-subtle` | Removed content in a version diff (red) |
| `diff-changed` | `surface`, `outline` | Changed content in a version diff (blue) |
| `progress` | `track`, `fill`, `fill-hover` | A progress bar |
| `backdrop` | `surface`, `ink` | The full-screen scrim behind a modal or a dialog |
| `overlay` | `surface`, `surface-hover`, `surface-active`, `ink` | A fixed or floating element over content: a loader, a progress scrim |
| `tooltip` | `surface`, `surface-hover`, `ink`, `ink-subtle` | A small dark floating label: a toolbar tip, a keyboard hint |
| `code` | `surface`, `ink` | A code block: a log output, an error trace |
| `scrollbar` | `fill` | The thumb of a native scrollbar |
| `field-group-{text,rich-text,media,datetime,number,boolean,location,color,seo,reference,json}` | `surface`, `ink` | The icon chip of a group of field types |

The signal tones have fixed hues. The root name has the meaning and `-soft`
is the soft recipe. A solid `warning` or `success` context does not exist:
the names are kept for amber or green buttons.

A disabled field stays readable: its surface is a quiet tint, its ink is one
step lighter than the ink of the page, and its placeholder still reads as
empty. Its `fill` is a neutral color, not the brand, and the mark on it uses
the surface of the context. A disabled button has no tokens: it keeps the
colors of its variant and fades (`--disabled-opacity`).

The properties of a diff:

| Property | Use |
| - | - |
| `surface` | The background of an inline text run, the faintest tint |
| `outline` | The border of a changed value, a visible ring |
| `ink-subtle` | The left border of a rule that did not change recently |
| `ink` | The left border of a rule that changed recently, more vivid |

`diff-changed` has no ink: the left border of a rule is always green or red,
never blue.

The colors of `code` are the same as the Prism theme of the code blocks of the
structured text editor of DatoCMS. The `field-group-*` colors have fixed hues:
they do not follow the brand.

## Tokens

- **Standalone**: `--color--border`, `--color--border-hover`, `--color--border-raised`, `--color--border-control`, `--color--border-control-hover`, `--color--fill-danger`, `--color--fill-success`, `--color--fill-warning`, `--color--ink`, `--color--ink-danger`, `--color--ink-disabled`, `--color--ink-hover`, `--color--ink-link`, `--color--ink-muted`, `--color--ink-placeholder`, `--color--ink-primary`, `--color--ink-subtle`, `--color--ink-success`, `--color--ink-warning`, `--color--surface`, `--color--surface-hover`, `--color--surface-muted`, `--color--surface-raised-active`, `--color--surface-raised-hover`, `--color--surface-raised`
- **Context: primary**: `--color--primary--surface`, `--color--primary--surface-hover`, `--color--primary--surface-active`, `--color--primary--surface-muted`, `--color--primary--surface-secondary`, `--color--primary--ink`, `--color--primary--border`
- **Context: primary-soft**: `--color--primary-soft--surface`, `--color--primary-soft--surface-hover`, `--color--primary-soft--surface-active`, `--color--primary-soft--ink`, `--color--primary-soft--border`
- **Context: primary-inverse**: `--color--primary-inverse--surface`, `--color--primary-inverse--surface-hover`, `--color--primary-inverse--surface-active`, `--color--primary-inverse--ink`
- **Context: selected**: `--color--selected--surface`, `--color--selected--surface-hover`, `--color--selected--surface-active`, `--color--selected--ink`, `--color--selected--border`
- **Context: disabled-field**: `--color--disabled-field--surface`, `--color--disabled-field--ink`, `--color--disabled-field--ink-placeholder`, `--color--disabled-field--fill`
- **Context: danger**: `--color--danger--surface`, `--color--danger--ink`
- **Context: focus**: `--color--focus--border`, `--color--focus--outline`
- **Context: danger-soft**: `--color--danger-soft--ink`, `--color--danger-soft--border`, `--color--danger-soft--outline`, `--color--danger-soft--surface`
- **Context: warning-soft**: `--color--warning-soft--ink`, `--color--warning-soft--border`, `--color--warning-soft--outline`, `--color--warning-soft--surface`
- **Context: success-soft**: `--color--success-soft--ink`, `--color--success-soft--border`, `--color--success-soft--outline`, `--color--success-soft--surface`
- **Context: highlight**: `--color--highlight--surface`
- **Context: diff-added**: `--color--diff-added--ink-subtle`, `--color--diff-added--ink`, `--color--diff-added--outline`, `--color--diff-added--surface`
- **Context: diff-changed**: `--color--diff-changed--outline`, `--color--diff-changed--surface`
- **Context: diff-removed**: `--color--diff-removed--ink-subtle`, `--color--diff-removed--ink`, `--color--diff-removed--outline`, `--color--diff-removed--surface`
- **Context: status-draft**: `--color--status-draft--ink`
- **Context: status-outdated**: `--color--status-outdated--ink`
- **Context: status-published**: `--color--status-published--ink`, `--color--status-published--fill`, `--color--status-published--outline`
- **Context: backdrop**: `--color--backdrop--surface`, `--color--backdrop--ink`
- **Context: overlay**: `--color--overlay--surface`, `--color--overlay--surface-hover`, `--color--overlay--surface-active`, `--color--overlay--ink`
- **Context: progress**: `--color--progress--track`, `--color--progress--fill`, `--color--progress--fill-hover`
- **Context: tooltip**: `--color--tooltip--surface`, `--color--tooltip--surface-hover`, `--color--tooltip--ink`, `--color--tooltip--ink-subtle`
- **Context: code**: `--color--code--surface`, `--color--code--ink`
- **Context: scrollbar**: `--color--scrollbar--fill`
- **Context: field-group-text**: `--color--field-group-text--ink`, `--color--field-group-text--surface`
- **Context: field-group-rich-text**: `--color--field-group-rich-text--ink`, `--color--field-group-rich-text--surface`
- **Context: field-group-media**: `--color--field-group-media--ink`, `--color--field-group-media--surface`
- **Context: field-group-datetime**: `--color--field-group-datetime--ink`, `--color--field-group-datetime--surface`
- **Context: field-group-number**: `--color--field-group-number--ink`, `--color--field-group-number--surface`
- **Context: field-group-boolean**: `--color--field-group-boolean--ink`, `--color--field-group-boolean--surface`
- **Context: field-group-location**: `--color--field-group-location--ink`, `--color--field-group-location--surface`
- **Context: field-group-color**: `--color--field-group-color--ink`, `--color--field-group-color--surface`
- **Context: field-group-seo**: `--color--field-group-seo--ink`, `--color--field-group-seo--surface`
- **Context: field-group-reference**: `--color--field-group-reference--ink`, `--color--field-group-reference--surface`
- **Context: field-group-json**: `--color--field-group-json--ink`, `--color--field-group-json--surface`
- **Shadows**: `--shadow--floating`, `--shadow--lifted`, `--shadow--ambient`, `--shadow--resting`
