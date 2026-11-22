# RowList

A list of inset rows in a sidebar, a panel or a dialog: a ghost box with
round corners for each row, a small gap between the rows and no lines. The
surface shows on hover, on keyboard focus and on the selected row.

| Use | For |
| - | - |
| `RowList` | Rows that do an action, that the user reorders, or that only show content: the versions of a record, the records of a plugin inspector. |
| [`NavList`](https://react-ui.datocms.com/Navigation/NavList.md) | Rows that open the pages of a section. It is a `RowList` in a navigation landmark. |
| [`SidebarTree`](https://react-ui.datocms.com/Navigation/SidebarTree.md) | A tree that the user edits and reorders (the models, the menu). |

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import Pill from 'datocms-react-ui/Pill';
import RowList from 'datocms-react-ui/RowList';
import React, { useState } from 'react';

const VERSIONS = [
  { id: '3', date: 'Today at 10:42', editor: 'Ada Lovelace', state: 'Current' },
  {
    id: '2',
    date: 'Yesterday at 16:05',
    editor: 'Alan Turing',
    state: 'Published',
  },
  { id: '1', date: 'Oct 2 at 09:12', editor: 'Ada Lovelace', state: null },
];

export default function Versions() {
  const [selectedId, setSelectedId] = useState('2');

  return (
    <div style={{ width: 320 }}>
      <RowList>
        {VERSIONS.map((version) => (
          <RowList.Item
            key={version.id}
            selected={version.id === selectedId}
            onClick={() => setSelectedId(version.id)}
          >
            <EntityRow
              layout="row"
              title={version.date}
              afterTitle={version.state && <Pill>{version.state}</Pill>}
            >
              {version.editor}
            </EntityRow>
          </RowList.Item>
        ))}
      </RowList>
    </div>
  );
}
```

## Clicks

A row does one thing on a click. The type does not accept two modes together.

- `to` (a page of DatoCMS): the row is selected while the page is open.
- `onClick` (an action): the row is a button, and `selected` shows the
  selected state.
- Nothing: a plain row, which also takes `selected`.

`muted` fades the row of an element that is off. The user can still open it.

## Density

The default list gives the inset of the content, so put it at the edge of a
sidebar, a pane or a dialog. In a container that already has an inset (a
[`SidebarPanel`](https://react-ui.datocms.com/Layout/SidebarPanel.md)), give `density="compact"`. The rows are lower, the image and
the text stay on the edge of the container content, and the box of a row
goes out of it on hover. Do not add a margin around the list.

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import RowList from 'datocms-react-ui/RowList';
import SidebarPanel from 'datocms-react-ui/SidebarPanel';
import React from 'react';

const RECORDS = [
  { id: '12', model: 'Article', title: 'How we moved our blog' },
  { id: '18', model: 'Article', title: 'Five tips for faster images' },
  { id: '7', model: 'Landing page', title: 'Spring campaign' },
];

export default function Compact() {
  return (
    <div style={{ width: 320 }}>
      <SidebarPanel title="Records using this asset" count={RECORDS.length}>
        <RowList density="compact">
          {RECORDS.map((record) => (
            <RowList.Item key={record.id} to={`/records/${record.id}`}>
              <EntityRow
                layout="row"
                kicker={record.model}
                title={record.title}
              />
            </RowList.Item>
          ))}
        </RowList>
      </SidebarPanel>
    </div>
  );
}
```

## Row actions

A row that only shows its content can have buttons at its end. Put them in
[`RowList.Actions`](https://react-ui.datocms.com/Actions/Actions.md), as the `trailing` of the [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md). The buttons are
ghost buttons with only an icon. They show only when the pointer or the
focus is on the row, or when one of their menus is open, and always on a
device without a pointer. At rest they take no space, so a status or a count
before them stays at the end of the row in all the rows.

A row with `to` or `onClick` cannot have them, because a button cannot be
inside a link or a button. Give that row a menu in its page.

```tsx
import Button from 'datocms-react-ui/Button';
import EntityRow from 'datocms-react-ui/EntityRow';
import RowList from 'datocms-react-ui/RowList';
import SidebarPanel from 'datocms-react-ui/SidebarPanel';
import React, { useState } from 'react';
import { DeleteIcon, EditIcon } from '@/icons';

const INITIAL_TAGS = [
  { id: 'sea', title: 'Sea', count: '24 assets' },
  { id: 'mountain', title: 'Mountain', count: '9 assets' },
  { id: 'city', title: 'City', count: '41 assets' },
];

export default function Actions() {
  const [tags, setTags] = useState(INITIAL_TAGS);

  return (
    <div style={{ width: 320 }}>
      <SidebarPanel title="Tags" count={tags.length}>
        <RowList density="compact">
          {tags.map((tag) => (
            <RowList.Item key={tag.id}>
              <EntityRow
                layout="row"
                title={tag.title}
                trailing={
                  <RowList.Actions>
                    <Button
                      tone="ghost"
                      size="micro"
                      iconOnly
                      icon={EditIcon}
                      label={`Rename ${tag.title}`}
                      onClick={() => undefined}
                    />
                    <Button
                      tone="ghost-alert"
                      size="micro"
                      iconOnly
                      icon={DeleteIcon}
                      label={`Delete ${tag.title}`}
                      onClick={() =>
                        setTags((current) =>
                          current.filter((other) => other.id !== tag.id),
                        )
                      }
                    />
                  </RowList.Actions>
                }
              >
                {tag.count}
              </EntityRow>
            </RowList.Item>
          ))}
        </RowList>
      </SidebarPanel>
    </div>
  );
}
```

## Inset row

Every list of rows in a sidebar, a panel or a dialog has this look, even
outside `RowList`: the header of a [`SidebarPanel`](https://react-ui.datocms.com/Layout/SidebarPanel.md), the nodes of a
[`SidebarTree`](https://react-ui.datocms.com/Navigation/SidebarTree.md), the results of a search and the link rows of a menu. For a
new list of rows, use `RowList` or [`NavList`](https://react-ui.datocms.com/Navigation/NavList.md). When your own CSS draws the
rows, follow these rules:

- The surface shows only on hover, on keyboard focus (`:focus-visible`, not
  `:focus`) and on the selected row (`--color--selected--surface`). Do not
  animate the background: when the pointer moves along a list, a fade makes
  the rows change late, one after the other.
- Use the [row variables](https://react-ui.datocms.com/Foundations/CssVariables.md):
  `--row-inset` (the space between the box and the sides of the list, also
  above the first row), `--row-gap` (between two rows) and `--row-radius`.
  The padding of the content is `--RowList-content-padding`.
- Keep the content at the inset of the container. The margin of the row
  plus its padding is the inset of the sidebar content, so the text stays in
  line with the titles and the fields around the list. A row in a
  column of content that already has an inset does the opposite: a negative
  margin puts the box out of the column, and the text stays on its edge.
- A data table is not a list of rows: [`Table`](https://react-ui.datocms.com/Lists/Table.md) keeps its rows from edge to
  edge, with a line between them. The options of a menu follow the idea of
  the inset row, with their own, smaller inset.

## Drag and drop

Put each row in a [`SortableItem`](https://react-ui.datocms.com/Lists/Dnd.md) (`datocms-react-ui/dnd`) with `handle`, and
give the argument of its children to `sortable`. The row shows a grip on its
left, and the drop line. All the rows of a list are sortable, or no row is,
so the rows stay aligned.

```tsx
<SortableItem id={item.id} index={index} handle={true}>
  {(sortable) => (
    <RowList.Item to={url} sortable={sortable}>
      <RecordRow item={item} layout="row" />
    </RowList.Item>
  )}
</SortableItem>
```

## SortableTree rows

A [`SortableTree`](https://react-ui.datocms.com/Lists/Dnd.md) draws the markup of its rows. Such a row (the records tree
of a collection in DatoCMS) uses the classes `RowList__item` and
`RowList__content`, with `RowList__item--selected` and
`RowList__item--dragging`. Do not use these classes elsewhere.

## CSS variables

## CSS variables

- `--row-inset`: The space between the box of a row and the sides of the list, also above the first row
- `--row-gap`: The space between two rows
- `--row-radius`: The radius of the box of a row, on hover and when it is selected
- `--RowList-content-padding`: The padding of the content of a row. With --row-inset, it puts the text of the row at the inset of the sidebar.

## Props

### RowList

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `density` | `'default' \| 'compact'` | No | `"default"` | The space around the rows. "default" puts the list at the edge of a sidebar or of a dialog: the list gives the inset of the content. "compact" is for a list in a container that already has an inset (a SidebarPanel): the image and the text of a row stay on the edge of the content of the container, and the box of the row goes out of it. |
| `className` | `string` | No | | Only for the position of the list in its container (a margin), not for its look |
| `children` | `ReactNode` | Yes | | The rows (RowList.Item) |

### RowList.Item

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `to` (variant) | `string` | No | | The page of DatoCMS: the path with its query |
| `onClick` (variant) | `() => void` | No | | Runs on a click, before the page opens |
| `selected` (variant) | `boolean` | No | `false` | The row shows the selected state, for example the version that the page shows |
| `muted` | `boolean` | No | `false` | The text of the row is subtle and its images fade, but the user can still open it. Use it for an element that is off (for example a disabled plugin), with a Pill that says it. |
| `sortable` | `SortableItemApi` | No | | The user can drag the row to a new position. Give the argument of the children of SortableItem , with `handle` on the SortableItem: the row shows a grip at its left. |
| `id` | `string` | No | | The id of the row, for example to scroll it into view |
| `className` | `string` | No | | A class on the list item of the row. Only for its place in the list (for example to hide it), not for its look. |
| `children` | `ReactNode` | Yes | | The content of the row, usually an EntityRow with layout "row" |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

`RowListItemAction` — What the row does on a click

| Variant | Props | Description |
| - | - | - |
| `LinkRow` | `to`, `onClick` | The row opens a page of DatoCMS. It is selected while the page is open. |
| `ButtonRow` | `onClick`, `selected` | The row is a button |
| `StaticRow` | `selected` | The row only shows its content |

### RowList.Actions

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `visibility` | `'hover' \| 'always'` | No | `"hover"` | When the actions show. With "hover", they show only when the pointer or the focus is on the row, or when a menu of the actions is open (on devices without a pointer, always). "always" is for a picture of the row with an open tooltip or menu. |
| `children` | `ReactNode` | Yes | | The buttons of the row: ghost buttons with only an icon |
