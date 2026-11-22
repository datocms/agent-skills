# Date inputs

`DateInput` and `DateTimeInput` are the inputs of the date fields and of the
date and time fields of a record, and of the time of a scheduled
publication. `DateTimeRangeInput` is the input of a range of time: the time
range of a log, the period of a report. The user types a date in the format
of their settings, or picks the day in a calendar.

| Use | For |
| - | - |
| `DateInput` | A day with no time: a birthday, the day of an event. |
| `DateTimeInput` | An instant: the time of a publication, a deadline. |
| `DateTimeRangeInput` | A range with two ends, or a preset that your code turns into a range. |

The three inputs follow the contract of the other inputs: `value`,
`onChange`, `onBlur`, `id`, `name`, `disabled` and `readOnly`. Keep the
value in your state, and put the input in a [`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md). The props of
that contract are not in the tables of this page.

## Values

The value of `DateInput` and of `DateTimeInput` is a string, or `null` for
an empty input:

- `DateInput` gives a date as `yyyy-MM-dd`, for example `"2026-11-03"`. A
  date has no time zone, so it is the same day for every user.
- `DateTimeInput` gives an ISO 8601 date and time with an offset, for
  example `"2026-10-12T09:30:00+02:00"`. It accepts any ISO 8601 string as
  its `value`.

These values are the values of the API, so you can give them to a field of
a record as they are.

Type a date, or open the calendar.

```tsx
import DateInput from 'datocms-react-ui/DateInput';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import React, { useState } from 'react';

export default function DateInputExample() {
  const [eventDay, setEventDay] = useState<string | null>('2026-11-03');

  return (
    <FieldWrapper
      label="Event day"
      hint={`The value is ${eventDay ?? 'null'}.`}
    >
      <DateInput value={eventDay} onChange={setEventDay} />
    </FieldWrapper>
  );
}
```

The value of `DateTimeRangeInput` is an object of one of two shapes, and it
is never `null`:

- `{ preset }`: the `value` of a preset of the menu, for example
  `{ preset: '7d' }`. Your code turns it into dates when it uses the value,
  so "Last 7 days" ends at that moment.
- `{ start, end }`: a custom range. Each end is an ISO 8601 date and time
  with the offset of the time zone of the project, as the value of
  `DateTimeInput`, for example `"2026-11-03T00:00:00+01:00"`, or `null` for
  no limit on that side. The input accepts any ISO 8601 string as an end.

## Settings of the user

The inputs read the date settings of the user from [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md):

- The text has the date format of the user (`dd/MM/yyyy`, `MM/dd/yyyy`...),
  and the time has a 12-hour or a 24-hour clock.
- The calendar has the names of the months and of the days in the language
  of the user, and starts the week on the first day of their region.
- `DateTimeInput` and `DateTimeRangeInput` show the time in the time zone of
  the user, and give the value with the offset of the time zone of the
  project.

The user types a text, and the input reads it when they leave the text. A
text that is not a date goes back to the value. The clear button of
`DateInput` and of `DateTimeInput` sets the value to `null`.

The time is in the time zone of the user. The value keeps the offset of
the project.

```tsx
import DateTimeInput from 'datocms-react-ui/DateTimeInput';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import React, { useState } from 'react';

export default function DateTimeInputExample() {
  const [publishAt, setPublishAt] = useState<string | null>(
    '2026-10-12T09:30:00+02:00',
  );

  return (
    <FieldWrapper
      label="Publish at"
      hint={`The value is ${publishAt ?? 'null'}.`}
    >
      <DateTimeInput value={publishAt} onChange={setPublishAt} />
    </FieldWrapper>
  );
}
```

## Time zone

`DateTimeInput` has a time zone menu after the time, and
`DateTimeRangeInput` has one in the panel of a custom range. The user picks
another time zone to type a time of that zone: the instant of the value
does not change. The field shows the offset of the time zone ("UTC+2"),
and the menu shows the names.

`timezoneSelect` says when the menu shows:

- `"always"` (the default) shows it, even when the input is empty, so the
  field keeps its width.
- `"whenDifferent"` shows it only when the time zone of the user is not the
  time zone of the project. Use it where the space is small.

## Options

- `seconds={false}` removes the seconds from the time of `DateTimeInput`.
  The seconds of the value are then 0.
- `selectableDays` limits the days of the calendar. `"future"` is today and
  the days after it, `"past"` is today and the days before it, for a range
  of past events. The calendar disables the other days. The user can still
  type a date out of the limit, so check the value and give the `error` to
  the field.
- `clearable={false}` removes the clear button, for a value that is
  required.
- `autosize` makes the field as wide as its content. Without it, the field
  is as wide as its container, as the other inputs.
- `calendarPlacement` is the side of the field where the calendar opens
  (`"bottom-start"` by default).

A time to plan: no seconds, no past days, and no clear button.

```tsx
import DateTimeInput from 'datocms-react-ui/DateTimeInput';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import React, { useState } from 'react';

// A time to plan: the calendar disables the past days, and the time has no
// seconds. The value is required, so the input has no clear button.
export default function ScheduleExample() {
  const [sendAt, setSendAt] = useState<string | null>(null);
  const inThePast = sendAt !== null && new Date(sendAt) < new Date();

  return (
    <FieldWrapper
      label="Send the newsletter at"
      required
      error={inThePast ? 'Pick a time in the future.' : undefined}
    >
      <DateTimeInput
        value={sendAt}
        onChange={setSendAt}
        selectableDays="future"
        seconds={false}
        clearable={false}
      />
    </FieldWrapper>
  );
}
```

## Ranges

The trigger of `DateTimeRangeInput` is a button with the range as its text.

### Presets

`presets.options` is the list of the ranges of the menu, each one with a
`value` and a `label`. The menu shows them in their order, then "Custom
range". The trigger shows the label of the preset of the value.

`presets.default` is the `value` of the preset that the clear button sets,
for example the range that your page shows first. Without it, the clear
button sets the first option. The trigger shows the clear button only for a
custom range.

Pick "Custom range", then two days in the calendar, then Apply.

```tsx
import DateTimeRangeInput, {
  type DateTimeRangePreset,
  type DateTimeRangeValue,
} from 'datocms-react-ui/DateTimeRangeInput';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import React, { useState } from 'react';

// Your code turns a preset into dates when it uses the value, so "Last 7
// days" always ends now
const PRESETS: DateTimeRangePreset[] = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

export default function PresetsExample() {
  const [period, setPeriod] = useState<DateTimeRangeValue>({ preset: '7d' });

  return (
    <FieldWrapper
      label="Period"
      hint={`The value is ${JSON.stringify(period)}.`}
    >
      <DateTimeRangeInput
        value={period}
        onChange={setPeriod}
        presets={{ options: PRESETS }}
        selectableDays="past"
      />
    </FieldWrapper>
  );
}
```

### Custom range

"Custom range" opens a panel under the trigger, with a calendar and a date
and a time for each end. The first pick in the calendar sets the start at
00:00, and the second pick sets the end at 23:59. When the second day is
before the first, the two ends change places. The user can also type the
dates and the times, in the format of their settings. The value changes only
when the user clicks Apply.

Without presets, the trigger opens the panel directly, and the clear button
sets the value to an empty range. Start from
`{ start: null, end: null }`. `placeholder` is the text of the trigger when
the range has no ends.

The calendar disables the days before today.

```tsx
import DateTimeRangeInput, {
  type DateTimeRangeValue,
} from 'datocms-react-ui/DateTimeRangeInput';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import React, { useState } from 'react';

// Without presets, the trigger opens the calendar directly
export default function CustomOnlyExample() {
  const [campaign, setCampaign] = useState<DateTimeRangeValue>({
    start: null,
    end: null,
  });

  return (
    <FieldWrapper
      label="Campaign dates"
      hint={`The value is ${JSON.stringify(campaign)}.`}
    >
      <DateTimeRangeInput
        value={campaign}
        onChange={setCampaign}
        placeholder="Pick the dates"
        selectableDays="future"
      />
    </FieldWrapper>
  );
}
```

### Time range in a toolbar

In a `<Toolbar fields>`, the trigger has the height of the other fields of
the toolbar. Give it `autosize`, so it is as wide as its text, and an
`ariaLabel`, because no label names it there. When the range loads a list,
apply it with a button, so the list does not load again for each change.

Change the range, then click Search: the list shows the new range.

```tsx
import Button from 'datocms-react-ui/Button';
import DateTimeRangeInput, {
  type DateTimeRangePreset,
  type DateTimeRangeValue,
} from 'datocms-react-ui/DateTimeRangeInput';
import Pane from 'datocms-react-ui/Pane';
import Toolbar from 'datocms-react-ui/Toolbar';
import React, { useState } from 'react';

const PRESETS: DateTimeRangePreset[] = [
  { value: 'hour', label: 'Last hour' },
  { value: 'day', label: 'Last 24 hours' },
  { value: 'all', label: 'All the events' },
];

// The time range of a log: the range changes the list only when the user
// clicks Search
export default function TimeRangeExample() {
  const [range, setRange] = useState<DateTimeRangeValue>({ preset: 'day' });
  const [searched, setSearched] = useState(range);

  return (
    <div style={{ position: 'relative', height: 200 }}>
      <Pane
        ariaLabel="Deploy log"
        header={
          <>
            <Toolbar>
              <Toolbar.Title>Deploy log</Toolbar.Title>
            </Toolbar>
            <Toolbar fields={true}>
              <Toolbar.Space />
              <DateTimeRangeInput
                ariaLabel="Time range"
                value={range}
                onChange={setRange}
                presets={{ options: PRESETS, default: 'all' }}
                selectableDays="past"
                autosize
              />
              <Button
                tone="primary"
                label="Search"
                onClick={() => setSearched(range)}
              />
            </Toolbar>
          </>
        }
      >
        <p style={{ padding: 'var(--spacing-l)', margin: 0 }}>
          The events of {JSON.stringify(searched)}.
        </p>
      </Pane>
    </div>
  );
}
```

## States

A `readOnly` input shows its value, and the user can select and copy it.
A `disabled` input keeps its value readable, on a neutral fill. Neither
opens the calendar, the time zone menu, the menu of the presets or the
panel of a custom range.

```tsx
import DateInput from 'datocms-react-ui/DateInput';
import DateTimeInput from 'datocms-react-ui/DateTimeInput';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import React from 'react';

export default function ReadOnlyExample() {
  return (
    <>
      <FieldWrapper label="Created at">
        <DateTimeInput value="2026-03-02T16:05:12Z" readOnly />
      </FieldWrapper>
      <FieldWrapper label="Archived on">
        <DateInput value="2026-09-30" disabled />
      </FieldWrapper>
    </>
  );
}
```

```tsx
import DateTimeRangeInput from 'datocms-react-ui/DateTimeRangeInput';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import React from 'react';

export default function StatesExample() {
  return (
    <>
      <FieldWrapper label="Report period">
        <DateTimeRangeInput
          value={{
            start: '2026-03-02T00:00:00+01:00',
            end: '2026-03-08T23:59:00+01:00',
          }}
          readOnly
        />
      </FieldWrapper>
      <FieldWrapper label="Archive period">
        <DateTimeRangeInput
          value={{ preset: '7d' }}
          presets={{ options: [{ value: '7d', label: 'Last 7 days' }] }}
          disabled
        />
      </FieldWrapper>
    </>
  );
}
```

## Filter look

`variant="filter"` has no border, no calendar button and no clear button,
and a small text. It is always as wide as its content, so it takes no
`autosize`. It is for the value of a filter, in a box that you draw,
for example the custom editor of a [`FilterBuilder`](https://react-ui.datocms.com/Forms/FilterBuilder.md) (see
[FilterBuilder](https://react-ui.datocms.com/Forms/FilterBuilder.md)). A click on the date opens the
calendar. Give it an `ariaLabel` when no label names it.

```tsx
import DateInput from 'datocms-react-ui/DateInput';
import React, { useState } from 'react';

// The filter look has no border and no buttons: the box around it is yours.
// A click on the date opens the calendar.
export default function FilterExample() {
  const [after, setAfter] = useState<string | null>('2026-01-01');

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 8px',
        border: '1px solid var(--color--border)',
        borderRadius: 'var(--radius-m)',
      }}
    >
      <span>Published after</span>
      <DateInput
        variant="filter"
        ariaLabel="Published after"
        value={after}
        onChange={setAfter}
      />
    </div>
  );
}
```

## Accessibility

- The label of the [`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md) names the date text of `DateInput` and of
  `DateTimeInput`. The time text is "Time", and the time zone menu is "Time
  zone". `DateTimeRangeInput` is a group, and the label of the field names
  it. Out of a field, give `ariaLabel`.
- The calendar button opens the calendar and moves the focus to the
  selected day, or to today. In the date text, the down arrow moves the
  focus into the open calendar.
- The calendar is a grid with the name of its month. The arrows move the
  focus by one day or one week, Home and End go to the first and to the
  last day of the week, and Page Up and Page Down go to the month before
  and after (with Shift, the year before and after). Enter or Space picks
  the day. Only one day is in the Tab order.
- A screen reader reads each day with its weekday, and says which day is
  selected, which days are in the range and which day is today. A disabled
  day stays in the grid, and a screen reader says that it is disabled.
- Escape closes the calendar, and the focus goes back to where it was.
- On the trigger of a range, Enter, Space and the down arrow open the menu
  of the presets. "Custom range" opens a dialog with the name "Custom
  range", and moves the focus to the start of the range in the calendar, or
  to today.
- Each text of the panel of a range has a name: "Start date", "Start time",
  "End date" and "End time". Escape and Apply close the panel, and the focus
  then goes back to the trigger.

