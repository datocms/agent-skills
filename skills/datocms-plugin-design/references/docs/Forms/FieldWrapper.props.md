## Props

### FieldWrapper

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` (variant) | `Message` | No | | The text of the label: a `Message` (a string, `{ id, values }`, `{ html }` or an element). It is the name of the input. Do not give it around a `SwitchInput`: the switch names itself. |
| `labelExtras` (variant) | `FieldWrapperLabelExtras \| FieldWrapperLabelExtras & { optional: true; } \| FieldWrapperLabelExtras & { optional?: false }` | No | | The parts of the label that are not its text |
| `required` (variant) | `false \| boolean` | No | | Adds an asterisk to the label and `aria-required` to the input |
| `id` (variant) | `string` | No | | The `id` of the input. The label points to it, and the input gets it through `useFieldInput`. Without it, the field makes an id. |
| `hint` (variant) | `Message` | No | | A short help under the input. A string is plain text. For markup, give `{ html }`: this HTML is not sanitized, so give only HTML that you trust. A screen reader reads it as the description of the input. |
| `docs` (variant) | `{ label: Message; to: string }` | No | | A link to the docs, under the hint. `label` is the text of the link and `to` is the URL. |
| `error` (variant) | `Message` | No | | The error of the value. The field shows it under the input, and the input gets `aria-invalid` and the error as its description. Without it, the value is valid. |
| `container` (variant) | `{ id?: string; className?: string; trailing?: ReactNode; }` | No | | The attributes of the container of the field, for the layout of the page: an `id` to scroll to, a class, and content after the hint. |
| `children` (variant) | `ReactNode` | No | | The input. It must call `useFieldInput`: all the inputs of the package do. |

#### Types

`FieldWrapperLabelExtras` — The parts of the label of a field that are not its text

```ts
export type FieldWrapperLabelExtras = {
  /**
   * Hides the label from the eye. A screen reader still reads it as the name
   * of the input. Use it when a text near the input shows what it is.
   */
  hidden?: boolean;
  /** Adds the icon that says that the value is different for each locale. */
  localized?: boolean;
  /**
   * The validators of the field, for the `FieldValidations` component of
   * `FormAppProvider`. They do not validate the value.
   */
  validators?: Record<string, any>;
  /** Renders a menu at the end of the label. See `Label`. */
  renderDropdown?: () => ReactNode;
  /** Renders extra content in the label. See `Label`. */
  renderInfo?: () => ReactNode;
};
```

### useFieldInput

The props that the hook reads and gives.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | No | | The `id` of the input. The label of the field points to it. |
| `aria-labelledby` | `string` | No | | The `id` of the text of the label of the field |
| `aria-describedby` | `string` | No | | The `id` of the error and of the hint of the field |
| `aria-invalid` | `React.AriaAttributes['aria-invalid']` | No | | Set when the value has an error |
| `aria-required` | `React.AriaAttributes['aria-required']` | No | | Set when the field is required |
