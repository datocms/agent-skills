## Props

### InsertGap (add at once)

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `position` | `'before' \| 'after'` | Yes | | Where the gap is, in relation to the item that renders it: `before` is above the item, `after` is below it. |
| `label` | `TextMessage` | Yes | | What a click on the gap does. For example "Add a block". It is the accessible name of the gap and the text of the tooltip of the small button. |
| `onTrigger` | `() => void` | Yes | | Runs on a click on the gap. |

### InsertGap (menu)

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `position` | `'before' \| 'after'` | Yes | | Where the gap is, in relation to the item that renders it: `before` is above the item, `after` is below it. |
| `label` | `TextMessage` | Yes | | What a click on the gap does. For example "Add a block". It is the accessible name of the gap and the text of the tooltip of the small button. |
| `children` | `ReactNode` | Yes | | The options of the menu that a click on the gap opens. |
