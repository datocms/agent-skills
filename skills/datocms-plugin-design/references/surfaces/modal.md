# Modal

Skeleton assumes `datocms-react-ui/styles.css` imported in the entry and the template's `render` helper (`src/utils/render.tsx`); icons from the plugin's own set. Frame sizing and padding: `../surfaces.md`.

Open with `ctx.openModal({ id, title, width })` from any surface; the host draws the dialog, the `title` and the cross over the whole page, and `renderModal` fills it. Content = `Modal.Body` + `Modal.Footer` without `Modal`. The footer has no Cancel of its own: give one first, `tone="ghost"`, calling `ctx.resolve(null)`; the primary action resolves with the result. `width: 'fullWidth'` gives a Fixed frame with no title: then draw your own header (`Pane` + `Pane.Header`). In-frame `Modal`/`FullscreenModal` only for the two cases of `Overlays/Modal` (live frame state; a click must open a window).

```tsx
import type { RenderModalCtx } from 'datocms-plugin-sdk';
import Button from 'datocms-react-ui/Button';
import Canvas from 'datocms-react-ui/Canvas';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import Modal from 'datocms-react-ui/Modal';
import StringInput from 'datocms-react-ui/StringInput';
import { useState } from 'react';

function RenameModal({ ctx }: { ctx: RenderModalCtx }) {
  const [name, setName] = useState<string | null>((ctx.parameters.name as string) ?? '');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        ctx.resolve({ name });
      }}
    >
      <Modal.Body>
        <FieldWrapper label="Name">
          <StringInput value={name} onChange={setName} />
        </FieldWrapper>
      </Modal.Body>
      <Modal.Footer>
        <Button tone="ghost" size="small" label="Cancel" onClick={() => ctx.resolve(null)} />
        <Button tone="primary" size="small" submit label="Rename" disabled={!name} />
      </Modal.Footer>
    </form>
  );
}

export function renderModal(_modalId: string, ctx: RenderModalCtx) {
  render(
    <Canvas ctx={ctx}>
      <RenameModal ctx={ctx} />
    </Canvas>,
  );
}
```

Mistakes: a title or close button inside the content (the host draws them); a `Modal` inside `renderModal` (a dialog in a dialog); a modal for a yes/no question (`ctx.openConfirm`).
