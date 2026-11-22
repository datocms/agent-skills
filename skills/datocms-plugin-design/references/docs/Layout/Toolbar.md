# Toolbar

The bar at the top of a page, of a pane or of a dialog: the title, the
actions on the thing that the bar shows, and the buttons. `Toolbar` is the
bar, and its parts (`Toolbar.Title`, `Toolbar.Space`, …) are its children.
Do not write the `Toolbar__*` classes by hand: use the parts.

The toolbar has no line of its own. In the `header` slot of a [`Pane`](https://react-ui.datocms.com/Layout/Pane.md) (as in
the examples below), the pane draws a line under each toolbar. Outside a
pane (a dialog), give `borderBottom`.

Other components for other cases:

- The title bar of a view pane (a list, a sidebar, a page to read) is
  [`Pane.Header`](https://react-ui.datocms.com/Layout/Pane.md) (see [`Pane`](https://react-ui.datocms.com/Layout/Pane.md)).
- The title bar of a form page is [`Pane.FormHeader`](https://react-ui.datocms.com/Layout/Pane.md) (see [`Pane`](https://react-ui.datocms.com/Layout/Pane.md)).

## Parts from left to right

| Part | What it is |
| - | - |
| `Toolbar.GoBack` | The chevron that goes back. With `action`, its tooltip shows the keys of the action that goes back. |
| `Toolbar.Title` | The title, with the “?” of `Toolbar.Help` in its `help` prop. |
| `Toolbar.PresetsTitle` | A title that is the menu of the presets of the list. |
| `Toolbar.HelpBody` | The text of a `Toolbar.Help` without the “?”, for the bottom of a menu. |
| `Toolbar.Subtitle` | The count of a list (“12 tokens”) or a short state, immediately after the title. |
| `Toolbar.TextualDropdown` | A subtitle that opens a menu to change its value. |
| `Toolbar.DotsDropdown` | The “⋮” menu of the actions on the thing that the bar shows. |
| [`Toolbar.Spinner`](https://react-ui.datocms.com/Feedback/Progress.md) | Shows while the content loads or saves. |
| `Toolbar.Space` | The free width: the parts after it go to the right end. |
| `Toolbar.Group` | Controls that act as one unit (the controls of the filter). |
| `Toolbar.Note` | A short quiet text before a button on the right end. |
| [`Toolbar.Button`](https://react-ui.datocms.com/Actions/Button.md) | A button of the bar: ghost by default. |
| `Toolbar.PrimaryButton`, `Toolbar.AddNewButton` | The main action, on the right end. |

The bar of a list: the count, the “⋮” and the filter keep the same places
in every list.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import Pane from 'datocms-react-ui/Pane';
import Toolbar from 'datocms-react-ui/Toolbar';
import React from 'react';
import { AddIcon, ExportIcon } from '@/icons';

const noop = () => {};

export default function ListToolbar() {
  return (
    <div style={{ position: 'relative', height: 180 }}>
      <Pane
        ariaLabel="API tokens"
        header={
          <Toolbar>
            <Toolbar.Title
              level={1}
              help={
                <Toolbar.Help docsUrl="https://www.datocms.com/docs">
                  The tokens that read or change the content of the project with
                  the APIs.
                </Toolbar.Help>
              }
            >
              API tokens
            </Toolbar.Title>
            <Toolbar.Subtitle>12 tokens</Toolbar.Subtitle>
            <Toolbar.DotsDropdown>
              <Dropdown.Option icon={<ExportIcon />} onPick={noop}>
                Export as CSV
              </Dropdown.Option>
            </Toolbar.DotsDropdown>
            <Toolbar.Space />
            <Toolbar.Group>
              <Toolbar.FilterToggle pressed={false} onClick={noop} />
            </Toolbar.Group>
            <Toolbar.PrimaryButton
              actions={[{ label: 'New token', icon: AddIcon, onPick: noop }]}
            />
          </Toolbar>
        }
      >
        <div style={{ padding: 'var(--spacing-l)' }}>
          The list of the tokens
        </div>
      </Pane>
    </div>
  );
}
```

The bar of one thing: the “⋮” holds every action on it.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import Pane from 'datocms-react-ui/Pane';
import Toolbar from 'datocms-react-ui/Toolbar';
import React from 'react';
import { DeleteIcon, DuplicateIcon } from '@/icons';

const noop = () => {};

export default function RecordToolbar() {
  return (
    <div style={{ position: 'relative', height: 180 }}>
      <Pane
        header={
          <Toolbar>
            <Toolbar.GoBack onClick={noop} ariaLabel="Back to the blog posts" />
            <Toolbar.Title level={1}>
              How we ship features every week
            </Toolbar.Title>
            <Toolbar.Subtitle>Edited 2 minutes ago</Toolbar.Subtitle>
            <Toolbar.DotsDropdown>
              <Dropdown.Option icon={<DuplicateIcon />} onPick={noop}>
                Duplicate
              </Dropdown.Option>
              <Dropdown.Separator />
              <Dropdown.Option icon={<DeleteIcon />} alert={true} onPick={noop}>
                Delete
              </Dropdown.Option>
            </Toolbar.DotsDropdown>
            <Toolbar.Spinner show={true} />
          </Toolbar>
        }
      >
        <div style={{ padding: 'var(--spacing-l)' }}>
          The form of the record
        </div>
      </Pane>
    </div>
  );
}
```

**Do:** Put the “⋮” right after the title and the count.

```tsx
<Toolbar>
  <Toolbar.Title>API tokens</Toolbar.Title>
  <Toolbar.Subtitle>12 tokens</Toolbar.Subtitle>
  <Toolbar.DotsDropdown>
    <Dropdown.Option onPick={() => {}}>Export as CSV</Dropdown.Option>
  </Toolbar.DotsDropdown>
  <Toolbar.Space />
</Toolbar>
```

**Don’t:** Do not put the “⋮” or the count on the right end: the right end holds the buttons.

```tsx
<Toolbar>
  <Toolbar.Title>API tokens</Toolbar.Title>
  <Toolbar.Space />
  <Toolbar.Subtitle>12 tokens</Toolbar.Subtitle>
  <Toolbar.DotsDropdown>
    <Dropdown.Option onPick={() => {}}>Export as CSV</Dropdown.Option>
  </Toolbar.DotsDropdown>
</Toolbar>
```

## Title and help

`Toolbar.Title` gets a `level` only inside `<main>` or a dialog: the title
of the content is level 1. Without it, the title is not a heading (the
title of a sidebar). In the header of a dialog, give the title an `id` and
set the `aria-labelledby` of the dialog to that `id`.

The text that explains what the page is for (usually with a docs link) goes in
a `Toolbar.Help`, given to the `help` prop of the title. The “?” then stays
in one group with the title, and a click opens the text in a popover (a
toggletip). [`Pane.Header.Title`](https://react-ui.datocms.com/Layout/Pane.md), [`Pane.Header.Tabs`](https://react-ui.datocms.com/Navigation/Tabs.md) and
[`Pane.FormHeader.Title`](https://react-ui.datocms.com/Layout/Pane.md) take the same `help`.

Do not put `Toolbar.Help` next to the title as a sibling, because it then
gets the toolbar gap. Do not put page help in a [`Callout`](https://react-ui.datocms.com/Feedback/Callout.md): a callout is for a
message about the current data.

The count of a list (“7,206 assets”) is a `Toolbar.Subtitle` immediately
after the title. In its translation, write the number as `#` in the plural
(`other {# records}`), not as `{count}`, so the number has the separators
of the language of the user.

## Presets

The presets of a list are views of the list: fixed filters with a name,
written in the code of the list. `Toolbar.PresetsTitle` is a title that is
their menu: “All”, then each preset with the count of its items, and the
`shortLabel` of the active preset after the title. The help shows at the
bottom of the menu, instead of the “?”.

`Toolbar.PresetsTitle` only draws the title and the menu. You give
the options (`Toolbar.PresetsTitle.Option`, “All” first), the `qualifier` of
the active preset, and the help as a `Toolbar.HelpBody` with `secondary` in
the `footer`. In a [`Pane`](https://react-ui.datocms.com/Layout/Pane.md), do not write this by hand: give the presets to
`useFilteredList` (`datocms-react-ui/Pane`) and `presets` to [`Pane.Header.Title`](https://react-ui.datocms.com/Layout/Pane.md). The pane
counts the items, hides the presets that keep none, combines them with the
text filter, and moves the help into the menu.

Open the title and pick “Never used”: the title shows “API tokens · Never
used”.

```tsx
import Pane from 'datocms-react-ui/Pane';
import Toolbar from 'datocms-react-ui/Toolbar';
import React, { useState } from 'react';

const TOKENS = [
  { name: 'Read-only API token', unused: false, neverUsed: false },
  { name: 'Full-access API token', unused: true, neverUsed: false },
  { name: 'Preview token', unused: true, neverUsed: true },
  { name: 'Build token', unused: false, neverUsed: false },
];

const PRESETS = [
  {
    id: 'unused',
    label: 'Not used in the last 2 months',
    shortLabel: 'Unused',
    count: 2,
  },
  { id: 'never', label: 'Never used', shortLabel: 'Never used', count: 1 },
];

export default function Presets() {
  const [preset, setPreset] = useState<string | null>(null);
  const active = PRESETS.find((option) => option.id === preset);
  const tokens = TOKENS.filter((token) =>
    preset === 'unused'
      ? token.unused
      : preset === 'never'
        ? token.neverUsed
        : true,
  );

  return (
    <div style={{ position: 'relative', height: 240 }}>
      <Pane
        header={
          <Toolbar>
            <Toolbar.PresetsTitle
              label="API tokens"
              qualifier={active?.shortLabel}
              footer={
                <Toolbar.HelpBody
                  docsUrl="https://www.datocms.com/docs"
                  secondary
                >
                  The tokens that read or change the content of the project with
                  the APIs.
                </Toolbar.HelpBody>
              }
            >
              <Toolbar.PresetsTitle.Option
                active={preset === null}
                onPick={() => setPreset(null)}
              >
                All
              </Toolbar.PresetsTitle.Option>
              {PRESETS.map((option) => (
                <Toolbar.PresetsTitle.Option
                  key={option.id}
                  count={option.count}
                  active={preset === option.id}
                  onPick={() => setPreset(option.id)}
                >
                  {option.label}
                </Toolbar.PresetsTitle.Option>
              ))}
            </Toolbar.PresetsTitle>
            <Toolbar.Space />
          </Toolbar>
        }
      >
        <ul style={{ padding: 'var(--spacing-l)', margin: 0 }}>
          {tokens.map((token) => (
            <li key={token.name}>{token.name}</li>
          ))}
        </ul>
      </Pane>
    </div>
  );
}
```

The menu of a title only switches the view of the same list. It never
opens the actions on the thing that the title names: they go in the “⋮”.

## Buttons

[`Toolbar.Button`](https://react-ui.datocms.com/Actions/Button.md) is a [`Button`](https://react-ui.datocms.com/Actions/Button.md) that is ghost by default. Do not give it a
size. The toolbar is short (two insets plus one line of the title), so it
gives `milli` to all its buttons with `ButtonSizeContext`, and a small
button almost touches its edges. The shared triggers ([`ButtonTrigger`](https://react-ui.datocms.com/Actions/DropdownTriggers.md),
[`SplitButton`](https://react-ui.datocms.com/Actions/SplitButton.md), `Toolbar.PrimaryButton`) take the same size. A trigger
that you build reads it with `useButtonSize()`
(`datocms-react-ui/Button`): call it in a component that renders in the toolbar, not in
the component that renders the toolbar. The content of a [`Portal`](https://react-ui.datocms.com/Overlays/Overlay.md) (a menu, a
dialog, a tooltip) is outside the toolbar, even when a toolbar renders it.

Ghost icon buttons in a `Toolbar.Group` show as one strip: the toolbar gap
(`--spacing-m`) is between the parts of the bar, and the group gap
(`--Toolbar-group-gap`) is between the controls of one part. Do not add
negative margins to bring a control near its neighbour. `Toolbar.Note` says
why the button after it is there.

```tsx
import Pane from 'datocms-react-ui/Pane';
import Toolbar from 'datocms-react-ui/Toolbar';
import React from 'react';
import { OpenInNewTabIcon, SyncIcon } from '@/icons';

const noop = () => {};

export default function Buttons() {
  return (
    <div style={{ position: 'relative', height: 180 }}>
      <Pane
        header={
          <Toolbar>
            <Toolbar.Title>SEO plugin</Toolbar.Title>
            <Toolbar.Group>
              <Toolbar.Button
                iconOnly={true}
                icon={SyncIcon}
                label="Reload"
                onClick={noop}
              />
              <Toolbar.Button
                iconOnly={true}
                icon={OpenInNewTabIcon}
                label="Open the docs"
                href="https://www.datocms.com/docs"
                newTab={true}
              />
            </Toolbar.Group>
            <Toolbar.Space />
            <Toolbar.Note>New version available!</Toolbar.Note>
            <Toolbar.Button tone="soft" label="Update" onClick={noop} />
          </Toolbar>
        }
      >
        <div style={{ padding: 'var(--spacing-l)' }}>
          The settings of the plugin
        </div>
      </Pane>
    </div>
  );
}
```

`Toolbar.PrimaryButton` is the main action. Its first action is the button,
and the other actions go in the menu of a caret (a [`SplitButton`](https://react-ui.datocms.com/Actions/SplitButton.md)). With
`action`, the tooltip of the button shows the name and the keys of that
action (see the Actions page). `Toolbar.AddNewButton` is the `PrimaryButton`
that opens the page of a new item. Keep a solid button out of the group of
the ghost icons, or give the group `gap="s"`.

Give a menu of other actions only to a button with a label. A button that
shows only its icon (`iconOnly`, or `AddNewButton` in a secondary pane) is
as wide as its caret, so the two look like two buttons. There, put the other
actions in the ⋮ menu of the pane ([`Pane.Header.Menu`](https://react-ui.datocms.com/Layout/Pane.md)).

```tsx
import Pane from 'datocms-react-ui/Pane';
import Toolbar from 'datocms-react-ui/Toolbar';
import React from 'react';
import { AddIcon } from '@/icons';

const noop = () => {};

export default function PrimaryButton() {
  return (
    <div style={{ position: 'relative', height: 180 }}>
      <Pane
        ariaLabel="Blog posts"
        header={
          <Toolbar>
            <Toolbar.Title>Blog posts</Toolbar.Title>
            <Toolbar.Space />
            <Toolbar.PrimaryButton
              actions={[
                { label: 'New record', icon: AddIcon, onPick: noop },
                { label: 'Import from CSV', onPick: noop },
                { label: 'Duplicate the last record', onPick: noop },
              ]}
            />
          </Toolbar>
        }
      >
        <div style={{ padding: 'var(--spacing-l)' }}>
          The list of the records
        </div>
      </Pane>
    </div>
  );
}
```

The submit button of a form in the bar is a [`Toolbar.Button`](https://react-ui.datocms.com/Actions/Button.md) with
`tone="primary"` and `submit`, on the right end. Give it `busy` while the
form submits, and `disabled` while the form has no change. The bar of a form
page is [`Pane.FormHeader`](https://react-ui.datocms.com/Layout/Pane.md).

## Filter

The filter of a list hides behind the magnifier: `Toolbar.FilterToggle`, on
the right end, before the button. `useFilterToolbar` keeps the state: the
filter shows when the user opens it or when it has a value.

The close of a filtered list clears the filter, and the next open puts it
back. Return a function from `onClear` that restores the filter. The hook
keeps it only while the list is mounted.

Give `onOpen` of `useFilterToolbar` to the toggle. Then `F` and `/` open the
filter while the pointer or the focus is in the [`Pane`](https://react-ui.datocms.com/Layout/Pane.md) (in all the split, for
the side list of a split), and the tooltip shows the keys.

A search or a filter form in a toolbar is a [`Toolbar.Search`](https://react-ui.datocms.com/Layout/Landmarks.md), or a
`Toolbar.FilterInput` for the text filter of a list. The filter takes its
label from the `ariaLabel` of the [`Pane`](https://react-ui.datocms.com/Layout/Pane.md). Write the name of the list once, and
give `ariaLabel` to the part only outside a pane.

A toolbar that holds fields (a filter form) is `<Toolbar fields>`: its
buttons get the `field` size, with the height of a field of one line
(`--control-height`), so their edges align with the fields. A control that
looks like a field (the trigger of a time range) has
`min-height: var(--control-height)`. Do not pin the height of the controls
of a toolbar with a local variable or with overrides of the button classes.

The filter row has one container: the toolbar. Its parts are bare: no part
draws a box around itself, and the toolbar gives the gaps. So the text
filter of a list and the text cell of a filter form look the same.

- **Two cells get a divider, not a border.** When two parts of the row
  must read as separate cells (the text filter and the filters of the
  fields), put a `Toolbar.Divider` between them: a hairline with the full
  height of the cells. When the filters of the fields wrap, the hairline
  grows with them, so everything after it (the “✕” that clears the
  filters too) reads as one cell. No cell has a border of its own.
- **Only the parts that are fields have a border:** a tile of a
  [`FilterBuilder`](https://react-ui.datocms.com/Forms/FilterBuilder.md) (one condition of the form), a trigger that is a field (a
  time range) and a field of more than one line (a query). They look like a
  field, never like a container.
- **A row that grows keeps its parts on its first line.** When the filters
  of the fields wrap, the text filter, the icons and the buttons stay at
  the top, at the height of a field, next to the first line of filters.
- **The text cell of a filter form is a `Toolbar.FilterInput`** in the
  [`Toolbar.Search`](https://react-ui.datocms.com/Layout/Landmarks.md) of the form, with `debounce` when each change loads the
  list. Do not build a second text filter.
- **The filters of the fields are a [`FilterBuilder`](https://react-ui.datocms.com/Forms/FilterBuilder.md)** in the same
  [`Toolbar.Search`](https://react-ui.datocms.com/Layout/Landmarks.md). In a search, it shows a funnel before its tiles: see
  the FilterBuilder page.
- **The row has one search landmark.** In a [`Toolbar.Search`](https://react-ui.datocms.com/Layout/Landmarks.md), a
  `Toolbar.FilterInput` renders no landmark of its own and does not use its
  `ariaLabel`: the name of the [`Toolbar.Search`](https://react-ui.datocms.com/Layout/Landmarks.md) names the row.

Click the magnifier, type, then close the filter: the text clears. Open
the filter again: the text comes back.

```tsx
import Pane from 'datocms-react-ui/Pane';
import Toolbar, { useFilterToolbar } from 'datocms-react-ui/Toolbar';
import React, { useState } from 'react';

const ROLES = ['Admin', 'Editor', 'Translator', 'Viewer'];

export default function Filter() {
  const [query, setQuery] = useState('');
  const filter = useFilterToolbar({
    isFiltering: query !== '',
    onClear: () => {
      const previous = query;
      setQuery('');
      return () => setQuery(previous);
    },
  });
  const roles = ROLES.filter((role) =>
    role.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div style={{ position: 'relative', height: 260 }}>
      <Pane
        ariaLabel="Roles"
        header={
          <>
            <Toolbar>
              <Toolbar.Title>Roles</Toolbar.Title>
              <Toolbar.Space />
              <Toolbar.Group>
                <Toolbar.FilterToggle
                  pressed={filter.open}
                  onClick={filter.onToggle}
                  onOpen={filter.onOpen}
                />
              </Toolbar.Group>
            </Toolbar>
            {filter.open && (
              <Toolbar fields={true}>
                <Toolbar.FilterInput
                  value={query}
                  onChange={setQuery}
                  autoFocus={filter.autoFocus}
                  onClose={filter.onClose}
                />
              </Toolbar>
            )}
          </>
        }
      >
        <ul style={{ padding: 'var(--spacing-l)', margin: 0 }}>
          {roles.map((role) => (
            <li key={role}>{role}</li>
          ))}
        </ul>
      </Pane>
    </div>
  );
}
```

A filter form: the text filter, a divider, a [`FilterBuilder`](https://react-ui.datocms.com/Forms/FilterBuilder.md), then a
divider and the button that saves the filter. Add conditions until they
wrap: the divider grows with them, and the other parts stay on the first
line.

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

## Tabs

Use [`Toolbar.Tabs`](https://react-ui.datocms.com/Navigation/Tabs.md) with a `Toolbar.Tab` for each tab, and `useTabIds` for the
IDs (`datocms-react-ui/Tabs`). A tab that links to a page (a URL tab) is a
`Toolbar.TabLink`. Do not put the tabs in a `Toolbar.Group`, because they fill
the height of the bar. The header of a dialog or of tabs is a
`<Toolbar borderBottom>`, not a `div` with the class of the toolbar.

The arrow keys move between the tabs.

```tsx
import Pane from 'datocms-react-ui/Pane';
import { useTabIds } from 'datocms-react-ui/Tabs';
import Toolbar from 'datocms-react-ui/Toolbar';
import React, { useState } from 'react';

const TABS = [
  { key: 'info', label: 'Info' },
  { key: 'seo', label: 'SEO preview' },
  { key: 'translations', label: 'Translations' },
];

export default function Tabs() {
  const [tab, setTab] = useState('info');
  const { tabId, panelId } = useTabIds();
  const active = TABS.find(({ key }) => key === tab);

  return (
    <div style={{ position: 'relative', height: 180 }}>
      <Pane
        tabPanel={{ id: panelId, labelledBy: tabId(tab) }}
        header={
          <Toolbar>
            <Toolbar.Tabs ariaLabel="Sidebar">
              {TABS.map(({ key, label }) => (
                <Toolbar.Tab
                  key={key}
                  id={tabId(key)}
                  panelId={panelId}
                  label={label}
                  active={tab === key}
                  onPick={() => setTab(key)}
                />
              ))}
            </Toolbar.Tabs>
            <Toolbar.Space />
          </Toolbar>
        }
      >
        <div style={{ padding: 'var(--spacing-l)' }}>
          The content of “{active?.label}”
        </div>
      </Pane>
    </div>
  );
}
```

## Pagination

`Toolbar.Pagination` shows the buttons of the pages of a list: “Previous”,
the page numbers and “Next”. It does not load the data: your code keeps the
page and loads the items. `currentPage` starts at 0: the first page is 0.

The pages show only when the list has more than one page. `perPageSelect`
adds a “Show” select to change the number of items of a page. The label
comes from the `ariaLabel` of the [`Pane`](https://react-ui.datocms.com/Layout/Pane.md): give `ariaLabel` only outside a pane.
In a narrow toolbar, the pagination shows fewer page numbers and no select,
so it fits a narrow pane or a phone. `compact` gives it this layout at
every width. The page buttons are ghost `milli` buttons, and the current
page has a fill.

```tsx
import Toolbar from 'datocms-react-ui/Toolbar';
import React, { useState } from 'react';

export default function Pagination() {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);

  return (
    <Toolbar>
      <Toolbar.Pagination
        ariaLabel="Projects"
        currentPage={page}
        perPage={perPage}
        totalEntries={240}
        onChange={setPage}
        perPageSelect={{
          onChange: (newPerPage) => {
            setPerPage(newPerPage);
            setPage(0);
          },
        }}
      />
    </Toolbar>
  );
}
```

## CSS variables

The variables of the toolbar are on `:root`, so an element outside the
toolbar can align with it: a bar of your own below it, or a button over the
corner of a fullscreen view.

## CSS variables

- `--Toolbar-inset`: The space above, below and at the sides of the title
- `--Toolbar-height`: Two insets plus one line of the title
- `--Toolbar-group-gap`: The gap between the controls of a group. The ghost icon buttons have their own padding, thus a small gap is sufficient.

## Props

### Toolbar

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The parts of the toolbar (Toolbar.Title, Toolbar.Space, …) |
| `style` | `'short' \| 'full'` | No | | "short" is a lower bar (40px), for a second toolbar under the main one. "full" makes the first part fill the width. |
| `borderBottom` | `boolean` | No | | A line below the toolbar, for a toolbar on top of a dialog or of tabs |
| `fields` | `boolean` | No | | The toolbar holds fields (a filter form): its buttons have the height of the fields ("field" size), so their edges align |
| `onClose` | `() => void` | No | | Closes the toolbar of a filter ("onClose" of useFilterToolbar). Escape in a text field of the toolbar calls it. |
| `className` | `string` | No | | Only for the placement of the toolbar (for example "Modal__header") |

### Toolbar.Title

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The title. A long title ends with an ellipsis. |
| `level` | `HeadingLevel` | No | | The level of the title as a heading. Give it only to a title inside \<main> or inside a dialog: the title of the content is level 1. Without it, the title is not a heading (for example the title of a sidebar). |
| `help` | `ReactNode` | No | | The help of the page (a Toolbar.Help). The "?" button shows after the title, in one group with it: the group gap is the space between them. Do not put a Toolbar.Help next to the title as a sibling. |
| `id` | `string` | No | | For aria-labelledby (for example the title of a dialog) |

### Toolbar.PresetsTitle

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` | `Message` | Yes | | The title of the list |
| `qualifier` | `Message` | No | | The short name of the active preset, after the title ("API tokens · Unused"). Give nothing when the list shows all the items. |
| `children` | `ReactNode` | Yes | | The options of the menu: PresetsTitle.Option elements |
| `footer` | `ReactNode` | No | | The content at the bottom of the menu, after a separator. The title opens a menu, so a "?" button next to it is one control too many: put the help of the page here (a Toolbar.HelpBody with "secondary"). |
| `level` | `HeadingLevel` | No | | The level of the title as a heading (see Toolbar.Title) |
| `id` | `string` | No | | The id of the heading, so other elements can use it as their label |

### Toolbar.PresetsTitle.Option

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The name of the preset: it says exactly what the preset keeps |
| `count` | `number` | No | | The number of the items that the preset keeps |
| `active` | `boolean` | Yes | | The preset is the active one |
| `onPick` | `() => void` | Yes | | Runs when the user picks the preset |

### Toolbar.Help

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The text that says what the page is for: two short sentences, plain text |
| `docsUrl` | `string` | No | | The page of the documentation about the subject. A "Learn more" link to it comes after the text. |

### Toolbar.Subtitle

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | A short text, for example the count of a list ("7,206 assets") |
| `hidden` | `boolean` | No | | The subtitle does not show |

### Toolbar.DotsDropdown

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The Dropdown.Option elements of the menu |
| `hidden` | `boolean` | No | | The menu does not show (give it when no option applies) |
| `label` | `TextMessage` | No | `"Actions"` | The name of the button and the text of its tooltip. Name the thing that the menu acts on, for example "Actions for Hello world". |

### Toolbar.GoBack

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `to` (variant) | `string` | No | | The URL of the parent page, for example the collection of a record |
| `onClick` (variant) | `() => void` | No | | Runs when the user clicks the chevron |
| `ariaLabel` | `TextMessage` | No | `{ id: 'toolbar.goBack' } ("Go back to the list")` | The name of the chevron for screen readers |
| `action` | `string` | No | | The id of the action of the registry that goes back: a tooltip shows the name of the chevron and the keys of the action |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

Group 1

| Variant | Props | Description |
| - | - | - |
| `GoBackLink` | `to` | A chevron that opens the parent page. It is a link. |
| `GoBackButton` | `onClick` | A chevron that runs an action, for example to close a panel. It is a button. |

### Toolbar.Group

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The controls of the group |
| `gap` | `'s'` | No | | Without a gap, the space between the controls is --Toolbar-group-gap, and the ghost icon buttons show as one strip. Use "s" for controls that have a visible surface, for example a primary button. |

### Toolbar.PrimaryButton

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `actions` | `ActionItem[]` | Yes | | The first action is the main button. The other actions go in the menu of a caret next to it (a split button). |
| `disabled` | `boolean` | No | | The button, the caret and the actions of the menu are disabled |
| `action` | `string` | No | | The id of the action of the main button: its name and its keys show in the tooltip (see the "action" tooltip of Button) |
| `iconOnly` | `boolean` | No | | Shows only the icon of the main action. The label is then the accessible name of the button. |
| `size` | `ButtonSize` | No | | The size of the button. The default is the size of its container: "milli" in a toolbar, "small" out of a toolbar. |

#### Types

`ActionItem` — One action of a PrimaryButton

```ts
export type ActionItem = (LinkActionItem | PickActionItem) & {
  /** The text of the action */
  label: TextMessage;
  /** The icon of the action */
  icon?: SvgIcon;
};
```

`LinkActionItem` — An action that opens a page of DatoCMS

```ts
type LinkActionItem = {
  /** A page of DatoCMS that the action opens */
  to: string;
  onPick?: never;
};
```

`PickActionItem` — An action that runs a function

```ts
type PickActionItem = {
  to?: never;
  /** Runs when the user picks the action */
  onPick: () => void;
};
```

### Toolbar.AddNewButton

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` | `TextMessage` | Yes | | The text of the button ("Add new webhook") |
| `to` | `string` | Yes | | The full URL of the page of the new item (DatoCMS adds its prefixes, for example the environment) |
| `disabled` | `boolean` | No | | The button cannot add |
| `icon` | `SvgIcon` | No | | The icon of the main action. The default is the "add" icon (a bolder version when the button shows only the icon). |
| `extraActions` | `ExtraAction[]` | No | | Other "add" actions. They show in a menu next to the button. |
| `action` | `string` | No | | The id of the action of the button: its name and its keys show in the tooltip (see the "action" tooltip of Button) |

#### Types

`ExtraAction`

```ts
type ExtraAction = {
  /** The text of the action */
  label: TextMessage;
  /** The full URL of the page (DatoCMS adds its prefixes) */
  to: string;
  /** The icon of the action */
  icon?: SvgIcon;
};
```

### Toolbar.FilterToggle

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `pressed` | `boolean` | Yes | | The filter is open ("open" of useFilterToolbar) |
| `onClick` | `() => void` | Yes | | Opens or closes the filter ("onToggle" of useFilterToolbar) |
| `onOpen` | `() => void` | No | | Opens the filter ("onOpen" of useFilterToolbar). `F` and `/` run it while the pointer or the focus is in the Pane, and the tooltip shows the keys. |

### Toolbar.FilterInput

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `value` | `string` | Yes | | The text of the filter |
| `onChange` | `(value: string) => void` | Yes | | Runs when the user changes the text |
| `ariaLabel` | `TextMessage` | No | | The name of the search landmark: what the field filters. Without it, the ariaLabel of the Pane. In a Toolbar.Search, the filter has no landmark of its own and does not use it. |
| `autoFocus` | `boolean` | No | `true` | The field gets the focus when it shows |
| `debounce` | `boolean` | No | `false` | "onChange" runs a moment after the user stops to type |
| `disabled` | `boolean` | No | | The field cannot change |
| `onClose` | `() => void` | No | | When it is set, the "✕" button is always visible. It clears the filter, then it calls this function (for example, to close the filter). |

### Toolbar.Search

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` | `TextMessage` | No | | The name of the search landmark: what the user searches or filters. Without it, the ariaLabel of the Pane. |
| `children` | `ReactNode` | Yes | | The fields and the buttons of the search, in a row |
| `className` | `string` | No | | For the layout of the children or for a container query of the page |

### Toolbar.Fill

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The controls of the part, in a row |
| `className` | `string` | No | | For the layout of the children or for a container query of the page |

### Toolbar.TextualDropdown

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The Dropdown.Option elements of the menu |
| `hidden` | `boolean` | No | | The menu does not show |
| `text` | `TextMessage` | Yes | | The text of the trigger: the current value |

### Toolbar.Spinner

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `show` | `boolean` | Yes | | The spinner shows |

### Toolbar.Tabs

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` | `TextMessage` | Yes | | The accessible name of the tablist, for example "Sidebar" |
| `children` | `ReactNode` | Yes | | The Toolbar.Tab elements |

### Toolbar.Tab

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | Yes | | The DOM id of the tab. Use `tabId(key)` of useTabIds. |
| `panelId` | `string` | Yes | | The DOM id of the panel that the tab shows. Use `panelId` of useTabIds. |
| `label` | `Message` | Yes | | The text of the tab, for example "Validations" |
| `active` | `boolean` | Yes | | True for the tab that shows |
| `invalid` | `boolean` | No | | The tab has fields with errors. It shows an error mark. |
| `onPick` | `() => void` | Yes | | Runs when the user picks the tab (click, or arrow keys) |

### Toolbar.TabLink

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `to` | `string` | Yes | | The page of the tab: the path with its query, for example "/schema/blog_post" |
| `label` | `Message` | Yes | | The text of the tab |
| `active` | `boolean` | No | | Sets the active tab when the URL does not tell it, for example a tab in the query of the URL. Without it, the tab is active when the URL matches `to`. |
| `invalid` | `boolean` | No | | The tab has fields with errors. It shows an error mark. |
| `replace` | `boolean` | No | | The link replaces the current entry of the history |

### Toolbar.Pagination

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `disabled` | `boolean` | No | `false` | The buttons do not respond, for example while the next page loads |
| `onChange` | `(newPage: number) => void` | Yes | | Runs when the user picks a page. The first page is 0. |
| `perPage` | `number` | Yes | | The number of items in one page, for example 25 |
| `currentPage` | `number` | Yes | | The page that shows. The first page is 0. |
| `maxNarrowPagesToBeShown` | `number` | No | | The most page numbers that show in a narrow toolbar (see Toolbar.Pagination). The other page numbers show only in a wide toolbar. |
| `totalEntries` | `number` | Yes | | The number of items in all the pages |
| `ariaLabel` | `TextMessage` | No | | What the pages are of ("Roles"). Without it, the ariaLabel of the Pane. |
| `compact` | `boolean` | No | | Always fewer page numbers, and no "Show" select. Without it, the pagination has this layout only when the toolbar is narrow. |
| `perPageSelect` | `ToolbarPaginationPerPageSelect` | No | | A "Show" select before the pages, to change the number of items of a page. Without it, the number of items of a page is fixed. |

#### Types

`ToolbarPaginationPerPageSelect` — The select of the number of items of a page

```ts
export type ToolbarPaginationPerPageSelect = {
  /** Runs when the user picks a number of items of a page */
  onChange: (newPerPage: number) => void;
  /**
   * The numbers of items of a page that the user can pick
   * @default [25, 50, 100, 200]
   */
  options?: number[];
};
```

[`Toolbar.Button`](https://react-ui.datocms.com/Actions/Button.md) takes the props of [`Button`](https://react-ui.datocms.com/Actions/Button.md), without
`size`. `Toolbar.Note` takes only its text, and `Toolbar.Space` and
`Toolbar.Divider` have no props.
