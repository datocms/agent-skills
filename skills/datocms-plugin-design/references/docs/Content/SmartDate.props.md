## Props

### SmartDate

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `value` | `Date \| string \| null \| undefined` | Yes | | The date: a `Date`, or an ISO 8601 string as the API gives it, for example "2026-10-15T09:30:00Z". With no value, SmartDate renders nothing. |
| `show` | `'date' \| 'time' \| 'dateTime'` | No | `"dateTime"` | What shows: "date" is only the date, with the format of the user (for example "15/10/2026"), "time" is only the time (for example "09:30"), and "dateTime" is both. |
| `withSeconds` | `boolean` | No | `false` | Add the seconds to the time. It has no effect with `show="date"`. |
| `todayShortcut` | `boolean` | No | `true` | Show "Today, 09:30" instead of the date and the time when the date is today. It has an effect only with `show="dateTime"`. |
