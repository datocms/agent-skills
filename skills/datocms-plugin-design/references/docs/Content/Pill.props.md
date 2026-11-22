## Props

### Pill

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `tone` | `PillTone` | No | `'neutral'` | The color of the pill. "neutral" is grey, for a fact about the item. "accent" is the primary color, for a fact that must get attention. "soft" is the light primary color, for a tag or for a reference to another item in a text. "danger" and "warning" are the soft red and amber, for the status of a problem (for example the status of a Page.Group with a tone). "success" is the soft green, for a status that is good (for example "Paid", "Active"). |
| `icon` | `React.ReactNode` | No | | An icon before the text, for example a model icon |
| `tooltip` | `Message` | No | | A hint in a tooltip, on hover and on keyboard focus. A static pill with a tooltip takes the focus, so the keyboard can reach the hint. |
| `children` | `React.ReactNode` | Yes | | The text of the pill. Keep it short: a long text gets an ellipsis. |
| `to` (variant) | `string` | No | | The URL or the path that the pill opens, for example "/schema" |
| `onClick` (variant) | `(event: React.MouseEvent<HTMLButtonElement>) => void` | No | | Runs when the user clicks the pill, for example to filter a list |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

`PillAction`

| Variant | Props | Description |
| - | - | - |
| `LinkPill` | `to` | A pill that opens a page. It is a link. |
| `ButtonPill` | `onClick` | A pill that runs an action. It is a button. |
| `StaticPill` | | A pill that only shows a fact. The user cannot click it. |

#### Types

`PillTone` — The color of a pill

```ts
export type PillTone =
  | 'neutral'
  | 'accent'
  | 'soft'
  | 'danger'
  | 'warning'
  | 'success';
```
