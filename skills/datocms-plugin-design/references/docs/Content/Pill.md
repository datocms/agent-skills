# Pill

A small label with round ends: the status of an item, a tag, a count or a
reference to another item. The label has no margin and takes no
`className`. Its container sets the space around it and its position.

| Use | For |
| - | - |
| `Pill` | A short label next to a title or a value: “Disabled”, “PRO”, “3 add-ons”, a tag. |
| [`Callout`](https://react-ui.datocms.com/Feedback/Callout.md) | A message about the current data, in a sentence. |
| [`FeedbackDot`](https://react-ui.datocms.com/Content/Status.md) and a label ([Status](https://react-ui.datocms.com/Content/Status.md)) | The state of a row in a list: a dot is calmer than a pill. |
| [`Dropdown.PillTrigger`](https://react-ui.datocms.com/Actions/DropdownTriggers.md) | A pill that opens a menu to change its value. |

There is no `Badge`. A status label ("In use", "Enterprise feature", the
primary or sandbox environment) is a pill too. A monospaced code value
(`.chip`) is a different thing, so do not replace it with a pill.

## Tones

The tone says how much attention the pill needs. Most pills are
`neutral`.

| Tone | Use it for |
| - | - |
| `neutral` | The default. A fact about the item: “Template”, “Disabled”, “4 rules”. |
| `accent` | A fact that must get attention: “Update available”, “PRO”. |
| `soft` | A tag, or a reference to another item in a text. |
| `danger` | The status of a problem: “Unpaid”, “Project deactivated”. |
| `warning` | The status of a risk. |
| `success` | A good status: “Paid”, “Active”. |

```tsx
import Pill from 'datocms-react-ui/Pill';
import React from 'react';

export default function Tones() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-s)' }}>
      <Pill>Disabled</Pill>
      <Pill tone="accent">PRO</Pill>
      <Pill tone="soft">Marketing</Pill>
      <Pill tone="danger">Unpaid</Pill>
      <Pill tone="warning">Past due</Pill>
      <Pill tone="success">Paid</Pill>
    </div>
  );
}
```

**Do:** Use the neutral tone for most pills, and a strong tone only for a status that matters.

```tsx
<div style={{ display: 'flex', gap: 'var(--spacing-s)' }}>
  <Pill>Template</Pill>
  <Pill tone="danger">Unpaid</Pill>
</div>
```

**Don’t:** Do not give a tone to each pill, because when all are loud, none gets attention.

```tsx
<div style={{ display: 'flex', gap: 'var(--spacing-s)' }}>
  <Pill tone="accent">Template</Pill>
  <Pill tone="danger">Collaborator</Pill>
  <Pill tone="success">Private</Pill>
</div>
```

## Next to a title

Give the pills as the `afterTitle` of a row. The row sets the space
between them.

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import Pill from 'datocms-react-ui/Pill';
import React from 'react';

export default function NextToTitle() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-s)' }}>
      <EntityRow
        layout="row"
        title="Product page"
        afterTitle={<Pill>Template</Pill>}
      />
      <EntityRow
        layout="row"
        title="Blog"
        afterTitle={
          <>
            <Pill tone="danger">Project deactivated</Pill>
            <Pill>Collaborator</Pill>
          </>
        }
      />
    </div>
  );
}
```

## Icon

Give `icon` when a symbol says the same thing as the text, for example the
icon of a model or of an environment.

```tsx
import Pill from 'datocms-react-ui/Pill';
import React from 'react';
import {
  ClockIcon,
  ModelIcon,
  PrimaryEnvironmentIcon,
  SandboxEnvironmentIcon,
} from '@/icons';

export default function WithIcon() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-s)' }}>
      <Pill tone="soft" icon={<PrimaryEnvironmentIcon />}>
        Primary
      </Pill>
      <Pill tone="soft" icon={<SandboxEnvironmentIcon />}>
        Sandbox
      </Pill>
      <Pill icon={<ModelIcon />}>Blog post</Pill>
      <Pill tone="accent" icon={<ClockIcon />}>
        Scheduled
      </Pill>
    </div>
  );
}
```

## Tooltip

Give `tooltip` for a hint about the pill, for example what a short label
means. The tooltip opens on hover and on keyboard focus, so a static pill
with a tooltip takes the focus. Do not wrap the pill in a [`Tooltip`](https://react-ui.datocms.com/Overlays/Tooltip.md) and a
`span`.

```tsx
import Pill from 'datocms-react-ui/Pill';
import React from 'react';

export default function WithTooltip() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-s)' }}>
      <Pill tone="soft" tooltip="The app connects through the MCP server">
        MCP
      </Pill>
      <Pill tooltip="The app runs on your computer">Local</Pill>
    </div>
  );
}
```

## Link and button

Give `to` for a pill that opens a page, or `onClick` for a pill that runs an
action, for example one that sets a filter. A static pill is a `span`.

A clickable pill keeps its round ends, because it is a tag, not a button.
The hover color shows the action. This is the one exception to the rule
that a button is not fully round.

```tsx
import Pill from 'datocms-react-ui/Pill';
import React, { useState } from 'react';
import { ModelIcon } from '@/icons';

export default function Clickable() {
  const [filter, setFilter] = useState<string | null>(null);

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-m)' }}>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-s)' }}
      >
        <Pill to="#blog-post" icon={<ModelIcon />}>
          Blog post
        </Pill>
        {['marketing', 'launch', 'social'].map((tag) => (
          <Pill key={tag} tone="soft" onClick={() => setFilter(tag)}>
            {tag}
          </Pill>
        ))}
      </div>
      <div>{filter ? `Filter: tag contains “${filter}”` : 'No filter'}</div>
    </div>
  );
}
```

## Menu trigger

Use [`Dropdown.PillTrigger`](https://react-ui.datocms.com/Actions/DropdownTriggers.md) for a pill that opens a menu. It takes the
`tone` and the `icon` of a pill, and adds a [`MenuChevron`](https://react-ui.datocms.com/Navigation/Chevron.md) after the label.
It is not a `Pill`, because a trigger must be the button of the menu. The
two share only their classes.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import React, { useState } from 'react';
import { ModelIcon } from '@/icons';

const MODELS = ['Article', 'Author', 'Category'];

export default function MenuTrigger() {
  const [model, setModel] = useState(MODELS[0]);

  return (
    <Dropdown
      triggerComponent={Dropdown.PillTrigger}
      label={model}
      icon={<ModelIcon />}
    >
      <Dropdown.Menu placement="bottom-start">
        {MODELS.map((value) => (
          <Dropdown.Option
            key={value}
            active={value === model}
            onPick={() => setModel(value)}
          >
            {value}
          </Dropdown.Option>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
```

**Do:** Use a pill for a short label.

```tsx
<EntityRow layout="row" title="Blog" afterTitle={<Pill>Disabled</Pill>} />
```

**Don’t:** Do not use a pill for a long sentence, because it gets an ellipsis. Use a Callout.

```tsx
<div style={{ maxWidth: 200 }}>
  <Pill>This plugin was not updated for two years</Pill>
</div>
```

## Props

### Pill

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `tone` | `PillTone` | No | `'neutral'` | The color of the pill. "neutral" is grey, for a fact about the item. "accent" is the primary color, for a fact that must get attention. "soft" is the light primary color, for a tag or for a reference to another item in a text. "danger" and "warning" are the soft red and amber, for the status of a problem (for example the status of a Page.Group with a tone). "success" is the soft green, for a status that is good (for example "Paid", "Active"). |
| `icon` | `React.ReactNode` | No | | An icon before the text, for example a model icon |
| `tooltip` | `Message` | No | | A hint in a tooltip, on hover and on keyboard focus. A static pill with a tooltip takes the focus, so the keyboard can reach the hint. |
| `children` | `React.ReactNode` | Yes | | The text of the pill. Keep it short: a long text gets an ellipsis. |
| `to` (variant) | `string` | No | | The URL or the path that the pill opens, for example "/schema" |
| `onClick` (variant) | `(event: React.MouseEvent<HTMLButtonElement>) => void` | No | | Runs when the user clicks the pill, for example to filter a list |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

`PillAction`

| Variant | Props | Description |
| - | - | - |
| `LinkPill` | `to` | A pill that opens a page. It is a link. |
| `ButtonPill` | `onClick` | A pill that runs an action. It is a button. |
| `StaticPill` | | A pill that only shows a fact. The user cannot click it. |

#### Types

`PillTone` — The color of a pill

```ts
export type PillTone =
  | 'neutral'
  | 'accent'
  | 'soft'
  | 'danger'
  | 'warning'
  | 'success';
```
