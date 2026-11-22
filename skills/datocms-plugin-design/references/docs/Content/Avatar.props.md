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
