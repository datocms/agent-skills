# TreeRow

A row of a [`SortableTree`](https://react-ui.datocms.com/Lists/Dnd.md), as DatoCMS shows it in the tree of the records
of a model with hierarchical sorting.

The row has the classes of a [`RowList`](https://react-ui.datocms.com/Lists/RowList.md) row. It starts with the column of the
handle: a row with children shows the chevron that opens them, and a row
that the user can drag shows the grip. Then [`TreeRow.Link`](https://react-ui.datocms.com/Navigation/Link.md) holds the
content, usually an [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md).

A row with a button instead of the link (for example "Load more") has no
`expandable` and no `drag.handle`. Its `TreeRow.Action` starts in the column
of the handle, so a click there also runs the button.

| Part | For |
| - | - |
| `TreeRow` | The row: the handle, the states of the drag and the drop line. |
| [`TreeRow.Link`](https://react-ui.datocms.com/Navigation/Link.md) | The content of the row as a link. Give it `provided.treeItemProps`, so the arrow keys move the focus between the rows. |
| `TreeRow.Action` | The content of the row as a button, with its icon in the column of the handle. It gets the `provided.treeItemProps` of its row from the tree. |

## Setup

The component has no state. Put the rows in a [`SortableTree`](https://react-ui.datocms.com/Lists/Dnd.md) with `handle`
and give them the values of `provided`:

- `drag={{ wrapperRef: provided.innerRef, dropIndicator: provided.dropIndicator, handle: { ref: provided.dragHandleRef } }}`. It is the same `drag` prop as a row of [`Table`](https://react-ui.datocms.com/Lists/Table.md).
- `indentation={provided.draggableProps.style.paddingLeft}`.

With `handle`, the tree moves a row only from its handle. A row with no
`drag.handle` does not move either. A handle that the user cannot use now is
`{ disabled: { reason } }`: the grip shows grayed, with the reason in a
tooltip, and the row does not move.

Give `offsetPerLevel={25}` to the tree. The column of the handle and the
padding of the content are 25px, so the chevron of a child is under the title
of its parent.

```tsx
import { LoadMoreChevron } from 'datocms-react-ui/Chevron';
import {
  moveItemOnTree,
  SortableTree,
  type TreeData,
  type TreeDestinationPosition,
  type TreeSourcePosition,
} from 'datocms-react-ui/dnd';
import EntityRow from 'datocms-react-ui/EntityRow';
import ItemStatus from 'datocms-react-ui/ItemStatus';
import TreeRow from 'datocms-react-ui/TreeRow';
import React, { useState } from 'react';

type Page = {
  title: string;
  status: 'published' | 'draft';
  // The user cannot move the page
  locked?: boolean;
};

// The last child of "Help" is not a page: it loads the other children
const LOAD_MORE = 'load-more';

const TREE: TreeData<Page> = {
  rootId: 'root',
  items: {
    root: { id: 'root', children: ['about', 'help', 'stockists'] },
    about: {
      id: 'about',
      children: ['studio'],
      hasChildren: true,
      isExpanded: false,
      data: { title: 'About', status: 'published' },
    },
    studio: {
      id: 'studio',
      children: [],
      data: { title: 'Our studio', status: 'published' },
    },
    help: {
      id: 'help',
      children: ['shipping', 'returns', LOAD_MORE],
      hasChildren: true,
      isExpanded: true,
      data: { title: 'Help', status: 'published' },
    },
    shipping: {
      id: 'shipping',
      children: [],
      data: { title: 'Shipping', status: 'published' },
    },
    returns: {
      id: 'returns',
      children: [],
      data: { title: 'Returns', status: 'draft' },
    },
    [LOAD_MORE]: { id: LOAD_MORE, children: [] },
    stockists: {
      id: 'stockists',
      children: [],
      data: { title: 'Stockists', status: 'published', locked: true },
    },
  },
};

export default function Pages() {
  const [tree, setTree] = useState(TREE);

  const toggle = (id: string) =>
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

  // Replaces the "Load more" row with the last children of "Help"
  const loadMore = () =>
    setTree((current) => ({
      ...current,
      items: {
        ...current.items,
        help: {
          ...current.items.help,
          children: current.items.help.children
            .filter((id) => id !== LOAD_MORE)
            .concat(['payments', 'warranty']),
        },
        payments: {
          id: 'payments',
          children: [],
          data: { title: 'Payments', status: 'published' },
        },
        warranty: {
          id: 'warranty',
          children: [],
          data: { title: 'Warranty', status: 'draft' },
        },
      },
    }));

  const move = (
    source: TreeSourcePosition,
    destination?: TreeDestinationPosition,
  ) => {
    if (destination) {
      setTree((current) => moveItemOnTree(current, source, destination));
    }
  };

  return (
    <div style={{ width: 350 }}>
      <SortableTree
        tree={tree}
        offsetPerLevel={25}
        // The user drags a row only from its handle: the "Load more" row and
        // the locked page do not move
        handle
        isNestingEnabled
        canNest={(item) => item.id !== LOAD_MORE}
        onToggle={(id) => toggle(String(id))}
        onDragEnd={move}
        renderItem={({ item, provided, snapshot }) => {
          if (item.id === LOAD_MORE) {
            return (
              <TreeRow
                drag={{ wrapperRef: provided.innerRef }}
                indentation={provided.draggableProps.style.paddingLeft}
              >
                <TreeRow.Action
                  icon={<LoadMoreChevron />}
                  label="Load 2 more pages"
                  onClick={loadMore}
                />
              </TreeRow>
            );
          }

          const page = item.data as Page;

          return (
            <TreeRow
              expandable={
                item.hasChildren
                  ? {
                      open: Boolean(item.isExpanded),
                      onToggle: () => toggle(String(item.id)),
                    }
                  : undefined
              }
              selected={item.id === 'shipping'}
              dragging={snapshot.isDragging}
              dropTarget={snapshot.isCombineTarget}
              drag={{
                wrapperRef: provided.innerRef,
                dropIndicator: provided.dropIndicator,
                handle: page.locked
                  ? { disabled: { reason: 'Only an admin can move this page' } }
                  : { ref: provided.dragHandleRef },
              }}
              indentation={provided.draggableProps.style.paddingLeft}
            >
              <TreeRow.Link to="#" {...provided.treeItemProps}>
                <EntityRow
                  layout="row"
                  multilineTitle
                  title={page.title}
                  trailing={<ItemStatus status={page.status} />}
                />
              </TreeRow.Link>
            </TreeRow>
          );
        }}
      />
    </div>
  );
}
```

## Accessibility

The button of a `TreeRow.Action` is a tree item, as the links are: the arrow
keys move the focus to it, and Enter or Space runs it.

## Props

### TreeRow

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `expandable` | `{ open: boolean; onToggle: () => void; }` | No | | The row has children: the column of the handle shows the chevron that opens and closes them. |
| `drag` | `RowDrag` | No | | The parts that SortableTree gives to the row: `wrapperRef` is `provided.innerRef`, `dropIndicator` is `provided.dropIndicator`, and `handle` is `{ ref: provided.dragHandleRef }`. With `handle`, the column of the handle shows the grip, or the chevron of an `expandable` row. Without `handle` and `expandable`, the row has no column of the handle. Give `handle` to the SortableTree too: then a row with a disabled handle or with no handle does not move. |
| `indentation` | `number` | No | `0` | The indent of the level in px (`provided.draggableProps.style.paddingLeft`) |
| `selected` | `boolean` | No | | The row is the current one, for example open in an editor |
| `dragging` | `boolean` | No | | The row is the one that the user drags |
| `dropTarget` | `boolean` | No | | A drop puts the dragged row in this row, as a child |
| `children` | `ReactNode` | Yes | | After the column of the handle: a `TreeRow.Link`. A row with no handle and no chevron takes a `TreeRow.Action`, which starts in that column. |

### TreeRow\.Link

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `to` | `string` | Yes | | The page of DatoCMS that the link opens: the path with its query, for example "/editor?tab=fields" |
| `exact` | `boolean` | No | `false` | The link is active only on its exact path, not on the pages under it. Use it for the link to the root of a section. |
| `active` | `boolean` | No | | Forces the active state. Use it for a link that is also active on other paths. Without it, the link is active when the path of the page matches `to`. When the host gives no location, only `active` makes a link active. |
| `replace` | `boolean` | No | `false` | The link replaces the current entry of the history, so the Back button of the browser does not come back to the current page |
| `children` | `ReactNode` | Yes | | The entity of the row: an EntityRow |

Also accepts:

- `download`, `hrefLang`, `media`, `ping`, `referrerPolicy`, `target`, `type` (from `AnchorHTMLAttributes`)
- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`

### TreeRow\.Action

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `icon` | `ReactNode` | Yes | | The icon in the column of the handle, for example the `LoadMoreChevron` of a "Load more" row |
| `label` | `Message` | Yes | | The text of the button |
| `onClick` | `() => void` | Yes | | Runs on a click on the row |
