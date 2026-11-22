## Props

### EmptySlot

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `message` | `Message` | Yes | | What the field does not have, for example "No blocks yet" |
| `children` (variant) | `ReactNode` | No | | The buttons or the dropdown triggers that fill the field. Without them and without `action`, the slot shows only its message. |
| `action` (variant) | `ActionOrMenu` | No | | The action of the slot. Do not give it when the user cannot fill the field: the slot then shows only its message. |
