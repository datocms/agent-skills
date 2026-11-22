# Button

A button, or a link that looks like a button. Do not write the `.button`
classes by hand.

Other components for other cases:

- A dropdown trigger that looks like a button is [`ButtonTrigger`](https://react-ui.datocms.com/Actions/DropdownTriggers.md)
  (`datocms-react-ui/Dropdown/triggers/ButtonTrigger`). The “⋯” of a row, a card or a
  toolbar is [`IconTrigger`](https://react-ui.datocms.com/Actions/DropdownTriggers.md).
- A plain button in a [`Toolbar`](https://react-ui.datocms.com/Layout/Toolbar.md) is `Toolbar.Button`. It is ghost by default.
- A value in a line of text that a click changes or copies is an inline
  ghost button (`button--ghost-inline`), not a `Button`. See “Inline value
  buttons” below.
- A button with its own look (a row, a chip, a tab, a toggle) is a
  `RawButton`. See “Buttons with their own look” below.

## Tones

| Tone | Use it for |
| - | - |
| `primary` | The main action of the page or the dialog: Save, Create, Publish. |
| `soft` | The default. A secondary action that must read as a button. |
| `ghost` | A quiet action: Cancel, the icon buttons of a row, the actions next to a value. |
| `alert` | A destructive action that is the main action of the dialog (the confirm of a delete). |
| `ghost-alert` | A destructive action that must stay quiet: the trash of a row (icon only), the action of a “Danger zone” row. |
| `overlay` | An action on a colored bar: the buttons of the navigation bar, the actions of a floating bar. It has a light translucent fill. |
| `on-primary` | The main action on a brand color (the selection action bar, the bar of the demo project). It is white in all the themes. |

Hover over “Delete account”. `ghost-alert` is red only on hover and on keyboard focus.

```tsx
import Button from 'datocms-react-ui/Button';
import React from 'react';

const noop = () => {};

export default function Tones() {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-m)' }}
    >
      <Button tone="primary" label="Save" onClick={noop} />
      <Button label="Duplicate" onClick={noop} />
      <Button tone="alert" label="Delete project" onClick={noop} />
      <Button tone="ghost" label="Cancel" onClick={noop} />
      <Button tone="ghost-alert" label="Delete account" onClick={noop} />
      {/* The colored bar of the two last tones */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--spacing-s)',
          padding: 'var(--spacing-s)',
          background: 'var(--color--primary--surface)',
          borderRadius: 'var(--radius-m)',
        }}
      >
        <Button tone="on-primary" label="Publish" onClick={noop} />
        <Button tone="overlay" label="Select all" onClick={noop} />
      </div>
    </div>
  );
}
```

On a colored surface (a warning, a floating bar, the backdrop of a modal),
a ghost button uses the ink of that surface. Set these variables on the
element with the colored surface. Do not write the hover, focus and active
rules of the button again.

| Variable | Sets |
| - | - |
| `--button-ghost-ink` | The text and the icon at rest. |
| `--button-ghost-hover-ink` | The text and the icon on hover and focus. |
| `--button-ghost-hover-surface` | The surface on hover and focus, and while the button is pressed or its menu is open. |
| `--button-ghost-active-surface` | The surface while the pointer is down. |
| `--button-ghost-pressed-ink` | The text and the icon while the button is pressed or its menu is open. |

## Sizes

A button takes its default size from its container: `milli` in a toolbar,
`field` in a toolbar of fields, `small` elsewhere. Give a `size` only when
you need a different one.

Do not set the icon size. The icon is `1em` of the text. If the icon is too
big or too small, change the size of the button.

```tsx
import Button, { ButtonSize } from 'datocms-react-ui/Button';
import React from 'react';

const sizes: ButtonSize[] = [
  'micro',
  'milli',
  'small',
  'field',
  'regular',
  'large',
];

const noop = () => {};

export default function Sizes() {
  return (
    <div
      style={{ display: 'flex', gap: 'var(--spacing-m)', alignItems: 'center' }}
    >
      {sizes.map((size) => (
        <Button key={size} size={size} label={size} onClick={noop} />
      ))}
    </div>
  );
}
```

A container sets the size of its buttons with `ButtonSizeContext`.

```tsx
import Button, { ButtonSizeContext } from 'datocms-react-ui/Button';
import React from 'react';

const noop = () => {};

// The place gives the size: a Toolbar gives "micro", a Toolbar of fields
// gives "field". The buttons in the place do not set a size.
export default function SizeFromPlace() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--spacing-xl)',
        alignItems: 'center',
      }}
    >
      <Button label="Small (the default)" onClick={noop} />
      <ButtonSizeContext.Provider value="micro">
        <Button label="micro, from the place" onClick={noop} />
      </ButtonSizeContext.Provider>
    </div>
  );
}
```

## Icon and label

`label` is a `Message` (`datocms-react-ui/Message`): a plain string,
`{ id, values }` for a translation, `{ html }` or a React element.

`trailing` shows content after the label, for example a pill.

```tsx
import Button from 'datocms-react-ui/Button';
import Pill from 'datocms-react-ui/Pill';
import React from 'react';
import { AddIcon, EditIcon } from '@/icons';

const noop = () => {};

export default function WithIcon() {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-m)' }}>
      <Button icon={AddIcon} label="New record" onClick={noop} />
      <Button tone="ghost" icon={EditIcon} label="Rename" onClick={noop} />
      <Button
        label="Workflows"
        trailing={<Pill tone="accent">PRO</Pill>}
        onClick={noop}
      />
    </div>
  );
}
```

A button is never wider than its container, and its label does not wrap. A
long label ends with an ellipsis. The icon, the trailing content, the chevron
of a [`ButtonTrigger`](https://react-ui.datocms.com/Actions/DropdownTriggers.md) and the caret of a [`SplitButton`](https://react-ui.datocms.com/Actions/SplitButton.md) stay visible.

Give the button a short label. Do not use the button width to fit a
sentence.

The column is 240px wide. The labels end with an ellipsis, and the caret
and the chevron stay in the column.

```tsx
import Button from 'datocms-react-ui/Button';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import ButtonTrigger from 'datocms-react-ui/Dropdown/triggers/ButtonTrigger';
import SplitButton from 'datocms-react-ui/SplitButton';
import React from 'react';
import { AddIcon } from '@/icons';

const noop = () => {};

export default function LongLabel() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-m)',
        alignItems: 'flex-start',
        width: 240,
      }}
    >
      <SplitButton
        tone="primary"
        label="Alle ausgewählten Datensätze veröffentlichen"
        onClick={noop}
        menu={{ ariaLabel: 'Weitere Optionen' }}
      >
        <Dropdown.Option onPick={noop}>Veröffentlichung planen</Dropdown.Option>
      </SplitButton>
      <Button
        icon={AddIcon}
        label="Neuen Datensatz zum Modell hinzufügen"
        onClick={noop}
      />
      <Dropdown
        triggerComponent={ButtonTrigger}
        label="Nach dem Datum der letzten Änderung sortieren"
      >
        <Dropdown.Menu>
          <Dropdown.Option onPick={noop}>Neueste zuerst</Dropdown.Option>
          <Dropdown.Option onPick={noop}>Älteste zuerst</Dropdown.Option>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}
```

## Icon only

A button with only an icon is a ghost button, `micro` or the size that its
container needs. For an icon button that must be more visible (the “+” that
adds a filter), use the soft tone. The icons of “close” and “add” are bold:
`CloseIcon` and `AddIcon`.

Do not make a new class with its own hover, padding or icon color. A class
of your own sets only the position of the button (margin, alignment), not
its look.

The `label` is also the tooltip text, so do not put the button in a
[`Tooltip`](https://react-ui.datocms.com/Overlays/Tooltip.md). Give `tooltip` when the tooltip must say more than the label:

| `tooltip` | Shows |
| - | - |
| A `Message` | A text that is not the label. |
| `{ content, long, placement }` | A long text. |
| `{ content, interactive: true }` | A text that the user can select. It shows in a [`HoverCard`](https://react-ui.datocms.com/Overlays/Tooltip.md). |
| `{ action, placement }` | The keys of an action (see the Actions page). |

The placement is `top` by default, and the tooltip goes below when there is
no space above. A button without an action (only a tooltip, or disabled)
needs no `onClick`.

Hover over a button to see its tooltip. “Duplicate” shows the keys of its
action, with `tooltip={{ action: 'duplicate' }}`. A `Button` has no prop
for keys written by hand.

```tsx
import { useRegisterActions } from 'datocms-react-ui/Actions';
import Button from 'datocms-react-ui/Button';
import React from 'react';
import { AddIcon, DeleteIcon, DuplicateIcon, EditIcon } from '@/icons';

const noop = () => {};

export default function IconOnly() {
  useRegisterActions([
    {
      id: 'duplicate',
      name: 'Duplicate',
      shortcut: { key: 'd', mod: true },
      run: noop,
    },
  ]);

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-s)' }}>
      <Button
        tone="ghost"
        size="micro"
        iconOnly={true}
        icon={EditIcon}
        label="Edit"
        onClick={noop}
      />
      {/* The tooltip shows the keys of the action */}
      <Button
        tone="ghost"
        size="micro"
        iconOnly={true}
        icon={DuplicateIcon}
        label="Duplicate"
        tooltip={{ action: 'duplicate' }}
        onClick={noop}
      />
      <Button
        tone="ghost-alert"
        size="micro"
        iconOnly={true}
        icon={DeleteIcon}
        label="Delete"
        onClick={noop}
      />
      <Button
        size="micro"
        iconOnly={true}
        icon={AddIcon}
        label="Add a filter"
        onClick={noop}
      />
    </div>
  );
}
```

**Do:** Use the trash, with the ghost-alert tone, to delete an item that the user made: it becomes red only on hover.

```tsx
<Button tone="ghost-alert" size="micro" iconOnly={true} icon={DeleteIcon} label="Delete the rule" />
```

**Don’t:** Do not make an icon button red at rest: a list with many rows becomes noisy.

```tsx
<Button tone="alert" size="micro" iconOnly={true} icon={DeleteIcon} label="Delete the rule" />
```

**Do:** Use the cross to close, dismiss or clear a value.

```tsx
<Button tone="ghost" size="micro" iconOnly={true} icon={CloseIcon} label="Clear the filter" />
```

**Don’t:** Do not use the cross to delete.

```tsx
<Button tone="ghost" size="micro" iconOnly={true} icon={CloseIcon} label="Delete the rule" />
```

**Do:** “Back” is a chevron.

```tsx
<Button tone="ghost" size="micro" iconOnly={true} icon={ChevronLeftIcon} label="Back" />
```

**Don’t:** Do not use the cross to go back.

```tsx
<Button tone="ghost" size="micro" iconOnly={true} icon={CloseIcon} label="Back" />
```

**Do:** The corners of a button use --radius-s or --radius-m.

```tsx
<Button size="micro" iconOnly={true} icon={AddIcon} label="Add" />
```

**Don’t:** Do not make a fully rounded button. The exceptions are a clickable Pill, which stays a tag, and the audio play button.

```tsx
<button type="button" className="button button--micro button--icon-only" style={{ borderRadius: 'var(--radius-full)' }} aria-label="Add">
  <AddIcon />
</button>
```

## States

### Busy

An `onClick` that returns a promise makes the button busy until the promise
settles: it shows a spinner and it is disabled. `busy` does the same for an
action that the button does not start.

The spinner replaces the icon, so a button with an icon keeps its width. A
button without an icon shows the spinner before the label.

### Disabled

A disabled button keeps the colors of its tone and fades to
`--disabled-opacity`. A busy button does not fade.

A disabled button that must say why gets `disabled={{ reason }}`. It keeps
the focus and the hover (`aria-disabled`), and its tooltip shows the reason,
to keyboard and screen reader users too. Add `interactive: true` when the
reason has links. Do not put a disabled button in a [`Tooltip`](https://react-ui.datocms.com/Overlays/Tooltip.md), and do not
fake a disabled button with a `div`.

### Pressed

`pressed` is the state of a toggle. A toggle is a soft or a ghost button:

- A soft button that is on looks like a selected row: the selected surface
  with a brand border.
- A ghost button that is on keeps its hover surface, with the link ink. A
  ghost trigger with its menu open looks the same.

The other tones do not show the state. A primary button is the main action,
not a toggle.

A link (`to`, `href`) takes no `busy` and no `pressed`, because a link
cannot show them.

```tsx
import Button from 'datocms-react-ui/Button';
import React, { useState } from 'react';

const noop = () => {};

// An "onClick" that returns a promise makes the button busy until the
// promise settles
function save() {
  return new Promise((resolve) => setTimeout(resolve, 2000));
}

export default function States() {
  const [showDrafts, setShowDrafts] = useState(true);

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-m)' }}>
      <Button tone="primary" label="Save (click me)" onClick={save} />
      <Button label="Busy" busy={true} onClick={noop} />
      <Button label="Disabled" disabled={true} onClick={noop} />
      <Button
        tone="primary"
        label="Publish"
        disabled={{ reason: 'Fix the 2 invalid fields first.' }}
        onClick={noop}
      />
      <Button
        label="Show drafts"
        pressed={showDrafts}
        onClick={() => setShowDrafts(!showDrafts)}
      />
    </div>
  );
}
```

The table shows every look of `.button`, including the looks that only the
other components use.

```tsx
import SegmentedControl from 'datocms-react-ui/SegmentedControl';
import Spinner from 'datocms-react-ui/Spinner';
import React from 'react';
import { ActionToggleIcon, AddIcon, DeleteIcon } from '@/icons';

// Every look of ".button" in the enabled, disabled and busy states, and a
// button group. With "aria-disabled", the button keeps the focus and its
// tooltip.

type Variant = {
  name: string;
  className: string;
  label?: string;
  icon?: React.ReactNode;
  // The button shows on the brand color, as in the FloatingBar
  onBrand?: boolean;
  // The button can wait for its action (it shows a spinner)
  canBeBusy?: boolean;
};

const variants: Variant[] = [
  {
    name: 'Primary',
    className: 'button button--small button--primary',
    label: 'Save',
    canBeBusy: true,
  },
  {
    name: 'Soft (the bare class)',
    className: 'button button--small',
    label: 'Duplicate',
    canBeBusy: true,
  },
  {
    name: 'Alert',
    className: 'button button--small button--alert',
    label: 'Delete',
    canBeBusy: true,
  },
  {
    name: 'Soft with icon',
    className: 'button button--small',
    label: 'Add new',
    icon: <AddIcon />,
  },
  {
    name: 'Ghost',
    className: 'button button--small button--ghost',
    label: 'Cancel',
  },
  {
    name: 'Ghost icon',
    className: 'button button--micro button--icon-only button--ghost',
    icon: <ActionToggleIcon />,
  },
  {
    name: 'Ghost alert icon',
    className: 'button button--micro button--icon-only button--ghost-alert',
    icon: <DeleteIcon />,
  },
  {
    name: 'Soft icon',
    className: 'button button--micro button--icon-only',
    icon: <AddIcon />,
  },
  {
    name: 'Inline ghost',
    className: 'button--ghost-inline',
    label: 'A value',
  },
  {
    name: 'On primary (tone "on-primary")',
    className: 'button button--micro button--on-primary',
    label: 'Publish',
    onBrand: true,
  },
  {
    name: 'Overlay (tone "overlay")',
    className: 'button button--micro button--rev',
    label: 'Unpublish',
    onBrand: true,
  },
  {
    name: 'Ghost on the brand color',
    className: 'button button--micro button--ghost',
    label: 'Clear',
    onBrand: true,
  },
];

const styles = {
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  } as React.CSSProperties,
  headCell: {
    padding: 'var(--spacing-s) var(--spacing-m)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-regular)',
    color: 'var(--color--ink-subtle)',
  } as React.CSSProperties,
  nameCell: {
    padding: 'var(--spacing-m)',
    fontSize: 'var(--font-size-m)',
    color: 'var(--color--ink-subtle)',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  cell: {
    padding: 'var(--spacing-m)',
  } as React.CSSProperties,
  // Only the surface of the FloatingBar: the bar sets the colors of the
  // buttons on the brand color
  brandCell: {
    display: 'inline-flex',
  } as React.CSSProperties,
  groupRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-m)',
  } as React.CSSProperties,
};

const columns = ['Enabled', 'disabled', 'aria-disabled', 'Busy'] as const;

type Column = (typeof columns)[number];

function renderButton(variant: Variant, column: Column) {
  if (column === 'Busy' && !variant.canBeBusy) {
    return null;
  }

  const busy = column === 'Busy';

  const button = (
    <button
      type="button"
      className={variant.className}
      disabled={column === 'disabled' || busy}
      aria-disabled={column === 'aria-disabled' || undefined}
      aria-busy={busy || undefined}
      aria-label={variant.label ? undefined : variant.name}
    >
      {variant.icon}
      {variant.label && <span>{variant.label}</span>}
      {busy && <Spinner inline={true} label={false} />}
    </button>
  );

  if (!variant.onBrand) {
    return button;
  }

  return (
    <div className="FloatingBar" style={styles.brandCell}>
      {button}
    </div>
  );
}

const groupOptions = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const;

const noop = () => {};

export default function DisabledMatrix() {
  return (
    <div style={styles.groupRow}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.headCell} aria-label="Type" />
            {columns.map((column) => (
              <th key={column} style={styles.headCell}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => (
            <tr key={variant.name}>
              <td style={styles.nameCell}>{variant.name}</td>
              {columns.map((column) => (
                <td key={column} style={styles.cell}>
                  {renderButton(variant, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <SegmentedControl
        ariaLabel="Enabled"
        options={groupOptions}
        value="week"
        onChange={noop}
      />
      <SegmentedControl
        ariaLabel="Disabled"
        options={groupOptions}
        value="week"
        onChange={noop}
        disabled={true}
      />
    </div>
  );
}
```

## Links

`to` makes a link to a page of DatoCMS, and `href` a link to another site.
`newTab` opens the page in a new tab. Use it for the docs, or for a page
that must keep a modal open.

A link in a sentence stays a link. A button is for an action.

```tsx
import Button from 'datocms-react-ui/Button';
import React from 'react';
import { OpenInNewTabIcon } from '@/icons';

export default function Links() {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-m)' }}>
      <Button tone="primary" label="Go to Settings" to="/Actions/Button" />
      <Button
        tone="ghost"
        icon={OpenInNewTabIcon}
        label="Read the docs"
        href="https://www.datocms.com/docs"
        newTab={true}
      />
    </div>
  );
}
```

## Inline value buttons

A value in a line of text or in an info row that a click changes or copies
is an inline ghost button: the class `button--ghost-inline`, alone, without
`button`. The value keeps the ink and the position of the read-only values
around it, and a ghost surface shows on hover and on keyboard focus.
[`TextualTrigger`](https://react-ui.datocms.com/Actions/DropdownTriggers.md) and [`CopyableId`](https://react-ui.datocms.com/Content/CopyableValues.md) have it already. Do not copy the CSS of
the surface into a class of your own.

A value that the user can change shows a [`MenuChevron`](https://react-ui.datocms.com/Navigation/Chevron.md) after it. Do not put
a pencil icon next to the value. A link to another page stays a link,
because the surface is only for an action on the value.

Do not clip the button. The surface is larger than the box of the button,
so put `overflow: hidden` on a child (the text), not on the button or on a
parent that is as large as the button.

## Buttons with their own look

A button that does not look like `.button` (a row, a chip, a tab, a toggle)
is a `RawButton` (`datocms-react-ui/RawButton`), not a bare `<button>`. It
has no look: you draw it with a class. It sets the parts of a button that
the keyboard and the screen reader need:

- **The type.** It is `button`, so the button never submits its form by
  accident. Give `submit` for a submit button.
- **The state.** `pressed` for a toggle, `expandable={{ open, controls }}`
  for a button that opens and closes content, `tab` for a tab of a tablist,
  `radio` for an option of a radio group. A button has only one of them.
- **The disabled mode.** `disabled` removes the button from the Tab order.
  `disabled="focusable"` keeps the focus and blocks the click. Use it when
  the user must find out why the button is disabled.

Click “Show drafts” and “Advanced settings”. “Archived” keeps the focus, but the click does nothing.

```tsx
import { DisclosureChevron } from 'datocms-react-ui/Chevron';
import RawButton from 'datocms-react-ui/RawButton';
import React, { useState } from 'react';

const chip: React.CSSProperties = {
  padding: '0 var(--spacing-m)',
  border: '1px solid',
  borderColor: 'var(--color--border-control)',
  borderRadius: 'var(--radius-s)',
  background: 'var(--color--surface)',
  color: 'var(--color--ink)',
  lineHeight: '28px',
};

const onChip: React.CSSProperties = {
  ...chip,
  borderColor: 'var(--color--primary-soft--border)',
  background: 'var(--color--primary-soft--surface)',
};

const disclosure: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-s)',
  padding: 0,
  border: 0,
  background: 'none',
  color: 'var(--color--ink)',
};

// The examples use inline styles. A real caller draws the button with a
// class of its block.
export default function RawButtonStates() {
  const [drafts, setDrafts] = useState(true);
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-l)' }}>
      <div style={{ display: 'flex', gap: 'var(--spacing-s)' }}>
        {/* A toggle: pressed sets aria-pressed */}
        <RawButton
          style={drafts ? onChip : chip}
          pressed={drafts}
          onClick={() => setDrafts(!drafts)}
        >
          Show drafts
        </RawButton>
        {/* It keeps the focus, and the click does nothing */}
        <RawButton
          style={{ ...chip, opacity: 'var(--disabled-opacity)' }}
          disabled="focusable"
          onClick={() => {}}
        >
          Archived
        </RawButton>
      </div>
      <div>
        {/* expandable sets aria-expanded and aria-controls */}
        <RawButton
          style={disclosure}
          expandable={{ open, controls: 'raw-button-details' }}
          onClick={() => setOpen(!open)}
        >
          <DisclosureChevron open={open} />
          Advanced settings
        </RawButton>
        <div id="raw-button-details" hidden={!open}>
          The content that the button opens and closes.
        </div>
      </div>
    </div>
  );
}
```

## Accessibility

The name of a `Button` is its `label`. The label of an icon-only button is
a `TextMessage` (a string or `{ id, values }`), because it goes in
`aria-label`. A long label that ends with an ellipsis stays the full
accessible name.

The name of a `RawButton` comes from one of three places:

- Its text. Give no `ariaLabel`.
- `ariaLabel`, for a button with only an icon.
- `ariaLabelledBy`, with the ids of the other visible elements that give
  the name (the title of a row).

A name that is not the visible text must start with that text (WCAG 2.5.3).
In development, a `RawButton` with no name logs a warning.

A screen reader reads “Edit Home page” and “Delete Home page”.

```tsx
import RawButton from 'datocms-react-ui/RawButton';
import React from 'react';
import { DeleteIcon, EditIcon } from '@/icons';

const iconButton: React.CSSProperties = {
  display: 'inline-flex',
  padding: 'var(--spacing-s)',
  border: 0,
  borderRadius: 'var(--radius-s)',
  background: 'none',
  color: 'var(--color--ink)',
};

export default function RawButtonNames() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-s)',
      }}
    >
      <span id="raw-button-row-title">Home page</span>
      {/* A button with only an icon needs ariaLabel */}
      <RawButton style={iconButton} ariaLabel="Edit Home page">
        <EditIcon />
      </RawButton>
      {/* The name is "Delete Home page": the text of the button and the title of the row */}
      <RawButton
        id="raw-button-delete"
        style={{ ...iconButton, gap: 'var(--spacing-s)' }}
        ariaLabelledBy="raw-button-delete raw-button-row-title"
      >
        <DeleteIcon />
        Delete
      </RawButton>
    </div>
  );
}
```

Run the action of a `RawButton` on `onClick`, not on mouse down, so the user
can cancel a click (WCAG 2.5.2).

