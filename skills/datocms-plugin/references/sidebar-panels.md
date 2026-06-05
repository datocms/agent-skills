# Sidebar Panels & Sidebars Reference

DatoCMS provides two ways to add UI to the record editing form's sidebar area: **sidebar panels** (collapsible panels in the right sidebar) and **full-width sidebars** (take over the entire sidebar area).

## Contents

- Sidebar Panels
- Full-Width Sidebars
- Gotchas

## Sidebar Panels

### Declaration: `itemFormSidebarPanels`

Declares collapsible panels shown in the record editing sidebar. Called once per model.

```ts
itemFormSidebarPanels(
  itemType: ItemType,
  ctx: ItemFormSidebarPanelsCtx
): ItemFormSidebarPanel[]
```

### `ItemFormSidebarPanel` shape

```ts
{
  id: string;              // Unique ID — passed to renderItemFormSidebarPanel
  label: string;           // Panel title on the collapsible handle
  startOpen?: boolean;     // Whether panel starts expanded (default: false)
  parameters?: Record<string, unknown>; // Arbitrary params passed to render
  placement?: ItemFormSidebarPanelPlacement; // Where in sidebar
  rank?: number;           // Sort order within same placement
  initialHeight?: number;  // Initial iframe height
}
```

### `ItemFormSidebarPanelPlacement`

Controls where the panel appears relative to built-in panels:

```ts
type ItemFormSidebarPanelPlacement = [
  'before' | 'after',
  'info' | 'publishedVersion' | 'schedule' | 'links' | 'history'
];
```

Example: `['before', 'info']` places the panel before the "Info" section.

**Defaults**: If `placement` is not specified, panels appear at `['after', 'history']` (bottom of sidebar). Default `rank` is `9999`. Negative values are allowed.

### Example: Panel for specific models

```ts
connect({
  itemFormSidebarPanels(itemType) {
    if (itemType.attributes.api_key !== 'blog_post') {
      return [];
    }
    return [
      {
        id: 'seo-score',
        label: 'SEO Score',
        startOpen: true,
        placement: ['before', 'info'],
      },
    ];
  },
});
```

### Render: `renderItemFormSidebarPanel`

```ts
renderItemFormSidebarPanel(
  sidebarPaneId: string,
  ctx: RenderItemFormSidebarPanelCtx
): void
```

### `RenderItemFormSidebarPanelCtx`

A `SelfResizingPluginFrameCtx` (auto-resizing) with item form properties and methods.

**Additional properties:**

```
ctx.sidebarPaneId   // string — the panel ID being rendered
ctx.parameters      // Record<string, unknown> — from the declaration
```

**Item form properties (same as field extensions):**

```
ctx.locale, ctx.item, ctx.itemType, ctx.formValues, ctx.itemStatus,
ctx.isSubmitting, ctx.isFormDirty, ctx.blocksAnalysis
```

**Item form methods:**

```
ctx.setFieldValue(path, value)
ctx.toggleField(path, show)
ctx.disableField(path, disable)
ctx.scrollToField(path, locale?)
ctx.saveCurrentItem(showToast?)
ctx.formValuesToItem(formValues, skipUnchanged?)
ctx.itemToFormValues(item)
```

### Complete Sidebar Panel Example

```tsx
// src/main.tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import SeoPanel from './entrypoints/SeoPanel';
import 'datocms-react-ui/styles.css';

connect({
  itemFormSidebarPanels(itemType) {
    if (itemType.attributes.api_key !== 'blog_post') {
      return [];
    }
    return [
      {
        id: 'seo-panel',
        label: 'SEO Analysis',
        startOpen: true,
      },
    ];
  },
  renderItemFormSidebarPanel(sidebarPaneId, ctx) {
    switch (sidebarPaneId) {
      case 'seo-panel':
        render(<SeoPanel ctx={ctx} />);
        break;
    }
  },
});
```

```tsx
// src/entrypoints/SeoPanel.tsx
import type { RenderItemFormSidebarPanelCtx } from 'datocms-plugin-sdk';
import { Canvas, Button } from 'datocms-react-ui';

type Props = {
  ctx: RenderItemFormSidebarPanelCtx;
};

/**
 * Helper to read a field value from formValues, handling both
 * localized fields (value is { en: "...", it: "..." }) and
 * non-localized fields (value is the raw value directly).
 */
function readFieldValue(
  formValues: Record<string, unknown>,
  fieldApiKey: string,
  locale: string,
): unknown {
  const raw = formValues[fieldApiKey];

  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    // Localized field — value is an object keyed by locale
    return (raw as Record<string, unknown>)[locale];
  }

  // Non-localized field — value is the raw value directly
  return raw;
}

export default function SeoPanel({ ctx }: Props) {
  const title = readFieldValue(ctx.formValues, 'title', ctx.locale) as
    | string
    | undefined;

  // Guard: the targeted model may not have a 'title' field
  if (title === undefined && !('title' in ctx.formValues)) {
    return <Canvas ctx={ctx}>{null}</Canvas>;
  }

  const titleLength = title?.length || 0;
  const isGoodLength = titleLength >= 30 && titleLength <= 60;

  return (
    <Canvas ctx={ctx}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          Title length: {titleLength} characters
          {isGoodLength ? ' ✓' : ' (aim for 30-60)'}
        </div>
        <Button
          buttonSize="xxs"
          onClick={() => ctx.scrollToField('title')}
        >
          Go to title field
        </Button>
      </div>
    </Canvas>
  );
}
```

### Reading Field Values in Sidebar Panels

Unlike field extensions (which have `ctx.fieldPath` to auto-resolve locale), sidebar panels access `ctx.formValues` directly. You must handle localization yourself — localized fields store values as `{ en: "...", it: "..." }` objects. Use the `readFieldValue` helper from `form-values.md` to handle both localized and non-localized fields. This same pattern applies to **outlets** and **dropdown execute hooks** — any context that has `ctx.formValues` but not `ctx.fieldPath`.

## Full-Width Sidebars

Full-width sidebars replace the standard sidebar entirely with a custom panel. They use `ImposedSizePluginFrameCtx` (DatoCMS controls the size — **no auto-resize**).

### Declaration: `itemFormSidebars`

```ts
itemFormSidebars(
  itemType: ItemType,
  ctx: ItemFormSidebarsCtx
): ItemFormSidebar[]
```

### `ItemFormSidebar` shape

```ts
{
  id: string;              // Unique ID — passed to renderItemFormSidebar
  label: string;           // Sidebar tab label
  parameters?: Record<string, unknown>;
  rank?: number;
  preferredWidth?: number; // Preferred width in pixels (capped at 60% of screen width)
}
```

### Render: `renderItemFormSidebar`

```ts
renderItemFormSidebar(
  sidebarId: string,
  ctx: RenderItemFormSidebarCtx
): void
```

`RenderItemFormSidebarCtx` is an `ImposedSizePluginFrameCtx` with item form properties/methods.

**Additional properties:**

```
ctx.sidebarId    // string — the sidebar ID being rendered
ctx.parameters   // Record<string, unknown>
```

### Full-Width Sidebar Example

```tsx
connect({
  itemFormSidebars(itemType) {
    if (itemType.attributes.api_key !== 'blog_post') {
      return [];
    }
    return [
      {
        id: 'preview-sidebar',
        label: 'Preview',
        preferredWidth: 500,
      },
    ];
  },
  renderItemFormSidebar(sidebarId, ctx) {
    switch (sidebarId) {
      case 'preview-sidebar':
        render(<PreviewSidebar ctx={ctx} />);
        break;
    }
  },
});
```

```tsx
// src/entrypoints/PreviewSidebar.tsx
import type { RenderItemFormSidebarCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';

type Props = {
  ctx: RenderItemFormSidebarCtx;
};

export default function PreviewSidebar({ ctx }: Props) {
  return (
    <Canvas ctx={ctx} noAutoResizer>
      <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
        <h2>Preview</h2>
        <p>Environment: {ctx.environment}</p>
      </div>
    </Canvas>
  );
}
```

## Gotchas

- **`ctx.item` is `null` for new records**: When a user creates a new record (before the first save), `ctx.item` is `null`. Always guard: `if (ctx.item) { ... }`.
