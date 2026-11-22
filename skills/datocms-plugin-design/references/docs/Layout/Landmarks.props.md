## Props

### Main

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`

### Nav

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` (variant) | `TextMessage` | No | | The accessible name of the navigation. A page can have more than one navigation, and a screen reader user needs the name to tell them apart. Write the name of the section, for example "Roles". Do not write the word "navigation": the screen reader says the role itself. |
| `ariaLabelledBy` (variant) | `string` | No | | The id of a visible element (a heading) that gives the name |

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`

### Aside

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` | `TextMessage` | Yes | | The accessible name of the complementary content. A page can have more than one, and a screen reader user needs the name to tell them apart. Write what the content is, for example "Additional record information". Do not write the word "complementary": the screen reader says the role itself. |

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`

### Search

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` | `TextMessage` | Yes | | The accessible name of the search. A page can have more than one, and a screen reader user needs the name to tell them apart. Write what the user searches, for example "Roles". Do not write the word "search": the screen reader says the role itself. |

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`

### Heading

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `level` | `HeadingLevel` | Yes | | The level is always explicit. A heading is only inside \<main> or inside a dialog. The title of a page or of a dialog is level 1. A section of it is level 2, and a section of that section is level 3. Do not skip a level. |
| `className` | `string` | No | | Gives the look. The level does not change the look. |
| `id` | `string` | No | | For example, the target of `aria-labelledby` of a dialog |
| `children` | `ReactNode` | Yes | | |

#### Types

`HeadingLevel`

```ts
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
```
