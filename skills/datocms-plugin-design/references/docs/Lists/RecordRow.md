# RecordRow

A record in a row. `RecordRow` shows the image, the model, the title, the
validity triangles and the status in the same order and with the same sizes
as the lists and the link fields of DatoCMS. It is an [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md), so it
draws only the content. The container gives the surface, the hover and the
click.

| Use | For |
| - | - |
| `RecordRow` | A record, in a list, a menu, a chip, a cell or a text. |
| [`UserRow`](https://react-ui.datocms.com/Lists/UserRow.md) | A person: a collaborator, an SSO user, an API token. |
| [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md) | Any other thing: a plugin, a role, a model, a deploy site. |

```tsx
import RecordRow from 'datocms-react-ui/RecordRow';
import RowList from 'datocms-react-ui/RowList';
import SidebarPanel from 'datocms-react-ui/SidebarPanel';
import React from 'react';

const RECORD_IDS = ['1001', '1002', '1003', '2001'];

export default function Linked() {
  return (
    <div style={{ width: 340 }}>
      <SidebarPanel title="Linked records" count={RECORD_IDS.length}>
        <RecordRow.List>
          <RowList density="compact">
            {RECORD_IDS.map((id) => (
              <RowList.Item key={id} to={`/records/${id}`}>
                <RecordRow layout="row" item={id} />
              </RowList.Item>
            ))}
          </RowList>
        </RecordRow.List>
      </SidebarPanel>
    </div>
  );
}
```

## Records from the host

Give the ID of the record, or the record, to `item`. The row asks the host for
the presentation of the record: the same title and image that DatoCMS shows,
also when another plugin changes them with `buildItemPresentationInfo`. The
rows of one render ask in one call. The [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md) of the plugin gives the
loader, from `ctx.loadItemPresentationInfo`.

The row loads the record once, and again when `item` changes. It is a
snapshot: it does not show the changes that somebody makes to the record
after it loads. While it loads, the title is a placeholder, and a screen
reader reads that the record loads. With a full record, the row also shows
the model and the status from the record while it loads. A record that does
not exist shows "Record #" and the ID.

```tsx
import RecordRow from 'datocms-react-ui/RecordRow';
import React from 'react';

export default function Inline() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-m)', width: 260 }}>
      <RecordRow layout="inline" item="1001" />
      <RecordRow layout="inline" item="1003" />
      {/* A record that does not exist: the row shows "Record #" and the ID */}
      <RecordRow layout="inline" item="9999" />
    </div>
  );
}
```

## Records that you resolve

Give `presentation` when you already have the data. A result of
`ctx.loadItemPresentationInfo` is a presentation: call it once for your own
batch of records, and give each result to a row. The row reads the model
from `presentation.itemTypeId`, so it shows the model and the status with
no other prop.

```tsx
import type { ResolvedItemPresentationInfo } from 'datocms-plugin-sdk';
import { useCtx } from 'datocms-react-ui/Canvas';
import RecordRow from 'datocms-react-ui/RecordRow';
import RowList from 'datocms-react-ui/RowList';
import React, { useEffect, useState } from 'react';

const RECORD_IDS = ['1002', '1001', '2001'];

export default function FromCtx() {
  const ctx = useCtx();
  const [records, setRecords] = useState<ResolvedItemPresentationInfo[]>([]);

  useEffect(() => {
    // One call for the whole batch
    ctx.loadItemPresentationInfo(RECORD_IDS).then((result) => {
      setRecords(
        result.filter((record): record is ResolvedItemPresentationInfo =>
          Boolean(record),
        ),
      );
    });
  }, [ctx]);

  return (
    <div style={{ width: 340 }}>
      <RecordRow.List>
        <RowList density="compact">
          {records.map((record) => (
            <RowList.Item key={record.id}>
              <RecordRow layout="row" presentation={record} />
            </RowList.Item>
          ))}
        </RowList>
      </RecordRow.List>
    </div>
  );
}
```

For a record that is not in the project, or a title that you compute, give
the `model` too. The row shows the status only when the model has the draft
mode, because without it a record is published each time that it is saved.

```tsx
import RecordRow from 'datocms-react-ui/RecordRow';
import RowList from 'datocms-react-ui/RowList';
import React from 'react';

const MODEL = { name: '🎟️ Event', draftModeActive: true };

export default function Presentation() {
  return (
    <div style={{ width: 340 }}>
      <RowList density="compact">
        <RowList.Item>
          <RecordRow
            layout="row"
            model={MODEL}
            presentation={{
              id: '3001',
              title: 'Design meetup, Milan',
              image: null,
              status: 'draft',
            }}
          >
            12 March, 18:30
          </RecordRow>
        </RowList.Item>
        <RowList.Item>
          <RecordRow
            layout="row"
            model={MODEL}
            presentation={{
              id: '3002',
              title: 'Content modeling workshop',
              image: { type: 'file', extension: 'pdf' },
              status: 'published',
              publishedVersionValid: false,
            }}
          >
            2 April, 10:00
          </RecordRow>
        </RowList.Item>
      </RowList>
    </div>
  );
}
```

## Layouts

`layout="row"` is for a list or a menu. It has the image of 32px, the model
above the title, and the children below the title, for example a date or the
parents of the record.

`layout="inline"` is one line with the image of 20px: a chip, the value of a
select, a cell of a table, a record in a text. It has no model and no
children.

## Lists of records

Put the rows of a list in `RecordRow.List`. When one row has an image, all
the rows keep the place of the image, so the titles align. Give
`showModel={false}` when all the records have the same model: the rows do
not show it. A record in the list that is not one of its rows, for example
a chip of a select whose menu is the list, gets `standalone`.

```tsx
import RecordRow from 'datocms-react-ui/RecordRow';
import RowList from 'datocms-react-ui/RowList';
import React from 'react';

export default function OneModel() {
  return (
    <div style={{ width: 340 }}>
      <RecordRow.List showModel={false}>
        <RowList density="compact">
          {['1001', '1002', '1003'].map((id) => (
            <RowList.Item key={id}>
              <RecordRow layout="row" item={id} />
            </RowList.Item>
          ))}
        </RowList>
      </RecordRow.List>
    </div>
  );
}
```

## ID

`showId` shows the ID of the record after the model, or after the title
with `layout="inline"`. Use it when the ID matches the text of a search.

## Actions

The row is only the content. An action on the record, such as edit or
remove, belongs to the container: a link on the [`RowList.Item`](https://react-ui.datocms.com/Lists/RowList.md), an option of a
menu, or a button of the cell.

**Do:** Show a record with RecordRow, so the model, the validity and the status look as in DatoCMS.

```tsx
<RecordRow
  layout="row"
  model={{ name: '🏷️ Promotion', draftModeActive: true }}
  presentation={{
    id: '1',
    title: 'Summer sale',
    image: null,
    status: 'updated',
    currentVersionValid: false,
  }}
/>
```

**Don’t:** Do not build a record with EntityRow and your own marks: the status and the validity then look different from DatoCMS.

```tsx
<EntityRow
  layout="row"
  kicker="Promotion"
  title="Summer sale (not valid)"
  trailing={<Pill>Updated</Pill>}
/>
```

## Accessibility

The title is text, so a screen reader reads it. While the record loads, the
title is busy and has a hidden text that says so. The status dot has its
name in a tooltip and in `aria-label`. The image is decorative.

## Props

### RecordRow

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `presentation` (variant) | `RecordRowPresentation` | No | | The data of the record, for example a result of `ctx.loadItemPresentationInfo` |
| `model` (variant) | `RecordRowModel \| null` | No | | The model of the record. The row shows its name above the title, and the status only when it has the draft mode. Without it, the row reads the model of `presentation.itemTypeId` from the host. |
| `item` (variant) | `string \| RecordRowItem` | No | | The ID of the record, or the record. The row loads its presentation once, and again when `item` changes: it does not show the changes that somebody makes to the record later. While it loads, it shows a placeholder in place of the title, and the model and the status of a full record. |
| `preferredLocale` (variant) | `string` | No | | The locale of the title and of the image |
| `layout` | `'row' \| 'inline'` | Yes | | "row" shows the model above the title: a row of a list, an option of a menu.<br>"inline" shows one line: a chip, the value of a select, a record in a text. It has no model and no lines below the title. |
| `children` (variant) | `ReactNode` | No | | More lines below the title, small and in the subtle ink. For example the parents of the record, or the users that edit it. |
| `showId` | `boolean` | No | `false` | Shows the ID of the record. For example when the ID matches the text of a search. |
| `multilineTitle` | `boolean` | No | `false` | The title shows on up to three lines, not on one line. Only for a list of records that is wide enough. |
| `standalone` | `boolean` | No | `false` | The row ignores the `RecordRow.List` around it (for example a chip of a select, when the list is the options of the menu). It shows an image only when it has one, and does not change the rows. |

### RecordRow\.List

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `showModel` | `boolean` | No | `true` | The rows show the model above the title. Give false when all the records have the same model. |
| `reserveImageSlot` | `boolean` | No | `false` | All the rows show the image slot from the start, before a row with an image loads. Use it when a model of the rows has an image, in a list with many records of the same models. |
| `children` | `ReactNode` | Yes | | The rows |

### RecordRow\.Image

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `image` | `RecordRowImage \| null` | Yes | | The image of the record. Without it, the square is a muted placeholder. |

#### Types

`RecordRowImage` — The image of a record. "image" is a picture to show in the square, cut to fill it. "file" is a file that is not a picture: the square shows the icon of its extension.

```ts
export type RecordRowImage =
  | { type: 'image'; url: string }
  | { type: 'file'; extension: string };
```
