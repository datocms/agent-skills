## Props

### Dropdown

`triggerComponent` is the trigger, and `children` is the `Dropdown.Menu` (or
a function that returns it). `controlRef` lets you open the menu from
code. `className` is only for the position of the dropdown. All the other props
go to the trigger.

## Dropdown.Menu props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `React.ReactNode` | Yes | | The options, groups, separators and texts of the menu |
| `placement` | `Placement` | No | `"bottom-start"` | The side of the trigger where the menu opens. When there is no space there, the menu goes to the other side. Use "bottom-end" for a trigger on the right of its container (the "⋮" of a row). |
| `noOverflowHidden` | `boolean` | No | | The menu does not clip its content. Give it when the content has its own popup (for example a date picker). |
| `contextualSearch` | `ContextualSearch` | No | `"auto"` | A search field at the top of the menu. With "auto", it shows when the menu has more than 5 options. With "{ placeholder }", it always shows, with that text instead of "Search...". |
| `minWidth` | `number` | No | | The minimum width of the menu, in pixels |
| `optionPaddingY` | `number` | No | | The vertical padding of the options, in pixels. Give it to a menu of options on two lines (an entity row with a title and details). |
| `offset` | `OffsetOptions` | No | `{ mainAxis: 4 }` | The distance between the trigger and the menu |

## Dropdown.Option props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `onPick` (variant) | `PickHandler \| undefined` | No | | Runs when the user picks the option (click, tap or Enter). A wrapper can give "undefined": the option then has no action. |
| `to` (variant) | `string` | No | | The page of DatoCMS that the option opens |
| `href` (variant) | `string` | No | | The URL that the option opens |
| `newTab` (variant) | `boolean` | No | | LinkAction: Opens the page in a new tab<br>ExternalLinkAction: Opens the page in a new tab (for example the docs) |
| `action` (variant) | `string` | No | | The id of the action |
| `active` | `boolean` | No | | The value that is selected now, in a menu of choices: a check shows before the option. Give "false" to the other options of the menu, so that all the labels line up. |
| `forceHover` | `boolean` | No | | Shows the hover look. Submenu uses it while its menu is open. |
| `alert` | `boolean` | No | | Marks a destructive choice, for example a delete or a remove. The option shows in red. Put it last, after a Dropdown.Separator. |
| `invalid` | `boolean` | No | | Shows the triangle of an invalid value after the label |
| `children` | `React.ReactNode` | Yes | | The label of the option |
| `sortable` | `OptionSortable` | No | | The user can drag the option to a new position. Give it to the options of a Dropdown.Group with "onDragEnd". |
| `disabled` | `Disabled` | No | | With a reason, the option is disabled and its tooltip says why. With "interactive", the reason has links: it shows in a HoverCard. |
| `closeMenuOnClick` | `boolean` | No | `true` | Give "false" when the menu must stay open after the pick (for example to pick more values) |
| `checkbox` | `OptionCheckbox` | No | | Shows a checkbox before the label, for a menu of many values. Without an action, a pick of the option changes the checkbox, and the menu stays open. Without "onChange", the checkbox is read-only. |
| `icon` | `React.ReactNode` | No | | The icon before the label. In a menu of actions, give an icon to all the options. In a menu of choices, give no icons. |
| `keywords` | `string[]` | No | | More words that the search field of the menu finds, in addition to the text of the option. For example, "markdown" finds a text field. |
| `submenu` | `OptionSubmenu` | No | | Shows a chevron after the label, and a screen reader says if the submenu is open. Dropdown.Submenu gives it. |
| `actions` | `React.ReactNode` | No | | Icon buttons at the end of the option (Dropdown.OptionAction). With actions, only the label is the target of the click. |

### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

`OptionAction` — The action of an option: a pick handler, an action of the registry, a page of DatoCMS, or another site. One option has one action.

| Variant | Props | Description |
| - | - | - |
| `PickAction` | `onPick` | Runs "onPick" |
| `RegistryAction` | `action` | Runs an action of the registry (`Actions`). The keys of the action show at the end of the option. The option is disabled while the action gives a reason, or when the action does not exist now. |
| `LinkAction` | `to`, `newTab` | A link to a page of DatoCMS. When the page is open, the option gets aria-current="page". |
| `ExternalLinkAction` | `href`, `newTab` | A link to another site |
| `NoAction` | | No action: the option opens a submenu, or it has a checkbox or actions, or it is disabled |

### Types

`PickHandler` — The handler of a pick. When it returns a promise and the menu stays open ("closeMenuOnClick" is false), a click out of the menu does not close it until the promise ends.

```ts
type PickHandler = (
  event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
) => unknown;
```

`OptionSortable` — The place of an option in a sortable Dropdown.Group

```ts
export type OptionSortable = {
  /**
   * A name that stays the same when the option moves. It is "draggableId"
   * in the drop result.
   */
  id: string;
  /** The position of the option in its group */
  index: number;
};
```

`OptionCheckbox` — The checkbox of an option

```ts
export type OptionCheckbox = {
  /** The value of the checkbox */
  checked: boolean;
  /** Runs when the user changes the checkbox */
  onChange?: (newValue: boolean) => void;
};
```

`OptionSubmenu` — The submenu of an option

```ts
export type OptionSubmenu = {
  /** True when the submenu is open */
  open: boolean;
};
```

## Dropdown.Group props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `React.ReactNode` | Yes | | The options of the group |
| `name` | `Message` | No | | The title of the group, for example `{ id: 'filter.shared' }`. It sticks at the top while the options scroll. |
| `icon` | `React.ReactNode` | No | | An icon before the title, for the kind of all the options of the group (an organization, an agency). The options then have no icon of their own. |
| `onDragEnd` | `(result: SortableDropResult) => void` | No | | Give it to let the user reorder the options of the group with drag and drop. Each option then needs "sortable". |

## Dropdown.Submenu props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `triggerContent` | `ReactNode` | Yes | | The label of the option that opens the submenu |
| `triggerIcon` | `ReactNode` | No | | The icon of the option that opens the submenu |
| `children` | `ReactNode` | Yes | | The options of the submenu |
| `disabled` | `boolean` | No | | The option cannot open the submenu |

## Dropdown.OptionAction props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `icon` | `SvgIcon` | Yes | | The icon of the button |
| `alert` | `boolean` | No | | Marks a destructive choice, for example a delete. The icon shows in red. |
| `onClick` | `(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void` | Yes | | Runs when the user clicks the button |
| `closeMenuOnClick` | `boolean` | No | `true` | Give "false" when the menu must stay open after the click |
| `label` | `TextMessage` | Yes | | The tooltip and the accessible name of the icon button |

## Dropdown.Footer props

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `variant` | `'buttons' \| 'options'` | No | `"buttons"` | "buttons" is for the buttons that act on the options (for example "Add 3 locales"). "options" is for Dropdown.Options, for example "Create new organization…": they look like the options of the menu, as the actions in the footer of a SelectInput. |
| `children` | `React.ReactNode` | Yes | | The buttons or the options |

`Dropdown.Separator` and `Dropdown.Text` (a text that is not an option) have
no props other than `children`.
