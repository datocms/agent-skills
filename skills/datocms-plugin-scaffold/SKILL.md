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

Create the smallest working first version of a new plugin project. Keep the initial scaffold narrow, then hand later incremental edits to `datocms-plugin-builder`.

## Step 1: Confirm scaffold mode

Silently inspect the current directory.

1. Check for an existing plugin project (`package.json` with `datocms-plugin-sdk`, a `connect()` entrypoint, and Vite config).
2. If a plugin already exists and the request is an edit, switch to `datocms-plugin-builder`.
3. Infer the likely starting surface from the request before asking questions.

## Step 2: Ask only for missing essentials

Ask only when the request or repo does not already answer them:

- plugin name or folder name
- private vs marketplace distribution
- initial surface and target model or field scope when that changes the scaffold
- whether the plugin needs `currentUserAccessToken` or other external API access

Skip the question round if those points are already clear enough to scaffold safely.

## Step 3: Load the small reference set

Always load:

- `references/project-scaffold.md`
- `references/surface-starters.md`

Stay with these files for the first implementation. Route later feature expansion or maintenance work to `datocms-plugin-builder`.

## Step 4: Scaffold the project

- Create the plugin directory inside the current working directory.
- Use the standard Vite/React layout from `references/project-scaffold.md`.
- Add only the entrypoints the requested surfaces need.
- Keep package metadata minimal for private plugins.
- For marketplace plugins, set the npm package name, keywords, homepage, and permissions correctly.
- Add only the optional dependencies required by the first implementation.
- Install dependencies before verification.

## Step 5: Wire the first surface

Use `references/surface-starters.md` to choose the declaration, render, and execute hooks.

Keep these starter guardrails:

- Keep exactly one top-level `connect()` call.
- Wrap rendered UI in `<Canvas ctx={ctx}>`; use `noAutoResizer` for pages, inspectors, and full-width sidebars.
- Use `switch` for ID-dispatched render hooks.
- Use `import type { ... }` for SDK types.
- Keep `ctx.openModal()` parameters and `ctx.resolve()` values JSON-serializable.
- Do not create editor field extensions for modular content, single block, or structured text fields.
- Stop at the smallest working first version. Do not pre-build extra surfaces or settings the user did not ask for.

## Step 6: Verify

1. Install dependencies with the selected package manager.
2. Run the build script with that same package manager.
3. Tell the user which dev command to run with that package manager.
4. Tell the user how to install the local plugin in DatoCMS and name the single manual surface check that matters most.

## Cross-skill routing

- Existing plugin maintenance -> `datocms-plugin-builder`
- Native DatoCMS plugin UI design, layout restyling, or design-system alignment -> `datocms-plugin-design-system`
- Standalone CMA scripts or schema work outside the plugin iframe -> `datocms-cma`
