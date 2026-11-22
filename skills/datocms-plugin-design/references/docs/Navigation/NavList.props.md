## Props

### NavList

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` | `TextMessage` | No | | The accessible name of the navigation. In a Pane with a Pane.Header.Title, leave it out: the title gives the name. Give it in other places (for example a SidebarPanel), with the name of the section, not the word "navigation". |
| `children` | `ReactNode` | Yes | | The rows (NavList.Item) |

Example of `ariaLabel`:

```tsx
{ id: 'admin.ssoGroups.detail.users' }
```

### NavList.Item

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | No | | The id of the row, for example to scroll it into view |
| `children` | `ReactNode` | Yes | | The content of the row, usually an EntityRow with layout "row" |
| `muted` | `boolean` | No | `false` | The text of the row is subtle and its images fade, but the user can still open it. Use it for an element that is off (for example a disabled plugin), with a Pill that says it. |
| `sortable` | `SortableItemApi` | No | | The user can drag the row to a new position. Give the argument of the children of SortableItem , with `handle` on the SortableItem: the row shows a grip at its left. |
| `to` | `string` | Yes | | The page that the row opens. The row is selected while this page is open. |
