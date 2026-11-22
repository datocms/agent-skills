## Props

### Canvas

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ctx` | `BaseCtx` | Yes | | The `ctx` that the hook of the SDK gives to the plugin |
| `noAutoResizer` | `boolean` | No | `false` | Does not start the auto-resizer of the frame. Use it when the plugin sets the height of the frame itself. |
| `texts` | `BundledTextsProps['texts']` | No | | More texts, by key, in the ICU syntax: a key of ui-public or of react-ui gets a new text (also an aria text), and a key of the plugin gets its text for `{ id }` messages. Give a constant: a new object renders the plugin again. |
| `navigation` | `NavigationAdapter` | No | | The router of the plugin, for a plugin with a router of its own. By default a `to` is a path of the cms: a click goes through `ctx.navigateTo`. Give a stable object (`useMemo`). |
| `children` | `ReactNode` | Yes | | The plugin |

### NavigationAdapter

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `location` | `NavigationLocation` | No | | The location of the host, when the host has one. The components find the active link and the open row from it. Without it, nothing is active unless the caller gives `active`, and the open row of a `ListDetail.Page` is not in the URL. |
| `navigate` | `(to: string, options?: NavigateOptions) => void` | Yes | | Opens a page of the host |
| `href` | `(to: string) => string` | No | | Gives the `href` attribute of a link to `to`. Without it, the `href` is `to`. A host that is not on the origin of the page (a plugin in a frame) gives the absolute URL, so a new tab opens the correct page. |

#### Types

`NavigationLocation` — The current URL of the host, without the hash

```ts
export type NavigationLocation = {
  /** The path of the URL, for example "/editor/items" */
  pathname: string;
  /** The query of the URL with its "?", or an empty string */
  search: string;
};
```

`NavigateOptions` — The options of a navigation

```ts
export type NavigateOptions = {
  /**
   * The new URL replaces the current entry of the history
   * @default false
   */
  replace?: boolean;
};
```
