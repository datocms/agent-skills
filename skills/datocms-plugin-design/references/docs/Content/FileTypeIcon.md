# FileTypeIcon

The icon of a file that has no preview, for example a PDF in the media
area or the file of a track of a video. The extension shows on a color,
and each extension always gets the same color. Without `extension`, the
icon is blank.

The icon takes its size from its `style` or `className`, so give it a width.

```tsx
import FileTypeIcon from 'datocms-react-ui/FileTypeIcon';
import React from 'react';

const EXTENSIONS = ['pdf', 'vtt', 'mp3', 'docx', undefined];

export default function Formats() {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-l)' }}>
      {EXTENSIONS.map((extension) => (
        <FileTypeIcon
          key={extension ?? 'none'}
          extension={extension}
          style={{ width: 45, height: 'auto' }}
        />
      ))}
    </div>
  );
}
```

## Props

### FileTypeIcon

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `extension` | `string` | No | | The extension of the file, for example "vtt". Without it, the icon is blank. |
| `style` | `React.CSSProperties` | No | | |
| `className` | `string` | No | | |
