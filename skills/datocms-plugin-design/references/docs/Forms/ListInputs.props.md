## Props

### TableList

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `value` | `Item[]` | Yes | | The rows of the list. |
| `onChange` | `(items: Item[], change: TableListChange) => void` | Yes | | Called with the new rows when the user adds, removes, moves or changes a row. The second argument says what changed. |
| `errors` | `TableListErrors` | No | | The errors of the list. An error of a cell shows when the cell is touched, an error of the list shows when `touched` is set. |
| `touched` | `TableListTouched` | No | | The cells that the user touched. |
| `onCellBlur` | `(cell: { index: number; field: string }) => void` | No | | Called when a cell with a `field` loses the focus. |
| `disabled` | `boolean` | No | | The user cannot change the list. |
| `id` | `string` | No | | The `id` of the group element around the list. In a `FieldWrapper`, the list gets the `id` of the field. |
| `aria-labelledby` (variant) | `string` | No | | The `id` of the visible title of the list |
| `ariaLabel` (variant) | `TextMessage` | No | | The name of the list, when it has no visible title |
| `columns` | `TableListColumn<Item>[]` | Yes | | The columns of the list. Wrap them in `useMemo`. |
| `emptyMessage` | `Message` | Yes | | The text of the list when it has no row. |
| `add` | `TableListAdd<Item>` | No | | The button that adds a row. Without it, the user cannot add a row (for example when all the kinds of rows are in the list). |
| `sortable` | `boolean` | No | | The user can drag the rows to change their order. |
| `onRemove` | `(index: number, item: Item, remove: () => void) => void` | No | | Runs when the user clicks the trash of a row. Use it to ask for a confirm first: call `remove` to remove the row. Without it, the row goes out of the list at once. |
| `locked` | `TableListLocked<Item>` | No | | Some rows are locked: the user cannot remove them. |

#### Types

`TableListChange` — What changed in the list. The second argument of `onChange`.

```ts
export type TableListChange =
  | {
      /** The user added a row at the end. */
      type: 'add';
    }
  | {
      /** The user removed the row at `index`. */
      type: 'remove';
      index: number;
    }
  | {
      /** The user dragged the row at `from` to `to`. */
      type: 'move';
      from: number;
      to: number;
    }
  | {
      /** The user changed a cell. `field` is "" when the cell is the row. */
      type: 'edit';
      index: number;
      field: string;
    };
```

`TableListErrors` — The errors of the list, in the shape of Formik and react-final-form: one error of the whole list, or an array with the errors of each row.

```ts
export type TableListErrors =
  | TableListError
  | (TableListRowErrors | undefined)[];
```

`TableListTouched` — The touched state of the list, in the shape of Formik and react-final-form: `true` for all the cells, or an array with the touched state of each row.

```ts
export type TableListTouched = boolean | (TableListRowTouched | undefined)[];
```

`TableListColumn` — One column of the list.

```ts
export type TableListColumn<Item> = {
  /** A key that is unique in the list, for example "label". */
  id: string;
  /** The title of the column. It is also the name of the input. */
  label: TextMessage;
  /**
   * The part of the width that the column gets, in "fr".
   * @default 1
   */
  grow?: number;
  /**
   * The key of the value of the cell in the item, for example "label". An
   * empty string is the item itself. A column without a key shows no error
   * and does not become touched.
   */
  field?: string;
  /** The value is code: the input uses the monospaced font. */
  code?: boolean;
  /**
   * The content of the cell. Without it, the cell is a text input.
   */
  render?: (cell: TableListCell<Item>) => ReactNode;
};
```

`TableListAdd` — How the user adds a row: at once, or with a menu

```ts
export type TableListAdd<Item> =
  | TableListAddItem<Item>
  | TableListAddMenu<Item>;
```

`TableListLocked` — The rows that the user cannot remove, and the reason

```ts
export type TableListLocked<Item> = {
  /** Tells if a row is locked */
  isLocked: (item: Item) => boolean;
  /** The tooltip of the disabled trash of a locked row. It says why */
  reason: TextMessage;
};
```

`TableListError` — One error: a text to show as it is, or an error id.

```ts
export type TableListError = string | TableListErrorId;
```

`TableListRowErrors` — The errors of one row: an error of the row, or the errors of its cells.

```ts
export type TableListRowErrors =
  | TableListError
  | { [field: string]: TableListError | undefined };
```

`TableListRowTouched` — The touched state of one row: all the row, or each cell by its field.

```ts
export type TableListRowTouched =
  | boolean
  | { [field: string]: boolean | undefined };
```

`TableListCell` — What `render` gets for one cell.

```ts
export type TableListCell<Item> = {
  /** The value of the row. */
  item: Item;
  /** The index of the row. */
  index: number;
  /**
   * The value of the cell: `item[field]`, or the row itself when the column
   * has no `field` or an empty `field`.
   */
  value: unknown;
  /** Call it with the new value of the cell. */
  onChange: (newValue: unknown) => void;
  /** Call it when the input loses the focus: the cell becomes touched. */
  onBlur: () => void;
  /** Give these props to the input of the cell. */
  inputProps: TableListInputProps;
};
```

`TableListAddItem` — The add button adds a `newItem` at once

```ts
type TableListAddItem<Item> = {
  /** The label of the button that adds a row */
  label: TextMessage;
  /** Makes the value of a new row, for example `() => ({ label: '' })` */
  newItem: () => Item;
  options?: never;
};
```

`TableListAddMenu` — The add button opens a menu: the user picks the kind of row to add

```ts
type TableListAddMenu<Item> = {
  /** The label of the button that opens the menu */
  label: TextMessage;
  /**
   * Gives the `Dropdown.Option` elements of the menu. Each option calls
   * `addItem` with its row.
   */
  options: (addItem: (item: Item) => void) => ReactNode;
  newItem?: never;
};
```

`TableListErrorId` — An error with the key of its text, and the values of the text.

```ts
export type TableListErrorId = {
  /** The key of the text of the error, for example "myPlugin.required". */
  id: string;
  /** The values of the text of the error. */
  values?: Record<string, string>;
};
```

`TableListInputProps` — The props that a cell must give to its input.

```ts
export type TableListInputProps = {
  /** The `id` of the input. */
  id: string;
  /** The classes of the input: the look of the cell. */
  className: string;
  /** The label of the column: the name of the input for a screen reader. */
  'aria-label': string;
  /** Set when the cell has an error. */
  'aria-invalid'?: true;
  /** The id of the error message under the list. */
  'aria-describedby'?: string;
  /** The list is disabled. */
  disabled: boolean;
};
```

### TableListColumn

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | Yes | | A key that is unique in the list, for example "label". |
| `label` | `TextMessage` | Yes | | The title of the column. It is also the name of the input. |
| `grow` | `number` | No | `1` | The part of the width that the column gets, in "fr". |
| `field` | `string` | No | | The key of the value of the cell in the item, for example "label". An empty string is the item itself. A column without a key shows no error and does not become touched. |
| `code` | `boolean` | No | | The value is code: the input uses the monospaced font. |
| `render` | `(cell: TableListCell<Item>) => ReactNode` | No | | The content of the cell. Without it, the cell is a text input. |

#### Types

`TableListCell` — What `render` gets for one cell.

```ts
export type TableListCell<Item> = {
  /** The value of the row. */
  item: Item;
  /** The index of the row. */
  index: number;
  /**
   * The value of the cell: `item[field]`, or the row itself when the column
   * has no `field` or an empty `field`.
   */
  value: unknown;
  /** Call it with the new value of the cell. */
  onChange: (newValue: unknown) => void;
  /** Call it when the input loses the focus: the cell becomes touched. */
  onBlur: () => void;
  /** Give these props to the input of the cell. */
  inputProps: TableListInputProps;
};
```

`TableListInputProps` — The props that a cell must give to its input.

```ts
export type TableListInputProps = {
  /** The `id` of the input. */
  id: string;
  /** The classes of the input: the look of the cell. */
  className: string;
  /** The label of the column: the name of the input for a screen reader. */
  'aria-label': string;
  /** Set when the cell has an error. */
  'aria-invalid'?: true;
  /** The id of the error message under the list. */
  'aria-describedby'?: string;
  /** The list is disabled. */
  disabled: boolean;
};
```

### TableListCell

What `render` of a column gets.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `item` | `Item` | Yes | | The value of the row. |
| `index` | `number` | Yes | | The index of the row. |
| `value` | `unknown` | Yes | | The value of the cell: `item[field]`, or the row itself when the column has no `field` or an empty `field`. |
| `onChange` | `(newValue: unknown) => void` | Yes | | Call it with the new value of the cell. |
| `onBlur` | `() => void` | Yes | | Call it when the input loses the focus: the cell becomes touched. |
| `inputProps` | `TableListInputProps` | Yes | | Give these props to the input of the cell. |

#### Types

`TableListInputProps` — The props that a cell must give to its input.

```ts
export type TableListInputProps = {
  /** The `id` of the input. */
  id: string;
  /** The classes of the input: the look of the cell. */
  className: string;
  /** The label of the column: the name of the input for a screen reader. */
  'aria-label': string;
  /** Set when the cell has an error. */
  'aria-invalid'?: true;
  /** The id of the error message under the list. */
  'aria-describedby'?: string;
  /** The list is disabled. */
  disabled: boolean;
};
```

### TableListInputProps

Give them all to the input of the cell, with the `value`, `onChange` and
`onBlur` of the cell.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | Yes | | The `id` of the input. |
| `className` | `string` | Yes | | The classes of the input: the look of the cell. |
| `aria-label` | `string` | Yes | | The label of the column: the name of the input for a screen reader. |
| `aria-invalid` | `true` | No | | Set when the cell has an error. |
| `aria-describedby` | `string` | No | | The id of the error message under the list. |
| `disabled` | `boolean` | Yes | | The list is disabled. |

### KeyValueList

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `value` | `Item[]` | Yes | | The rows of the list. |
| `onChange` | `(items: Item[], change: TableListChange) => void` | Yes | | Called with the new rows when the user adds, removes, moves or changes a row. The second argument says what changed. |
| `errors` | `TableListErrors` | No | | The errors of the list. An error of a cell shows when the cell is touched, an error of the list shows when `touched` is set. |
| `touched` | `TableListTouched` | No | | The cells that the user touched. |
| `onCellBlur` | `(cell: { index: number; field: string }) => void` | No | | Called when a cell with a `field` loses the focus. |
| `disabled` | `boolean` | No | | The user cannot change the list. |
| `id` | `string` | No | | The `id` of the group element around the list. In a `FieldWrapper`, the list gets the `id` of the field. |
| `aria-labelledby` (variant) | `string` | No | | The `id` of the visible title of the list |
| `ariaLabel` (variant) | `TextMessage` | No | | The name of the list, when it has no visible title |
| `texts` | `KeyValueListTexts` | Yes | | The texts of the list. Give a constant, so the columns stay the same. |
| `locale` | `string` | No | | The language of the values, as a locale code, for example "it". The inputs get it as the `lang` attribute, and get their `dir` from it. |
| `defaults` | `KeyValueListDefaults` | No | | The pairs that a default gives, for example the custom data of all the assets. A row with one of these keys is locked: the key cannot change, the default value is the placeholder of the value, and the user cannot remove the row. |

#### Types

`KeyValueListTexts` — The texts of a KeyValueList, already translated or as `{ id }`

```ts
export type KeyValueListTexts = {
  /** The title of the key column, for example "Header" */
  key: TextMessage;
  /**
   * The title of the value column
   * @default "Value"
   */
  value?: TextMessage;
  /** The label of the button that adds a row, for example "Add header" */
  add: TextMessage;
  /** The text of the list when it has no row, for example "No headers" */
  empty: Message;
};
```

`KeyValueListDefaults` — The pairs that a default gives, and why their rows are locked

```ts
export type KeyValueListDefaults = {
  /** The pairs of the default */
  values: GenericObject;
  /**
   * The tooltip of the disabled trash of a default row, for example "This
   * pair comes from the default metadata"
   */
  lockedReason: TextMessage;
};
```

`GenericObject` — An object with any keys, for example the custom data of an asset.

```ts
export type GenericObject = {
  [key: string]: unknown;
};
```
