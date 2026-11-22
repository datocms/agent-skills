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

## Props

### SidebarTree.Node

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `onClick` (variant) | `() => void` | No | | LinkAction: Runs on a click, before the page opens. For example, it closes the sidebar on small screens.<br>ExternalLinkAction: Runs on a click, before the page opens |
| `to` (variant) | `string` | No | | The page of the node: the path with its query |
| `exact` (variant) | `boolean` | No | | The node is active only when the URL is exactly `to` |
| `href` (variant) | `string` | No | | |
| `newTab` (variant) | `boolean` | No | | Opens the page in a new tab |
| `tree` (variant) | `SidebarTreeNodeTreeProps` | No | | |
| `alignWithTree` (variant) | `boolean` | No | `false` | The node is next to a tree, but not in it. It keeps the space of the toggle, so its icon aligns with the icons of the tree. |
| `label` | `Message` | Yes | | The name of the node, for example "Blog post" |
| `afterTitle` | `ReactNode` | No | | Shows after the label, on the same line: an ApiKey, a small icon |
| `details` | `Message` | No | | A second line under the label, small and subtle (for example the parents of the node in the results of a search) |
| `trailing` | `ReactNode` | No | | Shows at the end of the row: a FeedbackDot, a small icon |
| `icon` | `ReactNode` | No | | An icon before the label |
| `onDoubleClick` | `() => void` | No | | Runs when the user double-clicks the node |
| `active` | `boolean` | No | `` true when the URL matches `to` `` | Forces the active state, for a node that is also active on other paths. |
| `actions` | `ReactNode` | No | | Edit mode actions. See SidebarTree.NodeActions. |
| `highlighted` | `boolean` | No | | Shows the highlight of a new node (see _HighlightElement.css) and scrolls the node into view |
| `className` | `string` | No | | Only for the position of the node, not for its look |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

`SidebarTreeNodeAction` — What the node does on a click

| Variant | Props | Description |
| - | - | - |
| `ClickAction` | `onClick` | Runs "onClick": the node is a button |
| `LinkAction` | `to`, `exact`, `newTab`, `onClick` | A link to a page of DatoCMS |
| `ExternalLinkAction` | `href`, `newTab`, `onClick` | A link to another site |
| `NoAction` | | No action: a plain row |

`SidebarTreeNodePlacement` — Where the node is: in a tree or not

| Variant | Props | Description |
| - | - | - |
| `InTree` | `tree` | A node in a tree with drag and drop |
| `OutOfTree` | `alignWithTree` | A node out of a tree |

#### Types

`SidebarTreeNodeTreeProps` — The props of a node that is in a tree with drag and drop

```ts
export type SidebarTreeNodeTreeProps = {
  /** True when the user reorders the tree. The node shows a grip. */
  editMode: boolean;
  /**
   * Give it when the node has child nodes: the node shows the toggle that
   * opens and closes them
   */
  expandable?: {
    /** True when the child nodes show */
    open: boolean;
    /** Runs when the user clicks the toggle */
    onToggle: () => void;
  };
  /** True when the user can drop other nodes into this node */
  droppable: boolean;
};
```

### tree

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `editMode` | `boolean` | Yes | | True when the user reorders the tree. The node shows a grip. |
| `expandable` | `{ open: boolean; onToggle: () => void; }` | No | | Give it when the node has child nodes: the node shows the toggle that opens and closes them |
| `droppable` | `boolean` | Yes | | True when the user can drop other nodes into this node |

### SidebarTree.NodeActions

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `editTo` | `string` | Yes | | The page of the "edit" option: the path with its query |
| `editLabel` | `Message` | Yes | | The text of the "edit" option |
| `deleteLabel` | `Message` | Yes | | The text of the "delete" option |
| `onDelete` | `() => void` | Yes | | Runs when the user picks the "delete" option |
| `onReorder` | `() => void` | No | | The option that starts the edit mode of the tree, where the user reorders the items. Do not give it in edit mode. |
| `add` | `{ label: Message; onAdd: () => void; icon?: SvgIcon; }` | No | | The option that adds an item inside the node |
