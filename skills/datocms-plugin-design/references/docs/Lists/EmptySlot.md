# EmptySlot

An empty field of a form: one row with a short message in the placeholder
color (“No blocks yet”, “No headers”). The actions that fill the field show
instead of the message.

| Use | For |
| - | - |
| `EmptySlot` | A field that holds objects (blocks, files, records), and every list of items in a form (key/value pairs, options, webhook triggers, workflow stages, field add-ons, permission rules). |
| The input of the field | A field that holds a value that the user types. |
| [`BlankSlate`](https://react-ui.datocms.com/Feedback/BlankSlate.md) | An area with nothing to show: a list, a page, a panel. |

```tsx
import EmptySlot from 'datocms-react-ui/EmptySlot';
import React from 'react';

export default function MessageOnly() {
  return <EmptySlot message="No rules" />;
}
```

## Actions

Give the buttons or the dropdown triggers that fill the field as
`children`. Use [`Button`](https://react-ui.datocms.com/Actions/Button.md) elements with `size="small"`: the slot makes them
smaller. They show instead of the message when the pointer is over the slot,
when an action has the focus or when its menu is open. On a touch device,
they always show.

When the actions do not fit on one line, they wrap and the slot gets taller.
A slot under a file that the user drags keeps its message. When the actions
are in another place, for example in the header of the page, give only
`message`.

Hover over the slot to see the actions.

```tsx
import Button from 'datocms-react-ui/Button';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import EmptySlot from 'datocms-react-ui/EmptySlot';
import React from 'react';
import { AddIcon } from '@/icons';

const BLOCK_MODELS = ['Text', 'Image', 'Video'];

export default function WithActions() {
  return (
    <EmptySlot message="No blocks yet">
      <Dropdown
        triggerComponent={Dropdown.ButtonTrigger}
        icon={AddIcon}
        label="Add block"
      >
        <Dropdown.Menu placement="bottom">
          {BLOCK_MODELS.map((model) => (
            <Dropdown.Option key={model} onPick={() => {}}>
              {model}
            </Dropdown.Option>
          ))}
        </Dropdown.Menu>
      </Dropdown>
      <Button label="Paste block" />
    </EmptySlot>
  );
}
```

## One action

When the field has only one action, give `action` (an `ActionOrMenu`, the
type of the `add` button of a [`CardList`](https://react-ui.datocms.com/Lists/CardList.md)). With `{ label, onClick }`, all the
slot is the button. With `{ label, options }`, the slot shows a button that
opens a menu of [`Dropdown.Option`](https://react-ui.datocms.com/Actions/Dropdown.md) elements. The icon is `AddIcon` by
default. A [`CardList`](https://react-ui.datocms.com/Lists/CardList.md) shows the slot in its `empty` prop, instead of the
card.

When the user cannot fill the field, do not give `action`: the slot then
shows only its message.

Click the slot to add a trigger, then remove it with the trash to see the
slot again.

```tsx
import CardList from 'datocms-react-ui/CardList';
import EmptySlot from 'datocms-react-ui/EmptySlot';
import React, { useState } from 'react';

export default function AsButton() {
  const [triggers, setTriggers] = useState<number[]>([]);

  const addTrigger = () => setTriggers((list) => [...list, Date.now()]);

  return (
    <CardList
      empty={
        <EmptySlot
          message="No triggers"
          action={{
            label: 'Add trigger',
            onClick: addTrigger,
          }}
        />
      }
      add={{ label: 'Add trigger', onClick: addTrigger }}
    >
      {triggers.map((id, index) => (
        <CardList.Item
          key={id}
          row={{
            summary: `Trigger ${index + 1}`,
            actions: (
              <CardList.RemoveButton
                label="Remove trigger"
                onClick={() =>
                  setTriggers((list) => list.filter((other) => other !== id))
                }
              />
            ),
          }}
        />
      ))}
    </CardList>
  );
}
```

**Do:** Show an EmptySlot with a short message, and the actions on hover.

```tsx
<EmptySlot
  message="No headers"
  action={{
    label: 'Add header',
    onClick: () => {},
  }}
/>
```

**Don’t:** Do not show a lone “Add new…” button, or a sentence in label style, for an empty list.

```tsx
<Button icon={AddIcon} label="Add new header" />
```

## Props

### EmptySlot

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `message` | `Message` | Yes | | What the field does not have, for example "No blocks yet" |
| `children` (variant) | `ReactNode` | No | | The buttons or the dropdown triggers that fill the field. Without them and without `action`, the slot shows only its message. |
| `action` (variant) | `ActionOrMenu` | No | | The action of the slot. Do not give it when the user cannot fill the field: the slot then shows only its message. |
