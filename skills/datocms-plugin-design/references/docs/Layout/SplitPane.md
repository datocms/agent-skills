# SplitPane

Two panes side by side. The primary pane takes the free space. The secondary
pane has a width that the user can change by dragging the border (the sash),
and it can collapse. DatoCMS uses it for the menu of a section, the sidebar of
a record, and the list and the detail of [`ListDetail.Split`](https://react-ui.datocms.com/Patterns/ListAndDetail.md).

Other components for other cases:

- A list and the detail of its open row is [`ListDetail`](https://react-ui.datocms.com/Patterns/ListAndDetail.md). It uses `SplitPane` for you.
- Content that opens over the page for a short time is a [`Modal`](https://react-ui.datocms.com/Overlays/Modal.md).

## Setup

Put a [`Pane`](https://react-ui.datocms.com/Layout/Pane.md) on each side, with an `ariaLabel`: the pane gives the title bar
and the scroll. The parent needs a height and `position: relative`.

## Resizable pane

The secondary pane is the pane that is not the `primaryPane`. Give its width
as `size`, and its limits as `minSize` and `maxSize`. A number is in pixels,
and `"N%"` is a percentage of the width of the whole split pane (the type
`SplitPaneSize`). Use a percentage for a limit that grows with the
page (`maxSize="60%"`). `onDragFinished` always gives the new width in pixels
at the end of a drag. You can keep it and give it back as `size`.

```tsx
import Pane from 'datocms-react-ui/Pane';
import SplitPane from 'datocms-react-ui/SplitPane';
import React, { useState } from 'react';

export default function Resizable() {
  const [width, setWidth] = useState(240);

  return (
    <div style={{ position: 'relative', height: 320 }}>
      <SplitPane
        primaryPane="right"
        size={width}
        minSize={200}
        maxSize={360}
        onDragFinished={setWidth}
      >
        <Pane
          ariaLabel="Content"
          header={
            <Pane.Header>
              <Pane.Header.Title>Content</Pane.Header.Title>
            </Pane.Header>
          }
        >
          <p style={{ padding: 'var(--spacing-l)', margin: 0 }}>
            Drag the border to change the width of the pane at the right.
          </p>
        </Pane>
        <Pane
          ariaLabel="Menu"
          header={
            <Pane.Header>
              <Pane.Header.Title>Menu</Pane.Header.Title>
            </Pane.Header>
          }
        >
          <p style={{ padding: 'var(--spacing-l)', margin: 0 }}>
            Width: {width}px
          </p>
        </Pane>
      </SplitPane>
    </div>
  );
}
```

## Collapsible pane

With `collapse={{ open, onToggle }}`, the border has a button that collapses
the pane. The collapsed pane leaves a rail. A click on the rail opens the pane
again, and the pointer on the rail shows the pane over the page for a moment.
You keep the state in `open`, and `onToggle` gets the new state.
`collapse.wrapToggle` puts the toggle in an element of your own, for example a
spotlight that explains it to the user. Without `collapse`, the pane cannot
collapse: no rail, no collapse button, no collapse by drag.

```tsx
import Pane from 'datocms-react-ui/Pane';
import SplitPane from 'datocms-react-ui/SplitPane';
import React, { useState } from 'react';

export default function Collapsible() {
  const [isOpen, setOpen] = useState(true);

  return (
    <div style={{ position: 'relative', height: 320 }}>
      <SplitPane
        primaryPane="left"
        size={260}
        minSize={200}
        collapse={{ open: isOpen, onToggle: setOpen }}
      >
        <Pane
          ariaLabel="Record"
          header={
            <Pane.Header>
              <Pane.Header.Title>Record</Pane.Header.Title>
            </Pane.Header>
          }
        >
          <p style={{ padding: 'var(--spacing-l)', margin: 0 }}>
            Use the button on the border to collapse the sidebar. Put the
            pointer on the rail to see it again.
          </p>
        </Pane>
        <Pane
          ariaLabel="Additional record information"
          header={
            <Pane.Header>
              <Pane.Header.Title level={2}>Information</Pane.Header.Title>
            </Pane.Header>
          }
        >
          <p style={{ padding: 'var(--spacing-l)', margin: 0 }}>
            Created on 14 October 2026.
          </p>
        </Pane>
      </SplitPane>
    </div>
  );
}
```

## Overlay mode

In `mode="overlay"`, the secondary pane shows over the page, and a click outside
it (or the Escape key) closes it. Use it on a small viewport. When your plugin
has its own button that opens the pane (the menu button of the mobile
bar), give `collapse.hideRail`. The overlay needs `collapse`: without it,
the pane cannot close.

You give `mode`, because the pane does not measure the page. You usually
need the same breakpoint for your own controls (the rail, a menu button, the
first open state), so compute the value once and give it to all of
them. Use `useIsSmallViewport()` (`datocms-react-ui/hooks/useMediaQuery`) for a page, or the
width of the container when the pane can be in a modal.

```tsx
const isSmallViewport = useIsSmallViewport();

<SplitPane
  primaryPane="right"
  mode={isSmallViewport ? 'overlay' : 'split'}
  collapse={{ open, onToggle, hideRail: isSmallViewport }}
>
```

```tsx
import Button from 'datocms-react-ui/Button';
import Pane from 'datocms-react-ui/Pane';
import SplitPane from 'datocms-react-ui/SplitPane';
import React, { useState } from 'react';

export default function OverlayMode() {
  const [isOpen, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', height: 320 }}>
      <SplitPane
        mode="overlay"
        primaryPane="right"
        size={240}
        collapse={{ open: isOpen, onToggle: setOpen, hideRail: true }}
      >
        <Pane
          ariaLabel="Menu"
          header={
            <Pane.Header>
              <Pane.Header.Title level={2}>Menu</Pane.Header.Title>
            </Pane.Header>
          }
        >
          <p style={{ padding: 'var(--spacing-l)', margin: 0 }}>
            A click out of the menu closes it.
          </p>
        </Pane>
        <Pane
          ariaLabel="Page"
          header={
            <Pane.Header>
              <Pane.Header.Title>Page</Pane.Header.Title>
            </Pane.Header>
          }
        >
          <div style={{ padding: 'var(--spacing-l)' }}>
            <Button label="Open the menu" onClick={() => setOpen(true)} />
          </div>
        </Pane>
      </SplitPane>
    </div>
  );
}
```

**Do:** Use ListDetail.Page or ListDetail.Split for a list and its detail.

`<ListDetail.Split detail={{ panel, onClose, placement }}><MyList /></ListDetail.Split>`

**Don’t:** Do not build a list and its detail with a SplitPane.

`<SplitPane><MyList /><MyDetail /></SplitPane>`

## Hooks and constants

The content of the secondary pane can read the pane:

- `useIsInSecondaryPane()` says that the content is in a secondary pane. The pane is narrow, so use buttons with only an icon.
- `useSecondaryPaneMinSize(minSize)` asks for a larger pane while the content needs it, for example a sidebar in edit mode. When the request stops, the pane keeps its larger width until `size` changes: nothing moves under the pointer. The width that the user keeps does not change. It works only when `size` and `minSize` are in pixels.
- `DEFAULT_SECONDARY_SIZE` is the width (220) of the secondary pane when you give no `size`.

## Accessibility

With `collapse`, the key `[` collapses and opens a secondary pane on the
left, and `]` a secondary pane on the right. The tooltips of the rail and of
the collapse button show the key. When the pane that collapses has the
focus, the rail gets it, so the focus stays on the page.

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
