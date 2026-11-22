# FramedImage

A screenshot or an animation that explains the fields near it. It has a
frame and a caption. A click opens the image at full size in a dialog. It
does not zoom on hover.

It fills the width of its container, up to 300px. Put it in a narrower column
to make it smaller. It has no margin, so its container gives the space around
it (for example `space--bottom-2` before the fields of a form).

| Use | For |
| - | - |
| `FramedImage` | A screenshot or a GIF that explains a form. |
| [`MediaCard`](https://react-ui.datocms.com/Lists/MediaCard.md) | A file of the project, with actions and a selection. |

```tsx
import FramedImage from 'datocms-react-ui/FramedImage';
import React from 'react';

const SMALL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360"><rect width="600" height="360" fill="#f4f6fa"/><rect x="0" y="0" width="600" height="40" fill="#dbe2ee"/><rect x="40" y="90" width="320" height="24" rx="4" fill="#b9c4d6"/><rect x="40" y="140" width="480" height="14" rx="4" fill="#dbe2ee"/><rect x="40" y="170" width="440" height="14" rx="4" fill="#dbe2ee"/><rect x="40" y="260" width="120" height="36" rx="6" fill="#6f84a8"/></svg>',
)}`;

export default function Screenshot() {
  return (
    <FramedImage
      src={SMALL}
      alt="The webhook form of GitLab"
      caption="Add the URL and the secret token in the webhook form."
    />
  );
}
```

## Large version

When the image in the frame is a small crop, give `largeSrc`. The dialog
shows it at full size. The caption can have a link.

```tsx
import FramedImage from 'datocms-react-ui/FramedImage';
import React from 'react';

const svg = (width: number, height: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#f4f6fa"/><rect width="${width}" height="${height / 9}" fill="#dbe2ee"/><rect x="${width / 12}" y="${height / 4}" width="${width / 2}" height="${height / 15}" rx="4" fill="#b9c4d6"/><rect x="${width / 12}" y="${height / 2}" width="${(width * 4) / 5}" height="${height / 25}" rx="4" fill="#dbe2ee"/></svg>`,
  )}`;

export default function Large() {
  return (
    <FramedImage
      src={svg(600, 360)}
      largeSrc={svg(1800, 1080)}
      alt="The website of the Marketing template"
      caption={<a href="#preview">Live preview of the website</a>}
    />
  );
}
```

**Do:** Write a short caption on one line.

```tsx
<FramedImage src={placeholder} alt="Example" caption="Copy the token from the settings page." />
```

**Don’t:** Do not write a long caption, because it wraps badly under a narrow frame.

```tsx
<FramedImage src={placeholder} alt="Example" caption="Open the settings page of your repository, find the section about webhooks, and then copy the token that GitLab shows to you." />
```

