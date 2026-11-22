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
