## Props

### MediaCard

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `draggable` | `boolean` | No | | The user can drag the card: it gets the move cursor and a hover border. The drag logic is outside the card. |
| `dragging` | `boolean` | No | | The card is the one that the user drags: it fades. |
| `compact` | `boolean` | No | | A small card, for example in a gallery with many items. The actions on the media are in a column. |
| `disabled` | `boolean` | No | | The card is in a disabled field: it gets the surface of a disabled field. |
| `caption` | `MediaCardCaption` | No | | The text below the media, on one line with an ellipsis. |
| `options` | `MediaCardOption[]` | No | | The options of the ⋮ menu at the top right of the card. For example "Details", "Move to collection" (a submenu) and a red "Delete". |
| `actions` | `MediaCardAction[]` | No | | The buttons on the media. They show when the pointer is on the card. A touch screen shows them in the ⋮ menu. A disabled action is removed. |
| `children` | `React.ReactNode` | No | | The media: an image, a video preview or a player. |
| `to` (variant) | `string` | No | | The page that the card opens. The media is a link, so the user can open the page in a new tab. |
| `onClick` (variant) | `(e: React.MouseEvent) => void` | No | | Runs when the user clicks the media or the caption. |
| `selection` | `MediaCardSelection & { checkbox: 'hover' \| 'always'; } \| MediaCardSelection & { checkbox?: never }` | No | | |
| `captionAction` (variant) | `React.ReactNode` | No | | An action on the right of the caption, for example the cross that cancels an upload. |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

Group 1

| Variant | Props | Description |
| - | - | - |
| `LinkCard` | `to` | A click on the media opens a page of DatoCMS. |
| `ClickCard` | `onClick` | A click on the media runs `onClick`. |
| `StaticCard` | | The media has no action of its own. |

Group 2

| Variant | Props | Description |
| - | - | - |
| `CheckboxCaption` | `selection` | The caption has a checkbox, so it has no `captionAction`. |
| `PlainCaption` | `selection`, `captionAction` | The caption has no checkbox. |

#### Types

`MediaCardCaption` — The text below the media, on one line with an ellipsis

```ts
export type MediaCardCaption = {
  /** The text of the caption */
  text: Message;
  /**
   * The caption shows in the subtle ink, for example when the asset has no
   * title of its own.
   */
  muted?: boolean;
};
```

`MediaCardOption` — An option of the ⋮ menu.

```ts
export type MediaCardOption = MediaCardOptionBase &
  (
    | {
        /** Runs when the user picks the option. */
        onClick: (e: React.MouseEvent) => void;
        submenu?: never;
        action?: never;
      }
    | {
        /**
         * The id of an action of the registry (`Actions`). The option
         * runs it and shows its keys.
         */
        action: string;
        onClick?: never;
        submenu?: never;
      }
    | {
        /** The options of the submenu that the option opens. */
        submenu: React.ReactNode;
        onClick?: never;
        action?: never;
      }
  );
```

`MediaCardAction` — A button on the media. It also fits in `options`, as a menu option.

```ts
export type MediaCardAction = {
  /**
   * The key of the action. Give it when the label changes, for example
   * "Play" and "Pause". So the button keeps the keyboard focus.
   */
  id?: string;
  /** The text of the button or of the menu option. */
  label: Message;
  /**
   * An icon before the label, on the media. A menu does not show it,
   * because the other options of the menu have no icon.
   */
  icon?: SvgIcon;
  /** A disabled action is not shown in `actions`. A menu shows it grayed. */
  disabled?: boolean;
  /** Runs when the user picks the action. */
  onClick: (e: React.MouseEvent) => void;
  /** The action is destructive, for example a delete. It shows in red. */
  alert?: boolean;
};
```

`MediaCardSelection` — The user can select the card, for example for the actions on many assets.

```ts
export type MediaCardSelection = {
  /** The card shows the selected border and the selected caption. */
  selected: boolean;
  /**
   * Runs when the user clicks the caption or the checkbox. Without `to` and
   * `onClick`, a click on the media runs it too. Without it, the card shows
   * the selection, but the user cannot change it.
   */
  onSelect?: () => void;
};
```

`MediaCardOptionBase`

```ts
type MediaCardOptionBase = {
  /** The text of the menu option. */
  label: Message;
  /** The option shows grayed and the user cannot pick it. */
  disabled?: boolean;
  /** The option is destructive, for example a delete. It shows in red. */
  alert?: boolean;
};
```

### MediaCardCaption

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `text` | `Message` | Yes | | The text of the caption |
| `muted` | `boolean` | No | | The caption shows in the subtle ink, for example when the asset has no title of its own. |

### MediaCardAction

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | No | | The key of the action. Give it when the label changes, for example "Play" and "Pause". So the button keeps the keyboard focus. |
| `label` | `Message` | Yes | | The text of the button or of the menu option. |
| `icon` | `SvgIcon` | No | | An icon before the label, on the media. A menu does not show it, because the other options of the menu have no icon. |
| `disabled` | `boolean` | No | | A disabled action is not shown in `actions`. A menu shows it grayed. |
| `onClick` | `(e: React.MouseEvent) => void` | Yes | | Runs when the user picks the action. |
| `alert` | `boolean` | No | | The action is destructive, for example a delete. It shows in red. |

### MediaCardOption

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` | `Message` | Yes | | The text of the menu option. |
| `disabled` | `boolean` | No | | The option shows grayed and the user cannot pick it. |
| `alert` | `boolean` | No | | The option is destructive, for example a delete. It shows in red. |
| `onClick` (variant) | `(e: React.MouseEvent) => void` | No | | Runs when the user picks the option. |
| `submenu` (variant) | `React.ReactNode` | No | | The options of the submenu that the option opens. |
| `action` (variant) | `string` | No | | The id of an action of the registry (`Actions`). The option runs it and shows its keys. |

### MediaCardSelection

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `selected` | `boolean` | Yes | | The card shows the selected border and the selected caption. |
| `onSelect` | `() => void` | No | | Runs when the user clicks the caption or the checkbox. Without `to` and `onClick`, a click on the media runs it too. Without it, the card shows the selection, but the user cannot change it. |
