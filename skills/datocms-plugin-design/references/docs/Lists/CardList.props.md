## Props

### CardList

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `header` | `CardListHeader` | No | | A strip above the items, with the entity of the items |
| `add` | `ActionOrMenu` | No | | The button that adds an item, in the footer of the card |
| `empty` | `ReactNode` | No | | Shows instead of the card when the card has no items (for example an EmptySlot with the button that adds the first item) |
| `actionsVisibility` | `'hover' \| 'always'` | No | | When the actions of the items show. With `hover`, they show only when the pointer or the focus is on the item, when its menu is open or when the item is open (on devices without a pointer, always). Use `always` in a list that the user only reads: the actions are the only way to go further, and the row under the pointer gets the hover surface. |
| `className` | `string` | No | | |
| `id` | `string` | No | | |
| `children` | `ReactNode` | No | | The CardList.Item elements |

#### Types

`CardListHeader`

```ts
export type CardListHeader = {
  /** The icon of the entity of the items (a model, a plugin) */
  image?: ReactNode;
  /** The name of the entity of the items */
  title: Message;
  /** A short note after the title, in the subtle ink (for example an API key) */
  aside?: Message;
  /** The content at the end of the header (for example counters) */
  trailing?: ReactNode;
  /**
   * Only for a card that opens and closes. When the card is closed, it
   * shows only its header. Without `onToggle`, the card cannot close (for
   * example, it shows an error) and the chevron is disabled.
   */
  collapse?: { open: boolean; onToggle?: () => void };
};
```

### header

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `image` | `ReactNode` | No | | The icon of the entity of the items (a model, a plugin) |
| `title` | `Message` | Yes | | The name of the entity of the items |
| `aside` | `Message` | No | | A short note after the title, in the subtle ink (for example an API key) |
| `trailing` | `ReactNode` | No | | The content at the end of the header (for example counters) |
| `collapse` | `{ open: boolean; onToggle?: () => void }` | No | | Only for a card that opens and closes. When the card is closed, it shows only its header. Without `onToggle`, the card cannot close (for example, it shows an error) and the chevron is disabled. |

### CardList.Item

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `className` | `string` | No | | |
| `row` (variant) | `CardListRow` | No | | |
| `body` (variant) | `ReactNode` | No | | ItemWithRow: Shows below the row (for example the fields of the item)<br>ItemWithoutRow: The content of the item |
| `expandable` (variant) | `CardListExpandable` | No | | |

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

Group 1

| Variant | Props | Description |
| - | - | - |
| `ItemWithRow` | `row`, `body` | A row, with an optional body that always shows |
| `ExpandableItem` | `row`, `expandable` | A row that opens and closes the body |
| `ItemWithoutRow` | `body` | Only a body, without a row (for example the only item of a field) |

#### Types

`CardListRow`

```ts
export type CardListRow = {
  /**
   * The content of the row: a sentence, an EntityRow. In an item that opens
   * and closes, it is in the disclosure button: it must not have links or
   * buttons.
   */
  summary: ReactNode;
  /** The content after the summary (for example the state of a rule) */
  trailing?: ReactNode;
  /**
   * The actions of the item (an icon button, a menu, a "Change" button).
   * They go in a column with the width of a micro icon button at least,
   * so the icon actions of all the items align.
   */
  actions?: ReactNode;
};
```

`CardListExpandable`

```ts
export type CardListExpandable = {
  /** The body shows */
  open: boolean;
  /** Runs on a click on the row or on its disclosure button */
  onToggle: () => void;
  /** Shows below the row when the item is open */
  body: ReactNode;
};
```

### row

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `summary` | `ReactNode` | Yes | | The content of the row: a sentence, an EntityRow. In an item that opens and closes, it is in the disclosure button: it must not have links or buttons. |
| `trailing` | `ReactNode` | No | | The content after the summary (for example the state of a rule) |
| `actions` | `ReactNode` | No | | The actions of the item (an icon button, a menu, a "Change" button). They go in a column with the width of a micro icon button at least, so the icon actions of all the items align. |

### expandable

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `open` | `boolean` | Yes | | The body shows |
| `onToggle` | `() => void` | Yes | | Runs on a click on the row or on its disclosure button |
| `body` | `ReactNode` | Yes | | Shows below the row when the item is open |

### CardList.RemoveButton

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` | `TextMessage` | Yes | | The accessible name and the tooltip, for example "Remove trigger" |
| `onClick` | `() => void` | Yes | | |
