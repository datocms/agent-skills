# Field addon

Skeleton assumes `datocms-react-ui/styles.css` imported in the entry and the template's `render` helper (`src/utils/render.tsx`); icons from the plugin's own set. Frame sizing and padding: `../surfaces.md`.

Rendered under the field's editor, 10px below it. Keep it to one quiet line: a status `Pill`, a small `Button` (default size, `soft` or `ghost`), or a `Callout` when the value has a problem. No title (the field label is above).

```tsx
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import Button from 'datocms-react-ui/Button';
import Canvas from 'datocms-react-ui/Canvas';
import Pill from 'datocms-react-ui/Pill';

function SeoAddon({ ctx }: { ctx: RenderFieldExtensionCtx }) {
  const text = String(ctx.formValues[ctx.fieldPath] ?? '');
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-s)', alignItems: 'center' }}>
      <Pill tone={text.length > 60 ? 'warning' : 'success'}>{`${text.length} characters`}</Pill>
      <Button tone="ghost" label="Suggest a title" disabled={ctx.disabled} onClick={() => undefined} />
    </div>
  );
}

export function renderFieldExtension(_id: string, ctx: RenderFieldExtensionCtx) {
  render(
    <Canvas ctx={ctx}>
      <SeoAddon ctx={ctx} />
    </Canvas>,
  );
}
```
