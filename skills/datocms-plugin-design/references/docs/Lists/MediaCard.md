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

