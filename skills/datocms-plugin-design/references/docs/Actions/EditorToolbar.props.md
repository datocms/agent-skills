## Props

### EditorToolbar

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `hidden` | `boolean` | No | `false` | Hides the toolbar. Give the negation of `visible` of `useEditorToolbarWiring`, or the negation of the value of `useEditorToolbarVisible`. |
| `children` | `ReactNode` | Yes | | The groups of the toolbar: `EditorToolbar.Group` or `EditorToolbar.Buttons`. |
| `ariaLabel` | `TextMessage` | No | `"Text formatting"` | The accessible name of the toolbar. |

### EditorToolbar.Buttons

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `buttons` | `readonly string[]` | Yes | | The buttons that the settings of the field enable. For example `['bold', 'italic', 'link']`. |
| `commands` | `EditorToolbarCommands` | Yes | | The commands of the editor. A button without a command does not show. |

#### Types

`EditorToolbarCommands`

```ts
export type EditorToolbarCommands = Partial<
  Record<EditorToolbarButtonKey, EditorToolbarCommand>
>;
```

`EditorToolbarButtonKey` — The buttons that the toolbar of an editor can show. The settings of a field use the same names.

```ts
export type EditorToolbarButtonKey =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'unordered_list'
  | 'ordered_list'
  | 'quote'
  | 'link'
  | 'image'
  | 'table'
  | 'align_left'
  | 'align_center'
  | 'align_right'
  | 'align_justify'
  | 'outdent'
  | 'indent'
  | 'undo'
  | 'redo'
  | 'show_source'
  | 'fullscreen';
```

`EditorToolbarCommand` — What a button does in one editor

```ts
export type EditorToolbarCommand = {
  /** Runs the command in the editor. */
  run: () => void;
  /** Tells if the format is on at the cursor. */
  active?: boolean;
  /** Fades the button and stops the click. */
  disabled?: boolean;
  /** The shortcut of the editor for the command, for the tooltip. */
  shortcut?: string;
};
```

### EditorToolbarCommand

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `run` | `() => void` | Yes | | Runs the command in the editor. |
| `active` | `boolean` | No | | Tells if the format is on at the cursor. |
| `disabled` | `boolean` | No | | Fades the button and stops the click. |
| `shortcut` | `string` | No | | The shortcut of the editor for the command, for the tooltip. |

### EditorToolbar.Button

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `active` | `boolean` | Yes | | Tells if the format of the button is on at the cursor. |
| `disabled` | `boolean` | No | `false` | Fades the button and stops the click. |
| `label` | `TextMessage` | Yes | | The name of the button. It is the text of the tooltip and the accessible name. |
| `shortcut` | `string` | No | | The keyboard shortcut of the editor, for the tooltip. For example `mod+b`. |
| `onClick` | `(event: React.MouseEvent) => void` | No | | Runs the command of the button. The button keeps the focus and the selection in the editor, so do not call `preventDefault()`. |

Also accepts:

- `children` (from `React`)

### EditorToolbar.Dropdown

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `icon` | `SvgIcon` | No | | The icon before the label, for example the icon of the current block style. |
| `label` | `Message` | Yes | | The text of the trigger: the current value ("Paragraph") or the name of the menu ("Insert"). A long text ends with "…". |
| `muted` | `boolean` | No | `false` | Shows the label in a subtle ink: the value is mixed ("Multiple styles") or not valid. |
| `wide` | `boolean` | No | `false` | Makes the trigger wider, for a label that is a value ("Paragraph"): 150px, not 120px. |
| `disabled` | `boolean` | No | `false` | Stops the user from opening the menu. |
| `onToggle` | `(open: boolean) => void` | No | | Runs with the new state: `true` when the menu opens, `false` when it closes. Use it to keep the toolbar visible while the menu is open. |
| `children` | `ReactElement` | Yes | | The `Dropdown.Menu` that opens under the trigger. |
