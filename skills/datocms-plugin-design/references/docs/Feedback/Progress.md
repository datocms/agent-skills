# Progress

Use a `Spinner` for a task with no known end, and a `ProgressBar` for a task with a known share.

| Use | For |
| - | - |
| `Spinner` | A task with no known end: a list or a page that loads, a button that waits. |
| `ProgressBar` | A task with a share: a deploy, a scan, the share of a project in a usage. With `placement="edge"`, the progress of a transfer on a card (an upload) or of a row that loads. |
| [`UsageMeter`](https://react-ui.datocms.com/Content/Usage.md) | A usage against a limit. |

## Spinner

The spinner has two sizes. The default one is 32px and it is centered in
the nearest positioned parent: use it to load an area. With `inline`, the
spinner is 16px, the size of an icon: use it in a line of text or in a
control, not for an area. An area that says what it loads is a
[`BlankSlate`](https://react-ui.datocms.com/Feedback/BlankSlate.md) with `loading`.

```tsx
import Spinner from 'datocms-react-ui/Spinner';
import React from 'react';

export default function Spinners() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-l)' }}>
      <div style={{ position: 'relative', height: 80 }}>
        <Spinner />
      </div>
      <div>
        <Spinner inline label={false} /> Build in progress
      </div>
    </div>
  );
}
```

**Do:** Use a spinner when the share that is done is not known.

```tsx
<div><Spinner inline label={false} /> Build in progress</div>
```

**Don’t:** Do not use a progress bar when the share is not known.

```tsx
<ProgressBar value={0.5} ariaLabel="Loading" />
```

### Area and overlay

The default spinner is `position: absolute`, at the center of the nearest
positioned parent. Two parts give that parent for the usual cases, so you
do not write a box only for the spinner:

- `Spinner.Area` is a block in the flow that keeps a place for the content
  while it loads. `size` gives its smallest height: `small` (64px) for a
  line, `regular` (200px) for a block.
- `Spinner.Overlay` covers the nearest positioned parent. With its veil,
  the content shows, but it waits for a save or a transfer. With
  `veil={false}`, the spinner is at the center of the free space: use it
  for a whole form or pane that loads (the content of a [`Pane`](https://react-ui.datocms.com/Layout/Pane.md) is a
  positioned parent). Its `className` gives the z-index when the content
  has layers.

```tsx
import Spinner from 'datocms-react-ui/Spinner';
import React from 'react';

export default function SpinnerParts() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--spacing-l)',
      }}
    >
      <div style={{ border: '1px dashed var(--color--border)' }}>
        <Spinner.Area size="small" />
      </div>
      <div
        style={{
          position: 'relative',
          minHeight: 120,
          padding: 'var(--spacing-l)',
          border: '1px dashed var(--color--border)',
        }}
      >
        The content shows under the veil while the change saves.
        <Spinner.Overlay label="Saving" />
      </div>
    </div>
  );
}
```

## Progress bar

`value` is a fraction from 0 to 1. The component keeps the value in this
range. `ariaLabel` is required: it is the accessible name of the bar, the task
that is in progress. When a text next to the bar names the task, give the
same text.

```tsx
import ProgressBar from 'datocms-react-ui/ProgressBar';
import React from 'react';

export default function ProgressBars() {
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--spacing-m)',
        maxWidth: 400,
      }}
    >
      <ProgressBar value={0.15} ariaLabel="Deploy of the website" />
      <ProgressBar value={0.5} ariaLabel="Deploy of the website" />
      <ProgressBar value={1} ariaLabel="Deploy of the website" />
    </div>
  );
}
```

A bar can sit in a table cell, next to the value in text. The bar is as
wide as its parent: give the width with the layout around it, or with a
`className` (for example `max-width: 250px` in a wide column).

```tsx
import ProgressBar from 'datocms-react-ui/ProgressBar';
import React from 'react';

const projects = [
  { name: 'Marketing website', fraction: 0.62 },
  { name: 'Documentation', fraction: 0.27 },
  { name: 'Staging', fraction: 0.03 },
];

export default function ShareOfUsage() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-m)', maxWidth: 400 }}>
      {projects.map(({ name, fraction }) => {
        const percentage = `${Math.round(fraction * 100)}%`;

        return (
          <div
            key={name}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              alignItems: 'center',
              gap: 'var(--spacing-m)',
            }}
          >
            <span>{name}</span>
            <span
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 4ch',
                alignItems: 'center',
                gap: 'var(--spacing-s)',
              }}
            >
              <ProgressBar
                value={fraction}
                ariaLabel={`${percentage} of the usage of all the projects`}
              />
              {percentage}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

### On the edge of a card

With `placement="edge"`, the bar is 2px high, on the bottom edge of the
nearest positioned parent, so it does not cover the content. Without
`value`, a short segment moves along the bar without end: use it when the
share is not known yet.

The bar is moving at 0% and at 100%, when there is no value to show.

```tsx
import ProgressBar from 'datocms-react-ui/ProgressBar';
import React, { useEffect, useState } from 'react';

// The bar sits on the bottom edge of the nearest positioned parent.
export default function Transfer() {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPercent((old) => (old >= 100 ? 0 : old + 10));
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // At 0% the transfer did not start, at 100% the server analyses the asset:
  // there is no value to show.
  const value = percent === 0 || percent === 100 ? undefined : percent / 100;

  return (
    <div
      style={{
        position: 'relative',
        width: 240,
        height: 120,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--color--surface-muted)',
        borderRadius: 'var(--radius-m)',
        overflow: 'hidden',
      }}
    >
      cover.jpg
      <ProgressBar
        placement="edge"
        value={value}
        ariaLabel="Upload of cover.jpg"
      />
    </div>
  );
}
```

## Accessibility

The spinner is a status: a screen reader says "Loading", or the `label`
that you give ("Loading the records"). When a visible text or `aria-busy`
already says it (the busy [`Button`](https://react-ui.datocms.com/Actions/Button.md), a [`BlankSlate`](https://react-ui.datocms.com/Feedback/BlankSlate.md) with a title, "Build in
progress"), give `label={false}`. The spinner is then only a decoration.

## Props

### Spinner

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `inline` | `boolean` | No | `false` | Makes a small spinner (16px, the size of an icon) for a line of text or a control. Without it, the spinner is 32px and it is centered in its parent, to load an area. |
| `label` | `TextMessage \| false` | No | `"Loading"` | The text that a screen reader says. The spinner is a status. Give `false` when a visible text or `aria-busy` already says that the content loads. Then the spinner is only a decoration. |
| `className` | `string` | No | | Only for the position of the spinner (margin, z-index), not for its look |

### SpinnerArea

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `size` | `'small' \| 'regular'` | No | `"regular"` | The smallest height of the area: "small" for a line (64px), "regular" for a block (200px). To fill a whole pane, use Spinner.Overlay with no veil. |
| `label` | `TextMessage \| false` | No | | See the label of Spinner |

### SpinnerOverlay

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `veil` | `boolean` | No | `true` | Draws a veil over the content that shows. Give `false` when there is no content yet (a whole form that loads): the spinner is then at the center of the free space. |
| `label` | `TextMessage \| false` | No | | See the label of Spinner |
| `className` | `string` | No | | Only for the position of the overlay (z-index), not for its look |

### ProgressBar

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `value` | `number` | No | | The completed part, from 0 to 1, for example 0.4 for 40%. The component keeps it in this range. Without a value, a short segment moves along the bar without end: the share is not known yet. |
| `ariaLabel` | `TextMessage` | Yes | | The accessible name of the bar: the task that is in progress, for example "Upload of cover.jpg" |
| `placement` | `'inline' \| 'edge'` | No | `"inline"` | "inline" is a 4px bar as wide as its parent. "edge" is a 2px bar on the bottom edge of the nearest positioned parent, so it does not cover the content. Use it on a card or a row. |
| `className` | `string` | No | | Only for the position of the bar (width, margin), not for its look. The bar is as wide as its parent. You know the width that fits your layout, for example a maximum width in a table column. |
