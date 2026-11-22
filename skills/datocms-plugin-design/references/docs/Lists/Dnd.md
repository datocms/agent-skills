# Drag and drop

Use the primitives of `datocms-react-ui/dnd` for all the drag and drop.
They use native HTML5 drag and drop. Do not add another drag-and-drop
library.

| Use | For |
| - | - |
| `SortableList` and `SortableItem` | A flat list that the user reorders: rows, cards, pills, table columns. |
| `SortableContainer` | More than one list, where an item can move from one to another. |
| `SortableTree` | A nested list with reparenting: the sidebars, the tree of records. |
| `useFileDropTarget` and `useFilePicker` | Files from the computer. |
| `useDraggable`, `useDropTarget`, `useDragMonitor` | A custom interaction, for example an upload card dropped on a collection. |

## Sortable list

`SortableList` renders no element and gets the new place of an item in
`onDrop`. `destination.index` is the index of the item after the move. Use
`reorder` from `datocms-react-ui/dnd` to change the array.

Each `SortableItem` gives its `ref` to the element that moves, a `handleRef`
for the grip, and a `dropIndicator` that shows where the item goes. Give the
`handleRef` to a `DragHandle`. It draws the grip, which shows when the
pointer is on the item. With `gutter`, the grip goes on the left of the
item, outside its content, in a column of `--DragHandle-gutter`. Keep this
space on the left of the list. The element with the `ref` must have a CSS
`position`.

```tsx
import {
  DragHandle,
  reorder,
  type SortableDropResult,
  SortableItem,
  SortableList,
} from 'datocms-react-ui/dnd';
import React, { useState } from 'react';

type Row = { id: string; title: string };

export default function SortableRows() {
  const [rows, setRows] = useState<Row[]>([
    { id: '1', title: 'Homepage' },
    { id: '2', title: 'Pricing' },
    { id: '3', title: 'Contact us' },
    { id: '4', title: 'Careers' },
  ]);

  // `destination.index` is the index after the move
  const handleDrop = (result: SortableDropResult) =>
    setRows((current) => reorder(current, result));

  return (
    // The list renders no element: put the items in any structure
    <SortableList onDrop={handleDrop}>
      <div style={{ marginLeft: 'var(--DragHandle-gutter)' }}>
        {rows.map((row, index) => (
          <SortableItem key={row.id} id={row.id} index={index} handle>
            {({ ref, handleRef, isDragging, dropIndicator }) => (
              <div
                // The element must have a position: the drop line is
                // absolute in it
                ref={ref}
                style={{
                  position: 'relative',
                  padding: 'var(--spacing-s) var(--spacing-m)',
                  borderBottom: '1px solid var(--color--border)',
                  opacity: isDragging ? 0.4 : 1,
                }}
              >
                <DragHandle ref={handleRef} gutter="normal" />
                {row.title}
                {dropIndicator}
              </div>
            )}
          </SortableItem>
        ))}
      </div>
    </SortableList>
  );
}
```

**Do:** Give the drag handle to a row that has other controls (links, buttons).

Use `handle` and `handleRef`.

**Don’t:** Do not put a draggable link or image in an item, because the inner element wins the drag.

Set `draggable={false}` on them.

## Horizontal list

Set `axis="horizontal"` for a row of items. The drop line is vertical.

```tsx
import {
  reorder,
  type SortableDropResult,
  SortableItem,
  SortableList,
} from 'datocms-react-ui/dnd';
import React, { useState } from 'react';

export default function HorizontalList() {
  const [tags, setTags] = useState(['Design', 'Product', 'Engineering', 'Ops']);

  const handleDrop = (result: SortableDropResult) =>
    setTags((current) => reorder(current, result));

  return (
    <SortableList axis="horizontal" onDrop={handleDrop}>
      <div style={{ display: 'flex', gap: 'var(--spacing-s)' }}>
        {tags.map((tag, index) => (
          <SortableItem key={tag} id={tag} index={index}>
            {({ ref, isDragging, dropIndicator }) => (
              <div
                ref={ref}
                style={{
                  position: 'relative',
                  padding: 'var(--spacing-s) var(--spacing-m)',
                  cursor: 'grab',
                  border: '1px solid var(--color--border)',
                  borderRadius: 'var(--radius-s)',
                  opacity: isDragging ? 0.4 : 1,
                }}
              >
                {tag}
                {dropIndicator}
              </div>
            )}
          </SortableItem>
        ))}
      </div>
    </SortableList>
  );
}
```

## Several lists

`SortableContainer` gives a name to each list. The drop result has the
`containerId` of the source and of the destination. A drop on the empty
space of a container puts the item after its last item. Use `canDropInto` to
refuse a drop in some containers.

```tsx
import {
  SortableContainer,
  type SortableDropResult,
  SortableItem,
  SortableList,
} from 'datocms-react-ui/dnd';
import React, { useState } from 'react';

type Columns = Record<string, string[]>;

export default function Containers() {
  const [columns, setColumns] = useState<Columns>({
    todo: ['Write the docs', 'Fix the tooltip'],
    done: ['Ship the table'],
  });

  // The destination can be in another container
  const handleDrop = ({ source, destination }: SortableDropResult) =>
    setColumns((current) => {
      const next = { ...current };
      const from = [...next[source.containerId]];
      const [moved] = from.splice(source.index, 1);
      next[source.containerId] = from;
      const to =
        destination.containerId === source.containerId
          ? from
          : [...next[destination.containerId]];
      to.splice(destination.index, 0, moved);
      next[destination.containerId] = to;
      return next;
    });

  return (
    <SortableList onDrop={handleDrop}>
      <div style={{ display: 'flex', gap: 'var(--spacing-l)' }}>
        {Object.entries(columns).map(([name, cards]) => (
          <SortableContainer key={name} id={name} itemCount={cards.length}>
            {({ ref, isOver }) => (
              <div
                ref={ref}
                style={{
                  flex: 1,
                  minHeight: 120,
                  padding: 'var(--spacing-s)',
                  border: `1px solid var(--color--${isOver ? 'primary--surface' : 'border'})`,
                  borderRadius: 'var(--radius-m)',
                }}
              >
                <strong>{name}</strong>
                {cards.map((card, index) => (
                  <SortableItem key={card} id={card} index={index}>
                    {({ ref: itemRef, isDragging, dropIndicator }) => (
                      <div
                        ref={itemRef}
                        style={{
                          position: 'relative',
                          marginTop: 'var(--spacing-s)',
                          padding: 'var(--spacing-s)',
                          cursor: 'grab',
                          background: 'var(--color--surface-raised)',
                          opacity: isDragging ? 0.4 : 1,
                        }}
                      >
                        {card}
                        {dropIndicator}
                      </div>
                    )}
                  </SortableItem>
                ))}
              </div>
            )}
          </SortableContainer>
        ))}
      </div>
    </SortableList>
  );
}
```

## Tree

`SortableTree` is a nested list. The user changes the order and moves an
item into another item. Give the items in `tree` and draw each row in
`renderItem`. `onDragEnd` gets the old and the new place. Give them to
`moveItemOnTree` to change the tree. `canNest` says which items take
children. The sidebars use it through [`SidebarTree`](https://react-ui.datocms.com/Navigation/SidebarTree.md). [`TreeRow`](https://react-ui.datocms.com/Lists/TreeRow.md) is a ready
row of a tree, with the chevron or the grip.

By default, the user drags a row from any point of it. With `handle`, the
user drags a row only from the element of `provided.dragHandleRef`, and a
row without this element does not move. Use it for rows with a grip and a
link.

```tsx
import {
  moveItemOnTree,
  SortableTree,
  type TreeData,
  type TreeDestinationPosition,
  type TreeSourcePosition,
} from 'datocms-react-ui/dnd';
import React, { useState } from 'react';

type Page = { title: string; folder?: boolean };

const initialTree: TreeData<Page> = {
  rootId: 'root',
  items: {
    root: { id: 'root', children: ['marketing', 'company', 'contact'] },
    marketing: {
      id: 'marketing',
      children: ['home', 'pricing'],
      hasChildren: true,
      isExpanded: true,
      data: { title: 'Marketing', folder: true },
    },
    home: { id: 'home', children: [], data: { title: 'Homepage' } },
    pricing: { id: 'pricing', children: [], data: { title: 'Pricing' } },
    company: {
      id: 'company',
      children: ['careers'],
      hasChildren: true,
      isExpanded: true,
      data: { title: 'Company', folder: true },
    },
    careers: { id: 'careers', children: [], data: { title: 'Careers' } },
    contact: { id: 'contact', children: [], data: { title: 'Contact us' } },
  },
};

export default function Tree() {
  const [tree, setTree] = useState(initialTree);

  const handleDragEnd = (
    source: TreeSourcePosition,
    destination?: TreeDestinationPosition,
  ) => {
    if (destination) {
      setTree((current) => moveItemOnTree(current, source, destination));
    }
  };

  return (
    <SortableTree
      tree={tree}
      onDragEnd={handleDragEnd}
      // Only a folder takes other pages in it
      canNest={(item) => Boolean(item.data?.folder)}
      offsetPerLevel={24}
      renderItem={({ item, provided, snapshot }) => (
        // Without a DragHandle, the whole row is the handle. The row must
        // have a position: the drop line is absolute in it.
        <div
          ref={provided.innerRef}
          style={{
            ...provided.draggableProps.style,
            position: 'relative',
            paddingTop: 'var(--spacing-s)',
            paddingBottom: 'var(--spacing-s)',
            fontWeight: item.data?.folder
              ? 'var(--font-weight-strong)'
              : undefined,
            opacity: snapshot.isDragging ? 0.4 : 1,
          }}
        >
          {item.data?.title}
          {provided.dropIndicator}
        </div>
      )}
    />
  );
}
```

## Custom interaction

`useDraggable`, `useDropTarget`, `useDragMonitor` and `useActiveDrag` are
the parts that the lists and the tree use. Use them only when no list fits,
for example a card that the user drops on a collection. Give the drag data
a `kind` (`getData` returns `{ kind, … }`). The drop targets and the
monitors filter on it, so two kinds of drag do not interact.

## Custom drag picture

During a drag, the browser shows a picture that moves with the pointer.
`preview` (on `useDraggable` and `SortableItem`) sets it:

| `preview` | The picture | For example |
| - | - | - |
| `'element'` (default) | A copy of the element. | The rows of a list. |
| `'none'` | No picture: the element itself shows the drag. | The blocks of a text editor. |
| A function that returns an element of the page | A copy of that element, at its place under the pointer. Add it to the page, and remove it in the next frame. | A tall frame: the picture shows the frame without its body. |
| A function that returns an `Image` | The image, with its corner at the pointer. | The number of files in the drag. |

The function runs when the drag starts, and the browser takes the picture at
once. So an image must load before the drag: make it when the content of
the picture changes, not in the function. Use a PNG (a `canvas` gives one),
because the browser does not show an SVG. The browser shows the image at its
size in pixels, so do not scale the canvas for the density of the screen.

Select two files and drag one on the archive.

```tsx
import {
  type DragData,
  dropTargetClassName,
  getDragData,
  useDraggable,
  useDropTarget,
} from 'datocms-react-ui/dnd';
import React, { useEffect, useRef, useState } from 'react';

const FILE_KIND = 'archive-file';

type FileDragData = DragData & { kind: typeof FILE_KIND; names: string[] };

// Draws the picture of the drag: a pill with the number of files. The
// browser shows an image only when it is loaded, thus the image loads
// before the drag. Use a PNG: the browser does not show an SVG. The browser
// shows the image at its size in pixels, thus do not scale the canvas for
// the density of the screen: the picture then shows twice as large.
const WIDTH = 60;
const HEIGHT = 22;

function useCounterPicture(count: number) {
  const picture = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const canvas = document.createElement('canvas');
    const label = count === 1 ? '1 file' : `${count} files`;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = styles.getPropertyValue('--color--primary--surface');
    context.beginPath();
    context.roundRect(0, 0, WIDTH, HEIGHT, 4);
    context.fill();
    context.fillStyle = styles.getPropertyValue('--color--primary--ink');
    context.font = `600 12px ${getComputedStyle(document.body).fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, WIDTH / 2, HEIGHT / 2);

    const image = new Image(WIDTH, HEIGHT);
    image.src = canvas.toDataURL('image/png');
    picture.current = image;
  }, [count]);

  return picture;
}

function FileCard({
  name,
  selected,
  dragNames,
  picture,
  onToggle,
}: {
  name: string;
  selected: boolean;
  // The files that move when the user drags this card
  dragNames: string[];
  picture: React.MutableRefObject<HTMLImageElement | null>;
  onToggle: () => void;
}) {
  const { ref, isDragging } = useDraggable({
    getData: (): FileDragData => ({ kind: FILE_KIND, names: dragNames }),
    preview: () => picture.current,
  });

  return (
    <label
      ref={ref}
      style={{
        display: 'flex',
        gap: 'var(--spacing-s)',
        padding: 'var(--spacing-s) var(--spacing-m)',
        cursor: 'grab',
        background: selected
          ? 'var(--color--selected--surface)'
          : 'var(--color--surface-raised)',
        border: '1px solid var(--color--border)',
        borderRadius: 'var(--radius-s)',
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <input type="checkbox" checked={selected} onChange={onToggle} />
      {name}
    </label>
  );
}

export default function CustomPreview() {
  const [files, setFiles] = useState(['hero.jpg', 'logo.svg', 'team.png']);
  const [selection, setSelection] = useState<string[]>([]);
  const [archived, setArchived] = useState<string[]>([]);

  // One picture for a card alone, one for the selection
  const onePicture = useCounterPicture(1);
  const selectionPicture = useCounterPicture(selection.length || 1);

  const { ref, isOver } = useDropTarget({
    canDrop: (source) => getDragData(source).kind === FILE_KIND,
    onDrop: ({ source }) => {
      const { names } = getDragData(source) as FileDragData;
      setFiles((current) => current.filter((file) => !names.includes(file)));
      setSelection((current) => current.filter((f) => !names.includes(f)));
      setArchived((current) => [...current, ...names]);
    },
  });

  const toggle = (name: string) =>
    setSelection((current) =>
      current.includes(name)
        ? current.filter((file) => file !== name)
        : [...current, name],
    );

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-l)' }}>
      <div
        style={{
          display: 'grid',
          flex: 1,
          gap: 'var(--spacing-s)',
          alignContent: 'start',
        }}
      >
        {files.map((name) => {
          // A selected card moves all the selection
          const inSelection = selection.includes(name);
          return (
            <FileCard
              key={name}
              name={name}
              selected={inSelection}
              dragNames={inSelection ? selection : [name]}
              picture={inSelection ? selectionPicture : onePicture}
              onToggle={() => toggle(name)}
            />
          );
        })}
      </div>
      <div
        ref={ref}
        className={dropTargetClassName({ isOver })}
        style={{
          flex: 1,
          padding: 'var(--spacing-m)',
          border: '1px dashed var(--color--border)',
          borderRadius: 'var(--radius-m)',
        }}
      >
        <strong>Archive</strong>
        <div>{archived.length > 0 ? archived.join(', ') : 'No files'}</div>
      </div>
    </div>
  );
}
```

## Refuse a drop

Give `canDrop` to `useDropTarget`. A target that refuses the drag does not
get `isOver` and does not run `onDrop`, and the browser shows the "no drop"
cursor. To show the targets that refuse the drag before the pointer gets
there, read the drag with `useActiveDrag(kind)` and give `refused` to
`dropTargetClassName`.

The collections of the Media Area refuse a file that is already in them, and
a file that the role cannot move. Drag a file on the collections.

```tsx
import {
  type DragData,
  dropTargetClassName,
  getDragData,
  useActiveDrag,
  useDraggable,
  useDropTarget,
} from 'datocms-react-ui/dnd';
import React, { useState } from 'react';

const FILE_KIND = 'collection-file';

type File = { name: string; collection: string };
type Collection = { name: string; locked: boolean };
type FileDragData = DragData & { kind: typeof FILE_KIND; file: File };

const COLLECTIONS: Collection[] = [
  { name: 'Blog', locked: false },
  { name: 'Products', locked: false },
  { name: 'Legal', locked: true },
];

// A collection takes a file that is not in it yet. A locked collection
// takes no file.
function accepts(collection: Collection, file: File) {
  return !collection.locked && file.collection !== collection.name;
}

function FileCard({ file }: { file: File }) {
  const { ref, isDragging } = useDraggable({
    getData: (): FileDragData => ({ kind: FILE_KIND, file }),
  });

  return (
    <div
      ref={ref}
      style={{
        padding: 'var(--spacing-s) var(--spacing-m)',
        cursor: 'grab',
        background: 'var(--color--surface-raised)',
        border: '1px solid var(--color--border)',
        borderRadius: 'var(--radius-s)',
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {file.name} <small>in {file.collection}</small>
    </div>
  );
}

function CollectionTarget({
  collection,
  onMove,
}: {
  collection: Collection;
  onMove: (file: File) => void;
}) {
  // A refused drop does not make the target "over", and does not run onDrop
  const { ref, isOver } = useDropTarget({
    canDrop: (source) => {
      const data = getDragData(source);
      return (
        data.kind === FILE_KIND &&
        accepts(collection, (data as FileDragData).file)
      );
    },
    onDrop: ({ source }) => onMove((getDragData(source) as FileDragData).file),
  });

  // The drag in progress, also when the pointer is not on this target
  const activeDrag = useActiveDrag<FileDragData>(FILE_KIND);
  const refused = !!activeDrag && !accepts(collection, activeDrag.file);

  return (
    <div
      ref={ref}
      className={dropTargetClassName({ isOver, refused })}
      style={{
        padding: 'var(--spacing-s) var(--spacing-m)',
        border: '1px dashed var(--color--border)',
        borderRadius: 'var(--radius-s)',
      }}
    >
      {collection.name}
      {collection.locked && ' (locked)'}
    </div>
  );
}

export default function RefuseDrop() {
  const [files, setFiles] = useState<File[]>([
    { name: 'hero.jpg', collection: 'Blog' },
    { name: 'shoe.png', collection: 'Products' },
  ]);

  const move = (file: File, collection: string) =>
    setFiles((current) =>
      current.map((item) =>
        item.name === file.name ? { ...item, collection } : item,
      ),
    );

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-l)' }}>
      <div
        style={{
          display: 'grid',
          flex: 1,
          gap: 'var(--spacing-s)',
          alignContent: 'start',
        }}
      >
        {files.map((file) => (
          <FileCard key={file.name} file={file} />
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          flex: 1,
          gap: 'var(--spacing-s)',
          alignContent: 'start',
        }}
      >
        {COLLECTIONS.map((collection) => (
          <CollectionTarget
            key={collection.name}
            collection={collection}
            onMove={(file) => move(file, collection.name)}
          />
        ))}
      </div>
    </div>
  );
}
```

In a list, `canDropInto` of `SortableList` refuses some containers (a
fieldset cannot go in another fieldset). To stop all the drags, give
`disabled` to `SortableList`, `SortableItem`, `useDraggable`, `useDropTarget`
or `useFileDropTarget`. Use it for a field that the user cannot change, or a
user without the permission to upload.

## Files

`useFileDropTarget` makes an element take files from the computer, and
`useFilePicker` gives the hidden input of the “Upload” button. Only the
innermost drop target takes the files. A dropped folder gives no files.

`dropTargetClassName({ isOver })` gives the classes of the drop cue: a
surface and a ring while the drag is over the target. Use it for files and
for elements (a record that goes into another record). `ringOnly` is for a
target as large as a pane. For a short text in the center, put a
`div.DropTarget__label` with a `span` in the target.

```tsx
import Button from 'datocms-react-ui/Button';
import {
  dropTargetClassName,
  useFileDropTarget,
  useFilePicker,
} from 'datocms-react-ui/dnd';
import React, { useState } from 'react';

export default function FileDrop() {
  const [names, setNames] = useState<string[]>([]);

  const handleFiles = (files: File[]) => setNames(files.map((f) => f.name));

  const { ref, isOver } = useFileDropTarget({ onDrop: handleFiles });
  // The input is hidden: the "Upload" button opens it
  const { open, input } = useFilePicker({ onPick: handleFiles });

  return (
    <div
      ref={ref}
      className={dropTargetClassName({ isOver })}
      style={{
        display: 'grid',
        gap: 'var(--spacing-m)',
        justifyItems: 'start',
        padding: 'var(--spacing-l)',
        border: '1px dashed var(--color--border)',
        borderRadius: 'var(--radius-m)',
      }}
    >
      {input}
      <Button label="Upload" onClick={open} />
      <span>
        {names.length > 0
          ? names.join(', ')
          : 'Drop files from your computer here.'}
      </span>
    </div>
  );
}
```

## Accessibility

There is no keyboard drag: a user with a keyboard cannot reorder a list
with these primitives. Give that user another way, for example the options
"Move up" and "Move down" in the menu of a row.

## CSS variables

## CSS variables

- `--DragHandle-gutter`: The width of the column at the left of an element, where the handle of a "gutter" drag handle goes

