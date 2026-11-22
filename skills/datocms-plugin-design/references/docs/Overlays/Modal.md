# Modal

A dialog over the page, for a short task: a form, a question with a field, a
preview. The page behind it stays visible and blocked.

In a plugin, open a dialog with `ctx.openModal` first. DatoCMS draws it over
the whole page, with its title and its cross, and renders the `renderModal`
hook of the plugin inside it. Use `Modal.Body` and `Modal.Footer` for that
content (see "Content of ctx.openModal" below).

A `Modal` draws the dialog in the frame of the plugin, and its backdrop
covers only the frame. Use it only when `ctx.openModal` cannot do the task:

- The dialog shows the live state of the frame: the progress of a task that
  runs in the frame. A dialog of `ctx.openModal` is another frame, and gets
  its parameters only when it opens.
- The action of the dialog must start from a click in the frame: a button
  that opens a sign-in window. The browser blocks a window that opens after
  the answer of `ctx.openModal` or `ctx.openConfirm`.

| Use | For |
| - | - |
| `ctx.openModal` | A dialog over the whole page of DatoCMS: a form, a picker, a preview. |
| `ctx.openConfirm` | A yes or no question before an action that is hard to undo. |
| `Modal` | A short dialog in the frame, for the two cases above, in a box of 600 to 1010 pixels. |
| `FullscreenModal` | A dialog in the frame that needs all the frame: a picker that shows the live data of the frame. |
| A pane or a panel | Details that the user keeps open while they work in the page. |

Do not use a dialog for a long flow with many steps. Use a page, or a
`FullscreenModal`.

```tsx
import Button from 'datocms-react-ui/Button';
import Modal from 'datocms-react-ui/Modal';
import React, { useState } from 'react';

export default function Basic() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button label="Open the dialog" onClick={() => setOpen(true)} />
      {open && (
        <Modal title="Why is the build slow?" onClose={() => setOpen(false)}>
          The first build of a project has no cache. The next builds are faster.
        </Modal>
      )}
    </>
  );
}
```

## Content of ctx.openModal

The content of a `renderModal` hook uses the parts of `Modal` without the
`Modal`: `Modal.Body` for the fields or the text, `Modal.Footer` for the
actions. DatoCMS draws the title and the cross. The footer has no Cancel
button of its own there: give one, first, with `tone="ghost"`, and make it
call `ctx.resolve(null)`. The rules of the footer in "Body and footer"
below apply.

```tsx
import Button from 'datocms-react-ui/Button';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import Modal from 'datocms-react-ui/Modal';
import StringInput from 'datocms-react-ui/StringInput';
import React, { useState } from 'react';

// In a plugin, this is the content of the `renderModal` hook, and the two
// callbacks call `ctx.resolve`.
export default function Content() {
  const [name, setName] = useState<string | null>('');
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(name);
      }}
    >
      <Modal.Body>
        <FieldWrapper label="Name of the filter">
          <StringInput value={name} onChange={setName} />
        </FieldWrapper>
        {saved !== null && <p>{`Saved: ${saved}`}</p>}
      </Modal.Body>
      <Modal.Footer>
        <Button
          tone="ghost"
          size="small"
          label="Cancel"
          onClick={() => setSaved(null)}
        />
        <Button
          tone="primary"
          size="small"
          submit
          label="Save"
          disabled={!name}
        />
      </Modal.Footer>
    </form>
  );
}
```

## Opening and closing

The dialog opens when you render it, and closes when `onClose` removes it.
Escape and the cross call `onClose`. A dialog with `closeButton={false}` has
no cross: Escape and a click outside the panel close it. Use it only for a
dialog whose field keeps the focus and whose rows are the content, like the
command palette. A form keeps the cross or the Cancel button.

The last dialog that opens is on top and gets the keys, even when it is not
inside the other dialogs in the React tree: a dialog that you open from
the root of your plugin shows over the dialog that is open.

## Body and footer

For a form, give `freeContent` and use `Modal.Body` and `Modal.Footer` as
the children. The footer has the Cancel button on the left and the actions
on the right.

- A dialog with a footer has no cross at the top. The Cancel button closes it.
- A dialog with no action (a link to copy, a text) has no footer. The cross
  closes it.

The submit button of a form is a [`Button`](https://react-ui.datocms.com/Actions/Button.md) with `tone="primary"` and `submit`,
in the `Modal.Footer`. Do not give it `size` or `expand`. The default look is
the look of the dialog buttons: small and with the width of the text.

A form that deletes something that the user cannot undo (a project, an
organization, the account) gives `tone="alert"` to its submit button. This is
the red button of the destructive choices of `ctx.openConfirm`.

Content with `freeContent` that is not in a `Modal.Body` (a list from edge
to edge, a picker) draws its own padding. Give it `--Modal-inset` (see "CSS
variables" below): its text then lines up with the title and the footer.

```tsx
import Button from 'datocms-react-ui/Button';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import Modal from 'datocms-react-ui/Modal';
import StringInput from 'datocms-react-ui/StringInput';
import React, { useState } from 'react';

export default function Form() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string | null>('');

  return (
    <>
      <Button label="Save the filter" onClick={() => setOpen(true)} />
      {open && (
        <Modal
          title="Save the filter"
          freeContent
          onClose={() => setOpen(false)}
        >
          <Modal.Body>
            <FieldWrapper label="Name">
              <StringInput value={name} onChange={setName} />
            </FieldWrapper>
          </Modal.Body>
          <Modal.Footer>
            <Button
              tone="primary"
              size="small"
              label="Save"
              disabled={name === ''}
              onClick={() => setOpen(false)}
            />
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}
```

**Do:** Put the main action on the right of the footer, with the Cancel button on the left.

```tsx
<div className="Modal__footer" style={{ border: '1px solid var(--color--border)' }}>
  <span>Cancel</span>
  <div className="Modal__footer__actions"><strong>Save</strong></div>
</div>
```

**Don’t:** Do not put the main action on the left, or the Cancel button next to it.

```tsx
<div className="Modal__footer" style={{ border: '1px solid var(--color--border)' }}>
  <strong>Save</strong>
  <div className="Modal__footer__actions"><span>Cancel</span></div>
</div>
```

## Width

The width is 600 pixels by default. Give `width` "m", "l" or "xl" for a
dialog that has wide content. On a small screen, the dialog fills the
screen. Give a number of pixels when no name fits.

```tsx
import Button from 'datocms-react-ui/Button';
import Modal, { type ModalWidth } from 'datocms-react-ui/Modal';
import React, { useState } from 'react';

const widths: ModalWidth[] = ['s', 'm', 'l', 'xl'];

export default function Widths() {
  const [width, setWidth] = useState<ModalWidth | null>(null);

  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--spacing-s)' }}>
        {widths.map((w) => (
          <Button key={w} label={`Width ${w}`} onClick={() => setWidth(w)} />
        ))}
      </div>
      {width && (
        <Modal
          title={`Width ${width}`}
          width={width}
          onClose={() => setWidth(null)}
        >
          The dialog has the maximum width "{width}". On a small screen, it
          fills the width of the screen.
        </Modal>
      )}
    </>
  );
}
```

## FullscreenModal

A `FullscreenModal` covers almost all the screen. It has no header: the
content brings its own toolbar, and the content scrolls by itself. The
cross is on the backdrop, outside the panel, because the toolbar of the
content has its own buttons on the right. Alone on the backdrop, the cross is
large, so it is easy to see. The cross of a `Modal` is small, in its header,
like the other buttons of a toolbar. On a narrow screen, the cross is above the
panel, on the right.

The content of a `FullscreenModal` is often also a page: a record form, a
list of records or assets. Inside the dialog, its toolbar shows the title of
the dialog ("Edit Article", "Choose from the gallery") instead of the title
of the page. `useFullscreenModalTitle()` gives the rendered title, or null
outside a `FullscreenModal`.

```tsx
import Button from 'datocms-react-ui/Button';
import FullscreenModal from 'datocms-react-ui/FullscreenModal';
import Toolbar from 'datocms-react-ui/Toolbar';
import React, { useState } from 'react';

export default function Fullscreen() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button label="Choose from the gallery" onClick={() => setOpen(true)} />
      {open && (
        <FullscreenModal
          title="Choose from the gallery"
          onClose={() => setOpen(false)}
        >
          <Toolbar>
            <Toolbar.Title level={1}>Choose from the gallery</Toolbar.Title>
          </Toolbar>
          <div style={{ padding: 'var(--spacing-l)' }}>
            The content brings its own toolbar and its own scroll.
          </div>
        </FullscreenModal>
      )}
    </>
  );
}
```

## Accessibility

Each dialog has a name for a screen reader: give `title` (the header of a
`Modal`; for a `FullscreenModal`, the title that its toolbars show), or
`ariaLabel` when the dialog has no title of its own.

The focus goes to the title, and goes back to the button that opened the
dialog. When that button left the page (the dialog filled an empty field), it
goes to the nearest element around the button that is still there. A field
with `autoFocus` gets the focus instead of the title, because the content
renders after the dialog is in the page.

## CSS variables

The variable is on the panel of the dialog: read it in the content.

## CSS variables

- `--Modal-inset`: The space between the edges of the panel and its content. The title of the header, the body and the footer line up on it. Content with "freeContent" and no Modal.Body uses it to stay in line with them.

