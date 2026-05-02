---
name: datocms-plugin-design-system
description: >-
  Design or restyle DatoCMS plugins so they look and feel native to the
  DatoCMS UI. Use when users ask to make a plugin match the DatoCMS dashboard,
  polish plugin config screens, pages, sidebars, panels, modals, forms,
  tables, empty states, or overall plugin layout structure. This skill owns
  DatoCMS plugin design-system work, native-look restyling, and UI density or
  spacing cleanup. Prefer `datocms-react-ui` when a public component exists,
  and otherwise use raw React and CSS that reproduce DatoCMS spacing,
  typography, density, color, and interaction patterns without importing
  private CMS classes.
---

# DatoCMS Plugin Design System

Make plugin UI native. Use for visual fit, structure, density, styling. Not for wiring hooks or scaffolding.

Owns:

- Make config screen native
- Restyle sidebar panel to match dashboard
- Use raw CSS for native page look
- Tighten modal spacing/hierarchy
- Pick `datocms-react-ui` components matching CMS UI

## Step 1: Detect context silently

1. Identify target: existing plugin, greenfield scaffold, single surface.
2. Identify surface: config screen, page, sidebar panel, full sidebar, modal, outlet, inspector, asset source.
3. Check if project uses `datocms-react-ui`.
4. Identify change type: visual, layout, control selection, theme, density.
5. Read smallest slice: surface entrypoint, component being restyled, local CSS, `package.json` if needed.

Ask only if repo unclear.

## Step 2: Choose implementation path

Use narrowest path keeping result native.

### A. Public component path first

Use when `datocms-react-ui` exposes needed control.

Prefer for:

- `Canvas`
- form wrappers, grouped settings
- standard fields, buttons, button groups
- sections, toolbar, header structure
- sidebar panels, dropdowns, spinners
- `VerticalSplit` if available

### B. Raw React + CSS fallback

Use when public package lacks needed layout or exact CMS composition matters.

Use for:

- page shells needing CMS spacing
- list/table wrappers, summary rows
- empty states, info blocks
- split layouts when UI package lacks primitive
- surface-specific wrappers needing theme vars

Do not import private CMS styles or class names. Recreate with plugin-local CSS using Canvas variables.

## Step 3: Load minimum references

Always start with:

- `references/foundations.md`
- `references/datocms-react-ui-bridge.md`

Load `references/source-map.md` only if public docs + plugin code insufficient.

Then load touched reference:

- layout/page → `references/layouts.md`
- forms/settings/controls → `references/forms-and-controls.md`
- tabs/dropdowns/tables/notices → `references/navigation-feedback-and-data-display.md`
- hook-specific screen shape → `references/plugin-surfaces.md`
- raw CSS → `references/raw-css-fallbacks.md`

Do not load whole bundle for small restyle.

## Step 4: Build native-looking UI

Guardrails:

- Match DatoCMS density before inventing layout.
- Use `<Canvas>` theme vars, not hardcoded brand colors.
- Prefer 1px borders, 3-5px radii, subtle shadow where CMS uses it.
- Keep page widths, toolbar heights, section spacing, form rhythm close to CMS.
- One primary action per section/screen.
- Isolate destructive actions.
- Labels above controls, hints below, concise errors.
- Favor sections/toolbars/sidebars/tables over decorative cards.
- Avoid hero blocks, KPI grids, ornamental copy, oversized rounded corners, heavy gradients, dashboard filler.
- Keep custom CSS local and variable-driven.
- If public component close but incomplete, compose around it.

For "native" UI, optimize in order:

1. structure
2. spacing
3. typography
4. color/theming
5. control choice
6. micro-interactions

## Step 5: Verify

Run smallest useful verification:

- existing build script (`npm run build`, `pnpm build`)

Name one manual UI check:

- config → spacing, section grouping, primary action placement
- page → toolbar/header rhythm, scroll behavior
- sidebar panel → density, collapsed/open behavior
- modal → focus, width, action hierarchy
- outlet → inline fit with surrounding CMS UI
- asset source → search/result rhythm, sizing
- inspector/full sidebar → `noAutoResizer`, two-pane behavior

## Cross-skill routing

- New plugin/project/folder → `datocms-plugin-scaffold`
- Existing plugin feature/hooks/parameters/surface behavior → `datocms-plugin-builder`
- Mixed tasks normal:
  - this skill for native DatoCMS UI
  - scaffold/builder for hooks/setup
- Standalone CMA outside plugin UI → `datocms-cma`
- Frontend site integration → `datocms-frontend-integrations`
