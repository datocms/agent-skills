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
import { Canvas, Button } from 'datocms-react-ui';

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
      <Button onClick={handleOpenModal}>
        Pick theme color
      </Button>
    </Canvas>
  );
}
```

### Rendering the Modal

```tsx
// src/entrypoints/ColorPickerModal.tsx
import type { RenderModalCtx } from 'datocms-plugin-sdk';
import { Canvas, Button, FieldGroup } from 'datocms-react-ui';
import { useState } from 'react';

type Props = {
  ctx: RenderModalCtx;
};

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

export default function ColorPickerModal({ ctx }: Props) {
  const currentColor = ctx.parameters.currentColor as string;
  const [selected, setSelected] = useState(currentColor || COLORS[0]);

  return (
    <Canvas ctx={ctx}>
      <FieldGroup>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Select ${color}`}
              aria-pressed={selected === color}
              onClick={() => setSelected(color)}
              style={{
                width: '100%',
                height: '60px',
                padding: 0,
                appearance: 'none',
                backgroundColor: color,
                borderRadius: '4px',
                cursor: 'pointer',
                border:
                  selected === color
                    ? '3px solid var(--color--selected--border)'
                    : '3px solid transparent',
              }}
            />
          ))}
        </div>
      </FieldGroup>
      <Button
        buttonType="primary"
        fullWidth
        onClick={() => ctx.resolve(selected)}
      >
        Confirm: {selected}
      </Button>
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
  itemFormSidebarPanels(itemType) {
    return [
      { id: 'theme-panel', label: 'Theme Settings', startOpen: true },
    ];
  },
  renderItemFormSidebarPanel(id, ctx) {
    render(<SidebarPanel ctx={ctx} />);
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
import { Canvas, Button, TextField, FieldGroup } from 'datocms-react-ui';
import { useState } from 'react';

type Props = { ctx: RenderModalCtx };

export default function InputModal({ ctx }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();

  const handleSubmit = () => {
    if (!value.trim()) {
      setError('Value is required');
      return;
    }
    ctx.resolve(value.trim());
  };

  return (
    <Canvas ctx={ctx}>
      <FieldGroup>
        <TextField
          id="input"
          name="input"
          label={ctx.parameters.label as string || 'Enter value'}
          value={value}
          onChange={(v) => { setValue(v); setError(undefined); }}
          error={error}
        />
      </FieldGroup>
      <Button buttonType="primary" fullWidth onClick={handleSubmit}>
        Confirm
      </Button>
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

## Key Notes

- Modals can be opened from ANY render context (field extension, sidebar, page, etc.)
- `ctx.resolve(value)` closes the modal and returns the value to `openModal()`
- If the user closes the modal via the X button, `openModal()` resolves with `null`
- Modal IDs don't need a separate declaration hook — just handle them in `renderModal`
- Modals use `SelfResizingPluginFrameCtx` — they auto-resize to fit content
- You can open modals from within other modals (nested modals)
- Parameters passed to `ctx.openModal()` and `ctx.resolve()` **must be JSON-serializable** (no functions, class instances, or circular references)
