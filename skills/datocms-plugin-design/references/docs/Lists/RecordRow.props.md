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
