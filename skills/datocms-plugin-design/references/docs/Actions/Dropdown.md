# Dropdown

A button that opens a menu. `Dropdown` takes the trigger (see the [Dropdown
triggers](https://react-ui.datocms.com/Actions/DropdownTriggers.md)) and the props of the trigger, and its
child is a `Dropdown.Menu` with the options.

```tsx
<Dropdown triggerComponent={IconTrigger} icon={ActionToggleIcon}>
  <Dropdown.Menu placement="bottom-end">
    <Dropdown.Option icon={<EditIcon />} onPick={rename}>
      Rename
    </Dropdown.Option>
  </Dropdown.Menu>
</Dropdown>
```

Other components for other cases:

- A value of a form that the user picks from a list is a [`SelectInput`](https://react-ui.datocms.com/Forms/SelectInput.md), not
  a dropdown.
- Content that is not a list of options (a text with links, a preview) goes
  in a [`HoverCard`](https://react-ui.datocms.com/Overlays/Tooltip.md), not in a menu.

## Opening

The menu renders only while it is open. When it is expensive to make (for
example it reads a long list), give a function as the child. It runs only
when the menu opens. To open the menu from code (for example with a
keyboard shortcut), give a `controlRef` and call `open()`.

The menu opens next to its trigger, even in a narrow frame.

## Action menus

An action menu does something to an object: the “⋮” of a row, of a card
or of a toolbar. Every option has an icon, and an action always has the same
icon: the pen for Edit and Rename, the trash for Delete, the cross only to
unlink or clear a value. A destructive option has `alert`, comes last, and has
a `Dropdown.Separator` above it.

The icons of a menu follow these rules:

- **All or none in a group.** In a group (the options between two
  separators, or in one `Dropdown.Group`), give an icon to every option or
  to no option. A menu with only one option has no icon.
- **Pass the icon in the `icon` prop** of `Dropdown.Option` (and
  `triggerIcon` of `Dropdown.Submenu`), not as a child. The prop sets the
  `has-icon` class on the option.
- **One icon for one action.** Use the same icon for the same action in all
  the menus, and never the same icon for two actions. The icons of
  `Generic`: `EditIcon` (edit), `ReorderIcon` (start to reorder a list),
  `DuplicateIcon` (duplicate), `DeleteIcon` (delete or remove), `HideIcon`
  (hide), `RefreshIcon` (do again: regenerate, resend, re-index),
  `ConvertUsersIcon` (convert regular users into SSO users), `ExportIcon`
  (export to a file), `VersionIcon` (change the version), `DashboardIcon`
  (go to the dashboard).
- **The check of the active option is not an icon.** Use the `active` prop:
  it puts the check in the left gutter.

Click the “⋮” to open the menu.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import IconTrigger from 'datocms-react-ui/Dropdown/triggers/IconTrigger';
import React from 'react';
import {
  ActionToggleIcon,
  DeleteIcon,
  DuplicateIcon,
  EditIcon,
  OpenInNewTabIcon,
} from '@/icons';

const noop = () => {};

export default function ActionMenu() {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-m)' }}
    >
      <span style={{ flex: 1 }}>Spring launch</span>
      <Dropdown triggerComponent={IconTrigger} icon={ActionToggleIcon}>
        <Dropdown.Menu placement="bottom-end">
          <Dropdown.Option icon={<EditIcon />} onPick={noop}>
            Rename
          </Dropdown.Option>
          <Dropdown.Option icon={<DuplicateIcon />} onPick={noop}>
            Duplicate
          </Dropdown.Option>
          <Dropdown.Option icon={<OpenInNewTabIcon />} onPick={noop}>
            Open in a new tab
          </Dropdown.Option>
          <Dropdown.Separator />
          <Dropdown.Option icon={<DeleteIcon />} alert={true} onPick={noop}>
            Delete
          </Dropdown.Option>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}
```

## Option action

An option has one action, as a [`Button`](https://react-ui.datocms.com/Actions/Button.md):

- `onPick` runs a function.
- `to` opens a page of DatoCMS.
- `href` opens another site.
- `newTab` opens the page of `to` or `href` in a new tab.
- `action` runs an action of the registry and shows its keys. In a region, it
  runs the action of that region (see “Regions” in [`Actions`](https://react-ui.datocms.com/Actions/Actions.md)).

TypeScript does not accept two actions on one option.

```tsx
<Dropdown.Option icon={<EditIcon />} onPick={rename}>Rename</Dropdown.Option>
<Dropdown.Option icon={<ModelIcon />} to={modelUrl}>Go to the model</Dropdown.Option>
<Dropdown.Option href={siteUrl} newTab>Open the site</Dropdown.Option>
```

An option with `to` or `href` is a real link: a click with Cmd or with the
middle button opens it in a new tab. When the page of `to` is open, the
option gets `aria-current="page"`. When `onPick` returns a promise and the
menu stays open (`closeMenuOnClick={false}`), a click out of the menu does
not close it until the promise ends.

## Choice menus

A choice menu sets a value: the sort, the locale, the view. Its options
have no icons. The option of the current value is `active` (a check shows
before it). Give `active={false}` to the other options, so that all the
labels line up. The trigger shows the current value.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import ButtonTrigger from 'datocms-react-ui/Dropdown/triggers/ButtonTrigger';
import React, { useState } from 'react';

const ORDERS = ['Last updated', 'Last created', 'Title A–Z', 'Title Z–A'];

export default function ChoiceMenu() {
  const [order, setOrder] = useState(ORDERS[0]);

  return (
    <Dropdown
      triggerComponent={ButtonTrigger}
      tone="ghost"
      label={`Sort: ${order}`}
    >
      <Dropdown.Menu>
        {ORDERS.map((value) => (
          <Dropdown.Option
            key={value}
            active={value === order}
            onPick={() => setOrder(value)}
          >
            {value}
          </Dropdown.Option>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
```

## Search and groups

A menu with more than 5 options shows a search field. `contextualSearch`
changes it: `false` hides it, `true` always shows it, and `{ placeholder }`
always shows it with another text. Give `keywords` when the user can search
for words that are not in the label, for example the code of a locale. A long
menu puts its options in `Dropdown.Group`s. Their titles stick at the top
while the options scroll.

Type “ja” to find Japanese by its code.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import ButtonTrigger from 'datocms-react-ui/Dropdown/triggers/ButtonTrigger';
import React from 'react';
import { AddIcon } from '@/icons';

const GROUPS = [
  {
    name: 'Europe',
    locales: [
      ['en', 'English'],
      ['fr', 'French'],
      ['de', 'German'],
      ['it', 'Italian'],
      ['es', 'Spanish'],
    ],
  },
  {
    name: 'Asia',
    locales: [
      ['ja', 'Japanese'],
      ['ko', 'Korean'],
      ['zh', 'Chinese'],
    ],
  },
];

const noop = () => {};

export default function SearchAndGroups() {
  return (
    <Dropdown
      triggerComponent={ButtonTrigger}
      icon={AddIcon}
      label="Add locale"
    >
      <Dropdown.Menu
        minWidth={240}
        contextualSearch={{ placeholder: 'Search locales...' }}
      >
        {GROUPS.map((group) => (
          <Dropdown.Group key={group.name} name={group.name}>
            {group.locales.map(([code, name]) => (
              <Dropdown.Option key={code} keywords={[code]} onPick={noop}>
                {name}
              </Dropdown.Option>
            ))}
          </Dropdown.Group>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
```

## Submenus

`Dropdown.Submenu` is an option that opens a second menu at its side, on
hover. Use it for a choice inside an action menu (“Move to”).

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import IconTrigger from 'datocms-react-ui/Dropdown/triggers/IconTrigger';
import React from 'react';
import { ActionToggleIcon, EditIcon, GroupIcon } from '@/icons';

const noop = () => {};

export default function SubmenuExample() {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-m)' }}
    >
      <span style={{ flex: 1 }}>Spring launch</span>
      <Dropdown triggerComponent={IconTrigger} icon={ActionToggleIcon}>
        <Dropdown.Menu placement="bottom-end">
          <Dropdown.Option icon={<EditIcon />} onPick={noop}>
            Rename
          </Dropdown.Option>
          <Dropdown.Submenu
            triggerIcon={<GroupIcon />}
            triggerContent="Move to"
          >
            <Dropdown.Option onPick={noop}>Blog</Dropdown.Option>
            <Dropdown.Option onPick={noop}>Docs</Dropdown.Option>
            <Dropdown.Option onPick={noop}>Marketing</Dropdown.Option>
          </Dropdown.Submenu>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}
```

## Disabled options

An option that the user cannot pick now gets `disabled={{ reason }}`: its
tooltip says why.

Hover over “Promote” or “Delete” to see the reason.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import IconTrigger from 'datocms-react-ui/Dropdown/triggers/IconTrigger';
import React from 'react';
import {
  ActionToggleIcon,
  DeleteIcon,
  ForkIcon,
  PrimaryEnvironmentIcon,
} from '@/icons';

const noop = () => {};

export default function DisabledOptions() {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-m)' }}
    >
      <span style={{ flex: 1 }}>staging</span>
      <Dropdown triggerComponent={IconTrigger} icon={ActionToggleIcon}>
        <Dropdown.Menu placement="bottom-end">
          <Dropdown.Option icon={<ForkIcon />} onPick={noop}>
            Fork
          </Dropdown.Option>
          <Dropdown.Option
            icon={<PrimaryEnvironmentIcon />}
            disabled={{ reason: 'The environment has no changes to promote.' }}
            onPick={noop}
          >
            Promote
          </Dropdown.Option>
          <Dropdown.Separator />
          <Dropdown.Option
            icon={<DeleteIcon />}
            alert={true}
            disabled={{ reason: 'You cannot delete the primary environment.' }}
            onPick={noop}
          >
            Delete
          </Dropdown.Option>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}
```

## Checkboxes and footer

`checkbox={{ checked, onChange }}` makes a menu of many values. The menu
stays open while the user changes the checkboxes. An option with a checkbox
and no action is a `menuitemcheckbox`: a pick changes its checkbox. An
option can also have a checkbox and an action (the locale menu of a record:
the label opens the locale, the checkbox selects it). Enter runs the action,
and Space changes the checkbox of the highlighted option. Without `onChange`,
the checkbox is read-only.

`Dropdown.Footer` stays visible when the options scroll. It holds the buttons
that act on all the options.

```tsx
import Button from 'datocms-react-ui/Button';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import ButtonTrigger from 'datocms-react-ui/Dropdown/triggers/ButtonTrigger';
import React, { useState } from 'react';
import { FilterIcon } from '@/icons';

const STATUSES = ['Draft', 'Updated', 'Published', 'Scheduled'];

export default function Checkboxes() {
  const [shown, setShown] = useState(['Draft', 'Updated']);

  return (
    <Dropdown
      triggerComponent={ButtonTrigger}
      tone="ghost"
      icon={FilterIcon}
      label="Status"
    >
      <Dropdown.Menu contextualSearch={false}>
        {STATUSES.map((status) => (
          <Dropdown.Option
            key={status}
            checkbox={{
              checked: shown.includes(status),
              onChange: (checked) =>
                setShown((old) =>
                  checked ? [...old, status] : old.filter((s) => s !== status),
                ),
            }}
          >
            {status}
          </Dropdown.Option>
        ))}
        <Dropdown.Footer>
          <Button
            tone="ghost"
            size="micro"
            label="Select all"
            onClick={() => setShown(STATUSES)}
          />
        </Dropdown.Footer>
      </Dropdown.Menu>
    </Dropdown>
  );
}
```

## Option buttons

`Dropdown.OptionAction` is an icon button at the end of an option, for
example the pen that renames a saved view. A footer with
`variant="options"` holds options that do not belong to the list, for
example “Save the current view…”.

Hover over a view to see its actions.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import ButtonTrigger from 'datocms-react-ui/Dropdown/triggers/ButtonTrigger';
import React, { useState } from 'react';
import { AddIcon, DeleteIcon, EditIcon } from '@/icons';

const VIEWS = ['All records', 'My drafts', 'Published this week'];

const noop = () => {};

export default function OptionActions() {
  const [view, setView] = useState(VIEWS[0]);

  return (
    <Dropdown triggerComponent={ButtonTrigger} tone="ghost" label={view}>
      <Dropdown.Menu minWidth={260}>
        {VIEWS.map((value) => (
          <Dropdown.Option
            key={value}
            active={value === view}
            onPick={() => setView(value)}
            actions={
              <>
                <Dropdown.OptionAction
                  icon={EditIcon}
                  label={`Rename “${value}”`}
                  onClick={noop}
                />
                <Dropdown.OptionAction
                  icon={DeleteIcon}
                  alert={true}
                  label={`Delete “${value}”`}
                  onClick={noop}
                />
              </>
            }
          >
            {value}
          </Dropdown.Option>
        ))}
        <Dropdown.Footer variant="options">
          <Dropdown.Option icon={<AddIcon />} onPick={noop}>
            Save the current view…
          </Dropdown.Option>
        </Dropdown.Footer>
      </Dropdown.Menu>
    </Dropdown>
  );
}
```

## Other content

A value that the user picks from a list is a menu of options, and the pick
applies at once (the stage of a record, its creator). A value that the user
types is a small form in the menu, with a submit button (a date, the
position). Do not open a dialog to change one value.

Content that is not a list of options (a small form, a text, a spinner)
goes in a `<div className="Dropdown__menu__body">`. The class sets the
inset. Do not make a class of your own only for the padding. Content
that must line up with the text of the options uses the variables of the
menu (see "CSS variables" below): `--Dropdown-item-padding-x`, and
`--Dropdown-gutter` in a menu with checks.

`Dropdown.Option` closes the menu by itself. Other content calls the
function of `useCloseMenu()` (`datocms-react-ui/Dropdown`) after its action.
For example, a form closes the menu when the submit succeeds. Outside a
`Dropdown`, the function does nothing.

Click the file name, change it and press Enter.

```tsx
import Button from 'datocms-react-ui/Button';
import { Dropdown, useCloseMenu } from 'datocms-react-ui/Dropdown';
import TextualTrigger from 'datocms-react-ui/Dropdown/triggers/TextualTrigger';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import StringInput from 'datocms-react-ui/StringInput';
import React, { useState } from 'react';

type RenameFormProps = {
  name: string;
  onRename: (name: string) => void;
};

// The menu renders this form only while it is open, thus the input starts
// from the current name each time.
function RenameForm({ name, onRename }: RenameFormProps) {
  const closeMenu = useCloseMenu();
  const [value, setValue] = useState<string | null>(name);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onRename(value?.trim() || name);
        closeMenu();
      }}
    >
      <div className="Dropdown__menu__body">
        <FieldWrapper label="File name">
          <StringInput value={value} onChange={setValue} autoFocus />
        </FieldWrapper>
        <Button tone="primary" size="small" submit label="Rename" />
      </div>
    </form>
  );
}

export default function FormInMenu() {
  const [name, setName] = useState('hero-image');

  return (
    <div>
      The file{' '}
      <Dropdown triggerComponent={TextualTrigger} label={name}>
        <Dropdown.Menu>
          <RenameForm name={name} onRename={setName} />
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}
```

A panel with its own behavior that looks like a menu (the slash panel of a
text editor) renders the parts of `datocms-react-ui/Dropdown`: `MenuContainer`,
`MenuPanel`, `MenuSearch`, `MenuGroup`, `MenuItem` and `MenuEmpty`.
`Dropdown.Menu` and `Dropdown.Option` render the same parts, and so does the
menu of [`SelectInput`](https://react-ui.datocms.com/Forms/SelectInput.md). Do not write the classes of the panel, of the groups
or of the options outside `datocms-react-ui/Dropdown`. A picker with a trigger
is a real `Dropdown`: a child of the menu reads the search term with
`useMenuSearchTerm`.

## Sortable options

A `Dropdown.Group` with `onDragEnd` lets the user reorder its options with
drag and drop: each option gets `sortable={{ id, index }}`. A grip
shows in the gutter of the option on hover. `reorder`
(`datocms-react-ui/dnd`) gives the new order. Only the options of the group
move, and the other groups stay in place. The column menu of a table does
this: the shown columns in a sortable group, each with a hide action, then
the other columns, which the user picks to show them.

Drag a column by its grip. Hide a column, then pick it in “Available”.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import IconTrigger from 'datocms-react-ui/Dropdown/triggers/IconTrigger';
import { reorder } from 'datocms-react-ui/dnd';
import React, { useState } from 'react';
import { HideIcon, ProjectSettingsIcon } from '@/icons';

const COLUMNS = ['Title', 'Status', 'Author', 'Last updated', 'Locale'];

export default function Sortable() {
  const [displayed, setDisplayed] = useState(['Title', 'Status', 'Author']);
  const available = COLUMNS.filter((column) => !displayed.includes(column));

  return (
    <Dropdown
      triggerComponent={IconTrigger}
      icon={ProjectSettingsIcon}
      label="Columns"
    >
      <Dropdown.Menu>
        <Dropdown.Group
          name="Displayed"
          onDragEnd={(result) => setDisplayed((old) => reorder(old, result))}
        >
          {displayed.map((column, index) => (
            <Dropdown.Option
              key={column}
              sortable={{ id: column, index }}
              actions={
                displayed.length > 1 && (
                  <Dropdown.OptionAction
                    icon={HideIcon}
                    label={`Hide “${column}”`}
                    closeMenuOnClick={false}
                    onClick={() =>
                      setDisplayed((old) => old.filter((c) => c !== column))
                    }
                  />
                )
              }
            >
              {column}
            </Dropdown.Option>
          ))}
        </Dropdown.Group>
        {available.length > 0 && (
          <Dropdown.Group name="Available">
            {available.map((column) => (
              <Dropdown.Option
                key={column}
                closeMenuOnClick={false}
                onPick={() => setDisplayed((old) => [...old, column])}
              >
                {column}
              </Dropdown.Option>
            ))}
          </Dropdown.Group>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}
```

## Accessibility

The menu closes with Escape, Tab and a click outside it. The arrow keys move
the highlight, and Enter picks the option. A menu that a key opens has its
first option highlighted. After a pick with Enter, the focus goes back to the
trigger. When an option removes the trigger (the row of the menu), the focus
goes to the nearest element around the trigger that is still there.

## CSS variables

The variables are on the panel of the menu. Read them in its content.

## CSS variables

- `--Dropdown-padding`: The space between the edges of the panel and the options
- `--Dropdown-gutter`: The column at the left of the options that holds the check of the active option or the drag grip
- `--Dropdown-item-padding-x`: The space at the sides of the text of an option
- `--Dropdown-item-min-height`: The height of an option, with its padding

## Props

### Dropdown

`triggerComponent` is the trigger, and `children` is the `Dropdown.Menu` (or
a function that returns it). `controlRef` lets you open the menu from
code. `className` is only for the position of the dropdown. All the other props
go to the trigger.

## Dropdown.Menu props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `React.ReactNode` | Yes | | The options, groups, separators and texts of the menu |
| `placement` | `Placement` | No | `"bottom-start"` | The side of the trigger where the menu opens. When there is no space there, the menu goes to the other side. Use "bottom-end" for a trigger on the right of its container (the "⋮" of a row). |
| `noOverflowHidden` | `boolean` | No | | The menu does not clip its content. Give it when the content has its own popup (for example a date picker). |
| `contextualSearch` | `ContextualSearch` | No | `"auto"` | A search field at the top of the menu. With "auto", it shows when the menu has more than 5 options. With "{ placeholder }", it always shows, with that text instead of "Search...". |
| `minWidth` | `number` | No | | The minimum width of the menu, in pixels |
| `optionPaddingY` | `number` | No | | The vertical padding of the options, in pixels. Give it to a menu of options on two lines (an entity row with a title and details). |
| `offset` | `OffsetOptions` | No | `{ mainAxis: 4 }` | The distance between the trigger and the menu |

## Dropdown.Option props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `onPick` (variant) | `PickHandler \| undefined` | No | | Runs when the user picks the option (click, tap or Enter). A wrapper can give "undefined": the option then has no action. |
| `to` (variant) | `string` | No | | The page of DatoCMS that the option opens |
| `href` (variant) | `string` | No | | The URL that the option opens |
| `newTab` (variant) | `boolean` | No | | LinkAction: Opens the page in a new tab<br>ExternalLinkAction: Opens the page in a new tab (for example the docs) |
| `action` (variant) | `string` | No | | The id of the action |
| `active` | `boolean` | No | | The value that is selected now, in a menu of choices: a check shows before the option. Give "false" to the other options of the menu, so that all the labels line up. |
| `forceHover` | `boolean` | No | | Shows the hover look. Submenu uses it while its menu is open. |
| `alert` | `boolean` | No | | Marks a destructive choice, for example a delete or a remove. The option shows in red. Put it last, after a Dropdown.Separator. |
| `invalid` | `boolean` | No | | Shows the triangle of an invalid value after the label |
| `children` | `React.ReactNode` | Yes | | The label of the option |
| `sortable` | `OptionSortable` | No | | The user can drag the option to a new position. Give it to the options of a Dropdown.Group with "onDragEnd". |
| `disabled` | `Disabled` | No | | With a reason, the option is disabled and its tooltip says why. With "interactive", the reason has links: it shows in a HoverCard. |
| `closeMenuOnClick` | `boolean` | No | `true` | Give "false" when the menu must stay open after the pick (for example to pick more values) |
| `checkbox` | `OptionCheckbox` | No | | Shows a checkbox before the label, for a menu of many values. Without an action, a pick of the option changes the checkbox, and the menu stays open. Without "onChange", the checkbox is read-only. |
| `icon` | `React.ReactNode` | No | | The icon before the label. In a menu of actions, give an icon to all the options. In a menu of choices, give no icons. |
| `keywords` | `string[]` | No | | More words that the search field of the menu finds, in addition to the text of the option. For example, "markdown" finds a text field. |
| `submenu` | `OptionSubmenu` | No | | Shows a chevron after the label, and a screen reader says if the submenu is open. Dropdown.Submenu gives it. |
| `actions` | `React.ReactNode` | No | | Icon buttons at the end of the option (Dropdown.OptionAction). With actions, only the label is the target of the click. |

### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

`OptionAction` — The action of an option: a pick handler, an action of the registry, a page of DatoCMS, or another site. One option has one action.

| Variant | Props | Description |
| - | - | - |
| `PickAction` | `onPick` | Runs "onPick" |
| `RegistryAction` | `action` | Runs an action of the registry (`Actions`). The keys of the action show at the end of the option. The option is disabled while the action gives a reason, or when the action does not exist now. |
| `LinkAction` | `to`, `newTab` | A link to a page of DatoCMS. When the page is open, the option gets aria-current="page". |
| `ExternalLinkAction` | `href`, `newTab` | A link to another site |
| `NoAction` | | No action: the option opens a submenu, or it has a checkbox or actions, or it is disabled |

### Types

`PickHandler` — The handler of a pick. When it returns a promise and the menu stays open ("closeMenuOnClick" is false), a click out of the menu does not close it until the promise ends.

```ts
type PickHandler = (
  event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
) => unknown;
```

`OptionSortable` — The place of an option in a sortable Dropdown.Group

```ts
export type OptionSortable = {
  /**
   * A name that stays the same when the option moves. It is "draggableId"
   * in the drop result.
   */
  id: string;
  /** The position of the option in its group */
  index: number;
};
```

`OptionCheckbox` — The checkbox of an option

```ts
export type OptionCheckbox = {
  /** The value of the checkbox */
  checked: boolean;
  /** Runs when the user changes the checkbox */
  onChange?: (newValue: boolean) => void;
};
```

`OptionSubmenu` — The submenu of an option

```ts
export type OptionSubmenu = {
  /** True when the submenu is open */
  open: boolean;
};
```

## Dropdown.Group props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `React.ReactNode` | Yes | | The options of the group |
| `name` | `Message` | No | | The title of the group, for example `{ id: 'filter.shared' }`. It sticks at the top while the options scroll. |
| `icon` | `React.ReactNode` | No | | An icon before the title, for the kind of all the options of the group (an organization, an agency). The options then have no icon of their own. |
| `onDragEnd` | `(result: SortableDropResult) => void` | No | | Give it to let the user reorder the options of the group with drag and drop. Each option then needs "sortable". |

## Dropdown.Submenu props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `triggerContent` | `ReactNode` | Yes | | The label of the option that opens the submenu |
| `triggerIcon` | `ReactNode` | No | | The icon of the option that opens the submenu |
| `children` | `ReactNode` | Yes | | The options of the submenu |
| `disabled` | `boolean` | No | | The option cannot open the submenu |

## Dropdown.OptionAction props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `icon` | `SvgIcon` | Yes | | The icon of the button |
| `alert` | `boolean` | No | | Marks a destructive choice, for example a delete. The icon shows in red. |
| `onClick` | `(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void` | Yes | | Runs when the user clicks the button |
| `closeMenuOnClick` | `boolean` | No | `true` | Give "false" when the menu must stay open after the click |
| `label` | `TextMessage` | Yes | | The tooltip and the accessible name of the icon button |

## Dropdown.Footer props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `variant` | `'buttons' \| 'options'` | No | `"buttons"` | "buttons" is for the buttons that act on the options (for example "Add 3 locales"). "options" is for Dropdown.Options, for example "Create new organization…": they look like the options of the menu, as the actions in the footer of a SelectInput. |
| `children` | `React.ReactNode` | Yes | | The buttons or the options |

`Dropdown.Separator` and `Dropdown.Text` (a text that is not an option) have
no props other than `children`.
