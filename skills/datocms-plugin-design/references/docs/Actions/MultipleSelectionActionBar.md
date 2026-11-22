# MultipleSelectionActionBar

The bar that floats at the bottom of a list or a page while the user has
selected elements. It shows the number of selected elements, the actions on
them and a cross that clears the selection.

Other components for other cases:

- Actions on one element go in its row (a [`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md) or ghost buttons), not in
  this bar.
- A message about the result of an action is a toast, not a bar.

## Showing the bar

Give `open` while the selection is not empty (`open={selection.length > 0}`).
The bar slides in, and out when `open` is false again. `status` is the text
with the number, for example “3 records selected”.

The `placement` prop sets where the bar floats:

- `"pane"` (the default): at the bottom of a [`Pane`](https://react-ui.datocms.com/Layout/Pane.md), centered on it, above
  its footer. Give the bar to the `slideUpToolbar` prop of the [`Pane`](https://react-ui.datocms.com/Layout/Pane.md), as the
  lists of records and of assets do in DatoCMS.
- `"window"`: at the bottom of the window, centered on it. Use it where there
  is no [`Pane`](https://react-ui.datocms.com/Layout/Pane.md) slot, for example the blocks of a field in a record form.

Move the pointer over the list and press Cmd or Ctrl + A: all the records
are selected. The tooltip of “Select all” shows the keys.

```tsx
import {
  LIST_ACTION_GROUP,
  useRegisterActions,
} from 'datocms-react-ui/Actions';
import MultipleSelectionActionBar from 'datocms-react-ui/MultipleSelectionActionBar';
import React, { useRef, useState } from 'react';

const records = ['Home', 'About us', 'Pricing', 'Contact', 'Blog'];

export default function Records() {
  const [selection, setSelection] = useState(['Home', 'Pricing', 'Blog']);
  const ref = useRef<HTMLDivElement>(null);
  const allSelected = selection.length === records.length;

  useRegisterActions(ref, [
    {
      id: 'list.selectAll',
      name: 'Select all',
      group: LIST_ACTION_GROUP,
      shortcut: { key: 'a', mod: true },
      applicable: () => !allSelected,
      run: () => setSelection(records),
    },
    {
      id: 'list.invertSelection',
      name: 'Invert selection',
      group: LIST_ACTION_GROUP,
      shortcut: { key: 'a', mod: true, alt: true },
      run: () =>
        setSelection(records.filter((name) => !selection.includes(name))),
    },
  ]);

  return (
    // The bar is absolute: it needs a positioned parent
    <div
      ref={ref}
      style={{
        position: 'relative',
        height: 240,
        padding: 'var(--spacing-m)',
      }}
    >
      {records.map((record) => (
        <label key={record} style={{ display: 'flex', gap: 8 }}>
          <input
            type="checkbox"
            checked={selection.includes(record)}
            onChange={(event) =>
              setSelection(
                event.target.checked
                  ? [...selection, record]
                  : selection.filter((name) => name !== record),
              )
            }
          />
          {record}
        </label>
      ))}
      <MultipleSelectionActionBar
        open={selection.length > 0}
        status={`${selection.length} records selected`}
        onDeselectAll={() => setSelection([])}
        actions={[
          [
            {
              id: 'selectAll',
              label: 'Select all',
              disabled: allSelected,
              action: 'list.selectAll',
            },
            {
              id: 'invert',
              label: 'Invert selection',
              action: 'list.invertSelection',
            },
          ],
          {
            id: 'publish',
            label: 'Publish',
            tone: 'primary',
            // The button shows a spinner until the promise ends
            onClick: () =>
              new Promise<void>((resolve) => setTimeout(resolve, 1500)),
          },
          {
            id: 'destroy',
            label: 'Delete',
            tone: 'primary',
            onClick: () => setSelection([]),
          },
        ]}
      />
    </div>
  );
}
```

## Actions

The actions are buttons of two kinds:

- The **main** actions on the selection are `tone: 'primary'`, with a label
  (“Publish”, “Delete”).
- The actions that **change the selection** (“Select all”, “Invert
  selection”) have no `tone` (`plain` by default). Put them in an array,
  which makes one group of buttons that touch each other. On a small
  viewport (up to 1024px), the plain actions with no `menu` go in one ⋮
  menu, “Change the selection”, so the bar stays on one line.

An action of the registry ([`Actions`](https://react-ui.datocms.com/Actions/Actions.md)) goes in the bar with `action`, its
id, instead of `onClick`. The button runs the action and its tooltip
shows the name and the keys, as a button with `tooltip={{ action }}` does. In
the ⋮ menu, the option shows the keys. The bar finds the action of its
region, so register the actions on an element around the bar (the [`Pane`](https://react-ui.datocms.com/Layout/Pane.md)).

An `onClick` that returns a promise shows a spinner on the button until the
promise ends. Give `false`, `null` or `undefined` for an action that does
not apply: `condition && action`.

**Do:** Give the main actions a label. Use the same label as the action of a row.

```tsx
<div className="DocsBarFrame">
  <MultipleSelectionActionBar open status="2 assets selected" onDeselectAll={() => {}} actions={[{ id: 'delete', tone: 'primary', label: 'Delete', onClick: () => {} }]} />
</div>
```

**Don’t:** Do not use only an icon for an action. The bar has no tooltips for it.

```tsx
<div className="DocsBarFrame">
  <MultipleSelectionActionBar open status="2 assets selected" onDeselectAll={() => {}} actions={[{ id: 'delete', tone: 'primary', label: <DeleteIcon />, onClick: () => {} }]} />
</div>
```

## Menu and extra content

An action has `onClick` or `menu`, one of the two. An action that needs a
value from a list (the collection of the selected assets) opens a menu, not
a dialog. Give it `menu`, a [`Dropdown.Menu`](https://react-ui.datocms.com/Actions/Dropdown.md). The menu opens above the bar, so
set `placement="top-start"`. `extra` shows your own content after the
actions, for example the actions that plugins add.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import MultipleSelectionActionBar from 'datocms-react-ui/MultipleSelectionActionBar';
import React from 'react';
import { ActionToggleIcon, AssetCollectionIcon } from '@/icons';

const collections = ['Blog', 'Product photos', 'Team'];

export default function MenuAndExtra() {
  return (
    <div style={{ position: 'relative', height: 240 }}>
      <MultipleSelectionActionBar
        open
        status="4 assets selected"
        onDeselectAll={() => {}}
        actions={[
          { id: 'delete', tone: 'primary', label: 'Delete', onClick: () => {} },
          { id: 'tag', tone: 'primary', label: 'Tag', onClick: () => {} },
          {
            id: 'move',
            tone: 'primary',
            label: 'Move to collection',
            // A click on the button opens the menu, above the bar
            menu: (
              <Dropdown.Menu placement="top-start">
                {collections.map((name) => (
                  <Dropdown.Option
                    key={name}
                    icon={<AssetCollectionIcon />}
                    onPick={() => {}}
                  >
                    {name}
                  </Dropdown.Option>
                ))}
              </Dropdown.Menu>
            ),
          },
        ]}
        // Content that the caller owns, after the actions: here the menu
        // of the actions of the plugins
        extra={
          <Dropdown
            triggerComponent={Dropdown.IconTrigger}
            icon={ActionToggleIcon}
            label="Plugin actions"
          >
            <Dropdown.Menu placement="top-start">
              <Dropdown.Option onPick={() => {}}>
                Optimize images
              </Dropdown.Option>
              <Dropdown.Option onPick={() => {}}>
                Generate alt text
              </Dropdown.Option>
            </Dropdown.Menu>
          </Dropdown>
        }
      />
    </div>
  );
}
```

## MultipleSelectionActionBar props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `open` | `boolean` | Yes | | Shows the bar: give it while the selection is not empty. The bar slides in when it opens and out when it closes. |
| `status` | `Message` | Yes | | Tells how much is selected. For example "3 records selected". |
| `onDeselectAll` | `() => void` | Yes | | Runs when the user clicks the cross at the end of the bar. |
| `deselectAllAction` | `string` | No | | The id of the action of the registry that clears the selection: the tooltip of the cross shows its keys. The click still runs onDeselectAll. |
| `actions` | `(MaybeAction \| MaybeAction[])[]` | Yes | | The buttons of the bar. An array in the list gives a group of buttons that touch each other. A value that is `false`, `null` or `undefined` shows nothing: use `condition && action`. |
| `placement` | `'pane' \| 'window'` | No | `"pane"` | Where the bar floats. "pane": at the bottom of a Pane, above its footer (give the bar to the slideUpToolbar prop of the Pane). "window": at the bottom of the window, for a page with no Pane slot (the blocks of a field in a record form). |
| `extra` | `ReactNode` | No | | More content after the actions. For example the actions that plugins add. |

### Types

`MaybeAction`

```ts
export type MaybeAction = Action | false | null | undefined;
```

`Action`

```ts
export type Action = ActionBehavior & {
  /** A name that stays the same between renders. It is the React key. */
  id: string;
  /** The text of the button. */
  label: Message;
  /**
   * `primary` is a button on the brand color for the main actions on the
   * selection. `plain` is for the actions that change the selection itself
   * ("Select all", "Invert"). On a small viewport, the plain actions that
   * do not open a menu go in one menu (⋮).
   * @default "plain"
   */
  tone?: 'primary' | 'plain';
  /**
   * Fades the button and stops the click. Give a reason when the user must
   * know why.
   */
  disabled?: Disabled;
};
```

`ActionBehavior` — What a click on the button does

```ts
type ActionBehavior =
  /** Runs a function */
  | {
      /**
       * Runs on a click. When it returns a promise, the button shows a
       * spinner until the promise ends.
       */
      onClick: (() => void) | (() => Promise<void>);
      menu?: never;
      action?: never;
    }
  /**
   * Runs an action of the registry (`Actions`). The tooltip of the
   * button and the option of the ⋮ menu show its keys.
   */
  | {
      /** The id of the action */
      action: string;
      onClick?: never;
      menu?: never;
    }
  /** Opens a menu */
  | {
      /**
       * A `Dropdown.Menu` that the click opens. For example, the menu of the
       * collections where the selected assets can go.
       */
      menu: ReactNode;
      onClick?: never;
      action?: never;
    };
```

## Action props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `onClick` (variant) | `(() => void) \| (() => Promise<void>)` | No | | Runs on a click. When it returns a promise, the button shows a spinner until the promise ends. |
| `menu` (variant) | `ReactNode` | No | | A `Dropdown.Menu` that the click opens. For example, the menu of the collections where the selected assets can go. |
| `action` (variant) | `string` | No | | The id of the action |
| `id` | `string` | Yes | | A name that stays the same between renders. It is the React key. |
| `label` | `Message` | Yes | | The text of the button. |
| `tone` | `'primary' \| 'plain'` | No | `"plain"` | `primary` is a button on the brand color for the main actions on the selection. `plain` is for the actions that change the selection itself ("Select all", "Invert"). On a small viewport, the plain actions that do not open a menu go in one menu (⋮). |
| `disabled` | `Disabled` | No | | Fades the button and stops the click. Give a reason when the user must know why. |
