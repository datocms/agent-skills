## Props

### ListFormPage

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `baseUrl` | `string` | Yes | | The URL of the section. Other URLs (for example the "new" form) always show the children. |
| `state` | `ListOrOverviewState` | Yes | | The state of the section (see getListOrOverviewState) |
| `overview` | `ReactElement` | Yes | | Shows instead of the children when the section is empty: a BlankSlate with titleLevel={1} in a Main |
| `list` | `ReactNode` | No | | The list of the elements: a Pane with a Pane.Header. With a list, the page shows the list and the children in a split. When the section is empty, the list has no use, so the children (for example the "new" form) show alone. |
| `children` | `ReactNode` | Yes | | The open element (a Main with the routes of the forms), or all the content of the section when there is no list |
