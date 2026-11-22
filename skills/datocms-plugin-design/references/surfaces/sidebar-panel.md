# Sidebar panel

Skeleton assumes `datocms-react-ui/styles.css` imported in the entry and the template's `render` helper (`src/utils/render.tsx`); icons from the plugin's own set. Frame sizing and padding: `../surfaces.md`.

Record (`renderItemFormSidebarPanel`) and asset (`renderUploadSidebarPanel`) panels: the host wraps the frame in its own `SidebarPanel`, titled with the panel's `label`, with collapse and a stored open state (`startOpen` in the hook declaration). Draw only the content: no `SidebarPanel`, no title, no heading. Facts → `InfoList`; a list of rows → `RowList`; nothing to show → a short `EmptySlot`; one action → a `Button` at default size.

```tsx
import type { RenderItemFormSidebarPanelCtx } from 'datocms-plugin-sdk';
import Button from 'datocms-react-ui/Button';
import Canvas from 'datocms-react-ui/Canvas';
import InfoList from 'datocms-react-ui/InfoList';
import SmartDate from 'datocms-react-ui/SmartDate';

function StatsPanel({ ctx }: { ctx: RenderItemFormSidebarPanelCtx }) {
  const updatedAt = ctx.item?.meta.updated_at;
  return (
    <>
      <InfoList>
        <InfoList.Row title="Model">{ctx.itemType.attributes.name}</InfoList.Row>
        <InfoList.Row title="Updated">{updatedAt ? <SmartDate value={updatedAt} /> : 'Not saved yet'}</InfoList.Row>
      </InfoList>
      <Button label="Refresh stats" onClick={() => undefined} />
    </>
  );
}

export function renderItemFormSidebarPanel(_id: string, ctx: RenderItemFormSidebarPanelCtx) {
  render(
    <Canvas ctx={ctx}>
      <StatsPanel ctx={ctx} />
    </Canvas>,
  );
}
```

Mistakes: a `SidebarPanel` or heading inside (two titles, two chevrons); wide layouts (the sidebar is narrow: `InfoList` stacks, `RowList` rows); a second primary button.
