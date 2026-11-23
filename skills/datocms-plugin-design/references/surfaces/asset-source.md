# Asset source

Skeleton assumes `datocms-react-ui/styles.css` imported in the entry and the template's `render` helper (`src/utils/render.tsx`); icons from the plugin's own set. Frame sizing and padding: `../surfaces.md`.

Inside a host dialog titled "Upload asset using {source}" with the source icon and a cross; padding 20, Auto height (declare `modal.initialHeight` in the hook to avoid a jump). Shell: a search field, then a grid of `MediaCard`s; a pick calls `ctx.select({ resource: { url, filename } })`. No title of your own. Loading: `BlankSlate` with `loading`; no results: `BlankSlate` saying the search found nothing.

```tsx
import type { RenderAssetSourceCtx } from 'datocms-plugin-sdk';
import Canvas from 'datocms-react-ui/Canvas';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import MediaCard from 'datocms-react-ui/MediaCard';
import StringInput from 'datocms-react-ui/StringInput';
import { useState } from 'react';

type Photo = { id: string; url: string; thumb: string; filename: string };

function Source({ ctx, photos }: { ctx: RenderAssetSourceCtx; photos: Photo[] }) {
  const [query, setQuery] = useState<string | null>(null);
  return (
    <>
      <FieldWrapper label="Search photos">
        <StringInput value={query} onChange={setQuery} placeholder="mountains" />
      </FieldWrapper>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--spacing-l)' }}>
        {photos.map((photo) => (
          <MediaCard
            key={photo.id}
            caption={{ text: photo.filename }}
            selection={{
              selected: false,
              onSelect: () => ctx.select({ resource: { url: photo.url, filename: photo.filename } }),
            }}
          >
            <img src={photo.thumb} alt="" style={{ display: 'block', width: '100%', aspectRatio: '4 / 3' }} />
          </MediaCard>
        ))}
      </div>
    </>
  );
}

export function renderAssetSource(_id: string, ctx: RenderAssetSourceCtx) {
  render(
    <Canvas ctx={ctx}>
      <Source ctx={ctx} photos={[]} />
    </Canvas>,
  );
}
```
