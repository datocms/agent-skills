# Current Plugin Patterns

Use this only when implementation style is unclear from the target plugin. Inspect the local examples directly when available; do not copy blindly.

## Repo shape

- Standalone plugin folders, not one workspace.
- Each plugin owns its own `package.json`, lockfile, scripts, and build setup.
- Run commands from the touched plugin folder.
- Default validation is that plugin's existing build script.
- Check plugin-local `AGENTS.md` before editing a specific plugin.

## Current baseline

Most maintained plugins use:

- TypeScript, React, Vite
- `datocms-plugin-sdk` 2.2.x
- `datocms-react-ui` 2.2.x
- `src/main.tsx` with one `connect()` call
- `src/utils/render.tsx` helper built with `createRoot`
- one entrypoint component per render hook when the plugin has visible UI
- CSS Modules or plugin-local CSS, not shared runtime code
- `npm run build` as the minimum code-change check

Use the target plugin's versions and package manager first. Use these baselines only for fresh scaffolds or when the target has no precedent. Check package metadata or installed packages for the current SDK/UI version before scaffolding.

## Examples worth inspecting

- Schema import/export plugin: settings-area pages, schema dropdown actions, lazy page chunks, graph-heavy UI, browser CMA helpers, semantic design tokens.
- Web previews plugin: config screen, sidebar panel, full sidebar, inspector, inspector panels, modal, persisted width, `noAutoResizer` on imposed-size frames.
- Shopify product plugin: config screen, manual and override field extensions, modal flow, `onBoot` parameter/appearance migration, compact field UI.
- Record comments plugin: full record sidebar, config screen, browser CMA storage setup, permission handling, richer local component structure.
- Bulk operations workbench plugin: role-gated top navigation tab, full page work area, config screen, browser CMA utilities.
- Asset source plugins: `assetSources`, `renderAssetSource`, source-specific config, and `ctx.select()` selection flows.

## Pattern notes

- Lazy-load large page entrypoints when a plugin has multiple heavy surfaces.
- Keep `connect()` declarative; move complex work into helpers or entrypoints.
- Prefer SDK helpers (`ctx.setFieldValue`, `ctx.updatePluginParameters`, `ctx.select`, `ctx.openModal`) before browser CMA.
- When browser CMA is required, isolate client creation and guard missing `ctx.currentUserAccessToken`.
- Keep package permissions aligned with code paths that use them.
- Use semantic `--color--...` tokens for new CSS; legacy tokens may exist in older plugins but should not spread.
- Match the target plugin's existing UI structure unless the request is a design cleanup.
