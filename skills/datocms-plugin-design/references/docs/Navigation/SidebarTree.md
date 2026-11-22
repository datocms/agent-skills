# SidebarTree

The rows of a sidebar that lists the elements of a project: the models and
blocks of the schema, the records of a model and the folders of the media
area. A row is a link, an action or a plain row. In a tree, the user can drag
and drop the rows in edit mode, and the rows can open and close.

| Use | For |
| - | - |
| `SidebarTree.Node` | One row of a sidebar of elements, in a tree or not. |
| [`SettingsMenu`](https://react-ui.datocms.com/Navigation/SettingsMenu.md) | The sections of a settings area. It uses `SidebarTree.Node` for its rows. |
| [`Table`](https://react-ui.datocms.com/Lists/Table.md) | A list of elements with columns. |

```tsx
import ApiKey from 'datocms-react-ui/ApiKey';
import { SidebarTree } from 'datocms-react-ui/SidebarTree';
import React, { useState } from 'react';
import { EditIcon } from '@/icons';

export default function Nodes() {
  const [active, setActive] = useState('home');

  return (
    <div style={{ width: 320 }}>
      <SidebarTree.Node
        label="Home page"
        icon={<EditIcon />}
        active={active === 'home'}
        onClick={() => setActive('home')}
      />
      <SidebarTree.Node
        label="Article"
        afterTitle={<ApiKey>article</ApiKey>}
        icon={<EditIcon />}
        active={active === 'article'}
        onClick={() => setActive('article')}
        actions={
          <SidebarTree.NodeActions
            editTo="#edit"
            editLabel="Edit"
            deleteLabel="Delete"
            onReorder={() => {}}
            onDelete={() => {}}
            add={{ label: 'Add group inside', onAdd: () => {} }}
          />
        }
      />
      <SidebarTree.Node
        label="Author"
        afterTitle={<ApiKey>author</ApiKey>}
        details="Content / Blog /"
        icon={<EditIcon />}
        active={active === 'author'}
        onClick={() => setActive('author')}
      />
    </div>
  );
}
```

## Parts of a row

The parts have the names of [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md):

- `icon` and `label`.
- `afterTitle` on the same line (an [`ApiKey`](https://react-ui.datocms.com/Content/ApiKey.md), the validity icons of a record).
- `details` on a second line, small and subtle (the parents of a model in the results of a search).
- `trailing` at the end of the row (a [`FeedbackDot`](https://react-ui.datocms.com/Content/Status.md), a small icon).

Give plain content: the row places each part. Do not use the
`SidebarTree__node__*` classes.

## Click behavior

A row does one thing on a click, as a [`Button`](https://react-ui.datocms.com/Actions/Button.md):

- `to` goes to a page of DatoCMS, with `exact` and `newTab`.
- `href` goes to another site, with `newTab`.
- `onClick` runs an action. The row is a button.

With none of them, the row is plain. With `to` or `href`, `onClick` runs
before the page opens (for example, it closes the sidebar on a phone). The
type does not accept two modes together.

When the mode depends on the data, build the props and spread them:

```tsx
<SidebarTree.Node
  label={label}
  {...(itemType ? { to: `/schema/${itemType.id}` } : { onClick: onToggle })}
/>
```

The row is active when the URL matches `to`. Give `active` for a row that
is also active on other paths, or for the selected row of an action (a
folder of the media area). The row has only one element that gets the
focus, and a click on the whole row goes to it.

## Actions

`SidebarTree.NodeActions` is the ⋮ menu of a row. It shows on hover. It has
the options to edit, add inside, reorder, and delete. Give it to `actions`.

## In a tree

A tree with drag and drop is a [`SortableTree`](https://react-ui.datocms.com/Lists/Dnd.md) (`datocms-react-ui/dnd`) with a
`SidebarTree.Node` in `renderItem`. Give `tree` to the node: `editMode` (the
row shows the grip and the user drags it), `droppable` (the user can drop
other rows into it) and `expandable`. The node reads the drag state of its
row from the [`SortableTree`](https://react-ui.datocms.com/Lists/Dnd.md): do not pass it. A node with `tree` out of a
[`SortableTree`](https://react-ui.datocms.com/Lists/Dnd.md) shows a warning in development.

```tsx
import Button from 'datocms-react-ui/Button';
import {
  type ItemId,
  moveItemOnTree,
  SortableTree,
  type TreeData,
} from 'datocms-react-ui/dnd';
import {
  SIDEBAR_TREE_OFFSET_PER_LEVEL,
  SidebarTree,
} from 'datocms-react-ui/SidebarTree';
import React, { useState } from 'react';
import { EditIcon, GroupIcon } from '@/icons';

type Data = { label: string; group?: boolean };

const INITIAL_TREE: TreeData<Data> = {
  rootId: 'root',
  items: {
    root: { id: 'root', children: ['blog', 'home'] },
    blog: {
      id: 'blog',
      children: ['post', 'author'],
      isExpanded: true,
      data: { label: 'Blog', group: true },
    },
    post: { id: 'post', children: [], data: { label: 'Post' } },
    author: { id: 'author', children: [], data: { label: 'Author' } },
    home: { id: 'home', children: [], data: { label: 'Home page' } },
  },
};

export default function Tree() {
  const [tree, setTree] = useState(INITIAL_TREE);
  const [editMode, setEditMode] = useState(false);

  const toggle = (id: ItemId) =>
    setTree((current) => ({
      ...current,
      items: {
        ...current.items,
        [id]: {
          ...current.items[id],
          isExpanded: !current.items[id].isExpanded,
        },
      },
    }));

  return (
    <div style={{ width: 320 }}>
      <Button
        size="micro"
        label={editMode ? 'Done' : 'Reorder'}
        onClick={() => setEditMode(!editMode)}
      />
      <SortableTree
        tree={tree}
        offsetPerLevel={SIDEBAR_TREE_OFFSET_PER_LEVEL}
        isDragEnabled={editMode}
        isNestingEnabled={true}
        canNest={(item) => Boolean(item.data?.group)}
        onToggle={toggle}
        onDragEnd={(source, destination) => {
          if (destination) {
            setTree((current) => moveItemOnTree(current, source, destination));
          }
        }}
        // The node reads the drag objects of its row from the SortableTree
        renderItem={({ item }) => (
          <SidebarTree.Node
            label={item.data?.label ?? ''}
            icon={item.data?.group ? <GroupIcon /> : <EditIcon />}
            tree={{
              editMode,
              droppable: Boolean(item.data?.group),
              expandable:
                item.children.length > 0
                  ? {
                      open: Boolean(item.isExpanded),
                      onToggle: () => toggle(item.id),
                    }
                  : undefined,
            }}
          />
        )}
      />
    </div>
  );
}
```

The row shows the grip in edit mode. A row with children also gets
`tree.expandable` (`{ open, onToggle }`). It shows the toggle that opens and
closes them. A row without `to` and `onClick` that has `tree.expandable` is
a button: Enter, Space and a click open and close it.

A row without `tree.expandable` keeps the space of the toggle, so the icons
align. A row next to a tree, but not in it ("All assets" above the folders
of the media area), gets `alignWithTree` for the same space. The type does
not accept `tree` and `alignWithTree` together. The indent of each level is
`SIDEBAR_TREE_OFFSET_PER_LEVEL`.

