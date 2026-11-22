## Props

### Callout

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `tone` | `'neutral' \| 'success' \| 'warning' \| 'danger'` | No | `"neutral"` | "neutral" gives information. "warning" says that there is a problem or a risk with the current data, for example a token that shows only once. "danger" says that there is an error, for example the error of a form. "success" says that the current data is in a good state, for example a usage that is within the limits.<br>When a "warning" or "danger" callout appears, screen readers read it immediately (role "alert"). They read a "success" callout when they are not busy (role "status"). |
| `icon` | `ReactNode` | No | | Replaces the icon of the tone. Keep the meaning of the tone. |
| `title` | `Message` | No | | A short line in bold above the text, for example "Some invoices are due" |
| `className` | `string` | No | | Only for the position of the callout (margin), not for its look |
| `children` | `ReactNode` | No | | The message. A next step is a link in the text. |
