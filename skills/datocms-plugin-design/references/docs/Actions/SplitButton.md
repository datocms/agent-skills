# SplitButton

The main action of a page or a dialog, and a caret that opens a menu with the
variants of the same action: Publish, then “Publish only some locales” and
“Schedule publication”. A click on the main half runs the main action. The
caret opens the menu.

Other components for other cases:

- Actions that are not variants of the main action (Duplicate, Delete) go in
  the “⋮” of an [`IconTrigger`](https://react-ui.datocms.com/Actions/DropdownTriggers.md), next to the button.
- The main action at the right end of a [`Toolbar`](https://react-ui.datocms.com/Layout/Toolbar.md) is [`Toolbar.PrimaryButton`](https://react-ui.datocms.com/Layout/Toolbar.md).
  It renders a `SplitButton` when it has more than one action.
- A button that only opens a menu is a [`ButtonTrigger`](https://react-ui.datocms.com/Actions/DropdownTriggers.md).
- When there are no variants, render a [`Button`](https://react-ui.datocms.com/Actions/Button.md). A `SplitButton` always shows
  its caret, even with an empty menu.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import SplitButton from 'datocms-react-ui/SplitButton';
import React from 'react';
import { CalendarIcon, ManageLocalesIcon } from '@/icons';

const noop = () => {};

export default function Publish() {
  return (
    <SplitButton
      tone="primary"
      label="Publish"
      onClick={noop}
      menu={{ ariaLabel: 'More publishing options' }}
    >
      <Dropdown.Option icon={<ManageLocalesIcon />} onPick={noop}>
        Publish only some locales
      </Dropdown.Option>
      <Dropdown.Option icon={<CalendarIcon />} onPick={noop}>
        Schedule publication
      </Dropdown.Option>
    </SplitButton>
  );
}
```

## The main half

The main half is a [`Button`](https://react-ui.datocms.com/Actions/Button.md), with its label, icon, action and states: the
same `onClick`, `to`, `href` or `submit`, the same `busy` and `tooltip`.
The label names the main action. The menu does not change it.

**Do:** The label is the main action. The caret shows that there are more ways to do it.

```tsx
<SplitButton tone="primary" label="Publish" menu={{ ariaLabel: 'More publishing options' }}>
  <Dropdown.Option>Schedule publication</Dropdown.Option>
</SplitButton>
```

**Don’t:** Do not name the menu in the label: a click on the main half must do what the label says.

```tsx
<SplitButton tone="primary" label="Publishing options" menu={{ ariaLabel: 'More publishing options' }}>
  <Dropdown.Option>Schedule publication</Dropdown.Option>
</SplitButton>
```

## Tones and sizes

Two tones: `primary` for the main action of the page or the dialog, and
`soft` for a secondary action. The caret takes the tone and the size of the
main half. The default size comes from the container, as for a [`Button`](https://react-ui.datocms.com/Actions/Button.md). Do
not give a size in a toolbar.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import SplitButton from 'datocms-react-ui/SplitButton';
import React from 'react';
import { AddIcon } from '@/icons';

const noop = () => {};

export default function Tones() {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-m)' }}>
      <SplitButton tone="primary" label="Save" onClick={noop} menu={{}}>
        <Dropdown.Option onPick={noop}>Save and duplicate</Dropdown.Option>
        <Dropdown.Option onPick={noop}>Save and add another</Dropdown.Option>
      </SplitButton>
      <SplitButton
        label="Upload"
        icon={AddIcon}
        onClick={noop}
        menu={{ ariaLabel: 'Upload from another source' }}
      >
        <Dropdown.Option onPick={noop}>From a URL</Dropdown.Option>
        <Dropdown.Option onPick={noop}>From a stock library</Dropdown.Option>
      </SplitButton>
    </div>
  );
}
```

## The menu

`children` is the content of the menu: [`Dropdown.Option`](https://react-ui.datocms.com/Actions/Dropdown.md), and
[`Dropdown.Separator`](https://react-ui.datocms.com/Actions/Dropdown.md) or [`Dropdown.Group`](https://react-ui.datocms.com/Actions/Dropdown.md) when the menu is long. The options
follow the rules of a menu of actions (see [`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md)): an icon for every
option of a group or for no option. The menu opens below the caret, at its
right edge. `menu.placement` changes it.

The caret has no text, so it needs an accessible name. The default is
“More actions”. Give a `menu.ariaLabel` that says what the menu has
(“More publishing options”), because a screen reader user hears it without
the context of the label.

## Disabled

`disabled` disables only the main half: the variants in the menu can still
be available (a role that can publish only some locales). Give a reason, so
that the user knows why. `menu.disabled` disables the caret, and it takes a
reason too. Disable each option that is not available in the option itself.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import SplitButton from 'datocms-react-ui/SplitButton';
import React from 'react';

const noop = () => {};

export default function Disabled() {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-m)' }}>
      <SplitButton
        tone="primary"
        label="Publish"
        disabled={{
          reason: 'You can publish only the locales of your role',
        }}
        menu={{ ariaLabel: 'More publishing options' }}
      >
        <Dropdown.Option onPick={noop}>
          Publish only some locales
        </Dropdown.Option>
      </SplitButton>
      <SplitButton
        tone="primary"
        label="Publish"
        disabled={{ reason: 'The record has no changes to publish' }}
        menu={{
          ariaLabel: 'More publishing options',
          disabled: { reason: 'The record has no changes to publish' },
        }}
      >
        <Dropdown.Option onPick={noop}>
          Publish only some locales
        </Dropdown.Option>
      </SplitButton>
    </div>
  );
}
```

## SplitButton props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `tone` | `Extract<ButtonTone, 'primary' \| 'soft'>` | No | `"soft"` | The look of the two halves |
| `size` | `ButtonSize` | No | | The size of the two halves. The default size is "milli" in a toolbar and "small" out of a toolbar (see useButtonSize). |
| `disabled` | `ButtonProps['disabled']` | No | | The main half is disabled. The caret stays usable: set "menu.disabled" to disable it too. Give a reason when the user must know why. |
| `className` | `string` | No | | Only for the position of the split button, not for its look |
| `menu` | `SplitButtonMenu` | No | | The caret and its menu |
| `children` | `ReactNode` | Yes | | The content of the menu: Dropdown.Option, Dropdown.Separator and the other parts of a Dropdown.Menu |
| `label` | `Message \| TextMessage` | Yes | | WithLabel: The text of the button<br>IconOnly: The accessible name of the button and the text of its tooltip |
| `icon` | `SvgIcon` | No | | The icon before the label |
| `iconOnly` | `boolean` | No | | Shows only the icon |
| `trailing` (variant) | `ReactNode` | No | | Content after the label (for example a "PRO" pill) |
| `tooltip` | `ActionTooltipOptions \| Message \| TooltipOptions` | No | | The text of the tooltip, when it is not the label (for example the reason why the button is disabled), or the options of the tooltip |
| `busy` (variant) | `boolean` | No | | The action runs: the button shows a spinner instead of the icon (before the label when there is no icon), and it is disabled. An "onClick" that returns a promise sets it automatically. |
| `pressed` (variant) | `boolean` | No | | The state of a toggle button (for example the filter toggle). Only the soft and the ghost tones show it: a toggle is never the main action. |
| `onClick` (variant) | `ClickHandler` | No | | |
| `to` (variant) | `string` | No | | The page of DatoCMS: the path with its query, for example "/editor?tab=x" |
| `href` (variant) | `string` | No | | |
| `submit` (variant) | `true` | No | | |
| `newTab` (variant) | `boolean` | No | | Opens the page in a new tab (for example from a modal, to keep it open)<br>Opens the page in a new tab (for example the docs) |

### Types

`SplitButtonMenu` — The caret and the menu of the other actions

```ts
export type SplitButtonMenu = {
  /**
   * The accessible name of the caret. Tell what the menu has, for example
   * "More publishing options".
   * @default "More actions"
   */
  ariaLabel?: TextMessage;
  /**
   * The side of the caret where the menu opens
   * @default "bottom-end"
   */
  placement?: Placement;
  /**
   * The caret cannot open the menu. Give a reason when the user must know
   * why.
   */
  disabled?: Disabled;
};
```
