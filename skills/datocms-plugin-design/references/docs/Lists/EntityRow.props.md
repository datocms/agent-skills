## Props

### EntityRow

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `image` | `ReactNode` | No | | The image or the icon. It fills a square slot: 20px inline, 32px in a row. Without it, the row has no slot. |
| `title` | `Message` | Yes | | The title, on one line with an ellipsis. |
| `afterTitle` | `ReactNode` | No | | Content after the title, on the same line. For example the validity triangles of a record, a pill or a feedback dot. |
| `aside` | `Message` | No | | A short note after the title, in the subtle ink. For example the ID of a record or the state of a version. |
| `multilineTitle` | `boolean` | No | `false` | The title shows on up to three lines, not on one line. |
| `trailing` | `ReactNode` | No | | The content at the end of the row. For example the status of a record. |
| `layout` | `'row' \| 'inline'` | Yes | | "row" shows the kicker above the title and the details below it: a row of a list, an option of a menu, a card.<br>"inline" shows one line: a chip, the value of a select, an entity in a text. It has no kicker and no details. |
| `kicker` (variant) | `Message` | No | | The line above the title. For a record, it is the model. For example "Netlify". |
| `children` (variant) | `ReactNode` | No | | The details below the title, small and in the subtle ink. For example a status, a date, a description or the users that edit a record. One line with an ellipsis. |

### EntitySummary

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `icon` | `ReactNode` | Yes | | The icon of the thing, before its title. |
| `title` | `Message` | Yes | | The name of the thing. |
| `imageUrl` | `string \| null` | No | | The URL of an image that shows the thing, below the title. The image is decorative: it has no alternative text. |
| `description` | `Message` | No | | The text that explains the thing, below the image. |
