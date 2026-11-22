# Pane

A box with the full height of its container: a fixed header, a content that
scrolls, and a fixed footer. Each page and each side of a split is a `Pane`.
The pane is only a layout: it has no title of its own, and it adds no
padding to its content.

The pane fills its parent (`position: absolute`), so the parent gives the
size: for example a side of a [`SplitPane`](https://react-ui.datocms.com/Layout/SplitPane.md), or a box with a height
as in the examples below.

## Header, content and footer

`header` and `footer` stay fixed, and the content scrolls between them. The
pane draws a line under each element of `header` and above each element of
`footer`: the toolbars have no line of their own. The content has no
padding: each type of content sets its own inset (the inset rows of a list,
the padding of a form).

```tsx
import Pane from 'datocms-react-ui/Pane';
import Toolbar from 'datocms-react-ui/Toolbar';
import React, { useState } from 'react';
import { ROLES, RoleRows } from './roles';

/** The header, the content that scrolls, and the footer */
export default function Anatomy() {
  const [page, setPage] = useState(0);

  return (
    <div style={{ position: 'relative', height: 320 }}>
      <Pane
        ariaLabel="Roles"
        header={
          <Pane.Header>
            <Pane.Header.Title>Roles</Pane.Header.Title>
            <Pane.Header.Subtitle>{ROLES.length} roles</Pane.Header.Subtitle>
          </Pane.Header>
        }
        footer={
          <Toolbar>
            <Toolbar.Pagination
              totalEntries={120}
              perPage={25}
              currentPage={page}
              onChange={setPage}
            />
          </Toolbar>
        }
      >
        <RoleRows roles={ROLES} />
      </Pane>
    </div>
  );
}
```

## View or edit

A pane is a view or an edit, and each has its own title bar:

- A **view pane** shows something to look at or browse: a list, a sidebar,
  a page to read, a side panel. Its bar is `Pane.Header`. Its parts change
  what the pane shows: the count, the filter, the presets, the tabs, the
  actions on the view (reorder, expand all) and the button that adds an
  element.
- An **edit pane** is the form of one thing: a role, a webhook, the
  settings of the project. Its bar is `Pane.FormHeader`. Its parts are
  about that thing: its name as the level 1 title, its state, the actions
  on it (duplicate, delete) and the Save button.

| | `Pane.Header` (view) | `Pane.FormHeader` (edit) |
| - | - | - |
| Title | The name of the view. A heading only with `level`. | The name of the thing. Always level 1. |
| After the title | `Subtitle`: the count (“5 roles”) | `Details`: the state (a pill, “Used by 3 models”) |
| “⋮” | Actions on the view | Actions on the thing, delete last |
| Right end | Filter, then [`Button`](https://react-ui.datocms.com/Actions/Button.md) (add an element) | `Submit` (Save) |
| Also | Tabs, presets, spinner | — |

The record editor and the dialogs have their own bars: they put a
[`Toolbar`](https://react-ui.datocms.com/Layout/Toolbar.md) in `header`. [`Toolbar`](https://react-ui.datocms.com/Layout/Toolbar.md) does not depend on the layout: import it
from `datocms-react-ui/Toolbar`, not from `Pane`.

## Pane.Header

The title bar of a view pane. Its parts are
`Pane.Header.Title` (or [`Pane.Header.Tabs`](https://react-ui.datocms.com/Navigation/Tabs.md)), `Subtitle`, `Menu`, `Display`,
[`Spinner`](https://react-ui.datocms.com/Feedback/Progress.md) and [`Button`](https://react-ui.datocms.com/Actions/Button.md). The header renders them in a fixed order. The order in the JSX
does not matter, and the tab order is the same as the visual order. So all
the panes have the same bar.

| Part | What it is |
| - | - |
| `Pane.Header.Title` | The title, with its `help` and its `presets`. |
| [`Pane.Header.Tabs`](https://react-ui.datocms.com/Navigation/Tabs.md) | [`Toolbar.TabLink`](https://react-ui.datocms.com/Layout/Toolbar.md) elements, instead of the title. |
| `Pane.Header.Subtitle` | The count of the list, after the title. |
| `Pane.Header.Menu` | The options of the “⋮” after the title. Without options, the “⋮” does not show. |
| `Pane.Header.Display` | The menu that changes how the list shows (the layout, the order), after the “⋮”. The trigger is a ghost [`Dropdown.ButtonTrigger`](https://react-ui.datocms.com/Actions/DropdownTriggers.md) with the icon and the name of the current layout. |
| [`Pane.Header.Spinner`](https://react-ui.datocms.com/Feedback/Progress.md) | A small spinner while the list loads again in the background. |
| [`Pane.Header.Button`](https://react-ui.datocms.com/Actions/Button.md) | The button on the right end, for example a [`Toolbar.AddNewButton`](https://react-ui.datocms.com/Layout/Toolbar.md). |

The parts are in a random order in the code, but the bar shows them in
its order.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import Pane from 'datocms-react-ui/Pane';
import Toolbar from 'datocms-react-ui/Toolbar';
import React from 'react';
import { ReorderIcon } from '@/icons';
import { ROLES, RoleRows } from './roles';

const noop = () => {};

/** The parts in the JSX are in a random order: the bar shows them in its own */
export default function HeaderParts() {
  return (
    <div style={{ position: 'relative', height: 240 }}>
      <Pane
        ariaLabel="Roles"
        header={
          <Pane.Header>
            <Pane.Header.Button>
              <Toolbar.AddNewButton label="New role" to="/Layout/Pane" />
            </Pane.Header.Button>
            <Pane.Header.Spinner />
            <Pane.Header.Menu>
              <Dropdown.Option icon={<ReorderIcon />} onPick={noop}>
                Reorder roles
              </Dropdown.Option>
            </Pane.Header.Menu>
            <Pane.Header.Subtitle>{ROLES.length} roles</Pane.Header.Subtitle>
            <Pane.Header.Title
              help={
                <Toolbar.Help docsUrl="https://www.datocms.com/docs">
                  The roles give the permissions to the collaborators.
                </Toolbar.Help>
              }
            >
              Roles
            </Pane.Header.Title>
          </Pane.Header>
        }
      >
        <RoleRows roles={ROLES} />
      </Pane>
    </div>
  );
}
```

The parts must be direct children of `Pane.Header`, because a fragment
hides them. Put a falsy value instead of a part that does not show.

## Pane.FormHeader

The title bar of an edit pane. Its parts are `Pane.FormHeader.Title`,
`Details`, `Menu` and `Submit`. As in `Pane.Header`, the bar renders them
in a fixed order (title, details, menu, then Save on the right end),
whatever the order in the JSX, and they must be its direct children.

`Submit` holds the submit button of the form: a [`Toolbar.Button`](https://react-ui.datocms.com/Actions/Button.md) with
`tone="primary"` and `submit`, which is `busy` while the form submits. Put
the whole pane inside the `form` element, so the button submits it.

The title is the level 1 heading of the page. Use `Pane.FormHeader` only in the
`<main>` of the page.

In the code, `Submit` comes first: the bar still shows it on
the right end.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import Pane from 'datocms-react-ui/Pane';
import Pill from 'datocms-react-ui/Pill';
import Toolbar from 'datocms-react-ui/Toolbar';
import React from 'react';
import { DeleteIcon, DuplicateIcon } from '@/icons';

const noop = () => {};

export default function FormHeader() {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div style={{ position: 'relative', height: 180 }}>
        <Pane
          header={
            <Pane.FormHeader>
              <Pane.FormHeader.Submit>
                <Toolbar.Button tone="primary" submit label="Save" />
              </Pane.FormHeader.Submit>
              <Pane.FormHeader.Title>Edit webhook</Pane.FormHeader.Title>
              <Pane.FormHeader.Details>
                <Pill>Enabled</Pill>
              </Pane.FormHeader.Details>
              <Pane.FormHeader.Menu>
                <Dropdown.Option icon={<DuplicateIcon />} onPick={noop}>
                  Duplicate
                </Dropdown.Option>
                <Dropdown.Separator />
                <Dropdown.Option
                  icon={<DeleteIcon />}
                  alert={true}
                  onPick={noop}
                >
                  Delete
                </Dropdown.Option>
              </Pane.FormHeader.Menu>
            </Pane.FormHeader>
          }
        >
          <div style={{ padding: 'var(--spacing-l)' }}>
            The fields of the webhook
          </div>
        </Pane>
      </div>
    </form>
  );
}
```

## Filter and presets

`useFilteredList` keeps the text filter and the presets of a list in
memory. Give it the items, the texts to search for each item, and the
presets. Give `filter` to `Pane.Header` and `presets` to
`Pane.Header.Title`:

- The header shows the filter button on the right end, immediately
  before the button of the bar when there is one, and the filter row under
  the bar while the filter is open. The filter is not an option of the “⋮”:
  a title bar with only a filter has no “⋮”.
- The title is the menu of the presets: “All”, then each preset with the
  count of its items. A preset that keeps no item does not show. The text
  filter narrows inside the active preset.
- `filteredItems` are the items to show. When `hasNoResults` is true, show
  `Pane.FilterBlankSlate` instead of the list.
- `F` or `/` opens the filter and moves the focus to it, while the pointer
  or the focus is in the pane, so two lists on one page do not share the
  keys. When the pane is the side list of a [`SplitPane`](https://react-ui.datocms.com/Layout/SplitPane.md) or of a
  [`ListDetail.Split`](https://react-ui.datocms.com/Patterns/ListAndDetail.md), the keys work in all the split: over the detail, the
  form or the blank slate, the keys filter the list. A nested split or pane
  keeps its own keys.

For other keys of a list (the selection, for example), give
`usePaneRegion()` to `useRegisterActions` in a part of the pane: the keys
work while the pointer or the focus is in the pane.

Pick “Can change the schema” in the menu of the title, then filter for
“zzz”.

```tsx
import Pane, { useFilteredList } from 'datocms-react-ui/Pane';
import React from 'react';
import { ROLES, Role, RoleRows } from './roles';

const PRESETS = [
  {
    id: 'schema',
    label: 'Can change the schema',
    shortLabel: 'Schema',
    matches: (role: Role) => role.canEditSchema,
  },
  {
    id: 'content',
    label: 'Can change only the content',
    shortLabel: 'Content',
    matches: (role: Role) => !role.canEditSchema,
  },
];

export default function FilterAndPresets() {
  const { filter, presets, filteredItems, hasNoResults } = useFilteredList(
    ROLES,
    (role) => [role.name, role.description],
    PRESETS,
  );

  return (
    <div style={{ position: 'relative', height: 360 }}>
      <Pane
        ariaLabel="Roles"
        header={
          <Pane.Header filter={filter}>
            <Pane.Header.Title presets={presets}>Roles</Pane.Header.Title>
          </Pane.Header>
        }
      >
        {hasNoResults ? (
          <Pane.FilterBlankSlate />
        ) : (
          <RoleRows roles={filteredItems} />
        )}
      </Pane>
    </div>
  );
}
```

To show the presets outside a pane, see [`Toolbar.PresetsTitle`](https://react-ui.datocms.com/Layout/Toolbar.md) in
[`Toolbar`](https://react-ui.datocms.com/Layout/Toolbar.md).

## Mode

While the pane is in a mode (for example the reorder mode of a sidebar),
give `mode={{ onExit }}`: the pane draws a primary frame around its content,
and a click on the page outside the pane runs `onExit`. The title is the name
of the mode, and the button that stops the mode is a primary “Done”.

For a screen reader, the content is a group with the title as its name (the
`Pane.Header.Title` without presets). When the mode starts, the focus moves to
the group, so the screen reader reads the name of the mode. When the mode
stops and the focus has no element (the “Done” button goes away), the focus
moves to the content.

Pick “Reorder roles” in the “⋮”, then click outside the pane.

```tsx
import Button from 'datocms-react-ui/Button';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import Pane from 'datocms-react-ui/Pane';
import React, { useState } from 'react';
import { ReorderIcon } from '@/icons';
import { ROLES, RoleRows } from './roles';

export default function Mode() {
  const [isReordering, setIsReordering] = useState(false);
  const stop = () => setIsReordering(false);

  return (
    <div style={{ position: 'relative', height: 360 }}>
      <Pane
        ariaLabel="Roles"
        mode={isReordering ? { onExit: stop } : undefined}
        header={
          <Pane.Header>
            <Pane.Header.Title>
              {isReordering ? 'Reorder roles' : 'Roles'}
            </Pane.Header.Title>
            <Pane.Header.Menu>
              {!isReordering && (
                <Dropdown.Option
                  icon={<ReorderIcon />}
                  onPick={() => setIsReordering(true)}
                >
                  Reorder roles
                </Dropdown.Option>
              )}
            </Pane.Header.Menu>
            <Pane.Header.Button>
              {isReordering && (
                <Button tone="primary" label="Done" onClick={stop} />
              )}
            </Pane.Header.Button>
          </Pane.Header>
        }
      >
        <RoleRows roles={ROLES} />
      </Pane>
    </div>
  );
}
```

## Split

A list and its detail are two panes in a [`SplitPane`](https://react-ui.datocms.com/Layout/SplitPane.md). The title of
the list on the left is not a heading. The title of the detail pane is a
level 2 heading (`level={2}`).

```tsx
import Pane from 'datocms-react-ui/Pane';
import SplitPane from 'datocms-react-ui/SplitPane';
import React, { useState } from 'react';
import { ROLES, RoleRows } from './roles';

export default function Split() {
  const [activeId, setActiveId] = useState(ROLES[0].id);
  const active = ROLES.find((role) => role.id === activeId);

  return (
    <div style={{ position: 'relative', height: 360 }}>
      <SplitPane size={240} minSize={200} primaryPane="right">
        <Pane
          ariaLabel="Roles"
          header={
            <Pane.Header>
              <Pane.Header.Title>Roles</Pane.Header.Title>
            </Pane.Header>
          }
        >
          <RoleRows roles={ROLES} activeId={activeId} onPick={setActiveId} />
        </Pane>
        <Pane
          ariaLabel={active?.name}
          header={
            <Pane.Header>
              <Pane.Header.Title level={2}>
                {active?.name ?? ''}
              </Pane.Header.Title>
            </Pane.Header>
          }
        >
          <p style={{ padding: 'var(--spacing-l)', margin: 0 }}>
            {active?.description}
          </p>
        </Pane>
      </SplitPane>
    </div>
  );
}
```

## Tabs in the header

[`Pane.Header.Tabs`](https://react-ui.datocms.com/Navigation/Tabs.md) takes [`Toolbar.TabLink`](https://react-ui.datocms.com/Layout/Toolbar.md) elements: each tab is a page
with its own URL (for example “Models” and “Blocks” in the sidebar of the
schema).

```tsx
<Pane.Header>
  <Pane.Header.Tabs>
    <Toolbar.TabLink to="/schema/item_types" label="Models" />
    <Toolbar.TabLink to="/schema/blocks_library" label="Blocks" />
  </Pane.Header.Tabs>
</Pane.Header>
```

For tabs that switch the content in the same page, put a [`Toolbar`](https://react-ui.datocms.com/Layout/Toolbar.md) with
[`Toolbar.Tabs`](https://react-ui.datocms.com/Navigation/Tabs.md) in `header`, and give `tabPanel` to the pane: the content
gets the role and the IDs of the tab panel (see “Tabs” in
[`Toolbar`](https://react-ui.datocms.com/Layout/Toolbar.md)).

## Selection bar

`slideUpToolbar` is the bar between the content and the footer for the
actions on the selected items: a [`MultipleSelectionActionBar`](https://react-ui.datocms.com/Actions/MultipleSelectionActionBar.md). The bar
shows when the user selects items, and hides itself when the selection is
empty.

## Accessibility

### Pane name

A `Pane` that holds a list gets an `ariaLabel`: the name of what it lists
(“Roles”), not the word “search”. The filter of the list (`filter` on
`Pane.Header`, [`Toolbar.FilterInput`](https://react-ui.datocms.com/Layout/Toolbar.md), [`Toolbar.Search`](https://react-ui.datocms.com/Layout/Landmarks.md)) and
[`Toolbar.Pagination`](https://react-ui.datocms.com/Layout/Toolbar.md) take it as their `ariaLabel` when they have none of
their own, so you write the name once. Only the parts of [`Toolbar`](https://react-ui.datocms.com/Layout/Toolbar.md)
read it: the generic [`Search`](https://react-ui.datocms.com/Layout/Landmarks.md) always needs an `ariaLabel`, and [`Nav`](https://react-ui.datocms.com/Layout/Landmarks.md) and
[`Aside`](https://react-ui.datocms.com/Layout/Landmarks.md) keep their own, because two of them in a pane need different names.
A part of your own code reads the name with `usePaneAriaLabel()`
(`datocms-react-ui/Pane`). A `Pane` without `ariaLabel` gives an empty name.

## Props

### Pane

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` | `TextMessage` | No | | The label of the parts of the pane that get none of their own (the filter of the list, the pagination) |
| `className` | `string` | No | | Only for the content of the pane, not for the look of the box |
| `busy` | `boolean` | No | | Shows a spinner on the pane while its content loads again (for example the records of a list after a change of the filter) |
| `header` | `ReactNode` | No | | The fixed bar at the top: a Pane.Header, or a Toolbar. The pane draws a line under each element of the slot (for example the toolbar and the filter row under it). |
| `slideUpToolbar` | `ReactNode` | No | | A bar between the content and the footer, for the actions on the selected items (a MultipleSelectionActionBar). The bar shows and hides itself. |
| `mode` | `{ onExit: () => void; }` | No | | Puts the pane in a mode (for example the reorder mode of a sidebar). While the prop is set, the pane draws a primary frame around its content, under the title bar. So the user sees that the pane is in that mode. The title in the header is the name of the mode.<br>For a screen reader, the content is then a group with the title as its name. When the mode starts, the focus goes to the group. When the mode stops and the focus has no element (the "Done" button goes away), the focus goes to the content. |
| `footer` | `ReactNode` | No | | The fixed bar at the bottom (for example a Toolbar with the pagination). The pane draws a line above each element of the slot. |
| `tabPanel` | `{ id: string; labelledBy: string }` | No | | The content is the panel of tabs in the header (see Toolbar.Tabs): it gets role="tabpanel", the id that the tabs control, and the id of the active tab as its label. |

Example of `ariaLabel`:

```tsx
"Roles"
```

Also accepts:

- `children` (from `React`)

### Pane.Header

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `filter` | `ListFilterProps` | No | | The text filter of the list (the "filter" of useFilteredList). The header shows the filter button in the bar and the filter row under it. |
| `children` | `ReactNode` | Yes | | The parts: Pane.Header.Title or Pane.Header.Tabs, and the others |

### Pane.Header.Title

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `Message` | Yes | | The title |
| `level` | `HeadingLevel` | No | | The level of the title as a heading. Give it only to a pane inside \<main> or inside a dialog that has content: the title of a detail pane is level 2. Without it, the title is not a heading (for example the title of a list on the left). |
| `help` | `ReactNode` | No | | The help of the page (a Toolbar.Help element) |
| `presets` | `ListPresetsProps` | No | | Makes the title a menu of presets (views of the list: fixed filters with a name), with the help at the bottom of the menu. The "presets" of useFilteredList.<br>See `` |

### Pane.Header.Tabs

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | Toolbar.TabLink elements: each tab is a page with its own URL |
| `help` | `ReactNode` | No | | The help of the page (a Toolbar.Help element). It shows after the tabs. |

`Pane.Header.Subtitle`, `Pane.Header.Menu`, `Pane.Header.Display` and
[`Pane.Header.Button`](https://react-ui.datocms.com/Actions/Button.md) take only `children`. [`Pane.Header.Spinner`](https://react-ui.datocms.com/Feedback/Progress.md) takes no props.

### Pane.FormHeader.Title

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The name of the thing that the form edits |
| `help` | `ReactNode` | No | | The help of the page (a Toolbar.Help element) |

### Pane.FormHeader.Details

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The state of the thing, immediately after the title: a Pill, or a Toolbar.TextualDropdown ("Used by 3 models") |

### Pane.FormHeader.Menu

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The actions on the thing (Dropdown.Option elements): duplicate, then delete as the last option, after a separator |
| `hidden` | `boolean` | No | | The menu does not show, for example on the form of a new thing |

### Pane.FormHeader.Submit

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The submit button of the form: a Toolbar.Button with `tone="primary"` and `submit` |
