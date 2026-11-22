# Tooltip

A `Tooltip` is a small dark label about one element. It opens on hover and on
keyboard focus, and Escape closes it. A `HoverCard` is a card with rich
content: a preview, an image, links.

| Use | For |
| - | - |
| `Tooltip` | A short text, with no link or control: the name of an icon button, the full text of a cut label, the reason why an action is not possible. |
| `HoverCard` | Content with links, controls or images, or text that is longer than a paragraph. The pointer can move into it. |
| [`Callout`](https://react-ui.datocms.com/Feedback/Callout.md) | A message that must stay on the page. A tooltip and a hover card show only on hover, and a touch device has no hover. |

## Delay

[`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md) puts a `HoverDelayGroup` around the plugin: tooltips and hover
cards open one at a time, and the one before closes. When one is open, the
next tooltip opens with no delay. A hover card always waits for its delay, so
the pointer can cross other triggers on its way into the card. Do not set a
delay on a tooltip or on a hover card.

## Tooltip

```tsx
import Tooltip from 'datocms-react-ui/Tooltip';
import React from 'react';

export default function Basic() {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-xl)' }}>
      <Tooltip label="production" placement="bottom-start">
        <span>A long environment name that is cut</span>
      </Tooltip>
      <Tooltip label="Project settings" placement="bottom">
        <span tabIndex={0}>Settings</span>
      </Tooltip>
    </div>
  );
}
```

`label` is a text that is already translated, never a translation key. A
long text, a paragraph or a list gets `long`. `Tooltip` draws the box: do not
write its classes in a component of your own.

The trigger is one element that takes a ref: an HTML element or a
`forwardRef` component.

An icon-only [`Button`](https://react-ui.datocms.com/Actions/Button.md) has its own tooltip from its `label`: do not wrap it.
The same is true for an icon-only [`Toolbar.Button`](https://react-ui.datocms.com/Actions/Button.md) and [`EditorToolbar.Button`](https://react-ui.datocms.com/Actions/Button.md).
A [`Button`](https://react-ui.datocms.com/Actions/Button.md) with a label can be in a `Tooltip`. A [`Button`](https://react-ui.datocms.com/Actions/Button.md) that is disabled
for a reason shows the reason in a tooltip with `disabled={{ reason }}`.

## Shortcut

Give `shortcut` to show the keys after the label. `mod` is Cmd on a Mac and
Ctrl on other systems. For the keys of an action, give its id to the
`tooltip` of a [`Button`](https://react-ui.datocms.com/Actions/Button.md) (see the Actions page): the name and the keys come
from the action.

```tsx
import Button from 'datocms-react-ui/Button';
import Tooltip from 'datocms-react-ui/Tooltip';
import React from 'react';

export default function Shortcut() {
  return (
    <Tooltip label="Save the record" shortcut="mod+s" placement="bottom">
      <Button tone="primary" label="Save" />
    </Tooltip>
  );
}
```

## Conditional tooltip

With no `label`, there is no tooltip, and the trigger stays in the same place
in the tree. Write `label={condition && text}` and do not change the
element around the trigger.

```tsx
import Button from 'datocms-react-ui/Button';
import Tooltip from 'datocms-react-ui/Tooltip';
import React, { useState } from 'react';

export default function Conditional() {
  const [hasError, setHasError] = useState(true);

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-m)' }}>
      <Tooltip
        long
        label={hasError ? 'Choose a plan with at least 5 collaborators.' : null}
      >
        <Button tone="primary" label="Select plan" />
      </Tooltip>
      <Button
        tone="soft"
        label={hasError ? 'Fix the error' : 'Break it again'}
        onClick={() => setHasError(!hasError)}
      />
    </div>
  );
}
```

**Do:** Write a short text that adds something: the full name, or the reason.

```tsx
<Tooltip label="production-2026-10-15" placement="bottom"><span>production-20…</span></Tooltip>
```

**Don’t:** Do not repeat the visible label.

```tsx
<Tooltip label="Save" placement="bottom"><Button label="Save" tone="soft" /></Tooltip>
```

## HoverCard

The card has its own surface: the content does not draw a box. Put text in
a `HoverCard.Body` to get the inset, and a quiet last line in a
`HoverCard.Note`, not in the classes. For a thing with an icon, a title, an
image and a description, the content is an [`EntitySummary`](https://react-ui.datocms.com/Lists/EntityRow.md). A hover card
has a delay of 300ms, so it does not open while the pointer only moves
over a list.

```tsx
import HoverCard from 'datocms-react-ui/HoverCard';
import React from 'react';

export default function HoverCardExample() {
  return (
    <HoverCard
      placement="bottom-start"
      content={
        <HoverCard.Body>
          <p>
            <strong>Article</strong>
          </p>
          <p>
            A blog post, with a title, a body and an author. Writers create
            about 20 of them every month.
          </p>
          <p>
            <a href="#models">Open the model</a>
          </p>
        </HoverCard.Body>
      }
    >
      <a href="#article">Article</a>
    </HoverCard>
  );
}
```

A [`Button`](https://react-ui.datocms.com/Actions/Button.md) with `disabled={{ reason, interactive: true }}` shows the reason
in a `HoverCard`, because the reason has a link.

```tsx
import Button from 'datocms-react-ui/Button';
import React from 'react';

export default function HoverCardDisabled() {
  return (
    <Button
      tone="primary"
      label="Change plan"
      disabled={{
        interactive: true,
        reason: (
          <>
            Your role cannot change the plan. <a href="#roles">See the roles</a>{' '}
            to find who can.
          </>
        ),
      }}
    />
  );
}
```

**Do:** Use a HoverCard when the content has a link, an image or a control.

```tsx
<HoverCard content={<HoverCard.Body>Open the <a href="#billing">billing</a> to see why.</HoverCard.Body>}>
  <Button label="Why?" tone="soft" />
</HoverCard>
```

**Don’t:** Do not hide an essential action in a HoverCard: a touch device cannot open it.

```tsx
<HoverCard content={<HoverCard.Body><Button label="Delete project" tone="alert" /></HoverCard.Body>}>
  <Button label="More" tone="soft" />
</HoverCard>
```

## Accessibility

Make the trigger the element that takes the focus. A screen reader reads the
tooltip as the description of the element that has the focus, and the tooltip
also opens when that element takes the keyboard focus. This is a
recommendation, not a rule.

## Props

### Tooltip

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `FloatingTrigger` | Yes | | The element that opens the tooltip. It must take a ref: an HTML element, or a component with `React.forwardRef`. Put a component without a ref in a `<span>`. |
| `label` | `Message \| false \| null \| undefined` | Yes | | The text of the tooltip: a string, `{ id }` for a translation, `{ html }` or a React element. With no value, there is no tooltip: write `label={condition && text}` for a tooltip that shows only in some cases. |
| `shortcut` | `string \| ActionShortcut \| ActionShortcut[]` | No | | The keys of a keyboard shortcut, shown after the label: the keys of an action (`{ key: 's', mod: true }`), or a string in the format of `is-hotkey` ("mod+s"), as the text editors give them. "mod" is Cmd on a Mac and Ctrl on other systems. |
| `long` | `boolean` | No | `false` | Use it for a paragraph or a list: the text is aligned at the start and the tooltip is wider. |
| `placement` | `Placement` | No | `"top"` | The side of the trigger where the tooltip opens. It moves to the other side when there is no space. |
| `offset` | `OffsetOptions` | No | `{ mainAxis: 16 }` | The space between the trigger and the tooltip, in pixels. Use it to move the tooltip away from a large trigger, for example a bar of a chart. |

### HoverCard

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `FloatingTrigger` | Yes | | The element that opens the card. It must take a ref: an HTML element, or a component with `React.forwardRef`. Put a component without a ref in a `<span>`. |
| `content` | `ReactNode` | Yes | | The content of the card: a preview, an image, a table, links. HoverCard draws the surface. Put text in a `HoverCard.Body` to get the inset. With no value, there is no card. |
| `placement` | `Placement` | No | `"top"` | The side of the trigger where the card opens. It moves to the other side when there is no space. |
| `offset` | `OffsetOptions` | No | `{ mainAxis: 16 }` | The space between the trigger and the card, in pixels. |

### HoverCard.Body

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The text of the card: one sentence (it can contain links), or block elements (`p`, an `InfoList`) with a gap between them. A `HoverCard.Note` can follow the text. |

### HoverCard.Note

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | A quiet line under the text, for example how a value is counted |
