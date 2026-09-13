# Layouts

## Contents

- Centered page shells
- Page headers
- Sections
- Full-height shells
- Toolbars
- Sidebars and split layouts
- Responsive considerations
- Plugin pages are not marketing pages
- Layout anti-patterns

## Centered page shells

Use the CMS `Page` rhythm for config screens and simpler pages.

### Width guidance from the CMS

| Pattern | Width |
| - | - |
| default page | about `650px` |
| large page | about `800px` |
| wide page | about `1200px` |
| no-wrap page | full width |

### When to use each

- `650px`: settings forms, straightforward configuration flows
- `800px`: slightly broader forms or readme-like screens
- `1200px`: pages with lists, tables, dual sections, or denser data
- full width: inspectors or tool views that truly need it

## Page headers

CMS page headers are simple:

- one large title
- optional explainer line in secondary text
- actions aligned to the far edge

Use this order:

1. title
2. short context line if needed
3. actions

Keep the explainer concise. It should clarify the screen, not become a marketing intro.

## Sections

The CMS often groups page content into sections separated by generous vertical space and a line-led title treatment.

Use sections for:

- setting groups
- advanced collapsible areas
- danger zones
- table/list subsections

### Rules

- Prefer one column inside a section unless the content clearly benefits from two
- Use highlighted or destructive sections sparingly
- Collapsible sections are normal for advanced settings, not for basic fields

## Full-height shells

Use the `FullHeightScrollingLayout` rhythm for plugin pages that behave more like CMS work areas than standard forms.

Good fits:

- marketplace-like lists
- sidebars with scrolling content
- list/detail surfaces
- media-like tools

Structure:

- optional bordered header
- scrollable main content
- optional bordered footer

Do not stack multiple floating panels inside this shell. Let the shell do the structural work.

## Toolbars

Toolbar defaults in the CMS:

- height around `60px`
- `40px` for shorter utility bars
- horizontal gaps from `var(--spacing-m)` to `var(--spacing-l)`
- title first, actions after, stretch space between

Public component path:

- `Toolbar`
- `ToolbarStack`
- `ToolbarTitle`
- `ToolbarButton`
- `Button` / `ButtonGroup`
- `VerticalSplit` for side-by-side work areas when the installed version provides it

Official doc: <https://www.datocms.com/docs/plugin-sdk/toolbar>

## Sidebars and split layouts

CMS sidebars are calm:

- simple lists
- separators between groups
- no floating shells
- compact row height

For a two-pane plugin page:

- keep one pane structural and one pane content-heavy
- use a neutral divider or border between panes
- avoid nesting cards inside both panes unless the data truly needs it

If the installed `datocms-react-ui` version does not provide a split helper, use raw flex or grid with Canvas variables.

Split-view doc: <https://www.datocms.com/docs/plugin-sdk/sidebars-and-split-views>

## Responsive considerations

The CMS uses three PostCSS custom media breakpoints: `480px`, `1024px`, and `1700px` (mobile-first). These are **not** available in plugin CSS because they are PostCSS definitions, not standard `@media` queries.

Plugins that need responsive behavior should use standard media queries:

```css
@media (min-width: 480px) { /* ... */ }
@media (min-width: 1024px) { /* ... */ }
```

Most plugin surfaces (sidebar panels, field extensions, modals) are narrow enough that breakpoints are rarely needed. When they are, common patterns include:

- Buttons go full-width on narrow surfaces
- Toolbar actions stack vertically below `480px`
- Split layouts collapse to a single column

## Plugin pages are not marketing pages

Avoid:

- hero sections
- metric-card grids as a default
- oversized cover areas
- decorative eyebrow labels
- center-stage promotional copy
- big color blocks that do not carry state

Default to the same tone as DatoCMS settings and work areas: calm, dense, readable, and task-first.

## Layout anti-patterns

- too many nested bordered boxes
- page titles inside cards
- split views with both panes padded like standalone pages
- giant empty-state illustrations before basic copy
- toolbar actions that wrap because the content width was set too narrow
- turning a sidebar panel into a miniature dashboard
