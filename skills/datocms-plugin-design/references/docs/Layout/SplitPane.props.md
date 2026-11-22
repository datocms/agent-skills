## Props

### SplitPane

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `mode` | `'overlay' \| 'split'` | No | `"split"` | "split" puts the two panes side by side. "overlay" shows the secondary pane over the page, for example on a small viewport. You compute it, because its own controls use the same breakpoint. |
| `minSize` | `SplitPaneSize` | No | `200` | The smallest width of the secondary pane. |
| `maxSize` | `SplitPaneSize` | No | | The largest width of the secondary pane, for example 360 or "60%". |
| `size` | `SplitPaneSize` | No | `220` | The width of the secondary pane. The user can change it with a drag of the sash. |
| `primaryPane` | `'left' \| 'right'` | Yes | | The pane that takes the free space. The other pane is the secondary pane: it has the width of `size`, the collapse button and the rail. |
| `collapse` | `SplitPaneCollapse` | No | | Lets the secondary pane collapse: the sash gets a button, and the collapsed pane leaves a rail. In `overlay` mode, the pane closes on a click out of it and on Escape. |
| `children` | `[React.ReactNode, React.ReactNode]` | Yes | | Exactly two children: the left pane and the right pane |
| `onDragFinished` | `(newSize: number) => void` | No | | Runs at the end of a drag, with the new width in pixels |

#### Types

`SplitPaneSize` — A width: a number is in pixels, and "N%" is a percentage of the width of the whole split pane.

```ts
export type SplitPaneSize = number | `${number}%`;
```

`SplitPaneCollapse`

```ts
export type SplitPaneCollapse = {
  /** Says if the secondary pane is open. */
  open: boolean;
  /**
   * Runs with the new state: `true` when the pane opens, `false` when it
   * collapses.
   */
  onToggle: (open: boolean) => void;
  /**
   * Hides the rail of the collapsed pane. Use it when you give another
   * control that opens the pane, for example the menu button of the mobile
   * header.
   * @default false
   */
  hideRail?: boolean;
  /**
   * Puts the toggle (the button on the sash or the icon of the rail) in an
   * element of yours, for example a spotlight that explains the toggle to the
   * user.
   */
  wrapToggle?: (toggle: React.ReactElement) => React.ReactNode;
};
```
