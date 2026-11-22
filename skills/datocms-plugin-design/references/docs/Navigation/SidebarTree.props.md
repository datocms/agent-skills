## Props

### SidebarTree.Node

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `onClick` (variant) | `() => void` | No | | LinkAction: Runs on a click, before the page opens. For example, it closes the sidebar on small screens.<br>ExternalLinkAction: Runs on a click, before the page opens |
| `to` (variant) | `string` | No | | The page of the node: the path with its query |
| `exact` (variant) | `boolean` | No | | The node is active only when the URL is exactly `to` |
| `href` (variant) | `string` | No | | |
| `newTab` (variant) | `boolean` | No | | Opens the page in a new tab |
| `tree` (variant) | `SidebarTreeNodeTreeProps` | No | | |
| `alignWithTree` (variant) | `boolean` | No | `false` | The node is next to a tree, but not in it. It keeps the space of the toggle, so its icon aligns with the icons of the tree. |
| `label` | `Message` | Yes | | The name of the node, for example "Blog post" |
| `afterTitle` | `ReactNode` | No | | Shows after the label, on the same line: an ApiKey, a small icon |
| `details` | `Message` | No | | A second line under the label, small and subtle (for example the parents of the node in the results of a search) |
| `trailing` | `ReactNode` | No | | Shows at the end of the row: a FeedbackDot, a small icon |
| `icon` | `ReactNode` | No | | An icon before the label |
| `onDoubleClick` | `() => void` | No | | Runs when the user double-clicks the node |
| `active` | `boolean` | No | `` true when the URL matches `to` `` | Forces the active state, for a node that is also active on other paths. |
| `actions` | `ReactNode` | No | | Edit mode actions. See SidebarTree.NodeActions. |
| `highlighted` | `boolean` | No | | Shows the highlight of a new node (see _HighlightElement.css) and scrolls the node into view |
| `className` | `string` | No | | Only for the position of the node, not for its look |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

`SidebarTreeNodeAction` — What the node does on a click

| Variant | Props | Description |
| - | - | - |
| `ClickAction` | `onClick` | Runs "onClick": the node is a button |
| `LinkAction` | `to`, `exact`, `newTab`, `onClick` | A link to a page of DatoCMS |
| `ExternalLinkAction` | `href`, `newTab`, `onClick` | A link to another site |
| `NoAction` | | No action: a plain row |

`SidebarTreeNodePlacement` — Where the node is: in a tree or not

| Variant | Props | Description |
| - | - | - |
| `InTree` | `tree` | A node in a tree with drag and drop |
| `OutOfTree` | `alignWithTree` | A node out of a tree |

#### Types

`SidebarTreeNodeTreeProps` — The props of a node that is in a tree with drag and drop

```ts
export type SidebarTreeNodeTreeProps = {
  /** True when the user reorders the tree. The node shows a grip. */
  editMode: boolean;
  /**
   * Give it when the node has child nodes: the node shows the toggle that
   * opens and closes them
   */
  expandable?: {
    /** True when the child nodes show */
    open: boolean;
    /** Runs when the user clicks the toggle */
    onToggle: () => void;
  };
  /** True when the user can drop other nodes into this node */
  droppable: boolean;
};
```

### tree

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `editMode` | `boolean` | Yes | | True when the user reorders the tree. The node shows a grip. |
| `expandable` | `{ open: boolean; onToggle: () => void; }` | No | | Give it when the node has child nodes: the node shows the toggle that opens and closes them |
| `droppable` | `boolean` | Yes | | True when the user can drop other nodes into this node |

### SidebarTree.NodeActions

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `editTo` | `string` | Yes | | The page of the "edit" option: the path with its query |
| `editLabel` | `Message` | Yes | | The text of the "edit" option |
| `deleteLabel` | `Message` | Yes | | The text of the "delete" option |
| `onDelete` | `() => void` | Yes | | Runs when the user picks the "delete" option |
| `onReorder` | `() => void` | No | | The option that starts the edit mode of the tree, where the user reorders the items. Do not give it in edit mode. |
| `add` | `{ label: Message; onAdd: () => void; icon?: SvgIcon; }` | No | | The option that adds an item inside the node |
