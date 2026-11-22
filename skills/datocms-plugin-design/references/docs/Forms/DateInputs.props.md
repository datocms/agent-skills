## Props

### DateInput

The contract of an input is at the top of this page.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `aria-describedby` | `string` | No | | The `id` of the error and of the hint of the field |
| `aria-invalid` | `React.AriaAttributes['aria-invalid']` | No | | Set when the value has an error |
| `aria-labelledby` | `string` | No | | The `id` of the text of the label of the field |
| `aria-required` | `React.AriaAttributes['aria-required']` | No | | Set when the field is required |
| `variant` | `'default' \| 'filter'` | No | `'default'` | The look of the input. "default" is a field with a border and a calendar button. "filter" has no border, no buttons and a small text, for the value of a filter: the calendar opens when the user clicks the date. |
| `clearable` (variant) | `boolean` | No | `true` | Shows a button that clears the value, when the input has a value. |
| `autosize` (variant) | `boolean` | No | `false` | The field is as wide as its content, not as wide as its container. |
| `ariaLabel` | `TextMessage` | No | | The accessible name of the date text. Give it when the input is not in a `FieldWrapper` with a `label`. |
| `calendarPlacement` | `PopoverProps['placement']` | No | `'bottom-start'` | The side of the field where the calendar opens. It moves to the other side when there is no space. |
| `selectableDays` | `SelectableDays` | No | `'all'` | The days that the user can pick in the calendar. "future" is today and the days after it, "past" is today and the days before it. The calendar disables the other days. The user can still type a date out of the limit: check the value in your code. |

### DateTimeInput

It has the props of `DateInput`, and `seconds` and `timezoneSelect`.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `aria-describedby` | `string` | No | | The `id` of the error and of the hint of the field |
| `aria-invalid` | `React.AriaAttributes['aria-invalid']` | No | | Set when the value has an error |
| `aria-labelledby` | `string` | No | | The `id` of the text of the label of the field |
| `aria-required` | `React.AriaAttributes['aria-required']` | No | | Set when the field is required |
| `variant` | `'default' \| 'filter'` | No | `'default'` | The look of the input. "default" is a field with a border and a calendar button. "filter" has no border, no buttons and a small text, for the value of a filter: the calendar opens when the user clicks the date. |
| `clearable` (variant) | `boolean` | No | `true` | Shows a button that clears the value, when the input has a value. |
| `autosize` (variant) | `boolean` | No | `false` | The field is as wide as its content, not as wide as its container. |
| `ariaLabel` | `TextMessage` | No | | The accessible name of the date text. Give it when the input is not in a `FieldWrapper` with a `label`. |
| `calendarPlacement` | `PopoverProps['placement']` | No | `'bottom-start'` | The side of the field where the calendar opens. It moves to the other side when there is no space. |
| `selectableDays` | `SelectableDays` | No | `'all'` | The days that the user can pick in the calendar. "future" is today and the days after it, "past" is today and the days before it. The calendar disables the other days. The user can still type a date out of the limit: check the value in your code. |
| `seconds` | `boolean` | No | `true` | The time has the seconds. Without them, the user types the hours and the minutes, and the seconds of the value are 0. |
| `timezoneSelect` | `'always' \| 'whenDifferent'` | No | `'always'` | When the field shows the time zone menu. "always" shows it. "whenDifferent" shows it only when the time zone of the user is not the time zone of the project, so the user sees which time zone the time is in. |

### DateTimeRangeInput

The contract of an input is at the top of this page.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `aria-describedby` | `string` | No | | The `id` of the error and of the hint of the field |
| `aria-invalid` | `React.AriaAttributes['aria-invalid']` | No | | Set when the value has an error |
| `aria-labelledby` | `string` | No | | The `id` of the text of the label of the field |
| `aria-required` | `React.AriaAttributes['aria-required']` | No | | Set when the field is required |
| `variant` | `'default' \| 'filter'` | No | `'default'` | The look of the trigger. "default" has the look of a field. "filter" has no border and a small text, for the value of a filter. |
| `clearable` (variant) | `boolean` | No | `true` | Shows a button that sets the value back to the default preset (see `presets`), or to an empty range when there are no presets. |
| `autosize` (variant) | `boolean` | No | `false` | The trigger is as wide as its text, not as wide as its container. |
| `presets` | `DateTimeRangePresets` | No | | The ranges of the menu, and the preset that the clear button sets. Without presets, the trigger opens the custom range directly. |
| `placeholder` | `TextMessage` | No | `"Custom range"` | The text of the trigger when the custom range has no ends. |
| `ariaLabel` | `TextMessage` | No | | The accessible name of the input. Give it when the input is not in a `FieldWrapper` with a `label`. |
| `timezoneSelect` | `'always' \| 'whenDifferent'` | No | `'always'` | When the custom range shows the time zone menu. "always" shows it. "whenDifferent" shows it only when the time zone of the user is not the time zone of the project. |
| `calendarPlacement` | `PopoverProps['placement']` | No | `'bottom-start'` | The side of the input where the custom range opens. It moves to the other side when there is no space. |
| `selectableDays` | `SelectableDays` | No | `'all'` | The days that the user can pick in the calendar. "future" is today and the days after it. "past" is today and the days before it, for a range of past events. The calendar disables the other days. The user can still type a date out of the limit: check the value in your code. |

#### Types

`DateTimeRangePresets` — The presets of the menu, and the preset that the clear button sets

```ts
export type DateTimeRangePresets = {
  /**
   * The ranges of the menu, in their order. "Custom range" comes after
   * them.
   */
  options: DateTimeRangePreset[];
  /**
   * The `value` of the preset that the clear button of a custom range sets.
   * Without it, the clear button sets the first option.
   */
  default?: string;
};
```

`DateTimeRangePreset` — An option of the menu: a range that your code computes, for example "Last 7 days"

```ts
export type DateTimeRangePreset = {
  /** The key of the preset. It goes in the `preset` of the value. */
  value: string;
  /** The text of the option, and of the trigger when the preset is the value */
  label: TextMessage;
};
```
