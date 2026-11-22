# Callout

A message about the current data: a token that shows only once, an error of
a form, a usage that is within the limits.

Other components for other cases:

- The text that explains what a page is for goes in [`Toolbar.Help`](https://react-ui.datocms.com/Layout/Toolbar.md) (the “?”
  next to the title), not in a callout.
- The status of one value goes in its row, for example a [`Pill`](https://react-ui.datocms.com/Content/Pill.md) in the
  value of a [`SettingsList.Row`](https://react-ui.datocms.com/Lists/SettingsList.md). The action that fixes it goes there too:
  the `action` of the row on a wide page, or the row of the [`InfoList`](https://react-ui.datocms.com/Lists/InfoList.md) in
  a panel.
- A message about an action that just finished is a toast.

The component sets the icon and the spacing: do not add a wrapper for the
margin. Keep the text short: one or two sentences.

## Tones

| Tone | Use it for |
| - | - |
| `neutral` | The default. Information that the user must know. |
| `success` | The current data is in a good state. It has a check icon and `role="status"`, so a screen reader hears it when it appears. |
| `warning` | A problem or a risk with the current data. |
| `danger` | An error: the action failed, or the data is not valid. |

```tsx
import Callout from 'datocms-react-ui/Callout';
import React from 'react';

export default function Tones() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-m)' }}>
      <Callout>You pay by invoice, not by credit card.</Callout>
      <Callout tone="success">
        Your usage is within the monthly limits of your plan.
      </Callout>
      <Callout tone="warning">This token shows only once.</Callout>
      <Callout tone="danger">The name is already in use.</Callout>
    </div>
  );
}
```

## Title and links

Give a `title` when the message has more than one sentence: the title says
the problem in a few words. A short bold line above the text is always the
`title` prop, not a `<p><strong>`. A next step is a link in the text. A link only
opens a page. A link that sends a request is a button, and a button does not
go in a callout.

```tsx
import Callout from 'datocms-react-ui/Callout';
import React from 'react';

export default function TitleAndLinks() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-m)' }}>
      <Callout tone="warning" title="Email change pending">
        Open the link that we sent to <strong>jane@example.com</strong> within
        15 minutes, or the change is cancelled.
      </Callout>
      <Callout tone="danger" title="This project is deactivated">
        Nobody can open it. <a href="#billing">Open the billing</a> to see why.
      </Callout>
    </div>
  );
}
```

**Do:** Put the next step in the sentence, as a link to the page that fixes the problem.

```tsx
<Callout tone="danger">
  Nobody can open this project. <a href="#billing">Open the billing</a> to see why.
</Callout>
```

**Don’t:** Do not add buttons to a callout, not even a “Retry” or a “Dismiss”.

```tsx
<Callout tone="danger">
  Nobody can open this project. <Button size="micro" label="Retry charge" />
</Callout>
```

**Do:** Write about the current data, in one or two sentences.

```tsx
<Callout tone="warning">This token shows only once. Copy it now.</Callout>
```

**Don’t:** Do not use a callout to explain what the page is for: use Toolbar.Help.

```tsx
<Callout>Here you can manage the API tokens of the project.</Callout>
```

## Icon

Each tone has its icon. Give `icon` only when a more specific icon says
the same thing, for example a calendar for a date.

```tsx
import Callout from 'datocms-react-ui/Callout';
import React from 'react';
import { CalendarIcon } from '@/icons';

export default function CustomIcon() {
  return (
    <Callout icon={<CalendarIcon />}>
      The trial ends on 30 November. Then the project uses the Free plan.
    </Callout>
  );
}
```

## Problems that need an action

When the user must fix a state of the whole page, use a [`Page.Group`](https://react-ui.datocms.com/Layout/Page.md) with a
`tone` and a `status` at the top of the page. The callout states the
problem, and the rows below it have the actions. Billing problems use the
`danger` tone.

```tsx
import Button from 'datocms-react-ui/Button';
import Callout from 'datocms-react-ui/Callout';
import { Page } from 'datocms-react-ui/Page';
import Pill from 'datocms-react-ui/Pill';
import SettingsList from 'datocms-react-ui/SettingsList';
import React from 'react';

export default function ProblemGroup() {
  return (
    <Page.Group
      title="Balance"
      tone="danger"
      status={<Pill tone="danger">Unpaid</Pill>}
    >
      <Callout tone="danger">
        Some payments of this billing profile are not collected yet.
      </Callout>
      <SettingsList>
        <SettingsList.Row
          title="Due payments"
          description="Charges the credit card again."
          value="€199"
          action={<Button tone="ghost" label="Pay now" />}
        />
        <SettingsList.Row
          title="Credit card"
          value="Visa ending in 4242"
          action={<Button tone="ghost" label="Change" />}
        />
      </SettingsList>
    </Page.Group>
  );
}
```

## Props

### Callout

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `tone` | `'neutral' \| 'success' \| 'warning' \| 'danger'` | No | `"neutral"` | "neutral" gives information. "warning" says that there is a problem or a risk with the current data, for example a token that shows only once. "danger" says that there is an error, for example the error of a form. "success" says that the current data is in a good state, for example a usage that is within the limits.<br>When a "warning" or "danger" callout appears, screen readers read it immediately (role "alert"). They read a "success" callout when they are not busy (role "status"). |
| `icon` | `ReactNode` | No | | Replaces the icon of the tone. Keep the meaning of the tone. |
| `title` | `Message` | No | | A short line in bold above the text, for example "Some invoices are due" |
| `className` | `string` | No | | Only for the position of the callout (margin), not for its look |
| `children` | `ReactNode` | No | | The message. A next step is a link in the text. |
