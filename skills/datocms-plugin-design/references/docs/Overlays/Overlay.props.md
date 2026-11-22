## Props

### Popover

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | No | | The content that floats near the anchor. |
| `anchorElement` | `Element` | Yes | | The element that the content follows. |
| `placement` | `Placement` | No | `"top"` | The side of the anchor where the content shows. It moves to the other side when there is no space. |
| `offset` | `OffsetOptions` | No | `{ mainAxis: 16 }` | The distance to the anchor, in pixels or as a Floating UI offset object. |
| `onClose` | `() => void` | No | | Runs when the user presses Escape or clicks out of the popover. A click on the anchor does not run it, because the anchor opens and closes the popover. Without it, the popover stays open until you remove it. |
| `ariaLabel` | `TextMessage` | No | | The name of the popover for a screen reader. With it, the popover has `role="dialog"`. Give it when the popover has controls, for example a picker. |
| `autoFocus` | `boolean \| string` | No | | The focus goes into the popover when it opens, and comes back to where it was when the popover closes. Give it when the user opens the popover with a button or a key. Do not give `true` when the popover opens from a field where the user types: give a selector, and the focus goes to the first element of the popover that matches it, for example `"input"`. The user goes on typing there. When no element matches, the focus stays where it is. |

### Portal

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `React.ReactNode` | No | | The content to render at the end of the body. |

### NewZIndex

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `(zIndex: number) => React.ReactNode` | Yes | | A function that gets the new z-index and returns the content. |
| `forcedValue` | `number` | No | | Use this z-index, not the one of the parent plus 10. |
