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

