## Props

### Toolbar

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The parts of the toolbar (Toolbar.Title, Toolbar.Space, …) |
| `style` | `'short' \| 'full'` | No | | "short" is a lower bar (40px), for a second toolbar under the main one. "full" makes the first part fill the width. |
| `borderBottom` | `boolean` | No | | A line below the toolbar, for a toolbar on top of a dialog or of tabs |
| `fields` | `boolean` | No | | The toolbar holds fields (a filter form): its buttons have the height of the fields ("field" size), so their edges align |
| `onClose` | `() => void` | No | | Closes the toolbar of a filter ("onClose" of useFilterToolbar). Escape in a text field of the toolbar calls it. |
| `className` | `string` | No | | Only for the placement of the toolbar (for example "Modal__header") |

### Toolbar.Title

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The title. A long title ends with an ellipsis. |
| `level` | `HeadingLevel` | No | | The level of the title as a heading. Give it only to a title inside \<main> or inside a dialog: the title of the content is level 1. Without it, the title is not a heading (for example the title of a sidebar). |
| `help` | `ReactNode` | No | | The help of the page (a Toolbar.Help). The "?" button shows after the title, in one group with it: the group gap is the space between them. Do not put a Toolbar.Help next to the title as a sibling. |
| `id` | `string` | No | | For aria-labelledby (for example the title of a dialog) |

### Toolbar.PresetsTitle

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` | `Message` | Yes | | The title of the list |
| `qualifier` | `Message` | No | | The short name of the active preset, after the title ("API tokens · Unused"). Give nothing when the list shows all the items. |
| `children` | `ReactNode` | Yes | | The options of the menu: PresetsTitle.Option elements |
| `footer` | `ReactNode` | No | | The content at the bottom of the menu, after a separator. The title opens a menu, so a "?" button next to it is one control too many: put the help of the page here (a Toolbar.HelpBody with "secondary"). |
| `level` | `HeadingLevel` | No | | The level of the title as a heading (see Toolbar.Title) |
| `id` | `string` | No | | The id of the heading, so other elements can use it as their label |

### Toolbar.PresetsTitle.Option

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The name of the preset: it says exactly what the preset keeps |
| `count` | `number` | No | | The number of the items that the preset keeps |
| `active` | `boolean` | Yes | | The preset is the active one |
| `onPick` | `() => void` | Yes | | Runs when the user picks the preset |

### Toolbar.Help

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The text that says what the page is for: two short sentences, plain text |
| `docsUrl` | `string` | No | | The page of the documentation about the subject. A "Learn more" link to it comes after the text. |

### Toolbar.Subtitle

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | A short text, for example the count of a list ("7,206 assets") |
| `hidden` | `boolean` | No | | The subtitle does not show |

### Toolbar.DotsDropdown

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The Dropdown.Option elements of the menu |
| `hidden` | `boolean` | No | | The menu does not show (give it when no option applies) |
| `label` | `TextMessage` | No | `"Actions"` | The name of the button and the text of its tooltip. Name the thing that the menu acts on, for example "Actions for Hello world". |

### Toolbar.GoBack

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `to` (variant) | `string` | No | | The URL of the parent page, for example the collection of a record |
| `onClick` (variant) | `() => void` | No | | Runs when the user clicks the chevron |
| `ariaLabel` | `TextMessage` | No | `{ id: 'toolbar.goBack' } ("Go back to the list")` | The name of the chevron for screen readers |
| `action` | `string` | No | | The id of the action of the registry that goes back: a tooltip shows the name of the chevron and the keys of the action |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

Group 1

| Variant | Props | Description |
| - | - | - |
| `GoBackLink` | `to` | A chevron that opens the parent page. It is a link. |
| `GoBackButton` | `onClick` | A chevron that runs an action, for example to close a panel. It is a button. |

### Toolbar.Group

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The controls of the group |
| `gap` | `'s'` | No | | Without a gap, the space between the controls is --Toolbar-group-gap, and the ghost icon buttons show as one strip. Use "s" for controls that have a visible surface, for example a primary button. |

### Toolbar.PrimaryButton

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `actions` | `ActionItem[]` | Yes | | The first action is the main button. The other actions go in the menu of a caret next to it (a split button). |
| `disabled` | `boolean` | No | | The button, the caret and the actions of the menu are disabled |
| `action` | `string` | No | | The id of the action of the main button: its name and its keys show in the tooltip (see the "action" tooltip of Button) |
| `iconOnly` | `boolean` | No | | Shows only the icon of the main action. The label is then the accessible name of the button. |
| `size` | `ButtonSize` | No | | The size of the button. The default is the size of its container: "milli" in a toolbar, "small" out of a toolbar. |

#### Types

`ActionItem` — One action of a PrimaryButton

```ts
export type ActionItem = (LinkActionItem | PickActionItem) & {
  /** The text of the action */
  label: TextMessage;
  /** The icon of the action */
  icon?: SvgIcon;
};
```

`LinkActionItem` — An action that opens a page of DatoCMS

```ts
type LinkActionItem = {
  /** A page of DatoCMS that the action opens */
  to: string;
  onPick?: never;
};
```

`PickActionItem` — An action that runs a function

```ts
type PickActionItem = {
  to?: never;
  /** Runs when the user picks the action */
  onPick: () => void;
};
```

### Toolbar.AddNewButton

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` | `TextMessage` | Yes | | The text of the button ("Add new webhook") |
| `to` | `string` | Yes | | The full URL of the page of the new item (DatoCMS adds its prefixes, for example the environment) |
| `disabled` | `boolean` | No | | The button cannot add |
| `icon` | `SvgIcon` | No | | The icon of the main action. The default is the "add" icon (a bolder version when the button shows only the icon). |
| `extraActions` | `ExtraAction[]` | No | | Other "add" actions. They show in a menu next to the button. |
| `action` | `string` | No | | The id of the action of the button: its name and its keys show in the tooltip (see the "action" tooltip of Button) |

#### Types

`ExtraAction`

```ts
type ExtraAction = {
  /** The text of the action */
  label: TextMessage;
  /** The full URL of the page (DatoCMS adds its prefixes) */
  to: string;
  /** The icon of the action */
  icon?: SvgIcon;
};
```

### Toolbar.FilterToggle

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `pressed` | `boolean` | Yes | | The filter is open ("open" of useFilterToolbar) |
| `onClick` | `() => void` | Yes | | Opens or closes the filter ("onToggle" of useFilterToolbar) |
| `onOpen` | `() => void` | No | | Opens the filter ("onOpen" of useFilterToolbar). `F` and `/` run it while the pointer or the focus is in the Pane, and the tooltip shows the keys. |

### Toolbar.FilterInput

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `value` | `string` | Yes | | The text of the filter |
| `onChange` | `(value: string) => void` | Yes | | Runs when the user changes the text |
| `ariaLabel` | `TextMessage` | No | | The name of the search landmark: what the field filters. Without it, the ariaLabel of the Pane. In a Toolbar.Search, the filter has no landmark of its own and does not use it. |
| `autoFocus` | `boolean` | No | `true` | The field gets the focus when it shows |
| `debounce` | `boolean` | No | `false` | "onChange" runs a moment after the user stops to type |
| `disabled` | `boolean` | No | | The field cannot change |
| `onClose` | `() => void` | No | | When it is set, the "✕" button is always visible. It clears the filter, then it calls this function (for example, to close the filter). |

### Toolbar.Search

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` | `TextMessage` | No | | The name of the search landmark: what the user searches or filters. Without it, the ariaLabel of the Pane. |
| `children` | `ReactNode` | Yes | | The fields and the buttons of the search, in a row |
| `className` | `string` | No | | For the layout of the children or for a container query of the page |

### Toolbar.Fill

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The controls of the part, in a row |
| `className` | `string` | No | | For the layout of the children or for a container query of the page |

### Toolbar.TextualDropdown

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The Dropdown.Option elements of the menu |
| `hidden` | `boolean` | No | | The menu does not show |
| `text` | `TextMessage` | Yes | | The text of the trigger: the current value |

### Toolbar.Spinner

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `show` | `boolean` | Yes | | The spinner shows |

### Toolbar.Tabs

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` | `TextMessage` | Yes | | The accessible name of the tablist, for example "Sidebar" |
| `children` | `ReactNode` | Yes | | The Toolbar.Tab elements |

### Toolbar.Tab

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | Yes | | The DOM id of the tab. Use `tabId(key)` of useTabIds. |
| `panelId` | `string` | Yes | | The DOM id of the panel that the tab shows. Use `panelId` of useTabIds. |
| `label` | `Message` | Yes | | The text of the tab, for example "Validations" |
| `active` | `boolean` | Yes | | True for the tab that shows |
| `invalid` | `boolean` | No | | The tab has fields with errors. It shows an error mark. |
| `onPick` | `() => void` | Yes | | Runs when the user picks the tab (click, or arrow keys) |

### Toolbar.TabLink

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `to` | `string` | Yes | | The page of the tab: the path with its query, for example "/schema/blog_post" |
| `label` | `Message` | Yes | | The text of the tab |
| `active` | `boolean` | No | | Sets the active tab when the URL does not tell it, for example a tab in the query of the URL. Without it, the tab is active when the URL matches `to`. |
| `invalid` | `boolean` | No | | The tab has fields with errors. It shows an error mark. |
| `replace` | `boolean` | No | | The link replaces the current entry of the history |

### Toolbar.Pagination

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `disabled` | `boolean` | No | `false` | The buttons do not respond, for example while the next page loads |
| `onChange` | `(newPage: number) => void` | Yes | | Runs when the user picks a page. The first page is 0. |
| `perPage` | `number` | Yes | | The number of items in one page, for example 25 |
| `currentPage` | `number` | Yes | | The page that shows. The first page is 0. |
| `maxNarrowPagesToBeShown` | `number` | No | | The most page numbers that show in a narrow toolbar (see Toolbar.Pagination). The other page numbers show only in a wide toolbar. |
| `totalEntries` | `number` | Yes | | The number of items in all the pages |
| `ariaLabel` | `TextMessage` | No | | What the pages are of ("Roles"). Without it, the ariaLabel of the Pane. |
| `compact` | `boolean` | No | | Always fewer page numbers, and no "Show" select. Without it, the pagination has this layout only when the toolbar is narrow. |
| `perPageSelect` | `ToolbarPaginationPerPageSelect` | No | | A "Show" select before the pages, to change the number of items of a page. Without it, the number of items of a page is fixed. |

#### Types

`ToolbarPaginationPerPageSelect` — The select of the number of items of a page

```ts
export type ToolbarPaginationPerPageSelect = {
  /** Runs when the user picks a number of items of a page */
  onChange: (newPerPage: number) => void;
  /**
   * The numbers of items of a page that the user can pick
   * @default [25, 50, 100, 200]
   */
  options?: number[];
};
```

[`Toolbar.Button`](https://react-ui.datocms.com/Actions/Button.md) takes the props of [`Button`](https://react-ui.datocms.com/Actions/Button.md), without
`size`. `Toolbar.Note` takes only its text, and `Toolbar.Space` and
`Toolbar.Divider` have no props.
