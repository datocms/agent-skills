## Props

### ListOrOverview

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `state` | `ListOrOverviewState \| Exclude<ListOrOverviewState, 'empty'>` | Yes | | The state of the section (see getListOrOverviewState) |
| `overview` (variant) | `ReactElement` | No | | All the area of the section when the section is empty: a BlankSlate with titleLevel={1}, a description, the docs and the action that adds the first element. It has no title bar. |
| `children` | `ReactNode` | Yes | | The list and the detail (a split pane), when the section has elements |

#### Types

`ListOrOverviewState` — The state of a section with a list: - "loading": the first load did not end. Zero elements does not mean that the section is empty. - "empty": the section has no elements. - "ready": the section has elements. A filter that keeps no element is also "ready", because the section is not empty.

```ts
export type ListOrOverviewState = 'loading' | 'empty' | 'ready';
```
