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
  icon: Icon;              // FontAwesome name or SVG definition
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
    [locale: string]: {
      alt: string | null;
      title: string | null;
      custom_data: Record<string, unknown>;
      focal_point?: { x: number; y: number } | null;
    };
  };
};
```

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
import { Canvas, TextField, Button, Spinner } from 'datocms-react-ui';
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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);

  const apiKey = (ctx.plugin.attributes.parameters as Record<string, unknown>)
    .unsplashApiKey as string;

  const handleSearch = async () => {
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
      default_field_metadata: {
        [locale]: {
          alt: photo.alt_description,
          title: null,
          custom_data: {},
        },
      },
    });
  };

  return (
    <Canvas ctx={ctx}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <TextField
          id="search"
          name="search"
          label="Search Unsplash"
          value={query}
          onChange={(val) => setQuery(val)}
        />
        <Button onClick={handleSearch} disabled={!query}>
          Search
        </Button>
      </div>

      {loading && <Spinner />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {results.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => handleSelect(photo)}
            style={{
              padding: 0,
              border: '1px solid var(--color--border)',
              borderRadius: '4px',
              background: 'transparent',
              cursor: 'pointer',
              overflow: 'hidden',
            }}
          >
            <img
              src={photo.urls.regular}
              alt={photo.alt_description || ''}
              style={{ display: 'block', width: '100%' }}
            />
          </button>
        ))}
      </div>
    </Canvas>
  );
}
```

## Key Notes

- Asset sources render inside a modal in the Media Area
- Use `ctx.select()` to finalize the selection — this creates the upload and closes the modal
- URL resources must be CORS-enabled
- For base64, include the full data URI with mime type
- `default_field_metadata` lets you set per-locale alt text, title, and custom data
