## Props

### ButtonTrigger

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `tone` | `Extract<ButtonTone, 'soft' \| 'ghost' \| 'primary'>` | No | `"soft"` | The look of the button |
| `size` | `ButtonSize` | No | | The default size: "milli" in a toolbar, "small" out of a toolbar (see useButtonSize) |
| `expand` | `boolean` | No | | The button fills the width of its container |
| `disabled` | `Disabled` | No | | The menu cannot open. Give a reason when the user must know why. It replaces the tooltip. |
| `tooltip` | `Message \| false \| null \| ActionTooltipOptions` | No | | The tooltip of the button (the label for an icon-only button), or the name and the keys of an action (see Button). It does not show while the menu is open: the menu is in its place. |
| `className` | `string` | No | | Only for the position of the button, not for its look |
| `label` | `Message \| TextMessage` | Yes | | WithLabel: The text of the button<br>IconOnly: The accessible name of the button and the text of its tooltip |
| `icon` | `SvgIcon` | No | | The icon before the label |
| `iconOnly` | `boolean` | No | | Shows only the icon |

### IconTrigger

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `icon` | `SvgIcon` | Yes | | The icon. For a menu of actions, it is Generic.ActionToggleIcon (⋮). |
| `label` | `TextMessage` | No | | The accessible name of the button and the text of its tooltip. If you do not give a label, the button gets the generic name "Actions" and no tooltip, because "Actions" says nothing that the "⋮" does not say. |
| `size` | `ButtonSize` | No | | The default size in a toolbar, "micro" outside a toolbar |
| `disabled` | `Disabled` | No | | The menu cannot open. Give a reason when the user must know why. It replaces the tooltip. |
| `className` | `string` | No | | Only for the position or the surface of the button (for example on a media card) |

### TextualTrigger

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `icon` | `SvgIcon` | No | | The icon before the label |
| `label` | `Message` | No | | The text of the trigger |

### PillTrigger

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` | `Message` | Yes | | The value that shows in the pill |
| `tone` | `PillTone` | No | | The color of the pill (see Pill) |
| `icon` | `React.ReactNode` | No | | An icon before the value, as the `icon` of Pill |
| `triggerClassName` | `string` | No | | A class that changes the look of the pill in a context (for example the target of a rule, with the shape of the verdict at its side) |

### DropdownTriggerButton

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `open` | `boolean` | Yes | | The menu is open. Dropdown gives it. |
| `onTrigger` | `(event: SyntheticEvent) => void` | Yes | | Opens or closes the menu. Dropdown gives it. |
| `disabled` | `Disabled` | No | | The menu cannot open. With a reason, the button keeps the focus and its tooltip says why. |

Also accepts:

- all of `AriaAttributes`
- `form`, `formAction`, `formEncType`, `formMethod`, `formNoValidate`, `formTarget`, `name`, `value` (from `ButtonHTMLAttributes`)
- all of `DOMAttributes`
- all of `HTMLAttributes`
