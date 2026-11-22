# SmartDate

`SmartDate` writes a date or a time in the format that the user chose in
their settings: the date format, the time zone and the 12 or 24 hour clock.
Give it the value that the API returns. Do not format a date by hand.

| Use | For |
| - | - |
| `SmartDate` | A date or a time in a row, a list, a sentence or a table cell. |
| [`Table`](https://react-ui.datocms.com/Lists/Table.md) with a [`TimeCell`](https://react-ui.datocms.com/Lists/Table.md) | A column of dates in a table. |
| The date input of a form | A date that the user edits. |

```tsx
import SmartDate from 'datocms-react-ui/SmartDate';
import React from 'react';

const value = '2026-10-15T09:30:45Z';

export default function Formats() {
  return (
    <dl
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto auto',
        gap: 'var(--spacing-s) var(--spacing-xl)',
        justifyContent: 'start',
      }}
    >
      <dt>Date and time</dt>
      <dd>
        <SmartDate value={value} />
      </dd>
      <dt>
        <code>show="date"</code>
      </dt>
      <dd>
        <SmartDate value={value} show="date" />
      </dd>
      <dt>
        <code>show="time"</code>
      </dt>
      <dd>
        <SmartDate value={value} show="time" />
      </dd>
      <dt>
        <code>show="time" withSeconds</code>
      </dt>
      <dd>
        <SmartDate value={value} show="time" withSeconds />
      </dd>
      <dt>Now</dt>
      <dd>
        <SmartDate value={new Date()} />
      </dd>
      <dt>
        Now, <code>todayShortcut=false</code>
      </dt>
      <dd>
        <SmartDate value={new Date()} todayShortcut={false} />
      </dd>
      <dt>No value</dt>
      <dd>
        <SmartDate value={null} />
      </dd>
    </dl>
  );
}
```

`SmartDate` renders a `<time>` element. Its `datetime` attribute has the
exact value (`2026-10-15T09:30:00.000Z`, or `2026-10-15` for a plain date),
for the tools that read the page. With no value, it renders nothing.

A plain date (`2026-10-15`) has no time zone, and it always shows the same
day. A full timestamp shows in the time zone of the user, not in the time
zone of the browser.

## Settings

[`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md) gives the settings of the user to the components: the date
format, the time zone and the clock from the preferences of the user in
DatoCMS (`ctx.ui`). `SmartDate`, [`TimeCell`](https://react-ui.datocms.com/Lists/Table.md) and `useDateSettings` read them,
so they need a [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md) above them.

`SmartDate` uses `dateFormat`, `timezone` and `twentyFourHour`. The
`locale` is the language of a relative time (`formatRelativeTime`, "3 days
ago"). A `dateFormat` with the name of a month (`dd MMM yyyy`) writes it in
English, with all the values of `locale`.

## Dates in custom UI

Where a `<time>` element cannot go (an attribute, the value of an input, a
text that you build), read the settings with `useDateSettings`
(`datocms-react-ui/DateSettings`). Give them to a helper from
`datocms-react-ui/utils/formatDate`. [`TimeCell`](https://react-ui.datocms.com/Lists/Table.md) does this for the full date
in its title.

| Helper | Gives |
| - | - |
| `formatDate` | The date, with the format of the user. A plain date (`2026-10-15`) shows the same day in all the time zones. |
| `formatTime` | The time, with the 12 or 24 hour clock of the user. |
| `formatDateTime` | The date and the time, or "Today" and the time. |
| `formatFullDateTime` | The date, the time with the seconds and the offset of the time zone, for an exact instant. |
| `formatMaybeDateTime` | A date or a date and time when the value is one, else the value as it is. |
| `formatRelativeTime` | A relative time ("3 days ago"), in the language of `locale`. |
| `isToday` | If the instant is today, in the time zone of the user. |
| `toDateTimeAttribute` | The value for the `datetime` attribute of a `<time>` element. |

```tsx
import { useDateSettings } from 'datocms-react-ui/DateSettings';
import {
  formatFullDateTime,
  formatRelativeTime,
} from 'datocms-react-ui/utils/formatDate';
import React from 'react';

const lastBuild = '2026-10-15T09:30:00Z';

export default function Helpers() {
  const dateSettings = useDateSettings();

  return (
    <p title={formatFullDateTime(lastBuild, dateSettings)}>
      Last build {formatRelativeTime(lastBuild, dateSettings)}
    </p>
  );
}
```

**Do:** Use SmartDate in a text, because it is an inline \<time> element that fits in a sentence.

```tsx
<p>The next invoice is on <SmartDate value="2026-11-15" show="date" />.</p>
```

**Don’t:** Do not format with toLocaleDateString, because the result ignores the settings of the user.

The next invoice is on .

