## Props

### StringInput

The contract of an input is at the top of this page. The other props go
to the `input` element.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `placeholder` | `TextMessage \| null` | No | | The text that shows when the input is empty (a plain string or `{ id }`). `null` is the same as no text. |
| `code` | `boolean` | No | `false` | Shows the value in the monospaced font, for a value that is code: a pattern, a URL, an API key. |

Example of `placeholder`:

```tsx
"Marketing site"
```

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
- all of `InputHTMLAttributes`

### TextareaInput

The contract of an input is at the top of this page. The other props go
to the `textarea` element.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `placeholder` | `TextMessage \| null` | No | | The text that shows when the input is empty (a plain string or `{ id }`). `null` is the same as no text. |
| `code` | `boolean` | No | `false` | Shows the value in the monospaced font, for a value that is code: a JSON payload, a certificate, an XML document. |
| `rows` | `number` | No | `2` | The smallest height of the input, in lines. The input grows with its text. |
| `maxRows` | `number` | No | | The largest height of the input, in lines. A longer text scrolls in the input. Without it, the input grows with all its text. |

Example of `placeholder`:

```tsx
"A short summary for the search engines"
```

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
- `autoComplete`, `cols`, `dirName`, `form`, `maxLength`, `minLength`, `required`, `wrap` (from `TextareaHTMLAttributes`)

### NumberInput

The contract of an input is at the top of this page. The other props go
to the `input` element.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `inputMode` | `'numeric' \| 'decimal'` | No | `'decimal'` | The keyboard that a touch device shows: "numeric" for an integer, "decimal" for a number with a decimal point. |
| `placeholder` | `TextMessage \| null` | No | | The text that shows when the input is empty (a plain string or `{ id }`). |

Example of `placeholder`:

```tsx
"0"
```

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
- all of `InputHTMLAttributes`

### DebouncedTextInput

It has the props of `StringInput`, and the contract of an input.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `placeholder` | `TextMessage \| null` | No | | The text that shows when the input is empty (a plain string or `{ id }`). `null` is the same as no text. |
| `code` | `boolean` | No | `false` | Shows the value in the monospaced font, for a value that is code: a pattern, a URL, an API key. |
| `autosize` | `boolean` | No | `false` | Makes the input as wide as its text (or its placeholder), with `AutosizeInput`. |

Example of `placeholder`:

```tsx
"Marketing site"
```

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
- all of `InputHTMLAttributes`

### AutosizeInput

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `text` | `string` | Yes | | The text that sets the width, usually the value of the input. |
| `placeholder` | `string \| null` | No | | The text that sets the width when `text` is empty. Give the placeholder of the input. |
| `className` | `string` | No | | A class for the wrapper. Set the `font-size`, the `--autosize-input-padding-inline` and the `--autosize-input-border-inline` of the input with it. The default values are the padding and the border of a standard input. |
| `children` | `ReactNode` | Yes | | The `input` element. |

### PasswordInput

The contract of an input is at the top of this page.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `placeholder` | `TextMessage \| null` | No | | The text that shows when the input is empty (a plain string or `{ id }`). `null` is the same as no text. |

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
- all of `InputHTMLAttributes`
