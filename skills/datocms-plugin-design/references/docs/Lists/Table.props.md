## Props

### Table

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `columns` | `TableColumn<R>[]` | Yes | | All the columns that the user can show |
| `layout` | `TableLayout` | Yes | | The visible columns and their widths. Get it from a storage adapter (see storage.ts) or from Redux. |
| `onLayoutChange` | `(layout: TableLayout) => void` | Yes | | |
| `sort` | `TableSortState` | No | | The order of the rows: `useClientSort` or a hook of yours gives it. Without it, the user cannot sort from the header. |
| `checkboxes` | `TableCheckboxes` | No | | The header and the rows have a checkbox at their start. The `selectAll` of \<Table.Header> and the `selection` of \<Table.Row> control them. |
| `trailingWidth` | `number` | No | | The width in pixels of a column at the end of each row, outside the columns of the layout and with no label: the controls of the row (see `trailing` of \<Table.Row>). The header keeps the same space empty, so the button of the columns menu sits over it. |
| `reorderable` | `boolean` | No | | The rows have a drag handle at their left. Set it with the `reorder` of \<Table.Body>, or for rows that a library of yours moves (a tree). |
| `tree` | `boolean` | No | | The rows are a tree: the first cell holds the indentation and the toggle |
| `truncate` | `boolean` | No | | The cells show their content on one line, with an ellipsis. A column can change it with its own `truncate`. |
| `className` | `string` | No | | |
| `children` | `ReactNode` | Yes | | |

#### Types

`TableCheckboxes`

```ts
export type TableCheckboxes = {
  /**
   * All the checkboxes show. Without it, a row checkbox shows only on hover,
   * on focus or when the row is selected. Set it while a selection is in
   * progress, and in pickers.
   */
  alwaysVisible?: boolean;
};
```

### TableSortState

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `value` | `TableSort \| null` | Yes | | The column and the direction of the order, or null for no order |
| `onChange` | `(sort: TableSort \| null) => void` | No | | Runs when the user clicks the header of a sortable column. Without it, the header shows the order, but the user cannot change it. |

#### Types

`TableSort`

```ts
export type TableSort = {
  columnName: string;
  direction: SortDirection;
};
```

`SortDirection`

```ts
export type SortDirection = 'asc' | 'desc';
```

### TableCheckboxes

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `alwaysVisible` | `boolean` | No | | All the checkboxes show. Without it, a row checkbox shows only on hover, on focus or when the row is selected. Set it while a selection is in progress, and in pickers. |

### A column

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `name` | `string` | Yes | | The identifier of the column. The layout keeps it. |
| `label` | `Message` | Yes | | The label in the header and in the columns menu |
| `sortable` | `boolean` | No | | The user can sort the rows by this column (with `sort.onChange` on the table) |
| `truncate` | `boolean` | No | | The cell shows its content on one line, and a long text stops at the width of the column with an ellipsis. It overrides the `truncate` prop of the table (true by default). Set it to false for a cell with a layout of its own (images, lists, more lines). |
| `minWidth` | `number` | No | | The smallest width of the column in pixels, with the padding of the cell. When the visible columns do not fit at their smallest width, the table hides the columns with the lowest `priority` (see fitTableLayout). |
| `priority` | `number` | No | | On a narrow table, the columns with a lower priority go first (the default is 0). The first visible column always stays. |
| `renderCell` | `(row: R) => ReactNode` | No | | The content of the cell of this column for a row. A row with its own children does not use it. |

### Table.Header

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `selectAll` | `TableSelectAll` | No | | The checkbox that selects all the rows. It shows only in a table with `checkboxes`. Without it, the checkbox column of the header is empty. |

#### Types

`TableSelectAll`

```ts
export type TableSelectAll = {
  /** All the rows are selected */
  selected: boolean;
  /** Runs when the user clicks the checkbox */
  onChange: (selected: boolean) => void;
};
```

### TableSelectAll

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `selected` | `boolean` | Yes | | All the rows are selected |
| `onChange` | `(selected: boolean) => void` | Yes | | Runs when the user clicks the checkbox |

### Table.Body

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `reorder` | `TableReorder` | No | | The user reorders the rows by their handle. Use Table.SortableRow for the rows and `reorderable` on the table. |
| `className` | `string` | No | | |
| `style` | `React.CSSProperties` | No | | |
| `children` | `ReactNode` | Yes | | The rows |

#### Types

`TableReorder`

```ts
export type TableReorder = {
  /** Runs when the user drops a row at a new position */
  onDrop: (result: SortableDropResult) => void;
  /** The handles show, but the rows stay in place */
  disabled?: boolean;
};
```

### TableReorder

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `onDrop` | `(result: SortableDropResult) => void` | Yes | | Runs when the user drops a row at a new position |
| `disabled` | `boolean` | No | | The handles show, but the rows stay in place |

### Table.Row

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `row` | `R` | No | | The value that the `renderCell` of the columns get |
| `selection` | `RowSelection` | No | | The state of the checkbox of the row, in a table with `checkboxes`. Without `to` and `onOpen`, a click on the row also calls `onSelect`. |
| `drag` | `RowDrag` | No | | The parts that a drag and drop library gives to the row. Table.SortableRow sets them. A tree (the records of a tree model) gives them from its own library. |
| `dragging` | `boolean` | No | | The row shows the look of a row that the user drags |
| `fetching` | `boolean` | No | | The row shows a loading line at its bottom |
| `muted` | `boolean` | No | `false` | The text of the row is subtle and its images fade, but the user can still open it. Use it for an element that is off (for example a deactivated user), with a Pill that says it. |
| `wrapperProps` | ``React.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string>`` | No | | |
| `rowRef` | `Ref<HTMLDivElement>` | No | | The element of the row, without the handle |
| `actions` | `readonly Action[]` | No | | The actions of the row (see `Actions`): their keys work while the pointer or the focus is in the row, and a menu in the row runs them. |
| `rowClassName` | `string` | No | | |
| `firstCell` | `TableFirstCell` | No | | In a tree: the indentation of the row and the toggle of its child rows. In a `tree` table, the first cell keeps the space of the toggle also without it. |
| `trailing` | `ReactNode` | No | | The controls of the row (for example an `Open` button and a menu), in the column at the end of the row (see `trailingWidth` of \<Table>). They show when the pointer is over the row or the focus is in it, and always on a device with no hover. A click in them never opens the row. |
| `children` | `ReactNode` | No | | Cells instead of the cells of the columns. Use \<Table.Cell>. |
| `to` (variant) | `string` | No | | |
| `keepSearch` (variant) | `boolean` | No | | The link keeps the query string of the current page (for example, the filters of the list) |
| `onOpen` (variant) | `() => void` | No | | A click on the row opens it (for example, an event in a side panel). Links and buttons in the row keep their own action. The row takes the focus, and Enter or Space opens it. |
| `active` (variant) | `boolean` | No | | The row is open: it shows the selected color, and it scrolls into view |
| `openWithArrows` (variant) | `boolean` | No | | The Up and Down arrows open the previous or the next row |

#### Types

`RowSelection`

```ts
export type RowSelection = {
  selected: boolean;
  onSelect: (event: React.MouseEvent<HTMLElement>) => void;
  /** The checkbox shows its state, but the user cannot change it */
  disabled?: boolean;
};
```

`RowDrag`

```ts
export type RowDrag = {
  /**
   * The element that the library moves. It has a position, so the drop
   * indicator can be in it.
   */
  wrapperRef?: Ref<HTMLDivElement>;
  /** The line that shows where the row goes */
  dropIndicator?: ReactNode;
  /** Without it, the row has no handle */
  handle?: RowDragHandle;
};
```

`RowDragHandle` — The drag handle on the left of the row: the handle that the library listens to, or a disabled handle with the reason in a tooltip

```ts
export type RowDragHandle =
  /** The user drags the row */
  | { ref: RefCallback; disabled?: never }
  /** The user cannot drag the row now */
  | { disabled: DisabledWithReason; ref?: never };
```

### RowSelection

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `selected` | `boolean` | Yes | | |
| `onSelect` | `(event: React.MouseEvent<HTMLElement>) => void` | Yes | | |
| `disabled` | `boolean` | No | | The checkbox shows its state, but the user cannot change it |

### RowDrag

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `wrapperRef` | `Ref<HTMLDivElement>` | No | | The element that the library moves. It has a position, so the drop indicator can be in it. |
| `dropIndicator` | `ReactNode` | No | | The line that shows where the row goes |
| `handle` | `RowDragHandle` | No | | Without it, the row has no handle |

#### Types

`RowDragHandle` — The drag handle on the left of the row: the handle that the library listens to, or a disabled handle with the reason in a tooltip

```ts
export type RowDragHandle =
  /** The user drags the row */
  | { ref: RefCallback; disabled?: never }
  /** The user cannot drag the row now */
  | { disabled: DisabledWithReason; ref?: never };
```

### Table.SortableRow

The props of `Table.Row` without the drag and drop parts, and:

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | No | | Cells instead of the cells of the columns. Use \<Table.Cell>. |
| `row` | `R` | No | | The value that the `renderCell` of the columns get |
| `dragging` | `boolean` | No | | The row shows the look of a row that the user drags |
| `actions` | `readonly Action[]` | No | | The actions of the row (see `Actions`): their keys work while the pointer or the focus is in the row, and a menu in the row runs them. |
| `selection` | `RowSelection` | No | | The state of the checkbox of the row, in a table with `checkboxes`. Without `to` and `onOpen`, a click on the row also calls `onSelect`. |
| `fetching` | `boolean` | No | | The row shows a loading line at its bottom |
| `muted` | `boolean` | No | `false` | The text of the row is subtle and its images fade, but the user can still open it. Use it for an element that is off (for example a deactivated user), with a Pill that says it. |
| `wrapperProps` | ``React.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string>`` | No | | |
| `rowRef` | `Ref<HTMLDivElement>` | No | | The element of the row, without the handle |
| `rowClassName` | `string` | No | | |
| `firstCell` | `TableFirstCell` | No | | In a tree: the indentation of the row and the toggle of its child rows. In a `tree` table, the first cell keeps the space of the toggle also without it. |
| `trailing` | `ReactNode` | No | | The controls of the row (for example an `Open` button and a menu), in the column at the end of the row (see `trailingWidth` of \<Table>). They show when the pointer is over the row or the focus is in it, and always on a device with no hover. A click in them never opens the row. |
| `to` (variant) | `string` | No | | |
| `keepSearch` (variant) | `boolean` | No | | The link keeps the query string of the current page (for example, the filters of the list) |
| `onOpen` (variant) | `() => void` | No | | A click on the row opens it (for example, an event in a side panel). Links and buttons in the row keep their own action. The row takes the focus, and Enter or Space opens it. |
| `active` (variant) | `boolean` | No | | The row is open: it shows the selected color, and it scrolls into view |
| `openWithArrows` (variant) | `boolean` | No | | The Up and Down arrows open the previous or the next row |
| `id` | `string` | Yes | | The identifier of the row in the Table.Body with `reorder` |
| `index` | `number` | Yes | | The position of the row in the Table.Body with `reorder` |

#### Types

`RowSelection`

```ts
export type RowSelection = {
  selected: boolean;
  onSelect: (event: React.MouseEvent<HTMLElement>) => void;
  /** The checkbox shows its state, but the user cannot change it */
  disabled?: boolean;
};
```

### Table.Cell

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `index` | `number` | Yes | | The position of the column. The cell gets the width of the column. |
| `fill` | `boolean` | No | | A cell that is not in a column fills the row |
| `firstCell` | `TableFirstCell` | No | | The first cell of a tree row puts its content in a wrapper with the indentation and the toggle |
| `truncate` | `boolean` | No | | The content stays on one line and stops with an ellipsis |
| `children` | `ReactNode` | No | | |

#### Types

`TableFirstCell` — The first cell of a tree row: the indentation and the toggle of the child rows

```ts
export type TableFirstCell = {
  /** The indentation in pixels */
  indentation?: number;
} & (TreeNodeFirstCell | CustomFirstCell);
```

`TreeNodeFirstCell` — A node of the tree

```ts
type TreeNodeFirstCell = {
  /**
   * Give it when the row has child rows: the first cell shows the toggle
   * that opens and closes them. Without it, the row keeps the space of the
   * toggle, with a dash when the row is nested.
   */
  expandable?: TableRowExpandable;
  prefix?: never;
};
```

`CustomFirstCell` — A row that is not a node of the tree (for example a "Load more" row)

```ts
type CustomFirstCell = {
  /** The content in the space of the toggle */
  prefix: ReactNode;
  expandable?: never;
};
```

### TableFirstCell

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `indentation` | `number` | No | | The indentation in pixels |
| `expandable` (variant) | `TableRowExpandable` | No | | Give it when the row has child rows: the first cell shows the toggle that opens and closes them. Without it, the row keeps the space of the toggle, with a dash when the row is nested. |
| `prefix` (variant) | `ReactNode` | No | | The content in the space of the toggle |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

Group 1

| Variant | Props | Description |
| - | - | - |
| `TreeNodeFirstCell` | `expandable` | A node of the tree |
| `CustomFirstCell` | `prefix` | A row that is not a node of the tree (for example a "Load more" row) |

### TableRowExpandable

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `open` | `boolean` | Yes | | True when the child rows show |
| `onToggle` | `() => void` | Yes | | Runs when the user clicks the toggle |
| `busy` | `boolean` | No | | The child rows load: a spinner replaces the chevron, and the toggle does nothing |
| `disabled` | `Disabled` | No | | The user cannot open or close the child rows. Give a reason when the user must know why. |

### EntityCell

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `title` | `Message` | Yes | | The title of the entity, for example the title of a record or the name of an asset |
| `afterTitle` | `ReactNode` | No | | The content after the title, for example a status, a validity triangle or the avatars of the users that look at the entity |
| `image` (variant) | `ReactNode` | No | | The image before the title, 35px square. Without it, the title starts at the edge of the cell. |
| `preview` (variant) | `ReactNode` | No | | The preview before the title, with its own size: the thumbnail of an asset |

### LinkCell

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `to` | `string` | Yes | | The path of the link |
| `children` | `string` | Yes | | The text of the link: a string, so the title can show it |

### StatusCell

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `tone` | `FeedbackDotProps['tone']` | Yes | | The color of the dot |
| `children` | `React.ReactNode` | Yes | | The label after the dot |

### IconCell

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `icon` | `React.ReactNode` | Yes | | The icon before the label (an SVG element) |
| `children` | `React.ReactNode` | Yes | | The label |

### TimeCell

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `value` | `string` | Yes | | The date, as an ISO 8601 string |
