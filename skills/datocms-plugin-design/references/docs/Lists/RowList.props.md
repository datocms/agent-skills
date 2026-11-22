## Props

### RowList

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `density` | `'default' \| 'compact'` | No | `"default"` | The space around the rows. "default" puts the list at the edge of a sidebar or of a dialog: the list gives the inset of the content. "compact" is for a list in a container that already has an inset (a SidebarPanel): the image and the text of a row stay on the edge of the content of the container, and the box of the row goes out of it. |
| `className` | `string` | No | | Only for the position of the list in its container (a margin), not for its look |
| `children` | `ReactNode` | Yes | | The rows (RowList.Item) |

### RowList.Item

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `to` (variant) | `string` | No | | The page of DatoCMS: the path with its query |
| `onClick` (variant) | `() => void` | No | | Runs on a click, before the page opens |
| `selected` (variant) | `boolean` | No | `false` | The row shows the selected state, for example the version that the page shows |
| `muted` | `boolean` | No | `false` | The text of the row is subtle and its images fade, but the user can still open it. Use it for an element that is off (for example a disabled plugin), with a Pill that says it. |
| `sortable` | `SortableItemApi` | No | | The user can drag the row to a new position. Give the argument of the children of SortableItem , with `handle` on the SortableItem: the row shows a grip at its left. |
| `id` | `string` | No | | The id of the row, for example to scroll it into view |
| `className` | `string` | No | | A class on the list item of the row. Only for its place in the list (for example to hide it), not for its look. |
| `children` | `ReactNode` | Yes | | The content of the row, usually an EntityRow with layout "row" |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

`RowListItemAction` — What the row does on a click

| Variant | Props | Description |
| - | - | - |
| `LinkRow` | `to`, `onClick` | The row opens a page of DatoCMS. It is selected while the page is open. |
| `ButtonRow` | `onClick`, `selected` | The row is a button |
| `StaticRow` | `selected` | The row only shows its content |

### RowList.Actions

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `visibility` | `'hover' \| 'always'` | No | `"hover"` | When the actions show. With "hover", they show only when the pointer or the focus is on the row, or when a menu of the actions is open (on devices without a pointer, always). "always" is for a picture of the row with an open tooltip or menu. |
| `children` | `ReactNode` | Yes | | The buttons of the row: ghost buttons with only an icon |
