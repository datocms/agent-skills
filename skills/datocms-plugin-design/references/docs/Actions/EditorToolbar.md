# EditorToolbar

The toolbar above the content of a text editor: structured text, Markdown or
HTML. It shows the formats at the cursor and runs the commands of the
editor.

Other components for other cases:

- A toolbar of a page or a panel is a [`Toolbar`](https://react-ui.datocms.com/Layout/Toolbar.md), not an `EditorToolbar`.
- Do not use the toolbar of the editor library (EasyMDE, TinyMCE). Turn it off and run its commands from these buttons.

## Buttons from commands

An editor that is not structured text gives a list of `commands` to
`EditorToolbar.Buttons`. The component knows the icon, the translated label
and the position of each button. A button shows only when the field settings
enable it (`buttons`) and the editor has a command for it.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import {
  EditorToolbar,
  type EditorToolbarCommands,
} from 'datocms-react-ui/EditorToolbar';
import React, { useState } from 'react';
import { ParagraphIcon } from '@/icons';

const buttons = [
  'bold',
  'italic',
  'strikethrough',
  'code',
  'unordered_list',
  'ordered_list',
  'quote',
  'link',
  'image',
  'table',
  'undo',
  'redo',
  'fullscreen',
];

export default function Basic() {
  const [active, setActive] = useState<Record<string, boolean>>({
    bold: true,
  });
  const [block, setBlock] = useState('Paragraph');

  const toggle = (key: string) => () =>
    setActive((current) => ({ ...current, [key]: !current[key] }));

  const commands: EditorToolbarCommands = {
    bold: { run: toggle('bold'), active: active.bold, shortcut: 'mod+b' },
    italic: {
      run: toggle('italic'),
      active: active.italic,
      shortcut: 'mod+i',
    },
    strikethrough: {
      run: toggle('strikethrough'),
      active: active.strikethrough,
    },
    code: { run: toggle('code'), active: active.code },
    unordered_list: {
      run: toggle('unordered_list'),
      active: active.unordered_list,
    },
    ordered_list: {
      run: toggle('ordered_list'),
      active: active.ordered_list,
    },
    quote: { run: toggle('quote'), active: active.quote },
    link: { run: toggle('link'), active: active.link, shortcut: 'mod+shift+k' },
    image: { run: () => {} },
    table: { run: () => {} },
    undo: { run: () => {}, disabled: true, shortcut: 'mod+z' },
    redo: { run: () => {}, disabled: true, shortcut: 'mod+shift+z' },
    fullscreen: { run: toggle('fullscreen'), active: active.fullscreen },
  };

  return (
    <EditorToolbar>
      <EditorToolbar.Group>
        <EditorToolbar.Dropdown wide icon={ParagraphIcon} label={block}>
          <Dropdown.Menu contextualSearch={false}>
            {['Paragraph', 'Heading 1', 'Heading 2', 'Code block'].map(
              (name) => (
                <Dropdown.Option
                  key={name}
                  active={block === name}
                  onPick={() => setBlock(name)}
                  icon={<ParagraphIcon />}
                >
                  {name}
                </Dropdown.Option>
              ),
            )}
          </Dropdown.Menu>
        </EditorToolbar.Dropdown>
      </EditorToolbar.Group>
      <EditorToolbar.Buttons buttons={buttons} commands={commands} />
    </EditorToolbar>
  );
}
```

The order of the groups is fixed: the block style (a dropdown), the
marks, the lists and the quote, the link, the things to insert, then the
groups that only one editor has (alignment, indent, undo and redo, source
and full screen). The field settings only say which buttons show.
Image and table are buttons in the link group. Only the structured
text editor has an “Insert” dropdown, for its blocks.

**Do:** Put the style of the block in a dropdown, in the first group.

```tsx
<EditorToolbar>
  <EditorToolbar.Group>
    <EditorToolbar.Dropdown wide icon={ParagraphIcon} label="Paragraph">
      <span />
    </EditorToolbar.Dropdown>
  </EditorToolbar.Group>
  <EditorToolbar.Group>
    <EditorToolbar.Button active={false} label="Bold"><BoldIcon /></EditorToolbar.Button>
  </EditorToolbar.Group>
</EditorToolbar>
```

**Don’t:** Do not put a block style as a button next to the marks.

```tsx
<EditorToolbar>
  <EditorToolbar.Group>
    <EditorToolbar.Button active={false} label="Bold"><BoldIcon /></EditorToolbar.Button>
    <EditorToolbar.Button active={false} label="Heading 1"><Heading1Icon /></EditorToolbar.Button>
  </EditorToolbar.Group>
</EditorToolbar>
```

## Groups and single buttons

An editor that makes its own buttons (structured text) uses
`EditorToolbar.Group` and [`EditorToolbar.Button`](https://react-ui.datocms.com/Actions/Button.md). A group draws a separator
after its last button. The tooltip of a button is its `label` (a text or
`{ id }`), which is also its accessible name, and, when the editor has one,
its `shortcut`.

A toolbar that floats above the text (a balloon toolbar) puts its buttons in
`EditorToolbar.TooltipPlacement` with `value="bottom"`, so the tooltips do
not cover the text.

A button runs its command on `onClick`. A press in the toolbar or in its
menus does not take the focus from the editor, so the editor keeps the
selection. A text field in a menu takes the focus as usual.

```tsx
import { EditorToolbar } from 'datocms-react-ui/EditorToolbar';
import React, { useState } from 'react';
import { BoldIcon, ImageIcon, ItalicIcon, LinkIcon } from '@/icons';

export default function Groups() {
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  const toggle = (set: React.Dispatch<React.SetStateAction<boolean>>) => () =>
    set((value) => !value);

  return (
    <EditorToolbar>
      <EditorToolbar.Group>
        <EditorToolbar.Button
          active={bold}
          label="Bold"
          shortcut="mod+b"
          onClick={toggle(setBold)}
        >
          <BoldIcon />
        </EditorToolbar.Button>
        <EditorToolbar.Button
          active={italic}
          label="Italic"
          shortcut="mod+i"
          onClick={toggle(setItalic)}
        >
          <ItalicIcon />
        </EditorToolbar.Button>
      </EditorToolbar.Group>
      <EditorToolbar.Group>
        <EditorToolbar.Button
          active={false}
          label="Link"
          shortcut="mod+shift+k"
        >
          <LinkIcon />
        </EditorToolbar.Button>
        <EditorToolbar.Button active={false} disabled label="Add image">
          <ImageIcon />
        </EditorToolbar.Button>
      </EditorToolbar.Group>
    </EditorToolbar>
  );
}
```

## When the toolbar shows

The toolbar shows only while the editor has the focus, or while one of its
menus or dialogs is open. `useEditorToolbarWiring` keeps this state for an
editor that is not structured text. Give its `onMenuToggle` to the
`onToggle` of each [`EditorToolbar.Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md). `onToggle` gets the new state.
Structured text uses `useEditorToolbarVisible` with its own focus and modal
state. Pass the negation of the visible state to the `hidden` prop of
`EditorToolbar` (`hidden={!visible}`). `useEditorToolbarState` reads the
formats at the cursor and renders again only when a format changes.

```tsx
import {
  EditorToolbar,
  useEditorToolbarWiring,
} from 'datocms-react-ui/EditorToolbar';
import React, { useRef } from 'react';
import { BoldIcon } from '@/icons';

export default function Visibility() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use this hook for an editor that is not structured text. The toolbar
  // shows while the editor has the focus, while a menu is open, or in
  // fullscreen.
  const { setFocused, visible } = useEditorToolbarWiring({
    busy: false,
    focusEditor: () => textareaRef.current?.focus(),
  });

  return (
    <div style={{ border: '1px solid var(--color--border)' }}>
      <EditorToolbar hidden={!visible}>
        <EditorToolbar.Group>
          <EditorToolbar.Button active={false} label="Bold" shortcut="mod+b">
            <BoldIcon />
          </EditorToolbar.Button>
        </EditorToolbar.Group>
      </EditorToolbar>
      <textarea
        ref={textareaRef}
        aria-label="Notes"
        rows={4}
        defaultValue="Click here: the toolbar shows while the editor has the focus."
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ width: '100%', padding: 'var(--spacing-m)', border: 0 }}
      />
    </div>
  );
}
```

## Accessibility

The toolbar is a `role="toolbar"` with one Tab stop. Shift+Tab from the text
of the editor moves the focus to the toolbar. Left and Right move between the
buttons and the dropdowns, Home and End go to the first and the last one, and
Tab leaves the toolbar. Enter and Space run a button or open a dropdown. A
button shows its state with `aria-pressed`. The toolbar stays visible while
the focus is in it or in one of its menus.

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
