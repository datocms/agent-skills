---
name: datocms-plugin-scaffold
description: >-
  Scaffold brand-new DatoCMS plugin projects with datocms-plugin-sdk and
  connect(). Use when users want to create a new plugin folder from scratch,
  bootstrap the Vite/React package structure, choose initial plugin surfaces
  such as field extensions, config screens, sidebars, pages, asset sources, or
  dropdown actions, and wire the first hook implementation. Prefer
  `datocms-plugin-builder` for edits to an existing plugin project.
---

# DatoCMS Plugin Scaffold

Create smallest working first version of new plugin. Keep initial scaffold narrow, hand later edits to `datocms-plugin-builder`.

## Step 1: Confirm scaffold mode

Silently inspect current directory.

Check for existing plugin (`package.json` with `datocms-plugin-sdk`, `connect()` entrypoint, Vite config). If exists and request is edit, switch to `datocms-plugin-builder`. Infer starting surface before asking.

## Step 2: Ask only for missing essentials

Ask only when unclear:

- plugin/folder name
- private vs marketplace
- initial surface/target scope (if changes scaffold)
- `currentUserAccessToken`/external API needs

Skip if already clear.

## Step 3: Load the small reference set

Load:

- `references/project-scaffold.md`
- `references/surface-starters.md`

Use for first implementation. Route expansion/maintenance to `datocms-plugin-builder`.

## Step 4: Scaffold the project

Create plugin dir in cwd. Use Vite/React layout from `references/project-scaffold.md`. Add only needed entrypoints. Keep metadata minimal for private plugins. For marketplace: set npm name, keywords, homepage, permissions. Add only required optional dependencies. Install before verification.

## Step 5: Wire the first surface

Use `references/surface-starters.md` for declaration, render, execute hooks.

Guardrails:

- One top-level `connect()`
- Wrap UI in `<Canvas ctx={ctx}>`; use `noAutoResizer` for pages/inspectors/full-width sidebars
- Use `switch` for ID-dispatched render hooks
- Use `import type { ... }` for SDK types
- Keep `ctx.openModal()` params and `ctx.resolve()` JSON-serializable
- No editor field extensions for modular content/single block/structured text
- Stop at smallest working first version

## Step 6: Verify

Install deps with chosen package manager. Run build. Tell user dev command and how to install local plugin. Name the single most important manual surface check.

## Cross-skill routing

- Existing plugin maintenance -> `datocms-plugin-builder`
- Native UI design/layout restyling -> `datocms-plugin-design-system`
- Standalone CMA scripts/schema work -> `datocms-cma`
