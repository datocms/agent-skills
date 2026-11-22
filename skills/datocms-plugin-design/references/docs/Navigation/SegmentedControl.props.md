## Props

### SegmentedControl

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` (variant) | `TextMessage` | No | | |
| `ariaLabelledBy` (variant) | `string` | No | | |
| `options` | `readonly SegmentedControlOption<T>[] \| readonly SegmentedControlIconOption<T>[]` | Yes | | |
| `iconOnly` | `boolean` | No | | |
| `value` | `T` | Yes | | The `value` of the selected option |
| `onChange` | `(value: T) => void` | Yes | | Runs when the user picks another option |
| `size` | `ButtonSize` | No | | The height of the options, with the padding of the Button sizes. The size of its container by default: "milli" in a toolbar, "field" in a toolbar of fields, "small" out of a toolbar (see useButtonSize). |
| `fill` | `boolean` | No | | The control takes the full width, and the options share it equally |
| `disabled` | `boolean` | No | | Turns off all the options |
| `className` | `string` | No | | Only for the position of the control (margin), not for its look |

#### Types

`SegmentedControlOption`

```ts
export type SegmentedControlOption<T extends string> = {
  /** The value that `onChange` gets, for example "grid" */
  value: T;
  /** The text of the option, for example "Grid" */
  label: Message;
  /** An icon before the label */
  icon?: React.ReactNode;
};
```

`SegmentedControlIconOption` — An option that shows only its icon

```ts
export type SegmentedControlIconOption<T extends string> = {
  /** The value that `onChange` gets, for example "dark" */
  value: T;
  /** The tooltip and the accessible name of the option, for example "Dark" */
  label: TextMessage;
  /** The icon of the option */
  icon: React.ReactNode;
};
```
