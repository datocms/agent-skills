# Rapid Maintenance Patterns

Use for common follow-up edits before loading larger references.

## Quick picks

- Config screen + parameter cleanup -> normalize once at read/save boundary; see `config-screen.md` § `normalizeParameters` Pattern
- Asset source + modal -> let asset source own selection, use modal only for focused sub-step
- Upload sidebar + modal -> let sidebar own context, use modal only for focused edits
- Height issues -> trust `<Canvas ctx={ctx}>` first, then add `initialHeight` or `ctx.updateHeight()`; see `sdk-connect-and-frames.md` § Frame sizing
- Browser CMA in plugin UI -> prefer SDK helpers first, otherwise use `@datocms/cma-client-browser`; see `sdk-context-and-cma.md` § Browser CMA
- Permission change -> update `package.json`, runtime guard, and visible UI together; see `permissions.md`
- File layout -> do not reorganize unless total complexity drops

## Asset source + modal wiring

Keep the asset source as the primary surface.

1. Declare in `assetSources()`.
2. Render in `renderAssetSource()`.
3. If user needs one focused extra step, open a modal from the asset source.
4. Resolve a small payload back.
5. Finish with `ctx.select()` from the asset source flow.

Use a modal for focused choices like metadata, crop mode, or source-specific options. Do not turn the asset source into a multi-screen mini app.

Prefer `ctx.select()` over raw CMA upload creation when the flow only selects a file and creates an upload.

See `asset-sources.md` and `modals.md`.

## Upload sidebar / panel + modal wiring

Keep the sidebar responsible for the current upload context.

1. Read `ctx.upload` in the panel/sidebar.
2. Show compact metadata or one clear action.
3. Open a modal only for the focused edit or confirmation.
4. Resolve the minimal result back to the sidebar.
5. Apply the update, then show a notice or refresh path if needed.

Prefer a panel for informational or single-action UI. Use a full upload sidebar only when the interaction is truly tool-like.

See `upload-sidebars.md` and `modals.md`.

## Restraint in plugin UI

Start with existing `datocms-react-ui` components and the target plugin's current layout.

- Use `datocms-react-ui` for forms, buttons, layout primitives, loading states, and notices.
- Add local components only for thin composition.
- Introduce heavier custom UI only for tool-like interactions such as visual pickers, canvas tools, media grids, or drag/drop.
- Keep modals and internal screens compact.
- Avoid dashboard styling, decorative cards, nested panels, and extra abstractions that only restyle standard controls.

## When not to reorganize files

Do not split or rename files during follow-up edits unless it clearly reduces total complexity.

Good reasons to add a helper/file:

- one normalization function used by multiple touched surfaces
- one browser-CMA helper reused across components
- one modal component that keeps an existing surface smaller

Bad reasons:

- matching a preferred folder structure
- extracting a one-off wrapper with no reuse
- moving files during a small wiring or copy change
