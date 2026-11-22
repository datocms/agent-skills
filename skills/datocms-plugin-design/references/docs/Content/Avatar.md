# Avatar

The picture of a person or of a thing: an image, or the initials of a name or
an icon on a rounded square.

| Use | For |
| - | - |
| `Avatar` | A person. It shows the image and falls back to the initials. |
| `InitialsAvatar` | An entity that has no image: an organization, a project, a plugin. |
| `IconAvatar` | An entity that has an icon and no image: an environment, a kind of field. |
| [`FieldTypeAvatar`](https://react-ui.datocms.com/Content/FieldTypes.md) | The type of a field, with the icon and the colors of its group. |

An avatar is a rounded square, not a circle. Its radius is `--radius-s`,
the radius of the buttons and the inputs, so it has the same shape as the
controls next to it. Do not give an avatar `--radius-full`.

The package does not know where the person comes from. You read the name,
the email and the image URL, and give them to the avatar.

## Person

The email gives the color of the initials, so a person has the same color
everywhere. Without the email, the name gives it.

```tsx
import Avatar from 'datocms-react-ui/Avatar';
import React from 'react';

const PEOPLE = [
  { name: 'Mark Rossi', email: 'mark@example.com' },
  { name: 'Julia Chen', email: 'julia@example.com' },
  { name: 'Ana Ortega', email: 'ana@example.com' },
  { name: 'Tom Baker', email: 'tom@example.com' },
];

export default function People() {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-s)' }}>
      {PEOPLE.map((person) => (
        <Avatar key={person.email} name={person.name} email={person.email} />
      ))}
    </div>
  );
}
```

## Sizes

There are four sizes: `small` (20px), `regular` (30px, the default),
`large` (40px) and `xlarge` (48px). The regular and the large avatars have a
ring, so avatars in a stack stay apart. The xlarge avatar shows one person
alone, for example in the header of a profile or of an account menu, so it
has no ring.

`AVATAR_SIZE_IN_PIXELS` gives the side of each size, for example to ask for
an image of that size.

```tsx
import Avatar from 'datocms-react-ui/Avatar';
import React from 'react';

export default function Sizes() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-m)',
      }}
    >
      <Avatar name="Mark Rossi" email="mark@example.com" size="small" />
      <Avatar name="Mark Rossi" email="mark@example.com" />
      <Avatar name="Mark Rossi" email="mark@example.com" size="large" />
      <Avatar name="Mark Rossi" email="mark@example.com" size="xlarge" />
    </div>
  );
}
```

## Image and active

Give `imageUrl` for the image, or `gravatar` for the Gravatar image of the
email (with two image pixels for each CSS pixel). Give one of the two, not
both. When the image does not load, or when the email has no Gravatar image,
the avatar shows the initials.

A name without a letter or a digit (an empty name, an emoji) gives no
initials. The avatar then shows a person on a neutral surface. `active`
shows a highlight, for example for the user that edits a record.

```tsx
import Avatar from 'datocms-react-ui/Avatar';
import React from 'react';

// An inline SVG, so the example needs no network
const IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#c97b3d"/><circle cx="5" cy="4" r="2" fill="#f6d9b8"/></svg>',
  );

export default function ImageAndActive() {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-m)' }}>
      <Avatar name="Julia Chen" email="julia@example.com" imageUrl={IMAGE} />
      <Avatar name="Julia Chen" email="julia@example.com" active />
      <Avatar name="Tom Baker" email="tom@example.com" size="small" active />
      <Avatar name="" />
    </div>
  );
}
```

**Do:** Use a rounded square, as the controls around it.

```tsx
<Avatar name="Julia Chen" email="julia@example.com" />
```

**Don’t:** Do not make the avatar a circle, and do not draw a gradient on it.

```tsx
<div style={{ borderRadius: '50%', overflow: 'hidden', width: 30, height: 30 }}>
  <Avatar name="Julia Chen" email="julia@example.com" />
</div>
```

## Initials

`InitialsAvatar` shows the initials of a name: the first letter of the first
two words. `surface` gives the color of the square:

- Without `surface`, the name picks one of eight hues.
- `{ seed }` picks the hue from another value (`Avatar` gives the email, so a
  person has the same color everywhere).
- `{ color }` uses a color from the data, for example the dominant color of
  the cover of a plugin. The ink is white or dark, the one with more contrast.
- `"muted"` gives a neutral surface.

A name without a letter or a digit gives an empty square of the same color.

The eight hues are the soft recipe of the field group chips: a pale surface
and a saturated ink in light mode, a deep surface and a light ink in dark
mode. Do not add a gradient or a sheen.

```tsx
import InitialsAvatar from 'datocms-react-ui/InitialsAvatar';
import React from 'react';

export default function Initials() {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-m)' }}>
      <InitialsAvatar name="Acme Agency" size={32} />
      <InitialsAvatar name="Shopify" size={32} surface={{ color: '#95bf47' }} />
      <InitialsAvatar name="Private plugin" size={32} surface="muted" />
      <InitialsAvatar name="SEO Analysis" size={56} />
      <InitialsAvatar name="🚀" size={32} />
    </div>
  );
}
```

## Icon

`IconAvatar` shows an icon on a soft square of the same shape. The icon is a
component, like the `icon` of a [`Button`](https://react-ui.datocms.com/Actions/Button.md). `surface` gives the color of the
square:

- `"primary"` is the soft brand surface, for the thing that is active or that
  matters (the environment in use).
- `"muted"` is the neutral surface.
- `{ color, ink }` takes the two colors, from a context of tokens or from the
  data. `fieldTypeSurface` gives the colors of the group of a field type.

Use it in the `image` of an [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md), with the size of the slot. For the
type of a field, use [`FieldTypeAvatar`](https://react-ui.datocms.com/Content/FieldTypes.md): it picks the icon and the colors of
the group of the type.

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import FieldTypeAvatar from 'datocms-react-ui/FieldTypeAvatar';
import IconAvatar from 'datocms-react-ui/IconAvatar';
import Pill from 'datocms-react-ui/Pill';
import RowList from 'datocms-react-ui/RowList';
import React from 'react';
import { PrimaryEnvironmentIcon, SandboxEnvironmentIcon } from '@/icons';

export default function Icons() {
  return (
    <div style={{ width: 360 }}>
      <RowList>
        <RowList.Item>
          <EntityRow
            layout="row"
            image={<IconAvatar icon={PrimaryEnvironmentIcon} size={32} />}
            title="main"
            afterTitle={<Pill>In use</Pill>}
          >
            Primary environment
          </EntityRow>
        </RowList.Item>
        <RowList.Item>
          <EntityRow
            layout="row"
            image={
              <IconAvatar
                icon={SandboxEnvironmentIcon}
                size={32}
                surface="muted"
              />
            }
            title="staging"
          >
            Sandbox environment
          </EntityRow>
        </RowList.Item>
        <RowList.Item>
          <EntityRow
            layout="row"
            image={<FieldTypeAvatar fieldType="file" size={32} />}
            title="Cover image"
            aside="cover_image"
          >
            Single asset
          </EntityRow>
        </RowList.Item>
      </RowList>
    </div>
  );
}
```

## Accessibility

An avatar is almost always next to a name, so a screen reader does not read
it. Give `labelled` to `Avatar` when no text near the avatar has the name, for
example in a stack of avatars. A screen reader then reads the name.

The same is true of an icon. Give `ariaLabel` to `IconAvatar` when no text
near the avatar says what the icon shows.

## Props

### Avatar

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `imageUrl` (variant) | `string \| null` | No | | The URL of the image. When it is missing or when it does not load, the avatar shows the initials of the name. |
| `gravatar` (variant) | `true` | No | | Shows the Gravatar image of the email, with two image pixels for each CSS pixel. When the email has no Gravatar image or when there is no email, the avatar shows the initials of the name. |
| `name` | `string \| null \| undefined` | Yes | | The name of the person, for example "Jane Doe". It gives the initials. |
| `email` | `string \| null` | No | | Picks the color of the initials. Falls back to the name when missing. |
| `size` | `AvatarSize` | No | `"regular"` | |
| `active` | `boolean` | No | `false` | Shows a highlight around the avatar, for example for the user that edits |
| `labelled` | `boolean` | No | `false` | Gives the name to the screen readers. Use it only when no text near the avatar has the name, for example in a stack of avatars. Without it, the screen readers do not read the avatar. |

#### Types

`AvatarSize` — "small" is 20px, "regular" is 30px, "large" is 40px, "xlarge" is 48px. The regular and the large avatars have a ring, so avatars in a stack stay apart. The xlarge avatar is for a single person, for example the header of a profile, so it has no ring.

```ts
export type AvatarSize = 'small' | 'regular' | 'large' | 'xlarge';
```

### InitialsAvatar

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `name` | `string \| null \| undefined` | Yes | | The name that gives the initials, for example "Jane Doe" shows "JD" |
| `size` | `number` | Yes | | Rendered size in pixels: smaller avatars need relatively larger text. |
| `surface` | `InitialsAvatarSurface` | No | `a hue from the name` | |
| `labelled` | `boolean` | No | `false` | Gives the name to the screen readers. Use it only when no text near the avatar has the name, for example in a stack of avatars. Without it, the screen readers do not read the avatar. |

#### Types

`InitialsAvatarSurface` — The surface of the initials. Without it, the name picks one of eight hues.

```ts
export type InitialsAvatarSurface =
  /** One of eight hues, picked from the seed (for example an email) */
  | { seed: string }
  /**
   * A "#rrggbb" color from the data (for example, the dominant color of the
   * cover of a plugin). The ink is white or dark: the one with more contrast
   * on the color. A color in another format gives a hue from the name.
   */
  | { color: string }
  /** The neutral surface (for example, a plugin without a cover) */
  | 'muted';
```

### IconAvatar

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `icon` | `SvgIcon` | Yes | | The icon, for example the icon of a kind of entity |
| `size` | `number` | Yes | | The side of the square in pixels, for example 32 in the image of an EntityRow |
| `surface` | `IconAvatarSurface` | No | `"primary"` | |
| `ariaLabel` | `TextMessage` | No | | The name for the screen readers. Use it only when no text near the avatar says what the icon shows. Without it, the screen readers do not read the avatar. |

#### Types

`IconAvatarSurface` — The surface of the square

```ts
export type IconAvatarSurface =
  /**
   * The soft brand surface, for the thing that is active or that matters
   * (the environment in use)
   */
  | 'primary'
  /** The neutral surface */
  | 'muted'
  /**
   * A surface and an ink from the data or from a context of tokens, for
   * example `{ color: 'var(--color--field-group-media--surface)', ink:
   * 'var(--color--field-group-media--ink)' }`. `fieldTypeSurface` gives
   * this pair for the group of a field type.
   */
  | { color: string; ink: string };
```
