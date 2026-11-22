## Props

### Tabs

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `urlParam` (variant) | `string` | No | `"tab"` | The key of the query that keeps the active tab. Give a different key to a second Tabs on the same page. |
| `activeTabId` (variant) | `string` | No | | The `id` of the tab that shows |
| `onChange` (variant) | `(tabId: string) => void` | No | | Runs when the user picks a tab |
| `tabs` | `(TabsItem \| false \| null \| undefined)[]` | Yes | | The tabs, in their order. A value that is `false`, `null` or `undefined` shows no tab: use `condition && { … }`. |
| `ariaLabel` | `TextMessage` | Yes | | The accessible name of the tabs (the "aria-label" of the nav or of the tablist), for example "Edit field" |
| `extraInfo` | `React.ReactNode` | No | | Shows at the end of the row of tabs, for example the ID of the record |
| `beforeContent` | `React.ReactNode` | No | | Shows at the top of the content of each tab, for example the error of the form (FormGlobalError) |

#### Types

`TabsItem` — One tab of Tabs: its handle in the row and its content

```ts
export type TabsItem = {
  /** The key of the tab. It is the value of "?tab=" in the URL mode. */
  id: string;
  /** The text of the tab, for example `{ id: 'fieldForm.tabs.validations' }` */
  label: Message;
  /** The tab has fields with errors. It shows an error mark. */
  invalid?: boolean;
  /** The content of the tab. It renders only when the tab is active. */
  content: React.ReactNode;
};
```

### An item of tabs

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `id` | `string` | Yes | | The key of the tab. It is the value of "?tab=" in the URL mode. |
| `label` | `Message` | Yes | | The text of the tab, for example `{ id: 'fieldForm.tabs.validations' }` |
| `invalid` | `boolean` | No | | The tab has fields with errors. It shows an error mark. |
| `content` | `React.ReactNode` | Yes | | The content of the tab. It renders only when the tab is active. |
