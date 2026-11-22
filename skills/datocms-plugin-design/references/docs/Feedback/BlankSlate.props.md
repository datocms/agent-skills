## Props

### BlankSlate

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `titleLevel` | `HeadingLevel` | No | | The level of the title as a heading. Give it when the blank slate is the content of a page, alone in \<main>: its title is then the title of the page, level 1. Without it, the title is not a heading (for example the message of an empty list in a page that has a title). |
| `code` | `Message` | No | | A quiet monospace box under the title, for example the raw message of an error. It shows as text, not as HTML. |
| `description` | `Message` | No | | What shows in this area, and how it gets there |
| `caption` | `Message` | No | | A small line under the description, for example a counter |
| `docs` | `BlankSlateDocsLink[]` | No | | Links to the documentation. They show as a button after the text: a menu when there is more than one link. |
| `actions` | `ReactNode` | No | | The buttons that show before the documentation button, for example the button that creates the first item |
| `placement` | `'area' \| 'inline' \| 'section'` | Yes | | Where the blank slate is. `area`: it fills its positioned parent, which has a height of its own (the content of a Pane, a SplitViewPane, an overview), and stays in its center. `inline`: it is a block in the flow and the only content of its box (a dialog body, a card, a frame). `section`: it is a block in the flow with content above or below it (the title of a section of a page or of a panel, a label of a form); a frame like the one of an empty slot separates it from that content. |
| `small` | `boolean` | No | | Use the small size in narrow areas (a sidebar) and in a section of a page |
| `className` | `string` | No | | A class for the outer element of the blank slate |
| `children` | `ReactNode` | No | | Content under the description that is not text, for example a short form |
| `loading` | `boolean` | No | | Shows a spinner instead of the icon |
| `title` | `Message` | No | | Loading: What loads, for example "Loading the invoices"<br>Loaded: The name of the section in an overview, else what is missing, for example "No members yet" |
| `icon` (variant) | `ReactNode` | No | | The icon of the entity: the icon of the menu item of the section that lists it. A search with no results uses the search icon, and an error uses a status icon. |
| `error` (variant) | `boolean` | No | | Shows the color of an error on the icon |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

`BlankSlateState`

| Variant | Props | Description |
| - | - | - |
| `Loading` | `loading`, `title` | While the content loads, a spinner shows instead of the icon. The title then says what loads. Without a title, the spinner says that the content loads. |
| `Loaded` | `title`, `icon`, `error` | The content is ready: the blank slate says why there is nothing to show |

#### Types

`BlankSlateDocsLink`

```ts
export type BlankSlateDocsLink = {
  /**
   * The label shows only when there are more links: in the menu of the
   * "Documentation" button. Without it, the menu shows the URL.
   */
  label?: Message;
  href: string;
};
```
