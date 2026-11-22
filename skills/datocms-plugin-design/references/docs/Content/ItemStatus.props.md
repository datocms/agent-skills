## Props

### ItemStatus

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `display` | `'dot' \| 'label'` | No | `"dot"` | |
| `label` | `TextMessage \| Message` | No | `the name of the status: "Published", "Unpublished changes", "Draft" or "New"` | The name of the status, for example "Published". It goes in the tooltip and in `aria-label`, so it is a text.<br>The name of the status, for example "Unpublished changes" |
| `status` | `ItemStatusValue` | Yes | | The status. "updated" is a published record with changes that are not published. "new" has the color of "draft". |

#### Types

`ItemStatusValue` — The publishing status of a record

```ts
export type ItemStatusValue = 'published' | 'updated' | 'draft' | 'new';
```
