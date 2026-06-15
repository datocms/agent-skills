# Connect Conventions Reference

Load this file before `sdk-connect-and-frames.md` when the task only needs hook wiring or render-surface conventions.

## Quick checklist

- Inspect the existing `connect()` call before changing hooks.
- Keep exactly one top-level `connect()` call.
- Reuse the current file layout unless a new file keeps the patch smaller.
- Update declaration, render, and execute pairs together when a surface needs both sides.
- Import `'datocms-react-ui/styles.css'` once in the entry file.
- Reuse one shared `render()` helper.
- Wrap rendered UI in `<Canvas ctx={ctx}>`.
- Use `noAutoResizer` for pages, inspectors, and full-width sidebars.
- Use `switch` for ID-based render hooks even when there is only one case.
- Use `import type { ... }` for SDK types.
- Keep `ctx.openModal()` parameters and `ctx.resolve()` values JSON-serializable.

## Hook pair map

| Surface | Declaration / trigger side | Render / execute side |
| - | - | - |
| Field extension | `manualFieldExtensions` or `overrideFieldExtensions` | `renderFieldExtension` |
| Manual field extension config | `manualFieldExtensions` with `configurable: true` | `renderManualFieldExtensionConfigScreen` |
| Sidebar panel | `itemFormSidebarPanels` | `renderItemFormSidebarPanel` |
| Full sidebar | `itemFormSidebars` | `renderItemFormSidebar` |
| Custom page | `mainNavigationTabs`, `settingsAreaSidebarItemGroups`, or `contentAreaSidebarItems` | `renderPage` |
| Config screen | none | `renderConfigScreen` |
| Modal | a hook that calls `ctx.openModal()` | `renderModal` |
| Asset source | `assetSources` | `renderAssetSource` |
| Record form outlet | `itemFormOutlets` | `renderItemFormOutlet` |
| Collection outlet | `itemCollectionOutlets` | `renderItemCollectionOutlet` |
| Upload sidebar panel | `uploadSidebarPanels` | `renderUploadSidebarPanel` |
| Upload full sidebar | `uploadSidebars` | `renderUploadSidebar` |
| Inspector | `mainNavigationTabs` pointing to an inspector | `renderInspector` and sometimes `renderInspectorPanel` |
| Field dropdown action | `fieldDropdownActions` | `executeFieldDropdownAction` |
| Record dropdown action | `itemsDropdownActions` | `executeItemsDropdownAction` |
| Record form dropdown action | `itemFormDropdownActions` | `executeItemFormDropdownAction` |
| Upload dropdown action | `uploadsDropdownActions` | `executeUploadsDropdownAction` |
| Schema dropdown action | `schemaItemTypeDropdownActions` | `executeSchemaItemTypeDropdownAction` |
| Structured text toolbar customization | `customMarksForStructuredTextField` or `customBlockStylesForStructuredTextField` | none |
| Record presentation | `buildItemPresentationInfo` or `initialLocationQueryForItemSelector` | none |
| Lifecycle logic | `onBoot`, `onBeforeItemUpsert`, `onBeforeItemsPublish`, `onBeforeItemsUnpublish`, `onBeforeItemsDestroy` | none |

## Frame sizing reminder

Use standard `<Canvas ctx={ctx}>` for self-resizing surfaces:

- field extensions
- config screen
- modals
- asset sources
- sidebar panels
- outlets
- upload sidebar panels

Use `<Canvas ctx={ctx} noAutoResizer>` for imposed-size surfaces:

- `renderPage`
- `renderItemFormSidebar`
- `renderUploadSidebar`
- `renderInspector`
- `renderInspectorPanel`

## When to load the split SDK references

Load `references/sdk-connect-and-frames.md` when you need exact frame, Canvas, or render-helper details. Load `references/sdk-context-and-cma.md` when you need context/API details, such as:

- base `ctx` methods or repositories beyond the touched surface
- plugin CMA usage details
- async error-handling guidance
- full exported SDK type inventory
- field-type tables or less common platform details
