# CardList

Things that the user opens, edits, removes or reorders, in one card: the
rules of a role, the triggers of a webhook, the editor and the add-ons of a
field, the limits of a plan.

| Use | For |
| - | - |
| `CardList` | Things with actions. |
| [`InfoList`](https://react-ui.datocms.com/Lists/InfoList.md) | Facts to read. |
| [`SettingsList`](https://react-ui.datocms.com/Lists/SettingsList.md) | The settings of a wide page. |
| [`Table`](https://react-ui.datocms.com/Lists/Table.md) | Many elements with the same columns, to scan and sort. |

The items are `CardList.Item` elements. They must be direct children of the
card, or come from components that return `CardList.Item` elements. The
card does not memoize them, so memoize the components that make the items.

## Items, add and remove

An item has a `row`: the `summary` (a sentence, an [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md)), an
optional `trailing` part (the state of the item) and the `actions`. The
actions of all the items are in one column, as wide as a micro icon button,
so the icon buttons align. `CardList.RemoveButton` is the trash button
that removes an item.

The `trailing` part never takes more than half of the width that the
summary and the trailing part share: a long pill ends with an ellipsis, and
the summary keeps its place. The pills in `trailing` share its width in
equal parts.

`CardList.Item` gives its other props and its ref to its `li`. Put it in a
[`Tooltip`](https://react-ui.datocms.com/Overlays/Tooltip.md) for a tooltip on the whole row.

A row is a strip with a small inset, for a summary on one line. A row whose
summary is an [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md) with `layout="row"` on two lines (with details or
a kicker) is an item of a list, and gets the inset of the other lists. The
CSS does it, so do not add padding by hand. Do not write the `CardList__*`
classes by hand.

`add` is the button in the footer of the card, an `ActionOrMenu` (the type
of the `action` of an [`EmptySlot`](https://react-ui.datocms.com/Lists/EmptySlot.md)). With `onClick`, it adds an item at once.
The icon is `Generic.AddIcon` by default.

When the card has no items, `empty` shows instead of the card: an
[`EmptySlot`](https://react-ui.datocms.com/Lists/EmptySlot.md) with the same action. Remove the two triggers below to see it.

```tsx
import CardList from 'datocms-react-ui/CardList';
import EmptySlot from 'datocms-react-ui/EmptySlot';
import React, { useState } from 'react';

type Trigger = { id: number; entity: string; events: string };

const INITIAL: Trigger[] = [
  { id: 1, entity: 'Record', events: 'create, update' },
  { id: 2, entity: 'Asset', events: 'delete' },
];

export default function Triggers() {
  const [triggers, setTriggers] = useState(INITIAL);
  const [nextId, setNextId] = useState(3);

  const addTrigger = () => {
    setTriggers([
      ...triggers,
      { id: nextId, entity: 'Record', events: 'publish' },
    ]);
    setNextId(nextId + 1);
  };

  return (
    <CardList
      empty={
        <EmptySlot
          message="The webhook has no triggers."
          action={{
            label: 'Add trigger',
            onClick: addTrigger,
          }}
        />
      }
      add={{ label: 'Add trigger', onClick: addTrigger }}
    >
      {triggers.map((trigger) => (
        <CardList.Item
          key={trigger.id}
          row={{
            summary: (
              <>
                When a <strong>{trigger.entity}</strong> gets{' '}
                <strong>{trigger.events}</strong>
              </>
            ),
            actions: (
              <CardList.RemoveButton
                label="Remove trigger"
                onClick={() =>
                  setTriggers(triggers.filter(({ id }) => id !== trigger.id))
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

## Items that open

With `expandable`, a click on the row opens the `body` of the item under
it, for example the fields of a rule. The summary is in the disclosure
button, so it must not have links or buttons. A `body` without `expandable`
always shows.

With `options`, the add button opens a menu with the kinds of item to add.

By default, the actions of an item show only when the pointer or the focus
is on the item, when its menu is open or when the item is open. On devices
without a pointer, they always show.

```tsx
import CardList from 'datocms-react-ui/CardList';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import IconTrigger from 'datocms-react-ui/Dropdown/triggers/IconTrigger';
import Pill from 'datocms-react-ui/Pill';
import React, { useState } from 'react';
import { ActionToggleIcon, DeleteIcon } from '@/icons';

type Rule = { id: number; action: string; scope: string };

const KINDS = ['Read', 'Edit', 'Publish'];

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([
    { id: 1, action: 'Edit', scope: 'all the records of Article' },
    { id: 2, action: 'Publish', scope: 'the records that they created' },
  ]);
  const [openId, setOpenId] = useState<number | null>(1);

  const addRule = (action: string) => {
    const id = Math.max(0, ...rules.map((rule) => rule.id)) + 1;
    setRules([...rules, { id, action, scope: 'all the records' }]);
    setOpenId(id);
  };

  return (
    <CardList
      add={{
        label: 'Add rule',
        options: KINDS.map((kind) => (
          <Dropdown.Option key={kind} onPick={() => addRule(kind)}>
            {kind}
          </Dropdown.Option>
        )),
      }}
    >
      {rules.map((rule) => (
        <CardList.Item
          key={rule.id}
          row={{
            summary: (
              <>
                Can <strong>{rule.action.toLowerCase()}</strong> {rule.scope}
              </>
            ),
            trailing: <Pill>Allowed</Pill>,
            actions: (
              <Dropdown triggerComponent={IconTrigger} icon={ActionToggleIcon}>
                <Dropdown.Menu>
                  <Dropdown.Option
                    icon={<DeleteIcon />}
                    alert={true}
                    onPick={() =>
                      setRules(rules.filter(({ id }) => id !== rule.id))
                    }
                  >
                    Delete
                  </Dropdown.Option>
                </Dropdown.Menu>
              </Dropdown>
            ),
          }}
          expandable={{
            open: openId === rule.id,
            onToggle: () => setOpenId(openId === rule.id ? null : rule.id),
            body: <p>The fields that change the rule go here.</p>,
          }}
        />
      ))}
    </CardList>
  );
}
```

## Header

`header` is a strip above the items, with the entity of the items. It has
these parts:

- `image`: the icon of a model or of a plugin.
- `title`.
- `aside`, in the subtle ink: an API key.
- `trailing`: counters.

With `collapse`, the header opens and closes the card. The title, the aside
and the trailing part share the width in equal parts, as the parts of the
title line of an [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md). A short title stays whole next to a long API
key.

```tsx
import CardList from 'datocms-react-ui/CardList';
import Pill from 'datocms-react-ui/Pill';
import React, { useState } from 'react';
import { ModelIcon } from '@/icons';

export default function Header() {
  const [open, setOpen] = useState(true);

  return (
    <CardList
      header={{
        image: <ModelIcon />,
        title: 'Article',
        aside: <code>article</code>,
        trailing: <Pill>2 rules</Pill>,
        collapse: { open, onToggle: () => setOpen(!open) },
      }}
    >
      <CardList.Item
        row={{
          summary: (
            <>
              Can <strong>edit</strong> all the records
            </>
          ),
        }}
      />
      <CardList.Item
        row={{
          summary: (
            <>
              Can <strong>publish</strong> the records that they created
            </>
          ),
        }}
      />
    </CardList>
  );
}
```

## Read-only list

In a list that the user only reads (the limits of a plan), the actions are
the only way to go further. `actionsVisibility="always"` shows them on all
the items. The row under the pointer gets the hover surface, so the eye
follows a row to its value at the end. Do not override the opacity of the
actions in your CSS.

```tsx
import CardList from 'datocms-react-ui/CardList';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import IconTrigger from 'datocms-react-ui/Dropdown/triggers/IconTrigger';
import FeedbackDot from 'datocms-react-ui/FeedbackDot';
import React from 'react';
import { ActionToggleIcon, ChartPieIcon } from '@/icons';

const LIMITS = [
  { name: 'Records', usage: '1,204 / 10,000', over: false },
  { name: 'Asset storage', usage: '62 GB / 50 GB', over: true },
];

export default function ReadOnly() {
  return (
    <CardList header={{ title: 'Fixed limits' }} actionsVisibility="always">
      {LIMITS.map((limit) => (
        <CardList.Item
          key={limit.name}
          row={{
            summary: (
              <>
                <FeedbackDot tone={limit.over ? 'warning' : 'success'} />
                {limit.name}
              </>
            ),
            trailing: limit.usage,
            actions: (
              <Dropdown triggerComponent={IconTrigger} icon={ActionToggleIcon}>
                <Dropdown.Menu>
                  <Dropdown.Option
                    icon={<ChartPieIcon />}
                    onPick={() => undefined}
                  >
                    Usage by project
                  </Dropdown.Option>
                </Dropdown.Menu>
              </Dropdown>
            ),
          }}
        />
      ))}
    </CardList>
  );
}
```

## Item without a row

An item can be only a `body`, for example the only editor of a field.

```tsx
import CardList from 'datocms-react-ui/CardList';
import React from 'react';

export default function BodyOnly() {
  return (
    <CardList>
      <CardList.Item
        body={
          <p>
            The editor of the field: its settings, without a row above them.
          </p>
        }
      />
    </CardList>
  );
}
```

## CSS variables

## CSS variables

The variables are on the card. Read them in the content of an item, for
example to put a part of your own in line with the text of the rows.

- `--CardList-inset`: The space at the sides of the header and of the rows. The text of the rows starts at this inset.
- `--CardList-body-inset`: The padding of the body of an item. It is larger than the inset of the rows, as the body of a block of a record.

## Props

### CardList

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `header` | `CardListHeader` | No | | A strip above the items, with the entity of the items |
| `add` | `ActionOrMenu` | No | | The button that adds an item, in the footer of the card |
| `empty` | `ReactNode` | No | | Shows instead of the card when the card has no items (for example an EmptySlot with the button that adds the first item) |
| `actionsVisibility` | `'hover' \| 'always'` | No | | When the actions of the items show. With `hover`, they show only when the pointer or the focus is on the item, when its menu is open or when the item is open (on devices without a pointer, always). Use `always` in a list that the user only reads: the actions are the only way to go further, and the row under the pointer gets the hover surface. |
| `className` | `string` | No | | |
| `id` | `string` | No | | |
| `children` | `ReactNode` | No | | The CardList.Item elements |

#### Types

`CardListHeader`

```ts
export type CardListHeader = {
  /** The icon of the entity of the items (a model, a plugin) */
  image?: ReactNode;
  /** The name of the entity of the items */
  title: Message;
  /** A short note after the title, in the subtle ink (for example an API key) */
  aside?: Message;
  /** The content at the end of the header (for example counters) */
  trailing?: ReactNode;
  /**
   * Only for a card that opens and closes. When the card is closed, it
   * shows only its header. Without `onToggle`, the card cannot close (for
   * example, it shows an error) and the chevron is disabled.
   */
  collapse?: { open: boolean; onToggle?: () => void };
};
```

### header

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `image` | `ReactNode` | No | | The icon of the entity of the items (a model, a plugin) |
| `title` | `Message` | Yes | | The name of the entity of the items |
| `aside` | `Message` | No | | A short note after the title, in the subtle ink (for example an API key) |
| `trailing` | `ReactNode` | No | | The content at the end of the header (for example counters) |
| `collapse` | `{ open: boolean; onToggle?: () => void }` | No | | Only for a card that opens and closes. When the card is closed, it shows only its header. Without `onToggle`, the card cannot close (for example, it shows an error) and the chevron is disabled. |

### CardList.Item

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `className` | `string` | No | | |
| `row` (variant) | `CardListRow` | No | | |
| `body` (variant) | `ReactNode` | No | | ItemWithRow: Shows below the row (for example the fields of the item)<br>ItemWithoutRow: The content of the item |
| `expandable` (variant) | `CardListExpandable` | No | | |

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

Group 1

| Variant | Props | Description |
| - | - | - |
| `ItemWithRow` | `row`, `body` | A row, with an optional body that always shows |
| `ExpandableItem` | `row`, `expandable` | A row that opens and closes the body |
| `ItemWithoutRow` | `body` | Only a body, without a row (for example the only item of a field) |

#### Types

`CardListRow`

```ts
export type CardListRow = {
  /**
   * The content of the row: a sentence, an EntityRow. In an item that opens
   * and closes, it is in the disclosure button: it must not have links or
   * buttons.
   */
  summary: ReactNode;
  /** The content after the summary (for example the state of a rule) */
  trailing?: ReactNode;
  /**
   * The actions of the item (an icon button, a menu, a "Change" button).
   * They go in a column with the width of a micro icon button at least,
   * so the icon actions of all the items align.
   */
  actions?: ReactNode;
};
```

`CardListExpandable`

```ts
export type CardListExpandable = {
  /** The body shows */
  open: boolean;
  /** Runs on a click on the row or on its disclosure button */
  onToggle: () => void;
  /** Shows below the row when the item is open */
  body: ReactNode;
};
```

### row

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `summary` | `ReactNode` | Yes | | The content of the row: a sentence, an EntityRow. In an item that opens and closes, it is in the disclosure button: it must not have links or buttons. |
| `trailing` | `ReactNode` | No | | The content after the summary (for example the state of a rule) |
| `actions` | `ReactNode` | No | | The actions of the item (an icon button, a menu, a "Change" button). They go in a column with the width of a micro icon button at least, so the icon actions of all the items align. |

### expandable

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `open` | `boolean` | Yes | | The body shows |
| `onToggle` | `() => void` | Yes | | Runs on a click on the row or on its disclosure button |
| `body` | `ReactNode` | Yes | | Shows below the row when the item is open |

### CardList.RemoveButton

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` | `TextMessage` | Yes | | The accessible name and the tooltip, for example "Remove trigger" |
| `onClick` | `() => void` | Yes | | |
