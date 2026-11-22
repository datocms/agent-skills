# ListArea

The area of the list of a page, under the title bar of the [`Pane`](https://react-ui.datocms.com/Layout/Pane.md): the space
around the table and the notices above it. Every list of a page uses it, with
or without a detail: the records table of a model in DatoCMS, the list of
the webhooks. [`ListDetail.Page`](https://react-ui.datocms.com/Layout/Page.md) already uses it.

Do not write its class by hand.

Other components for other cases:

- A list with a detail of the open row is [`ListDetail`](https://react-ui.datocms.com/Patterns/ListAndDetail.md).
- A list with nothing to show is a [`BlankSlate`](https://react-ui.datocms.com/Feedback/BlankSlate.md) in the area.

## Table

```tsx
import ListArea from 'datocms-react-ui/ListArea';
import {
  Table,
  useClientSort,
  useInMemoryTableLayout,
} from 'datocms-react-ui/Table';
import React from 'react';
import { COLUMNS, DEFAULT_LAYOUT, MODELS } from '../../Table/examples/data';

export default function WithTable() {
  const [layout, setLayout] = useInMemoryTableLayout(DEFAULT_LAYOUT);
  const { rows, sort } = useClientSort(MODELS, COLUMNS);

  return (
    <div style={{ height: 320, overflow: 'auto' }}>
      <ListArea>
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
      </ListArea>
    </div>
  );
}
```

## Blank slate

A [`BlankSlate`](https://react-ui.datocms.com/Feedback/BlankSlate.md) in the area stays in the center of the scrolling content of
the [`Pane`](https://react-ui.datocms.com/Layout/Pane.md). The area has no height of its own, so a short pane shows no
scroll bar. It is the “no results” state or the loading state of a list.

```tsx
import BlankSlate from 'datocms-react-ui/BlankSlate';
import ListArea from 'datocms-react-ui/ListArea';
import React from 'react';
import { SearchIcon } from '@/icons';

export default function WithBlankSlate() {
  return (
    // The box is the Pane__content of a page: the scroll container that holds
    // the blank slate
    <div style={{ position: 'relative', height: 320, overflow: 'auto' }}>
      <ListArea>
        <BlankSlate
          placement="area"
          icon={<SearchIcon />}
          title="No results"
          description="No model has this name. Try another search."
        />
      </ListArea>
    </div>
  );
}
```

**Do:** Put the table, the notices above it, or a BlankSlate in the area.

`<ListArea><Table …/></ListArea>`

**Don’t:** Do not add padding or a wrapper around the table: the area gives the space.

`<div style={{ padding: 16 }}><Table …/></div>`

