## Props

### SortableList

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The `SortableItem` elements, in any structure. |
| `axis` | `SortableAxis` | No | `'vertical'` | The direction of the list. Use `horizontal` for a row of items, such as table columns or the pictures of a gallery. |
| `disabled` | `boolean` | No | `false` | Stops the user from dragging the items. |
| `onDrop` | `(result: SortableDropResult) => void` | Yes | | Runs when the user drops an item at a new place. Use the indexes to change your data. A drop that does not move the item does not run it. |
| `canDropInto` | `(source: SortableItemData, containerId: string) => boolean` | No | | Says if an item can go in a container. By default, all the items can go in all the containers. For example, a fieldset cannot go in another fieldset. |

#### Types

`SortableAxis`

```ts
export type SortableAxis = 'vertical' | 'horizontal';
```

`SortableDropResult` — `destination.index` is the index of the element in the destination list after the move.

```ts
export type SortableDropResult = {
  draggableId: string;
  source: SortableLocation;
  destination: SortableLocation;
};
```

`SortableItemData`

```ts
export type SortableItemData = DragData & {
  kind: 'sortable-item';
  instanceId: string;
  id: string;
  index: number;
  containerId: string;
};
```

`SortableLocation`

```ts
export type SortableLocation = {
  index: number;
  containerId: string;
};
```

### SortableItem

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | Yes | | A name that stays the same when the item moves. It is `draggableId` in the drop result. |
| `index` | `number` | Yes | | The position of the item in its list. |
| `disabled` | `boolean` | No | `false` | Stops the user from dragging this item. |
| `handle` | `boolean` | No | `false` | When `true`, the user drags the item only from its handle: give `handleRef` to the grip. |
| `preview` | `DragPreview` | No | `'element'` | The picture that the browser shows during the drag. Use `none` when the element itself shows the drag. |
| `children` | `(api: SortableItemApi) => ReactNode` | Yes | | Gets the `ref` of the item and the drop line, and renders the item. |

#### Types

`SortableItemApi`

```ts
export type SortableItemApi = {
  // Give it to the element that moves
  ref: RefCallback;
  // Give it to the drag handle, when `handle` is true
  handleRef: RefCallback;
  isDragging: boolean;
  // The edge of the item where the dragged element goes, or null
  closestEdge: Edge | null;
  // The line that shows where the dragged element goes. Put it in the
  // element that has `ref`, which must have a position.
  dropIndicator: ReactNode;
};
```

### SortableContainer

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | Yes | | The name of the container. Use `ROOT_CONTAINER_ID` for the first level. |
| `itemCount` | `number` | Yes | | The number of items in the container. A drop on the container itself (not on one of its items) puts the element after the last item. |
| `children` | `(api: { ref: RefCallback; isOver: boolean }) => ReactNode` | Yes | | Gets `ref` for the element that holds the items. |

### SortableTree

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `tree` | `TreeData<D>` | Yes | | The items of the tree. The root item does not show: its children are the first level. Only the children of an item with `isExpanded` show. |
| `renderItem` | `(params: RenderItemParams<D>) => ReactNode` | Yes | | Renders one row. Give `provided.innerRef` and `provided.draggableProps.style` (the indent) to the element of the row, `provided.dragHandleRef` to a DragHandle, `provided.treeItemProps` to the element of the row that takes the focus, and put `provided.dropIndicator` in the row, which must have a CSS `position`. |
| `handle` | `boolean` | No | `false` | When true, the user drags a row only from the element of `provided.dragHandleRef`. A row without this element in the DOM does not move: a row with a disabled handle, or a "Load more" row. When false, the user drags a row from any point of it. |
| `onDragStart` | `(itemId: ItemId) => void` | No | | Runs when the user starts to drag an item |
| `onDragEnd` | `( source: TreeSourcePosition, destination?: TreeDestinationPosition, ) => void` | No | | Runs when the user drops an item. Give `source` and `destination` to `moveItemOnTree` to change the tree. `destination` is undefined when the drop moves nothing. |
| `offsetPerLevel` | `number` | No | `30` | The indent of each level, in pixels |
| `isDragEnabled` | `boolean` | No | `true` | When false, the user cannot drag the items |
| `isNestingEnabled` | `boolean` | No | `true` | When false, an item can change place, but it cannot go in another item |
| `canNest` | `(item: TreeItem<D>) => boolean` | No | | Says if the dragged item can go in this item, for example only in a folder. It has an effect only with `isNestingEnabled`. By default, all the items take children. |
| `canDrag` | `(item: TreeItem<D>) => boolean` | No | | Says if the user can drag this item. By default, all the items move. |
| `indentStyle` | `TreeIndentStyle` | No | `'padding'` | How the rows show their indent |
| `className` | `string` | No | | A class for the element of the tree |
| `onToggle` | `(itemId: ItemId) => void` | No | | Runs when the user opens or closes an item with the arrow keys. Give the function that the rows run on a click on their toggle. |

#### Types

`TreeIndentStyle` — How the rows show their indent. With "padding", the element of the row spans the full width and has the indent as a left padding. With "margin", the box of the row starts after the indent.

```ts
export type TreeIndentStyle = 'padding' | 'margin';
```

### DropIndicator

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `edge` | `Edge` | Yes | | The edge of the element where the dragged item goes. |
| `gap` | `string` | No | `'0px'` | The space between the element and its sibling on the side of the edge, as a CSS length. The line goes in the middle of the space. |
| `inset` | `string` | No | `'0px'` | Moves the start of the line to the right (or down), as a CSS length. Use it to indent the line. |

### DragHandle

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `gutter` | `'normal' \| 'wide'` | No | | Puts the handle in the gutter on the left of the item, out of its content. "wide" is a wider gutter, for a table row. The item must have a CSS `position`. Without it, the handle stays in the flow, and its place comes from `className`. |
| `className` | `string` | No | | A class for the position of the handle in its block |

### useFileDropTarget

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `onDrop` | `(files: File[]) => void` | Yes | | Runs when the user drops files on the element. |
| `disabled` | `boolean` | No | `false` | Stops the element from taking files. |
| `multiple` | `boolean` | No | `true` | When `false`, `onDrop` gets only the first file. |

### useFilePicker

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `onPick` | `(files: File[]) => void` | Yes | | Runs when the user picks files in the dialog of the browser. |
| `multiple` | `boolean` | No | `true` | Lets the user pick more than one file. |

### dropTargetClassName

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `isOver` | `boolean` | Yes | | The dragged element or the files are over the target now |
| `ringOnly` | `boolean` | No | `false` | Shows only the ring, with no surface, for a target as large as the page or a pane. |
| `refused` | `boolean` | No | `false` | A drag is in progress, and the target does not take the dragged element. The target fades, so the user sees where the element cannot go before the pointer gets there. Read the drag with `useActiveDrag`. |
