## Props

### Button

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `tone` | `ButtonTone` | No | `"soft"` | The look of the button. Toolbar.Button makes "ghost" the default. |
| `size` | `ButtonSize` | No | | The default size: "milli" in a toolbar, "small" out of a toolbar (see useButtonSize) |
| `expand` | `boolean` | No | | The button fills the width of its container |
| `disabled` | `Disabled` | No | | Give a reason when the user must know why the button is disabled |
| `className` | `string` | No | | Only for the position of the button (margin, alignment), not for its look |
| `label` | `Message \| TextMessage` | Yes | | WithLabel: The text of the button<br>IconOnly: The accessible name of the button and the text of its tooltip |
| `icon` | `SvgIcon` | No | | The icon before the label |
| `iconOnly` | `boolean` | No | | Shows only the icon |
| `trailing` (variant) | `ReactNode` | No | | Content after the label (for example a "PRO" pill) |
| `tooltip` | `ActionTooltipOptions \| Message \| TooltipOptions` | No | | The text of the tooltip, when it is not the label (for example the reason why the button is disabled), or the options of the tooltip |
| `busy` (variant) | `boolean` | No | | The action runs: the button shows a spinner instead of the icon (before the label when there is no icon), and it is disabled. An "onClick" that returns a promise sets it automatically. |
| `pressed` (variant) | `boolean` | No | | The state of a toggle button (for example the filter toggle). Only the soft and the ghost tones show it: a toggle is never the main action. |
| `onClick` (variant) | `ClickHandler` | No | | |
| `to` (variant) | `string` | No | | The page of DatoCMS: the path with its query, for example "/editor?tab=x" |
| `href` (variant) | `string` | No | | |
| `submit` (variant) | `true` | No | | |
| `newTab` (variant) | `boolean` | No | | Opens the page in a new tab (for example from a modal, to keep it open)<br>Opens the page in a new tab (for example the docs) |

Also accepts:

- all of `AriaAttributes`
- `onBlur`, `onFocus`, `onKeyDown`, `onMouseDown`, `onMouseEnter`, `onMouseLeave` (from `DOMAttributes`)
- `autoFocus`, `id`, `tabIndex` (from `HTMLAttributes`)

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

`ButtonContent` — What the button shows

| Variant | Props | Description |
| - | - | - |
| `WithLabel` | `label`, `icon`, `trailing`, `tooltip` | A label, with an optional icon before it |
| `IconOnly` | `label`, `icon`, `iconOnly`, `tooltip` | Only the icon. The label is the accessible name of the button, and a tooltip shows it. |

`ButtonAction` — What the button does

| Variant | Props | Description |
| - | - | - |
| `ClickAction` | `busy`, `pressed`, `onClick` | Runs "onClick" |
| `LinkAction` | `to`, `newTab` | A link to a page of DatoCMS |
| `ExternalLinkAction` | `href`, `newTab` | A link to another site |
| `SubmitAction` | `busy`, `pressed`, `submit`, `onClick` | Submits the form of the button. "onClick" is optional: it runs before the submit. |
| `NoAction` | `busy`, `pressed` | No action: the button only shows its tooltip, or it is disabled |

#### Types

`ButtonTone` — "overlay" and "on-primary" are for a colored bar (the navigation bar, a floating bar): "overlay" has a light translucent fill, "on-primary" has a white fill in all the themes, for the main action on a brand color.

```ts
export type ButtonTone =
  | 'soft'
  | 'ghost'
  | 'primary'
  | 'alert'
  | 'ghost-alert'
  | 'overlay'
  | 'on-primary';
```

`ButtonSize` — "regular" is the plain ".button" class, without a size class. "field" has the height of a field (see --control-height).

```ts
export type ButtonSize =
  | 'micro'
  | 'milli'
  | 'small'
  | 'field'
  | 'regular'
  | 'large';
```

`ActionTooltipOptions` — The name and the keys of an action of the registry (`Actions`), in the tooltip. An icon-only button shows its label instead of the name. When the action has no keys or does not exist, the tooltip has no keys: an icon-only button shows its label, and a button with a label shows no tooltip.

```ts
export type ActionTooltipOptions = {
  /** The id of the action */
  action: string;
  /**
   * The tooltip goes below when there is no space above it.
   * @default "top"
   */
  placement?: Placement;
  content?: never;
  long?: never;
};
```

`TooltipOptions` — The tooltip of an icon-only button, with options

```ts
type TooltipOptions =
  /**
   * A text (the label by default). "long" is for a paragraph or a list.
   * With "interactive", the text shows in a HoverCard: the pointer can move
   * into it, and the user can select the text.
   */
  | {
      content?: Message;
      long?: boolean;
      interactive?: boolean;
      placement?: Placement;
      action?: never;
    }
  | ActionTooltipOptions;
```

`ClickHandler` — When the handler returns a promise, the button is busy (a spinner, disabled) until the promise settles.

```ts
type ClickHandler = (event: React.MouseEvent<HTMLButtonElement>) => unknown;
```

### RawButton

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` (variant) | `TextMessage` | No | | The accessible name. When the button shows text, the name must start with that text (WCAG 2.5.3). |
| `ariaLabelledBy` (variant) | `string` | No | | The ids of the visible elements that give the name, with a space between them |
| `pressed` (variant) | `boolean` | No | | A toggle button. True when the toggle is on. |
| `expandable` (variant) | `{ open: boolean; controls?: string; }` | No | | The button opens and closes other content |
| `tab` (variant) | `{ selected: boolean; controls?: string; }` | No | | The button is a tab of a tablist |
| `radio` (variant) | `{ checked: boolean; }` | No | | The button is an option of a radio group |
| `submit` | `true` | No | | The button submits its form. Without it, the button never submits. |
| `disabled` | `boolean \| 'focusable'` | No | | `true` disables the button and removes it from the Tab order. `'focusable'` keeps the button in the Tab order and says to a screen reader that it is disabled (`aria-disabled`). The click does nothing. Use it when the user must find out why the button is disabled. |
| `haspopup` | `'menu' \| 'listbox' \| 'dialog'` | No | | The kind of popup that the button opens |
| `current` | `'page' \| 'true'` | No | | The button is the current element of a set of elements |
| `ariaHidden` | `React.AriaAttributes['aria-hidden']` | No | | The same as `aria-hidden` |

Also accepts:

- all of `AriaAttributes`
- `form`, `formAction`, `formEncType`, `formMethod`, `formNoValidate`, `formTarget`, `name`, `value` (from `ButtonHTMLAttributes`)
- all of `DOMAttributes`
- all of `HTMLAttributes`
