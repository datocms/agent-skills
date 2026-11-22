## Props

### SidebarPanel

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `title` | `Message` | Yes | | The title of the panel, for example `{ id: 'itemForm.links' }` |
| `titleLevel` | `HeadingLevel` | No | `3` | The level of the heading of the title, after the headings around the panel. Give 2 when no level 2 heading is above the panel, for example in the sidebar of a record. |
| `count` | `number` | No | | A number after the title, for example the number of links. The panel does not show it when it is 0. |
| `children` | `ReactNode` | Yes | | The content of the panel, for example an InfoList |
| `flush` | `boolean` | No | | The content goes from edge to edge and has no padding. Use it for content with its own inset, for example a NavList. |
| `maxHeight` | `number` | No | | The content scrolls when it is taller than this height, in px, for example 400 |
| `startOpen` (variant) | `boolean` | No | `true` | True when the panel is open at first |
| `collapse` (variant) | `SidebarPanelCollapse` | No | | The open state and its setter. Give the pair of a storage hook: `collapse={{ open, onToggle: setOpen }}`. |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

`SidebarPanelOpenMode`

| Variant | Props | Description |
| - | - | - |
| `SidebarPanelUncontrolled` | `startOpen` | The panel keeps its open state and forgets it on unmount. |
| `SidebarPanelControlled` | `collapse` | You keep the open state, for example with `useLocalStorageSidebarPanelOpen`. |

#### Types

`SidebarPanelCollapse`

```ts
export type SidebarPanelCollapse = {
  /** True when the content shows */
  open: boolean;
  /** Called with the new state when the user clicks the title */
  onToggle: (open: boolean) => void;
};
```

### SidebarPanel.Blank

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `message` | `Message` | Yes | | The text, for example `{ id: 'sidebar.noLinks' }` |

### SidebarPanel.Action

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` | `Message` | Yes | | The text of the button, for example `{ id: 'newSchedule.title' }` |
| `icon` | `SvgIcon` | No | | The icon before the label |
| `onClick` | `(event: React.MouseEvent<HTMLButtonElement>) => unknown` | Yes | | |
| `disabled` | `ButtonProps['disabled']` | No | | Give a reason when the user must know why the action is disabled |
