# Plugin Surface Starters

Use this file to choose the first hook pair for a new plugin. Keep the first version narrow.

## Surface map

| Need | Start with | Add alongside | Starter notes |
| - | - | - | - |
| Global plugin settings | `renderConfigScreen` | none | Use plain React state for simple settings. Add form libraries only when the form is genuinely complex. |
| Field UI replacement or addon | `manualFieldExtensions` or `overrideFieldExtensions` + `renderFieldExtension` | `renderManualFieldExtensionConfigScreen` for configurable manual extensions | Prefer addon when the UI supplements the field. Never use editor mode for modular content, single block, or structured text fields. |
| Record sidebar panel | `itemFormSidebarPanels` + `renderItemFormSidebarPanel` | none | Use a panel for compact record-side tools. |
| Full record sidebar | `itemFormSidebars` + `renderItemFormSidebar` | none | Use when the plugin needs the whole sidebar area. |
| Full page | a page declaration hook + `renderPage` | none | Choose `mainNavigationTabs`, `settingsAreaSidebarItemGroups`, or `contentAreaSidebarItems` based on where the page should live. |
| Dropdown action | one `*DropdownActions` hook + matching `execute*DropdownAction` | `renderModal` if the action opens UI | Match the scope to where the action should appear. |
| Lifecycle validation or migration | one `on*` lifecycle hook | none | Keep hidden-iframe logic fast and side-effect aware. |
| Modal flow | `renderModal` | a trigger hook that calls `ctx.openModal()` | Keep modal params and resolve payloads JSON-serializable. |
| Record form banner or widget | `itemFormOutlets` + `renderItemFormOutlet` | none | Use for small, top-of-form UI. |
| Collection banner or widget | `itemCollectionOutlets` + `renderItemCollectionOutlet` | none | Use for collection-level actions or notices. |
| Inspector | navigation declaration + `renderInspector` | `renderInspectorPanel` for right-side custom panels | Use when split-view navigation is the product shape. |
| Asset picker | `assetSources` + `renderAssetSource` | none | Confirm the external source supports CORS if selecting by URL. |
| Asset detail sidebar | `uploadSidebarPanels` + `renderUploadSidebarPanel` or `uploadSidebars` + `renderUploadSidebar` | none | Choose panel vs full sidebar the same way as record sidebars. |
| Structured text toolbar customization | `customMarksForStructuredTextField` or `customBlockStylesForStructuredTextField` | none | Use addon extensions, not editor overrides, for broader Structured Text tooling. |
| Record label or picker presentation | `buildItemPresentationInfo` or `initialLocationQueryForItemSelector` | none | Keep the first version focused on one display problem. |

## Starter guardrails

- Keep one top-level `connect()` call.
- Create one render helper and reuse it.
- Import `'datocms-react-ui/styles.css'` once in the entry file.
- Wrap rendered UI in `<Canvas ctx={ctx}>`.
- Use `noAutoResizer` for pages, inspectors, and full-width sidebars.
- Use `switch` for ID-based render hooks even when there is only one case.
- Use `import type { ... }` for SDK types.
- Add optional dependencies only when the starter implementation uses them.
- Guard `ctx.item` before reading saved-record data.

## Package add-ons to remember

Add only when used:

- `@datocms/cma-client-browser` for CMA access from inside the plugin iframe
- `lodash-es` for safe field-path reads in field extensions
- `use-deep-compare-effect` when an effect depends on `ctx` object properties
- `react-final-form` and `final-form` only for genuinely complex config forms
- `datocms-structured-text-slate-utils` for Structured Text analysis or mutation

## Marketplace reminder

For marketplace plugins:

- Prefix the npm package name with `datocms-plugin-`
- Include the `datocms-plugin` keyword
- Set a homepage
- Declare required plugin permissions in `datoCmsPlugin.permissions`

For private plugins, keep metadata minimal and grant permissions in the DatoCMS UI when installing the plugin.
