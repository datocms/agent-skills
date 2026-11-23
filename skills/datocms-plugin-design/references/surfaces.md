# Plugin surfaces

Frame facts no docs page states, shared by every surface. SDK wiring (`connect`, hook declarations, reading and saving data): `../../datocms-plugin/SKILL.md`.

## Frame facts

| Surface | Hook | Frame | `bodyPadding` | Host chrome around the frame |
| - | - | - | - | - |
| Config screen | `renderConfigScreen` | Auto | 30 | Plugin page; "Plugin settings" section title (hairlines) right above |
| Field editor | `renderFieldExtension` | Auto | 10 | Field label, hint, label menu, errors |
| Field addon | `renderFieldExtension` | Auto | 10 (+10 above) | Under the field's editor |
| Field extension config | `renderManualFieldExtensionConfigScreen` | Auto | 10 | Field appearance form with its own Save |
| Record sidebar panel | `renderItemFormSidebarPanel` | Auto | 10 | `SidebarPanel` with the panel `label` as title, collapse, stored open state |
| Asset sidebar panel | `renderUploadSidebarPanel` | Auto | 10 | Same as record sidebar panel |
| Record full sidebar | `renderItemFormSidebar` | Fixed | 0 | — |
| Asset full sidebar | `renderUploadSidebar` | Fixed | 0 | — |
| Custom page | `renderPage` | Fixed | 0 | — (document title = tab label) |
| Modal | `renderModal` | Auto; `width: 'fullWidth'` → Fixed | 20; fullWidth 0 | Dialog box, `title`, cross (unless `closeDisabled`); fullWidth ignores `title` |
| Inspector | `renderInspector` | Fixed | 0 | Left side of a split, right side shows records, a record or the inspector panel |
| Inspector panel | `renderInspectorPanel` | Fixed | 0 | Right side of the inspector split |
| Record form outlet | `renderItemFormOutlet` | Auto | 10 (+15 above) | Above the record form |
| Collection outlet | `renderItemCollectionOutlet` | Auto | 0 | Above the record list; 20px between outlets |
| Asset source | `renderAssetSource` | Auto | 20 | Dialog titled "Upload asset using {source name}" with the source icon and a cross |

- **Auto** frames: the ctx has `startAutoResizer`/`updateHeight`/`setHeight`; Canvas starts the resizer, which measures the bottom of every element in `body` and sends `setHeight`. The iframe has `scrolling="no"`: whatever passes its height is clipped. Initial height is the hook's `initialHeight` (else 35px) plus vertical padding, so declare a realistic `initialHeight` to avoid a jump. Keep the resizer on; `noAutoResizer` only when the plugin calls `ctx.setHeight` itself.
- **Fixed** frames: `ImposedSizePluginFrameCtx`, no sizing methods; the iframe fills its host area (`position: absolute; height: 100%`) and scrolls. Layout shells that fill a box (`Pane`, `ListDetail.Page`) belong here.
- **Padding:** Canvas applies `ctx.bodyPadding` as its own padding; the host gives the frame a negative margin of the same size, so the content's edge lines up with the host's content. Do not add an outer padding of your own.
- `Pane` and `ListDetail.Page` are `position: absolute; inset: 0`; with nothing positioned between them and Canvas they fill the frame. In an Auto frame they grow it to the full content height (the resizer measures descendants), so there they are pointless.
- `SplitPane` and `ListFormPage` (a `SplitPane` inside) are `height: 100%`; Canvas sets no height, so wrap them: `<div style={{ position: 'relative', height: '100vh' }}>`.
- **Dimming and layers:** dialogs over the page come from `ctx.openModal` with the host's backdrop; never build one. A veil over content while it saves is `Spinner.Overlay` (its veil paints `--color--overlay--surface`); react-ui's own `Portal`/menus get the tokens again from Canvas.
- **Third-party widgets** (charts, editors, maps) that portal outside Canvas or need concrete values: pass them `ctx.cssDesignTokens['--color--…']` values, and re-theme on `ctx.colorScheme` changes; never hard-code a palette.
- Embedded surfaces (config screen, field, sidebar panel, outlet, modal, asset source) sit inside a host page that already has its landmarks: use no `Main` there. `Main` goes in surfaces that are a page of their own: `renderPage`, `renderInspector`.

## Recipes

One file per surface: what the host draws around the frame, a minimal TSX skeleton, usual mistakes. Read only the one being built.

- [Config screen](surfaces/config-screen.md)
- [Field editor](surfaces/field-editor.md)
- [Field addon](surfaces/field-addon.md)
- [Field extension config screen](surfaces/field-extension-config.md)
- [Sidebar panel](surfaces/sidebar-panel.md)
- [Full sidebar](surfaces/full-sidebar.md)
- [Custom page](surfaces/custom-page.md)
- [Modal](surfaces/modal.md)
- [Inspector](surfaces/inspector.md)
- [Outlets](surfaces/outlets.md)
- [Asset source](surfaces/asset-source.md)
- [Dropdown actions](surfaces/dropdown-actions.md)
