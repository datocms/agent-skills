# Field Extensions Reference

Field extensions replace or augment the default field editor. Two types exist: **editors** replace the default editor, and **addons** appear below it.

## Contents

- Choosing Between Manual and Override
- Declaration: `manualFieldExtensions`
- Override: `overrideFieldExtensions`
- `asSidebarPanel` — Editor in Sidebar
- Render: `renderFieldExtension`
- Localized Fields
- Gotchas
- Configurable Field Extensions

## Choosing Between Manual and Override

- **`manualFieldExtensions`** — Extension appears in field settings for users to install per-field. Use when: opt-in, applies to specific fields chosen by user, or needs per-field config (`configurable: true`).
- **`overrideFieldExtensions`** — Plugin programmatically applies extension based on conditions (field type, model, validators, etc.). Use when: should auto-apply to all matching fields, user shouldn't configure each field individually, or need conditional logic (e.g., "add character counter to all string fields with length validator").

Both can coexist.

## Declaration: `manualFieldExtensions`

Declares field extensions users can manually install on fields via DatoCMS UI.

```ts
manualFieldExtensions(ctx: ManualFieldExtensionsCtx): ManualFieldExtension[]
```

### `ManualFieldExtension` shape

```ts
{
  id: string;              // Unique ID — passed to renderFieldExtension
  name: string;            // Display name in field settings
  type: 'editor' | 'addon'; // Editor replaces default, addon is below it
  fieldTypes: 'all' | FieldType[]; // Compatible field types
  asSidebarPanel?: boolean | { startOpen: boolean }; // Move editor to sidebar
  configurable?: boolean | { initialHeight: number }; // Enable per-field config
  initialHeight?: number;  // Initial iframe height in pixels
}
```

### Example

```ts
connect({
  manualFieldExtensions() {
    return [
      {
        id: 'color-picker',
        name: 'Custom Color Picker',
        type: 'editor',
        fieldTypes: ['string'],
        configurable: true,
      },
      {
        id: 'word-count',
        name: 'Word Counter',
        type: 'addon',
        fieldTypes: ['string', 'text', 'structured_text'],
        initialHeight: 0,
      },
    ];
  },
});
```

## Override: `overrideFieldExtensions`

Programmatically forces field extensions onto fields based on conditions — no manual installation. Called once per field.

```ts
overrideFieldExtensions(
  field: Field,
  ctx: OverrideFieldExtensionsCtx  // has additional ctx.itemType
): FieldExtensionOverride | undefined
```

### `FieldExtensionOverride` shape

```ts
{
  editor?: {
    id: string;               // Field extension ID
    parameters?: Record<string, unknown>;
    asSidebarPanel?: boolean | { startOpen?: boolean; placement?: ItemFormSidebarPanelPlacement };
    initialHeight?: number;
    rank?: number;
  };
  addons?: Array<{
    id: string;
    parameters?: Record<string, unknown>;
    initialHeight?: number;
    rank?: number;
  }>;
}
```

### Example: Override based on field type and validators

```ts
connect({
  overrideFieldExtensions(field) {
    if (
      field.attributes.field_type === 'string' &&
      'length' in field.attributes.validators
    ) {
      return {
        addons: [{ id: 'character-count', initialHeight: 0 }],
      };
    }
  },
});
```

### Example: Override based on model

```ts
connect({
  overrideFieldExtensions(field, ctx) {
    if (
      ctx.itemType.attributes.api_key === 'blog_post' &&
      field.attributes.api_key === 'title'
    ) {
      return {
        editor: { id: 'title-editor' },
      };
    }
  },
});
```

## `asSidebarPanel` — Editor in Sidebar

The `asSidebarPanel` option moves an editor field extension from main form into collapsible sidebar panel. Field's value is still stored in original field, but UI renders in sidebar. Useful for complex editors (notes, metadata, JSON) that benefit from more space or secondary position.

### Manual declaration

```ts
manualFieldExtensions() {
  return [
    {
      id: 'notes-editor',
      name: 'Notes Editor',
      type: 'editor',
      fieldTypes: ['json'],
      asSidebarPanel: { startOpen: true },  // `true` also enables the sidebar panel with default collapsed state
    },
  ];
},
```

### Override declaration

```ts
overrideFieldExtensions(field, ctx) {
  if (field.attributes.field_type === 'json' && field.attributes.api_key === 'notes') {
    return {
      editor: {
        id: 'notes-editor',
        asSidebarPanel: { startOpen: true },
      },
    };
  }
},
```

Component rendered by `renderFieldExtension` is identical — still receives `RenderFieldExtensionCtx` with `ctx.fieldPath`, `ctx.formValues`, `ctx.setFieldValue`. Only difference is where iframe appears.

## Render: `renderFieldExtension`

Called when field extension needs rendering. The `fieldExtensionId` matches the `id` from declaration/override.

```ts
renderFieldExtension(fieldExtensionId: string, ctx: RenderFieldExtensionCtx): void
```

### `RenderFieldExtensionCtx` — Full Context

This is a `SelfResizingPluginFrameCtx` (auto-resizing iframe) with these additional properties and methods:

**Field-specific properties:**

```
ctx.fieldExtensionId    // string — the extension ID being rendered
ctx.parameters          // Record<string, unknown> — extension parameters
ctx.field               // Field — the field entity
ctx.fieldPath           // string — path in formValues for current value
ctx.parentField         // Field | undefined — parent field if inside a block
ctx.block               // { id: string | undefined; blockModel: ItemType } | undefined
ctx.disabled            // boolean — whether the field is disabled
```

**Item form properties:**

```
ctx.locale              // string — currently active locale
ctx.item                // Item | null — the record (null for new records)
ctx.itemType            // ItemType — the model
ctx.formValues          // Record<string, unknown> — all form values
ctx.itemStatus          // 'new' | 'draft' | 'updated' | 'published'
ctx.isSubmitting        // boolean
ctx.isFormDirty         // boolean
ctx.blocksAnalysis      // { usage: { total, nonLocalized, perLocale }, maximumPerItem }
```

**Item form methods:**

```
ctx.setFieldValue(path, value)     // Set a field value
ctx.toggleField(path, show)        // Show/hide a field
ctx.disableField(path, disable)    // Enable/disable a field
ctx.scrollToField(path, locale?)   // Scroll to a field
ctx.saveCurrentItem(showToast?)    // Trigger form save
ctx.formValuesToItem(formValues, skipUnchanged?) // Convert form state to API Item
ctx.itemToFormValues(item)         // Convert API Item to form state
```

**Sizing utilities (SelfResizing):**

```
ctx.startAutoResizer()   // Auto-resize on DOM changes (Canvas does this)
ctx.stopAutoResizer()
ctx.updateHeight(h?)     // Manually set iframe height
ctx.setHeight(h)         // Set exact height
```

### Getting the Current Field Value

```ts
import { get } from 'lodash-es';

const currentValue = get(ctx.formValues, ctx.fieldPath);
```

### Setting the Field Value

```ts
await ctx.setFieldValue(ctx.fieldPath, 'new value');
```

### Complete Editor Extension Example

```tsx
// src/main.tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import ColorEditor from './entrypoints/ColorEditor';
import 'datocms-react-ui/styles.css';

connect({
  manualFieldExtensions() {
    return [
      {
        id: 'color-editor',
        name: 'Color Editor',
        type: 'editor',
        fieldTypes: ['string'],
      },
    ];
  },
  renderFieldExtension(id, ctx) {
    switch (id) {
      case 'color-editor':
        render(<ColorEditor ctx={ctx} />);
        break;
    }
  },
});
```

```tsx
// src/entrypoints/ColorEditor.tsx
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';
import { get } from 'lodash-es';

type Props = {
  ctx: RenderFieldExtensionCtx;
};

export default function ColorEditor({ ctx }: Props) {
  const currentValue = (get(ctx.formValues, ctx.fieldPath) as string) || '#000000';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    ctx.setFieldValue(ctx.fieldPath, e.target.value);
  };

  return (
    <Canvas ctx={ctx}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="color"
          value={currentValue}
          onChange={handleChange}
          disabled={ctx.disabled}
        />
        <span>{currentValue}</span>
      </div>
    </Canvas>
  );
}
```

**Important**: Editor extensions **must** respect `ctx.disabled`. When field is disabled (workflow state, permissions), editor should prevent all user input.

### Complete Addon Extension Example

```tsx
// src/main.tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import WordCount from './entrypoints/WordCount';
import 'datocms-react-ui/styles.css';

connect({
  manualFieldExtensions() {
    return [
      {
        id: 'word-count',
        name: 'Word Counter',
        type: 'addon',
        fieldTypes: ['string', 'text'],
        initialHeight: 0,
      },
    ];
  },
  renderFieldExtension(id, ctx) {
    switch (id) {
      case 'word-count':
        render(<WordCount ctx={ctx} />);
        break;
    }
  },
});
```

```tsx
// src/entrypoints/WordCount.tsx
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';
import { get } from 'lodash-es';

type Props = {
  ctx: RenderFieldExtensionCtx;
};

export default function WordCount({ ctx }: Props) {
  const value = (get(ctx.formValues, ctx.fieldPath) as string) || '';
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <Canvas ctx={ctx}>
      {wordCount > 0 && (
        <div style={{ fontSize: 'var(--font-size-s)', color: 'var(--color--ink-subtle)' }}>
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </div>
      )}
    </Canvas>
  );
}
```

## Localized Fields

When field is localized (has multiple language versions), value structure in `ctx.formValues` differs from non-localized fields.

### How `ctx.fieldPath` Works

`ctx.fieldPath` **automatically includes the locale** for localized fields:

- Non-localized field: `ctx.fieldPath` → `"title"`
- Localized field: `ctx.fieldPath` → `"title.en"` (or `"title.it"`, etc.)

This means `get(ctx.formValues, ctx.fieldPath)` and `ctx.setFieldValue(ctx.fieldPath, value)` always work regardless of whether field is localized — SDK resolves path for you.

### How `ctx.formValues` Stores Localized Fields

```ts
// Non-localized field
ctx.formValues.title // "Hello World"

// Localized field
ctx.formValues.title // { en: "Hello World", it: "Ciao Mondo" }
```

### Reading and Writing Localized Values

Always use `ctx.fieldPath` — it handles both cases:

```ts
import { get } from 'lodash-es';

// Read: works for both localized and non-localized
const currentValue = get(ctx.formValues, ctx.fieldPath);

// Write: works for both localized and non-localized
await ctx.setFieldValue(ctx.fieldPath, 'new value');
```

### Accessing Other Localized Fields

If you need to read a different field's value (not the one this extension is attached to), and that field is localized, you must include the locale:

```ts
// Reading another localized field — use ctx.locale for the current locale
const otherValue = ctx.formValues.description as Record<string, string> | undefined;
const localizedValue = otherValue?.[ctx.locale];
```

### Checking if a Field is Localized

```ts
const isLocalized = ctx.field.attributes.localized;
```

## Gotchas

- **`ctx.item` is `null` for new records**: When user creates new record (before first save), `ctx.item` is `null`. Always guard: `if (ctx.item) { ... }`. After first save, `ctx.item` is populated.

- **Editor extensions must respect `ctx.disabled`**: When `ctx.disabled` is `true` (workflow state, permissions, record locking), editor **must** prevent all user input. Correctness requirement — without it, users can edit locked records.

- **ctx recreation in iframes**: The `ctx` object is recreated on every message from parent window, triggering `useEffect` even when values appear identical. Use `useDeepCompareEffect` from `use-deep-compare-effect` instead of `useEffect` when depending on `ctx` properties. See `sdk-context-and-cma.md`.

- **`toggleField()` destroys plugin iframes**: When field is hidden via `ctx.toggleField(path, false)`, its plugin iframes are **completely destroyed**. When field is shown again, iframes are recreated from scratch — all React state is lost. If you need to persist state across visibility changes, store it in plugin parameters or outside React tree.

- **Avoid Editor extensions for Modular Content, Single Block, and Structured Text fields**: Use Addon extensions instead. Editor extensions for these field types require reimplementing rendering and update logic for all contained fields and blocks. See `form-values.md` for working with these field types programmatically.

- **`formValuesToItem()` returns `undefined`**: If required nested blocks aren't loaded, this method returns `undefined` rather than throwing. Always check return value.

## Configurable Field Extensions

When `configurable: true`, two additional hooks are needed:

### `renderManualFieldExtensionConfigScreen`

Renders per-field configuration form in field settings modal.

```ts
renderManualFieldExtensionConfigScreen(
  fieldExtensionId: string,
  ctx: RenderManualFieldExtensionConfigScreenCtx
): void
```

Context properties:

```
ctx.fieldExtensionId  // string
ctx.parameters        // Record<string, unknown> — current params
ctx.errors            // Record<string, unknown> — validation errors
ctx.pendingField      // PendingField — the field being edited
ctx.itemType          // ItemType — the model
ctx.setParameters(params) // set new parameter values
```

**Important**: Do not use form management libraries (react-final-form, etc.) in this hook — you are integrating with DatoCMS's own form system, not managing an independent form. Use `ctx.setParameters()` directly.

### `validateManualFieldExtensionParameters`

Validates parameters whenever they change. Return object with error messages (empty object = valid).

```ts
validateManualFieldExtensionParameters(
  fieldExtensionId: string,
  parameters: Record<string, unknown>
): Record<string, unknown> | Promise<Record<string, unknown>>
```

### Complete Configurable Extension Example

```tsx
connect({
  manualFieldExtensions() {
    return [
      {
        id: 'constrained-input',
        name: 'Constrained Input',
        type: 'editor',
        fieldTypes: ['string'],
        configurable: true,
      },
    ];
  },

  renderManualFieldExtensionConfigScreen(id, ctx) {
    render(<FieldExtensionConfig ctx={ctx} />);
  },

  validateManualFieldExtensionParameters(id, parameters) {
    const errors: Record<string, string> = {};
    if (!parameters.maxLength) {
      errors.maxLength = 'Max length is required';
    }
    return errors;
  },

  renderFieldExtension(id, ctx) {
    render(<ConstrainedInput ctx={ctx} />);
  },
});
```

```tsx
// Per-field config component (NOT the plugin-wide ConfigScreen — use a distinct name to avoid collision)
import type { RenderManualFieldExtensionConfigScreenCtx } from 'datocms-plugin-sdk';
import { Canvas, TextField } from 'datocms-react-ui';

type Props = { ctx: RenderManualFieldExtensionConfigScreenCtx };

export default function FieldExtensionConfig({ ctx }: Props) {
  return (
    <Canvas ctx={ctx}>
      <TextField
        id="maxLength"
        name="maxLength"
        label="Maximum length"
        value={String(ctx.parameters.maxLength || '')}
        onChange={(newValue) => {
          ctx.setParameters({ ...ctx.parameters, maxLength: Number(newValue) });
        }}
        error={ctx.errors.maxLength as string}
      />
    </Canvas>
  );
}
```
