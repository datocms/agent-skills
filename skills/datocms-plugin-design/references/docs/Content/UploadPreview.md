# UploadPreview

The box of the preview of an asset: the asset is in the center, with space
around it. DatoCMS shows it in the cards of the Media Area and of the
gallery field, in the rows of the Media Area, and in the detail of an
asset.

The component has two modes:

- **`upload`**: the preview draws an asset of the Media Area, as DatoCMS
  draws it. Give the asset as `ctx` gives it, or its ID.
- **Box**: you draw the asset in the box, with the parts below. Use it for
  a file that is not an asset yet, for example a file that uploads.

| Part | For |
| - | - |
| `UploadPreview` | The box. Give `link` to make it a link. |
| `UploadPreview.Image` | In the box mode: the image, on the checkerboard that shows through its transparent parts. |
| `UploadPreview.Progress` | In the box mode: the progress of the upload, on the bottom edge of the box. |

Other components for other cases:

- [`UploadCard`](https://react-ui.datocms.com/Lists/UploadCard.md) is for an asset with a caption and actions.
- [`FileTypeIcon`](https://react-ui.datocms.com/Content/FileTypeIcon.md) is only the icon of the format of a file.

## An asset of the Media Area

Give `upload` the asset as `ctx.selectUpload()` or `ctx.loadUploads()`
gives it, or its ID. The preview shows what DatoCMS shows:

- an image at the size of the box, from the image service, with a blurred
  picture while it loads;
- the frame of a video. Give the value of the field in `fieldValue`, as in
  [`UploadCard`](https://react-ui.datocms.com/Lists/UploadCard.md): its `poster_time` changes the frame;
- the waveform of a sound file, with a button that plays it. One sound
  plays at a time on the page;
- the icon of the format for any other file;
- a blank file icon for an asset that does not exist, or for `null`.

An ID loads through the host: [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md) gets the asset with
`ctx.loadUploads`, and the previews of one render go in one call. While the
asset loads, the box is empty. To show many assets of a list, call
`ctx.loadUploads` once for the list and give the assets, as the example of
the next section does.

Give the size of the box in `box`. Without it, the CSS of the container
gives the size, and the preview measures its element. The preview loads the
image only when the box is on the screen.

```tsx
import UploadPreview from 'datocms-react-ui/UploadPreview';
import React from 'react';

const BOX = { width: 160, height: 120 };

// The asset as ctx.selectUpload() or ctx.loadUploads() gives it
const ASSET = {
  id: 'inline',
  attributes: {
    url: `data:image/svg+xml,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#ff7751"/><circle cx="24" cy="24" r="8" fill="#ffffff"/></svg>',
    )}`,
    filename: 'logo.svg',
    format: 'svg',
    size: 210,
    width: 48,
    height: 48,
    mime_type: 'image/svg+xml',
  },
};

export default function UploadPreviewFromAsset() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-l)' }}>
      {/* By ID: an image, a PDF, a sound, and an asset that does not exist */}
      <UploadPreview upload="4001" box={BOX} />
      <UploadPreview upload="4003" box={BOX} />
      <UploadPreview upload="4004" box={BOX} />
      <UploadPreview upload="missing" box={BOX} />
      {/* The entity, with no load */}
      <UploadPreview upload={ASSET} box={BOX} />
    </div>
  );
}
```

## In a list

There is no row of an asset: put an `UploadPreview` in the `image` slot of
an [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md), with zero padding and no background. The file name is the
title. The format and the size are the details: `formatBytes`
(`datocms-react-ui/utils/format`) writes the size as the Media Area writes
it.

```tsx
import type { Upload } from 'datocms-plugin-sdk';
import { useCtx } from 'datocms-react-ui/Canvas';
import EntityRow from 'datocms-react-ui/EntityRow';
import RowList from 'datocms-react-ui/RowList';
import UploadPreview from 'datocms-react-ui/UploadPreview';
import { formatBytes } from 'datocms-react-ui/utils/format';
import React, { useEffect, useState } from 'react';

const UPLOAD_IDS = ['4001', '4003', '4004'];

const IMAGE_BOX = { width: 32, height: 32 };

export default function UploadPreviewInList() {
  const ctx = useCtx();
  const [uploads, setUploads] = useState<Upload[]>([]);

  useEffect(() => {
    // One call for the whole list
    ctx.loadUploads(UPLOAD_IDS).then((result) => {
      setUploads(result.filter((upload): upload is Upload => Boolean(upload)));
    });
  }, [ctx]);

  return (
    <div style={{ width: 340 }}>
      <RowList density="compact">
        {uploads.map((upload) => (
          <RowList.Item key={upload.id}>
            <EntityRow
              layout="row"
              image={
                <UploadPreview
                  upload={upload}
                  box={IMAGE_BOX}
                  padding={[0, 0]}
                  transparent
                />
              }
              title={upload.attributes.filename}
            >
              {`${upload.attributes.format?.toUpperCase()}, ${formatBytes(
                upload.attributes.size,
              )}`}
            </EntityRow>
          </RowList.Item>
        ))}
      </RowList>
    </div>
  );
}
```

## Image

In the box mode, `UploadPreview.Image` gets the real size of the asset and
fits it in the box, less the padding. The image keeps its aspect ratio, and
it does not become larger than its real size. Give `upscale` only for a
vector image (SVG), because a vector image stays sharp when it becomes
larger.

Give `icon` to an image that shows instead of an icon, for example the
poster of a file that has no preview. It always gets space around it, even
in a box with zero padding.

The box mode has no state. It does not load the asset and it does not
measure the box, so give the size of the box in `box`. To fill a box of
variable size, measure it (for example with `useElementLayout`, see
[Hooks](https://react-ui.datocms.com/Foundations/Hooks.md)) and give the size that you get. While `box` is
`null`, the image does not render.

```tsx
import UploadPreview from 'datocms-react-ui/UploadPreview';
import React from 'react';
import { LANDSCAPE, LOGO, PORTRAIT } from './sampleImages';

const BOX = { width: 200, height: 150 };

export default function UploadPreviewImages() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-l)' }}>
      <UploadPreview box={BOX} fixedSize>
        <UploadPreview.Image
          src={LANDSCAPE}
          width={1200}
          height={800}
          alt="Landscape"
        />
      </UploadPreview>
      <UploadPreview box={BOX} fixedSize>
        <UploadPreview.Image
          src={PORTRAIT}
          width={600}
          height={900}
          alt="Portrait"
        />
      </UploadPreview>
      <UploadPreview box={BOX} fixedSize>
        <UploadPreview.Image src={LOGO} width={48} height={48} alt="Logo" />
      </UploadPreview>
      <UploadPreview box={BOX} fixedSize>
        <UploadPreview.Image
          src={LOGO}
          width={48}
          height={48}
          upscale
          alt="Logo, larger"
        />
      </UploadPreview>
    </div>
  );
}
```

## Padding and background

`padding` is the space (vertical, horizontal) between the box and the
image. The default is 10px. `transparent` removes the background of the
box, so the box shows the background of its container. The two modes take
them.

```tsx
import UploadPreview from 'datocms-react-ui/UploadPreview';
import React from 'react';
import { LANDSCAPE } from './sampleImages';

const BOX = { width: 200, height: 150 };

export default function UploadPreviewPadding() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-l)' }}>
      <UploadPreview box={BOX} fixedSize padding={[0, 0]}>
        <UploadPreview.Image
          src={LANDSCAPE}
          width={1200}
          height={800}
          alt="No padding"
        />
      </UploadPreview>
      <UploadPreview box={BOX} fixedSize padding={[20, 20]} transparent>
        <UploadPreview.Image
          src={LANDSCAPE}
          width={1200}
          height={800}
          alt="Transparent box"
        />
      </UploadPreview>
    </div>
  );
}
```

## Upload in progress

`UploadPreview.Progress` shows the bar on the bottom edge of the box. At 0
(the transfer did not start) and at 100 (the server analyses the asset),
the bar has no value. A `label` shows above the bar, for example while a
video encodes.

```tsx
import UploadPreview from 'datocms-react-ui/UploadPreview';
import React from 'react';
import { LANDSCAPE } from './sampleImages';

const BOX = { width: 200, height: 150 };

export default function UploadPreviewProgress() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-l)' }}>
      <UploadPreview box={BOX} fixedSize>
        <UploadPreview.Image
          src={LANDSCAPE}
          width={1200}
          height={800}
          alt="Upload in progress"
        />
        <UploadPreview.Progress percent={40} />
      </UploadPreview>
      <UploadPreview box={BOX} fixedSize>
        <UploadPreview.Image
          src={LANDSCAPE}
          width={1200}
          height={800}
          alt="Upload in progress"
        />
        <UploadPreview.Progress percent={100} />
      </UploadPreview>
      <UploadPreview box={BOX} fixedSize>
        <UploadPreview.Progress percent={0} label="Encoding video..." />
      </UploadPreview>
    </div>
  );
}
```

