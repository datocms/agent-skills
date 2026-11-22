# Table

Many elements with the same columns, to scan and sort: the records and the
assets of DatoCMS, the collaborators of a project. The user shows, hides,
moves, resizes and sorts the columns. The table knows nothing about the data.
You give it the columns, the rows and the storage of the layout.

Other components for other cases:

- A few things with actions are a [`CardList`](https://react-ui.datocms.com/Lists/CardList.md).

```tsx
<Table columns={columns} layout={layout} onLayoutChange={setLayout}>
  <Table.Header />
  <Table.Body>
    <Table.Row row={row} />
  </Table.Body>
</Table>
```

## Columns, layout and sort

`columns` lists all the columns that the user can show: a `name`, a
`label` and `renderCell(row)`. Memoize the array: the rows render again when
it changes. The cells stay on one line, with an ellipsis at the width of
the column (`truncate`). Do not give the content of a cell a fixed width,
because the user resizes the columns.

`layout` is the visible columns, in their order, with their relative
widths. The table is controlled: keep the layout with
`useInMemoryTableLayout`, `useLocalStorageTableLayout(key, defaultLayout)`,
or in a state of your own. To move a column, drag its label. To resize, drag
the border between two labels. To show or hide columns, open the menu at the
end of the header.

`useLocalStorageTableLayout` writes the layout in the `key` as it is. All the
published plugins have the same origin
(`https://plugins-cdn.datocms.com`), so they share `localStorage`. Start the
key with the name of the plugin.

`sort={{ value, onChange }}` sorts the rows from the header (a `sortable`
column). Without `onChange`, the header shows the order, but the user cannot
change it. A list with all its rows in memory uses `useClientSort(rows,
columns)`: it gives the sorted `rows` and the `sort` of the table, and sorts
with the `compare` of the column. A list that the API sorts keeps the
`sort` in its state, and loads the rows again in `onChange`.

```tsx
import {
  Table,
  useClientSort,
  useInMemoryTableLayout,
} from 'datocms-react-ui/Table';
import React from 'react';
import { COLUMNS, DEFAULT_LAYOUT, MODELS } from './data';

export default function Basic() {
  const [layout, setLayout] = useInMemoryTableLayout(DEFAULT_LAYOUT);
  const { rows, sort } = useClientSort(MODELS, COLUMNS);

  return (
    <Table
      columns={COLUMNS}
      layout={layout}
      onLayoutChange={setLayout}
      sort={sort}
    >
      <Table.Header />
      <Table.Body>
        {rows.map((model) => (
          <Table.Row key={model.id} row={model} />
        ))}
      </Table.Body>
    </Table>
  );
}
```

The cells of `datocms-react-ui/Table/cells` are the common contents:
`EntityCell` (the title of the entity of the row, with its image),
`LinkCell` (a link, the full text in the title), `StatusCell` (a dot and a
label), `IconCell` (an icon and a label) and `TimeCell` (a relative date,
the full date in the title).

`EntityCell` goes in the first column, as the title of a record in the
records table of a model. In a narrow cell, the ellipsis goes on the title,
not on the image. `image` is a square of 35px. Give a thumbnail with its own
size in `preview`, as the assets table does. `afterTitle` holds what goes
after the title: an [`ItemStatus`](https://react-ui.datocms.com/Content/ItemStatus.md), a validity triangle, the avatars of the
users that look at the record.

```tsx
import ItemStatus from 'datocms-react-ui/ItemStatus';
import {
  Table,
  type TableColumn,
  useInMemoryTableLayout,
} from 'datocms-react-ui/Table';
import EntityCell from 'datocms-react-ui/Table/cells/EntityCell';
import TimeCell from 'datocms-react-ui/Table/cells/TimeCell';
import React from 'react';
import { LANDSCAPE } from '../../../Content/UploadPreview/examples/sampleImages';

type Product = {
  id: string;
  title: string;
  image?: string;
  status: 'published' | 'draft';
  updatedAt: string;
};

const PRODUCTS: Product[] = [
  {
    id: 'pannier',
    title: 'Rolltop pannier 20 L',
    image: LANDSCAPE,
    status: 'published',
    updatedAt: '2026-10-21T09:30:00Z',
  },
  {
    id: 'bag',
    title: 'Handlebar bag 8 L',
    status: 'draft',
    updatedAt: '2026-10-27T16:05:00Z',
  },
];

const COLUMNS: TableColumn<Product>[] = [
  {
    name: 'title',
    label: 'Title',
    renderCell: (product) => (
      <EntityCell
        title={product.title}
        image={product.image && <img src={product.image} alt="" />}
        afterTitle={<ItemStatus status={product.status} />}
      />
    ),
  },
  {
    name: 'updatedAt',
    label: 'Updated',
    renderCell: (product) => <TimeCell value={product.updatedAt} />,
  },
];

export default function Entities() {
  const [layout, setLayout] = useInMemoryTableLayout({
    columns: [
      { name: 'title', width: 0.7 },
      { name: 'updatedAt', width: 0.3 },
    ],
  });

  return (
    <Table columns={COLUMNS} layout={layout} onLayoutChange={setLayout}>
      <Table.Header />
      <Table.Body>
        {PRODUCTS.map((product) => (
          <Table.Row key={product.id} row={product} />
        ))}
      </Table.Body>
    </Table>
  );
}
```

For a table of assets, give an [`UploadPreview`](https://react-ui.datocms.com/Content/UploadPreview.md) in `preview`, with no padding,
so the thumbnail keeps the proportions of the image.

```tsx
import {
  Table,
  type TableColumn,
  useInMemoryTableLayout,
} from 'datocms-react-ui/Table';
import EntityCell from 'datocms-react-ui/Table/cells/EntityCell';
import UploadPreview from 'datocms-react-ui/UploadPreview';
import UploadThreatTriangle from 'datocms-react-ui/UploadThreatTriangle';
import React from 'react';
import {
  LANDSCAPE,
  LOGO,
  PORTRAIT,
} from '../../../Content/UploadPreview/examples/sampleImages';

type Asset = {
  id: string;
  filename: string;
  url: string;
  width: number;
  height: number;
  size: string;
  infected?: boolean;
};

const ASSETS: Asset[] = [
  {
    id: 'hero',
    filename: 'hero-landscape.jpg',
    url: LANDSCAPE,
    width: 1200,
    height: 800,
    size: '412 KB',
  },
  {
    id: 'portrait',
    filename: 'team-portrait.jpg',
    url: PORTRAIT,
    width: 600,
    height: 900,
    size: '238 KB',
    infected: true,
  },
  {
    id: 'logo',
    filename: 'logo.svg',
    url: LOGO,
    width: 48,
    height: 48,
    size: '2 KB',
  },
];

const THUMBNAIL = { width: 60, height: 60 };

const COLUMNS: TableColumn<Asset>[] = [
  {
    name: 'filename',
    label: 'File',
    renderCell: (asset) => (
      <EntityCell
        title={asset.filename}
        preview={
          <UploadPreview box={THUMBNAIL} fixedSize padding={[0, 0]} transparent>
            <UploadPreview.Image
              src={asset.url}
              width={asset.width}
              height={asset.height}
            />
          </UploadPreview>
        }
        afterTitle={asset.infected && <UploadThreatTriangle />}
      />
    ),
  },
  {
    name: 'size',
    label: 'Size',
    renderCell: (asset) => asset.size,
  },
];

export default function Assets() {
  const [layout, setLayout] = useInMemoryTableLayout({
    columns: [
      { name: 'filename', width: 0.7 },
      { name: 'size', width: 0.3 },
    ],
  });

  return (
    <Table columns={COLUMNS} layout={layout} onLayoutChange={setLayout}>
      <Table.Header />
      <Table.Body>
        {ASSETS.map((asset) => (
          <Table.Row key={asset.id} row={asset} />
        ))}
      </Table.Body>
    </Table>
  );
}
```

On a small viewport, the table shows only the columns that fit at their
`minWidth` (120px by default): the columns with the lowest `priority` go
first, and the first column always stays. The stored layout does not
change.

## Rows that open

With `onOpen`, a click on the row, Enter or Space opens it, for example in
the panel of a [List and detail](https://react-ui.datocms.com/Patterns/ListAndDetail.md). A click on a
link, a button or an input in the row does not. `active` marks the open
row, and with `openWithArrows`, Up and Down open the previous or the next
row.

`trailing` holds the controls of a row (an “Open” button, a ⋮ menu), in a
column at the end of each row with the width `trailingWidth`. They show
when the pointer or the focus is on the row. With `to` (a page of DatoCMS),
the cells of the row are a link instead of `onOpen`.

```tsx
import Button from 'datocms-react-ui/Button';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import IconTrigger from 'datocms-react-ui/Dropdown/triggers/IconTrigger';
import { Table, useInMemoryTableLayout } from 'datocms-react-ui/Table';
import React, { useState } from 'react';
import { ActionToggleIcon, DeleteIcon } from '@/icons';
import { COLUMNS, DEFAULT_LAYOUT, MODELS } from './data';

// The width of the controls of a row: a micro button and a menu
const CONTROLS_WIDTH = 96;

export default function OpenRows() {
  const [layout, setLayout] = useInMemoryTableLayout(DEFAULT_LAYOUT);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <Table
        columns={COLUMNS}
        layout={layout}
        onLayoutChange={setLayout}
        trailingWidth={CONTROLS_WIDTH}
      >
        <Table.Header />
        <Table.Body>
          {MODELS.map((model) => (
            <Table.Row
              key={model.id}
              row={model}
              onOpen={() => setOpenId(model.id)}
              active={model.id === openId}
              openWithArrows={openId !== null}
              trailing={
                <>
                  <Button tone="ghost" size="micro" label="Open" />
                  <Dropdown
                    triggerComponent={IconTrigger}
                    icon={ActionToggleIcon}
                  >
                    <Dropdown.Menu>
                      <Dropdown.Option
                        icon={<DeleteIcon />}
                        alert={true}
                        onPick={() => undefined}
                      >
                        Delete
                      </Dropdown.Option>
                    </Dropdown.Menu>
                  </Dropdown>
                </>
              }
            />
          ))}
        </Table.Body>
      </Table>
      <p>Open row: {openId ?? 'none'}</p>
    </>
  );
}
```

`actions` makes the row a region of the registry (see the Actions page):
its keys work while the pointer or the focus is in the row. Build the
actions in a hook of your plugin, and give the same ids to the panel of the
open row.

```tsx
import { type Action, Shortcut } from 'datocms-react-ui/Actions';
import {
  Table,
  useClientSort,
  useInMemoryTableLayout,
} from 'datocms-react-ui/Table';
import React, { useState } from 'react';
import { COLUMNS, DEFAULT_LAYOUT, MODELS } from './data';

const ARCHIVE_SHORTCUT = { key: 'e' } as const;

export default function RowActions() {
  const [layout, setLayout] = useInMemoryTableLayout(DEFAULT_LAYOUT);
  const { rows, sort } = useClientSort(MODELS, COLUMNS);
  const [archived, setArchived] = useState<string[]>([]);

  const archiveAction = (name: string): Action[] => [
    {
      id: 'model.archive',
      name: `Archive ${name}`,
      shortcut: ARCHIVE_SHORTCUT,
      run: () => setArchived((names) => [...names, name]),
    },
  ];

  return (
    <>
      <p>
        Point at a row, or move the focus into it, and press{' '}
        <Shortcut keys={ARCHIVE_SHORTCUT} />.
      </p>
      <Table
        columns={COLUMNS}
        layout={layout}
        onLayoutChange={setLayout}
        sort={sort}
      >
        <Table.Header />
        <Table.Body>
          {rows.map((model) => (
            <Table.Row
              key={model.id}
              row={model}
              actions={archiveAction(model.name)}
            />
          ))}
        </Table.Body>
      </Table>
      <p>Archived: {archived.join(', ') || 'none'}</p>
    </>
  );
}
```

Give `muted` to the row of an element that is off (a deactivated user). Its
text is subtle and its images fade, but the user can still open it. A [`Pill`](https://react-ui.datocms.com/Content/Pill.md)
in the row says why.

```tsx
import InitialsAvatar from 'datocms-react-ui/InitialsAvatar';
import Pill from 'datocms-react-ui/Pill';
import {
  Table,
  type TableColumn,
  useInMemoryTableLayout,
} from 'datocms-react-ui/Table';
import React, { useState } from 'react';

type Collaborator = {
  id: string;
  name: string;
  role: string;
  deactivated: boolean;
};

const COLLABORATORS: Collaborator[] = [
  { id: 'ada', name: 'Ada Lovelace', role: 'Admin', deactivated: false },
  { id: 'grace', name: 'Grace Hopper', role: 'Editor', deactivated: true },
  { id: 'alan', name: 'Alan Turing', role: 'Editor', deactivated: false },
];

const COLUMNS: TableColumn<Collaborator>[] = [
  {
    name: 'name',
    label: 'Name',
    renderCell: (collaborator) => (
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-s)',
        }}
      >
        <InitialsAvatar name={collaborator.name} size={24} />
        {collaborator.name}
        {collaborator.deactivated && <Pill>Deactivated</Pill>}
      </span>
    ),
  },
  {
    name: 'role',
    label: 'Role',
    renderCell: (collaborator) => collaborator.role,
  },
];

export default function MutedRows() {
  const [layout, setLayout] = useInMemoryTableLayout({
    columns: [
      { name: 'name', width: 2 },
      { name: 'role', width: 1 },
    ],
  });
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Table columns={COLUMNS} layout={layout} onLayoutChange={setLayout}>
      <Table.Header />
      <Table.Body>
        {COLLABORATORS.map((collaborator) => (
          <Table.Row
            key={collaborator.id}
            row={collaborator}
            muted={collaborator.deactivated}
            onOpen={() => setOpenId(collaborator.id)}
            active={collaborator.id === openId}
          />
        ))}
      </Table.Body>
    </Table>
  );
}
```

## Selection

`checkboxes` adds a checkbox to the header and to the rows. A row checkbox
shows only on hover, on focus or when the row is selected.
`checkboxes={{ alwaysVisible: true }}` shows them all, while a selection is
in progress and in pickers. The header takes
`selectAll={{ selected, onChange }}`, and each row takes
`selection={{ selected, onSelect, disabled? }}`. Without `to` and
`onOpen`, a click on the row also calls `onSelect`.

```tsx
import { Table, useInMemoryTableLayout } from 'datocms-react-ui/Table';
import React, { useState } from 'react';
import { COLUMNS, DEFAULT_LAYOUT, MODELS } from './data';

export default function Selection() {
  const [layout, setLayout] = useInMemoryTableLayout(DEFAULT_LAYOUT);
  const [selection, setSelection] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelection(
      selection.includes(id)
        ? selection.filter((selected) => selected !== id)
        : [...selection, id],
    );

  return (
    <Table
      columns={COLUMNS}
      layout={layout}
      onLayoutChange={setLayout}
      checkboxes={{ alwaysVisible: selection.length > 0 }}
    >
      <Table.Header
        selectAll={{
          selected: selection.length === MODELS.length,
          onChange: (selected) =>
            setSelection(selected ? MODELS.map((model) => model.id) : []),
        }}
      />
      <Table.Body>
        {MODELS.map((model) => (
          <Table.Row
            key={model.id}
            row={model}
            selection={{
              selected: selection.includes(model.id),
              onSelect: () => toggle(model.id),
            }}
          />
        ))}
      </Table.Body>
    </Table>
  );
}
```

## Reorder

With `reorderable` on the table, `reorder={{ onDrop }}` on the body and
`Table.SortableRow` for the rows, the user drags the rows by their handle.
`reorder.disabled` keeps the handles but not the drag. For a tree that the
user reorders (see "Tree" below), give the parts of your own drag and drop
to `Table.Row` in one `drag={{ wrapperRef, dropIndicator, handle }}` prop.
`handle` is `{ ref }`, or `{ disabled: { reason } }` for a disabled handle
with the reason in a tooltip.

```tsx
import type { SortableDropResult } from 'datocms-react-ui/dnd';
import { Table, useInMemoryTableLayout } from 'datocms-react-ui/Table';
import React, { useState } from 'react';
import { COLUMNS, DEFAULT_LAYOUT, MODELS } from './data';

export default function Reorder() {
  const [layout, setLayout] = useInMemoryTableLayout(DEFAULT_LAYOUT);
  const [models, setModels] = useState(MODELS);

  const handleReorder = ({ source, destination }: SortableDropResult) => {
    const next = [...models];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved!);
    setModels(next);
  };

  return (
    <Table
      columns={COLUMNS}
      layout={layout}
      onLayoutChange={setLayout}
      reorderable={true}
    >
      <Table.Header />
      <Table.Body reorder={{ onDrop: handleReorder }}>
        {models.map((model, index) => (
          <Table.SortableRow
            key={model.id}
            id={model.id}
            index={index}
            row={model}
          />
        ))}
      </Table.Body>
    </Table>
  );
}
```

## Tree

Rows with child rows (the records of a tree model) use `tree` on the table,
and `firstCell` on each row: `indentation` in pixels, and
`expandable={{ open, onToggle }}` on a row with child rows. The table draws
the toggle: its name is the text of the first cell, and a screen reader
hears “expanded” or “collapsed”. A row without `expandable` keeps the space
of the toggle, with a dash when it is nested, so the label of the first
column aligns with the rows. The table does not hide the child rows. Render
them only when their parent is open.

`expandable.busy` shows a spinner while the child rows load.
`expandable.disabled` takes a reason, as the `disabled` prop of a [`Button`](https://react-ui.datocms.com/Actions/Button.md).
For a row that is not a node of the tree (“Load more”), give
`firstCell={{ prefix }}`: its content goes in the space of the toggle.

Open and close the pages with the chevron, or with Enter on the focused
chevron.

```tsx
import {
  Table,
  type TableColumn,
  useInMemoryTableLayout,
} from 'datocms-react-ui/Table';
import React, { useState } from 'react';

type Page = {
  id: string;
  title: string;
  slug: string;
  children?: Page[];
};

const PAGES: Page[] = [
  {
    id: 'home',
    title: 'Home',
    slug: '/',
    children: [
      {
        id: 'about',
        title: 'About us',
        slug: '/about',
        children: [{ id: 'team', title: 'Our team', slug: '/about/team' }],
      },
      { id: 'contact', title: 'Contact', slug: '/contact' },
    ],
  },
  { id: 'blog', title: 'Blog', slug: '/blog' },
];

const COLUMNS: TableColumn<Page>[] = [
  { name: 'title', label: 'Title', renderCell: (page) => page.title },
  { name: 'slug', label: 'Slug', renderCell: (page) => page.slug },
];

const INDENTATION_PER_LEVEL = 30;

export default function Tree() {
  const [layout, setLayout] = useInMemoryTableLayout({
    columns: [
      { name: 'title', width: 2 },
      { name: 'slug', width: 1 },
    ],
  });
  const [openIds, setOpenIds] = useState<string[]>(['home']);

  const toggle = (id: string) =>
    setOpenIds((current) =>
      current.includes(id)
        ? current.filter((openId) => openId !== id)
        : [...current, id],
    );

  const renderRows = (pages: Page[], level: number): React.ReactNode[] =>
    pages.flatMap((page) => {
      const open = openIds.includes(page.id);

      return [
        <Table.Row
          key={page.id}
          row={page}
          firstCell={{
            indentation: level * INDENTATION_PER_LEVEL,
            expandable: page.children
              ? { open, onToggle: () => toggle(page.id) }
              : undefined,
          }}
        />,
        ...(open && page.children ? renderRows(page.children, level + 1) : []),
      ];
    });

  return (
    <Table columns={COLUMNS} layout={layout} onLayoutChange={setLayout} tree>
      <Table.Header />
      <Table.Body>{renderRows(PAGES, 0)}</Table.Body>
    </Table>
  );
}
```

## Custom cells

A row with children has no `row`: give it `Table.Cell` elements, with the
width of the column at `index`, or the whole row with `fill`. Use it for rows
without data, for example an upload in progress or “Load more”.

```tsx
import Button from 'datocms-react-ui/Button';
import { Table, useInMemoryTableLayout } from 'datocms-react-ui/Table';
import React from 'react';
import { COLUMNS, DEFAULT_LAYOUT, MODELS } from './data';

export default function CustomCells() {
  const [layout, setLayout] = useInMemoryTableLayout(DEFAULT_LAYOUT);

  return (
    <Table columns={COLUMNS} layout={layout} onLayoutChange={setLayout}>
      <Table.Header />
      <Table.Body>
        {MODELS.slice(0, 2).map((model) => (
          <Table.Row key={model.id} row={model} />
        ))}
        <Table.Row>
          <Table.Cell index={0}>Being created…</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell index={0} fill={true}>
            <Button tone="ghost" size="micro" label="Load more" />
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}
```

## CSS variables

The content of a custom cell keeps the padding of the cells. A part that
goes out of it, or that lines up with the text of the other rows, uses these
variables of the table:

## CSS variables

- `--horizontal-cell-padding`: The space at the sides of the text of a cell. The first and the last cells line up with the title of the toolbar above the table.
- `--vertical-cell-padding`: The row has the height of one line with the inset of the other lists (--spacing-m). Taller content (an image) keeps only this small padding, thus it does not make the row much higher.
- `--Table-row-min-height`

## Props

### Table

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `columns` | `TableColumn<R>[]` | Yes | | All the columns that the user can show |
| `layout` | `TableLayout` | Yes | | The visible columns and their widths. Get it from a storage adapter (see storage.ts) or from Redux. |
| `onLayoutChange` | `(layout: TableLayout) => void` | Yes | | |
| `sort` | `TableSortState` | No | | The order of the rows: `useClientSort` or a hook of yours gives it. Without it, the user cannot sort from the header. |
| `checkboxes` | `TableCheckboxes` | No | | The header and the rows have a checkbox at their start. The `selectAll` of \<Table.Header> and the `selection` of \<Table.Row> control them. |
| `trailingWidth` | `number` | No | | The width in pixels of a column at the end of each row, outside the columns of the layout and with no label: the controls of the row (see `trailing` of \<Table.Row>). The header keeps the same space empty, so the button of the columns menu sits over it. |
| `reorderable` | `boolean` | No | | The rows have a drag handle at their left. Set it with the `reorder` of \<Table.Body>, or for rows that a library of yours moves (a tree). |
| `tree` | `boolean` | No | | The rows are a tree: the first cell holds the indentation and the toggle |
| `truncate` | `boolean` | No | | The cells show their content on one line, with an ellipsis. A column can change it with its own `truncate`. |
| `className` | `string` | No | | |
| `children` | `ReactNode` | Yes | | |

#### Types

`TableCheckboxes`

```ts
export type TableCheckboxes = {
  /**
   * All the checkboxes show. Without it, a row checkbox shows only on hover,
   * on focus or when the row is selected. Set it while a selection is in
   * progress, and in pickers.
   */
  alwaysVisible?: boolean;
};
```

### TableSortState

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `value` | `TableSort \| null` | Yes | | The column and the direction of the order, or null for no order |
| `onChange` | `(sort: TableSort \| null) => void` | No | | Runs when the user clicks the header of a sortable column. Without it, the header shows the order, but the user cannot change it. |

#### Types

`TableSort`

```ts
export type TableSort = {
  columnName: string;
  direction: SortDirection;
};
```

`SortDirection`

```ts
export type SortDirection = 'asc' | 'desc';
```

### TableCheckboxes

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `alwaysVisible` | `boolean` | No | | All the checkboxes show. Without it, a row checkbox shows only on hover, on focus or when the row is selected. Set it while a selection is in progress, and in pickers. |

### A column

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `name` | `string` | Yes | | The identifier of the column. The layout keeps it. |
| `label` | `Message` | Yes | | The label in the header and in the columns menu |
| `sortable` | `boolean` | No | | The user can sort the rows by this column (with `sort.onChange` on the table) |
| `truncate` | `boolean` | No | | The cell shows its content on one line, and a long text stops at the width of the column with an ellipsis. It overrides the `truncate` prop of the table (true by default). Set it to false for a cell with a layout of its own (images, lists, more lines). |
| `minWidth` | `number` | No | | The smallest width of the column in pixels, with the padding of the cell. When the visible columns do not fit at their smallest width, the table hides the columns with the lowest `priority` (see fitTableLayout). |
| `priority` | `number` | No | | On a narrow table, the columns with a lower priority go first (the default is 0). The first visible column always stays. |
| `renderCell` | `(row: R) => ReactNode` | No | | The content of the cell of this column for a row. A row with its own children does not use it. |

### Table.Header

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `selectAll` | `TableSelectAll` | No | | The checkbox that selects all the rows. It shows only in a table with `checkboxes`. Without it, the checkbox column of the header is empty. |

#### Types

`TableSelectAll`

```ts
export type TableSelectAll = {
  /** All the rows are selected */
  selected: boolean;
  /** Runs when the user clicks the checkbox */
  onChange: (selected: boolean) => void;
};
```

### TableSelectAll

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `selected` | `boolean` | Yes | | All the rows are selected |
| `onChange` | `(selected: boolean) => void` | Yes | | Runs when the user clicks the checkbox |

### Table.Body

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `reorder` | `TableReorder` | No | | The user reorders the rows by their handle. Use Table.SortableRow for the rows and `reorderable` on the table. |
| `className` | `string` | No | | |
| `style` | `React.CSSProperties` | No | | |
| `children` | `ReactNode` | Yes | | The rows |

#### Types

`TableReorder`

```ts
export type TableReorder = {
  /** Runs when the user drops a row at a new position */
  onDrop: (result: SortableDropResult) => void;
  /** The handles show, but the rows stay in place */
  disabled?: boolean;
};
```

### TableReorder

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `onDrop` | `(result: SortableDropResult) => void` | Yes | | Runs when the user drops a row at a new position |
| `disabled` | `boolean` | No | | The handles show, but the rows stay in place |

### Table.Row

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `row` | `R` | No | | The value that the `renderCell` of the columns get |
| `selection` | `RowSelection` | No | | The state of the checkbox of the row, in a table with `checkboxes`. Without `to` and `onOpen`, a click on the row also calls `onSelect`. |
| `drag` | `RowDrag` | No | | The parts that a drag and drop library gives to the row. Table.SortableRow sets them. A tree (the records of a tree model) gives them from its own library. |
| `dragging` | `boolean` | No | | The row shows the look of a row that the user drags |
| `fetching` | `boolean` | No | | The row shows a loading line at its bottom |
| `muted` | `boolean` | No | `false` | The text of the row is subtle and its images fade, but the user can still open it. Use it for an element that is off (for example a deactivated user), with a Pill that says it. |
| `wrapperProps` | ``React.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string>`` | No | | |
| `rowRef` | `Ref<HTMLDivElement>` | No | | The element of the row, without the handle |
| `actions` | `readonly Action[]` | No | | The actions of the row (see `Actions`): their keys work while the pointer or the focus is in the row, and a menu in the row runs them. |
| `rowClassName` | `string` | No | | |
| `firstCell` | `TableFirstCell` | No | | In a tree: the indentation of the row and the toggle of its child rows. In a `tree` table, the first cell keeps the space of the toggle also without it. |
| `trailing` | `ReactNode` | No | | The controls of the row (for example an `Open` button and a menu), in the column at the end of the row (see `trailingWidth` of \<Table>). They show when the pointer is over the row or the focus is in it, and always on a device with no hover. A click in them never opens the row. |
| `children` | `ReactNode` | No | | Cells instead of the cells of the columns. Use \<Table.Cell>. |
| `to` (variant) | `string` | No | | |
| `keepSearch` (variant) | `boolean` | No | | The link keeps the query string of the current page (for example, the filters of the list) |
| `onOpen` (variant) | `() => void` | No | | A click on the row opens it (for example, an event in a side panel). Links and buttons in the row keep their own action. The row takes the focus, and Enter or Space opens it. |
| `active` (variant) | `boolean` | No | | The row is open: it shows the selected color, and it scrolls into view |
| `openWithArrows` (variant) | `boolean` | No | | The Up and Down arrows open the previous or the next row |

#### Types

`RowSelection`

```ts
export type RowSelection = {
  selected: boolean;
  onSelect: (event: React.MouseEvent<HTMLElement>) => void;
  /** The checkbox shows its state, but the user cannot change it */
  disabled?: boolean;
};
```

`RowDrag`

```ts
export type RowDrag = {
  /**
   * The element that the library moves. It has a position, so the drop
   * indicator can be in it.
   */
  wrapperRef?: Ref<HTMLDivElement>;
  /** The line that shows where the row goes */
  dropIndicator?: ReactNode;
  /** Without it, the row has no handle */
  handle?: RowDragHandle;
};
```

`RowDragHandle` — The drag handle on the left of the row: the handle that the library listens to, or a disabled handle with the reason in a tooltip

```ts
export type RowDragHandle =
  /** The user drags the row */
  | { ref: RefCallback; disabled?: never }
  /** The user cannot drag the row now */
  | { disabled: DisabledWithReason; ref?: never };
```

### RowSelection

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `selected` | `boolean` | Yes | | |
| `onSelect` | `(event: React.MouseEvent<HTMLElement>) => void` | Yes | | |
| `disabled` | `boolean` | No | | The checkbox shows its state, but the user cannot change it |

### RowDrag

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `wrapperRef` | `Ref<HTMLDivElement>` | No | | The element that the library moves. It has a position, so the drop indicator can be in it. |
| `dropIndicator` | `ReactNode` | No | | The line that shows where the row goes |
| `handle` | `RowDragHandle` | No | | Without it, the row has no handle |

#### Types

`RowDragHandle` — The drag handle on the left of the row: the handle that the library listens to, or a disabled handle with the reason in a tooltip

```ts
export type RowDragHandle =
  /** The user drags the row */
  | { ref: RefCallback; disabled?: never }
  /** The user cannot drag the row now */
  | { disabled: DisabledWithReason; ref?: never };
```

### Table.SortableRow

The props of `Table.Row` without the drag and drop parts, and:

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | No | | Cells instead of the cells of the columns. Use \<Table.Cell>. |
| `row` | `R` | No | | The value that the `renderCell` of the columns get |
| `dragging` | `boolean` | No | | The row shows the look of a row that the user drags |
| `actions` | `readonly Action[]` | No | | The actions of the row (see `Actions`): their keys work while the pointer or the focus is in the row, and a menu in the row runs them. |
| `selection` | `RowSelection` | No | | The state of the checkbox of the row, in a table with `checkboxes`. Without `to` and `onOpen`, a click on the row also calls `onSelect`. |
| `fetching` | `boolean` | No | | The row shows a loading line at its bottom |
| `muted` | `boolean` | No | `false` | The text of the row is subtle and its images fade, but the user can still open it. Use it for an element that is off (for example a deactivated user), with a Pill that says it. |
| `wrapperProps` | ``React.HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string>`` | No | | |
| `rowRef` | `Ref<HTMLDivElement>` | No | | The element of the row, without the handle |
| `rowClassName` | `string` | No | | |
| `firstCell` | `TableFirstCell` | No | | In a tree: the indentation of the row and the toggle of its child rows. In a `tree` table, the first cell keeps the space of the toggle also without it. |
| `trailing` | `ReactNode` | No | | The controls of the row (for example an `Open` button and a menu), in the column at the end of the row (see `trailingWidth` of \<Table>). They show when the pointer is over the row or the focus is in it, and always on a device with no hover. A click in them never opens the row. |
| `to` (variant) | `string` | No | | |
| `keepSearch` (variant) | `boolean` | No | | The link keeps the query string of the current page (for example, the filters of the list) |
| `onOpen` (variant) | `() => void` | No | | A click on the row opens it (for example, an event in a side panel). Links and buttons in the row keep their own action. The row takes the focus, and Enter or Space opens it. |
| `active` (variant) | `boolean` | No | | The row is open: it shows the selected color, and it scrolls into view |
| `openWithArrows` (variant) | `boolean` | No | | The Up and Down arrows open the previous or the next row |
| `id` | `string` | Yes | | The identifier of the row in the Table.Body with `reorder` |
| `index` | `number` | Yes | | The position of the row in the Table.Body with `reorder` |

#### Types

`RowSelection`

```ts
export type RowSelection = {
  selected: boolean;
  onSelect: (event: React.MouseEvent<HTMLElement>) => void;
  /** The checkbox shows its state, but the user cannot change it */
  disabled?: boolean;
};
```

### Table.Cell

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `index` | `number` | Yes | | The position of the column. The cell gets the width of the column. |
| `fill` | `boolean` | No | | A cell that is not in a column fills the row |
| `firstCell` | `TableFirstCell` | No | | The first cell of a tree row puts its content in a wrapper with the indentation and the toggle |
| `truncate` | `boolean` | No | | The content stays on one line and stops with an ellipsis |
| `children` | `ReactNode` | No | | |

#### Types

`TableFirstCell` — The first cell of a tree row: the indentation and the toggle of the child rows

```ts
export type TableFirstCell = {
  /** The indentation in pixels */
  indentation?: number;
} & (TreeNodeFirstCell | CustomFirstCell);
```

`TreeNodeFirstCell` — A node of the tree

```ts
type TreeNodeFirstCell = {
  /**
   * Give it when the row has child rows: the first cell shows the toggle
   * that opens and closes them. Without it, the row keeps the space of the
   * toggle, with a dash when the row is nested.
   */
  expandable?: TableRowExpandable;
  prefix?: never;
};
```

`CustomFirstCell` — A row that is not a node of the tree (for example a "Load more" row)

```ts
type CustomFirstCell = {
  /** The content in the space of the toggle */
  prefix: ReactNode;
  expandable?: never;
};
```

### TableFirstCell

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `indentation` | `number` | No | | The indentation in pixels |
| `expandable` (variant) | `TableRowExpandable` | No | | Give it when the row has child rows: the first cell shows the toggle that opens and closes them. Without it, the row keeps the space of the toggle, with a dash when the row is nested. |
| `prefix` (variant) | `ReactNode` | No | | The content in the space of the toggle |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

Group 1

| Variant | Props | Description |
| - | - | - |
| `TreeNodeFirstCell` | `expandable` | A node of the tree |
| `CustomFirstCell` | `prefix` | A row that is not a node of the tree (for example a "Load more" row) |

### TableRowExpandable

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `open` | `boolean` | Yes | | True when the child rows show |
| `onToggle` | `() => void` | Yes | | Runs when the user clicks the toggle |
| `busy` | `boolean` | No | | The child rows load: a spinner replaces the chevron, and the toggle does nothing |
| `disabled` | `Disabled` | No | | The user cannot open or close the child rows. Give a reason when the user must know why. |

### EntityCell

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `title` | `Message` | Yes | | The title of the entity, for example the title of a record or the name of an asset |
| `afterTitle` | `ReactNode` | No | | The content after the title, for example a status, a validity triangle or the avatars of the users that look at the entity |
| `image` (variant) | `ReactNode` | No | | The image before the title, 35px square. Without it, the title starts at the edge of the cell. |
| `preview` (variant) | `ReactNode` | No | | The preview before the title, with its own size: the thumbnail of an asset |

### LinkCell

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `to` | `string` | Yes | | The path of the link |
| `children` | `string` | Yes | | The text of the link: a string, so the title can show it |

### StatusCell

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `tone` | `FeedbackDotProps['tone']` | Yes | | The color of the dot |
| `children` | `React.ReactNode` | Yes | | The label after the dot |

### IconCell

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `icon` | `React.ReactNode` | Yes | | The icon before the label (an SVG element) |
| `children` | `React.ReactNode` | Yes | | The label |

### TimeCell

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `value` | `string` | Yes | | The date, as an ISO 8601 string |
