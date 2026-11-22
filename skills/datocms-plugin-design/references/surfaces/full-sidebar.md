# Full sidebar

Skeleton assumes `datocms-react-ui/styles.css` imported in the entry and the template's `render` helper (`src/utils/render.tsx`); icons from the plugin's own set. Frame sizing and padding: `../surfaces.md`.

`renderItemFormSidebar` / `renderUploadSidebar`: Fixed frame, padding 0, scrolls. A stack of `SidebarPanel`s, each `titleLevel={2}` (no level-2 heading above), state kept with `useLocalStorageSidebarPanelOpen('<plugin-name>.<panel>', true)`.

```tsx
import type { RenderItemFormSidebarCtx } from 'datocms-plugin-sdk';
import Canvas from 'datocms-react-ui/Canvas';
import InfoList from 'datocms-react-ui/InfoList';
import SidebarPanel, { useLocalStorageSidebarPanelOpen } from 'datocms-react-ui/SidebarPanel';

function Sidebar({ ctx }: { ctx: RenderItemFormSidebarCtx }) {
  const [open, setOpen] = useLocalStorageSidebarPanelOpen('acme-seo.summary', true);
  return (
    <>
      <SidebarPanel title="Summary" titleLevel={2} collapse={{ open, onToggle: setOpen }}>
        <InfoList>
          <InfoList.Row title="Model">{ctx.itemType.attributes.name}</InfoList.Row>
        </InfoList>
      </SidebarPanel>
      <SidebarPanel title="Checks" titleLevel={2}>
        <SidebarPanel.Blank message="No checks yet" />
      </SidebarPanel>
    </>
  );
}

export function renderItemFormSidebar(_id: string, ctx: RenderItemFormSidebarCtx) {
  render(
    <Canvas ctx={ctx}>
      <Sidebar ctx={ctx} />
    </Canvas>,
  );
}
```
