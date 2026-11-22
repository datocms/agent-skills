# Custom page

Skeleton assumes `datocms-react-ui/styles.css` imported in the entry and the template's `render` helper (`src/utils/render.tsx`); icons from the plugin's own set. Frame sizing and padding: `../surfaces.md`.

`renderPage`: Fixed frame, padding 0, the plugin's own page. `Main` near the route; a `Pane` fills the frame; `Page` inside for settings-like content. A list of elements: `ListDetail` (facts to scan, `Patterns/ListAndDetail`) or `ListFormPage` (one form per element, `Patterns/ListAndForm`); both route rows by URL, so a plugin passes a stable `NavigationAdapter` to Canvas `navigation` (Canvas page, "Navigation"); `ListFormPage` also needs the sized wrapper.

```tsx
import type { RenderPageCtx } from 'datocms-plugin-sdk';
import Canvas from 'datocms-react-ui/Canvas';
import InfoList from 'datocms-react-ui/InfoList';
import Main from 'datocms-react-ui/Main';
import { Page } from 'datocms-react-ui/Page';
import Pane from 'datocms-react-ui/Pane';

function ReportPage() {
  return (
    <Main>
      <Pane
        ariaLabel="Usage report"
        header={
          <Pane.Header>
            <Pane.Header.Title level={1}>Usage report</Pane.Header.Title>
          </Pane.Header>
        }
      >
        <Page>
          <Page.Content>
            <Page.Group title="This month">
              <InfoList>
                <InfoList.Row title="Records synced">1,204</InfoList.Row>
              </InfoList>
            </Page.Group>
          </Page.Content>
        </Page>
      </Pane>
    </Main>
  );
}

export function renderPage(_pageId: string, ctx: RenderPageCtx) {
  render(
    <Canvas ctx={ctx}>
      <ReportPage />
    </Canvas>,
  );
}
```

Empty section: only an overview `BlankSlate` with `titleLevel={1}`, via `ListOrOverview`. Loading: spinner only before the first load. Mistakes: raw `<h1>`/`<main>`; a hand-built split (use `SplitPane` or the patterns); `Pane.Header.Title` without `level` in `Main` (then it is not a heading).
