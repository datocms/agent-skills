# DatoCMS Plugin

Use this guide only for DatoCMS dashboard plugin development. Its SDK, Canvas, hook, and design rules do not apply to ordinary websites or unrelated applications. Patch existing plugins in place; scaffold when the user asks for a new plugin or no plugin project exists for the requested work.

## Contents

- Workflow
- Reference map
- Guardrails
- Routing

## Workflow

1. Inspect silently:
   - `package.json`, package manager, scripts, plugin metadata, and installed SDK/UI versions
   - top-level `connect()` call, usually `src/main.tsx` or `src/index.tsx`
   - touched hook pair, render component, helper, CSS file, and current UI pattern
   - plugin-local `AGENTS.md` if present
2. Classify the request:
   - **Existing plugin:** package already exists and user asks to patch, add, maintain, fix, release-prep, or restyle. Default here.
   - **New plugin:** user asks to create/scaffold/bootstrap a plugin folder, or no plugin project exists.
   - **Design pass:** request mentions styling, layout, density, spacing, theme, dark mode, Canvas tokens, legacy CSS variables, hardcoded colors, forms, tables, panels, controls, or matching DatoCMS UI patterns.
   - **Mixed:** combine hook/scaffold work with design changes in one pass.
3. Ask only when inspection cannot resolve a behavior-changing choice:
   - plugin/folder name for a new scaffold
   - private vs marketplace plugin when package metadata changes
   - target model/field/surface when several are plausible
   - whether a new permission or dependency is allowed
   - whether direct browser CMA calls are required instead of SDK helpers
4. Load references after file inspection. Use the reference for the touched surface; do not load the full bundle.
5. Patch in place:
   - keep the existing file layout, package manager, scripts, naming, and UI structure
   - update paired hooks together: declaration + render, trigger + modal, dropdown declaration + execute handler
   - update permissions and package metadata in the same patch when the code path needs them
   - add dependencies only when the implementation imports them
6. Verify with the plugin's existing command. Prefer the build script; add typecheck, lint, or tests only when the project already defines them and they cover the change.
7. Report the patch, command result, and remaining DatoCMS check: config save, field render, modal resolve, asset select, permission branch, page navigation, or resize behavior.

## Reference map

### Common

| Need | Load |
| - | - |
| Follow-up maintenance shortcuts | `plugin/rapid-patterns.md` |
| Hook pairs, render conventions, sizing reminder | `plugin/connect-conventions.md` |
| Exact `connect()`, render helper, Canvas, frame sizing | `plugin/sdk-connect-and-frames.md` |
| Base `ctx`, entity repos, form values, browser CMA, endpoints, async errors | `plugin/sdk-context-and-cma.md` |
| Target code has no clear precedent | `plugin/current-plugin-patterns.md` |
| Plugin permission changes | `plugin/permissions.md` |
| Localized values, field paths, Structured Text Slate form values | `plugin/form-values.md` |

### New plugin

| Need | Load |
| - | - |
| Project files and package baseline | `plugin/project-scaffold.md` |
| First hook pair selection | `plugin/surface-starters.md` |

### Surfaces

| Surface | Load |
| - | - |
| Config screen | `plugin/config-screen.md` |
| Field extension | `plugin/field-extensions.md` |
| Sidebar panel or full record sidebar | `plugin/sidebar-panels.md` |
| Custom page | `plugin/custom-pages.md` |
| Dropdown action | `plugin/dropdown-actions.md` |
| Lifecycle hook | `plugin/lifecycle-hooks.md` |
| Modal | `plugin/modals.md` |
| Outlet | `plugin/outlets.md` |
| Inspector | `plugin/inspectors.md` |
| Asset source | `plugin/asset-sources.md` |
| Upload sidebar or upload panel | `plugin/upload-sidebars.md` |
| Structured Text customization | `plugin/structured-text.md` |
| Record presentation or picker query | `plugin/record-presentation.md` |

### Design

| Need | Load |
| - | - |
| Dark-mode-only migration | `plugin/dark-mode-upgrade.md` |
| First design pass | `plugin/design-foundations.md` + `plugin/design-datocms-react-ui-bridge.md` |
| Token/variable lookup | `plugin/design-tokens.md` |
| Layouts, pages, split views, toolbars | `plugin/design-layouts.md` |
| Forms, controls, settings | `plugin/design-forms-and-controls.md` |
| Dropdowns, tabs, tables, lists, notices | `plugin/design-navigation-feedback-and-data-display.md` |
| Surface shell rules | `plugin/design-plugin-surfaces.md` |
| Raw CSS fallback snippets | `plugin/design-raw-css-fallbacks.md` |

For design work, prefer public `datocms-react-ui` components when they match the required shape. Fall back to local React/CSS only when public components do not express the layout cleanly. Use Canvas tokens and variables directly; customize beyond them only for explicit product styling, vendor widgets, media treatments, data visualization, or effects they cannot express.

## Guardrails

- Keep exactly one top-level `connect()` call.
- Inspect existing `connect()` before adding hooks.
- Import `datocms-react-ui/styles.css` once in the plugin entry file.
- Wrap every rendered surface in `<Canvas ctx={ctx}>`.
- Use `<Canvas ctx={ctx} noAutoResizer>` for pages, inspectors, and full-width sidebars.
- Use `switch` for ID-dispatched render hooks.
- Use `import type { ... }` for SDK types.
- Guard `ctx.item` before reading saved-record data.
- Use `get(ctx.formValues, ctx.fieldPath)` in field extensions; use localized-value helpers elsewhere.
- Use deep-compare effects when depending on `ctx` object properties.
- Keep `ctx.openModal()` parameters and `ctx.resolve()` values JSON-serializable.
- Normalize stored plugin parameters at read/save boundaries.
- Use `ctx.setParameters()` directly in `renderManualFieldExtensionConfigScreen`.
- Do not create editor field extensions for modular content, single block, or Structured Text fields; use addon extensions instead.
- Prefer SDK helpers before browser CMA calls. If browser CMA is required, use `@datocms/cma-client-browser`, add only required permissions, and guard missing `ctx.currentUserAccessToken`.
- Keep modals, sidebars, and config screens compact.

## Routing

- Standalone CMA scripts, schema imports, record operations, or migrations outside a plugin iframe -> [CMA guide](cma.md) or [CLI guide](cli.md).
- Website preview, Content Link, draft mode, cache tags, frontend rendering, or framework setup -> [Frontend guide](frontend.md) or [Setup guide](setup.md).
- Content modeling decisions -> [Modeling guide](modeling.md).
- Content delivery GraphQL query work -> [CDA guide](cda.md).
