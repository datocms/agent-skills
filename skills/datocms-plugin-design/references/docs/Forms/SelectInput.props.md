## Props

### SelectInput

The props that all inputs have (`id`, `value`, `name`, `onChange`, `onBlur`,
`disabled`, `readOnly`) follow the contract of an input. The props of
react-select also work, for example `placeholder`, `formatOptionLabel` and
`filterOption`. `search` replaces `filterOption` and `onInputChange`.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `multiple` | `boolean` | No | | Lets the user pick one option. The value is a string or `null`.<br>Lets the user pick many options. The value is a list of strings. The user can drag the values to sort them. |
| `loading` | `boolean` | No | | The options load: the control shows a spinner, and the open menu shows the loading text instead of the options |
| `clearable` | `boolean` | No | | Shows a button that clears the value. A single select with no value needs it to go back to empty. |
| `autosize` | `boolean` | No | | The control is as wide as its value, not as wide as the field. |
| `variant` | `SelectVariant` | No | `'default'` | The look of the control. "default" is a field with a border. "embedded" has no border: use it inside another box. "filter" is embedded and small, for the operator and the value of a filter tile. "filter-field" is a filter select with the soft primary color, for the field of a filter tile. |
| `acceptValueNotIncludedInOptions` | `(value: string) => O \| undefined` | No | | Makes an option for a value that is not in `options`, so the select shows it. Without it, or when it gives `undefined`, the select shows no text for such a value. |
| `creatable` | `SelectCreatable` | No | | The user can type a value that is not an option, and add it |
| `search` | `SelectSearch` | No | | Turns off the filter of the select and reports the text that the user types. Use it when the options come from a request and the server does the filter: load the options for `search.onQueryChange`, give them in `options` and set `loading` while the request runs. `useAsyncSelectOptions` does all of it. It replaces the `filterOption` and the `onInputChange` of react-select. |
| `menuFooter` | `ReactNode` | No | | Actions below the options of the menu, for example "Create new". Build them with `SelectMenuAction`: an action with `list` opens a second list instead of the options. Close the menu with `closeSelectMenu`. |

Also accepts:

- all of `Props`
- `defaultInputValue`, `defaultMenuIsOpen`, `defaultValue` (from `StateManagerAdditionalProps`)

#### Types

`SelectVariant` — The look of the control of a SelectInput

```ts
export type SelectVariant = 'default' | 'embedded' | 'filter' | 'filter-field';
```

`SelectCreatable` — The user can type a value that is not an option: the menu then shows an option that creates it.

```ts
export type SelectCreatable = {
  /** Called with the text that the user types, to add the new value */
  onCreate: (inputValue: string) => void;
  /**
   * The label of the option that creates the value. By default it is
   * 'Create "…"'.
   */
  formatLabel?: (inputValue: string) => ReactNode;
};
```

`SelectSearch` — The select shows the options that it gets and does not filter them: the page loads the options that match the text that the user types.

```ts
export type SelectSearch = {
  /**
   * Called with the text in the input each time it changes. The select
   * empties the input when the user picks an option, leaves the select or
   * closes the menu: the query is then an empty string, so the next open
   * starts from the full list.
   */
  onQueryChange: (query: string) => void;
};
```

### SelectCreatable

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `onCreate` | `(inputValue: string) => void` | Yes | | Called with the text that the user types, to add the new value |
| `formatLabel` | `(inputValue: string) => ReactNode` | No | | The label of the option that creates the value. By default it is 'Create "…"'. |

### SelectSearch

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `onQueryChange` | `(query: string) => void` | Yes | | Called with the text in the input each time it changes. The select empties the input when the user picks an option, leaves the select or closes the menu: the query is then an empty string, so the next open starts from the full list. |

### SelectMenuAction

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `icon` | `ReactNode` | No | | The icon before the label. It starts where the content of an option starts. |
| `label` | `Message` | Yes | | The label of the action |
| `onPick` (variant) | `() => void` | No | | Called when the user picks the action. Call `closeSelectMenu` first when the action opens a modal, so the menu is not open below the modal. |
| `list` (variant) | `ReactNode` | No | | The action opens this list of actions instead of the options. The select shows the label of the action as the title of the list, which goes back to the options. Escape and the close of the menu go back too. |
