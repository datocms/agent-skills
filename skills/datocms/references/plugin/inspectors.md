# Inspectors Reference

Inspectors are full-screen side panel interfaces that combine a custom plugin view with built-in DatoCMS functionality: record lists, record editors, or custom panels. They appear as top-level navigation tabs and fit content browsing or editing workflows that need a split interface.

## Contents

- How Inspectors Work
- Declaration via `mainNavigationTabs`
- Render: `renderInspector`
- Render: `renderInspectorPanel`
- Complete Inspector Example
- Key Notes

## How Inspectors Work

An inspector is declared via `mainNavigationTabs` using `inspectorId` instead of `pageId`. When the user clicks the tab, DatoCMS opens a split interface:

- **Left side**: Your custom plugin UI (rendered by `renderInspector`)
- **Right side**: A DatoCMS-managed panel that can display a record list, record editor, or a custom panel (rendered by `renderInspectorPanel`)

Your plugin controls the right-side mode via `ctx.setInspectorMode()`.

## Declaration via `mainNavigationTabs`

Inspectors are declared as navigation tabs that point to an `inspectorId`:

```ts
connect({
  mainNavigationTabs() {
    return [
      {
        label: 'Content Browser',
        icon: 'search',
        pointsTo: {
          inspectorId: 'content-browser',
          preferredWidth: 400,
          initialInspectorPanel: {
            panelId: 'welcome-panel',
            parameters: { greeting: 'Hello!' },
          },
        },
        placement: ['after', 'content'],
      },
    ];
  },
});
```

### `pointsTo` shape for inspectors

```ts
{
  inspectorId: string;        // ID passed to renderInspector
  preferredWidth?: number;    // Preferred width of the left panel in pixels
  initialInspectorPanel?: {   // Optional: what to show on the right side initially
    panelId: string;          // Custom panel ID (rendered by renderInspectorPanel)
    parameters?: Record<string, unknown>;
  };
}
```

If `initialInspectorPanel` is not set, the right side starts with a record list.

## Render: `renderInspector`

Renders the left-side custom UI of the inspector.

```ts
renderInspector(inspectorId: string, ctx: RenderInspectorCtx): void
```

### `RenderInspectorCtx`

An `ImposedSizePluginFrameCtx` — DatoCMS controls the iframe size (**no auto-resize**).

**Additional properties:**

```
ctx.inspectorId        // string — the inspector ID being rendered
ctx.highlightedItemId  // string | undefined — the record ID currently highlighted by the user
ctx.location           // { pathname, search, hash } — current page location
```

**Additional methods:**

```
ctx.setInspectorMode(mode, options?)        // Switch the right-side panel mode
ctx.setInspectorItemListData(data)          // Set which records appear in the item list mode
```

### Inspector Modes (`setInspectorMode`)

```ts
type InspectorMode =
  | { type: 'itemList' }                              // Show a record list
  | { type: 'itemEditor'; itemId: string; fieldPath?: string }  // Show a record editor
  | { type: 'customPanel'; panelId: string; parameters?: Record<string, unknown> };  // Show a custom panel
```

**Options:**

```ts
{
  ignoreIfUnsavedChanges?: boolean;  // If true, mode change is skipped when
                                      // the current editor has unsaved changes.
                                      // Useful for "low intent" changes like
                                      // hover highlights. Default: false.
}
```

### `setInspectorItemListData`

Sets the data for the item list mode:

```ts
await ctx.setInspectorItemListData({
  title: 'Related Records',    // Title shown in the list header
  itemIds: ['id-1', 'id-2'],  // Record IDs to display
});
```

## Render: `renderInspectorPanel`

Renders a custom panel on the right side of the inspector (when mode is `customPanel`).

```ts
renderInspectorPanel(panelId: string, ctx: RenderInspectorPanelCtx): void
```

### `RenderInspectorPanelCtx`

An `ImposedSizePluginFrameCtx` — DatoCMS controls the iframe size (**no auto-resize**).

**Additional properties:**

```
ctx.panelId     // string — the panel ID being rendered
ctx.parameters  // Record<string, unknown> — from setInspectorMode() or initialInspectorPanel
```

## Complete Inspector Example

```tsx
// src/main.tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import ContentBrowser from './entrypoints/ContentBrowser';
import DetailPanel from './entrypoints/DetailPanel';
import 'datocms-react-ui/styles.css';

connect({
  mainNavigationTabs() {
    return [
      {
        label: 'Browser',
        icon: 'search',
        pointsTo: {
          inspectorId: 'browser',
          preferredWidth: 350,
        },
        placement: ['after', 'content'],
      },
    ];
  },

  renderInspector(inspectorId, ctx) {
    switch (inspectorId) {
      case 'browser':
        render(<ContentBrowser ctx={ctx} />);
        break;
    }
  },

  renderInspectorPanel(panelId, ctx) {
    switch (panelId) {
      case 'detail':
        render(<DetailPanel ctx={ctx} />);
        break;
    }
  },
});
```

```tsx
// src/entrypoints/ContentBrowser.tsx
import type { RenderInspectorCtx } from 'datocms-plugin-sdk';
import { Canvas, Button } from 'datocms-react-ui';
import { useState, useEffect } from 'react';

type Props = {
  ctx: RenderInspectorCtx;
};

export default function ContentBrowser({ ctx }: Props) {
  const models = Object.values(ctx.itemTypes).filter(Boolean);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const handleShowRecords = async (modelId: string) => {
    setSelectedModelId(modelId);
    // Load records for this model and show them in the right-side list
    await ctx.setInspectorItemListData({
      title: ctx.itemTypes[modelId]?.attributes.name || 'Records',
      itemIds: [], // You would fetch real record IDs here
    });
    await ctx.setInspectorMode({ type: 'itemList' });
  };

  const handleEditRecord = async (itemId: string) => {
    // Open a record editor on the right side
    await ctx.setInspectorMode({
      type: 'itemEditor',
      itemId,
    });
  };

  const handleShowDetail = async (modelId: string) => {
    // Show a custom panel on the right side
    await ctx.setInspectorMode({
      type: 'customPanel',
      panelId: 'detail',
      parameters: { modelId },
    });
  };

  return (
    <Canvas ctx={ctx} noAutoResizer>
      <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
        <h2 style={{ marginBottom: '16px' }}>Models</h2>
        {models.map((model) => (
          <button
            key={model!.id}
            type="button"
            style={{
              width: '100%',
              padding: '8px 12px',
              marginBottom: '4px',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left',
              appearance: 'none',
              font: 'inherit',
              color: 'var(--color--ink)',
              border:
                selectedModelId === model!.id
                  ? '1px solid var(--color--selected--border)'
                  : '1px solid transparent',
              backgroundColor:
                selectedModelId === model!.id
                  ? 'var(--color--selected--surface)'
                  : 'transparent',
              color:
                selectedModelId === model!.id
                  ? 'var(--color--selected--ink)'
                  : 'var(--color--ink)',
            }}
            onClick={() => handleShowRecords(model!.id)}
          >
            {model!.attributes.name}
          </button>
        ))}

        {ctx.highlightedItemId && (
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: 'var(--font-size-s)', color: 'var(--color--ink-subtle)' }}>
              Highlighted: {ctx.highlightedItemId}
            </p>
          </div>
        )}
      </div>
    </Canvas>
  );
}
```

```tsx
// src/entrypoints/DetailPanel.tsx
import type { RenderInspectorPanelCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';

type Props = {
  ctx: RenderInspectorPanelCtx;
};

export default function DetailPanel({ ctx }: Props) {
  const modelId = ctx.parameters.modelId as string;
  const model = ctx.itemTypes[modelId];

  return (
    <Canvas ctx={ctx} noAutoResizer>
      <div style={{ padding: '16px' }}>
        <h2>{model?.attributes.name || 'Unknown model'}</h2>
        <p>API key: {model?.attributes.api_key}</p>
      </div>
    </Canvas>
  );
}
```

## Key Notes

- Inspectors are declared through `mainNavigationTabs` with `inspectorId` (not `pageId`)
- Both `renderInspector` and `renderInspectorPanel` use `ImposedSizePluginFrameCtx` — pass `noAutoResizer` to Canvas
- Use `ctx.highlightedItemId` to react to users hovering/clicking records in the right-side list
- Use `ignoreIfUnsavedChanges: true` for "low intent" mode changes (e.g., highlighting on hover) to avoid interrupting editing
- Inspector panels don't need a separate declaration hook — just handle them in `renderInspectorPanel`
- `ctx.location` is available for URL-based state management within the inspector
