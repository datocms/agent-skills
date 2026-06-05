---
name: datocms-plugin
description: >-
  Build, scaffold, maintain, or restyle DatoCMS plugins built with
  datocms-plugin-sdk, datocms-react-ui, and connect(). Use when users ask to
  create a new plugin project, patch an existing plugin, add or adjust plugin
  hooks, field extensions, config screens, sidebars, pages, modals, asset
  sources, dropdown actions, lifecycle hooks, browser CMA flows, plugin
  permissions, package metadata, dark mode upgrades, semantic color-token
  migrations, or make plugin UI feel native to the DatoCMS dashboard. Route
  standalone CMA scripts to datocms-cma and frontend website integrations to
  datocms-frontend-integrations.
---

# DatoCMS Plugin

Work repo-first. Inspect current plugin shape before changing it. Use the smallest implementation that fits the requested surface and keeps the plugin native to DatoCMS.

## Step 1: Classify the request

Silently inspect cwd and nearby files:

1. Read `package.json` if present.
2. Confirm whether the project uses `datocms-plugin-sdk`, `datocms-react-ui`, Vite, React, and `datoCmsPlugin` metadata.
3. Find the top-level `connect()` call, usually in `src/main.tsx` or `src/index.tsx`.
4. Identify requested surface: config screen, field extension, sidebar, page, modal, asset source, upload sidebar, outlet, inspector, dropdown action, lifecycle hook, record presentation, Structured Text customization, package metadata, permissions, or UI restyle.
5. Reuse current file layout, naming, package manager, scripts, and UI patterns.

Choose mode:

- **Existing plugin:** package already exists and user asks to patch, add, maintain, fix, release-prep, or restyle. Default here.
- **New plugin:** user asks to create/scaffold/bootstrap a new plugin folder or no plugin project exists.
- **Design pass:** request mentions native UI, design system, styling, layout, density, spacing, theme, dark mode, semantic tokens, legacy CSS variables, hardcoded colors, polish, dashboard fit, forms, tables, panels, or controls.
- **Mixed:** normal; combine hook/scaffold work with design guidance in one pass.

Use local reference repos only as read-only calibration when available:

- `/Users/marcelofinamorvieira/datoCMS/dev/plugins-sdk` for current SDK/runtime and public component source.
- `/Users/marcelofinamorvieira/datoCMS/pluginsmove/plugins` for current DatoCMS plugin implementation patterns.

Do not modify those reference repos unless the user explicitly targets them.

## Step 2: Ask only for missing essentials

Ask zero questions by default. Ask only when repo inspection cannot resolve a behavior-changing choice:

- plugin/folder name for a new scaffold
- private vs marketplace plugin when package metadata changes
- target model/field/surface if multiple are plausible
- whether a new permission or external dependency is allowed
- whether direct browser CMA calls are required instead of SDK helpers

## Step 3: Load the minimum references

Start with project code. Load only the direct reference needed.

### Common references

- Follow-up maintenance shortcuts -> `references/rapid-patterns.md`
- Hook wiring, render pairs, sizing -> `references/connect-conventions.md`
- Full SDK/runtime details -> `references/sdk-architecture.md`
- Current maintained plugin patterns -> `references/current-plugin-patterns.md` when target code has no clear precedent
- Permissions and access token -> `references/permissions.md`
- Form values, localized values, Structured Text Slate shape -> `references/form-values.md`

### New plugin references

- Project files and package baseline -> `references/project-scaffold.md`
- First hook pair selection -> `references/surface-starters.md`

### Surface references

- Config screen -> `references/config-screen.md`
- Field extension -> `references/field-extensions.md`
- Sidebar panel or full record sidebar -> `references/sidebar-panels.md`
- Custom page -> `references/custom-pages.md`
- Dropdown action -> `references/dropdown-actions.md`
- Lifecycle hook -> `references/lifecycle-hooks.md`
- Modal -> `references/modals.md`
- Outlet -> `references/outlets.md`
- Inspector -> `references/inspectors.md`
- Asset source -> `references/asset-sources.md`
- Upload sidebar or upload panel -> `references/upload-sidebars.md`
- Structured Text customization -> `references/structured-text.md`
- Record presentation or picker query -> `references/record-presentation.md`

### Design references

Always start design work with:

- `references/design-foundations.md`
- `references/design-datocms-react-ui-bridge.md`

Then load only the touched visual area:

- Dark mode upgrades, legacy CSS variables, hardcoded colors, `ctx.theme`, or `ctx.colorScheme` -> `references/dark-mode-upgrade.md`
- Layouts, pages, split views, toolbars -> `references/design-layouts.md`
- Forms, controls, settings -> `references/design-forms-and-controls.md`
- Dropdowns, tabs, tables, lists, notices -> `references/design-navigation-feedback-and-data-display.md`
- Surface-specific shell guidance -> `references/design-plugin-surfaces.md`
- Raw CSS fallback patterns -> `references/design-raw-css-fallbacks.md`
- Local CMS source map -> `references/design-source-map.md` only when public docs and plugin code are insufficient

## Step 4: Implement narrowly

### Existing plugin mode

- Patch the existing declaration, render switch, component, helper, or CSS module directly.
- Do not reorganize files during small changes.
- Add a helper/file only when it reduces total complexity or is reused by touched surfaces.
- Preserve package manager and scripts from the plugin being edited.
- Install or change dependencies only when code uses them.

### New plugin mode

- Create the smallest working Vite/React plugin version.
- Add only needed entrypoints and dependencies.
- Prefer current `datocms-plugin-sdk`, `datocms-react-ui`, React, Vite, and TypeScript patterns found in nearby maintained plugins unless user requests otherwise.
- For marketplace plugins: use `datocms-plugin-` package naming, `datocms-plugin` keyword, homepage, and minimal `datoCmsPlugin.permissions`.
- For private plugins: keep package metadata minimal and note that permissions are granted from the installed plugin settings.

### Design mode

- Prefer `datocms-react-ui` public components when they match the required shape.
- Fall back to local React/CSS only when public components do not express the layout cleanly.
- Use `<Canvas>` semantic color tokens (`--color--surface`, `--color--ink`, `--color--border`, `--color--primary--surface`, `--color--focus--outline`, etc.) and `ctx.colorScheme` for non-CSS theme branching.
- Avoid hardcoded palettes, private CMS classes, large rounded shells, hero blocks, KPI grids, decorative cards, heavy gradients, and dashboard filler.
- Match DatoCMS structure first: density, spacing, typography, border hierarchy, then color.

## Guardrails

- Keep exactly one top-level `connect()` call.
- Inspect existing `connect()` before adding hooks.
- Update declaration, render, execute, permissions, and package metadata together when the flow needs all of them.
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

## Step 5: Verify

Run the lightest check that covers the change:

- existing plugin build script by default (`npm run build`, `pnpm build`, etc.)
- typecheck, lint, or tests when the plugin already defines them and the change touches covered logic
- install dependencies with the existing package manager before validating if dependencies changed

Report:

1. what changed
2. what command ran
3. the one manual DatoCMS check that still matters: config save, field render, modal resolve, asset select, permission branch, page navigation, or resize behavior.

## Routing

- Standalone CMA scripts, schema imports, record operations, or migrations outside a plugin iframe -> `datocms-cma` or `datocms-cli`.
- Website preview, Content Link, draft mode, cache tags, frontend rendering, or framework setup -> `datocms-frontend-integrations` or `datocms-setup`.
- Content modeling decisions -> `datocms-content-modeling`.
- Content delivery GraphQL query work -> `datocms-cda`.
