## Props

### Link

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `to` | `string` | Yes | | The page of DatoCMS that the link opens: the path with its query, for example "/editor?tab=fields" |
| `exact` | `boolean` | No | `false` | The link is active only on its exact path, not on the pages under it. Use it for the link to the root of a section. |
| `active` | `boolean` | No | | Forces the active state. Use it for a link that is also active on other paths. Without it, the link is active when the path of the page matches `to`. When the host gives no location, only `active` makes a link active. |
| `replace` | `boolean` | No | `false` | The link replaces the current entry of the history, so the Back button of the browser does not come back to the current page |

Also accepts:

- `download`, `hrefLang`, `media`, `ping`, `referrerPolicy`, `target`, `type` (from `AnchorHTMLAttributes`)
- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
