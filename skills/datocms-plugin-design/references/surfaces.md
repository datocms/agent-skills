# Plugin surfaces

One minimal skeleton per surface, with frame facts no docs page states. Each skeleton assumes `import 'datocms-react-ui/styles.css'` in the entry and the plugin template's `render` helper (`src/utils/render.tsx`); SDK wiring (`connect`, hook declarations, reading and saving data) is in `../../datocms-plugin/SKILL.md`. Icons come from the plugin's own set.

## Contents

- Frame facts
- Config screen
- Field editor
- Field addon
- Field extension config screen
- Sidebar panel
- Full sidebar
- Custom page
- Modal
- Inspector
- Outlets
- Asset source
- Dropdown actions

## Frame facts

| Surface | Hook | Frame | `bodyPadding` | Host chrome around the frame |
| - | - | - | - | - |
| Config screen | `renderConfigScreen` | Auto | 30 | Plugin page; "Plugin settings" section title (hairlines) right above |
| Field editor | `renderFieldExtension` | Auto | 10 | Field label, hint, label menu, errors |
| Field addon | `renderFieldExtension` | Auto | 10 (+10 above) | Under the field's editor |
| Field extension config | `renderManualFieldExtensionConfigScreen` | Auto | 10 | Field appearance form with its own Save |
| Record sidebar panel | `renderItemFormSidebarPanel` | Auto | 10 | `SidebarPanel` with the panel `label` as title, collapse, stored open state |
| Asset sidebar panel | `renderUploadSidebarPanel` | Auto | 10 | Same as record sidebar panel |
| Record full sidebar | `renderItemFormSidebar` | Fixed | 0 | — |
| Asset full sidebar | `renderUploadSidebar` | Fixed | 0 | — |
| Custom page | `renderPage` | Fixed | 0 | — (document title = tab label) |
| Modal | `renderModal` | Auto; `width: 'fullWidth'` → Fixed | 20; fullWidth 0 | Dialog box, `title`, cross (unless `closeDisabled`); fullWidth ignores `title` |
| Inspector | `renderInspector` | Fixed | 0 | Left side of a split, right side shows records, a record or the inspector panel |
| Inspector panel | `renderInspectorPanel` | Fixed | 0 | Right side of the inspector split |
| Record form outlet | `renderItemFormOutlet` | Auto | 10 (+15 above) | Above the record form |
| Collection outlet | `renderItemCollectionOutlet` | Auto | 0 | Above the record list; 20px between outlets |
| Asset source | `renderAssetSource` | Auto | 20 | Dialog titled "Pick asset from {source name}" with the source icon and a cross |

- **Auto** frames: the ctx has `startAutoResizer`/`updateHeight`/`setHeight`; Canvas starts the resizer, which measures the bottom of every element in `body` and sends `setHeight`. The iframe has `scrolling="no"`: whatever passes its height is clipped. Initial height is the hook's `initialHeight` (else 35px) plus vertical padding, so declare a realistic `initialHeight` to avoid a jump. Keep the resizer on; `noAutoResizer` only when the plugin calls `ctx.setHeight` itself.
- **Fixed** frames: `ImposedSizePluginFrameCtx`, no sizing methods; the iframe fills its host area (`position: absolute; height: 100%`) and scrolls. Layout shells that fill a box (`Pane`, `ListDetail.Page`) belong here.
- **Padding:** Canvas applies `ctx.bodyPadding` as its own padding; the host gives the frame a negative margin of the same size, so the content's edge lines up with the host's content. Do not add an outer padding of your own.
- `Pane` and `ListDetail.Page` are `position: absolute; inset: 0`; with nothing positioned between them and Canvas they fill the frame. In an Auto frame they grow it to the full content height (the resizer measures descendants), so there they are pointless.
- `SplitPane` and `ListFormPage` (a `SplitPane` inside) are `height: 100%`; Canvas sets no height, so wrap them: `<div style={{ position: 'relative', height: '100vh' }}>`.
- **Dimming and layers:** dialogs over the page come from `ctx.openModal` with the host's backdrop; never build one. A veil over content while it saves is `Spinner.Overlay` (its veil paints `--color--overlay--surface`); react-ui's own `Portal`/menus get the tokens again from Canvas.
- **Third-party widgets** (charts, editors, maps) that portal outside Canvas or need concrete values: pass them `ctx.cssDesignTokens['--color--…']` values, and re-theme on `ctx.colorScheme` changes; never hard-code a palette.
- Embedded surfaces (config screen, field, sidebar panel, outlet, modal, asset source) sit inside a host page that already has its landmarks: use no `Main` there. `Main` goes in surfaces that are a page of their own: `renderPage`, `renderInspector`.

## Config screen

Host draws "Plugin settings" (a section title between hairlines) right above the frame, inside a page column. Starting with `Page.SectionTitle`, a heading or a divider stacks a second title under it. Open with the fields (or one short description sentence that reads without a title); `Page.SectionTitle` only from the second section. No `Page`/`Pane` wrapper: the host already provides the column. Save is one `primary` button at the natural size, never `expand`.

```tsx
import type { RenderConfigScreenCtx } from 'datocms-plugin-sdk';
import Button from 'datocms-react-ui/Button';
import Canvas from 'datocms-react-ui/Canvas';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import { Page } from 'datocms-react-ui/Page';
import PasswordInput from 'datocms-react-ui/PasswordInput';
import StringInput from 'datocms-react-ui/StringInput';
import SwitchInput from 'datocms-react-ui/SwitchInput';
import { useState } from 'react';

type Params = { apiKey?: string; autoSync?: boolean; webhookUrl?: string };

function ConfigScreen({ ctx }: { ctx: RenderConfigScreenCtx }) {
  const saved = ctx.plugin.attributes.parameters as Params;
  const [apiKey, setApiKey] = useState<string | null>(saved.apiKey ?? null);
  const [autoSync, setAutoSync] = useState<boolean | null>(saved.autoSync ?? false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(saved.webhookUrl ?? null);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await ctx.updatePluginParameters({ apiKey, autoSync, webhookUrl });
        ctx.notice('Settings saved'); // not awaited: it settles when the toast closes
      }}
    >
      <FieldWrapper label="API key" required error={apiKey ? undefined : 'Enter the API key'}>
        <PasswordInput value={apiKey} onChange={setApiKey} />
      </FieldWrapper>
      <FieldWrapper hint="Sync runs each time a record is published.">
        <SwitchInput label="Sync automatically" value={autoSync} onChange={setAutoSync} />
      </FieldWrapper>
      <Page.SectionTitle>Advanced</Page.SectionTitle>
      {/* a title is fine from the second section on */}
      <FieldWrapper label="Webhook URL" hint="Leave empty to use the default endpoint.">
        <StringInput value={webhookUrl} onChange={setWebhookUrl} placeholder="https://example.com/hook" />
      </FieldWrapper>
      <Button tone="primary" submit label="Save settings" disabled={!apiKey} />
    </form>
  );
}

export function renderConfigScreen(ctx: RenderConfigScreenCtx) {
  render(
    <Canvas ctx={ctx}>
      <ConfigScreen ctx={ctx} />
    </Canvas>,
  );
}
```

Topics of read-only facts or one-click actions: `SettingsList` rows (`Lists/SettingsList`). Destructive actions last, `ghost-alert`, confirmed with `ctx.openConfirm`. Mistakes: a heading or `Page.SectionTitle` as the first element; `Page` around everything (adds a second column padding and `min-height: 60vh`); full-width Save; an in-frame toast instead of `ctx.notice`.

## Field editor

The host draws the field's label, hint, label menu and validation errors around the frame. Draw only the input. A cross-document `<label>` cannot reach an input inside the iframe, so give the input an accessible name from the field label. No `FieldWrapper` label (it would repeat the host's). Respect `ctx.disabled`. Empty object-like value: `EmptySlot`.

```tsx
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import Canvas from 'datocms-react-ui/Canvas';
import StringInput from 'datocms-react-ui/StringInput';

function ColorEditor({ ctx }: { ctx: RenderFieldExtensionCtx }) {
  // a top-level, non-localized field; see datocms-plugin for nested paths
  const value = (ctx.formValues[ctx.fieldPath] as string | null) ?? null;

  return (
    <StringInput
      aria-label={ctx.field.attributes.label}
      value={value}
      disabled={ctx.disabled}
      onChange={(next) => ctx.setFieldValue(ctx.fieldPath, next)}
    />
  );
}

export function renderFieldExtension(_id: string, ctx: RenderFieldExtensionCtx) {
  render(
    <Canvas ctx={ctx}>
      <ColorEditor ctx={ctx} />
    </Canvas>,
  );
}
```

Text editors: `EditorToolbar` and the `--editor-content-*` variables (`Foundations/CssVariables`, "Text editors"). Mistakes: re-drawing the label or error; a bordered card around the input (the input is already a field box); hard-coded `px` heights instead of `--control-height`.

## Field addon

Rendered under the field's editor, 10px below it. Keep it to one quiet line: a status `Pill`, a small `Button` (default size, `soft` or `ghost`), or a `Callout` when the value has a problem. No title (the field label is above).

```tsx
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import Button from 'datocms-react-ui/Button';
import Canvas from 'datocms-react-ui/Canvas';
import Pill from 'datocms-react-ui/Pill';

function SeoAddon({ ctx }: { ctx: RenderFieldExtensionCtx }) {
  const text = String(ctx.formValues[ctx.fieldPath] ?? '');
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-s)', alignItems: 'center' }}>
      <Pill tone={text.length > 60 ? 'warning' : 'success'}>{`${text.length} characters`}</Pill>
      <Button tone="ghost" label="Suggest a title" disabled={ctx.disabled} onClick={() => undefined} />
    </div>
  );
}

export function renderFieldExtension(_id: string, ctx: RenderFieldExtensionCtx) {
  render(
    <Canvas ctx={ctx}>
      <SeoAddon ctx={ctx} />
    </Canvas>,
  );
}
```

## Field extension config screen

Inside the field's appearance form, which has its own Save: no Save button here. Every change goes through `ctx.setParameters`; show `ctx.errors[key]` (set by `validateManualFieldExtensionParameters`) as the field `error`.

```tsx
import type { RenderManualFieldExtensionConfigScreenCtx } from 'datocms-plugin-sdk';
import Canvas from 'datocms-react-ui/Canvas';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import NumberInput from 'datocms-react-ui/NumberInput';

function Config({ ctx }: { ctx: RenderManualFieldExtensionConfigScreenCtx }) {
  const max = (ctx.parameters.maxLength as number | null | undefined) ?? null;
  const error = ctx.errors.maxLength as string | undefined;

  return (
    <FieldWrapper label="Maximum length" error={error}>
      <NumberInput value={max} onChange={(maxLength) => ctx.setParameters({ ...ctx.parameters, maxLength })} />
    </FieldWrapper>
  );
}

export function renderManualFieldExtensionConfigScreen(_id: string, ctx: RenderManualFieldExtensionConfigScreenCtx) {
  render(
    <Canvas ctx={ctx}>
      <Config ctx={ctx} />
    </Canvas>,
  );
}
```

## Sidebar panel

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

## Full sidebar

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

## Custom page

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

## Modal

Open with `ctx.openModal({ id, title, width })` from any surface; the host draws the dialog, the `title` and the cross over the whole page, and `renderModal` fills it. Content = `Modal.Body` + `Modal.Footer` without `Modal`. The footer has no Cancel of its own: give one first, `tone="ghost"`, calling `ctx.resolve(null)`; the primary action resolves with the result. `width: 'fullWidth'` gives a Fixed frame with no title: then draw your own header (`Pane` + `Pane.Header`). In-frame `Modal`/`FullscreenModal` only for the two cases of `Overlays/Modal` (live frame state; a click must open a window).

```tsx
import type { RenderModalCtx } from 'datocms-plugin-sdk';
import Button from 'datocms-react-ui/Button';
import Canvas from 'datocms-react-ui/Canvas';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import Modal from 'datocms-react-ui/Modal';
import StringInput from 'datocms-react-ui/StringInput';
import { useState } from 'react';

function RenameModal({ ctx }: { ctx: RenderModalCtx }) {
  const [name, setName] = useState<string | null>((ctx.parameters.name as string) ?? '');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        ctx.resolve({ name });
      }}
    >
      <Modal.Body>
        <FieldWrapper label="Name">
          <StringInput value={name} onChange={setName} />
        </FieldWrapper>
      </Modal.Body>
      <Modal.Footer>
        <Button tone="ghost" size="small" label="Cancel" onClick={() => ctx.resolve(null)} />
        <Button tone="primary" size="small" submit label="Rename" disabled={!name} />
      </Modal.Footer>
    </form>
  );
}

export function renderModal(_modalId: string, ctx: RenderModalCtx) {
  render(
    <Canvas ctx={ctx}>
      <RenameModal ctx={ctx} />
    </Canvas>,
  );
}
```

Mistakes: a title or close button inside the content (the host draws them); a `Modal` inside `renderModal` (a dialog in a dialog); a modal for a yes/no question (`ctx.openConfirm`).

## Inspector

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

## Outlets

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

## Asset source

Inside a host dialog titled "Pick asset from {source}" with the source icon and a cross; padding 20, Auto height (declare `modal.initialHeight` in the hook to avoid a jump). Shell: a search field, then a grid of `MediaCard`s; a pick calls `ctx.select({ resource: { url, filename } })`. No title of your own. Loading: `BlankSlate` with `loading`; no results: `BlankSlate` saying the search found nothing.

```tsx
import type { RenderAssetSourceCtx } from 'datocms-plugin-sdk';
import Canvas from 'datocms-react-ui/Canvas';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import MediaCard from 'datocms-react-ui/MediaCard';
import StringInput from 'datocms-react-ui/StringInput';
import { useState } from 'react';

type Photo = { id: string; url: string; thumb: string; filename: string };

function Source({ ctx, photos }: { ctx: RenderAssetSourceCtx; photos: Photo[] }) {
  const [query, setQuery] = useState<string | null>(null);
  return (
    <>
      <FieldWrapper label="Search photos">
        <StringInput value={query} onChange={setQuery} placeholder="mountains" />
      </FieldWrapper>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--spacing-l)' }}>
        {photos.map((photo) => (
          <MediaCard
            key={photo.id}
            caption={{ text: photo.filename }}
            selection={{
              selected: false,
              onSelect: () => ctx.select({ resource: { url: photo.url, filename: photo.filename } }),
            }}
          >
            <img src={photo.thumb} alt="" style={{ display: 'block', width: '100%', aspectRatio: '4 / 3' }} />
          </MediaCard>
        ))}
      </div>
    </>
  );
}

export function renderAssetSource(_id: string, ctx: RenderAssetSourceCtx) {
  render(
    <Canvas ctx={ctx}>
      <Source ctx={ctx} photos={[]} />
    </Canvas>,
  );
}
```

## Dropdown actions

`itemFormDropdownActions`, `itemsDropdownActions`, `fieldDropdownActions`, `uploadsDropdownActions`, `schemaItemTypeDropdownActions` and their `execute*` hooks render no frame: the host draws the menu item, and `execute*` runs with a plain ctx. Feedback: `ctx.notice`/`ctx.alert`. Any UI (a form, a choice): `ctx.openModal`, then build it in `renderModal` ([Modal](#modal)). Hook wiring: `../../datocms-plugin/SKILL.md`.
