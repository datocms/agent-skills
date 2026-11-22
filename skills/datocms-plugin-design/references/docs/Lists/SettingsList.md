# SettingsList

The settings of a wide page: one row for each value that the user changes,
or for each action, with the control always visible on the right. Put it in
a [`Page.Group`](https://react-ui.datocms.com/Layout/Page.md), one group for each topic (see [`Page`](https://react-ui.datocms.com/Layout/Page.md)).

Other components for other cases:

- Facts to read are an [`InfoList`](https://react-ui.datocms.com/Lists/InfoList.md).
- Things that the user opens, edits, removes or reorders are a [`CardList`](https://react-ui.datocms.com/Lists/CardList.md).
- In a narrow panel (a [`ListDetail.Panel`](https://react-ui.datocms.com/Patterns/ListAndDetail.md), a [`SidebarPanel`](https://react-ui.datocms.com/Layout/SidebarPanel.md)), the space is
  small. Use an [`InfoList`](https://react-ui.datocms.com/Lists/InfoList.md) with a menu trigger as the value, not a
  `SettingsList`.

## Rows

A row has a `title`, an optional `description` (one short sentence), the
current `value` and the `action`. The value has the ink of the text, and
the ghost button the subtle ink, so the action does not read as a value.

| Row | Example |
| - | - |
| A fact: no `action` | An ID. |
| A value and the control that changes it | “Change” next to the email. |
| An action without a value: no `value` | “Log out everywhere”. |

The action is a `ghost` button (`ghost-alert` for a destructive one) or a
[`SwitchInput`](https://react-ui.datocms.com/Forms/ChoiceInputs.md). Do not use soft or primary buttons: a page with many rows
gets noisy. Do not hide the actions in a menu (a [`Toolbar.DotsDropdown`](https://react-ui.datocms.com/Layout/Toolbar.md)).

```tsx
import Button from 'datocms-react-ui/Button';
import CopyableId from 'datocms-react-ui/CopyableId';
import { Page } from 'datocms-react-ui/Page';
import Pill from 'datocms-react-ui/Pill';
import SettingsList from 'datocms-react-ui/SettingsList';
import React from 'react';

export default function Rows() {
  return (
    <Page>
      <Page.Content>
        <Page.Group title="Sign-in">
          <SettingsList>
            <SettingsList.Row
              title="Account ID"
              value={<CopyableId id="153606" />}
            />
            <SettingsList.Row
              title="Email"
              value={
                <>
                  <Pill>Not verified</Pill> mark.smith@example.com
                </>
              }
              action={<Button tone="ghost" label="Change" />}
            />
            <SettingsList.Row
              title="Two-factor authentication"
              description="Asks for a code from an app on your phone each time you sign in."
              value="Not enabled"
              action={<Button tone="ghost" label="Turn on" />}
            />
            <SettingsList.Row
              title="Log out everywhere"
              description="Ends your sessions on all the devices and browsers, also this one."
              action={<Button tone="ghost" label="Log out" />}
            />
          </SettingsList>
        </Page.Group>
      </Page.Content>
    </Page>
  );
}
```

In a list narrower than a phone (on a phone, or in a narrow column), the
value and the action go under the text. The value is on the left and the
action on the right, or under the value when the two do not fit. A long
value goes on more lines. The action is on the left when the row has no
value.

## Group actions

An action that changes more values together (“Edit billing information”)
is in the `actions` of the [`Page.Group`](https://react-ui.datocms.com/Layout/Page.md), as a `soft` button, and its rows
have no action. A group has one or two actions.

```tsx
import Button from 'datocms-react-ui/Button';
import { Page } from 'datocms-react-ui/Page';
import SettingsList from 'datocms-react-ui/SettingsList';
import React from 'react';

export default function GroupAction() {
  return (
    <Page>
      <Page.Content>
        <Page.Group
          title="Billing information"
          actions={<Button tone="soft" label="Edit billing information" />}
        >
          <SettingsList>
            <SettingsList.Row title="Company" value="Acme Inc." />
            <SettingsList.Row title="Name" value="Mark Smith" />
            <SettingsList.Row
              title="Address"
              value={
                <>
                  <div>Via Roma 1</div>
                  <div>50123 Florence, Italy</div>
                </>
              }
            />
          </SettingsList>
        </Page.Group>
        <Page.Group title="Payment method">
          <SettingsList>
            <SettingsList.Row
              title="Credit card"
              value="Visa ending in 4242"
              action={<Button tone="ghost" label="Change" />}
            />
          </SettingsList>
        </Page.Group>
      </Page.Content>
    </Page>
  );
}
```

A value that the user types with others and saves with them (first name,
last name, company) is a form in the group, with the Save button in the
`footer`: see “Settings page” in [`Page`](https://react-ui.datocms.com/Layout/Page.md).

The destructive actions on the whole element are in the last group, the
“Danger zone”. A problem that the user must fix is a first group with a
`tone`. [`Page`](https://react-ui.datocms.com/Layout/Page.md) shows both.

