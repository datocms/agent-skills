# Usage

How much of a limit is used: the meters of a limit (`UsageMeter`,
`UsageRing`).

| Use | For |
| - | - |
| `UsageMeter` | A bar that shows the usage against the limit, with a row of text under it or next to it. |
| `UsageRing` | The same, in a row with no space for a bar. |
| [`ProgressBar`](https://react-ui.datocms.com/Feedback/Progress.md) | The progress of a task, or a share of a total. |
| [`Callout`](https://react-ui.datocms.com/Feedback/Callout.md) | A message about the usage, for example "Your usage is within the limits". |

## Meter

The bar is as wide as its container and 6px high. The part within the limit
has the fill color. The part over the limit is amber, because the owner pays
for it. With `blocked`, it is red, because the usage stopped (a free plan).
The bar shows the whole usage. When the usage is over the limit, the limit
moves to the left.

```tsx
import { UsageMeter } from 'datocms-react-ui/UsageMeter';
import React from 'react';

const rows = [
  { name: 'Within the limit', usage: 620, limit: 1000, blocked: false },
  {
    name: 'Over the limit, paid by the owner',
    usage: 1300,
    limit: 1000,
    blocked: false,
  },
  { name: 'Over the limit, stopped', usage: 1300, limit: 1000, blocked: true },
];

const label = (usage: number, limit: number) =>
  `${Math.round((usage / limit) * 100)}% of the limit`;

export default function Meters() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-l)', maxWidth: 400 }}>
      {rows.map(({ name, usage, limit, blocked }) => (
        <div key={name} style={{ display: 'grid', gap: 'var(--spacing-s)' }}>
          {name}
          <UsageMeter
            usage={usage}
            limit={limit}
            blocked={blocked}
            ariaLabel={label(usage, limit)}
          />
        </div>
      ))}
    </div>
  );
}
```

## Ring

`UsageRing` takes the same props. The ring starts at the top and goes
clockwise. A full ring is the limit. Within the limit, the ring is gray, like
an icon, so in a list of limits only a ring over the limit catches the eye.
Over the limit, the full ring is in color.

Like an icon, the ring has the size of the text around it (`1em`). Set a
`font-size` or a width to change it.

```tsx
import { UsageRing } from 'datocms-react-ui/UsageMeter';
import React from 'react';

const rows = [
  { name: 'Records', usage: 3200, limit: 5000, blocked: false },
  { name: 'API calls', usage: 6100, limit: 5000, blocked: false },
  { name: 'Traffic', usage: 6100, limit: 5000, blocked: true },
];

const label = (usage: number, limit: number) =>
  `${Math.round((usage / limit) * 100)}% of the limit`;

// The ring has the size of the text around it.
export default function Rings() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-m)' }}>
      {rows.map(({ name, usage, limit, blocked }) => (
        <div
          key={name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-s)',
          }}
        >
          <UsageRing
            usage={usage}
            limit={limit}
            blocked={blocked}
            ariaLabel={label(usage, limit)}
          />
          {name}
        </div>
      ))}
    </div>
  );
}
```

## Accessibility

Always give an `ariaLabel`, for example “80% of the limit”.

