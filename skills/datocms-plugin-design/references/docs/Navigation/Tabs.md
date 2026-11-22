# Tabs

Tabs with content below them, for a form or a dialog that has more than one
group of fields. Give the tabs in `tabs`: an `id`, a `label` and the
`content` of each tab. A tab that shows only in some cases is
`condition && { … }`.

| Use | For |
| - | - |
| `Tabs` | A form or a panel with 2 to 6 groups of content. Only one group shows. |
| `Toolbar.Tabs` and [`Toolbar.TabLink`](https://react-ui.datocms.com/Layout/Toolbar.md) | The tabs in the title bar of a pane, where each tab is a page. |
| [`SegmentedControl`](https://react-ui.datocms.com/Navigation/SegmentedControl.md) | A choice of one value, with no content below it. |
| [`SidebarPanel`](https://react-ui.datocms.com/Layout/SidebarPanel.md) | Sections that the user can open all together. |

## Tabs that the URL keeps

By default the URL keeps the active tab (`?tab=validators`). Each tab is a
link. The first tab has no query. The user can open a tab in a new window
and share its address. Use this mode for a page. A second `Tabs` on the same
page needs its own `urlParam` (the key of the query).

Give `invalid` to a tab that has fields with errors. The mark shows only
when the tab is not active.

When the tabs do not fit, the row scrolls sideways, and the active tab
scrolls into view in the row ([`Toolbar.Tab`](https://react-ui.datocms.com/Layout/Toolbar.md) and [`Toolbar.TabLink`](https://react-ui.datocms.com/Layout/Toolbar.md) do the
same). The row shows no scrollbar. An edge of the row fades when tabs are
hidden past it.

```tsx
import { Tabs } from 'datocms-react-ui/Tabs';
import React from 'react';

export default function UrlTabs() {
  return (
    <Tabs
      ariaLabel="Edit field"
      tabs={[
        {
          id: 'basic',
          label: 'Settings',
          content: <p>The name, the API key and the hint of the field.</p>,
        },
        {
          id: 'validators',
          label: 'Validations',
          invalid: true,
          content: (
            <p>Required, unique and a length between 3 and 80 characters.</p>
          ),
        },
        {
          id: 'appearance',
          label: 'Presentation',
          content: <p>The editor of the field.</p>,
        },
        {
          id: 'default',
          label: 'Default value',
          content: <p>The value of a new record.</p>,
        },
      ]}
    />
  );
}
```

## Controlled tabs

Give `activeTabId` and `onChange` (always together) to keep the active tab
in the state of your component, for example in a dialog. The tabs are
buttons and the content is a `tabpanel`.

```tsx
import CodeSnippet from 'datocms-react-ui/CodeSnippet';
import { Tabs } from 'datocms-react-ui/Tabs';
import React, { useState } from 'react';

const payloads = [
  { id: 'before', title: 'Before', text: '{\n  "title": "Hello"\n}' },
  { id: 'after', title: 'After', text: '{\n  "title": "Hello world"\n}' },
];

export default function ControlledTabs() {
  const [currentId, setCurrentId] = useState('before');

  return (
    <Tabs
      ariaLabel="Payloads"
      activeTabId={currentId}
      onChange={setCurrentId}
      tabs={payloads.map((payload) => ({
        id: payload.id,
        label: payload.title,
        content: (
          <CodeSnippet
            code={payload.text}
            ariaLabel={payload.title}
            maxHeight={400}
          >
            {payload.text}
          </CodeSnippet>
        ),
      }))}
    />
  );
}
```

## Tabs with your own content

When the content is not a child of the tabs (for example a sidebar with its
own scroll), use `Toolbar.Tabs` and [`Toolbar.Tab`](https://react-ui.datocms.com/Layout/Toolbar.md) for only the row of tabs
(see [`Toolbar`](https://react-ui.datocms.com/Layout/Toolbar.md)). `useTabIds` gives the ids that link each tab to the panel.
Give the panel the padding of the tab content, `--Tabs-inset`. Its text then
lines up with the first tab.

**Do:** Use short labels with one or two words.

```tsx
<Tabs
  ariaLabel="Example"
  activeTabId="a"
  onChange={() => {}}
  tabs={[
    { id: 'a', label: 'Settings', content: 'Settings' },
    { id: 'b', label: 'Validations', content: 'Validations' },
  ]}
/>
```

**Don’t:** Do not use tabs for a choice that changes how one value is shown. Use a SegmentedControl.

```tsx
<Tabs
  ariaLabel="Example"
  activeTabId="a"
  onChange={() => {}}
  tabs={[
    { id: 'a', label: 'Daily', content: 'Chart' },
    { id: 'b', label: 'Cumulative', content: 'Chart' },
  ]}
/>
```

## Accessibility

The arrow keys, Home and End move between the tabs, when you keep the active
tab in your state.

## CSS variables

## CSS variables

- `--Tabs-inset`: The space between the edges of the content of the tabs and the content. The variable is on the root, thus a panel of your own under Toolbar.Tabs can use it too.

## Props

### Tabs

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `urlParam` (variant) | `string` | No | `"tab"` | The key of the query that keeps the active tab. Give a different key to a second Tabs on the same page. |
| `activeTabId` (variant) | `string` | No | | The `id` of the tab that shows |
| `onChange` (variant) | `(tabId: string) => void` | No | | Runs when the user picks a tab |
| `tabs` | `(TabsItem \| false \| null \| undefined)[]` | Yes | | The tabs, in their order. A value that is `false`, `null` or `undefined` shows no tab: use `condition && { … }`. |
| `ariaLabel` | `TextMessage` | Yes | | The accessible name of the tabs (the "aria-label" of the nav or of the tablist), for example "Edit field" |
| `extraInfo` | `React.ReactNode` | No | | Shows at the end of the row of tabs, for example the ID of the record |
| `beforeContent` | `React.ReactNode` | No | | Shows at the top of the content of each tab, for example the error of the form (FormGlobalError) |

#### Types

`TabsItem` — One tab of Tabs: its handle in the row and its content

```ts
export type TabsItem = {
  /** The key of the tab. It is the value of "?tab=" in the URL mode. */
  id: string;
  /** The text of the tab, for example `{ id: 'fieldForm.tabs.validations' }` */
  label: Message;
  /** The tab has fields with errors. It shows an error mark. */
  invalid?: boolean;
  /** The content of the tab. It renders only when the tab is active. */
  content: React.ReactNode;
};
```

### An item of tabs

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | Yes | | The key of the tab. It is the value of "?tab=" in the URL mode. |
| `label` | `Message` | Yes | | The text of the tab, for example `{ id: 'fieldForm.tabs.validations' }` |
| `invalid` | `boolean` | No | | The tab has fields with errors. It shows an error mark. |
| `content` | `React.ReactNode` | Yes | | The content of the tab. It renders only when the tab is active. |
