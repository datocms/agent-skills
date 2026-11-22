## Props

### Tooltip

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `FloatingTrigger` | Yes | | The element that opens the tooltip. It must take a ref: an HTML element, or a component with `React.forwardRef`. Put a component without a ref in a `<span>`. |
| `label` | `Message \| false \| null \| undefined` | Yes | | The text of the tooltip: a string, `{ id }` for a translation, `{ html }` or a React element. With no value, there is no tooltip: write `label={condition && text}` for a tooltip that shows only in some cases. |
| `shortcut` | `string \| ActionShortcut \| ActionShortcut[]` | No | | The keys of a keyboard shortcut, shown after the label: the keys of an action (`{ key: 's', mod: true }`), or a string in the format of `is-hotkey` ("mod+s"), as the text editors give them. "mod" is Cmd on a Mac and Ctrl on other systems. |
| `long` | `boolean` | No | `false` | Use it for a paragraph or a list: the text is aligned at the start and the tooltip is wider. |
| `placement` | `Placement` | No | `"top"` | The side of the trigger where the tooltip opens. It moves to the other side when there is no space. |
| `offset` | `OffsetOptions` | No | `{ mainAxis: 16 }` | The space between the trigger and the tooltip, in pixels. Use it to move the tooltip away from a large trigger, for example a bar of a chart. |

### HoverCard

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `FloatingTrigger` | Yes | | The element that opens the card. It must take a ref: an HTML element, or a component with `React.forwardRef`. Put a component without a ref in a `<span>`. |
| `content` | `ReactNode` | Yes | | The content of the card: a preview, an image, a table, links. HoverCard draws the surface. Put text in a `HoverCard.Body` to get the inset. With no value, there is no card. |
| `placement` | `Placement` | No | `"top"` | The side of the trigger where the card opens. It moves to the other side when there is no space. |
| `offset` | `OffsetOptions` | No | `{ mainAxis: 16 }` | The space between the trigger and the card, in pixels. |

### HoverCard.Body

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The text of the card: one sentence (it can contain links), or block elements (`p`, an `InfoList`) with a gap between them. A `HoverCard.Note` can follow the text. |

### HoverCard.Note

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | A quiet line under the text, for example how a value is counted |
