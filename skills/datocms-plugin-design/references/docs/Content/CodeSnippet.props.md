## Props

### CodeSnippet

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `code` | `string` | Yes | | The text of the box. The copy button copies it. |
| `ariaLabel` | `TextMessage` | Yes | | The name of the box for screen readers, for example "Request body". The box is a region that the keyboard can focus, so the arrow keys scroll it. |
| `maxHeight` | `number` | No | | The box scrolls when the text is higher than this, in CSS pixels. Without it, the box is as high as the text. |
| `children` | `ReactNode` | No | | A different view of the text, for example a JSON tree. When it is not set, the box shows the text. |

Example of `maxHeight`:

```tsx
400
```
