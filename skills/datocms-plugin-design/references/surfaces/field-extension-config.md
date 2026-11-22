# Field extension config screen

Skeleton assumes `datocms-react-ui/styles.css` imported in the entry and the template's `render` helper (`src/utils/render.tsx`); icons from the plugin's own set. Frame sizing and padding: `../surfaces.md`.

Inside the field's appearance form, which has its own Save: no Save button here. Every change goes through `ctx.setParameters`; show `ctx.errors[key]` (set by `validateManualFieldExtensionParameters`) as the field `error`.

```tsx
import type { RenderManualFieldExtensionConfigScreenCtx } from 'datocms-plugin-sdk';
import Canvas from 'datocms-react-ui/Canvas';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import NumberInput from 'datocms-react-ui/NumberInput';

function Config({ ctx }: { ctx: RenderManualFieldExtensionConfigScreenCtx }) {
  const max = (ctx.parameters.maxLength as number | null | undefined) ?? null;
  const error = ctx.errors.maxLength as string | undefined;

  return (
    <FieldWrapper label="Maximum length" error={error}>
      <NumberInput value={max} onChange={(maxLength) => ctx.setParameters({ ...ctx.parameters, maxLength })} />
    </FieldWrapper>
  );
}

export function renderManualFieldExtensionConfigScreen(_id: string, ctx: RenderManualFieldExtensionConfigScreenCtx) {
  render(
    <Canvas ctx={ctx}>
      <Config ctx={ctx} />
    </Canvas>,
  );
}
```
