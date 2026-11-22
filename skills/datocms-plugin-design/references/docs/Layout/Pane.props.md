## Props

### Pane

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` | `TextMessage` | No | | The label of the parts of the pane that get none of their own (the filter of the list, the pagination) |
| `className` | `string` | No | | Only for the content of the pane, not for the look of the box |
| `busy` | `boolean` | No | | Shows a spinner on the pane while its content loads again (for example the records of a list after a change of the filter) |
| `header` | `ReactNode` | No | | The fixed bar at the top: a Pane.Header, or a Toolbar. The pane draws a line under each element of the slot (for example the toolbar and the filter row under it). |
| `slideUpToolbar` | `ReactNode` | No | | A bar between the content and the footer, for the actions on the selected items (a MultipleSelectionActionBar). The bar shows and hides itself. |
| `mode` | `{ onExit: () => void; }` | No | | Puts the pane in a mode (for example the reorder mode of a sidebar). While the prop is set, the pane draws a primary frame around its content, under the title bar. So the user sees that the pane is in that mode. The title in the header is the name of the mode.<br>For a screen reader, the content is then a group with the title as its name. When the mode starts, the focus goes to the group. When the mode stops and the focus has no element (the "Done" button goes away), the focus goes to the content. |
| `footer` | `ReactNode` | No | | The fixed bar at the bottom (for example a Toolbar with the pagination). The pane draws a line above each element of the slot. |
| `tabPanel` | `{ id: string; labelledBy: string }` | No | | The content is the panel of tabs in the header (see Toolbar.Tabs): it gets role="tabpanel", the id that the tabs control, and the id of the active tab as its label. |

Example of `ariaLabel`:

```tsx
"Roles"
```

Also accepts:

- `children` (from `React`)

### Pane.Header

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `filter` | `ListFilterProps` | No | | The text filter of the list (the "filter" of useFilteredList). The header shows the filter button in the bar and the filter row under it. |
| `children` | `ReactNode` | Yes | | The parts: Pane.Header.Title or Pane.Header.Tabs, and the others |

### Pane.Header.Title

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `Message` | Yes | | The title |
| `level` | `HeadingLevel` | No | | The level of the title as a heading. Give it only to a pane inside \<main> or inside a dialog that has content: the title of a detail pane is level 2. Without it, the title is not a heading (for example the title of a list on the left). |
| `help` | `ReactNode` | No | | The help of the page (a Toolbar.Help element) |
| `presets` | `ListPresetsProps` | No | | Makes the title a menu of presets (views of the list: fixed filters with a name), with the help at the bottom of the menu. The "presets" of useFilteredList.<br>See `` |

### Pane.Header.Tabs

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | Toolbar.TabLink elements: each tab is a page with its own URL |
| `help` | `ReactNode` | No | | The help of the page (a Toolbar.Help element). It shows after the tabs. |

`Pane.Header.Subtitle`, `Pane.Header.Menu`, `Pane.Header.Display` and
[`Pane.Header.Button`](https://react-ui.datocms.com/Actions/Button.md) take only `children`. [`Pane.Header.Spinner`](https://react-ui.datocms.com/Feedback/Progress.md) takes no props.

### Pane.FormHeader.Title

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The name of the thing that the form edits |
| `help` | `ReactNode` | No | | The help of the page (a Toolbar.Help element) |

### Pane.FormHeader.Details

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The state of the thing, immediately after the title: a Pill, or a Toolbar.TextualDropdown ("Used by 3 models") |

### Pane.FormHeader.Menu

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The actions on the thing (Dropdown.Option elements): duplicate, then delete as the last option, after a separator |
| `hidden` | `boolean` | No | | The menu does not show, for example on the form of a new thing |

### Pane.FormHeader.Submit

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The submit button of the form: a Toolbar.Button with `tone="primary"` and `submit` |
