# CSS variables

The components get their spaces, sizes and radii from CSS variables. Use
the same variables in the CSS of your plugin: your content then lines up
with the components around it, and keeps the same rhythm. The colors are
on the [Color tokens](https://react-ui.datocms.com/Foundations/Colors.md) page.

The descriptions on this page come from the CSS of the components.

## Two kinds of variables

- **The variables of this page are on `:root`**: they work in every
  element of the plugin.
- **A component has its own variables** (`--SidebarPanel-inset`,
  `--Toolbar-height`), in the "CSS variables" table of its page. Most of
  them are on the element of the component, so they work only inside it,
  for example in the content of a [`SidebarPanel`](https://react-ui.datocms.com/Layout/SidebarPanel.md) with `flush`.

```css
/* A row of your own in a flush SidebarPanel: its text stays in line with
   the title of the panel */
.MyPluginRow {
  padding: var(--spacing-s) var(--SidebarPanel-inset);
}
```

Read these variables. Do not set them to change the look of a component:
a component can change how it uses its variables. Set a variable only when
the page of a component says so (for example `--chevron-color` on the
[`Chevron`](https://react-ui.datocms.com/Navigation/Chevron.md) page).

## Spacing

Use `--spacing-m` between two parts, `--spacing-s` inside a part. The
negative steps pull an element out into the padding of its parent.

- `--spacing-s`
- `--spacing-m`
- `--spacing-l`
- `--spacing-xl`
- `--spacing-xxl`
- `--spacing-xxxl`
- `--negative-spacing-s`
- `--negative-spacing-m`
- `--negative-spacing-l`
- `--negative-spacing-xl`
- `--negative-spacing-xxl`
- `--negative-spacing-xxxl`

## Typography

The text of the components is `--font-size-m`. `--base-font-family` and
`--monospaced-font-family` hold the fonts of the components: use them instead
of a font name. Use the weight variables instead of a number or of
`bold`: they give the weights that the font of the components draws well.

- `--font-size-xs`
- `--font-size-m`
- `--font-size-l`
- `--font-size-xl`
- `--font-size-xxl`
- `--font-size-xxxl`
- `--monospaced-font-size`: Code is a little smaller than the text around it, because the monospaced font looks larger. For inline code and for code blocks.
- `--font-weight-regular`: The weight of the text.
- `--font-weight-strong`: The weight of titles, labels and words with emphasis.
- `--font-weight-bold`: The name of --font-weight-strong in react-ui 2.x. Use --font-weight-strong.

## Radius

An element that touches the border of its parent takes the radius of the
parent minus the width of the border, for example
`calc(var(--radius-s) - 1px)`.

- `--radius-xs`: Thin marks: drop lines, progress bars.
- `--radius-s`: Controls: inputs, selects, buttons, chips, options, field boxes.
- `--radius-m`: Floating surfaces: menus, popovers, modals.
- `--radius-full`: Pills and circles.

## Controls and rows

The rows follow the rules of "Inset row" on the [`RowList`](https://react-ui.datocms.com/Lists/RowList.md) page.

- `--control-height`: The height of a field of one line (a text input, a select): one line of text, the padding (10px) and the border. A control next to fields (a filter form, a button of size "field") has this height, thus the edges align.
- `--input-padding`: The space between the border of a text input and its text, on all the sides. The addons of an input group and the height of a select use it, thus their text lines up with the text of an input.
- `--row-inset`: The space between the box of a row and the sides of the list, also above the first row
- `--row-gap`: The space between two rows
- `--row-radius`: The radius of the box of a row, on hover and when it is selected

## States and motion

- `--focus-ring`
- `--disabled-opacity`: A disabled button, and every control that acts as a button (an option of a menu, a button of a toolbar, a page of the pagination), keeps the colors of its variant and fades to this opacity. Thus a disabled primary button still reads as the primary action. A disabled field does not fade: its value must stay readable (see the "disabled-field" context of the color tokens).
- `--material-ease`
- `--ease-out`: Use it for elements that come into view.

## Text editors

The content of a text editor (a structured text, a Markdown or an HTML
field, a long text) has its own, more open, spacing. Use these variables in
the editor of a field of your plugin.

- `--editor-content-block-gap`: The content of a text editor: structured text, Markdown, HTML, and the textarea of a text field. The structured text editor makes the rule, and the other editors use the same values.
- `--editor-content-list-item-gap`
- `--editor-content-space`
- `--editor-content-line-height`: More open than the text of the UI: the user reads and writes long paragraphs here
- `--editor-content-min-height`: The minimum height of the content, without the top and bottom spaces: it gives the height of an editor with no content
