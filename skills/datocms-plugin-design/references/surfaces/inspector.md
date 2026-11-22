# Inspector

Skeleton assumes `datocms-react-ui/styles.css` imported in the entry and the template's `render` helper (`src/utils/render.tsx`); icons from the plugin's own set. Frame sizing and padding: `../surfaces.md`.

`renderInspector`: Fixed frame on the left of a split (default 30% wide, min 550px); the right side shows a record list, a record editor or `renderInspectorPanel`, switched by `ctx.setInspectorMode`. Shell: `Main` > `Pane` with `Pane.Header`. `ctx.location` marks the active `Link`. `renderInspectorPanel` is also Fixed, padding 0, a frame of its own with no `Main`: a `Pane` whose `Pane.Header.Title` has no `level`, or `SidebarPanel`s.

```tsx
import type { RenderInspectorCtx } from 'datocms-plugin-sdk';
import Button from 'datocms-react-ui/Button';
import Canvas from 'datocms-react-ui/Canvas';
import Main from 'datocms-react-ui/Main';
import Pane from 'datocms-react-ui/Pane';

function Inspector({ ctx }: { ctx: RenderInspectorCtx }) {
  return (
    <Main>
      <Pane
        ariaLabel="Pages"
        header={
          <Pane.Header>
            <Pane.Header.Title level={1}>Pages</Pane.Header.Title>
          </Pane.Header>
        }
      >
        <Button label="Show records" onClick={() => ctx.setInspectorMode({ type: 'itemList' })} />
      </Pane>
    </Main>
  );
}

export function renderInspector(_id: string, ctx: RenderInspectorCtx) {
  render(
    <Canvas ctx={ctx}>
      <Inspector ctx={ctx} />
    </Canvas>,
  );
}
```
