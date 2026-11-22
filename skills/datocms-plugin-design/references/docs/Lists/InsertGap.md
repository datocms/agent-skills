# InsertGap

A thin space between two items of a list (blocks, records, rows of a form),
where the user adds an item at that position. The small “+” button shows in
the gutter on the left of the items when the pointer is near the gap, and a
line shows where the item goes. The whole gap is the button, so it is easy
to click, and it never changes its height: the content does not move.

Other components for other cases:

- A button that adds an item at the end of an empty list goes in an [`EmptySlot`](https://react-ui.datocms.com/Lists/EmptySlot.md).
- The button of a list that is not between items is a plain [`Button`](https://react-ui.datocms.com/Actions/Button.md).

## Menu

When the user has a choice to make (a block model, or paste), give the
options as `children`. The menu opens under the start of the gap.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import InsertGap, { insertGapListProps } from 'datocms-react-ui/InsertGap';
import React, { useState } from 'react';
import { AddIcon, FolderOpenIcon } from '@/icons';

const GAP = 24;
const GUTTER = 32;

export default function Blocks() {
  const [blocks, setBlocks] = useState([
    { id: 1, name: 'Hero' },
    { id: 2, name: 'Text' },
    { id: 3, name: 'Gallery' },
  ]);

  const add = (name: string, index: number) =>
    setBlocks((current) => [
      ...current.slice(0, index),
      { id: Date.now(), name },
      ...current.slice(index),
    ]);

  const gap = (position: 'before' | 'after', index: number) => (
    // A menu: the user picks a block model or pastes a block
    <InsertGap position={position} label="Add a block">
      <Dropdown.Option icon={<AddIcon />} onPick={() => add('Text', index)}>
        Text
      </Dropdown.Option>
      <Dropdown.Option icon={<AddIcon />} onPick={() => add('Gallery', index)}>
        Gallery
      </Dropdown.Option>
      <Dropdown.Option
        icon={<FolderOpenIcon />}
        onPick={() => add('Pasted block', index)}
      >
        Paste block
      </Dropdown.Option>
    </InsertGap>
  );

  return (
    // The pointer handlers show the buttons of the gaps near the pointer
    <div
      {...insertGapListProps}
      style={{ marginLeft: GUTTER, paddingTop: GAP }}
    >
      {blocks.map(({ id, name }, index) => (
        <div
          key={id}
          // The item has a position, and it gives the size of the gap and
          // the width of the gutter at the left
          style={
            {
              position: 'relative',
              marginBottom: GAP,
              padding: 'var(--spacing-m)',
              border: '1px solid var(--color--border)',
              borderRadius: 'var(--radius-m)',
              '--InsertGap-size': `${GAP}px`,
              '--InsertGap-gutter': `${GUTTER}px`,
            } as React.CSSProperties
          }
        >
          {index === 0 && gap('before', 0)}
          {name}
          {gap('after', index + 1)}
        </div>
      ))}
    </div>
  );
}
```

## Add at once

When there is no choice (one model), give `onTrigger`: the click adds the
item. Say it in the `label`, for example “Add a header”. The label is the
tooltip and the accessible name.

```tsx
import InsertGap, { insertGapListProps } from 'datocms-react-ui/InsertGap';
import React, { useState } from 'react';

const GAP = 24;
const GUTTER = 32;

export default function AddAtOnce() {
  const [count, setCount] = useState(2);

  return (
    <div
      {...insertGapListProps}
      style={{ marginLeft: GUTTER, paddingTop: GAP }}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: the rows have no id
          key={index}
          style={
            {
              position: 'relative',
              marginBottom: GAP,
              padding: 'var(--spacing-m)',
              border: '1px solid var(--color--border)',
              borderRadius: 'var(--radius-m)',
              '--InsertGap-size': `${GAP}px`,
              '--InsertGap-gutter': `${GUTTER}px`,
            } as React.CSSProperties
          }
        >
          Header {index + 1}
          {/* A function: the click adds the item at once, with no menu */}
          <InsertGap
            position="after"
            label="Add a header"
            onTrigger={() => setCount((value) => value + 1)}
          />
        </div>
      ))}
    </div>
  );
}
```

## Setup

Each item renders a gap with `position="before"`, and the last item also
renders a gap with `position="after"`: the gap that adds at the end. The new
item of a `before` gap gets the index of its item, and the new item of the
`after` gap gets the index after the last item.

The item that renders the gap needs these things:

- A CSS `position`, because the gap is absolute in it.
- `--InsertGap-size`: the space between two items. It is the height of the
  gap.
- `--InsertGap-gutter`: the width of the column on the left of the items.
  The small button is in the middle of it (in a form, the column of the
  grips).
- The element of the list gets `insertGapListProps` (`datocms-react-ui/InsertGap`):
  `<div className="MyList" {...insertGapListProps}>`. They show only the
  gaps that are near the pointer. On a touch device, the gaps always show.

## Props

### InsertGap (add at once)

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `position` | `'before' \| 'after'` | Yes | | Where the gap is, in relation to the item that renders it: `before` is above the item, `after` is below it. |
| `label` | `TextMessage` | Yes | | What a click on the gap does. For example "Add a block". It is the accessible name of the gap and the text of the tooltip of the small button. |
| `onTrigger` | `() => void` | Yes | | Runs on a click on the gap. |

### InsertGap (menu)

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `position` | `'before' \| 'after'` | Yes | | Where the gap is, in relation to the item that renders it: `before` is above the item, `after` is below it. |
| `label` | `TextMessage` | Yes | | What a click on the gap does. For example "Add a block". It is the accessible name of the gap and the text of the tooltip of the small button. |
| `children` | `ReactNode` | Yes | | The options of the menu that a click on the gap opens. |
