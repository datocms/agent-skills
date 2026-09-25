# Current Plugin Patterns

Target has no precedent → mirror a similar plugin from <https://github.com/datocms/plugins> (one standalone package per folder). Copy patterns, not versions: keep the target's SDK/UI versions; fresh scaffolds follow `project-scaffold.md`.

- `import-export-schema` — settings-area pages, schema dropdown actions, lazy page chunks, browser CMA helpers
- `web-previews` — config screen, sidebar panel, full sidebar, inspector + panels, modal, `noAutoResizer` on imposed-size frames
- `shopify-product` — manual + override field extensions, modal flow, `onBoot` parameter/appearance migration
- `record-comments` — full record sidebar, browser CMA storage, `currentUserAccessToken` permission handling
- `bulk-operations-workbench` — role-gated top navigation tab, full-page work area, browser CMA utilities
- `unsplash` — `assetSources` + `renderAssetSource` + `ctx.select()` (pre-2.4 `default_field_metadata` shape; see `asset-sources.md`)
