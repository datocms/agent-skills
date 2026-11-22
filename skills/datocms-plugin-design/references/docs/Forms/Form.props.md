## Props

### Label

The label of a field. Use it alone for a control that is not an input.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `required` | `false \| boolean` | No | | Adds an asterisk after the text. |
| `optional` | `boolean` | No | | Adds "(optional)" after the text. |
| `htmlFor` | `string` | Yes | | The `id` of the input that the label names. |
| `textId` | `string` | No | | The `id` of the text of the label. A group input (a radio group) has no element for `htmlFor`: it names itself with `aria-labelledby` and this id. |
| `label` | `Message` | Yes | | The text of the label. |
| `hidden` | `boolean` | No | | Hides the label from the eye. A screen reader still reads it. |
| `localized` | `boolean` | No | | Adds the icon that says that the value is different for each locale. |
| `renderDropdown` | `() => ReactNode` | No | | Renders a menu at the end of the label. It renders only when the label is in the viewport. |
| `renderInfo` | `() => ReactNode` | No | | Renders extra content between the text and the menu. |
| `validators` | `Record<string, any>` | No | | The validators of the field. The `FieldValidations` component of `FormAppProvider` shows them next to the text. |

### FieldHint

The hint and the docs link of a field. Use it alone under a control that is
not an input.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | No | | The `id` of the hint. The input of the field points to it with `aria-describedby`. |
| `hint` | `Message` | No | | The text of the hint. A string is plain text. For markup, give `{ html }`: unlike the other `Message` props, the component does NOT sanitize this HTML (the sanitizer removes `data-router-link`), so only give HTML that you trust. A link with the `data-router-link` attribute in it opens with the router of DatoCMS. |
| `docs` | `{ label: Message; to: string }` | No | | A link to the docs, with a book icon. `label` is the text of the link and `to` is the URL. The link opens in a new tab. |

### BaseInputComponentPropsField

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | No | | The `id` that the field gives, for the `label` to point to. |
| `value` | `Value` | Yes | | The value of the field in the form. |
| `disabled` | `boolean \| true` | No | | Tells that the user cannot change the value. |
| `name` | `string` | No | | BaseInputComponentPropsFieldEnabled: The name of the field in the form. The input puts it on its element. A controlled input out of a form needs no name.<br>BaseInputComponentPropsFieldDisabled: The name of the field in the form. |
| `onChange` | `(newValue: Value) => void` | No | | Call it with the new value (not with an event) when the user changes it. |
| `onBlur` | `(newValue: Value) => void` | No | | BaseInputComponentPropsFieldEnabled: Call it with the value when the user leaves the input. The form marks the field as touched and checks the value. It is optional, because a controlled input out of a form needs no blur. The `onBlur` of a react-final-form `input` takes no value: give `() => input.onBlur()`.<br>BaseInputComponentPropsFieldDisabled: Call it with the value when the user leaves the input. |

### BaseInputComponentPropsFieldWithReadOnly

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | No | | The `id` that the field gives, for the `label` to point to. |
| `value` | `Value` | Yes | | The value of the field in the form. |
| `disabled` | `boolean \| true` | No | | Tells that the user cannot change the value. |
| `readOnly` | `boolean \| true` | No | | Tells that the user can see and copy the value, but not change it. |
| `name` | `string` | No | | BaseInputComponentPropsFieldWithReadOnlyEditable: The name of the field in the form. A controlled input out of a form needs no name.<br>The name of the field in the form. |
| `onChange` | `(newValue: Value, ...detail: ChangeDetail) => void` | No | | Call it with the new value (not with an event) when the user changes it. Some inputs give more arguments after the value (`ChangeDetail`). |
| `onBlur` | `(newValue: Value) => void` | No | | BaseInputComponentPropsFieldWithReadOnlyEditable: Call it with the value when the user leaves the input. It is optional, as in `BaseInputComponentPropsFieldEnabled`.<br>Call it with the value when the user leaves the input. |
