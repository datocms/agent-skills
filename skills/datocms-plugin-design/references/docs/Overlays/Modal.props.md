## Props

### Modal

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `title` (variant) | `Message` | No | | The title in the header, for example `{ id: 'fieldset.edit' }` |
| `ariaLabel` (variant) | `TextMessage` | No | | The name of a dialog with no header, for a screen reader |
| `onClose` | `(() => void) \| null` | No | | Closes the dialog. It runs when the user clicks the close button, clicks the cancel button of the footer, or presses Escape. A dialog with no `onClose` has no close button and does not close. |
| `children` | `React.ReactNode` | No | | The content of the dialog. |
| `freeContent` | `boolean` | No | `false` | Gives the content of the dialog no wrapper. Use it with `Modal.Body` and `Modal.Footer`: they are the children, for example in a form. |
| `closeButton` | `boolean` | No | `true` | `false`: the dialog has no cross. Escape and a click out of the panel close it. For a dialog whose field keeps the focus, for example the command palette. |
| `width` | `ModalWidth \| number` | No | `"s"` | The maximum width: "s" (600px), "m" (700px), "l" (900px) or "xl" (1010px). A number of pixels is only for a plugin that gives the width of its dialog. |

### Modal.Body and Modal.Footer

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `React.ReactNode` | Yes | | The content of the part. |

### FullscreenModal

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `title` (variant) | `Message` | No | | The title of the dialog. The dialog has no header: the toolbars of the content read the title with `useFullscreenModalTitle`. The title is also the name of the dialog. |
| `ariaLabel` (variant) | `TextMessage` | No | | The name of the dialog, for a screen reader |
| `onClose` | `(() => void) \| null` | No | | Closes the dialog. It runs when the user clicks the close button or presses Escape. A dialog with no `onClose` has no close button. |
| `children` | `React.ReactNode` | Yes | | The content of the dialog. It has its own toolbar. |
