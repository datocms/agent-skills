## Props

### InputGroup

The props of the input (`value`, `onChange`, `onBlur`, `name`, `id`,
`disabled`, ...) are the contract of an input. The
other props go to the input. `InputGroup` has the props of
[`StringInput`](https://react-ui.datocms.com/Forms/TextInputs.md), but no `className`: the package draws the box. For a class
of layout, put a wrapper around the field. `InputGroup.Input` has the
same props.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `placeholder` | `TextMessage \| null` | No | | The text that shows when the input is empty (a plain string or `{ id }`). `null` is the same as no text. |
| `code` | `boolean` | No | `false` | Shows the value in the monospaced font, for a value that is code: a pattern, a URL, an API key. |
| `pre` | `Message` | No | | A text or an icon before the input, for example "https://" |
| `post` | `Message` | No | | A text or an icon after the input, for example ".admin.datocms.com" |

Example of `placeholder`:

```tsx
"Marketing site"
```

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
- all of `InputHTMLAttributes`

### InputGroup.Root

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The inputs (`InputGroup.Input`) and the addons. In a `FieldWrapper`, the box takes the `id` and the description of the field, and each input keeps its own name. |
| `ariaLabel` | `TextMessage` | Yes | | The name of the group for a screen reader. The box has `role="group"`. Put the unit in it, because a screen reader does not read the addons. |
| `inline` | `boolean` | No | `false` | The box is as wide as its content, not as wide as its container. Use it for short values on one line, for example a width and a height. |
| `code` | `boolean` | No | `false` | Shows the inputs and the addons in the monospaced font. An `InputGroup.Input` can set its own `code`. |

Example of `ariaLabel`:

```tsx
"Minimum size in pixels"
```

### InputGroup.Input

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `placeholder` | `TextMessage \| null` | No | | The text that shows when the input is empty (a plain string or `{ id }`). `null` is the same as no text. |
| `code` | `boolean` | No | `false` | Shows the value in the monospaced font, for a value that is code: a pattern, a URL, an API key. |
| `ariaLabel` | `TextMessage` | No | | The name of the input for a screen reader, when its field has no label. The name of the group comes before it. |

Example of `placeholder`:

```tsx
"Marketing site"
```

Example of `ariaLabel`:

```tsx
"Width"
```

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
- all of `InputHTMLAttributes`

### InputGroup.Addon

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The fixed text, for example "px" or "x" |
