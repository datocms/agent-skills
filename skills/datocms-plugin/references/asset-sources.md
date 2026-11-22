# Asset Sources Reference

Asset sources add custom upload sources to the DatoCMS Media Area. When a user clicks "Upload" in the Media Area, they see the custom source alongside the default upload options.

## Contents

- Declaration: `assetSources`
- Render: `renderAssetSource`
- Complete Asset Source Example
- Key Notes

## Declaration: `assetSources`

```ts
assetSources(ctx: AssetSourcesCtx): AssetSource[] | undefined
```

### `AssetSource` shape

```ts
{
  id: string;              // Unique ID — passed to renderAssetSource
  name: string;            // Display name shown to the user
  icon: Icon;              // icon name or SVG definition; see sdk-connect-and-frames.md#icon-names
  modal?: {
    width?: 's' | 'm' | 'l' | 'xl' | number; // Modal width
    initialHeight?: number; // Initial iframe height
  };
}
```

## Render: `renderAssetSource`

```ts
renderAssetSource(assetSourceId: string, ctx: RenderAssetSourceCtx): void
```

### `RenderAssetSourceCtx`

A `SelfResizingPluginFrameCtx` (auto-resizing) with:

**Additional properties:**

```
ctx.assetSourceId  // string — the asset source ID being rendered
```

**Additional methods:**

```
ctx.select(newUpload)  // Select an asset to upload into DatoCMS
```

### `ctx.select()` — Creating an Upload

**Important: URL resources must be CORS-enabled** — the server must respond with an `Access-Control-Allow-Origin` header. If fetching from a third-party API, verify CORS support or use base64 as a fallback.

The `select` method accepts a `NewUpload` object:

```ts
type NewUpload = {
  resource:
    | {
        url: string;              // URL of the file (must support CORS)
        filename?: string;        // Optional filename
        headers?: Record<string, string>; // Additional request headers
      }
    | {
        base64: string;           // Base64 data URI (data:[mime];base64,...)
        filename: string;         // Required filename for base64
      };
  copyright?: string;
  author?: string;
  notes?: string;
  tags?: string[];
  default_field_metadata?: {
    alt?: { [locale: string]: string | null };
    title?: { [locale: string]: string | null };
    custom_data?: { [locale: string]: Record<string, unknown> };
    focal_point?: { x: number; y: number } | null; // not localized
    poster_time?: number | null; // video only, not localized
  };
};
```

`default_field_metadata` shape needs SDK ≥2.4; SDK <2.4 accepts only the locale-keyed `{ [locale]: { alt, title, custom_data } }` form (deprecated in ≥2.4, still accepted).

**URL resource**: The URL must respond with `Access-Control-Allow-Origin` header (e.g., `*`).

**Base64 resource**: Use the data URI format: `data:[mime type];base64,[encoded data]`

## Complete Asset Source Example

```tsx
// src/main.tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import UnsplashSource from './entrypoints/UnsplashSource';
import 'datocms-react-ui/styles.css';

connect({
  assetSources() {
    return [
      {
        id: 'unsplash',
        name: 'Unsplash',
        icon: 'camera',
        modal: { width: 'l' },
      },
    ];
  },
  renderAssetSource(id, ctx) {
    switch (id) {
      case 'unsplash':
        render(<UnsplashSource ctx={ctx} />);
        break;
    }
  },
});
```

```tsx
// src/entrypoints/UnsplashSource.tsx
import type { RenderAssetSourceCtx } from 'datocms-plugin-sdk';
import BlankSlate from 'datocms-react-ui/BlankSlate';
import Button from 'datocms-react-ui/Button';
import Canvas from 'datocms-react-ui/Canvas';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import MediaCard from 'datocms-react-ui/MediaCard';
import StringInput from 'datocms-react-ui/StringInput';
import { useState } from 'react';

type Props = {
  ctx: RenderAssetSourceCtx;
};

type UnsplashPhoto = {
  id: string;
  urls: { regular: string; full: string };
  alt_description: string | null;
  user: { name: string };
};

export default function UnsplashSource({ ctx }: Props) {
  const [query, setQuery] = useState<string | null>(null);
  const [results, setResults] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);

  const apiKey = (ctx.plugin.attributes.parameters as Record<string, unknown>)
    .unsplashApiKey as string;

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12`,
      { headers: { Authorization: `Client-ID ${apiKey}` } },
    );
    const data = await response.json();
    setResults(data.results);
    setLoading(false);
  };

  const handleSelect = (photo: UnsplashPhoto) => {
    const locale = ctx.site.attributes.locales[0] ?? ctx.ui.locale;

    ctx.select({
      resource: {
        url: photo.urls.full,
        filename: `unsplash-${photo.id}.jpg`,
      },
      author: photo.user.name,
      copyright: 'Unsplash License',
      notes: photo.alt_description || undefined,
      default_field_metadata: { alt: { [locale]: photo.alt_description } },
    });
  };

  // Full shell (no title: the host dialog has one; states; grid): datocms-plugin-design surfaces.md, "Asset source"
  return (
    <Canvas ctx={ctx}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSearch();
        }}
      >
        <FieldWrapper label="Search Unsplash">
          <StringInput value={query} onChange={setQuery} placeholder="mountains" />
        </FieldWrapper>
        <Button submit label="Search" disabled={!query} />
      </form>

      {loading ? (
        <BlankSlate placement="inline" loading title="Searching Unsplash" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-m)' }}>
          {results.map((photo) => (
            <MediaCard
              key={photo.id}
              caption={{ text: photo.user.name }}
              selection={{ selected: false, onSelect: () => handleSelect(photo) }}
            >
              <img
                src={photo.urls.regular}
                alt={photo.alt_description || ''}
                style={{ display: 'block', width: '100%' }}
              />
            </MediaCard>
          ))}
        </div>
      )}
    </Canvas>
  );
}
```

## Key Notes

- Asset sources render inside a modal in the Media Area
- Use `ctx.select()` to finalize the selection — this creates the upload and closes the modal
- URL resources must be CORS-enabled
- For base64, include the full data URI with mime type
- `default_field_metadata`: `alt`, `title`, `custom_data` keyed by locale; `focal_point`, `poster_time` single values
