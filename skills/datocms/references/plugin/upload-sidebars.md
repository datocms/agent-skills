# Upload Sidebars & Panels Reference

Plugins can add custom UI to the Media Area's asset detail view, appearing when a user opens an individual asset. This works identically to the item form sidebar system, but for uploads (assets) instead of records.

There are two variants: **sidebar panels** (collapsible panels in the asset sidebar) and **full-width sidebars** (replace the entire sidebar area).

## Contents

- Upload Sidebar Panels
- Full-Width Upload Sidebars
- Key Notes

## Upload Sidebar Panels

### Declaration: `uploadSidebarPanels`

Declares collapsible panels in the asset detail sidebar. Called once globally (not per asset).

```ts
uploadSidebarPanels(ctx: UploadSidebarPanelsCtx): UploadSidebarPanel[]
```

`UploadSidebarPanelsCtx` is a plain `Ctx` (base context only).

### `UploadSidebarPanel` shape

```ts
{
  id: string;              // Unique ID — passed to renderUploadSidebarPanel
  label: string;           // Panel title on the collapsible handle
  parameters?: Record<string, unknown>; // Arbitrary params passed to render
  startOpen?: boolean;     // Whether panel starts expanded (default: false)
  placement?: UploadSidebarPanelPlacement; // Where in sidebar
  rank?: number;           // Sort order within same placement
  initialHeight?: number;  // Initial iframe height
}
```

### `UploadSidebarPanelPlacement`

Controls where the panel appears relative to built-in Media Area sidebar sections:

```ts
type UploadSidebarPanelPlacement = [
  'before' | 'after',
  'defaultMetadata' | 'categorization' | 'creator' | 'videoTracks' | 'links' | 'replace'
];
```

Example: `['after', 'defaultMetadata']` places the panel after the default metadata section (alt text, title, etc.).

### Render: `renderUploadSidebarPanel`

```ts
renderUploadSidebarPanel(
  sidebarPaneId: string,
  ctx: RenderUploadSidebarPanelCtx
): void
```

### `RenderUploadSidebarPanelCtx`

A `SelfResizingPluginFrameCtx` (auto-resizing iframe) with:

**Additional properties:**

```
ctx.sidebarPaneId  // string — the panel ID being rendered
ctx.parameters     // Record<string, unknown> — from the declaration
ctx.upload         // Upload — the active asset entity
```

### Complete Upload Sidebar Panel Example

```tsx
// src/main.tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import AssetInfoPanel from './entrypoints/AssetInfoPanel';
import 'datocms-react-ui/styles.css';

connect({
  uploadSidebarPanels() {
    return [
      {
        id: 'asset-info',
        label: 'Asset Details',
        startOpen: true,
        placement: ['after', 'defaultMetadata'],
      },
    ];
  },
  renderUploadSidebarPanel(sidebarPaneId, ctx) {
    switch (sidebarPaneId) {
      case 'asset-info':
        render(<AssetInfoPanel ctx={ctx} />);
        break;
    }
  },
});
```

```tsx
// src/entrypoints/AssetInfoPanel.tsx
import type { RenderUploadSidebarPanelCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';

type Props = {
  ctx: RenderUploadSidebarPanelCtx;
};

export default function AssetInfoPanel({ ctx }: Props) {
  const upload = ctx.upload;
  const sizeKB = Math.round((upload.attributes.size / 1024) * 10) / 10;

  return (
    <Canvas ctx={ctx}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: 'var(--font-size-s)' }}>
        <div>Format: {upload.attributes.format}</div>
        <div>Size: {sizeKB} KB</div>
        {upload.attributes.width && (
          <div>
            Dimensions: {upload.attributes.width} x {upload.attributes.height}
          </div>
        )}
        <div>
          Created: {new Date(upload.attributes.created_at).toLocaleDateString()}
        </div>
      </div>
    </Canvas>
  );
}
```

## Full-Width Upload Sidebars

Full-width sidebars replace the standard asset sidebar entirely with a custom panel. They use `ImposedSizePluginFrameCtx` (DatoCMS controls the size — **no auto-resize**).

### Declaration: `uploadSidebars`

```ts
uploadSidebars(ctx: UploadSidebarsCtx): UploadSidebar[]
```

`UploadSidebarsCtx` is a plain `Ctx` (base context only).

### `UploadSidebar` shape

```ts
{
  id: string;              // Unique ID — passed to renderUploadSidebar
  label: string;           // Sidebar tab label
  parameters?: Record<string, unknown>;
  rank?: number;
  preferredWidth?: number; // Preferred width in pixels
}
```

### Render: `renderUploadSidebar`

```ts
renderUploadSidebar(sidebarId: string, ctx: RenderUploadSidebarCtx): void
```

### `RenderUploadSidebarCtx`

An `ImposedSizePluginFrameCtx` — DatoCMS controls the iframe size (**no auto-resize**).

**Additional properties:**

```
ctx.sidebarId    // string — the sidebar ID being rendered
ctx.parameters   // Record<string, unknown>
ctx.upload       // Upload — the active asset entity
```

### Full-Width Upload Sidebar Example

```tsx
connect({
  uploadSidebars() {
    return [
      {
        id: 'asset-editor',
        label: 'Advanced Editor',
        preferredWidth: 500,
      },
    ];
  },
  renderUploadSidebar(sidebarId, ctx) {
    switch (sidebarId) {
      case 'asset-editor':
        render(<AssetEditor ctx={ctx} />);
        break;
    }
  },
});
```

**Important**: Since full-width upload sidebars use `ImposedSizePluginFrameCtx`, pass `noAutoResizer` to Canvas:

```tsx
<Canvas ctx={ctx} noAutoResizer>
  {/* content fills the imposed size */}
</Canvas>
```

## Key Notes

- Upload sidebar hooks are global — they are NOT called per-asset or per-model. The declaration runs once and applies to all assets.
- Both panel and sidebar render contexts include `ctx.upload` — the full Upload entity with all asset metadata (format, size, dimensions, etc.)
- Panels use `SelfResizingPluginFrameCtx` (auto-resize). Full-width sidebars use `ImposedSizePluginFrameCtx` (no auto-resize).
- The placement options for panels reference Media Area sidebar sections: `defaultMetadata`, `categorization`, `creator`, `videoTracks`, `links`, and `replace`.
