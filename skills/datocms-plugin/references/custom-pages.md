# Custom Pages Reference

Plugins can add full custom pages to DatoCMS in three locations: the top navigation bar, the settings area sidebar, and the content area sidebar. All custom pages are rendered via the shared `renderPage` hook.

## Contents

- Top Navigation Tabs: `mainNavigationTabs`
- Settings Area Pages: `settingsAreaSidebarItemGroups`
- Content Area Sidebar: `contentAreaSidebarItems`
- Rendering Pages: `renderPage`
- Key Notes

## Top Navigation Tabs: `mainNavigationTabs`

Adds tabs to the main navigation bar at the top of DatoCMS.

```ts
mainNavigationTabs(ctx: MainNavigationTabsCtx): MainNavigationTab[]
```

### `MainNavigationTab` shape

```ts
{
  label: string;           // Tab label (must be unique)
  icon: Icon;              // icon name or SVG definition; see sdk-connect-and-frames.md#icon-names
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
    icon: Icon;            // icon name or SVG definition; see sdk-connect-and-frames.md#icon-names
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
            icon: 'download',
            pointsTo: { pageId: 'import' },
          },
          {
            label: 'Export',
            icon: 'upload',
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
  icon: IconWithEmoji;     // icon name, SVG definition, or emoji; see sdk-connect-and-frames.md#icon-names
  pointsTo: { pageId: string };
  placement?: ['before' | 'after', 'menuItems' | 'seoPreferences'];
  rank?: number;
}
```

Note: `ContentAreaSidebarItem` supports emoji icons in addition to icon names/SVG:

```ts
icon: { type: 'emoji', emoji: '📊' }
```

### Example

```ts
connect({
  contentAreaSidebarItems() {
    return [
      {
        label: 'Model overview',
        icon: 'gauge',
        pointsTo: { pageId: 'model-overview' },
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

`ctx.navigateTo(path)`; path prefix (after environment prefix) follows the page's declaring hook: `mainNavigationTabs` → `/p/<pluginId>/pages/<pageId>`, `settingsAreaSidebarItemGroups` → `/configuration/p/...`, `contentAreaSidebarItems` → `/editor/p/...`:

```ts
// Settings-area page 'export'
const environmentPrefix = ctx.isEnvironmentPrimary ? '' : `/environments/${ctx.environment}`;
const pagePath = `${environmentPrefix}/configuration/p/${ctx.plugin.id}/pages/export`;
ctx.navigateTo(`${pagePath}?itemTypeId=${someId}`);
```

### Complete Navigation Tab + Page Example

```tsx
// src/main.tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import Canvas from 'datocms-react-ui/Canvas';
import Spinner from 'datocms-react-ui/Spinner';
import { lazy, Suspense } from 'react';
import 'datocms-react-ui/styles.css';

const LazyModelOverview = lazy(() => import('./entrypoints/ModelOverview'));

connect({
  mainNavigationTabs() {
    return [
      {
        label: 'Model overview',
        icon: 'gauge',
        pointsTo: { pageId: 'model-overview' },
      },
    ];
  },
  renderPage(pageId, ctx) {
    switch (pageId) {
      case 'model-overview':
        // Canvas goes outside Suspense: the Spinner fallback needs it too
        render(
          <Canvas ctx={ctx}>
            <Suspense fallback={<Spinner.Overlay veil={false} />}>
              <LazyModelOverview ctx={ctx} />
            </Suspense>
          </Canvas>,
        );
        break;
    }
  },
});
```

```tsx
// src/entrypoints/ModelOverview.tsx
import type { RenderPageCtx } from 'datocms-plugin-sdk';
import InfoList from 'datocms-react-ui/InfoList';
import Main from 'datocms-react-ui/Main';
import { Page } from 'datocms-react-ui/Page';
import Pane from 'datocms-react-ui/Pane';

type Props = {
  ctx: RenderPageCtx;
};

// Canvas is in main.tsx. Page shells and patterns: datocms-plugin-design surfaces.md, "Custom page"
export default function ModelOverview({ ctx }: Props) {
  const modelCount = Object.keys(ctx.itemTypes).length;

  return (
    <Main>
      <Pane
        ariaLabel="Model overview"
        header={
          <Pane.Header>
            <Pane.Header.Title level={1}>Model overview</Pane.Header.Title>
          </Pane.Header>
        }
      >
        <Page>
          <Page.Content>
            <InfoList>
              <InfoList.Row title="Models">{modelCount}</InfoList.Row>
              <InfoList.Row title="Environment">{ctx.environment}</InfoList.Row>
              <InfoList.Row title="Current path">{ctx.location.pathname}</InfoList.Row>
            </InfoList>
          </Page.Content>
        </Page>
      </Pane>
    </Main>
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
          { label: 'Import', icon: 'download', pointsTo: { pageId: 'import' } },
          { label: 'Export', icon: 'upload', pointsTo: { pageId: 'export' } },
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

- Pages use `ImposedSizePluginFrameCtx`: the frame fills the page and scrolls, and Canvas starts no auto-resizer there (no `noAutoResizer` needed). Shell: [custom page](../../datocms-plugin-design/references/surfaces.md#custom-page)
- Use `ctx.location` for internal routing via query params
- Use lazy loading with `React.lazy` + `Suspense` for code splitting on large pages
- Pages have access to all base context properties and methods (toasts, dialogs, navigation, etc.)
- Multiple declaration hooks can point to the same `renderPage` — just use different `pageId` values
