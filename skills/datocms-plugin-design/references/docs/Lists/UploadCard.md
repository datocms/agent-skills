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

