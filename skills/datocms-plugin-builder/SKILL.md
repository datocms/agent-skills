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

Default to augment mode. Move fast, inspect narrowly, and keep edits small. After the first grounding pass, stop rediscovering surfaces you already know.

## Step 1: Pick the path

### A. Initial surface discovery

Use this when the touched surface is not yet obvious.

1. Read `package.json` and confirm the plugin uses `datocms-plugin-sdk`.
2. Find the entry file that calls `connect()` (`src/main.tsx`, `src/index.tsx`, or equivalent).
3. Inspect the existing `connect()` call before changing any hook.
4. From the user request, identify the smallest touched surface:
   - config screen / plugin parameters
   - field extension or manual field extension config
   - sidebar panel, full sidebar, outlet, or custom page
   - dropdown action or lifecycle hook
   - modal, inspector, asset source, or upload sidebar
   - record presentation or structured text customization
   - dependency, build, or type fix around the plugin
5. Read only the direct path of the change:
   - the `connect()` entry file
   - the component or helper being edited
   - any imported file that must change too
6. Reuse the current file layout, naming, and UI patterns.

### B. Fast follow-up edit

Use this when prior context or direct repo inspection already makes the surface obvious.

1. Re-open only the touched render branch, component, and helper.
2. Confirm the hook pair, parameter shape, and permission needs still match.
3. Patch the existing branch/component/helper directly.
4. Skip broad rediscovery unless the code stops answering the question.

Do not repeat full discovery for obvious small edits like label renames, config cleanup, option removal, one-hook wiring, modal copy tweaks, or validation adjustments.

## Step 2: Ask only if the repo cannot answer

Ask zero questions by default.

Only ask when a wrong assumption would materially change behavior and the repo cannot resolve it, such as:

- which DatoCMS surface to use
- which model or field scope to target
- whether a new permission or external dependency is allowed
- whether the flow must stay inside SDK helpers or must use browser CMA calls

If no plugin project exists, or the user wants a brand-new plugin folder, switch to `datocms-plugin-scaffold`.

## Step 3: Load only the needed references

Start from project code.

For day-2/day-3 maintenance patterns, load `references/rapid-patterns.md` first. Then load only the direct surface reference you need.

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
- `references/sdk-architecture.md` only when the smaller references do not answer a deeper SDK or browser CMA question

Do not load the whole reference set for a small patch.

## Step 4: Patch minimally

Prefer editing the existing declaration, render switch, component, or helper over reorganizing the plugin.

- Do not move files unless it reduces total complexity or removes repeated surface glue.
- Add a new file only when it keeps the patch smaller or isolates shared normalization / browser-CMA work used by the touched flow.
- Keep dependency changes minimal and only add packages that the code actually uses.
- Preserve the existing UI style unless the user asked for a redesign.

Keep these guardrails:

- Inspect the existing `connect()` call before adding hooks.
- Keep exactly one top-level `connect()` call.
- Update declaration, render, execute, and package permissions together when a flow needs them.
- Wrap rendered UI in `<Canvas ctx={ctx}>`; use `noAutoResizer` only for pages, inspectors, and full-width sidebars.
- Use `switch` for ID-dispatched render hooks.
- Use `import type { ... }` for SDK types.
- Guard `ctx.item` before reading record data.
- Use `get(ctx.formValues, ctx.fieldPath)` in field extensions; use the localized-value patterns from `references/form-values.md` elsewhere.
- Use `useDeepCompareEffect` instead of `useEffect` when depending on `ctx` object properties.
- Keep `ctx.openModal()` parameters and `ctx.resolve()` values JSON-serializable.
- Normalize stored plugin parameters at the read/save boundary instead of rewriting the whole screen.
- Use `ctx.setParameters()` directly in `renderManualFieldExtensionConfigScreen`.
- Do not create editor field extensions for modular content, single block, or structured text fields; use addon extensions instead.
- Prefer `datocms-react-ui` and small local components for standard controls, spacing, and layout.
- Introduce heavier custom UI only for tool-like interactions that standard components do not express cleanly.
- Keep plugin screens and modals compact; avoid dashboard-style layouts, nested panels, decorative sections, or over-architecture.
- Use browser CMA flows only when SDK helpers are not enough; keep permission changes and runtime guards aligned.

### Maintenance shortcuts

- Config screen edits: normalize parameters once, keep save logic narrow, and use plain local state unless the form truly earns `react-final-form`.
- Asset source + modal: keep `assetSources` / `renderAssetSource` as the main path, use a modal only for a focused sub-step, and finish with `ctx.select()`.
- Upload sidebar + modal: keep the sidebar informational or single-action, open a modal for the focused edit, and resolve a minimal payload back.
- Height / resizing: trust `<Canvas ctx={ctx}>` first; add `initialHeight` for first paint and use `ResizeObserver` + `ctx.updateHeight()` only when async or custom layout changes require it.
- Browser CMA from plugin UI: prefer SDK helpers first; when the plugin must create uploads or records directly, use `@datocms/cma-client-browser` with `ctx.currentUserAccessToken`.
- Permission additions: add only the permissions the code path actually uses, then keep `package.json`, runtime guards, and user-visible affordances in sync.

## Step 5: Verify with the smallest useful check

Run the lightest existing verification that meaningfully covers the change:

- the repo's existing build script (`npm run build`, `pnpm build`, etc.) by default for code changes
- the most relevant test or typecheck command if the project already has one
- install dependencies with the repo's package manager before verifying if dependencies changed

If the repo has no suitable script, run the closest existing build, typecheck, or lint command instead.

Report:

1. what you changed
2. what you ran
3. the one manual DatoCMS check that still matters

That manual check should match the touched surface: the config save path, the modal resolve path, the asset/upload selection flow, the permission-gated branch, or the resizing behavior after async content loads.

## Cross-skill routing

- New plugin from scratch -> `datocms-plugin-scaffold`
- Native DatoCMS plugin UI design, layout restyling, or design-system alignment -> `datocms-plugin-design-system`
- Plugin-embedded browser CMA usage inside the iframe -> stay in this skill
- Standalone CMA scripts or schema work outside the plugin iframe -> `datocms-cma`
- Front-end preview, Content Link, or cache-tag work outside the plugin -> `datocms-frontend-integrations`
