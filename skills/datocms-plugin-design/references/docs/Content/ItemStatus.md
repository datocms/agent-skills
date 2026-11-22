# ItemStatus

The publishing status of a record, as DatoCMS shows it in the records table
of a model, in the tree of the records and in the toolbar of a record.

Use `ItemStatus` every time that you show the status of a record, so the
color, the size and the names are the same everywhere. "updated" is a
published record with changes that are not published. "new" has the color
of "draft".

By default the status is only a dot. The label goes in the tooltip and in
the name for screen readers, so it is a text (a string or `{ id }`). Give
`display="label"` only where the status is the value itself: the "Status"
column of a table, the toolbar and the info of a record. A dot of a row is
always at the end of the row.

Without `label`, the component shows the name of the status: "Published",
"Unpublished changes", "Draft" or "New". Give `label` to show another text.

## Accessibility

A dot alone, without a label, has no name for screen readers, so the module
does not export it.

```tsx
import ItemStatus, { type ItemStatusValue } from 'datocms-react-ui/ItemStatus';
import React from 'react';

const STATUSES: Array<{ status: ItemStatusValue; label?: string }> = [
  { status: 'published' },
  { status: 'updated' },
  { status: 'draft' },
  { status: 'new', label: 'New record' },
];

export default function Statuses() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-s)' }}>
      {STATUSES.map(({ status, label }) => (
        <div
          key={status}
          style={{
            display: 'flex',
            gap: 'var(--spacing-l)',
            alignItems: 'center',
          }}
        >
          <ItemStatus status={status} label={label} />
          <ItemStatus status={status} label={label} display="label" />
        </div>
      ))}
    </div>
  );
}
```

## Props

### ItemStatus

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `display` | `'dot' \| 'label'` | No | `"dot"` | |
| `label` | `TextMessage \| Message` | No | `the name of the status: "Published", "Unpublished changes", "Draft" or "New"` | The name of the status, for example "Published". It goes in the tooltip and in `aria-label`, so it is a text.<br>The name of the status, for example "Unpublished changes" |
| `status` | `ItemStatusValue` | Yes | | The status. "updated" is a published record with changes that are not published. "new" has the color of "draft". |

#### Types

`ItemStatusValue` — The publishing status of a record

```ts
export type ItemStatusValue = 'published' | 'updated' | 'draft' | 'new';
```
