# Field editor

Skeleton assumes `datocms-react-ui/styles.css` imported in the entry and the template's `render` helper (`src/utils/render.tsx`); icons from the plugin's own set. Frame sizing and padding: `../surfaces.md`.

The host draws the field's label, hint, label menu and validation errors around the frame. Draw only the input. A cross-document `<label>` cannot reach an input inside the iframe, so give the input an accessible name from the field label. No `FieldWrapper` label (it would repeat the host's). Respect `ctx.disabled`. Empty object-like value: `EmptySlot`.

```tsx
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { get } from 'lodash-es'; // optional in the scaffold: add `lodash-es` and `@types/lodash-es`
import Canvas from 'datocms-react-ui/Canvas';
import StringInput from 'datocms-react-ui/StringInput';

function ColorEditor({ ctx }: { ctx: RenderFieldExtensionCtx }) {
  // fieldPath is a path (`title.en`, a block's nested path), not a key
  const value = (get(ctx.formValues, ctx.fieldPath) as string | null) ?? null;

  return (
    <StringInput
      aria-label={ctx.field.attributes.label}
      value={value}
      disabled={ctx.disabled}
      onChange={(next) => ctx.setFieldValue(ctx.fieldPath, next)}
    />
  );
}

export function renderFieldExtension(_id: string, ctx: RenderFieldExtensionCtx) {
  render(
    <Canvas ctx={ctx}>
      <ColorEditor ctx={ctx} />
    </Canvas>,
  );
}
```

Text editors: `EditorToolbar` and the `--editor-content-*` variables (`Foundations/CssVariables`, "Text editors"). Mistakes: re-drawing the label or error; a bordered card around the input (the input is already a field box); hard-coded `px` heights instead of `--control-height`.
