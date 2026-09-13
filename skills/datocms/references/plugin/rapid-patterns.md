# Rapid Maintenance Patterns

Use for common follow-up edits before loading larger references.

## Contents

- Quick picks
- Config screen + normalized parameters
- Asset source + modal wiring
- Upload sidebar / panel + modal wiring
- Modal height and resizing
- Browser CMA from plugin UI
- Permission additions that stay aligned
- Restraint in plugin UI
- When not to reorganize files

## Quick picks

- Config screen + parameter cleanup -> normalize once at read/save boundary
- Asset source + modal -> let asset source own selection, use modal only for focused sub-step
- Upload sidebar + modal -> let sidebar own context, use modal only for focused edits
- Height issues -> trust `<Canvas ctx={ctx}>` first, then add `initialHeight` or `ctx.updateHeight()`
- Browser CMA in plugin UI -> prefer SDK helpers first, otherwise use `@datocms/cma-client-browser`
- Permission change -> update `package.json`, runtime guard, and visible UI together
- File layout -> do not reorganize unless total complexity drops

## Config screen + normalized parameters

Keep parameter cleanup at the boundary.

```ts
type Parameters = {
  apiKey: string;
  mode: 'compact' | 'full';
};

function normalizeParameters(raw: Record<string, unknown> | null | undefined): Parameters {
  return {
    apiKey: typeof raw?.apiKey === 'string' ? raw.apiKey : '',
    mode: raw?.mode === 'full' ? 'full' : 'compact',
  };
}
```

- Read with `normalizeParameters(ctx.plugin.attributes.parameters as Record<string, unknown>)`.
- Save `normalizeParameters(values)` so older shapes get rewritten once.
- Use plain local state for small forms.
- Use `react-final-form` only when validation, dirty tracking, or many fields justify it.
- Keep read-only permission branches simple; do not fork the screen into a second design.

See `config-screen.md` for full examples.

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

## Modal height and resizing

Default to normal iframe behavior.

- Self-resizing surfaces already work with `<Canvas ctx={ctx}>`.
- Use `initialHeight` to avoid cramped first paint when modal/panel loads async data.
- Use `ctx.updateHeight()` only when content height changes after render and auto-resize is not enough.
- Use `noAutoResizer` only for imposed-size surfaces like pages, inspectors, and full-width sidebars.

Typical cases for manual height updates:

- async search results or fetched previews
- image/media dimensions discovered after load
- custom collapse/expand outside normal flow
- DOM measured by a tool-like component

```tsx
import { useEffect, useRef } from 'react';

function AutoHeightBlock({ ctx, children }: { ctx: { updateHeight: () => void }; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(() => ctx.updateHeight());
    observer.observe(ref.current);
    ctx.updateHeight();

    return () => observer.disconnect();
  }, [ctx]);

  return <div ref={ref}>{children}</div>;
}
```

If the surface already renders cleanly with `Canvas`, do not add manual sizing code.

See `connect-conventions.md` for imposed-size vs self-resizing surfaces.

## Browser CMA from plugin UI

Treat as normal plugin-maintenance pattern.

Use SDK helpers first:

- `ctx.select()`
- `ctx.setFieldValue()`
- `ctx.updatePluginParameters()`
- `ctx.editUpload()` / `ctx.selectUpload()`

Use browser CMA only when plugin UI must create or update records/uploads directly and SDK helper is not enough.

```ts
import { buildClient } from '@datocms/cma-client-browser';

if (!ctx.currentUserAccessToken) {
  await ctx.alert('This action requires API access.');
  return;
}

const client = buildClient({
  apiToken: ctx.currentUserAccessToken,
  environment: ctx.environment,
});
```

- Add `currentUserAccessToken` permission only when that code path exists.
- Check the token at runtime every time.
- Keep CMA work in a small helper when reused or when it keeps the UI component smaller.
- Catch errors and report them with `ctx.alert()`.
- Prefer asset-source `ctx.select()` over CMA upload creation when possible.

See `sdk-context-and-cma.md` for the full browser CMA pattern.

## Permission additions that stay aligned

When a change needs a new permission:

1. Add only the required permission in `datoCmsPlugin.permissions` in `package.json`.
2. Guard the runtime path (`if (!ctx.currentUserAccessToken) return ...`).
3. Keep the UI honest: disable or hide the action when the permission is unavailable.
4. Verify the action still degrades cleanly for roles without that permission.

Do not add permissions for unused future flows.

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
