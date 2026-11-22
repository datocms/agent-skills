# Outlets

Skeleton assumes `datocms-react-ui/styles.css` imported in the entry and the template's `render` helper (`src/utils/render.tsx`); icons from the plugin's own set. Frame sizing and padding: `../surfaces.md`.

`renderItemFormOutlet` (above the record form, padding 10, 15px gap above) and `renderItemCollectionOutlet` (above the record list, padding 0, 20px between outlets). They must defer to the screen around them: one `Callout` (a fact about the current data, links only) or a compact `InfoList`; no `Pane`, `Page` or title bar. Collection outlets get no padding, so do not let content touch neighbours' edges by accident: a `Callout` already has its own box.

```tsx
import type { RenderItemFormOutletCtx } from 'datocms-plugin-sdk';
import Callout from 'datocms-react-ui/Callout';
import Canvas from 'datocms-react-ui/Canvas';

function Outlet({ ctx }: { ctx: RenderItemFormOutletCtx }) {
  if (!ctx.item) return null;
  return (
    <Callout tone="warning" title="Translation is out of date">
      The English text changed after the last translation.
    </Callout>
  );
}

export function renderItemFormOutlet(_id: string, ctx: RenderItemFormOutletCtx) {
  render(
    <Canvas ctx={ctx}>
      <Outlet ctx={ctx} />
    </Canvas>,
  );
}
```

An outlet that renders nothing still takes its frame's padding; when it does not apply, do not declare it for that model (SDK side).
