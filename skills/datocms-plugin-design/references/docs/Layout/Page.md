# Page

The column of a page of content: settings, a form, a usage dashboard. Put
it in a [`Pane`](https://react-ui.datocms.com/Layout/Pane.md) (for a form, see [List and form](https://react-ui.datocms.com/Patterns/ListAndForm.md)).

A list with a detail is not a `Page`. See
[List and detail](https://react-ui.datocms.com/Patterns/ListAndDetail.md).

```tsx
<Page variant="large">
  <Page.Content>
    <Page.Section>…</Page.Section>
    <Page.Group title="…">…</Page.Group>
  </Page.Content>
</Page>
```

| Part | Use it for |
| - | - |
| `Page.Section` | A part with one piece of content (a form, a single list), under a title with hairlines. |
| `Page.Group` | A part with more pieces (a summary and a chart), or a topic of a page of settings: a card with a title strip. |

Do not put a `Page.Group` in a `Page.Section`, or a group in another group.
The only exception is the fields that show only for one value of a field
above them: see “Sections” below. The pieces in a group have no card of their
own.

## Width and position

The page is 650px wide at most. `variant="large"` gives 800px (most forms
of settings), `variant="wide"` gives 1200px (a dashboard of usage).
`align="start"` puts the page on the left of its area, next to the sidebar,
instead of the center.

```tsx
import InfoList from 'datocms-react-ui/InfoList';
import { Page } from 'datocms-react-ui/Page';
import SegmentedControl from 'datocms-react-ui/SegmentedControl';
import React, { useState } from 'react';

const VARIANTS = [
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'large' },
  { value: 'wide', label: 'wide' },
] as const;

const ALIGNS = [
  { value: 'center', label: 'center' },
  { value: 'start', label: 'start' },
] as const;

export default function Widths() {
  const [variant, setVariant] = useState<'default' | 'large' | 'wide'>(
    'default',
  );
  const [align, setAlign] = useState<'center' | 'start'>('center');

  return (
    <>
      <div className="DocsControls">
        <SegmentedControl
          ariaLabel="Variant"
          options={VARIANTS}
          value={variant}
          onChange={setVariant}
        />
        <SegmentedControl
          ariaLabel="Align"
          options={ALIGNS}
          value={align}
          onChange={setAlign}
        />
      </div>
      <Page variant={variant === 'default' ? undefined : variant} align={align}>
        <Page.Content>
          <Page.Group title="Plan">
            <InfoList>
              <InfoList.Row title="Plan">Professional</InfoList.Row>
              <InfoList.Row title="Renews on">1 November 2026</InfoList.Row>
            </InfoList>
          </Page.Group>
        </Page.Content>
      </Page>
    </>
  );
}
```

## Sections

`Page.SectionTitle` is the title, between two hairlines that go out into
the padding of the page. `Page.SectionDescription` under it says what the
section is for. For a message about the current data, use a
[`Callout`](https://react-ui.datocms.com/Feedback/Callout.md). A link to another settings area is one line of text in the
section (the class `Page__content__section__text`), not a callout.

The fields that show only for one value of a field above them go in a
`Page.Group` in the section, under that field.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import { Page } from 'datocms-react-ui/Page';
import StringInput from 'datocms-react-ui/StringInput';
import SwitchInput from 'datocms-react-ui/SwitchInput';
import React, { useState } from 'react';

export default function Sections() {
  const [custom, setCustom] = useState<boolean | null>(true);
  const [quality, setQuality] = useState<string | null>('75');
  const [preventRawVideos, setPreventRawVideos] = useState<boolean | null>(
    false,
  );

  return (
    <Page>
      <Page.Content>
        <Page.Section>
          <Page.SectionTitle>Images</Page.SectionTitle>
          <Page.SectionDescription>
            The parameters that the CDN applies to every image.
          </Page.SectionDescription>
          <SwitchInput
            label="Use custom parameters"
            value={custom}
            onChange={setCustom}
          />
          {custom && (
            <Page.Group title="Custom parameters">
              <FieldWrapper label="Quality">
                <StringInput value={quality} onChange={setQuality} />
              </FieldWrapper>
            </Page.Group>
          )}
        </Page.Section>
        <Page.Section>
          <Page.SectionTitle>Videos</Page.SectionTitle>
          <SwitchInput
            label="Do not serve the original video files"
            value={preventRawVideos}
            onChange={setPreventRawVideos}
          />
        </Page.Section>
      </Page.Content>
    </Page>
  );
}
```

## Groups

A group is a card: a strip with the `title` and the `actions` (ghost or
soft buttons, in the micro size), the body, and an optional `footer` strip
for what belongs to the whole group (a note, a link). A group has no line
under its title, and no description. A group that is a step of a wizard
shows its state as a [`Pill`](https://react-ui.datocms.com/Content/Pill.md) in `status` (`tone="success"` for a done step),
because the group has no tone of its own.

When the title and the status or the actions do not fit on one line (a long
translated title, a narrow card), they go under the title. The title is never
covered.

```tsx
import Button from 'datocms-react-ui/Button';
import InfoList from 'datocms-react-ui/InfoList';
import { Page } from 'datocms-react-ui/Page';
import React from 'react';

export default function Groups() {
  return (
    <Page>
      <Page.Content>
        <Page.Group title="Bandwidth">
          <InfoList>
            <InfoList.Row title="This month">12 GB</InfoList.Row>
            <InfoList.Row title="Limit">100 GB</InfoList.Row>
          </InfoList>
        </Page.Group>
        <Page.Group
          title="CDA API calls"
          actions={<Button tone="ghost" label="Download CSV" />}
          footer="The usage is counted for the whole organization."
        >
          <InfoList>
            <InfoList.Row title="This month">7.9M</InfoList.Row>
            <InfoList.Row title="Limit">2M</InfoList.Row>
          </InfoList>
        </Page.Group>
      </Page.Content>
    </Page>
  );
}
```

A group that holds a [`Table`](https://react-ui.datocms.com/Lists/Table.md) or a [`CardList`](https://react-ui.datocms.com/Lists/CardList.md) gets `flush`: the body has no
padding, and the rows go from edge to edge of the card. The border of the
card is the frame of the list. Put the other parts of the body (for example
a [`SettingsList`](https://react-ui.datocms.com/Lists/SettingsList.md) above a [`CardList`](https://react-ui.datocms.com/Lists/CardList.md)) in a `Page.GroupInset`: it gives them
the padding of the body again.

```tsx
import { Page } from 'datocms-react-ui/Page';
import {
  Table,
  type TableColumn,
  useInMemoryTableLayout,
} from 'datocms-react-ui/Table';
import React from 'react';

type Invoice = { id: string; date: string; amount: string };

const INVOICES: Invoice[] = [
  { id: '3', date: '1 October 2026', amount: '€ 149.00' },
  { id: '2', date: '1 September 2026', amount: '€ 149.00' },
  { id: '1', date: '1 August 2026', amount: '€ 99.00' },
];

const COLUMNS: TableColumn<Invoice>[] = [
  { name: 'date', label: 'Date', renderCell: (invoice) => invoice.date },
  { name: 'amount', label: 'Amount', renderCell: (invoice) => invoice.amount },
];

const DEFAULT_LAYOUT = {
  columns: [
    { name: 'date', width: 3 },
    { name: 'amount', width: 2 },
  ],
};

export default function TableGroup() {
  const [layout, setLayout] = useInMemoryTableLayout(DEFAULT_LAYOUT);

  return (
    <Page>
      <Page.Content>
        <Page.Group title="Invoices" flush={true}>
          <Table columns={COLUMNS} layout={layout} onLayoutChange={setLayout}>
            <Table.Header />
            <Table.Body>
              {INVOICES.map((invoice) => (
                <Table.Row key={invoice.id} row={invoice} />
              ))}
            </Table.Body>
          </Table>
        </Page.Group>
      </Page.Content>
    </Page>
  );
}
```

## Settings page

Each topic of a page of settings is a group with a [`SettingsList`](https://react-ui.datocms.com/Lists/SettingsList.md): a row for
each value, with its action always visible on the right. The values that the
user types and saves together are a form in a group, with the Save button in
the `footer`. The destructive actions on the whole element are the rows of
the last group, “Danger zone”, with `tone="danger"` and `ghost-alert`
buttons. The “Danger zone” has no `status` and no callout.

```tsx
import Button from 'datocms-react-ui/Button';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import { Page } from 'datocms-react-ui/Page';
import SettingsList from 'datocms-react-ui/SettingsList';
import StringInput from 'datocms-react-ui/StringInput';
import React, { useState } from 'react';

export default function SettingsPage() {
  const [firstName, setFirstName] = useState<string | null>('Mark');
  const [lastName, setLastName] = useState<string | null>('Smith');

  return (
    <Page>
      <Page.Content>
        <Page.Group title="Basic info">
          <SettingsList>
            <SettingsList.Row title="Account ID" value="81723" />
            <SettingsList.Row
              title="Email"
              value="mark@example.com"
              action={<Button tone="ghost" label="Change" />}
            />
          </SettingsList>
        </Page.Group>
        <Page.Group
          title="Personal details"
          footer={
            <Button label="Save" size="small" tone="primary" expand={false} />
          }
        >
          <div className="form__field form__row">
            <div className="form__row__cell">
              <FieldWrapper label="First name">
                <StringInput value={firstName} onChange={setFirstName} />
              </FieldWrapper>
            </div>
            <div className="form__row__cell">
              <FieldWrapper label="Last name">
                <StringInput value={lastName} onChange={setLastName} />
              </FieldWrapper>
            </div>
          </div>
        </Page.Group>
        <Page.Group title="Danger zone" tone="danger">
          <SettingsList>
            <SettingsList.Row
              title="Delete account"
              description="Deletes your account and the projects that it owns. This cannot be undone."
              action={<Button tone="ghost-alert" label="Delete account" />}
            />
          </SettingsList>
        </Page.Group>
      </Page.Content>
    </Page>
  );
}
```

## Problem to fix

A problem that the user must fix is the first group of the page, with a
`tone`: `danger` for the billing and the invoices, `warning` for the
others. The title is the topic, and `status` is a short [`Pill`](https://react-ui.datocms.com/Content/Pill.md) in the color
of the tone (`status={<Pill tone="danger">Unpaid</Pill>}`). The body starts
with a [`Callout`](https://react-ui.datocms.com/Feedback/Callout.md) of the same tone (links only, no buttons), then a
[`SettingsList`](https://react-ui.datocms.com/Lists/SettingsList.md) with a row for each action that fixes the problem.

```tsx
import Button from 'datocms-react-ui/Button';
import Callout from 'datocms-react-ui/Callout';
import { Page } from 'datocms-react-ui/Page';
import Pill from 'datocms-react-ui/Pill';
import SettingsList from 'datocms-react-ui/SettingsList';
import React from 'react';

export default function ProblemGroups() {
  return (
    <Page>
      <Page.Content>
        <Page.Group
          title="Due invoices"
          tone="danger"
          status={<Pill tone="danger">Unpaid</Pill>}
        >
          <Callout tone="danger">
            Until the payment succeeds, the projects of this billing profile are
            blocked.
          </Callout>
          <SettingsList>
            <SettingsList.Row
              title="Due payments"
              description="Charges the credit card again."
              action={<Button tone="ghost" label="Pay now" />}
            />
            <SettingsList.Row
              title="Credit card"
              value="Visa ending in 4242"
              action={<Button tone="ghost" label="Change" />}
            />
          </SettingsList>
        </Page.Group>
        <Page.Group
          title="Email verification"
          tone="warning"
          status={<Pill tone="warning">Not verified</Pill>}
        >
          <Callout tone="warning">
            Open the link that we send to your email, to confirm that the
            address is yours.
          </Callout>
          <SettingsList>
            <SettingsList.Row
              title="Verification link"
              value="Not sent"
              action={<Button tone="ghost" label="Send link" />}
            />
          </SettingsList>
        </Page.Group>
      </Page.Content>
    </Page>
  );
}
```

## Collapse

With `collapse`, the title becomes a button with a chevron. The title of a
section only shows the state, and you show the content only when
`collapse.open` is true. A group hides its body and its footer by itself,
and its whole header opens and closes it. Give it `count` to show the number
of rows that it hides.

Without `onToggle`, the chevron is disabled. Use this when the content cannot
close (for example, when it shows an error).

```tsx
import InfoList from 'datocms-react-ui/InfoList';
import { Page } from 'datocms-react-ui/Page';
import React, { useState } from 'react';

export default function Collapse() {
  const [sectionOpen, setSectionOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  return (
    <Page>
      <Page.Content>
        <Page.Section>
          <Page.SectionTitle
            collapse={{
              open: sectionOpen,
              onToggle: () => setSectionOpen(!sectionOpen),
            }}
          >
            Advanced settings
          </Page.SectionTitle>
          {sectionOpen && (
            <p>The content shows only while the section is open.</p>
          )}
        </Page.Section>
        <Page.Group
          title="Asset storage"
          footer="The usage is counted for the whole organization."
          collapse={{
            open: groupOpen,
            onToggle: () => setGroupOpen(!groupOpen),
          }}
        >
          <InfoList>
            <InfoList.Row title="This month">12 GB</InfoList.Row>
            <InfoList.Row title="Limit">50 GB</InfoList.Row>
          </InfoList>
        </Page.Group>
      </Page.Content>
    </Page>
  );
}
```

## CSS variables

The variables are on the elements of the page and of the group. Read them
in their content, for example to put a part of a flush group in line with
its title.

## CSS variables

- `--Page-inset`: The padding of the page. The hairlines of the section titles go out into it.
- `--Page__group-padding`: The padding of the title strip, of the body and of the footer of a group. The content of a flush group uses it to keep its text in line with the title.

