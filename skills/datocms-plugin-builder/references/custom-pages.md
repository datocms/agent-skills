# Custom Pages Reference

## Quick Navigation

- Choose where the page lives: main nav, settings area, or content sidebar
- Page declaration shapes for each location
- `renderPage` and imposed-size frame behavior
- `ctx.navigateTo()` and environment-aware paths
- Shared page rendering notes

Plugins can add full custom pages to DatoCMS in three locations: the top navigation bar, the settings area sidebar, and the content area sidebar. All custom pages are rendered via the shared `renderPage` hook.

## Top Navigation Tabs: `mainNavigationTabs`

Adds tabs to the main navigation bar at the top of DatoCMS.

```ts
mainNavigationTabs(ctx: MainNavigationTabsCtx): MainNavigationTab[]
```

### `MainNavigationTab` shape

```ts
{
  label: string;           // Tab label (must be unique)
  icon: Icon;              // FontAwesome name or SVG definition
  pointsTo:
    | { pageId: string }   // Links to a page rendered by renderPage
    | {                     // Links to an inspector panel
        inspectorId: string;
        preferredWidth?: number;
        initialInspectorPanel?: {
          panelId: string;
          parameters?: Record<string, unknown>;
        };
      };
  placement?: [
    'before' | 'after',
    'content' | 'media' | 'schema' | 'configuration' | 'cdaPlayground'
  ];
  rank?: number;
}
```

### Example

```ts
connect({
  mainNavigationTabs() {
    return [
      {
        label: 'Analytics',
        icon: 'chart-bar',
        pointsTo: { pageId: 'analytics' },
        placement: ['after', 'content'],
      },
    ];
  },
});
```

## Settings Area Pages: `settingsAreaSidebarItemGroups`

Adds groups of pages to the Settings area sidebar.

```ts
settingsAreaSidebarItemGroups(
  ctx: SettingsAreaSidebarItemGroupsCtx
): SettingsAreaSidebarItemGroup[]
```

### `SettingsAreaSidebarItemGroup` shape

```ts
{
  label: string;           // Group header label (must be unique)
  items: Array<{
    label: string;         // Item label (must be unique)
    icon: Icon;            // FontAwesome name or SVG definition
    pointsTo: { pageId: string };
  }>;
  placement?: ['before' | 'after', 'properties' | 'permissions'];
  rank?: number;
}
```

### Example

```ts
connect({
  settingsAreaSidebarItemGroups() {
    return [
      {
        label: 'My Plugin',
        items: [
          {
            label: 'Import',
            icon: 'file-import',
            pointsTo: { pageId: 'import' },
          },
          {
            label: 'Export',
            icon: 'file-export',
            pointsTo: { pageId: 'export' },
          },
        ],
      },
    ];
  },
});
```

## Content Area Sidebar: `contentAreaSidebarItems`

Adds items to the left sidebar in the Content area (where models/menu items are listed).

```ts
contentAreaSidebarItems(
  ctx: ContentAreaSidebarItemsCtx
): ContentAreaSidebarItem[]
```

### `ContentAreaSidebarItem` shape

```ts
{
  label: string;           // Item label (must be unique)
  icon: IconWithEmoji;     // FontAwesome name, SVG definition, or emoji
  pointsTo: { pageId: string };
  placement?: ['before' | 'after', 'menuItems' | 'seoPreferences'];
  rank?: number;
}
```

Note: `ContentAreaSidebarItem` supports emoji icons in addition to FontAwesome/SVG:

```ts
icon: { type: 'emoji', emoji: '📊' }
```

### Example

```ts
connect({
  contentAreaSidebarItems() {
    return [
      {
        label: 'Dashboard',
        icon: 'tachometer-alt',
        pointsTo: { pageId: 'dashboard' },
        placement: ['before', 'menuItems'],
      },
    ];
  },
});
```

## Rendering Pages: `renderPage`

All three declaration hooks above share the same render hook:

```ts
renderPage(pageId: string, ctx: RenderPageCtx): void
```

### `RenderPageCtx`

An `ImposedSizePluginFrameCtx` — the page fills the full screen. DatoCMS controls the iframe size (**no auto-resize**).

**Additional properties:**

```
ctx.pageId    // string — the page ID being rendered
ctx.location  // { pathname: string; search: string; hash: string }
```

The `ctx.location` property enables internal routing within a page. You can use query parameters to pass state between pages:

```ts
const params = new URLSearchParams(ctx.location.search);
const itemTypeId = params.get('itemTypeId');
```

### Navigating Between Plugin Pages

Use `ctx.navigateTo()` to navigate to other plugin pages:

```ts
// Navigate to a plugin page
const environmentPrefix = ctx.isEnvironmentPrimary ? '' : `/environments/${ctx.environment}`;
const pagePath = `${environmentPrefix}/configuration/p/${ctx.plugin.id}/pages/export`;
ctx.navigateTo(`${pagePath}?itemTypeId=${someId}`);
```

### Complete Navigation Tab + Page Example

```tsx
// src/main.tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import { Spinner } from 'datocms-react-ui';
import { lazy, Suspense } from 'react';
import 'datocms-react-ui/styles.css';

const LazyDashboard = lazy(() => import('./entrypoints/Dashboard'));

connect({
  mainNavigationTabs() {
    return [
      {
        label: 'Dashboard',
        icon: 'tachometer-alt',
        pointsTo: { pageId: 'dashboard' },
      },
    ];
  },
  renderPage(pageId, ctx) {
    switch (pageId) {
      case 'dashboard':
        render(
          <Suspense fallback={<Spinner size={60} placement="centered" />}>
            <LazyDashboard ctx={ctx} />
          </Suspense>,
        );
        break;
    }
  },
});
```

```tsx
// src/entrypoints/Dashboard.tsx
import type { RenderPageCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';

type Props = {
  ctx: RenderPageCtx;
};

export default function Dashboard({ ctx }: Props) {
  const modelCount = Object.keys(ctx.itemTypes).length;

  return (
    <Canvas ctx={ctx} noAutoResizer>
      <div style={{ padding: '2rem' }}>
        <h1>Project Dashboard</h1>
        <p>This project has {modelCount} models.</p>
        <p>Environment: {ctx.environment}</p>
        <p>Current path: {ctx.location.pathname}</p>
      </div>
    </Canvas>
  );
}
```

### Complete Settings Page Example

```tsx
connect({
  settingsAreaSidebarItemGroups() {
    return [
      {
        label: 'My Plugin',
        items: [
          {
            label: 'Settings',
            icon: 'cog',
            pointsTo: { pageId: 'plugin-settings' },
          },
        ],
      },
    ];
  },
  renderPage(pageId, ctx) {
    switch (pageId) {
      case 'plugin-settings':
        render(<SettingsPage ctx={ctx} />);
        break;
    }
  },
});
```

### Multiple Pages with Routing

```tsx
connect({
  settingsAreaSidebarItemGroups() {
    return [
      {
        label: 'Schema Tools',
        items: [
          { label: 'Import', icon: 'file-import', pointsTo: { pageId: 'import' } },
          { label: 'Export', icon: 'file-export', pointsTo: { pageId: 'export' } },
        ],
      },
    ];
  },
  renderPage(pageId, ctx) {
    const params = new URLSearchParams(ctx.location.search);

    switch (pageId) {
      case 'import':
        render(<ImportPage ctx={ctx} />);
        break;
      case 'export':
        const itemTypeId = params.get('itemTypeId');
        if (itemTypeId) {
          render(<ExportDetailPage ctx={ctx} itemTypeId={itemTypeId} />);
        } else {
          render(<ExportListPage ctx={ctx} />);
        }
        break;
    }
  },
});
```

## Key Notes

- Pages use `ImposedSizePluginFrameCtx` — pass `noAutoResizer` to Canvas
- Use `ctx.location` for internal routing via query params
- Use lazy loading with `React.lazy` + `Suspense` for code splitting on large pages
- Pages have access to all base context properties and methods (toasts, dialogs, navigation, etc.)
- Multiple declaration hooks can point to the same `renderPage` — just use different `pageId` values
