# NavList

The list of the elements of a section, in the sidebar on the left of their
form: the roles, the webhooks, the API tokens, the plugins. Each row opens
the page of its element, and the row of the open page is selected
(`aria-current="page"`).

| Use | For |
| - | - |
| `NavList` | The elements of a section, one page for each element. |
| [`RowList`](https://react-ui.datocms.com/Lists/RowList.md) | The same rows for an action or a plain content. `NavList` renders a [`RowList`](https://react-ui.datocms.com/Lists/RowList.md). |
| [`SidebarTree`](https://react-ui.datocms.com/Navigation/SidebarTree.md) | A tree that the user edits and reorders (the models, the menu). |
| [`SettingsMenu`](https://react-ui.datocms.com/Navigation/SettingsMenu.md) | The sections of a settings area. |
| [`Table`](https://react-ui.datocms.com/Lists/Table.md) with [`Table.Row`](https://react-ui.datocms.com/Lists/Table.md) (`to`) | Elements with facts to scan in columns. |

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import FeedbackDot from 'datocms-react-ui/FeedbackDot';
import InitialsAvatar from 'datocms-react-ui/InitialsAvatar';
import NavList from 'datocms-react-ui/NavList';
import Pill from 'datocms-react-ui/Pill';
import React from 'react';

const PLUGINS = [
  { id: 'seo', name: 'SEO Analysis', enabled: true, version: '2.1.0' },
  {
    id: 'translate',
    name: 'Translate Fields',
    enabled: true,
    version: '1.4.2',
  },
  { id: 'notes', name: 'Editor Notes', enabled: false, version: '0.9.0' },
  { id: 'preview', name: 'Web Previews', enabled: true, version: '3.0.1' },
];

export default function Plugins() {
  return (
    // The host is on the second plugin (the "path" of the example)
    <div style={{ width: 320 }}>
      <NavList ariaLabel="Plugins">
        {PLUGINS.map((plugin) => (
          <NavList.Item
            key={plugin.id}
            to={`/plugins/${plugin.id}/edit`}
            muted={!plugin.enabled}
          >
            <EntityRow
              layout="row"
              image={<InitialsAvatar name={plugin.name} size={32} />}
              title={plugin.name}
              afterTitle={!plugin.enabled && <Pill>Disabled</Pill>}
              trailing={plugin.enabled && <FeedbackDot tone="success" />}
            >
              Version {plugin.version}
            </EntityRow>
          </NavList.Item>
        ))}
      </NavList>
    </div>
  );
}
```

## Rows

The content of a row is usually an [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md) with `layout="row"`: the
image, the title, a [`Pill`](https://react-ui.datocms.com/Content/Pill.md) after the title, a [`FeedbackDot`](https://react-ui.datocms.com/Content/Status.md) in `trailing`
and the details as children. The selected row gives the selected colors to
the parts of the [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md).

A row that the user reorders gets `sortable`, as a row of a [`RowList`](https://react-ui.datocms.com/Lists/RowList.md) (the
records of a sortable collection).

A row for an element that is off (a disabled plugin) gets `muted`. It fades,
but the user can still open it. Show the state with a [`Pill`](https://react-ui.datocms.com/Content/Pill.md) too, because the
fade alone is not clear.

The look of the rows (the inset, the gap, the surface on hover and on the
selected row) is the one of [`RowList`](https://react-ui.datocms.com/Lists/RowList.md). See “Inset row” there.

**Do:** Use a NavList when each element has its own page, with a form on the right.

Roles, webhooks, API tokens.

**Don’t:** Do not use a NavList for rows that do an action or select an element on the same page, because it is navigation.

A list of options in a dialog.

## Accessibility

The list is a `nav` landmark, and a screen reader needs its name to tell it
apart from the other navigations of the page. Put the list in a [`Pane`](https://react-ui.datocms.com/Layout/Pane.md) with
a [`Pane.Header.Title`](https://react-ui.datocms.com/Layout/Pane.md). The list uses the title as its name
(`aria-labelledby`), so the screen reader says the text that the user
sees ("Roles, navigation"). Do not give `ariaLabel` there.

Outside a [`Pane`](https://react-ui.datocms.com/Layout/Pane.md) title (in a [`SidebarPanel`](https://react-ui.datocms.com/Layout/SidebarPanel.md), or in the example above), give
the name in `ariaLabel`, a `TextMessage`. In development, the console shows
a warning for a list without a name.

