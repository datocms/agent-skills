# Plugin Surfaces

Use this file after `design-foundations.md` when the plugin hook determines the UI shell.

## Contents

- Shared rules
- Config screen
- Page
- Sidebar panel
- Full sidebar
- Modal
- Outlets
- Inspector
- Asset source
- Surface-specific design defaults

## Shared rules

- Wrap every rendered surface in `<Canvas ctx={ctx}>`
- Import `datocms-react-ui/styles.css` once in the plugin entry file
- Use `noAutoResizer` only for imposed-size surfaces
- Use `ctx.updateHeight()` only when async or expanding content defeats the default auto-resizer
- Use semantic Canvas tokens for colors; use `ctx.colorScheme` only for non-CSS theme branching

Useful docs:

- React UI Components: <https://www.datocms.com/docs/plugin-sdk/react-datocms-ui>
- Config screen: <https://www.datocms.com/docs/plugin-sdk/config-screen>
- Sidebars and sidebar panels: <https://www.datocms.com/docs/plugin-sdk/sidebar-panels>

## Config screen

Best fit:

- grouped settings
- a centered page shell
- one clear save action

Choose a normal page rhythm before inventing a custom settings dashboard.

### Sizing

- `renderConfigScreen` uses a self-resizing frame
- normal `<Canvas ctx={ctx}>`
- no `noAutoResizer`

## Page

Best fit:

- full work areas
- list/detail tools
- broader operational screens

Use either a page shell or a full-height shell depending on content type. If the page needs a real two-pane work area, prefer `VerticalSplit` from the public design system when available; otherwise use a local flex/grid shell.

### Sizing

- `renderPage` uses an imposed-size frame
- use `<Canvas ctx={ctx} noAutoResizer>`

## Sidebar panel

Best fit:

- concise tools
- small metadata groups
- one or two focused actions

Sidebar panels should stay compact. If they turn into a whole app, move to a full sidebar or a page.

### Sizing

- `renderItemFormSidebarPanel` and `renderUploadSidebarPanel` are self-resizing
- normal `<Canvas ctx={ctx}>`

## Full sidebar

Best fit:

- richer secondary context
- larger editors or preview tools
- list/detail interactions that still belong beside the main screen

Full sidebars are side work, not separate dashboards. If the sidebar needs a real split layout, prefer `VerticalSplit` before building a custom divider shell.

### Sizing

- `renderItemFormSidebar` and `renderUploadSidebar` use imposed-size frames
- use `<Canvas ctx={ctx} noAutoResizer>`

## Modal

Best fit:

- focused confirmations
- short forms
- one-step auxiliary flows

Keep modals narrow in scope and limited in vertical complexity.

### Sizing

- `renderModal` is self-resizing
- normal `<Canvas ctx={ctx}>`
- call `ctx.updateHeight()` only when results arrive asynchronously and the initial layout height is clearly wrong

### Backdrops

Plugins should use `ctx.openModal()` to open modals — the CMS handles the backdrop overlay automatically. `--backdrop-color` and `--backdrop-linear-gradient` are **not** available inside Canvas, so do not attempt to build a custom backdrop. If you need a dimming layer within a plugin surface for a local popover, use a simple `rgb(0 0 0 / 0.3)` overlay.

## Outlets

Best fit:

- inline supporting UI
- contextual summaries
- one small action group that belongs near the form

Outlets must visually defer to the surrounding CMS screen.

### Sizing

- `renderItemFormOutlet` is self-resizing
- normal `<Canvas ctx={ctx}>`

## Inspector

Best fit:

- full-width analytical or inspection views
- split layouts with navigation + detail
- richer browsing tools

Use `VerticalSplit` when it reads naturally for the interaction and the installed `datocms-react-ui` version supports it.

### Sizing

- inspectors use imposed-size frames
- use `<Canvas ctx={ctx} noAutoResizer>`

## Asset source

Best fit:

- search + result lists
- focused pickers
- source-specific metadata steps

Asset sources should prioritize compact search, filters, results, and one clear selection path.

### Sizing

- asset sources are self-resizing
- normal `<Canvas ctx={ctx}>`

## Surface-specific design defaults

| Surface | Default shell | Avoid |
| - | - | - |
| Config screen | centered page with sections | metrics dashboard, multi-column vanity layout |
| Page | toolbar + page/full-height shell | giant intro section |
| Sidebar panel | compact stack | large cards and oversized headings |
| Full sidebar | split or stacked work area | unrelated decorative side panels |
| Modal | one focused box | multi-step control room |
| Outlet | quiet inline box or section | heavy framing |
| Inspector | tool-like shell | marketing-style landing layout |
| Asset source | search/list/result flow | ornamental gallery shell |
