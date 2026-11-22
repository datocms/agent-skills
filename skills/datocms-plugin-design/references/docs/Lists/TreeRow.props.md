## Props

### TreeRow

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `expandable` | `{ open: boolean; onToggle: () => void; }` | No | | The row has children: the column of the handle shows the chevron that opens and closes them. |
| `drag` | `RowDrag` | No | | The parts that SortableTree gives to the row: `wrapperRef` is `provided.innerRef`, `dropIndicator` is `provided.dropIndicator`, and `handle` is `{ ref: provided.dragHandleRef }`. With `handle`, the column of the handle shows the grip, or the chevron of an `expandable` row. Without `handle` and `expandable`, the row has no column of the handle. Give `handle` to the SortableTree too: then a row with a disabled handle or with no handle does not move. |
| `indentation` | `number` | No | `0` | The indent of the level in px (`provided.draggableProps.style.paddingLeft`) |
| `selected` | `boolean` | No | | The row is the current one, for example open in an editor |
| `dragging` | `boolean` | No | | The row is the one that the user drags |
| `dropTarget` | `boolean` | No | | A drop puts the dragged row in this row, as a child |
| `children` | `ReactNode` | Yes | | After the column of the handle: a `TreeRow.Link`. A row with no handle and no chevron takes a `TreeRow.Action`, which starts in that column. |

### TreeRow\.Link

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `to` | `string` | Yes | | The page of DatoCMS that the link opens: the path with its query, for example "/editor?tab=fields" |
| `exact` | `boolean` | No | `false` | The link is active only on its exact path, not on the pages under it. Use it for the link to the root of a section. |
| `active` | `boolean` | No | | Forces the active state. Use it for a link that is also active on other paths. Without it, the link is active when the path of the page matches `to`. When the host gives no location, only `active` makes a link active. |
| `replace` | `boolean` | No | `false` | The link replaces the current entry of the history, so the Back button of the browser does not come back to the current page |
| `children` | `ReactNode` | Yes | | The entity of the row: an EntityRow |

Also accepts:

- `download`, `hrefLang`, `media`, `ping`, `referrerPolicy`, `target`, `type` (from `AnchorHTMLAttributes`)
- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`

### TreeRow\.Action

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `icon` | `ReactNode` | Yes | | The icon in the column of the handle, for example the `LoadMoreChevron` of a "Load more" row |
| `label` | `Message` | Yes | | The text of the button |
| `onClick` | `() => void` | Yes | | Runs on a click on the row |
