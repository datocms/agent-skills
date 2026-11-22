# List inputs

`TableList` and `KeyValueList` are controlled inputs for a list of values:
they get the rows in `value` and give the new rows to `onChange`. They use no
form library, so they work with `useState`, Formik or react-final-form.

| Use | For |
| - | - |
| `TableList` | A list of rows of fields, with a title for each column, a trash for each row, an add button and, if you want, drag and drop. |
| `KeyValueList` | A `TableList` of two text columns: a key and a value. |
| [`EmptySlot`](https://react-ui.datocms.com/Lists/EmptySlot.md) | The empty state of a list, when you draw the list yourself. |
| [`SettingsList`](https://react-ui.datocms.com/Lists/SettingsList.md) | A list of settings with visible controls. It is not a list that the user makes. |

## TableList

`TableList` draws the rows in one box with the titles of the columns, one
line for each item and a trash that shows on hover. The inputs have no
border of their own: the cell shows the focus and the error. Do not build
such a list with `Field` elements in a grid.

Give the rows in `value` and keep the new rows of `onChange`. The second
argument of `onChange` says what changed (`add`, `remove`, `move` or
`edit`). Use it when a state follows the rows, for example the touched state.
The rows have no id: React finds a row by its index.

Each column has these props:

- `label` is the title, and the name of the input for a screen reader.
- `field` is the key of the value in the item. `''` is the item itself.
- `render` is a function for a cell that is not a text input.
- `grow` is the width of the column in `fr`.
- `code` gives the column the monospaced font.

A column without a `field` shows no error.

The list is a group with a name for a screen reader. In a [`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md)
with a `label`, the label names it, and the list takes the `id` and the hint
of the field. The cells keep their own names. Outside a [`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md), give
`aria-labelledby` with the `id` of its visible title (the `id` of a
[`Page.SectionTitle`](https://react-ui.datocms.com/Layout/Page.md)), or `ariaLabel` when it has no title.

The user adds a row with the [`InsertGap`](https://react-ui.datocms.com/Lists/InsertGap.md) under the list: a “+” in the
gutter and a line when the pointer is near. `add={{ label, newItem }}` adds
the value of `newItem`, and moves the focus to the first input
of the new row. When the list has no rows, the user sees `emptyMessage` and the
same action. Without `add`, the user cannot add a row.

The last row shows the errors: one text for each kind of error, not one for each cell.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import TableList, {
  type TableListColumn,
  type TableListErrors,
  type TableListRowTouched,
} from 'datocms-react-ui/TableList';
import React, { useMemo, useState } from 'react';

type Option = {
  label: string;
  value: string;
  hint: string | null;
};

const newItem = (): Option => ({ label: '', value: '', hint: '' });

// A label and a value are required in each row
function validate(options: Option[]): TableListErrors {
  return options.map((option) => ({
    label: option.label ? undefined : 'Required',
    value: option.value ? undefined : 'Required',
  }));
}

export default function SortableOptions() {
  const [options, setOptions] = useState<Option[]>([
    { label: 'First option', value: 'first', hint: '' },
    { label: 'Second option', value: 'second', hint: '' },
    { label: '', value: '', hint: '' },
  ]);
  // The cells of the last row are touched: their errors show at once
  const [touched, setTouched] = useState<(TableListRowTouched | undefined)[]>([
    {},
    {},
    { label: true, value: true },
  ]);

  const columns = useMemo<TableListColumn<Option>[]>(
    () => [
      { id: 'label', field: 'label', label: 'Label', grow: 4 },
      { id: 'value', field: 'value', label: 'Value', grow: 3, code: true },
      { id: 'hint', field: 'hint', label: 'Hint', grow: 5 },
    ],
    [],
  );

  return (
    <FieldWrapper label="Options">
      <TableList<Option>
        value={options}
        onChange={(newOptions, change) => {
          setOptions(newOptions);
          // The touched state follows the rows
          if (change.type === 'remove') {
            setTouched((rows) => rows.filter((_, i) => i !== change.index));
          }
        }}
        errors={validate(options)}
        touched={touched}
        onCellBlur={({ index, field }) =>
          setTouched((rows) => {
            const newRows = [...rows];
            const row = newRows[index];
            newRows[index] = {
              ...(typeof row === 'object' ? row : {}),
              [field]: true,
            };
            return newRows;
          })
        }
        columns={columns}
        emptyMessage="No options yet"
        add={{ label: 'Add option', newItem }}
        sortable={true}
      />
    </FieldWrapper>
  );
}
```

Give `sortable` to let the user drag the rows. The order of the rows changes.

### Errors

`errors` and `touched` have the shape of Formik and react-final-form.

- `errors` is one error of the whole list, or an array with the errors of
  each row: an object with an error for each field. An error is a text, or
  `{ id, values }` with the key of a text and its values. The ids of the
  validators are `fieldError.<id>` keys.
- `touched` is `true` for all the cells, or an array with the touched cells
  of each row. `onCellBlur` says when a cell becomes touched.

The error of a cell shows under the list when the cell is touched: one
message for each kind of error. The cells that have the error get the red
state and `aria-invalid`. The error of the list shows above the rows when
`touched` is set.

### Select cells

Give the column a `render` that returns a [`SelectInput`](https://react-ui.datocms.com/Forms/SelectInput.md), with
`variant="embedded"` and `classNamePrefix="TableList__select"`. The select
then has the look of a text cell: no border, no surface, and the text at the
inset of the other cells. `render` gets the `value` of the cell, `onChange`
and `onBlur`: give them to the select. Give it the `inputProps` of the cell
without `className`, because that class is for a text input.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import SelectInput from 'datocms-react-ui/SelectInput';
import TableList, { type TableListColumn } from 'datocms-react-ui/TableList';
import React, { useMemo, useState } from 'react';

type Redirect = { source: string; target: string; status: string };

const STATUSES = [
  { value: '301', label: '301 Permanent' },
  { value: '302', label: '302 Temporary' },
  { value: '410', label: '410 Gone' },
];

const newItem = (): Redirect => ({ source: '', target: '', status: '301' });

export default function SelectCell() {
  const [redirects, setRedirects] = useState<Redirect[]>([
    { source: '/blog/old-post', target: '/blog/new-post', status: '301' },
    { source: '/summer-sale', target: '/', status: '302' },
  ]);

  const columns = useMemo<TableListColumn<Redirect>[]>(
    () => [
      { id: 'source', field: 'source', label: 'From', grow: 3, code: true },
      { id: 'target', field: 'target', label: 'To', grow: 3, code: true },
      {
        id: 'status',
        field: 'status',
        label: 'Status',
        grow: 2,
        // The class of the cell input is for a text input: the select does
        // not take it
        render: ({
          index,
          value,
          onChange,
          onBlur,
          inputProps: { className: _, ...inputProps },
        }) => (
          <SelectInput
            {...inputProps}
            name={`status-${index}`}
            value={value as string}
            onChange={onChange}
            onBlur={onBlur}
            options={STATUSES}
            clearable={false}
            variant="embedded"
            classNamePrefix="TableList__select"
          />
        ),
      },
    ],
    [],
  );

  return (
    <FieldWrapper label="Redirects">
      <TableList<Redirect>
        value={redirects}
        onChange={setRedirects}
        columns={columns}
        emptyMessage="No redirects"
        add={{ label: 'Add redirect', newItem }}
      />
    </FieldWrapper>
  );
}
```

### Add menu

When the user must choose what to add, give `add={{ label, options }}`:
`options` gets `addItem` and gives the [`Dropdown.Option`](https://react-ui.datocms.com/Actions/Dropdown.md) elements of a menu,
and each option adds its row with `addItem`. The button
opens the menu. When the user added all the kinds already, give no `add`. The
list then has no add button, even when it has no rows.

A kind of condition can be used once.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import TableList, { type TableListColumn } from 'datocms-react-ui/TableList';
import React, { useMemo, useState } from 'react';

type Condition = { entity_type: string; entity_ids: string };

const CONDITION_TYPES = [
  { value: 'item_type', label: 'Model' },
  { value: 'environment', label: 'Environment' },
  { value: 'item', label: 'Record' },
];

export default function AddOptions() {
  const [conditions, setConditions] = useState<Condition[]>([
    { entity_type: 'item_type', entity_ids: 'blog_post' },
  ]);

  const columns = useMemo<TableListColumn<Condition>[]>(
    () => [
      {
        id: 'entity_type',
        field: 'entity_type',
        label: 'Only for',
        render: ({ item }) => (
          <span className="TableList__text">
            {
              CONDITION_TYPES.find((type) => type.value === item.entity_type)
                ?.label
            }
          </span>
        ),
      },
      { id: 'entity_ids', field: 'entity_ids', label: 'IDs', grow: 3 },
    ],
    [],
  );

  // A type can be used only once. When all are used, the list has no add
  // button.
  const used = conditions.map((condition) => condition.entity_type);
  const types = CONDITION_TYPES.filter((type) => !used.includes(type.value));

  return (
    <FieldWrapper label="Conditions">
      <TableList<Condition>
        value={conditions}
        onChange={setConditions}
        columns={columns}
        emptyMessage="No conditions: the webhook runs for all the entities"
        add={
          types.length > 0
            ? {
                label: 'Add condition',
                options: (addItem) =>
                  types.map(({ value, label }) => (
                    <Dropdown.Option
                      key={value}
                      onPick={() =>
                        addItem({ entity_type: value, entity_ids: '' })
                      }
                    >
                      {label}
                    </Dropdown.Option>
                  )),
              }
            : undefined
        }
      />
    </FieldWrapper>
  );
}
```

The kind of a row cannot change, so its cell is a text, not an input. Put
the text in a `<span className="TableList__text">`. It gets the inset of the
text of the inputs in the other cells.

### Remove

The trash of a row removes the row. Give `onRemove` when the
user must confirm first. It gets the index, the row and `remove`, and it calls
`remove` when the user confirms.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import TableList, { type TableListColumn } from 'datocms-react-ui/TableList';
import React, { useMemo, useState } from 'react';

type Stage = { name: string };

export default function ConfirmedRemove() {
  const [stages, setStages] = useState<Stage[]>([
    { name: 'Draft' },
    { name: 'In review' },
  ]);

  const columns = useMemo<TableListColumn<Stage>[]>(
    () => [{ id: 'name', field: 'name', label: 'Stage name' }],
    [],
  );

  return (
    <FieldWrapper label="Stages">
      <TableList<Stage>
        value={stages}
        onChange={setStages}
        columns={columns}
        emptyMessage="No stages yet"
        add={{ label: 'Add stage', newItem: () => ({ name: '' }) }}
        sortable={true}
        // Ask before a stage goes away. Without `onRemove`, the row goes at once.
        onRemove={(_index, stage, remove) => {
          if (!stage.name || window.confirm(`Remove "${stage.name}"?`)) {
            remove();
          }
        }}
      />
    </FieldWrapper>
  );
}
```

**Do:** Use a TableList for rows of fields that the user adds and removes.

Options, webhook triggers, workflow stages, headers.

**Don’t:** Do not use it for a list of records or files. Use a Table, or a field of its own.

A list of records that the user does not type.

## KeyValueList

`KeyValueList` is a `TableList` with a `key` column (code font) and a `value`
column, for an object that the user makes: headers, custom data, link
attributes. A row is a `Tuple`: `{ key, value }`. The state keeps a list of
tuples, not an object: use `deserialize` for the initial value and
`serialize` for the submit. `value`, `onChange`, `errors` and `touched` work
as in `TableList`.

`KeyValueList` takes its texts in `texts={{ key, value, add, empty }}`, as
strings or `{ id }`:

- `key` is the title of the key column.
- `value` is the title of the value column ("Value" when you do not give it).
- `add` is the label of the add button.
- `empty` is the text of the empty list.

Give a constant, so the columns stay the same.

An empty key or value shows an error after the submit: all the cells are touched.

```tsx
import Button from 'datocms-react-ui/Button';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import KeyValueList, {
  deserialize,
  type KeyValueListTexts,
  serialize,
  type Tuple,
} from 'datocms-react-ui/KeyValueList';
import { type TableListErrors } from 'datocms-react-ui/TableList';
import React, { useState } from 'react';

const TEXTS: KeyValueListTexts = {
  key: 'Name',
  add: 'Add pair',
  empty: 'No custom data',
};

// A key and a value are required in each row
function validate(rows: Tuple[]): TableListErrors {
  return rows.map((row) => ({
    key: row.key ? undefined : 'Required',
    value: row.value ? undefined : 'Required',
  }));
}

export default function KeyValue() {
  // The list keeps rows. The API takes an object.
  const [rows, setRows] = useState(() =>
    deserialize({ credit: 'Jane Doe', license: 'CC-BY' }),
  );
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        console.log(serialize(rows));
      }}
    >
      <FieldWrapper label="Custom data">
        <KeyValueList
          texts={TEXTS}
          value={rows}
          onChange={setRows}
          errors={validate(rows)}
          // All the cells are touched after the submit
          touched={submitted}
        />
      </FieldWrapper>
      <Button submit label="Save" />
    </form>
  );
}
```

### Defaults

Give `defaults` when some pairs come from a default, for example the custom
data that all the assets have. The row of such a key is locked: the user cannot
change the key or remove the row, and the default value is the placeholder of
the value. In `defaults={{ values, lockedReason }}`, `lockedReason` is the
tooltip of the disabled trash. A `TableList` locks rows with
`locked={{ isLocked, reason }}`.

The “credit” row keeps its key. The user can still type a value.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import KeyValueList, {
  deserialize,
  type KeyValueListTexts,
} from 'datocms-react-ui/KeyValueList';
import React, { useState } from 'react';

const TEXTS: KeyValueListTexts = {
  key: 'Name',
  add: 'Add pair',
  empty: 'No custom data',
};

// The custom data that all the assets get by default
const defaults = {
  values: { credit: 'Unknown', license: 'All rights reserved' },
  lockedReason: 'You cannot remove a default pair',
};

export default function LockedDefaults() {
  const [rows, setRows] = useState(() =>
    deserialize({ credit: 'Jane Doe', source: 'Unsplash' }),
  );

  return (
    <FieldWrapper label="Custom data">
      <KeyValueList
        texts={TEXTS}
        defaults={defaults}
        locale="en"
        value={rows}
        onChange={setRows}
      />
    </FieldWrapper>
  );
}
```

## CSS variables

## CSS variables

- `--TableList-horizontal-cell-padding`: The space at the sides of a cell
- `--TableList-vertical-cell-padding`: The space above and below a cell

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
