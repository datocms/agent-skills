## Props

### CopyableId

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | Yes | | The ID to show and to copy, for example "168342". |
| `action` | `string` | No | | The id of the action of the registry that copies the same ID: the tooltip shows its keys. The click still copies the ID. |

### IdText

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | Yes | | The ID to show, for example "168342". |
| `labeled` | `boolean` | No | | Show "· ID" before the ID. Use it when the ID follows another detail on the same line (for example the model of a record): without the label, the ID seems to be the ID of that detail. |

### CopyableValue

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` (variant) | `Message` | No | | The label above the field, for example "Webhook URL" |
| `hint` (variant) | `Message` | No | | A text under the field |
| `ariaLabel` (variant) | `TextMessage` | No | | The name of the field for screen readers |
| `value` | `string \| null \| undefined` | Yes | | The text to show and to copy, for example a webhook URL or a token. |
| `openable` | `boolean` | No | | When the value is a URL that the user can visit, a second button opens it in a new tab. |
| `code` | `boolean` | No | | When the value is code (a token, a key), the field uses the monospaced font. A URL uses the regular font. |

### CopyButton

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `value` | `string \| null \| undefined` | Yes | | The text that the click copies. |
