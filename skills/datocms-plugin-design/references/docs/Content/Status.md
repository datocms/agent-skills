# Status

The state of an item, shown with a color. A dot is for a state in a row or a
cell, and a triangle is for a record that is not valid.

| Use | For |
| - | - |
| `FeedbackDot` | The state of a row (enabled, failed, never deployed): a dot before the label, or at the end of a row. |
| [`StatusCell`](https://react-ui.datocms.com/Lists/Table.md) | The same, in a cell of a table. |
| `ItemValidityTriangles` | A record that is not valid: one triangle for the published version, one for the current version. |
| `VersionValidityTriangle` | One version of a record, for example in the list of versions. |
| `UploadThreatTriangle` | An upload that the antivirus found infected. |
| [`Pill`](https://react-ui.datocms.com/Content/Pill.md) | A label for a fact or a status next to a title. |

## Dots

`success` is green, `warning` is amber, `danger` is red and `neutral` is
grey. Always put a label next to the dot, because the color alone is not
enough. The dot has no space around it, so put a space or a `gap` between the
dot and the label ([`StatusCell`](https://react-ui.datocms.com/Lists/Table.md) has its gap).

```tsx
import FeedbackDot from 'datocms-react-ui/FeedbackDot';
import React from 'react';

export default function Dots() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-s)' }}>
      <span>
        <FeedbackDot tone="success" /> Enabled
      </span>
      <span>
        <FeedbackDot tone="warning" /> To configure
      </span>
      <span>
        <FeedbackDot tone="danger" /> Failed
      </span>
      <span>
        <FeedbackDot tone="neutral" /> Never deployed
      </span>
    </div>
  );
}
```

**Do:** Put a label next to the dot, so the state does not depend on the color.

```tsx
<span>
  <FeedbackDot tone="danger" /> Build failed
</span>
```

**Don’t:** Do not use a dot with no text for a state that the user must understand.

```tsx
<span>
  <FeedbackDot tone="danger" />
</span>
```

## Dot in a row

At the end of a row, give the dot as `trailing`. It is the state of the row.
There, no text says the state, so give `ariaLabel` (“Enabled”, “Disabled”).
A screen reader then reads it.

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import FeedbackDot from 'datocms-react-ui/FeedbackDot';
import React from 'react';

const TRIGGERS = [
  { name: 'Production', enabled: true },
  { name: 'Staging', enabled: false },
];

export default function Rows() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-s)' }}>
      {TRIGGERS.map((trigger) => (
        <EntityRow
          key={trigger.name}
          layout="row"
          title={trigger.name}
          trailing={
            <FeedbackDot
              tone={trigger.enabled ? 'success' : 'neutral'}
              ariaLabel={trigger.enabled ? 'Enabled' : 'Disabled'}
            />
          }
        />
      ))}
    </div>
  );
}
```

## Dot in a table

[`StatusCell`](https://react-ui.datocms.com/Lists/Table.md) (`datocms-react-ui/Table/cells/StatusCell`) is a dot and a label
for a cell of a table.

```tsx
import StatusCell from 'datocms-react-ui/Table/cells/StatusCell';
import React from 'react';

export default function StatusCells() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-s)' }}>
      <StatusCell tone="success">Build completed</StatusCell>
      <StatusCell tone="danger">Build failed</StatusCell>
      <StatusCell tone="warning">To configure</StatusCell>
      <StatusCell tone="neutral">Never deployed</StatusCell>
    </div>
  );
}
```

## Validity triangles

A triangle shows only when a version is not valid. A solid triangle is the
published version, an outline triangle is the current version. When the
model has a draft mode and both versions are not valid, the two triangles
show together. A tooltip says which version is not valid.

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import { ItemValidityTriangles } from 'datocms-react-ui/ValidityTriangles';
import React from 'react';

export default function ValidityTriangles() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-s)' }}>
      <EntityRow
        layout="row"
        title="Published version is not valid"
        afterTitle={
          <ItemValidityTriangles
            publishedValid={false}
            currentValid={true}
            draftModeActive={true}
          />
        }
      />
      <EntityRow
        layout="row"
        title="Both versions are not valid"
        afterTitle={
          <ItemValidityTriangles
            publishedValid={false}
            currentValid={false}
            draftModeActive={true}
          />
        }
      />
      <EntityRow
        layout="row"
        title="Valid record"
        afterTitle={
          <ItemValidityTriangles
            publishedValid={true}
            currentValid={true}
            draftModeActive={true}
          />
        }
      />
    </div>
  );
}
```

**Do:** Put the triangles after the title of the record.

```tsx
<EntityRow
  layout="row"
  title="Home page"
  afterTitle={
    <ItemValidityTriangles
      publishedValid={false}
      currentValid={true}
      draftModeActive={true}
    />
  }
/>
```

**Don’t:** Do not show a triangle for a valid record, or a “Valid” label.

```tsx
<EntityRow layout="row" title="Home page" afterTitle="Valid" />
```

## One version

`VersionValidityTriangle` is for one version, for example in a list of
versions. It is solid for the published version. Give `showTooltip={false}`
when a text next to it already says the state.

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import { VersionValidityTriangle } from 'datocms-react-ui/ValidityTriangles';
import React from 'react';

export default function VersionTriangles() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-s)' }}>
      <EntityRow
        layout="row"
        title="14 Oct 2026, 10:32"
        afterTitle={
          <VersionValidityTriangle isVersionValid={false} isPublished={true} />
        }
      />
      <EntityRow
        layout="row"
        title="13 Oct 2026, 17:05"
        afterTitle={
          <VersionValidityTriangle isVersionValid={false} isPublished={false} />
        }
      />
    </div>
  );
}
```

## Upload threat

`UploadThreatTriangle` is the triangle of an upload that the antivirus found
infected. It has no props: render it only when the antivirus status of the
upload is `infected`. It is only an icon, so the title of the upload stays on
one line.

```tsx
import UploadThreatTriangle from 'datocms-react-ui/UploadThreatTriangle';
import React from 'react';

export default function UploadThreat() {
  return (
    <div>
      invoice-final.pdf
      <UploadThreatTriangle />
    </div>
  );
}
```

## Accessibility

A screen reader does not read a dot, because the label next to it says the
state. For a dot with no label, see “Dot in a row” above.

