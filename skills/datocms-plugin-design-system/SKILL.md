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

This skill turns plugin UI work into native-feeling DatoCMS UI work. Use it when the main problem is visual fit, structure, density, or styling — not when the main problem is wiring hooks or scaffolding a new plugin.

Typical requests this skill should own:

- “Make this plugin config screen feel native to DatoCMS”
- “Restyle this sidebar panel to match the DatoCMS dashboard”
- “Use raw CSS so this plugin page looks like a first-party DatoCMS screen”
- “Tighten the spacing and hierarchy in this plugin modal”
- “Choose `datocms-react-ui` components that best match the CMS UI”

## Step 1: Detect context silently

1. Identify whether the target is:
   - an existing plugin project
   - a greenfield plugin scaffold
   - a single screen or surface inside a larger plugin
2. Identify the touched surface:
   - config screen
   - page
   - sidebar panel
   - full sidebar
   - modal
   - outlet
   - inspector
   - asset source
3. Check whether the project already uses `datocms-react-ui`.
4. Check whether the requested change is primarily:
   - visual restyling
   - layout restructuring
   - control selection
   - theme alignment
   - density cleanup
5. Read the smallest existing UI slice before changing anything:
   - the entrypoint for the surface
   - the component being restyled
   - its local CSS or CSS module
   - `package.json` only if component availability is unclear

Ask nothing unless the repo cannot tell which surface or plugin repo is being changed.

## Step 2: Choose the implementation path

Use the narrowest path that keeps the result native.

### A. Public component path first

Choose this when `datocms-react-ui` already exposes the control or layout primitive you need.

Prefer it for:

- `Canvas`
- form wrappers and grouped settings
- standard fields
- buttons and button groups
- sections
- toolbar and header structure
- sidebar panels
- dropdowns
- spinners and loading states
- split layouts with `VerticalSplit` when available

### B. Raw React + CSS fallback

Choose this when the public package does not expose the needed layout or when exact CMS composition matters more than a near match.

Use raw code for:

- page shells that need CMS-like spacing but not a full custom component library
- list and table wrappers plus lightweight summary rows
- special empty states or info blocks
- split or two-pane layouts when the installed UI package version does not provide a fitting primitive
- surface-specific wrappers that only need theme variables and clean CSS

Do not import private CMS styles or private CMS class names into plugins. Recreate the structure with plugin-local CSS using Canvas variables.

## Step 3: Load the minimum references

Always start with:

- `references/foundations.md`
- `references/datocms-react-ui-bridge.md`

Load `references/source-map.md` only when the public docs plus the current plugin code are not enough and you need local visual calibration from a CMS checkout.

Then load only the touched reference:

- layout or page structure -> `references/layouts.md`
- forms, settings screens, controls -> `references/forms-and-controls.md`
- tabs, dropdowns, tables, notices, blank slates -> `references/navigation-feedback-and-data-display.md`
- hook-specific screen shape and sizing -> `references/plugin-surfaces.md`
- raw CSS implementation -> `references/raw-css-fallbacks.md`

Do not load the whole bundle for a small restyle.

## Step 4: Build native-looking UI

Keep these guardrails:

- Match DatoCMS density before inventing layout.
- Use project theme variables from `<Canvas>` instead of hardcoded brand colors.
- Prefer 1px borders, 3-5px radii, and subtle shadow only where the CMS uses it.
- Keep page widths, toolbar heights, section spacing, and form rhythm close to the CMS source of truth.
- Use one primary action per section or screen.
- Keep destructive actions isolated.
- Use labels above controls, hints below, and concise error text.
- Favor sections, toolbars, sidebars, and tables over decorative cards.
- Avoid hero blocks, KPI grids, ornamental copy, oversized rounded corners, heavy gradients, and dashboard filler.
- Keep custom CSS local to the plugin and variable-driven.
- If a public component is close but incomplete, compose around it instead of replacing all controls.

When a user asks for a plugin UI that “looks native”, optimize in this order:

1. structure
2. spacing
3. typography
4. color and theming
5. control choice
6. micro-interactions

## Step 5: Verify

Run the smallest useful verification in the target plugin repo:

- the repo's existing build script (`npm run build`, `pnpm build`, etc.) by default
- or the nearest existing typecheck or build command

Then name the one manual UI check that matters most for the surface:

- config screen -> spacing, section grouping, primary action placement
- page -> toolbar or header rhythm and scroll behavior
- sidebar panel -> density and collapsed or open behavior
- modal -> focus, width, and action hierarchy
- outlet -> inline fit with surrounding CMS UI
- asset source -> search or result rhythm and sizing
- inspector or full sidebar -> `noAutoResizer` and two-pane behavior if present

## Cross-skill routing

- New plugin project or new plugin folder -> `datocms-plugin-scaffold`
- Existing plugin feature work, hook wiring, parameter logic, or surface behavior -> `datocms-plugin-builder`
- Mixed tasks are normal:
  - use this skill for native DatoCMS UI choices
  - pair with scaffold or builder for hook wiring or project setup
- Standalone CMA work outside plugin UI -> `datocms-cma`
- Front-end site integration work -> `datocms-frontend-integrations`
