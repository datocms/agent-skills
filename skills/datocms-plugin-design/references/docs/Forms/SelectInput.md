# SelectInput

Use `SelectInput` to pick one option, or many options, from a list that has
more than four or five options. The select has a menu and a search box.

| Use | For |
| - | - |
| `SelectInput` | A list of options that is long, or that the user must search. |
| [`RadioGroupInput`](https://react-ui.datocms.com/Forms/ChoiceInputs.md) | Two to five options that the user must compare. All options show at once. |
| [`SegmentedControl`](https://react-ui.datocms.com/Navigation/SegmentedControl.md) | A few short options that change how a view looks. It is not a form input. |

Give `options`: a list of `{ value, label }`. The examples put the select in a
[`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md). It draws the label, the hint and the error, and the label
points to the text input of the select.

## One value

The value is the `value` of the chosen option, or `null` when
there is none. Give `placeholder` to say what to pick. The value is always
the string, never the option object. `onChange` also gets the chosen option
as its second argument, for code that needs its label at the moment of the
choice.

```tsx
import Button from 'datocms-react-ui/Button';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import SelectInput from 'datocms-react-ui/SelectInput';
import React, { useState } from 'react';

const reasons = [
  {
    value: 'too_expensive',
    label: 'The product is too expensive for my budget',
  },
  {
    value: 'alternative_solution',
    label: 'I am moving to an alternative solution',
  },
  {
    value: 'technical_issues',
    label: "I'm facing technical issues with the product",
  },
  { value: 'other', label: 'Other' },
];

export default function SingleSelect() {
  const [reason, setReason] = useState<string | null>(null);

  return (
    <>
      <FieldWrapper label="Why are you cancelling?">
        <SelectInput
          value={reason}
          onChange={setReason}
          placeholder="Pick a reason"
          options={reasons}
        />
      </FieldWrapper>
      <Button label="Save" tone="primary" expand={false} />
    </>
  );
}
```

## Many values

Give `multiple`. The value is a list of the `value`s. The chosen options
show as pills in the control, and the user can drag the pills to sort them.
The second argument of `onChange` is the list of the chosen options, in the order
of the value.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import SelectInput from 'datocms-react-ui/SelectInput';
import React, { useState } from 'react';

const eventTypes = [
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'publish', label: 'Publish' },
  { value: 'unpublish', label: 'Unpublish' },
];

export default function MultipleSelect() {
  const [eventTypeValues, setEventTypeValues] = useState<string[] | null>([
    'create',
    'update',
  ]);

  return (
    <FieldWrapper label="Events">
      <SelectInput
        multiple
        value={eventTypeValues}
        onChange={setEventTypeValues}
        options={eventTypes}
      />
    </FieldWrapper>
  );
}
```

## Clearable, hint and disabled

A single select shows a button that clears the value when `clearable` is on.
Give `clearable={false}` when the field must always have a value. A disabled
select shows the value, and the user cannot open the menu.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import SelectInput from 'datocms-react-ui/SelectInput';
import React, { useState } from 'react';

const stages = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In review' },
  { value: 'approved', label: 'Approved' },
];

export default function ClearableAndStates() {
  const [initialStage, setInitialStage] = useState<string | null>('draft');
  const [clearable, setClearable] = useState<string | null>('in_review');

  return (
    <>
      <FieldWrapper
        label="Initial stage"
        hint="Every new record starts in this stage."
      >
        <SelectInput
          value={initialStage}
          onChange={setInitialStage}
          clearable={false}
          options={stages}
        />
      </FieldWrapper>
      <FieldWrapper label="Clearable">
        <SelectInput
          value={clearable}
          onChange={setClearable}
          clearable
          options={stages}
        />
      </FieldWrapper>
      <FieldWrapper label="Disabled">
        <SelectInput value="approved" disabled options={stages} />
      </FieldWrapper>
    </>
  );
}
```

**Do:** Use a select for a long list of options.

```tsx
<SelectDemo
  label="Language"
  initial="en"
  options={[
    { value: 'en', label: 'English' },
    { value: 'it', label: 'Italian' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'es', label: 'Spanish' },
    { value: 'pt', label: 'Portuguese' },
  ]}
/>
```

**Don’t:** Do not use a select for two options: the user must open the menu to see them. Use radios.

```tsx
<SelectDemo
  label="Billing cycle"
  initial="monthly"
  clearable={false}
  options={[
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ]}
/>
```

## Groups and custom values

`options` can be a list of groups: `{ label, options }`.

When the value is one that no option has (for example an old value that the
server kept), give `acceptValueNotIncludedInOptions`. It makes an option for
this value. Without it, the select shows no text for it.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import SelectInput from 'datocms-react-ui/SelectInput';
import React, { useState } from 'react';

const groups = [
  {
    label: 'Common',
    options: [
      { value: 'en', label: 'English' },
      { value: 'it', label: 'Italian' },
    ],
  },
  {
    label: 'Other',
    options: [
      { value: 'fr', label: 'French' },
      { value: 'de', label: 'German' },
    ],
  },
];

export default function GroupsAndCustomValues() {
  const [locale, setLocale] = useState<string | null>('en');
  const [legacy, setLegacy] = useState<string | null>('pt');

  return (
    <>
      <FieldWrapper label="Language">
        <SelectInput value={locale} onChange={setLocale} options={groups} />
      </FieldWrapper>
      <FieldWrapper
        label="Saved language"
        hint="The value is not in the options, but the select still shows it."
      >
        <SelectInput
          value={legacy}
          onChange={setLegacy}
          options={groups}
          acceptValueNotIncludedInOptions={(value: string) => ({
            value,
            label: value,
          })}
        />
      </FieldWrapper>
    </>
  );
}
```

## New values

With `creatable`, the user can type a value that is not an option: the menu
shows 'Create "…"', and `creatable.onCreate` gets the text. Your code adds
the value (and the option).

```tsx
import SelectInput from 'datocms-react-ui/SelectInput';
import React, { useState } from 'react';

const INITIAL_TAGS = [
  { value: 'news', label: 'news' },
  { value: 'sport', label: 'sport' },
];

export default function Creatable() {
  const [tags, setTags] = useState(INITIAL_TAGS);
  const [value, setValue] = useState<string[] | null>(['news']);

  return (
    <SelectInput
      name="tags"
      aria-label="Tags"
      multiple
      options={tags}
      value={value}
      onChange={setValue}
      onBlur={() => {}}
      creatable={{
        onCreate: (tag) => {
          setTags([...tags, { value: tag, label: tag }]);
          setValue([...(value ?? []), tag]);
        },
      }}
    />
  );
}
```

## Remote search

When the options come from a server (the records of a model, the users of
an API), the server filters them. Give `search`. The select then shows the
options that it gets as they are, and calls `search.onQueryChange` with the
text that the user types. Your code loads the options for the query, gives
them in `options`, and sets `loading` while the request runs. When the user
picks an option, leaves the select or closes the menu, the query goes back
to an empty string, so the next open starts from the full list.

`useAsyncSelectOptions` does all of it. Give it a `load` that returns the
options of a query, and spread its result on the select. It waits 200 ms of
quiet typing, ignores the response of an older query, and keeps every option
that it got, so a pill keeps its label when the options of the query do not
have it. Give `resolve` for the saved values that the first search can miss.
The hook does not throw the error of a request: show its `error` in the
[`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md).

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import { useAsyncSelectOptions } from 'datocms-react-ui/hooks/useAsyncSelectOptions';
import SelectInput from 'datocms-react-ui/SelectInput';
import React, { useState } from 'react';

type Author = { value: string; label: string };

const AUTHORS: Author[] = [
  { value: '1', label: 'Ada Lovelace' },
  { value: '2', label: 'Alan Turing' },
  { value: '3', label: 'Barbara Liskov' },
  { value: '4', label: 'Donald Knuth' },
  { value: '5', label: 'Edsger Dijkstra' },
  { value: '6', label: 'Grace Hopper' },
  { value: '7', label: 'Margaret Hamilton' },
  { value: '8', label: 'Tim Berners-Lee' },
];

// A fake server: it filters the authors after 400 ms. A plugin calls its
// own API here, and gives the signal to `fetch`.
function searchAuthors(query: string, signal: AbortSignal) {
  return new Promise<Author[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      const text = query.trim().toLowerCase();
      resolve(AUTHORS.filter((a) => a.label.toLowerCase().includes(text)));
    }, 400);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

// The options of the saved values, which the first search can miss
async function findAuthors(ids: string[]) {
  return AUTHORS.filter((a) => ids.includes(a.value));
}

export default function RemoteSearch() {
  const [value, setValue] = useState<string[] | null>(['8']);
  const [lastChoice, setLastChoice] = useState<string | null>(null);
  const { error, ...asyncOptions } = useAsyncSelectOptions({
    load: searchAuthors,
    resolve: findAuthors,
    value,
  });

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-m)', maxWidth: 400 }}>
      <FieldWrapper
        label="Authors"
        error={error ? 'The search of the authors failed.' : undefined}
      >
        <SelectInput
          multiple
          value={value}
          onChange={(newValue, options) => {
            setValue(newValue);
            setLastChoice(options.map((o) => o.label).join(', ') || null);
          }}
          {...asyncOptions}
        />
      </FieldWrapper>
      <p>
        The authors: <strong>{lastChoice ?? 'no change yet'}</strong>
      </p>
    </div>
  );
}
```

A creatable select with a remote search needs nothing more: in
`creatable.onCreate`, wait for the request that creates the value, then call
`onChange` with its id. `resolve` gives the label of the new value.

## Actions in the menu

The secondary actions of a select (“Create new…”, “From library”) go in the
footer of its menu, not in a row of buttons below the select. Give
`menuFooter` with `SelectMenuAction`s: an action looks like an option, with
an `icon`, a `label` and `onPick`. An action that opens a modal calls
`closeSelectMenu()` first, so the menu is not open below the modal. The
menu stays open after a pick: close it when the action is done.

An action can open a second list instead of the options, for example
the list of the models when the user can create records of more than one
model. Give it `list` instead of `onPick`, with the `SelectMenuAction`s of the
list. The select does this:

- It shows a chevron on the action.
- It hides the options while the list is open.
- It uses the label of the action as the title of the list.
- It goes back to the options on the title, on Escape and when the menu
  closes.

Open the menu. The footer adds an author, or opens the list of the teams.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import SelectInput, {
  closeSelectMenu,
  SelectMenuAction,
} from 'datocms-react-ui/SelectInput';
import React, { useState } from 'react';
import { AddIcon, GroupIcon } from '@/icons';

type Author = { value: string; label: string };

const TEAMS: Record<string, Author[]> = {
  Research: [
    { value: 'liskov', label: 'Barbara Liskov' },
    { value: 'knuth', label: 'Donald Knuth' },
  ],
  Platform: [
    { value: 'hopper', label: 'Grace Hopper' },
    { value: 'hamilton', label: 'Margaret Hamilton' },
  ],
};

export default function MenuFooter() {
  const [options, setOptions] = useState<Author[]>([
    { value: 'lovelace', label: 'Ada Lovelace' },
    { value: 'turing', label: 'Alan Turing' },
  ]);
  const [value, setValue] = useState<string | null>(null);

  // The menu closes before the options change, as it does before a modal
  // that an action opens
  function add(authors: Author[]) {
    closeSelectMenu();
    setOptions((prev) => [
      ...prev,
      ...authors.filter((a) => !prev.some((o) => o.value === a.value)),
    ]);
    setValue(authors[0].value);
  }

  function createAuthor() {
    const n = options.length + 1;
    add([{ value: `author-${n}`, label: `Author ${n}` }]);
  }

  return (
    <FieldWrapper label="Author">
      <SelectInput
        value={value}
        onChange={setValue}
        options={options}
        clearable
        menuFooter={
          <>
            <SelectMenuAction
              icon={<AddIcon />}
              label="Add an author"
              onPick={createAuthor}
            />
            <SelectMenuAction
              icon={<GroupIcon />}
              label="Add a team"
              list={Object.entries(TEAMS).map(([team, members]) => (
                <SelectMenuAction
                  key={team}
                  icon={<GroupIcon />}
                  label={team}
                  onPick={() => add(members)}
                />
              ))}
            />
          </>
        }
      />
    </FieldWrapper>
  );
}
```

## Variants and width

`variant` sets the look of the control. `default` is a field with a border.
`embedded` has no border: use it inside another box, for example a cell of
a table. `filter` is embedded and small, for the operator and the value in
a tile of a filter bar. `filter-field` adds the soft primary color, for
the field of the tile.

`autosize` makes the control as wide as its value, not as wide as the field.
The control grows and shrinks when the value changes. Use it for a select
that sits next to other controls on one line, as in the tile of a filter bar.

```tsx
import SelectInput from 'datocms-react-ui/SelectInput';
import React, { useState } from 'react';

const locales = [
  { value: 'en', label: 'English' },
  { value: 'it', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
];

const fields = [
  { value: 'status', label: 'Status' },
  { value: 'updated_at', label: 'Last update' },
];

const operators = [
  { value: 'eq', label: 'is' },
  { value: 'not_eq', label: 'is not' },
];

const statuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'updated', label: 'Published with changes' },
];

// Each control is as wide as its value. Pick a longer option to see the
// control grow.
export default function Autosize() {
  const [locale, setLocale] = useState<string | null>('en');
  const [field, setField] = useState<string | null>('status');
  const [operator, setOperator] = useState<string | null>('eq');
  const [status, setStatus] = useState<string | null>('draft');

  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--spacing-l)',
        justifyItems: 'start',
      }}
    >
      <SelectInput
        name="locale"
        aria-label="Locale"
        autosize
        clearable={false}
        options={locales}
        value={locale}
        onChange={setLocale}
        onBlur={() => {}}
      />
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'var(--spacing-xs)',
        }}
      >
        <SelectInput
          name="field"
          aria-label="Field"
          autosize
          variant="filter-field"
          clearable={false}
          options={fields}
          value={field}
          onChange={setField}
          onBlur={() => {}}
        />
        <SelectInput
          name="operator"
          aria-label="Operator"
          autosize
          variant="filter"
          clearable={false}
          options={operators}
          value={operator}
          onChange={setOperator}
          onBlur={() => {}}
        />
        <SelectInput
          name="status"
          aria-label="Status"
          autosize
          variant="filter"
          clearable={false}
          options={statuses}
          value={status}
          onChange={setStatus}
          onBlur={() => {}}
        />
      </div>
    </div>
  );
}
```

