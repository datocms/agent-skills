---
name: datocms-plugin-builder
description: >-
  Modify existing DatoCMS plugins built with datocms-plugin-sdk and connect().
  Use when users ask to patch or maintain an existing plugin project: config
  screen edits, hook additions, field extension tweaks, sidebar/page/outlet
  changes, validation updates, settings cleanup, dependency fixes, or other
  day-to-day plugin maintenance. Prefer `datocms-plugin-scaffold` when starting
  a new plugin from scratch.
---

# DatoCMS Plugin Builder

Default to augment mode. Move fast, inspect narrow, keep edits small. After first grounding pass, stop rediscovering known surfaces.

## Step 1: Pick the path

### A. Initial surface discovery

Use when touched surface not obvious.

1. Read `package.json`, confirm uses `datocms-plugin-sdk`.
2. Find entry calling `connect()` (`src/main.tsx`, `src/index.tsx`).
3. Inspect existing `connect()` call before changing hook.
4. From request, identify smallest touched surface:
   - config screen / plugin parameters
   - field extension or manual field extension config
   - sidebar panel, full sidebar, outlet, or custom page
   - dropdown action or lifecycle hook
   - modal, inspector, asset source, or upload sidebar
   - record presentation or structured text customization
   - dependency, build, or type fix around the plugin
5. Read only direct change path:
   - the `connect()` entry file
   - component or helper being edited
   - any imported file that must change too
6. Reuse current file layout, naming, UI patterns.

### B. Fast follow-up edit

Use when prior context or direct repo inspection makes surface obvious.

1. Re-open only touched render branch, component, helper.
2. Confirm hook pair, parameter shape, permission needs still match.
3. Patch existing branch/component/helper directly.
4. Skip broad rediscovery unless code stops answering.

Do not repeat full discovery for obvious small edits.

## Step 2: Ask only if repo cannot answer

Ask zero questions by default.

Only ask when wrong assumption would materially change behavior and repo cannot resolve it:

- which DatoCMS surface to use
- which model or field scope to target
- whether new permission or external dependency allowed
- whether flow must stay inside SDK helpers or must use browser CMA calls

If no plugin project exists, or user wants brand-new plugin folder, switch to `datocms-plugin-scaffold`.

## Step 3: Load only needed references

Start from project code.

For day-2/day-3 maintenance patterns, load `references/rapid-patterns.md` first. Then load only direct surface reference you need.

### Surface references

- Config screen / plugin parameters -> `references/config-screen.md`
- Field extension / per-field config -> `references/field-extensions.md`
- Sidebar panel / full sidebar -> `references/sidebar-panels.md`
- Custom page -> `references/custom-pages.md`
- Dropdown actions -> `references/dropdown-actions.md`
- Lifecycle hooks -> `references/lifecycle-hooks.md`
- Modal -> `references/modals.md`
- Outlets -> `references/outlets.md`
- Inspector -> `references/inspectors.md`
- Asset source -> `references/asset-sources.md`
- Upload sidebar / panel -> `references/upload-sidebars.md`
- Structured text customization -> `references/structured-text.md`
- Record presentation -> `references/record-presentation.md`

### Load conditionally

- `references/connect-conventions.md` when wiring or adjusting hooks, render switches, modal flows, or frame sizing behavior
- `references/form-values.md` only when reading `ctx.formValues` outside field extensions, or when touching Structured Text / modular content values
- `references/permissions.md` when adding or removing plugin permissions, using `ctx.currentUserAccessToken`, or shipping permission-gated UI branches
- `references/sdk-architecture.md` only when smaller references do not answer deeper SDK or browser CMA question

Do not load whole reference set for small patch.

## Step 4: Patch minimally

Prefer editing existing declaration, render switch, component, or helper over reorganizing plugin.

- Do not move files unless it reduces total complexity or removes repeated surface glue.
- Add new file only when it keeps patch smaller or isolates shared normalization / browser-CMA work used by touched flow.
- Keep dependency changes minimal and only add packages code actually uses.
- Preserve existing UI style unless user asked for redesign.

Keep these guardrails:

- Inspect existing `connect()` call before adding hooks.
- Keep exactly one top-level `connect()` call.
- Update declaration, render, execute, and package permissions together when flow needs them.
- Wrap rendered UI in `<Canvas ctx={ctx}>`; use `noAutoResizer` only for pages, inspectors, and full-width sidebars.
- Use `switch` for ID-dispatched render hooks.
- Use `import type { ... }` for SDK types.
- Guard `ctx.item` before reading record data.
- Use `get(ctx.formValues, ctx.fieldPath)` in field extensions; use localized-value patterns from `references/form-values.md` elsewhere.
- Use `useDeepCompareEffect` instead of `useEffect` when depending on `ctx` object properties.
- Keep `ctx.openModal()` parameters and `ctx.resolve()` values JSON-serializable.
- Normalize stored plugin parameters at read/save boundary instead of rewriting whole screen.
- Use `ctx.setParameters()` directly in `renderManualFieldExtensionConfigScreen`.
- Do not create editor field extensions for modular content, single block, or structured text fields; use addon extensions instead.
- Prefer `datocms-react-ui` and small local components for standard controls, spacing, and layout.
- Introduce heavier custom UI only for tool-like interactions that standard components do not express cleanly.
- Keep plugin screens and modals compact; avoid dashboard-style layouts, nested panels, decorative sections, or over-architecture.
- Use browser CMA flows only when SDK helpers are not enough; keep permission changes and runtime guards aligned.

### Maintenance shortcuts

- Config screen edits: normalize parameters once, keep save logic narrow, use plain local state unless form truly earns `react-final-form`.
- Asset source + modal: keep `assetSources` / `renderAssetSource` as main path, use modal only for focused sub-step, finish with `ctx.select()`.
- Upload sidebar + modal: keep sidebar informational or single-action, open modal for focused edit, resolve minimal payload back.
- Height / resizing: trust `<Canvas ctx={ctx}>` first; add `initialHeight` for first paint and use `ResizeObserver` + `ctx.updateHeight()` only when async or custom layout changes require it.
- Browser CMA from plugin UI: prefer SDK helpers first; when plugin must create uploads or records directly, use `@datocms/cma-client-browser` with `ctx.currentUserAccessToken`.
- Permission additions: add only permissions code path actually uses, then keep `package.json`, runtime guards, and user-visible affordances in sync.

## Step 5: Verify with smallest useful check

Run lightest existing verification that meaningfully covers change:

- repo's existing build script (`npm run build`, `pnpm build`, etc.) by default for code changes
- most relevant test or typecheck command if project already has one
- install dependencies with repo's package manager before verifying if dependencies changed

If repo has no suitable script, run closest existing build, typecheck, or lint command instead.

Report:

1. what you changed
2. what you ran
3. the one manual DatoCMS check that still matters

That manual check should match touched surface: the config save path, the modal resolve path, the asset/upload selection flow, the permission-gated branch, or the resizing behavior after async content loads.

## Cross-skill routing

- New plugin from scratch -> `datocms-plugin-scaffold`
- Native DatoCMS plugin UI design, layout restyling, or design-system alignment -> `datocms-plugin-design-system`
- Plugin-embedded browser CMA usage inside iframe -> stay in this skill
- Standalone CMA scripts or schema work outside plugin iframe -> `datocms-cma`
- Front-end preview, Content Link, or cache-tag work outside plugin -> `datocms-frontend-integrations`
