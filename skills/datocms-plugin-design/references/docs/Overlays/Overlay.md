# Overlay

Three small parts for the layers over the page: a menu, a tooltip, a dialog.
Most screens never use them: [`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md), [`Tooltip`](https://react-ui.datocms.com/Overlays/Tooltip.md), [`HoverCard`](https://react-ui.datocms.com/Overlays/Tooltip.md) and [`Modal`](https://react-ui.datocms.com/Overlays/Modal.md) use
them already.

| Part | What it does |
| - | - |
| `Popover` | Puts content near an element, over the page. It flips and shifts to stay in the window, and closes with Escape and a click outside. |
| `Portal` | Renders its children at the end of the body, outside the `overflow` and the stacking context of the parents. |
| `NewZIndex` | Gives its content a z-index 10 higher than its parent layer. |

## Popover

`Popover` follows the `anchorElement`. It has no box: the content draws its
border, its surface and its shadow. For a tall content, use the CSS variable
`--Popover-available-height` as its maximum height.

With `onClose`, Escape and a click outside close it. A click on the anchor
does not run `onClose`, because the anchor opens and closes the popover. The
popover is a layer of keys: Escape closes it, and a modal under it stays
open. Without `onClose`, the popover stays until you remove it (a
tip with its own button).

When the popover has controls (a picker, a list of links), give it
`ariaLabel`: it then has `role="dialog"` and a name for a screen reader.

With `autoFocus`, the focus goes into the popover when it opens, and comes
back to where it was when the popover closes. Give it to a popover that the
user opens with a button. Do not give `true` to a popover that opens from a
field where the user types. Give a selector instead, to put the focus
on a field inside, for example the search field of a picker.

[`Tooltip`](https://react-ui.datocms.com/Overlays/Tooltip.md), [`HoverCard`](https://react-ui.datocms.com/Overlays/Tooltip.md) and the menus of [`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md) do not use `Popover`: they
have their own interactions (the delay of a hover, the arrow keys). They use
its positioning (`floatingMiddleware`), so all the layers flip and shift in
the same way.

A picker of a form (a color, a date, an emoji) is a `Popover` with
`onClose` and `ariaLabel`. A panel that follows the caret of a text editor
is not a `Popover`: it has no element to follow.

```tsx
import Button from 'datocms-react-ui/Button';
import Popover from 'datocms-react-ui/Popover';
import React, { useState } from 'react';

export default function Anchored() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div style={{ padding: 'var(--spacing-xl)' }}>
      <span ref={setAnchor} style={{ display: 'inline-block' }}>
        <Button label="Details" onClick={() => setOpen((value) => !value)} />
      </span>
      {open && anchor && (
        <Popover
          anchorElement={anchor}
          placement="bottom-start"
          offset={8}
          onClose={() => setOpen(false)}
          ariaLabel="Details"
        >
          <div
            style={{
              padding: 'var(--spacing-m)',
              background: 'var(--color--surface-raised)',
              border: '1px solid var(--color--border)',
              borderRadius: 'var(--radius-m)',
              boxShadow: 'var(--shadow--floating)',
            }}
          >
            The content draws its own box. Press Escape or click outside to
            close it.
          </div>
        </Popover>
      )}
    </div>
  );
}
```

## Portal and NewZIndex

Use them together for a layer that has its own place (a panel, a picker). A
layer in another layer (a menu in a dialog) then always shows over its
parent, with no fixed z-index. The content of a portal gets page-size
buttons, not toolbar-size buttons.

The content of a portal is outside the element of [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md), so [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md)
puts the color tokens of the host around it again, even around a `Portal` of
your plugin. The layer keeps the colors of the host.

```tsx
import Button from 'datocms-react-ui/Button';
import NewZIndex from 'datocms-react-ui/NewZIndex';
import Portal from 'datocms-react-ui/Portal';
import React, { useState } from 'react';

export default function Layers() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button label="Show a panel" onClick={() => setOpen(!open)} />
      {open && (
        <Portal>
          <NewZIndex>
            {(zIndex) => (
              <div
                style={{
                  position: 'fixed',
                  right: 'var(--spacing-l)',
                  bottom: 'var(--spacing-l)',
                  zIndex,
                  padding: 'var(--spacing-m)',
                  background: 'var(--color--surface-raised)',
                  border: '1px solid var(--color--border)',
                  borderRadius: 'var(--radius-m)',
                  boxShadow: 'var(--shadow--floating)',
                }}
              >
                This panel is in the body, over the page (z-index {zIndex}).
              </div>
            )}
          </NewZIndex>
        </Portal>
      )}
    </>
  );
}
```

## Props

### Popover

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | No | | The content that floats near the anchor. |
| `anchorElement` | `Element` | Yes | | The element that the content follows. |
| `placement` | `Placement` | No | `"top"` | The side of the anchor where the content shows. It moves to the other side when there is no space. |
| `offset` | `OffsetOptions` | No | `{ mainAxis: 16 }` | The distance to the anchor, in pixels or as a Floating UI offset object. |
| `onClose` | `() => void` | No | | Runs when the user presses Escape or clicks out of the popover. A click on the anchor does not run it, because the anchor opens and closes the popover. Without it, the popover stays open until you remove it. |
| `ariaLabel` | `TextMessage` | No | | The name of the popover for a screen reader. With it, the popover has `role="dialog"`. Give it when the popover has controls, for example a picker. |
| `autoFocus` | `boolean \| string` | No | | The focus goes into the popover when it opens, and comes back to where it was when the popover closes. Give it when the user opens the popover with a button or a key. Do not give `true` when the popover opens from a field where the user types: give a selector, and the focus goes to the first element of the popover that matches it, for example `"input"`. The user goes on typing there. When no element matches, the focus stays where it is. |

### Portal

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `React.ReactNode` | No | | The content to render at the end of the body. |

### NewZIndex

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `(zIndex: number) => React.ReactNode` | Yes | | A function that gets the new z-index and returns the content. |
| `forcedValue` | `number` | No | | Use this z-index, not the one of the parent plus 10. |
