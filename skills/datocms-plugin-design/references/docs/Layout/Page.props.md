## Props

### Page

`Page.Content` has only `children` and `className`.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `React.ReactNode` | Yes | | A Page.Content |
| `className` | `string` | No | | |
| `variant` | `'large' \| 'wide'` | No | | The largest width of the page: 650px without it, 800px for `large`, 1200px for `wide` |
| `align` | `'center' \| 'start'` | No | | The position of the page in its area. `start` puts the page at the left, next to the sidebar. |

### Page.Section

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `React.ReactNode` | Yes | | A Page.SectionTitle, an optional Page.SectionDescription and the content |
| `className` | `string` | No | | |
| `id` | `string` | No | | The ID of the element, for a link to the section |

### Page.SectionTitle

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `React.ReactNode` | Yes | | |
| `className` | `string` | No | | |
| `id` | `string` | No | | The `id` of the heading, for example the target of `aria-labelledby` |
| `collapse` | `PageCollapse` | No | | Only for a section that opens and closes. The title becomes a button with a chevron, and the parent shows the content only when `open` is true. Without `onToggle`, the section cannot close (for example, it shows an error) and the chevron is disabled. |

#### Types

`PageCollapse` — The state of a title that opens and closes its content

```ts
export type PageCollapse = {
  /** The content shows */
  open: boolean;
  /** Opens or closes the content. Without it, the chevron is disabled. */
  onToggle?: () => void;
};
```

### Page.Group

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `title` | `Message` | Yes | | The title of the group, at the top left of the card |
| `titleLevel` | `HeadingLevel` | No | `2` | The level of the heading of the title. Give 3 for a group under a level 2 heading. |
| `actions` | `React.ReactNode` | No | | Buttons at the top right of the card. Use ghost or soft buttons. They get the micro size: the header is a thin strip. |
| `footer` | `React.ReactNode` | No | | A strip at the bottom of the card, for what belongs to the whole group (a note, a link, details that open). Without it, the card has no strip. |
| `tone` | `'danger' \| 'warning'` | No | | A colored border and a tint in the corner. `danger` (red) is for the group of the destructive actions of a page (the "Danger zone") and for a problem with the billing that the user must fix (for example "Action required" when some invoices are due). `warning` (amber) is for other problems that need an action of the user. Put the actions in the rows of a SettingsList, not in a Callout. |
| `status` | `React.ReactNode` | No | | A short status on the right of the title. Put a Pill here, in the color of the tone (for example `<Pill tone="danger">Unpaid</Pill>`). Use it for a problem that the user must fix, not for the "Danger zone". A group without a tone can show its state (for example a `success` pill for a step that is done in a wizard). |
| `count` | `number` | No | | A number after the title, for example the number of rows of a closed group. The group does not show it when it is 0. |
| `flush` | `boolean` | No | | The body has no padding. Use it for a Table or a CardList: its rows go from edge to edge of the card. Put the other parts of the body in a Page.GroupInset. |
| `children` | `React.ReactNode` | Yes | | |
| `className` | `string` | No | | |
| `id` | `string` | No | | |
| `collapse` | `PageCollapse` | No | | Only for a group that opens and closes. When the group is closed, it shows only its header: the body and the footer do not show. Without `onToggle`, the group cannot close (for example, it shows an error) and the chevron is disabled. |
