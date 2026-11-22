# EntityRow

An entity is a thing that is not a record: a plugin, a role, a deploy site, a
version. `EntityRow` shows its image, its title and its details in the same
order and with the same sizes everywhere. It draws only the content. The
container gives the surface, the hover and the click. The container is an
inset row, a menu option, a chip or the row of a [`CardList`](https://react-ui.datocms.com/Lists/CardList.md).

| Use | For |
| - | - |
| `EntityRow` | One thing in a list, a menu, a chip or a card. |
| [`RecordRow`](https://react-ui.datocms.com/Lists/RecordRow.md) | A record. It is an `EntityRow` with the image, the model, the validity and the status of the record. |
| [`UserRow`](https://react-ui.datocms.com/Lists/UserRow.md) | A person: a collaborator, an SSO user, an API token. It is an `EntityRow` with the avatar, the name and the email. |
| `EntitySummary` | The content of a [`HoverCard`](https://react-ui.datocms.com/Overlays/Tooltip.md) that explains a thing. |
| [`InfoList`](https://react-ui.datocms.com/Lists/InfoList.md) | Facts about the thing that is open, as label and value. |

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import InitialsAvatar from 'datocms-react-ui/InitialsAvatar';
import Pill from 'datocms-react-ui/Pill';
import React from 'react';

const PLUGINS = [
  { name: 'Slug Generator', enabled: true, hasUpdate: false },
  { name: 'Markdown Preview', enabled: false, hasUpdate: false },
  { name: 'Web Previews', enabled: true, hasUpdate: true },
];

export default function Plugins() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-m)' }}>
      {PLUGINS.map((plugin) => (
        <EntityRow
          key={plugin.name}
          layout="row"
          image={<InitialsAvatar name={plugin.name} size={32} />}
          title={plugin.name}
          afterTitle={!plugin.enabled ? <Pill>Disabled</Pill> : undefined}
          trailing={
            plugin.hasUpdate ? <Pill tone="warning">Update</Pill> : undefined
          }
        />
      ))}
    </div>
  );
}
```

## Layouts

`layout="row"` is for a list, a menu or a card. It has the kicker above the
title, an image of 32px and the details below the title.

`layout="inline"` is one line with an image of 20px: a chip, the value of a
select or a name in a text. It has no kicker and no details. The props are a
union on `layout`, so TypeScript does not accept `kicker` or `children` with
`layout="inline"`.

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import InitialsAvatar from 'datocms-react-ui/InitialsAvatar';
import React from 'react';

export default function Inline() {
  return (
    <p style={{ display: 'flex', gap: 'var(--spacing-m)', margin: 0 }}>
      {['Acme Blog', 'Acme Docs'].map((name) => (
        <span
          key={name}
          style={{
            display: 'inline-flex',
            padding: 'var(--spacing-xs) var(--spacing-s)',
            border: '1px solid var(--color--border)',
            borderRadius: 'var(--radius-s)',
          }}
        >
          <EntityRow
            layout="inline"
            image={<InitialsAvatar name={name} size={20} />}
            title={name}
          />
        </span>
      ))}
    </p>
  );
}
```

## Kicker, details and aside

The kicker is the line above the title: the model of a record, or the
provider of a deploy site. The children are the details below the title, in
one line. The aside is a short note after the title, for example a version.

The title, the content of `afterTitle` and the aside share the width of the
line in equal parts. A part that needs less than its share gives the rest to
the others. So a short title stays whole next to long pills, and a long part
ends with an ellipsis: no part disappears.

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import React from 'react';
import { NetlifyIcon } from '@/icons';

export default function KickerAndDetails() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
      <EntityRow
        layout="row"
        image={<NetlifyIcon />}
        kicker="Netlify"
        title="Marketing website"
      />
      <EntityRow layout="row" kicker="Project" title="Acme Corp" aside="v1.4.2">
        Created 3 days ago, by Mario Rossi
      </EntityRow>
      <div className="DocsNarrow">
        <EntityRow
          layout="row"
          multilineTitle
          title="A title that is much too long for one line is cut after three lines, so the row stays small even with a very long name that goes on and on, far past the end of the third line of the row"
        />
      </div>
    </div>
  );
}
```

**Do:** Put a state of the entity next to the title with afterTitle (Disabled), and a status that asks for an action at the end of the row with trailing (Update).

```tsx
<EntityRow
  layout="row"
  image={<InitialsAvatar name="Web Previews" size={32} />}
  title="Web Previews"
  afterTitle={<Pill>Disabled</Pill>}
  trailing={<Pill tone="warning">Update</Pill>}
/>
```

**Don’t:** Do not draw a surface, a border or a hover state in the row. The container does it.

```tsx
<div style={{ padding: 12, border: '1px solid var(--color--border)', borderRadius: 8 }}>
  <EntityRow layout="row" title="Blog" />
</div>
```

## EntitySummary

The content of a [`HoverCard`](https://react-ui.datocms.com/Overlays/Tooltip.md) for a thing that has an icon, a title, an
image and a description, for example a type of field or a model. It draws no
surface: [`HoverCard`](https://react-ui.datocms.com/Overlays/Tooltip.md) draws it.

`EntitySummary` does not use `EntityRow`. Its `icon` is a small glyph in the
subtle ink, before the title. The `image` of `EntityRow` is a slot for an
icon, an avatar or a photo.

```tsx
import EntitySummary from 'datocms-react-ui/EntitySummary';
import HoverCard from 'datocms-react-ui/HoverCard';
import React from 'react';
import { InfoIcon } from '@/icons';

export default function Summary() {
  return (
    <HoverCard
      content={
        <EntitySummary
          icon={<InfoIcon />}
          title="Single-line string"
          description="A text with a single line. Use it for titles, names and short labels."
        />
      }
    >
      <button type="button">Hover this button</button>
    </HoverCard>
  );
}
```

## CSS variables

## CSS variables

The `image` fills a square of this size, so it needs no size of its own.

- `--EntityRow-image-size`: The width and the height of the image: 20px on one line, 32px in a row (layout="row")

