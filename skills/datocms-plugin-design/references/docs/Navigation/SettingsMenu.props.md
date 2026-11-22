## Props

### SettingsMenu

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` | `TextMessage` | Yes | | The accessible name of the menu, for example "Project settings" |
| `children` | `ReactNode` | Yes | | The SettingsMenu.Group elements |
| `footer` | `ReactNode` | No | | Shows below the groups, outside of the padding of the groups. For example, a SettingsMenu.Notice. |

### SettingsMenu.Group

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `name` | `Message` | No | | The title of the group. Without a name, the group has no title. |
| `children` | `ReactNode` | Yes | | The SettingsMenu.Item elements |

### SettingsMenu.Item

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `to` (variant) | `string` | No | | The page of DatoCMS, for example "/project-settings/site" |
| `exact` (variant) | `boolean` | No | | The item is active only when the URL is exactly `to` |
| `active` (variant) | `boolean` | No | | Forces the active state, for a row that is also active on other paths. Without it, the row is active when the URL matches `to`. |
| `href` (variant) | `string` | No | | The address of the page, for example "https://www.datocms.com" |
| `onClick` (variant) | `() => void` | No | | Runs when the user picks the item |
| `newTab` (variant) | `boolean` | No | | SettingsMenuLinkItem: Opens the page in a new tab. The item shows an icon for it.<br>SettingsMenuActionItem: The action opens a new tab. The item shows an icon for it. |
| `icon` | `ReactNode` | No | | An icon before the label |
| `label` | `Message` | Yes | | The name of the section, for example "Billing" |
| `attention` | `boolean` | No | | Shows a warning dot at the end of the row |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

`SettingsMenuItemDestination` — Where the item goes: a page of DatoCMS, another site, or an action

| Variant | Props | Description |
| - | - | - |
| `SettingsMenuPageItem` | `to`, `exact`, `active` | The item goes to a page of DatoCMS |
| `SettingsMenuLinkItem` | `href`, `newTab` | The item goes to another site |
| `SettingsMenuActionItem` | `onClick`, `newTab` | The item runs an action |

### SettingsMenu.Notice

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `to` (variant) | `string` | No | | The page of DatoCMS, for example "/project-settings" |
| `href` (variant) | `string` | No | | The address of the page, for example "https://www.datocms.com" |
| `newTab` (variant) | `boolean` | No | | Opens the page in a new tab |
| `icon` | `ReactNode` | Yes | | An icon before the text |
| `children` | `ReactNode` | Yes | | The text, for example "Anything missing? Go to the other settings." |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

Group 1

| Variant | Props | Description |
| - | - | - |
| `SettingsMenuNoticePageLink` | `to` | The notice opens a page of DatoCMS |
| `SettingsMenuNoticeExternalLink` | `href`, `newTab` | The notice opens another site |
