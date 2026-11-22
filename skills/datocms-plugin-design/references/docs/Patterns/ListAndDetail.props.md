## Props

### ListDetail.Page

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `detail` | `ListDetailSplitDetail` | No | | The rows open a detail on the right (see ListDetail.Split) |
| `title` | `TextMessage` | Yes | | The Pane uses the title as the label of the filter form, so it is a TextMessage |
| `help` | `ReactNode` | No | | A Toolbar.Help element |
| `subtitle` | `Message` | No | | The count of the list, after the title |
| `menu` | `ReactNode` | No | | The options of the "⋯" menu of the title bar (Dropdown Option elements) |
| `display` | `ReactNode` | No | | A menu after the title that changes how the list shows (the layout, the order) |
| `busy` | `boolean` | No | | The list loads in the background. The title bar shows a small spinner. |
| `filter` | `{ toolbar: { open: boolean; onOpen: () => void; onToggle: () => void; onClose: () => void; }; form: ReactNode; }` | No | | The filter of the list: the result of useFilterToolbar (see Toolbar) and the filter form. The form shows in a toolbar under the title bar while the filter toolbar is open. A list without a filter does not set it. |
| `controls` | `ReactNode` | No | | Controls at the end of the title bar, before the filter toggle (for example, a status) |
| `button` | `ReactNode` | No | | The button at the end of the title bar, after the filter toggle (for example, a "New" button) |
| `footer` | `ReactNode` | No | | The bar under the list (for example, the pagination) |
| `children` | `ReactNode` | Yes | | The table of the list |
| `state` | `ListDetailPageState \| Exclude<ListDetailPageState, 'empty'>` | Yes | | What the page shows (see getPaginatedListState) |
| `overview` (variant) | `ReactElement` | No | | All the page when the list is empty: a BlankSlate with titleLevel={1} |

#### Types

`ListDetailPageState` — The state of the list: - "loading": the first load did not end. The page shows a spinner. - "empty": the list has no elements and no filter. The page shows only `overview` (see ListOrOverview). - "no-results": the filter keeps no element. The body shows the shared "no results" state. - "ready": the body shows the children (the table).

```ts
export type ListDetailPageState = 'loading' | 'empty' | 'no-results' | 'ready';
```

### ListDetail.Panel

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `title` | `TextMessage` | Yes | | The title of the panel. It is also the name of the panel for screen readers: the panel is a complementary landmark of the page. |
| `state` | `'loading' \| 'failed' \| 'ready'` | No | `"ready"` | "loading": the element is not available yet. "failed": the load of the element failed, and the panel shows an error. |
| `fetching` (variant) | `boolean` | No | | A part of the element is loading. A spinner shows in the title bar, as in the toolbar of the list. |
| `actions` (variant) | `React.ReactNode` | No | | The actions on the element, for example "Resend now". They are the options (Option) of the dropdown menu with the three dots in the title bar. |
| `toolbarAction` (variant) | `React.ReactNode` | No | | The main action on the element, for example "Open project". It is a button with the "primary" tone at the right end of the title bar. Use the "milli" size, as for the other buttons of a toolbar. |
| `entity` (variant) | `{ title: Message; subtitle?: Message; image?: React.ReactNode; }` | No | | The element that the panel shows: its name and a line under it (for example the email of a member), with an optional image on the left (for example an avatar). Without it, the page writes its own `ListDetailPanel__entity` block in the children. |
| `children` (variant) | `React.ReactNode` | No | | The facts of the element: SidebarPanels with an InfoList |

### ListDetail.Split

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `detail` | `ListDetailSplitDetail` | No | | The rows open a detail on the right. Without it, the list is alone. |
| `children` | `React.ReactNode` | Yes | | The list: a Pane |

#### Types

`ListDetailSplitDetail` — The detail of the open row

```ts
export type ListDetailSplitDetail = {
  /** The panel of the open row (a ListDetail.Panel). Without it, no row is open. */
  panel?: React.ReactNode;
  /**
   * Closes the open row. Escape, `]` and, when the panel goes over the
   * list, the close button of the panel and a click on an empty part of the
   * list run it.
   */
  onClose: () => void;
  /**
   * Opens the last open row again, while no row is open. Without it, `]`
   * only closes the open row.
   */
  onReopen?: () => void;
  /**
   * Where the panel goes. "beside": on the right of the list, and the list
   * keeps a part of the width for the panel. Use it for a table with few,
   * narrow columns. "over": the list takes all the width, and the open
   * panel goes over the right part of the list. Use it for a table that
   * needs the width. Below 1100px of window width, the panel always goes
   * over the list. There is no default: choose the placement for each list.
   */
  placement: ListDetailPlacement;
};
```

`ListDetailPlacement` — Where the panel of the open row goes

```ts
export type ListDetailPlacement = 'beside' | 'over';
```
