## Props

### Spinner

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `inline` | `boolean` | No | `false` | Makes a small spinner (16px, the size of an icon) for a line of text or a control. Without it, the spinner is 32px and it is centered in its parent, to load an area. |
| `label` | `TextMessage \| false` | No | `"Loading"` | The text that a screen reader says. The spinner is a status. Give `false` when a visible text or `aria-busy` already says that the content loads. Then the spinner is only a decoration. |
| `className` | `string` | No | | Only for the position of the spinner (margin, z-index), not for its look |

### SpinnerArea

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `size` | `'small' \| 'regular'` | No | `"regular"` | The smallest height of the area: "small" for a line (64px), "regular" for a block (200px). To fill a whole pane, use Spinner.Overlay with no veil. |
| `label` | `TextMessage \| false` | No | | See the label of Spinner |

### SpinnerOverlay

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `veil` | `boolean` | No | `true` | Draws a veil over the content that shows. Give `false` when there is no content yet (a whole form that loads): the spinner is then at the center of the free space. |
| `label` | `TextMessage \| false` | No | | See the label of Spinner |
| `className` | `string` | No | | Only for the position of the overlay (z-index), not for its look |

### ProgressBar

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `value` | `number` | No | | The completed part, from 0 to 1, for example 0.4 for 40%. The component keeps it in this range. Without a value, a short segment moves along the bar without end: the share is not known yet. |
| `ariaLabel` | `TextMessage` | Yes | | The accessible name of the bar: the task that is in progress, for example "Upload of cover.jpg" |
| `placement` | `'inline' \| 'edge'` | No | `"inline"` | "inline" is a 4px bar as wide as its parent. "edge" is a 2px bar on the bottom edge of the nearest positioned parent, so it does not cover the content. Use it on a card or a row. |
| `className` | `string` | No | | Only for the position of the bar (width, margin), not for its look. The bar is as wide as its parent. You know the width that fits your layout, for example a maximum width in a table column. |
