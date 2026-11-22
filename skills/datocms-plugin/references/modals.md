# Modals Reference

Custom modals let you display popup dialogs from any plugin context. They are opened programmatically and can return a value to the caller.

## Contents

- Opening a Modal: `ctx.openModal()`
- Render Hook: `renderModal`
- Complete Modal Example
- Modal with Form and Validation
- Built-in Confirm Dialog
- Key Notes

## Opening a Modal: `ctx.openModal()`

Available in any render context (field extension, sidebar panel, page, etc.):

```ts
const result = await ctx.openModal({
  id: 'my-modal',           // Modal ID — passed to renderModal
  title: 'Select an option', // Title bar text (ignored for fullWidth)
  width: 'l',                // 's' | 'm' | 'l' | 'xl' | 'fullWidth' | number
  parameters: { foo: 'bar' }, // Arbitrary data passed to the modal
  closeDisabled: false,      // Whether to hide the close button
  initialHeight: 300,        // Initial iframe height
});

// result is whatever the modal passed to ctx.resolve()
// result is null if the user closed the modal without resolving
```

### Width Options

| Value | Description |
| - | - |
| `'s'` | Small modal |
| `'m'` | Medium modal |
| `'l'` | Large modal |
| `'xl'` | Extra large modal |
| `'fullWidth'` | Full screen (title is ignored) |
| `number` | Custom width in pixels |

## Render Hook: `renderModal`

```ts
renderModal(modalId: string, ctx: RenderModalCtx): void
```

### `RenderModalCtx`

A `SelfResizingPluginFrameCtx` (auto-resizing) with:

**Additional properties:**

```
ctx.modalId     // string — the modal ID
ctx.parameters  // Record<string, unknown> — from openModal()
```

**Additional methods:**

```
ctx.resolve(returnValue)  // Close the modal and return value to openModal()
```

## Complete Modal Example

### Opening the Modal (from a sidebar panel)

```tsx
// src/entrypoints/SidebarPanel.tsx
import type { RenderItemFormSidebarPanelCtx } from 'datocms-plugin-sdk';
import Button from 'datocms-react-ui/Button';
import Canvas from 'datocms-react-ui/Canvas';

type Props = {
  ctx: RenderItemFormSidebarPanelCtx;
};

export default function SidebarPanel({ ctx }: Props) {
  const handleOpenModal = async () => {
    const result = await ctx.openModal({
      id: 'pick-color',
      title: 'Pick a color',
      width: 's',
      parameters: {
        currentColor: ctx.formValues.theme_color as string,
      },
    });

    if (result) {
      await ctx.setFieldValue('theme_color', result);
      ctx.notice(`Color set to ${result}`);
    }
  };

  return (
    <Canvas ctx={ctx}>
      <Button label="Pick theme color" onClick={handleOpenModal} />
    </Canvas>
  );
}
```

### Rendering the Modal

```tsx
// src/entrypoints/ColorPickerModal.tsx
import type { RenderModalCtx } from 'datocms-plugin-sdk';
import Button from 'datocms-react-ui/Button';
import Canvas from 'datocms-react-ui/Canvas';
import Modal from 'datocms-react-ui/Modal';
import RawButton from 'datocms-react-ui/RawButton';
import { useState } from 'react';

type Props = {
  ctx: RenderModalCtx;
};

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

// DatoCMS draws the title and the cross. Content rules: datocms-plugin-design references/surfaces/modal.md
export default function ColorPickerModal({ ctx }: Props) {
  const currentColor = ctx.parameters.currentColor as string;
  const [selected, setSelected] = useState(currentColor || COLORS[0]);

  return (
    <Canvas ctx={ctx}>
      <Modal.Body>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-s)' }}>
          {COLORS.map((color) => (
            // The swatch colors are content, not interface roles
            <RawButton
              key={color}
              ariaLabel={`Select ${color}`}
              radio={{ checked: selected === color }}
              onClick={() => setSelected(color)}
              style={{
                height: 60,
                backgroundColor: color,
                borderRadius: 'var(--radius-s)',
                border:
                  selected === color
                    ? '3px solid var(--color--selected--border)'
                    : '3px solid transparent',
              }}
            />
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button tone="ghost" size="small" label="Cancel" onClick={() => ctx.resolve(null)} />
        <Button tone="primary" size="small" label="Use this color" onClick={() => ctx.resolve(selected)} />
      </Modal.Footer>
    </Canvas>
  );
}
```

### Wiring in connect()

```tsx
// src/main.tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import SidebarPanel from './entrypoints/SidebarPanel';
import ColorPickerModal from './entrypoints/ColorPickerModal';
import 'datocms-react-ui/styles.css';

connect({
  itemFormSidebarPanels() {
    return [
      { id: 'theme-panel', label: 'Theme Settings', startOpen: true },
    ];
  },
  renderItemFormSidebarPanel(id, ctx) {
    switch (id) {
      case 'theme-panel':
        render(<SidebarPanel ctx={ctx} />);
        break;
    }
  },
  renderModal(modalId, ctx) {
    switch (modalId) {
      case 'pick-color':
        render(<ColorPickerModal ctx={ctx} />);
        break;
    }
  },
});
```

## Modal with Form and Validation

```tsx
import type { RenderModalCtx } from 'datocms-plugin-sdk';
import Button from 'datocms-react-ui/Button';
import Canvas from 'datocms-react-ui/Canvas';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import Modal from 'datocms-react-ui/Modal';
import StringInput from 'datocms-react-ui/StringInput';
import { useState } from 'react';

type Props = { ctx: RenderModalCtx };

export default function InputModal({ ctx }: Props) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const handleSubmit = () => {
    if (!value?.trim()) {
      setError('Value is required');
      return;
    }
    ctx.resolve(value.trim());
  };

  return (
    <Canvas ctx={ctx}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <Modal.Body>
          <FieldWrapper label={(ctx.parameters.label as string) || 'Value'} error={error} required>
            <StringInput
              value={value}
              onChange={(v) => {
                setValue(v);
                setError(undefined);
              }}
            />
          </FieldWrapper>
        </Modal.Body>
        <Modal.Footer>
          <Button tone="ghost" size="small" label="Cancel" onClick={() => ctx.resolve(null)} />
          <Button tone="primary" size="small" submit label="Confirm" />
        </Modal.Footer>
      </form>
    </Canvas>
  );
}
```

## Built-in Confirm Dialog

For simple yes/no confirmations, use `ctx.openConfirm()` instead of a custom modal:

```ts
const result = await ctx.openConfirm({
  title: 'Are you sure?',
  content: 'This action cannot be undone.',
  choices: [
    {
      label: 'Delete',
      value: 'delete',
      intent: 'negative',  // 'negative' renders as red/danger, 'positive' renders as primary
    },
  ],
  cancel: {
    label: 'Cancel',
    value: false,
  },
});

if (result === 'delete') {
  // proceed with deletion
}
```

For an action that cannot be undone, add `explicitConfirmation: { label, confirmString }` (the user must type `confirmString` before the choices turn on) and/or `acknowledgement: 'label'` (a switch the user must turn on first). Both are optional and exist in 3.0.0-next (2.6.0-next.0); an older CMS ignores them and shows the plain panel.

## Key Notes

- Modals can be opened from ANY render context (field extension, sidebar, page, etc.)
- `ctx.resolve(value)` closes the modal and returns the value to `openModal()`
- If the user closes the modal via the X button, `openModal()` resolves with `null`
- Modal IDs don't need a separate declaration hook — just handle them in `renderModal`
- Modals use `SelfResizingPluginFrameCtx` — they auto-resize to fit content
- You can open modals from within other modals (nested modals)
- Parameters passed to `ctx.openModal()` and `ctx.resolve()` **must be JSON-serializable** (no functions, class instances, or circular references)
