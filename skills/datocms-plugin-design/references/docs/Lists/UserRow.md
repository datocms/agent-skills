# UserRow

A person in a row: a collaborator, an SSO user, an API token, an invitation.
`UserRow` shows the avatar, the name, the email and the kind in the same
order and with the same sizes everywhere, for example in the users table of
a project, in the menu that picks the creator of a record, or in the editors
of a sidebar. It is an [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md) with an [`Avatar`](https://react-ui.datocms.com/Content/Avatar.md), so it draws only the
content. The container gives the surface, the hover and the click.

| Use | For |
| - | - |
| `UserRow` | A person, in a list, a menu, a chip, a cell or a text. |
| [`RecordRow`](https://react-ui.datocms.com/Lists/RecordRow.md) | A record. |
| [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md) | A thing that is not a person or a record: a plugin, a role, a project, an organization. |
| [`InfoList`](https://react-ui.datocms.com/Lists/InfoList.md) | Facts about the thing that is open, as label and value. Its [`InfoList.User`](https://react-ui.datocms.com/Lists/InfoList.md) is a person as the value of a row. |
| [`Avatar`](https://react-ui.datocms.com/Content/Avatar.md) | Only the picture of a person, for example in a stack of avatars. |

```tsx
import RowList from 'datocms-react-ui/RowList';
import SidebarPanel from 'datocms-react-ui/SidebarPanel';
import UserRow, { type UserRowEntity } from 'datocms-react-ui/UserRow';
import React from 'react';

// People as the API gives them, for example from ctx.loadUsers()
const PEOPLE: Array<UserRowEntity & { id: string }> = [
  {
    id: '1',
    type: 'user',
    attributes: { full_name: 'Mark Rossi', email: 'mark@example.com' },
  },
  {
    id: '2',
    type: 'sso_user',
    attributes: {
      first_name: 'Julia',
      last_name: 'Chen',
      username: 'julia@example.com',
    },
  },
  {
    id: '3',
    type: 'site_invitation',
    attributes: { email: 'ana@example.com' },
  },
];

export default function Collaborators() {
  return (
    <div style={{ width: 320 }}>
      <SidebarPanel title="Editors" count={PEOPLE.length}>
        <RowList density="compact">
          {PEOPLE.map((person) => (
            <RowList.Item key={person.id}>
              <UserRow layout="row" user={person} showKind />
            </RowList.Item>
          ))}
        </RowList>
      </SidebarPanel>
    </div>
  );
}
```

## Layouts

`layout="row"` is for a list or a menu. It has an avatar of 32px, the name
as the title and the email below it. When the name is missing, the email is
the title and the row has one line. The children of the row replace the
email: give them for another detail, and write the email in them when the
row needs it.

`layout="inline"` is one line with an avatar of 20px: a chip, the value of a
select, a cell of a table, a person in a text. It shows the name and the
kind, not the email, and it takes no children. The name ends with an
ellipsis when the container is too narrow.

```tsx
import UserRow from 'datocms-react-ui/UserRow';
import React from 'react';

export default function Inline() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-m)', width: 240 }}>
      <UserRow
        layout="inline"
        presentation={{ name: 'Julia Chen', email: 'julia@example.com' }}
      />
      <UserRow
        layout="inline"
        presentation={{ name: 'Deploy bot', email: null }}
        kind="API token"
      />
      <UserRow
        layout="inline"
        presentation={{
          name: 'Bartholomew Montgomery-Fairweather',
          email: 'bart@example.com',
        }}
      />
    </div>
  );
}
```

## Person

Give the person in one of two ways:

- `user` takes the person as the API gives it, and as `ctx` gives it to a
  plugin (`ctx.currentUser`, `ctx.loadUsers()`, `ctx.loadSsoUsers()`): a
  collaborator, an account, an organization, an SSO user, an API token or an
  invitation. The row finds the name and the email with the rules of
  DatoCMS: an SSO user shows its full name and its username, an invitation
  shows its email, an API token without a name shows "API token".
- `presentation` takes the name, the email and the image, when you already
  have them.

`userPresentation(user)` gives the name and the email of a person with the
same rules, and `userKindLabel(user.type)` gives the name of its kind, for a
UI that does not use the row.

## Avatar

The avatar is the Gravatar image of the email. When the email has no
Gravatar image, or the row has no email, the avatar shows the initials of
the name, and the email gives their color, so a person has the same color
everywhere. Give `presentation.imageUrl` to show another image.

```tsx
import RowList from 'datocms-react-ui/RowList';
import UserRow from 'datocms-react-ui/UserRow';
import React from 'react';

// An inline SVG, so the example needs no network
const IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#c97b3d"/><circle cx="5" cy="4" r="2" fill="#f6d9b8"/></svg>',
  );

export default function AvatarExample() {
  return (
    <div style={{ width: 320 }}>
      <RowList density="compact">
        <RowList.Item>
          {/* No Gravatar image for this email: the avatar shows the initials */}
          <UserRow
            layout="row"
            presentation={{ name: 'Mark Rossi', email: 'mark@example.com' }}
          />
        </RowList.Item>
        <RowList.Item>
          <UserRow
            layout="row"
            presentation={{
              name: 'Julia Chen',
              email: 'julia@example.com',
              imageUrl: IMAGE,
            }}
          >
            Image from imageUrl
          </UserRow>
        </RowList.Item>
      </RowList>
    </div>
  );
}
```

## Kind

The kind is a short note after the name, in the subtle ink: "SSO user",
"API token", "Invitation". Show it when a list or a menu mixes people of
different kinds. With `user`, `showKind` shows the kind of the entity. With
`presentation`, give the text in `kind`. Do not put the kind in the name.

**Do:** Give the kind with showKind or kind, so it shows after the name in the subtle ink.

```tsx
<UserRow
  layout="inline"
  presentation={{ name: 'Julia Chen', email: 'julia@example.com' }}
  kind="SSO user"
/>
```

**Don’t:** Do not add the kind to the name, because the ellipsis of a long name cuts the kind.

```tsx
<UserRow
  layout="inline"
  presentation={{ name: 'Julia Chen (SSO user)', email: 'julia@example.com' }}
/>
```

## Person in a text

`UserRow` is a flex box, so in a sentence its container gives the display:
put it in a `span` with `display: inline-flex`. The avatar is a `div`, so
the sentence is in a `div`, not in a `p`.

```tsx
import UserRow from 'datocms-react-ui/UserRow';
import React from 'react';

export default function InText() {
  return (
    <div>
      <span
        style={{
          display: 'inline-flex',
          maxWidth: '100%',
          verticalAlign: 'middle',
        }}
      >
        <UserRow
          layout="inline"
          presentation={{ name: 'Julia Chen', email: 'julia@example.com' }}
        />
      </span>{' '}
      took over this record.
    </div>
  );
}
```

## Accessibility

The name is next to the avatar, so a screen reader reads only the name and
the kind. The avatar is decorative.

## Props

### UserRow

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `user` (variant) | `UserRowEntity` | No | | The person. The row reads its name and its email. |
| `showKind` (variant) | `boolean` | No | `false` | Shows the kind of the person after the name, for example "SSO user". Use it when the list or the menu mixes people of different kinds. |
| `presentation` (variant) | `UserRowPresentation` | No | | The name, the email and the image of the person |
| `kind` (variant) | `Message` | No | | The kind of person, after the name in the subtle ink. For example "SSO user", "API token" or "Invitation". |
| `layout` | `'row' \| 'inline'` | Yes | | "row" shows the email below the name, with an avatar of 32px: a row of a list, an option of a menu.<br>"inline" shows the name on one line, with an avatar of 20px: a chip, the value of a select, a cell of a table, a person in a text. |
| `children` (variant) | `ReactNode` | No | | The line below the name, in place of the email. Write the email in it when the row needs it. |

#### Types

`UserRowEntity` — A person as the API gives it, and as `ctx` gives it to a plugin (for example `ctx.currentUser`, `ctx.loadUsers()`): a collaborator, an account, an organization, an SSO user, an API token or an invitation. The row reads only these fields.

```ts
export type UserRowEntity =
  | {
      type: 'user';
      attributes: { full_name?: string | null; email: string };
    }
  | {
      type: 'account';
      attributes: {
        first_name?: string | null;
        last_name?: string | null;
        email: string;
      };
    }
  | {
      type: 'organization';
      attributes: { name: string };
    }
  | {
      type: 'sso_user';
      attributes: {
        first_name?: string | null;
        last_name?: string | null;
        username: string;
      };
    }
  | {
      type: 'access_token';
      attributes: { name?: string | null };
    }
  | {
      type: 'site_invitation';
      attributes: { email: string };
    };
```

`UserRowPresentation` — The data of a person that the row shows

```ts
export type UserRowPresentation = {
  /** The name. Without it, the email is the title. */
  name: string | null | undefined;
  /** The email. It gives the Gravatar image and the color of the initials. */
  email: string | null | undefined;
  /**
   * The URL of the image of the avatar. Without it, the avatar is the
   * Gravatar image of the email, and the initials of the name when the
   * email has no Gravatar image.
   */
  imageUrl?: string | null;
};
```
