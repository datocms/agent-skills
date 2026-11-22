# FilterBuilder

`FilterBuilder` lets the user build a filter of conditions. Each condition is
a tile with three parts: the field ("Status"), the operator ("is") and the
value ("Published"). The user adds a condition with the "+" button, changes
each part in its tile, and removes the tile with its "✕". The "✕" after
the tiles removes all the conditions.

It is a controlled component. Keep the conditions in your state, give them
to `value`, and set them again in `onChange`. Your code reads the conditions
and filters the records, or sends them to an API.

## Fields and operators

`fields` is the list of the things that the user can filter by. Each field
has its operators, and each operator has an `editor`: the input of the
value.

| Editor | Value |
| - | - |
| `{ type: 'none' }` | `null`. For an operator with no value: "is empty". |
| `{ type: 'text' }` | A string. |
| `{ type: 'number' }` | A number, or `null`. |
| `{ type: 'list' }` | A list of strings. The user separates them with commas. |
| `{ type: 'select', options }` | One `value` of the options, or `null`. With `multiple`, a list of values. |
| `{ type: 'group', arguments }` | An object with one key for each argument. Each argument has its own editor. |
| `{ type: 'custom', kind, defaultValue, render }` | What your input gives. |

The text inputs send their value 1 second after the user stops typing, or
when the user leaves the input. A select starts empty: a condition with no
value is for your code to skip. When a select has a value that a new
condition must take (a boolean, which filters nothing without a value), give
it as `defaultValue`.

A field can have a `code`: its key in your data or in your API
(`author.name`). The menus of the fields show it after the label, in a
monospace font, thus a technical user can tell apart two fields with near
labels. The tile shows only the label.

When a field has only one operator, the tile shows the operator as text,
not as a menu.

## Rules of the conditions

- **A field has one condition for each operator.** The "+" menu offers only
  the fields that have a free operator, and the menu of a tile offers only
  the free operators. With `oneConditionPerField`, a field has one
  condition only.
- **A new condition takes the first free operator**, with the default value
  of its editor.
- **A change of operator keeps the value when it fits** the new editor: the
  same type (two selects with the option, two numbers, two groups with the
  same arguments, a text and a list), or two custom editors of the same
  `kind`. Otherwise the value becomes the default value of the new editor.
- **An operator with `deprecated`** shows only in a tile that already uses
  it. Use it for an operator that you keep for old filters.

## In a toolbar

In a [`Toolbar.Search`](https://react-ui.datocms.com/Layout/Landmarks.md) of a `<Toolbar fields>`, the builder shows a funnel
before the tiles. Put a [`Toolbar.Divider`](https://react-ui.datocms.com/Layout/Toolbar.md) between the text filter and the
builder: see the Filter section of the Toolbar page.

Add conditions until they wrap: the text filter, the funnel and the
buttons stay on the first line.

```tsx
import Button from 'datocms-react-ui/Button';
import FilterBuilder, {
  type FilterCondition,
  type FilterField,
} from 'datocms-react-ui/FilterBuilder';
import Pane from 'datocms-react-ui/Pane';
import Toolbar from 'datocms-react-ui/Toolbar';
import React, { useState } from 'react';

type Article = {
  title: string;
  status: string;
  locale: string;
  author: string;
};

type Key = Exclude<keyof Article, 'title'>;

const VALUES: Record<Key, { label: string; values: string[] }> = {
  status: { label: 'Status', values: ['Draft', 'Published', 'Updated'] },
  locale: { label: 'Locale', values: ['English', 'Italian', 'German'] },
  author: { label: 'Author', values: ['Ada', 'Grace', 'Linus'] },
};

const FIELDS: FilterField[] = (Object.keys(VALUES) as Key[]).map((key) => {
  const options = VALUES[key].values.map((value) => ({ value, label: value }));

  return {
    id: key,
    label: VALUES[key].label,
    operators: [
      { id: 'eq', label: 'is', editor: { type: 'select', options } },
      { id: 'neq', label: 'is not', editor: { type: 'select', options } },
    ],
  };
});

const ARTICLES: Article[] = [
  {
    title: 'Spring launch',
    status: 'Published',
    locale: 'English',
    author: 'Ada',
  },
  {
    title: 'Getting started',
    status: 'Draft',
    locale: 'Italian',
    author: 'Grace',
  },
  {
    title: 'Team update',
    status: 'Updated',
    locale: 'English',
    author: 'Linus',
  },
  {
    title: 'New editor',
    status: 'Published',
    locale: 'German',
    author: 'Grace',
  },
];

function matches(
  article: Article,
  { field, operator, value }: FilterCondition,
) {
  // A condition with no value yet does not hide any article
  if (value === null) return true;
  const same = article[field as Key] === value;
  return operator === 'eq' ? same : !same;
}

export default function FilterForm() {
  const [query, setQuery] = useState('');
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { field: 'status', operator: 'eq', value: 'Published' },
    { field: 'locale', operator: 'eq', value: 'English' },
  ]);

  const articles = ARTICLES.filter(
    (article) =>
      article.title.toLowerCase().includes(query.toLowerCase()) &&
      conditions.every((condition) => matches(article, condition)),
  );

  return (
    <div style={{ position: 'relative', height: 300 }}>
      <Pane
        ariaLabel="Articles"
        header={
          <>
            <Toolbar>
              <Toolbar.Title>Articles</Toolbar.Title>
            </Toolbar>
            <Toolbar fields={true}>
              <Toolbar.Search>
                <Toolbar.FilterInput
                  value={query}
                  onChange={setQuery}
                  autoFocus={false}
                  debounce={true}
                />
                <Toolbar.Divider />
                <FilterBuilder
                  fields={FIELDS}
                  value={conditions}
                  onChange={setConditions}
                />
                {(query !== '' || conditions.length > 0) && (
                  <>
                    <Toolbar.Divider />
                    <Button
                      tone="soft"
                      label="Save the filter"
                      onClick={() => {}}
                    />
                  </>
                )}
              </Toolbar.Search>
            </Toolbar>
          </>
        }
      >
        <ul style={{ padding: 'var(--spacing-l)', margin: 0 }}>
          {articles.map((article) => (
            <li key={article.title}>{article.title}</li>
          ))}
        </ul>
      </Pane>
    </div>
  );
}
```

## In a form

Out of a toolbar, put the builder in a [`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md). The label of the field
names the group of the conditions. There is no funnel.

Change the operator of the status from "is" to "is any of": the value
becomes a list of one value.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import FilterBuilder, {
  type FilterCondition,
} from 'datocms-react-ui/FilterBuilder';
import React, { useState } from 'react';
import { ARTICLE_FIELDS } from './fields';

export default function InFieldWrapperExample() {
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { field: 'status', operator: 'eq', value: 'published' },
  ]);

  return (
    <FieldWrapper
      label="Articles to show"
      hint={`The value is ${JSON.stringify(conditions)}.`}
    >
      <FilterBuilder
        fields={ARTICLE_FIELDS}
        value={conditions}
        onChange={setConditions}
      />
    </FieldWrapper>
  );
}
```

## Custom editor

A custom editor draws an input of your own: a date, a record, a color.
`render` gets the `value`, `onChange`, `disabled`, `readOnly` and the
`ariaLabel` of the input. Draw a bare input, with no border: the tile draws
the border. Most inputs have a `variant="filter"` for this.

Give the same `kind` to the editors that take the same value, so the value
stays when the user changes the operator. `defaultValue` is the value of a
new condition, and the value after a change of operator that cannot keep the
old value.

Change "is after" to "is before": the date stays.

```tsx
import DateInput from 'datocms-react-ui/DateInput';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import FilterBuilder, {
  type FilterCondition,
  type FilterEditor,
  type FilterField,
} from 'datocms-react-ui/FilterBuilder';
import React, { useState } from 'react';

// The two operators have the same kind, thus the date stays when the user
// changes the operator
const dateEditor: FilterEditor = {
  type: 'custom',
  kind: 'date',
  defaultValue: null,
  render: ({ value, onChange, disabled, readOnly, ariaLabel }) => (
    <DateInput
      variant="filter"
      ariaLabel={ariaLabel}
      value={typeof value === 'string' ? value : null}
      onChange={onChange}
      disabled={disabled}
      readOnly={readOnly}
    />
  ),
};

const FIELDS: FilterField[] = [
  {
    id: 'published_at',
    label: 'Publication date',
    operators: [
      { id: 'gt', label: 'is after', editor: dateEditor },
      { id: 'lt', label: 'is before', editor: dateEditor },
    ],
  },
];

export default function CustomEditorExample() {
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { field: 'published_at', operator: 'gt', value: '2026-01-01' },
  ]);

  return (
    <FieldWrapper
      label="Articles to show"
      hint={`The value is ${JSON.stringify(conditions)}.`}
    >
      <FilterBuilder
        fields={FIELDS}
        value={conditions}
        onChange={setConditions}
      />
    </FieldWrapper>
  );
}
```

An operator with two ends, such as "is between", takes a
[`DateTimeRangeInput`](https://react-ui.datocms.com/Forms/DateInputs.md) with `variant="filter"`. Its value is an object with
the two ends, so `defaultValue` is an empty range, not `null`.

Click the range, then pick two days and click Apply.

```tsx
import DateTimeRangeInput, {
  type DateTimeRangeValue,
} from 'datocms-react-ui/DateTimeRangeInput';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import FilterBuilder, {
  type FilterCondition,
  type FilterField,
} from 'datocms-react-ui/FilterBuilder';
import React, { useState } from 'react';

const EMPTY_RANGE: DateTimeRangeValue = { start: null, end: null };

const FIELDS: FilterField[] = [
  {
    id: 'updated_at',
    label: 'Last update',
    operators: [
      {
        id: 'between',
        label: 'is between',
        editor: {
          type: 'custom',
          kind: 'range',
          defaultValue: EMPTY_RANGE,
          render: ({ value, onChange, disabled, readOnly, ariaLabel }) => (
            <DateTimeRangeInput
              variant="filter"
              ariaLabel={ariaLabel}
              placeholder="Any time"
              value={(value as DateTimeRangeValue | null) ?? EMPTY_RANGE}
              onChange={onChange}
              disabled={disabled}
              readOnly={readOnly}
              selectableDays="past"
            />
          ),
        },
      },
    ],
  },
];

export default function BetweenExample() {
  const [conditions, setConditions] = useState<FilterCondition[]>([
    {
      field: 'updated_at',
      operator: 'between',
      value: {
        start: '2026-10-01T00:00:00+02:00',
        end: '2026-10-31T23:59:00+01:00',
      },
    },
  ]);

  return (
    <FieldWrapper
      label="Records to show"
      hint={`The value is ${JSON.stringify(conditions)}.`}
    >
      <FilterBuilder
        fields={FIELDS}
        value={conditions}
        onChange={setConditions}
      />
    </FieldWrapper>
  );
}
```

## One condition per field

With `oneConditionPerField`, a field has one condition. To compare it in
another way, the user changes the operator of its tile. `emptyLabel` is the
text when there are no conditions.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import FilterBuilder, {
  type FilterCondition,
} from 'datocms-react-ui/FilterBuilder';
import React, { useState } from 'react';
import { ARTICLE_FIELDS } from './fields';

export default function OneConditionPerFieldExample() {
  const [conditions, setConditions] = useState<FilterCondition[]>([]);

  return (
    <FieldWrapper
      label="Articles to show"
      hint="Each field can have one condition."
    >
      <FilterBuilder
        oneConditionPerField
        fields={ARTICLE_FIELDS}
        value={conditions}
        onChange={setConditions}
        emptyLabel="All the articles"
      />
    </FieldWrapper>
  );
}
```

## States

A `readOnly` builder shows its tiles, and the user can read and copy the
values. It has no "+" button, no remove button and no clear button, and the
user cannot change a field, an operator or a value. A `disabled` builder
shows its tiles and its buttons with the disabled look. Give `readOnly` to
the input of a custom editor, so it follows the state of the builder.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import FilterBuilder, {
  type FilterCondition,
} from 'datocms-react-ui/FilterBuilder';
import React from 'react';
import { ARTICLE_FIELDS } from './fields';

const CONDITIONS: FilterCondition[] = [
  { field: 'status', operator: 'eq', value: 'published' },
  { field: 'title', operator: 'matches', value: 'Release notes' },
];

function ignoreChange() {}

export default function StatesExample() {
  return (
    <>
      <FieldWrapper label="Articles of the saved view">
        <FilterBuilder
          fields={ARTICLE_FIELDS}
          value={CONDITIONS}
          onChange={ignoreChange}
          readOnly
        />
      </FieldWrapper>
      <FieldWrapper label="Articles to archive">
        <FilterBuilder
          fields={ARTICLE_FIELDS}
          value={CONDITIONS}
          onChange={ignoreChange}
          disabled
        />
      </FieldWrapper>
    </>
  );
}
```

## Accessibility

- The builder is a group. In a [`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md), the label of the field names
  it.
- Each tile is a group too, named with the field and the operator ("Status
  is"). Thus a screen reader also says the operator of a field with one
  operator, which shows as text.
- Each input of a tile has a name with the field: "Operator of Status",
  "Value of Status". The button of a tile is "Remove the Status filter".
  Give the `ariaLabel` of a custom editor to its input.
- The focus of a tile shows on all the tile. Tab moves through the inputs
  of the tiles, then to the "+" button.
- When the user removes a tile, the focus goes to the "✕" of the next tile,
  or to the "+" button.

## Props

### FilterBuilder

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `fields` | `FilterField[]` | Yes | | The things that the user can filter by |
| `value` | `FilterCondition[]` | Yes | | The conditions, in the order of the tiles |
| `onChange` | `(value: FilterCondition[]) => void` | Yes | | Runs with all the conditions when the user changes one of them |
| `disabled` | `boolean` | No | | The user cannot change the conditions. The tiles have the disabled look. |
| `readOnly` | `boolean` | No | | The user can read and copy the conditions, but cannot change them. The tiles show with no "+" button, no remove button and no clear button. |
| `emptyLabel` | `Message` | No | `"No filters set"` | The text when there are no conditions |
| `oneConditionPerField` | `boolean` | No | `false` | A field can have only one condition. Without it, a field can have one condition for each operator. |

#### Types

`FilterField` — A thing that the user can filter by, for example a field of a model

```ts
export type FilterField = {
  /** The key of the field. It goes in the `field` of a condition. */
  id: string;
  /** The name of the field, in the select of a tile and in the "+" menu */
  label: TextMessage;
  /**
   * A code of the field, for example its API key or its path in your data.
   * The menus show it after the label, in a monospaced font. The tile shows
   * only the label.
   * @example "author.name"
   */
  code?: TextMessage;
  /**
   * The ways to compare the field, in the order of the select of a tile. A
   * new condition takes the first operator that is free and not deprecated.
   */
  operators: FilterOperator[];
};
```

`FilterCondition` — One condition of the filter: a tile with a field, an operator and a value

```ts
export type FilterCondition = {
  /** The `id` of the field of the condition */
  field: string;
  /** The `id` of the operator of the condition, in the `operators` of the field */
  operator: string;
  /**
   * The value of the condition. Its shape comes from the editor of the
   * operator (see `FilterEditor`).
   */
  value: unknown;
};
```

`FilterOperator` — One way to compare a field, for example "is", "contains" or "is after"

```ts
export type FilterOperator = {
  /** The key of the operator. It goes in the `operator` of a condition. */
  id: string;
  /** The text of the operator, in the select of a tile */
  label: TextMessage;
  /** The input of the value of the condition */
  editor: FilterEditor;
  /**
   * An operator that you keep for the filters that use it. A condition that
   * has it still shows it, but the user cannot pick it.
   */
  deprecated?: boolean;
};
```

`FilterEditor` — The input of the value of a condition, for one operator

```ts
export type FilterEditor =
  /** No value */
  | FilterNoneEditor
  /** A text, a number or a list of texts */
  | FilterTextEditor
  /** One or more options */
  | FilterSelectEditor
  /** More than one input */
  | FilterGroupEditor
  /** An input of your own */
  | FilterCustomEditor;
```

`FilterNoneEditor` — The operator has no value, for example "is empty". The value is `null`.

```ts
export type FilterNoneEditor = { type: 'none' };
```

`FilterTextEditor` — A text input. "text" gives a string, "number" gives a number or `null`, and "list" gives a list of strings: the user separates them with commas.

```ts
export type FilterTextEditor = {
  type: 'text' | 'number' | 'list';
  /** The text of the input when it is empty */
  placeholder?: TextMessage;
};
```

`FilterSelectEditor` — A select. The value is a string or `null`, or a list of strings with `multiple`.

```ts
export type FilterSelectEditor = {
  type: 'select';
  /** The options of the select */
  options: FilterSelectOption[];
  /** The user can pick more than one option */
  multiple?: boolean;
  /**
   * The value of a new condition, and the value after a change of operator
   * that cannot keep the old value. Give a list with `multiple`. Use it when
   * a condition with no value means nothing, for example "Featured is" with
   * the options "Yes" and "No".
   * @default null, or an empty list with `multiple`
   */
  defaultValue?: string | string[] | null;
};
```

`FilterGroupEditor` — More than one input, each with a label, for example a distance and a point. The value is an object with one key for each argument.

```ts
export type FilterGroupEditor = {
  type: 'group';
  /** The inputs of the group, in the order of the tile */
  arguments: FilterArgument[];
};
```

`FilterCustomEditor` — An input of your own, for example a date picker or a record picker. Draw a bare input, with no border: the tile draws the border.

```ts
export type FilterCustomEditor = {
  type: 'custom';
  /**
   * The kind of the value. When the user changes the operator, the value
   * stays only when the two custom editors have the same kind.
   * @example "date"
   */
  kind: string;
  /**
   * The value is a list of values of the kind. When the user changes between
   * a single and a multiple editor of the same kind, the value becomes a list
   * of one value, or the first value of the list.
   */
  multiple?: boolean;
  /**
   * The value of a new condition, and the value after a change of operator
   * that cannot keep the old value
   */
  defaultValue: unknown;
  /** Draws the input */
  render: (props: FilterEditorRenderProps) => ReactNode;
};
```

`FilterSelectOption` — One option of a select editor

```ts
export type FilterSelectOption = {
  /** The value that goes in the condition */
  value: string;
  /** The text of the option */
  label: TextMessage;
};
```

`FilterArgument` — One input of a group editor

```ts
export type FilterArgument = {
  /** The key of the value of the argument, in the value of the group */
  id: string;
  /** The text before the input, in the tile */
  label: TextMessage;
  /** The input of the argument. A group cannot contain a group. */
  editor: Exclude<FilterEditor, FilterGroupEditor>;
};
```

`FilterEditorRenderProps` — What the `render` function of a custom editor gets

```ts
export type FilterEditorRenderProps = {
  /** The value of the condition */
  value: unknown;
  /** Call it with the new value when the user changes it */
  onChange: (value: unknown) => void;
  /** The user cannot change the value. The input has the disabled look. */
  disabled: boolean;
  /**
   * The user can read and copy the value, but cannot change it. Give it to
   * the `readOnly` of your input. It is `false` when `disabled` is `true`.
   */
  readOnly: boolean;
  /**
   * The name of the input for a screen reader, for example "Value of
   * Author". Give it to your input as its `aria-label`.
   */
  ariaLabel: string;
};
```
