## Props

### FieldTypeAvatar

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `fieldType` | `FieldType \| (string & {})` | Yes | | The `field_type` of the field, as the CMA gives it, for example `"rich_text"` |
| `size` | `number` | Yes | | The side of the square in pixels, for example 32 in the image of an EntityRow |
| `ariaLabel` | `TextMessage` | No | | The name for the screen readers. Use it only when no text near the avatar says the type of the field. Without it, the screen readers do not read the avatar. |

### FieldTypeName

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `fieldType` | `FieldType \| (string & {})` | Yes | | The `field_type` of the field, as the CMA gives it, for example `"rich_text"` |
