## Props

### SwitchList

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The fields: a `Field` with a `SwitchInput` for each setting |
| `className` | `string` | No | | |

### SwitchInput

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` | `Message` | Yes | | The text next to the switch. It is the name of the switch, and a click on it flips the switch. An element shows as it is: it must be a `Label` that points to the `id` of the switch. Do not give a `label` to a `FieldWrapper` around the switch. |
| `forcedOn` | `{ reason: Message; }` | No | | Another setting forces the value to true, for example a permission that a role gets from another role. An off switch then shows as on and faded, and the reason shows under it (in a `SwitchList`, before the switch). The screen reader reads the reason too. |
| `aria-labelledby` | `string` | No | | The `id` of the text of the label. |
| `aria-invalid` | `boolean` | No | | Set when the value has an error. A `FieldWrapper` gives it. |
| `aria-describedby` | `string` | No | | The `id` of the error and of the hint. A `FieldWrapper` gives it. |
| `aria-required` | `boolean` | No | | Set when the field is required. A `FieldWrapper` gives it. |

### RadioGroupInput

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `aria-describedby` | `string` | No | | The `id` of the error and of the hint of the field |
| `aria-invalid` | `React.AriaAttributes['aria-invalid']` | No | | Set when the value has an error |
| `aria-labelledby` | `string` | No | | The `id` of the text of the label of the field |
| `aria-required` | `React.AriaAttributes['aria-required']` | No | | Set when the field is required |
| `options` | `readonly RadioGroupOption<T>[]` | Yes | | The options of the group. To let the user pick no value, add an option for it. |
| `small` | `boolean` | No | | A group with a smaller gap and smaller text |

#### Types

`RadioGroupOption` — One option of a radio group

```ts
export type RadioGroupOption<T extends string = string> = {
  /** The value that the form gets when the user picks this option */
  value: T;
  /** The text of the option */
  label: Message;
  /** A short help text under the label */
  hint?: Message | null;
  /** A tooltip for the option, for example the reason why it is disabled */
  tooltip?: TextMessage | null;
  /** Tells that the user cannot pick this option */
  disabled?: boolean;
  /**
   * An icon or a logo before the text, for an option that stands for a
   * service or a place (a hosting provider, the machine of the user). Give it
   * to all the options of the group, or to none.
   */
  icon?: React.ReactNode;
  /**
   * An extra class for a mark of your own on this option, for example the
   * diff of two versions marks the options that changed
   */
  className?: string;
};
```

### RadioGroupOption

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `value` | `T` | Yes | | The value that the form gets when the user picks this option |
| `label` | `Message` | Yes | | The text of the option |
| `hint` | `Message \| null` | No | | A short help text under the label |
| `tooltip` | `TextMessage \| null` | No | | A tooltip for the option, for example the reason why it is disabled |
| `disabled` | `boolean` | No | | Tells that the user cannot pick this option |
| `icon` | `React.ReactNode` | No | | An icon or a logo before the text, for an option that stands for a service or a place (a hosting provider, the machine of the user). Give it to all the options of the group, or to none. |
| `className` | `string` | No | | An extra class for a mark of your own on this option, for example the diff of two versions marks the options that changed |
