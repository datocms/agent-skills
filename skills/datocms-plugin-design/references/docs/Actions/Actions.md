# Actions

An action is a thing that the user can do, with a name and, if it has them,
keys. A component registers its actions with `useRegisterActions`. The
buttons, the menus and the keys run the same action by its id, and they
show the same name and the same keys. [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md) mounts an `ActionsProvider`
once at the root.

| Use | For |
| - | - |
| `useRegisterActions(actions)` | The actions of a page, on while the component is mounted. |
| `useRegisterActions(actions, { level: 'app' })` | The app-level actions, on in every page. |
| `useRegisterActions(ref, actions)` | The actions of a region (a row, a pane), on while the pointer or the focus is in it. |
| [`Button`](https://react-ui.datocms.com/Actions/Button.md) with `tooltip={{ action }}` | A button that shows the name and the keys of an action. |
| [`Dropdown.Option`](https://react-ui.datocms.com/Actions/Dropdown.md) with `action` | An option that runs an action and shows its keys. It is disabled while the action gives a reason, or when the action does not exist now. |
| `Shortcut` | The keys of an action, or keys with no action, in a text. |
| `useAction(id)` | The name, the keys and the state of an action. |
| `useRunAction()` | A function that runs an action by its id. |
| `useActiveActions()` | The actions that work now, grouped by level. |
| `useRegisteredActions()` | One action for each id, with the ones that work now first. |
| `useReadPaletteActions()` | A function that reads the actions for a command palette. |

## Register an action

An action has an `id`, a `name` (a `TextMessage`), a `run` function and,
if it has them, its `shortcut`. A letter, a digit or a sign matches the
character that the keyboard layout of the user types: on an Italian keyboard,
`/` is Shift + 7, and Cmd + "-" stays the zoom out of the browser. A layout
that types other letters (Cyrillic, Greek) uses the keys at the positions of a
US keyboard. With `alt`, or with `shift` on a digit or a sign, the shortcut
uses the keys at the positions of a US keyboard, because these modifiers
change the character. `mod` is Cmd on a Mac and Ctrl on the other systems.

Press Cmd or Ctrl + S: the counter goes up. The tooltip of the button shows
the name and the keys of the action.

```tsx
import { Shortcut, useRegisterActions } from 'datocms-react-ui/Actions';
import Button from 'datocms-react-ui/Button';
import React, { useState } from 'react';

export default function Register() {
  const [saved, setSaved] = useState(0);
  const save = () => setSaved((count) => count + 1);

  useRegisterActions([
    {
      id: 'save',
      name: 'Save record',
      shortcut: { key: 's', mod: true, runWithInputFocus: true },
      run: save,
    },
  ]);

  return (
    <div
      style={{ display: 'flex', gap: 'var(--spacing-m)', alignItems: 'center' }}
    >
      <Button
        tone="primary"
        label="Save"
        onClick={save}
        tooltip={{ action: 'save', placement: 'bottom' }}
      />
      <span>
        Saved {saved} times. Press <Shortcut action="save" />.
      </span>
    </div>
  );
}
```

`group` (an `id` and a `name`) puts the actions of one area together in a
list of the keys ("Records", "Lists"). An action with no group is in
`GENERAL_ACTION_GROUP`. The actions of a list (the filter, the selection)
are in `LIST_ACTION_GROUP`.

The registry reads the action when the user presses the keys, not when the
component registers it. So `run`, `applicable` and `disabledReason` see
the last render. When `applicable` returns `false`, the keys do nothing and
the button and the menu do not show them. When `disabledReason` returns a
text, the action does not run and the user sees the text.

## Regions

A region is an element with its own actions, for example a row. Its actions
are on while the pointer is on it or the focus is in it. A region wins over
the page level, and the page level wins over the app level. In two nested
regions, the inner one wins.

A menu in a region runs the action of its region, even when the pointer is
on another row. Each row registers the same ids, and the ⋮ of a row runs the
action of that row. When the action of the row does not apply, the option
runs nothing. A menu outside the regions, such as the ⋮ of the panel of the
open row, runs the action of the page level.

A row of [`Table`](https://react-ui.datocms.com/Lists/Table.md) takes its actions as `actions` (see the Table page).

Move the pointer over a row and press F: only that row gets the star. Or
pick “Star” in the ⋮ of a row.

```tsx
import { Shortcut, useRegisterActions } from 'datocms-react-ui/Actions';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import IconTrigger from 'datocms-react-ui/Dropdown/triggers/IconTrigger';
import React, { useRef, useState } from 'react';
import { ActionToggleIcon } from '@/icons';

const ROWS = ['Spring launch', 'Summer sale', 'Autumn recap'];

function Row({
  title,
  onStar,
  starred,
}: {
  title: string;
  onStar: () => void;
  starred: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);

  useRegisterActions(ref, [
    {
      id: 'star',
      name: starred ? 'Remove the star' : 'Star',
      shortcut: { key: 'f' },
      run: onStar,
    },
  ]);

  return (
    <li
      ref={ref}
      tabIndex={0}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--spacing-s) var(--spacing-m)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-m)',
      }}
    >
      <span>
        {starred ? '★' : '☆'} {title}
      </span>
      <Dropdown
        triggerComponent={IconTrigger}
        icon={ActionToggleIcon}
        label={title}
      >
        <Dropdown.Menu placement="bottom-end">
          <Dropdown.Option action="star">
            {starred ? 'Remove the star' : 'Star'}
          </Dropdown.Option>
        </Dropdown.Menu>
      </Dropdown>
    </li>
  );
}

export default function Region() {
  const [starred, setStarred] = useState<string[]>([]);
  const toggle = (title: string) =>
    setStarred((current) =>
      current.includes(title)
        ? current.filter((other) => other !== title)
        : [...current, title],
    );

  return (
    <div>
      <p>
        Move the pointer on a row, or focus it, and press{' '}
        <Shortcut keys={{ key: 'f' }} />. The menu of a row runs the action of
        its row.
      </p>
      <ul
        style={{
          display: 'grid',
          gap: 'var(--spacing-s)',
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {ROWS.map((title) => (
          <Row
            key={title}
            title={title}
            starred={starred.includes(title)}
            onStar={() => toggle(title)}
          />
        ))}
      </ul>
    </div>
  );
}
```

## Sequences

A sequence is two keys with no modifier, one after the other, in less than
1.2 seconds (`{ key: ['g', 's'] }`). A sequence does not work in a text
field.

Press G, then S.

```tsx
import { Shortcut, useRegisterActions } from 'datocms-react-ui/Actions';
import React, { useState } from 'react';

const PAGES = [
  { key: 's', title: 'Settings' },
  { key: 'm', title: 'Media' },
] as const;

export default function Sequence() {
  const [current, setCurrent] = useState('Content');

  useRegisterActions(
    PAGES.map((page) => ({
      id: `go-to-${page.key}`,
      name: `Go to ${page.title}`,
      shortcut: { key: ['g', page.key] as const },
      run: () => setCurrent(page.title),
    })),
  );

  return (
    <div>
      <p>
        Press <Shortcut action="go-to-s" /> or <Shortcut action="go-to-m" />.
      </p>
      <p role="status">Current page: {current}</p>
    </div>
  );
}
```

## Menus

[`Dropdown.Option`](https://react-ui.datocms.com/Actions/Dropdown.md) with `action` runs the action and shows its keys at the end
of the option. The `source` of `run` says where the user started it: `key`
or `menu`. The option is disabled while `disabledReason` gives a reason, and
the reason is its tooltip. An option of an action that does not exist now (not
registered, or not `applicable`) is disabled too.

```tsx
import { useRegisterActions } from 'datocms-react-ui/Actions';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import IconTrigger from 'datocms-react-ui/Dropdown/triggers/IconTrigger';
import React, { useState } from 'react';
import { ActionToggleIcon, DuplicateIcon, EditIcon } from '@/icons';

export default function Menu() {
  const [log, setLog] = useState('Nothing yet');

  useRegisterActions([
    {
      id: 'rename',
      name: 'Rename',
      shortcut: { key: 'r' },
      run: ({ source }) => setLog(`Rename, from the ${source}`),
    },
    {
      id: 'duplicate',
      name: 'Duplicate',
      shortcut: { key: 'd', mod: true, shift: true },
      run: ({ source }) => setLog(`Duplicate, from the ${source}`),
    },
  ]);

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-m)' }}
    >
      <span style={{ flex: 1 }} role="status">
        {log}
      </span>
      <Dropdown triggerComponent={IconTrigger} icon={ActionToggleIcon}>
        <Dropdown.Menu placement="bottom-end">
          <Dropdown.Option icon={<EditIcon />} action="rename">
            Rename
          </Dropdown.Option>
          <Dropdown.Option icon={<DuplicateIcon />} action="duplicate">
            Duplicate
          </Dropdown.Option>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}
```

## Text fields

While the focus is in a text field, a key types a character. So only the
actions with `runWithInputFocus` run there, and they need `mod`. The other
actions work again when the focus leaves the field.

Type a message and press Cmd or Ctrl + Enter. In the field, X types the
letter. Outside the field, X clears the list.

```tsx
import { Shortcut, useRegisterActions } from 'datocms-react-ui/Actions';
import React, { useState } from 'react';

export default function InputFocus() {
  const [text, setText] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const [cleared, setCleared] = useState(0);

  useRegisterActions([
    {
      id: 'send',
      name: 'Send',
      shortcut: { key: 'enter', mod: true, runWithInputFocus: true },
      applicable: () => text.trim() !== '',
      run: () => {
        setSent((current) => [...current, text]);
        setText('');
      },
    },
    {
      id: 'clear-sent',
      name: 'Clear the sent messages',
      shortcut: { key: 'x' },
      run: () => {
        setSent([]);
        setCleared((count) => count + 1);
      },
    },
  ]);

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-s)' }}>
      <label htmlFor="actions-input-focus">
        Message (<Shortcut action="send" /> sends it)
      </label>
      <input
        id="actions-input-focus"
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <p role="status">
        Sent: {sent.length === 0 ? 'nothing' : sent.join(', ')}. Cleared{' '}
        {cleared} times (press <Shortcut action="clear-sent" /> out of the
        field).
      </p>
    </div>
  );
}
```

## Keys from a frame

The keys in an iframe do not reach the page. A frame can send its keys to
the page, and the page dispatches them on the iframe with
`data-actions-frame` (`text-field` when the key comes from a text field of
the frame). The code of the frame can send any key, so such a key runs
only the app-level actions and an Escape that closes a layer, never an
action of the page level or of a region.

## A component that handles the keys first

The registry listens on the page, after the components. When a component
uses the keys and calls `preventDefault` (a text editor, a menu), the action
does not run. Call `stopPropagation` only when the page must not see the
key at all.

In the editor, Cmd or Ctrl + Shift + S strikes the text and does not
publish. Outside the editor, the same keys publish.

```tsx
import { Shortcut, useRegisterActions } from 'datocms-react-ui/Actions';
import React, { type KeyboardEvent, useState } from 'react';

const isStrikeKeys = (event: KeyboardEvent) =>
  (event.metaKey || event.ctrlKey) && event.shiftKey && event.code === 'KeyS';

export default function HandledFirst() {
  const [published, setPublished] = useState(0);
  const [struck, setStruck] = useState(false);

  useRegisterActions([
    {
      id: 'publish',
      name: 'Publish',
      shortcut: { key: 's', mod: true, shift: true, runWithInputFocus: true },
      run: () => setPublished((count) => count + 1),
    },
  ]);

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-s)' }}>
      <label htmlFor="actions-handled-first">
        Editor (<Shortcut action="publish" /> strikes the text here)
      </label>
      <textarea
        id="actions-handled-first"
        style={{ textDecoration: struck ? 'line-through' : undefined }}
        onKeyDown={(event) => {
          if (!isStrikeKeys(event)) return;
          // The editor uses the keys: the action of the page does not run
          event.preventDefault();
          setStruck((current) => !current);
        }}
      />
      <p role="status">
        Published {published} times. Strike is {struck ? 'on' : 'off'}.
      </p>
    </div>
  );
}
```

## Dialogs and popovers

[`Modal`](https://react-ui.datocms.com/Overlays/Modal.md), [`FullscreenModal`](https://react-ui.datocms.com/Overlays/Modal.md), `Confirm`, [`Popover`](https://react-ui.datocms.com/Overlays/Overlay.md) and the menu of a
[`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md) are layers. While a dialog is open, the actions under it do not
run. A popover or a menu stops the actions of the page level and of the
regions, and the app-level actions stay on. A dialog with its own [`Main`](https://react-ui.datocms.com/Layout/Landmarks.md) is a
page in a dialog (the project settings of DatoCMS). It also keeps the
app-level actions on. A dialog that opens later is on top. An action with `layerSafe`
runs under every layer.

The `actions` of an `ActionLayer` are the actions of the layer itself, for
example Escape that closes it: they run while the layer is on top. A layer
that stays in the page while it closes (an animation) gives
`active={false}`, so the keys under it work again at once.

## The command palette

A command palette lists the actions that work now and runs them. Four props
of an action change how the palette shows it.

| Prop | Effect |
| - | - |
| `icon` | The icon of the row. An action with no icon shows the `icon` of its group. Give an icon to the group, and to an action whose menu row has an icon of its own. |
| `parent` | The group of the page or of the action in the navigation of DatoCMS, for example "Usage" for "By project". The row of the palette and of the list of the shortcuts shows it muted before the name, and the search finds the action with it. Give it when the name is not clear without its menu group. |
| `keywords` | More words that find the action in the search. |
| `palette` | `'listed'` (the default): the action shows in the list and in the search. `'searchOnly'`: the action shows only when the search finds it. Use it for a long list, for example the settings pages. `'hidden'`: the action does not show. Use it for a key that only makes sense as a key, for example Escape that closes a pane. |

`useReadPaletteActions()` gives a function that reads the active actions,
the winner first. Call it before the palette opens: the dialog of the
palette turns off the actions under it. The `run` of each action runs the
last render of the action, and does nothing when its component is not
mounted.

## Keys that the registry refuses

The browser keeps some keys, or the system uses them, so the page never
gets them. The registry refuses them: in development it throws an error, in
production it writes a warning and the keys do nothing.

| Keys | Reason |
| - | - |
| mod+N, mod+T, mod+W | The browser opens or closes a window or a tab. |
| mod+Shift+N, mod+Shift+T | The browser opens a private window or a closed tab again. |
| Alt + a letter | Windows opens the menu bar. Alt+Shift + a letter is accepted. |
| A key with no `mod` and `runWithInputFocus` | The key types a character in the field. |

**Do:** Register the action once, and give its id to the button and to the menu: they show the same name and the same keys.

`action="save"`

**Don’t:** Do not write the keys again in a tooltip or in a label: they get out of date.

`label="Save (Cmd+S)"`

## Show the keys

`Shortcut` draws the keys: ⌘ ⇧ ⌥ on a Mac, Ctrl Shift Alt on the other
systems. "then" separates the keys of a sequence, and "or" the alternatives.
A screen reader reads the names of the keys.

## Shortcut props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `action` (variant) | `string` | No | | The id of the action. Without keys, nothing shows. |
| `keys` (variant) | `ActionShortcut \| ActionShortcut[]` | No | | The keys, or a list of alternatives |
