## Props

### InfoList

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `className` | `string` | No | | |
| `children` | `ReactNode` | Yes | | The rows (InfoList.Row) and the groups (InfoList.Group) |

### InfoList.Row

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `title` | `Message` | Yes | | The name of the fact, on the left |
| `children` | `ReactNode` | Yes | | The value, on the right. A short note about the value goes under it, in the value. |

### InfoList.Group

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `title` | `Message` | Yes | | The title above the rows. It goes to the center when the list is narrow (for example in a side panel). |
| `children` | `ReactNode` | Yes | | The rows of the group |

### InfoList.Value

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` | `Message` | Yes | | The value, for example the file name of an asset |

### InfoList.Value.Trigger

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` | `Message` | Yes | | The value, for example the collection of an asset |

### InfoList.User

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `user` | `InfoListUserData` | Yes | | |
| `tooltip` | `Message` | No | | A text about the user, for example the type of the user. It goes in a tooltip on the left, so the text does not wrap in a narrow column. Without it, there is no tooltip. |

#### Types

`InfoListUserData` — The user to show: the name, the email and the image of the avatar

```ts
export type InfoListUserData = AvatarIdentity;
```

### InfoListUserData

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `imageUrl` (variant) | `string \| null` | No | | The URL of the image. When it is missing or when it does not load, the avatar shows the initials of the name. |
| `gravatar` (variant) | `true` | No | | Shows the Gravatar image of the email, with two image pixels for each CSS pixel. When the email has no Gravatar image or when there is no email, the avatar shows the initials of the name. |
| `name` | `string \| null \| undefined` | Yes | | The name of the person, for example "Jane Doe". It gives the initials. |
| `email` | `string \| null` | No | | Picks the color of the initials. Falls back to the name when missing. |

### InfoList.User.Trigger

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `user` | `InfoListUserData` | Yes | | |
| `tooltip` | `Message` | No | | A text about the user, for example the type of the user. It goes in a tooltip on the left, so the text does not wrap in a narrow column. Without it, there is no tooltip. |
| `onIntent` | `() => void` | No | | The pointer or the keyboard focus is on the trigger: the user will possibly open the menu. Use it to start to load the options of the menu. |

#### Types

`InfoListUserData` — The user to show: the name, the email and the image of the avatar

```ts
export type InfoListUserData = AvatarIdentity;
```
