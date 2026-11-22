# Dropdown triggers

The button that opens a [`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md). Give it to
`triggerComponent`, and give its props to the [`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md). The [`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md)
gives `open` and `onTrigger`, so the tables below do not show them.

A trigger with a label has a chevron-down after the label. The chevron does
not turn while the menu is open.

| Trigger | Use it for |
| - | - |
| `ButtonTrigger` | A menu that looks like a button: “Export”, “New record”, the sort of a list. |
| `IconTrigger` | The “⋮” of a row, of a card or of a toolbar. |
| `TextualTrigger` | A value in a line of text. |
| `PillTrigger` | A value that shows as a pill: a role, a status. |

A main action with a caret and a menu is a [`SplitButton`](https://react-ui.datocms.com/Actions/SplitButton.md). When no trigger
has the look that you need, make a new trigger (see "New trigger" below).

## ButtonTrigger

It has the sizes of a [`Button`](https://react-ui.datocms.com/Actions/Button.md) and the tones `soft`, `ghost` and `primary`.
It has the same `iconOnly` and `tooltip` (the tooltip hides while the menu is
open). An icon-only `ButtonTrigger` has no chevron. For the “⋮”, use
`IconTrigger`.

A trigger takes its default size from its container, as a [`Button`](https://react-ui.datocms.com/Actions/Button.md) does. Do
not set the size of a trigger in your CSS. A row is as tall as its tallest
control.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import ButtonTrigger from 'datocms-react-ui/Dropdown/triggers/ButtonTrigger';
import React from 'react';
import { AddIcon } from '@/icons';

const noop = () => {};

function Menu() {
  return (
    <Dropdown.Menu>
      <Dropdown.Option onPick={noop}>First option</Dropdown.Option>
      <Dropdown.Option onPick={noop}>Second option</Dropdown.Option>
    </Dropdown.Menu>
  );
}

export default function ButtonTriggers() {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-m)' }}>
      <Dropdown triggerComponent={ButtonTrigger} label="Export">
        <Menu />
      </Dropdown>
      <Dropdown
        triggerComponent={ButtonTrigger}
        tone="primary"
        icon={AddIcon}
        label="New record"
      >
        <Menu />
      </Dropdown>
      <Dropdown triggerComponent={ButtonTrigger} tone="ghost" label="Sort">
        <Menu />
      </Dropdown>
    </div>
  );
}
```

## IconTrigger

A ghost icon-only `ButtonTrigger`. Its size is the toolbar size in a
toolbar, and `micro` elsewhere. For an action menu, the icon is
`Generic.ActionToggleIcon` (⋮). Give a `label` only when it says more than
the icon. Without a `label`, the button has the accessible name “Actions” and
no tooltip.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import IconTrigger from 'datocms-react-ui/Dropdown/triggers/IconTrigger';
import React from 'react';
import { ActionToggleIcon, EditIcon, ManageLocalesIcon } from '@/icons';

const noop = () => {};

export default function IconTriggers() {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-m)' }}>
      <Dropdown triggerComponent={IconTrigger} icon={ActionToggleIcon}>
        <Dropdown.Menu>
          <Dropdown.Option icon={<EditIcon />} onPick={noop}>
            Rename
          </Dropdown.Option>
        </Dropdown.Menu>
      </Dropdown>
      <Dropdown
        triggerComponent={IconTrigger}
        icon={ManageLocalesIcon}
        label="Manage locales"
      >
        <Dropdown.Menu>
          <Dropdown.Option onPick={noop}>Add a locale</Dropdown.Option>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}
```

## TextualTrigger

A value in a sentence that opens a menu to change it.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import TextualTrigger from 'datocms-react-ui/Dropdown/triggers/TextualTrigger';
import React, { useState } from 'react';

const PERIODS = ['7 days', '30 days', '12 months'];

export default function TextualTriggers() {
  const [period, setPeriod] = useState(PERIODS[1]);

  return (
    // The root of a Dropdown is a div, thus the sentence is not a <p>
    <div>
      The API calls of the last{' '}
      <Dropdown triggerComponent={TextualTrigger} label={period}>
        <Dropdown.Menu>
          {PERIODS.map((value) => (
            <Dropdown.Option
              key={value}
              active={value === period}
              onPick={() => setPeriod(value)}
            >
              {value}
            </Dropdown.Option>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}
```

## PillTrigger

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import PillTrigger from 'datocms-react-ui/Dropdown/triggers/PillTrigger';
import React, { useState } from 'react';

const ROLES = ['Admin', 'Editor', 'Viewer'];

export default function PillTriggers() {
  const [role, setRole] = useState(ROLES[1]);

  return (
    <Dropdown triggerComponent={PillTrigger} label={role}>
      <Dropdown.Menu>
        {ROLES.map((value) => (
          <Dropdown.Option
            key={value}
            active={value === role}
            onPick={() => setRole(value)}
          >
            {value}
          </Dropdown.Option>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
```

## Disabled triggers

`ButtonTrigger` and `IconTrigger` take `disabled`, and the menu cannot open.
Give `disabled={{ reason }}` when the user must know why. The trigger then
stays in the Tab order, and its tooltip shows the reason instead of the
label. With `interactive`, the reason has links and shows in a [`HoverCard`](https://react-ui.datocms.com/Overlays/Tooltip.md).

Hover over a trigger, or move the focus to it, to see the reason.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import ButtonTrigger from 'datocms-react-ui/Dropdown/triggers/ButtonTrigger';
import IconTrigger from 'datocms-react-ui/Dropdown/triggers/IconTrigger';
import React from 'react';
import { ActionToggleIcon } from '@/icons';

const noop = () => {};

export default function DisabledTriggers() {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-m)' }}
    >
      <Dropdown
        triggerComponent={ButtonTrigger}
        label="Unpublish"
        disabled={{ reason: 'The record is not published.' }}
      >
        <Dropdown.Menu>
          <Dropdown.Option onPick={noop}>Unpublish the record</Dropdown.Option>
        </Dropdown.Menu>
      </Dropdown>
      <Dropdown
        triggerComponent={IconTrigger}
        icon={ActionToggleIcon}
        disabled={{ reason: 'Another user is editing the record.' }}
      >
        <Dropdown.Menu>
          <Dropdown.Option onPick={noop}>Duplicate</Dropdown.Option>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}
```

## New trigger

Make a new trigger only for a new look. A trigger is a component that gets
`open` and `onTrigger` from the [`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md) (type its props with
`DropdownTriggerBaseProps` of `datocms-react-ui/Dropdown/triggers/types`). It
gets the other props from the component that renders the [`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md).

Render a `DropdownTriggerButton` and give it `open` and `onTrigger` as they
are. It connects the button to the menu: the ID, the mouse and keyboard
events and the ARIA attributes. Give the look with `className` and
`children`, and put a [`MenuChevron`](https://react-ui.datocms.com/Navigation/Chevron.md) (`datocms-react-ui/Chevron`) after the
label. The other props (`aria-label`, `style`) go to the button.
`disabled` takes a reason, as it does on `ButtonTrigger`.

- Do not handle the keys, the ID or the ARIA attributes in your trigger.
  `DropdownTriggerButton` does it.
- Do not give `DropdownTriggerButton` the look of a [`Button`](https://react-ui.datocms.com/Actions/Button.md). A trigger that
  looks like a button is `ButtonTrigger`.
- The dropdowns of an editor toolbar use [`EditorToolbar.Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md).

```tsx
import { MenuChevron } from 'datocms-react-ui/Chevron';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import DropdownTriggerButton from 'datocms-react-ui/Dropdown/triggers/DropdownTriggerButton';
import { type DropdownTriggerBaseProps } from 'datocms-react-ui/Dropdown/triggers/types';
import React, { useState } from 'react';

type Color = { name: string; value: string };

const COLORS: Color[] = [
  { name: 'Coral', value: '#f2705b' },
  { name: 'Sky', value: '#4aa3df' },
  { name: 'Moss', value: '#6a9a3d' },
];

type ColorTriggerProps = DropdownTriggerBaseProps & { color: Color };

function Swatch({ color }: { color: Color }) {
  return (
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: 'var(--radius-xs)',
        background: color.value,
      }}
    />
  );
}

// A trigger with a new look: the swatch of the color before its name. Your
// plugin can give the look with a class of its own CSS in place of style.
function ColorTrigger({ open, onTrigger, color }: ColorTriggerProps) {
  return (
    <DropdownTriggerButton
      open={open}
      onTrigger={onTrigger}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--spacing-s)',
        padding: 'var(--spacing-s) var(--spacing-m)',
        border: '1px solid var(--color--border-control)',
        borderRadius: 'var(--radius-s)',
      }}
    >
      <Swatch color={color} />
      <span>{color.name}</span>
      <MenuChevron />
    </DropdownTriggerButton>
  );
}

export default function CustomTrigger() {
  const [color, setColor] = useState(COLORS[0]);

  return (
    <Dropdown triggerComponent={ColorTrigger} color={color}>
      <Dropdown.Menu>
        {COLORS.map((option) => (
          <Dropdown.Option
            key={option.name}
            active={option.name === color.name}
            onPick={() => setColor(option)}
          >
            {option.name}
          </Dropdown.Option>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
```

## Accessibility

The menu opens on mouse down, and on Enter, Space or ArrowDown from the
keyboard.

## Props

### ButtonTrigger

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `tone` | `Extract<ButtonTone, 'soft' \| 'ghost' \| 'primary'>` | No | `"soft"` | The look of the button |
| `size` | `ButtonSize` | No | | The default size: "milli" in a toolbar, "small" out of a toolbar (see useButtonSize) |
| `expand` | `boolean` | No | | The button fills the width of its container |
| `disabled` | `Disabled` | No | | The menu cannot open. Give a reason when the user must know why. It replaces the tooltip. |
| `tooltip` | `Message \| false \| null \| ActionTooltipOptions` | No | | The tooltip of the button (the label for an icon-only button), or the name and the keys of an action (see Button). It does not show while the menu is open: the menu is in its place. |
| `className` | `string` | No | | Only for the position of the button, not for its look |
| `label` | `Message \| TextMessage` | Yes | | WithLabel: The text of the button<br>IconOnly: The accessible name of the button and the text of its tooltip |
| `icon` | `SvgIcon` | No | | The icon before the label |
| `iconOnly` | `boolean` | No | | Shows only the icon |

### IconTrigger

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `icon` | `SvgIcon` | Yes | | The icon. For a menu of actions, it is Generic.ActionToggleIcon (⋮). |
| `label` | `TextMessage` | No | | The accessible name of the button and the text of its tooltip. If you do not give a label, the button gets the generic name "Actions" and no tooltip, because "Actions" says nothing that the "⋮" does not say. |
| `size` | `ButtonSize` | No | | The default size in a toolbar, "micro" outside a toolbar |
| `disabled` | `Disabled` | No | | The menu cannot open. Give a reason when the user must know why. It replaces the tooltip. |
| `className` | `string` | No | | Only for the position or the surface of the button (for example on a media card) |

### TextualTrigger

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `icon` | `SvgIcon` | No | | The icon before the label |
| `label` | `Message` | No | | The text of the trigger |

### PillTrigger

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` | `Message` | Yes | | The value that shows in the pill |
| `tone` | `PillTone` | No | | The color of the pill (see Pill) |
| `icon` | `React.ReactNode` | No | | An icon before the value, as the `icon` of Pill |
| `triggerClassName` | `string` | No | | A class that changes the look of the pill in a context (for example the target of a rule, with the shape of the verdict at its side) |

### DropdownTriggerButton

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `open` | `boolean` | Yes | | The menu is open. Dropdown gives it. |
| `onTrigger` | `(event: SyntheticEvent) => void` | Yes | | Opens or closes the menu. Dropdown gives it. |
| `disabled` | `Disabled` | No | | The menu cannot open. With a reason, the button keeps the focus and its tooltip says why. |

Also accepts:

- all of `AriaAttributes`
- `form`, `formAction`, `formEncType`, `formMethod`, `formNoValidate`, `formTarget`, `name`, `value` (from `ButtonHTMLAttributes`)
- all of `DOMAttributes`
- all of `HTMLAttributes`
