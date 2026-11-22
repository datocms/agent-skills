# MediaCard

A card for a file or a video: the media, then a caption. On hover it shows
the actions on the media and a ⋮ menu. It does not load or draw the media: the
children do. Wrap it in your own component for a type of media.

| Use | For |
| - | - |
| `MediaCard` | A file, an image or a video in a grid or in a gallery field. |
| [`CardList`](https://react-ui.datocms.com/Lists/CardList.md) | A list of items of data that are not media. |
| [`FramedImage`](https://react-ui.datocms.com/Content/FramedImage.md) | An image that explains a form. It is not a card of data. |

```tsx
import MediaCard from 'datocms-react-ui/MediaCard';
import React, { useState } from 'react';
import { EditMediaIcon } from '@/icons';

const IMAGE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#b9c4d6"/><circle cx="130" cy="110" r="40" fill="#e7ecf4"/><path d="M0 300 L140 170 L240 250 L320 190 L400 270 V300 Z" fill="#6f84a8"/></svg>',
)}`;

const ASSETS = ['cover.jpg', 'team-photo.jpg', 'logo.png'];

export default function Assets() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 200px)',
        gap: 'var(--spacing-l)',
      }}
    >
      {ASSETS.map((name) => (
        <MediaCard
          key={name}
          caption={{ text: name }}
          selection={{
            selected: selected === name,
            onSelect: () => setSelected(selected === name ? null : name),
          }}
          actions={[{ label: 'Edit', icon: EditMediaIcon, onClick: () => {} }]}
          options={[
            { label: 'Details', onClick: () => {} },
            { label: 'Delete', alert: true, onClick: () => {} },
          ]}
        >
          <img
            src={IMAGE}
            alt=""
            style={{ display: 'block', width: '100%', aspectRatio: '4 / 3' }}
          />
        </MediaCard>
      ))}
    </div>
  );
}
```

## Open

Give `to` when the card opens a page of DatoCMS. The media is a link, so the
user can open the page in a new tab. Give `onClick` for another action.

## Selection

Give `selection` when the user can select the card. `selected` gives the
selected border and caption, and a click on the caption calls `onSelect`.
Without `to` and `onClick`, a click on the media calls it too (the asset
picker with one asset). Without `onSelect`, the card shows the selection,
but the user cannot change it.

With `selection.checkbox` the caption shows a checkbox, instead of
`captionAction`:

- `"hover"` shows it on hover, on focus, on a selected card and on a touch
  screen.
- `"always"` shows it in all cases (the Media area gives it when the user has
  selected an asset).

The caption is the name of the checkbox, so a screen reader says "cover.jpg,
checkbox, checked", and Space selects the card.

```tsx
import MediaCard from 'datocms-react-ui/MediaCard';
import React, { useState } from 'react';

const IMAGE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#c9d6c0"/><path d="M0 300 L120 180 L220 260 L300 200 L400 280 V300 Z" fill="#7d9a6e"/></svg>',
)}`;

export default function Checkbox() {
  const [selected, setSelected] = useState(false);

  return (
    <div style={{ width: 200 }}>
      <MediaCard
        caption={{ text: 'landscape.jpg' }}
        selection={{
          selected,
          onSelect: () => setSelected(!selected),
          checkbox: 'hover',
        }}
      >
        <img
          src={IMAGE}
          alt=""
          style={{ display: 'block', width: '100%', aspectRatio: '4 / 3' }}
        />
      </MediaCard>
    </div>
  );
}
```

## Disabled

`disabled` gives the card the surface of a disabled field. `caption.muted`
shows the caption in the subtle ink.

```tsx
import MediaCard from 'datocms-react-ui/MediaCard';
import React from 'react';

const IMAGE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225"><rect width="400" height="225" fill="#d6c9bd"/><path d="M0 225 L100 120 L200 190 L290 140 L400 210 V225 Z" fill="#a8896f"/></svg>',
)}`;

export default function Disabled() {
  return (
    <div style={{ width: 240 }}>
      <MediaCard caption={{ text: 'Intro video', muted: true }} disabled>
        <img
          src={IMAGE}
          alt=""
          style={{ display: 'block', width: '100%', aspectRatio: '16 / 9' }}
        />
      </MediaCard>
    </div>
  );
}
```

## Accessibility

The link or the button covers the media, and the caption is its name. So a
keyboard user reaches the card with Tab, and the card shows the focus ring.
The ⋮ menu and the actions stay separate buttons, because a control cannot
contain a control.

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
