## Props

### SettingsList

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `className` | `string` | No | | |
| `children` | `ReactNode` | Yes | | The rows (SettingsList.Row) |

### SettingsList.Row

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `title` | `Message` | Yes | | The name of the setting or of the action |
| `description` | `Message` | No | | One short sentence about the setting or about the result of the action |
| `value` | `ReactNode` | No | | The current value. A long value gets an ellipsis (in a narrow list, it goes on more lines), and a value on more lines (an address) has each line on the right. An action without a value (for example "Log out everywhere") has no value. |
| `action` | `ReactNode` | No | | The control that changes the value or does the action: a `ghost` Button (`ghost-alert` for a destructive action) or a SwitchInput. It is always visible. A row without an action is a fact (for example an ID). |
