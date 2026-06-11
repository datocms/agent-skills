# SDK Connect and Frames

Use this when a task needs `connect()` wiring, render helpers, hook pairing, `<Canvas>`, or frame sizing. Load `sdk-context-and-cma.md` instead for base `ctx`, form values, browser CMA, endpoint overrides, or permissions.

## Contents

- `connect()`
- Hook categories
- Declaration/render pairing
- Render helper
- `<Canvas>`
- Frame sizing
- Hook wiring guardrails

## `connect()`

`connect()` from `datocms-plugin-sdk` is the plugin entry point. Call it once at module load with only the hooks the plugin needs.

```tsx
import { connect } from 'datocms-plugin-sdk';

connect({
  manualFieldExtensions() {
    return [{ id: 'seo-score', name: 'SEO score', type: 'addon', fieldTypes: ['text'] }];
  },
  renderFieldExtension(fieldExtensionId, ctx) {
    render(<FieldExtension ctx={ctx} />);
  },
});
```

Do not call `connect()` inside React components, conditionally, or more than once.

## Hook categories

### Declaration hooks

Return data and do not render UI:

- `manualFieldExtensions`, `overrideFieldExtensions`
- `itemFormSidebarPanels`, `itemFormSidebars`
- `mainNavigationTabs`, `settingsAreaSidebarItemGroups`, `contentAreaSidebarItems`
- `assetSources`, `itemFormOutlets`, `itemCollectionOutlets`
- `uploadSidebarPanels`, `uploadSidebars`
- `fieldDropdownActions`, `itemsDropdownActions`, `itemFormDropdownActions`, `uploadsDropdownActions`, `schemaItemTypeDropdownActions`
- `customMarksForStructuredTextField`, `customBlockStylesForStructuredTextField`
- `buildItemPresentationInfo`, `initialLocationQueryForItemSelector`, `validateManualFieldExtensionParameters`

### Render hooks

Render a React UI into the plugin iframe:

- Self-resizing: `renderFieldExtension`, `renderManualFieldExtensionConfigScreen`, `renderItemFormSidebarPanel`, `renderConfigScreen`, `renderModal`, `renderAssetSource`, `renderItemFormOutlet`, `renderItemCollectionOutlet`, `renderUploadSidebarPanel`
- Imposed-size: `renderPage`, `renderItemFormSidebar`, `renderUploadSidebar`, `renderInspector`, `renderInspectorPanel`

### Execute and lifecycle hooks

- Execute hooks: `executeFieldDropdownAction`, `executeItemsDropdownAction`, `executeItemFormDropdownAction`, `executeUploadsDropdownAction`, `executeSchemaItemTypeDropdownAction`
- Lifecycle hooks: `onBoot`, `onBeforeItemUpsert`, `onBeforeItemsPublish`, `onBeforeItemsUnpublish`, `onBeforeItemsDestroy`

## Declaration/render pairing

| Surface | Declaration or trigger | Render or execute |
| - | - | - |
| Field extension | `manualFieldExtensions` or `overrideFieldExtensions` | `renderFieldExtension` |
| Manual field config | `manualFieldExtensions` with `configurable: true` | `renderManualFieldExtensionConfigScreen` |
| Record sidebar panel | `itemFormSidebarPanels` | `renderItemFormSidebarPanel` |
| Full record sidebar | `itemFormSidebars` | `renderItemFormSidebar` |
| Custom page | `mainNavigationTabs`, `settingsAreaSidebarItemGroups`, or `contentAreaSidebarItems` | `renderPage` |
| Config screen | none | `renderConfigScreen` |
| Modal | a UI path calling `ctx.openModal()` | `renderModal` |
| Asset source | `assetSources` | `renderAssetSource` |
| Record form outlet | `itemFormOutlets` | `renderItemFormOutlet` |
| Collection outlet | `itemCollectionOutlets` | `renderItemCollectionOutlet` |
| Upload sidebar panel | `uploadSidebarPanels` | `renderUploadSidebarPanel` |
| Upload full sidebar | `uploadSidebars` | `renderUploadSidebar` |
| Inspector | `mainNavigationTabs` pointing to an inspector | `renderInspector`, optionally `renderInspectorPanel` |
| Dropdown actions | matching `*DropdownActions` declaration | matching `execute*DropdownAction` hook |
| Record presentation | `buildItemPresentationInfo` or `initialLocationQueryForItemSelector` | none |

## Render helper

Most maintained plugins use one root-level helper in `src/utils/render.tsx`:

```tsx
import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');
const root = createRoot(container);

export function render(component: ReactNode) {
  root.render(<StrictMode>{component}</StrictMode>);
}
```

Create the root once. Each render hook re-renders into that root. This is correct because each iframe instance runs one active render surface.

## `<Canvas>`

Wrap every rendered plugin surface in `<Canvas ctx={ctx}>` and import `datocms-react-ui/styles.css` once in the entry file.

```tsx
import { Canvas } from 'datocms-react-ui';
import 'datocms-react-ui/styles.css';

export function ConfigScreen({ ctx }: { ctx: RenderConfigScreenCtx }) {
  return <Canvas ctx={ctx}>...</Canvas>;
}
```

Canvas provides:

- semantic Canvas tokens and legacy theme variables inside the wrapper
- automatic height resizing for self-resizing frames
- `useCtx<T>()` for nested components that should avoid prop drilling
- document-level `data-color-scheme` and CSS `color-scheme` through the SDK runtime

## Frame sizing

Use plain `<Canvas ctx={ctx}>` for self-resizing surfaces:

- field extensions, config screens, modals, asset sources
- sidebar panels, outlets, upload sidebar panels

Use `<Canvas ctx={ctx} noAutoResizer>` for imposed-size surfaces:

- `renderPage`
- `renderItemFormSidebar`
- `renderUploadSidebar`
- `renderInspector`
- `renderInspectorPanel`

Use Canvas auto-resizing first. Add `initialHeight`, `ctx.updateHeight()`, or custom `ResizeObserver` logic only when async content or custom layout defeats it.

## Hook wiring guardrails

- Inspect the existing `connect()` call before adding hooks.
- Keep one top-level render helper and one top-level `connect()` call.
- Use `switch` for ID-dispatched render hooks, even with one case.
- Update declaration, render, execute, package metadata, and permissions together when a flow needs them.
- Use `import type { ... }` for SDK types.
- Keep `ctx.openModal()` parameters and `ctx.resolve()` values JSON-serializable.
- Keep rendered components compact and surface-appropriate; do not turn plugin surfaces into dashboards.
