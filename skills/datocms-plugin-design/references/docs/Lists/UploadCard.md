# UploadCard

The card of an asset, as DatoCMS shows it in the media area and in the
gallery field of a record. It is a [`MediaCard`](https://react-ui.datocms.com/Lists/MediaCard.md) with the parts of an asset:
the caption from the metadata, the progress of the upload and the badge of
the antivirus.

The component has two modes:

- **`upload`**: the card shows an asset of the Media Area, as DatoCMS shows
  it. Give the asset as `ctx` gives it, or its ID.
- **Preview**: you give the preview as the children, usually an
  [`UploadPreview`](https://react-ui.datocms.com/Content/UploadPreview.md), and the caption. Use it for a file that uploads. Give
  `link` to the [`UploadPreview`](https://react-ui.datocms.com/Content/UploadPreview.md) to make the preview a link to the file.

```tsx
import UploadCard, { uploadCaption } from 'datocms-react-ui/UploadCard';
import UploadPreview from 'datocms-react-ui/UploadPreview';
import React, { useState } from 'react';
import { EditMediaIcon } from '@/icons';
import {
  LANDSCAPE,
  LOGO,
  PORTRAIT,
} from '../../../Content/UploadPreview/examples/sampleImages';

// The UploadPreview of a card is 200px high. The cards of this example are
// 220px wide.
const BOX = { width: 220, height: 200 };

const ASSETS = [
  {
    id: 'cover',
    src: LANDSCAPE,
    width: 1200,
    height: 800,
    metadata: { title: 'The cover', defaultTitle: 'Cover' },
  },
  {
    id: 'portrait',
    src: PORTRAIT,
    width: 600,
    height: 900,
    metadata: { alt: 'A portrait of the team' },
  },
  { id: 'logo', src: LOGO, width: 48, height: 48, metadata: {} },
];

export default function UploadCardAssets() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 220px)',
        gap: 'var(--spacing-l)',
      }}
    >
      {ASSETS.map((asset) => {
        return (
          <UploadCard
            key={asset.id}
            caption={uploadCaption(asset.metadata)}
            selection={{
              selected: selected === asset.id,
              onSelect: () =>
                setSelected(selected === asset.id ? null : asset.id),
            }}
            actions={[
              { label: 'Edit', icon: EditMediaIcon, onClick: () => {} },
            ]}
          >
            <UploadPreview box={BOX}>
              <UploadPreview.Image
                src={asset.src}
                width={asset.width}
                height={asset.height}
              />
            </UploadPreview>
          </UploadCard>
        );
      })}
    </div>
  );
}
```

## An asset of the Media Area

Give `upload` the asset as `ctx.selectUpload()` or `ctx.loadUploads()`
gives it, its ID, or `null` for an asset that does not exist. The card
gets everything from the asset: the preview (see [`UploadPreview`](https://react-ui.datocms.com/Content/UploadPreview.md) with
`upload`), the caption, the badge of the antivirus, and a play action for
a sound file. The play action is in `actions`, or in `options` when the
card is `compact`.

The caption is the caption of the gallery field of DatoCMS
(`uploadCardCaption`): the title and the alternate text of `fieldValue`,
the value of the file or gallery field that holds the asset, then the
default metadata of the asset in `preferredLocale`, then in the main locale
of the project. [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md) gives the main locale. Outside a [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md), give it
to `uploadCardCaption` in `mainLocale`. `fieldValue.poster_time` gives the
frame of a video, as in [`UploadPreview`](https://react-ui.datocms.com/Content/UploadPreview.md). Give `caption` to show another text, or `null` to show
no caption. While an ID loads, the caption says that the asset loads. An
ID that does not exist shows "Asset #" and the ID.

Give the size of the preview in `box`, and its padding in `padding`, as in
[`UploadPreview`](https://react-ui.datocms.com/Content/UploadPreview.md).

```tsx
import UploadCard from 'datocms-react-ui/UploadCard';
import React from 'react';
import { EditMediaIcon } from '@/icons';

// The UploadPreview of a card is 200px high. The cards of this example are
// 220px wide.
const BOX = { width: 220, height: 200 };

export default function UploadCardFromAsset() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 220px)',
        gap: 'var(--spacing-l)',
      }}
    >
      {/* The title of the value of the field comes first */}
      <UploadCard
        upload="4001"
        box={BOX}
        fieldValue={{ title: 'Summer cover', alt: null }}
        actions={[{ label: 'Edit', icon: EditMediaIcon, onClick: () => {} }]}
      />
      {/* The asset has no Italian alternate text: the caption uses English */}
      <UploadCard upload="4002" box={BOX} preferredLocale="it" />
      <UploadCard upload="4003" box={BOX} />
      {/* A sound file gets a play action */}
      <UploadCard upload="4004" box={BOX} />
      <UploadCard upload="missing" box={BOX} />
    </div>
  );
}
```

## Caption

`uploadCaption` gives the caption from the metadata of the asset: the first
of the title, the alternate text, the default alternate text, the default
title and the file name, else "No metadata set". Give its result to
`caption` as it is. The caption is `muted` (in the subtle ink) when the
metadata has no `title` or no `defaultTitle`.

## Upload in progress

Give `progress` while the asset uploads. The caption shows in the subtle
ink. When you give no `caption`, the card shows the percent in its position,
then the analysis of the server. With `onCancel`, the caption shows a cancel button while the
transfer is in progress. The preview shows the bar.

`threatDetected` shows the badge of the antivirus on the preview. In a
narrow card, the badge shows only the icon.

Click the cross to cancel the first upload.

```tsx
import UploadCard from 'datocms-react-ui/UploadCard';
import UploadPreview from 'datocms-react-ui/UploadPreview';
import React, { useState } from 'react';
import { LANDSCAPE } from '../../../Content/UploadPreview/examples/sampleImages';

const BOX = { width: 220, height: 200 };

export default function UploadCardUpload() {
  const [cancelled, setCancelled] = useState(false);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 220px)',
        gap: 'var(--spacing-l)',
      }}
    >
      {!cancelled && (
        <UploadCard
          progress={{ percent: 40, onCancel: () => setCancelled(true) }}
        >
          <UploadPreview box={BOX}>
            <UploadPreview.Image src={LANDSCAPE} width={1200} height={800} />
            <UploadPreview.Progress percent={40} />
          </UploadPreview>
        </UploadCard>
      )}
      <UploadCard progress={{ percent: 100 }}>
        <UploadPreview box={BOX}>
          <UploadPreview.Image src={LANDSCAPE} width={1200} height={800} />
          <UploadPreview.Progress percent={100} />
        </UploadPreview>
      </UploadCard>
      <UploadCard caption={{ text: 'invoice.pdf', muted: true }} threatDetected>
        <UploadPreview box={BOX} />
      </UploadCard>
    </div>
  );
}
```

## Props

### UploadCard with upload

The other props are the props of a [`MediaCard`](https://react-ui.datocms.com/Lists/MediaCard.md).

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `disabled` | `boolean` | No | | The card is in a disabled field: it gets the surface of a disabled field. |
| `draggable` | `boolean` | No | | The user can drag the card: it gets the move cursor and a hover border. The drag logic is outside the card. |
| `onClick` (variant) | `(e: React.MouseEvent) => void` | No | | Runs when the user clicks the media or the caption. |
| `options` | `MediaCardOption[]` | No | | The options of the ⋮ menu at the top right of the card. For example "Details", "Move to collection" (a submenu) and a red "Delete". |
| `to` (variant) | `string` | No | | The page that the card opens. The media is a link, so the user can open the page in a new tab. |
| `dragging` | `boolean` | No | | The card is the one that the user drags: it fades. |
| `compact` | `boolean` | No | | A small card, for example in a gallery with many items. The actions on the media are in a column. |
| `actions` | `MediaCardAction[]` | No | | The buttons on the media. They show when the pointer is on the card. A touch screen shows them in the ⋮ menu. A disabled action is removed. |
| `selection` | `MediaCardSelection & { checkbox: 'hover' \| 'always'; } \| MediaCardSelection & { checkbox?: never }` | No | | |
| `upload` | `string \| UploadPreviewUpload \| null` | Yes | | The asset as `ctx` gives it, or its ID. An ID loads through the provider of the host: `Canvas` mounts it. `null` is an asset that does not exist: the preview shows a blank file icon. |
| `preferredLocale` | `string` | No | | The locale of the default metadata of the asset, for the caption, for example the locale of the field. When it has no value, the caption uses the main locale of the project, which the provider of the host gives. |
| `fieldValue` | `UploadFieldValue` | No | | The value of the field that holds the asset. Its title and alternate text come before the default metadata of the asset, and its `poster_time` gives the frame of a video. |
| `caption` | `MediaCardCaption \| null` | No | | The text below the preview. Without it, the card computes it with `uploadCardCaption`. `null` shows no caption. |
| `box` | `BoxSize` | No | | The size of the preview, in px. Without it, the CSS gives the size. |
| `padding` | `UploadPreviewPadding` | No | | The space around the asset in the preview, as in `UploadPreview`. |
| `link` | `{ href: string; target?: string }` | No | | The preview is a link. |

### UploadCard, preview mode

The other props are the props of a [`MediaCard`](https://react-ui.datocms.com/Lists/MediaCard.md).

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `disabled` | `boolean` | No | | The card is in a disabled field: it gets the surface of a disabled field. |
| `draggable` | `boolean` | No | | The user can drag the card: it gets the move cursor and a hover border. The drag logic is outside the card. |
| `onClick` (variant) | `(e: React.MouseEvent) => void` | No | | Runs when the user clicks the media or the caption. |
| `options` | `MediaCardOption[]` | No | | The options of the ⋮ menu at the top right of the card. For example "Details", "Move to collection" (a submenu) and a red "Delete". |
| `to` (variant) | `string` | No | | The page that the card opens. The media is a link, so the user can open the page in a new tab. |
| `dragging` | `boolean` | No | | The card is the one that the user drags: it fades. |
| `compact` | `boolean` | No | | A small card, for example in a gallery with many items. The actions on the media are in a column. |
| `actions` | `MediaCardAction[]` | No | | The buttons on the media. They show when the pointer is on the card. A touch screen shows them in the ⋮ menu. A disabled action is removed. |
| `selection` | `MediaCardSelection & { checkbox: 'hover' \| 'always'; } \| MediaCardSelection & { checkbox?: never }` | No | | |
| `children` | `ReactNode` | Yes | | The preview of the asset, an `UploadPreview` |
| `caption` | `MediaCardCaption` | No | | The text below the preview. Use `uploadCaption` to get it from the metadata of the asset. |
| `progress` | `UploadCardProgress` | No | | The asset uploads. The caption shows in the subtle ink. Without a caption, the caption shows the percent or the analysis. |
| `threatDetected` | `boolean` | No | | The antivirus found a threat in the file: the card shows a badge. |

#### Types

`UploadCardProgress` — The upload of the asset, while it is in progress

```ts
export type UploadCardProgress = {
  /**
   * The uploaded part, from 0 to 100. At 100 the server analyses the
   * asset.
   */
  percent: number;
  /**
   * Cancels the upload. With it, the caption shows a cancel button while
   * the transfer is in progress. A card with a checkbox has no cancel
   * button.
   */
  onCancel?: (event: React.MouseEvent) => void;
};
```

### UploadCardProgress

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `percent` | `number` | Yes | | The uploaded part, from 0 to 100. At 100 the server analyses the asset. |
| `onCancel` | `(event: React.MouseEvent) => void` | No | | Cancels the upload. With it, the caption shows a cancel button while the transfer is in progress. A card with a checkbox has no cancel button. |

### uploadCaption

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `title` | `string \| null` | No | | The title of the asset in the record |
| `alt` | `string \| null` | No | | The alternate text of the asset in the record |
| `defaultTitle` | `string \| null` | No | | The default title of the asset, in the media area |
| `defaultAlt` | `string \| null` | No | | The default alternate text of the asset, in the media area |
| `filename` | `string \| null` | No | | The name of the file. Give it only when it is the best name (audio). |
