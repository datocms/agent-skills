# InfoList

Facts about an element, to read: one row for each fact, with its title on
the left and its value on the right. It renders a real description list
(`dl`, with a `dt` and a `dd` for each row).

| Use | For |
| - | - |
| `InfoList` | Facts to read: a plan, a price, a usage, the dates of a record. |
| [`SettingsList`](https://react-ui.datocms.com/Lists/SettingsList.md) | The settings of a wide page: each row has its control, always visible. |
| [`CardList`](https://react-ui.datocms.com/Lists/CardList.md) | Things that the user opens, edits, removes or reorders: a rule, a webhook. |

```tsx
import InfoList from 'datocms-react-ui/InfoList';
import React from 'react';

export default function Basic() {
  return (
    <InfoList>
      <InfoList.Row title="Current plan">Professional</InfoList.Row>
      <InfoList.Row title="Price">€199/month</InfoList.Row>
      <InfoList.Row title="Next billing at">1 November 2026</InfoList.Row>
    </InfoList>
  );
}
```

## Rows

The list has one look: a line between the rows. In a wide list (600px and
more), the row under the pointer gets the hover surface, as the rows of a
[`Table`](https://react-ui.datocms.com/Lists/Table.md). It helps the eye to go from a title to its value. The row does not
open, so the cursor does not change.

A row has no line under its title. A short note about the value (for example
the project that uses the most of a limit) goes in the value, in a small
line under it. A breakdown of a value (the usage of each project) is a
[`Table`](https://react-ui.datocms.com/Lists/Table.md) of its own.

The title of a row takes at most 70% of the row. A longer title wraps, so
the value always keeps the rest.

## Values

The values use tabular figures, so the numbers of the rows are aligned. A
long value gets narrower than its content. A [`CopyableId`](https://react-ui.datocms.com/Content/CopyableValues.md) or the label of a
trigger ends with an ellipsis, and a text goes on more lines.

In a narrow panel (a [`ListDetail.Panel`](https://react-ui.datocms.com/Patterns/ListAndDetail.md), a [`SidebarPanel`](https://react-ui.datocms.com/Layout/SidebarPanel.md), the sidebar of a
record), a value that the user can change is the trigger of a menu, a
[`TextualTrigger`](https://react-ui.datocms.com/Actions/DropdownTriggers.md) (see [Dropdown triggers](https://react-ui.datocms.com/Actions/DropdownTriggers.md)). On
a wide page, use a [`SettingsList`](https://react-ui.datocms.com/Lists/SettingsList.md).

```tsx
import CopyableId from 'datocms-react-ui/CopyableId';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import InfoList from 'datocms-react-ui/InfoList';
import React, { useState } from 'react';

const ROLES = ['Admin', 'Editor', 'Translator'];

export default function Values() {
  const [role, setRole] = useState('Editor');

  return (
    <div className="DocsNarrow">
      <InfoList>
        <InfoList.Row title="Project ID">
          <CopyableId id="168342" />
        </InfoList.Row>
        <InfoList.Row title="Role">
          <Dropdown triggerComponent={Dropdown.TextualTrigger} label={role}>
            <Dropdown.Menu>
              <Dropdown.Group name="Change role">
                {ROLES.map((option) => (
                  <Dropdown.Option
                    key={option}
                    active={option === role}
                    onPick={() => setRole(option)}
                  >
                    {option}
                  </Dropdown.Option>
                ))}
              </Dropdown.Group>
            </Dropdown.Menu>
          </Dropdown>
        </InfoList.Row>
        <InfoList.Row title="Domain">
          www.a-very-long-domain-of-the-project.example.com
        </InfoList.Row>
      </InfoList>
    </div>
  );
}
```

## Entity values

For the info of a record or of an asset in a narrow panel, put the values in
`InfoList.Value` and `InfoList.Value.Trigger`. The two parts have the same
look and the same `label` prop, so the values of the rows align, and a
value that the user can change is not wider than the others.

| Part | For |
| - | - |
| `InfoList.Value` | A value that the user cannot change, for example the file name of an asset. |
| `InfoList.Value.Trigger` | The trigger of a [`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md): the value with a chevron. Give it as `triggerComponent`. |

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import InfoList from 'datocms-react-ui/InfoList';
import React, { useState } from 'react';

const COLLECTIONS = ['Press kit', 'Products', 'Team'];

export default function Value() {
  const [collection, setCollection] = useState('Press kit');

  return (
    <div className="DocsNarrow">
      <InfoList>
        <InfoList.Row title="Filename">
          <InfoList.Value label="tapestry-detail.jpg" />
        </InfoList.Row>
        <InfoList.Row title="Collection">
          <Dropdown
            triggerComponent={InfoList.Value.Trigger}
            label={collection}
          >
            <Dropdown.Menu placement="bottom-start">
              {COLLECTIONS.map((option) => (
                <Dropdown.Option
                  key={option}
                  active={option === collection}
                  onPick={() => setCollection(option)}
                >
                  {option}
                </Dropdown.Option>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </InfoList.Row>
      </InfoList>
    </div>
  );
}
```

## Users

`InfoList.User` is a user in a row, for example the creator of a record or
of an asset. It shows a small avatar and the name, with an ellipsis when
the column is narrow. `tooltip` (for example the type of the user, "Project
owner" or "API token") goes in a tooltip on the left, so the text does not
wrap in the narrow column. Without `tooltip`, there is no tooltip.

The component loads no data: give the name, the email and the image in
`user`, the same fields as the person of an [`Avatar`](https://react-ui.datocms.com/Content/Avatar.md). Give `gravatar: true`
to show the Gravatar image of the email, or `imageUrl`. Without an image,
the avatar shows the initials of the name.

```tsx
import InfoList from 'datocms-react-ui/InfoList';
import React from 'react';

export default function User() {
  return (
    <div className="DocsNarrow">
      <InfoList>
        <InfoList.Row title="Created by">
          <InfoList.User
            user={{ name: 'Jane Doe', email: 'jane@example.com' }}
            tooltip="Collaborator"
          />
        </InfoList.Row>
      </InfoList>
    </div>
  );
}
```

When the user can change the value, give `InfoList.User.Trigger` to
`triggerComponent` of [`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md). It is an inline ghost button with the
avatar, the name and the chevron of a menu. `onIntent` runs when the pointer
or the keyboard focus goes on the trigger. Start to load the options of the
menu there, so the list is usually complete when the menu opens.

```tsx
import Avatar from 'datocms-react-ui/Avatar';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import InfoList from 'datocms-react-ui/InfoList';
import React, { useState } from 'react';

const USERS = [
  { name: 'Jane Doe', email: 'jane@example.com', type: 'Collaborator' },
  { name: 'Mark Rossi', email: 'mark@example.com', type: 'Project owner' },
];

export default function UserTrigger() {
  const [current, setCurrent] = useState(USERS[0]);
  const [loads, setLoads] = useState(0);

  return (
    <div
      className="DocsNarrow"
      style={{ display: 'grid', gap: 'var(--spacing-s)' }}
    >
      <InfoList>
        <InfoList.Row title="Created by">
          <Dropdown
            triggerComponent={InfoList.User.Trigger}
            user={{ name: current.name, email: current.email }}
            tooltip={current.type}
            onIntent={() => setLoads((count) => count + 1)}
          >
            <Dropdown.Menu placement="bottom-start">
              {USERS.map((user) => (
                <Dropdown.Option
                  key={user.email}
                  active={user.email === current.email}
                  icon={
                    <Avatar name={user.name} email={user.email} size="small" />
                  }
                  onPick={() => setCurrent(user)}
                >
                  {user.name}
                </Dropdown.Option>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </InfoList.Row>
      </InfoList>
      <p>Intents: {loads}</p>
    </div>
  );
}
```

## Groups

`InfoList.Group` puts rows under a title. In a narrow list (less than 400px,
a side panel), the title goes in the center.

```tsx
import InfoList from 'datocms-react-ui/InfoList';
import React from 'react';

export default function Groups() {
  return (
    <div className="DocsNarrow">
      <InfoList>
        <InfoList.Row title="Created by">Mark Smith</InfoList.Row>
        <InfoList.Row title="Published at">3 October 2026</InfoList.Row>
        <InfoList.Group title="Locales">
          <InfoList.Row title="Published">English, Italian</InfoList.Row>
          <InfoList.Row title="Not published">German</InfoList.Row>
        </InfoList.Group>
      </InfoList>
    </div>
  );
}
```

