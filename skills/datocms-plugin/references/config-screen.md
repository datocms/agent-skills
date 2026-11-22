# Plugin Configuration Screen Reference

The configuration screen lets plugin administrators set global parameters that apply across the entire plugin. It appears in the plugin's settings page in the DatoCMS Settings area.

## Contents

- Render Hook: `renderConfigScreen`
- Reading Current Parameters
- Saving Parameters
- Pattern with `react-final-form`
- Simpler Config Screen (without react-final-form)
- Informational Config Screen
- `normalizeParameters` Pattern
- Key Notes

## Render Hook: `renderConfigScreen`

```ts
renderConfigScreen(ctx: RenderConfigScreenCtx): void
```

### `RenderConfigScreenCtx`

A `SelfResizingPluginFrameCtx<'renderConfigScreen'>` — auto-resizing iframe with all base properties and methods.

**Key properties:**

```
ctx.plugin.attributes.parameters  // Current global plugin parameters
ctx.currentRole.meta.final_permissions.can_edit_schema  // Permission check
```

**Key methods:**

```
ctx.updatePluginParameters(params)  // Save new parameters
```

## Reading Current Parameters

```ts
const settings = ctx.plugin.attributes.parameters as Record<string, unknown>;
const apiKey = settings.apiKey as string;
const debugMode = settings.debugMode as boolean;
```

## Saving Parameters

Always check permissions first:

```ts
if (!ctx.currentRole.meta.final_permissions.can_edit_schema) {
  // Show read-only view
  return;
}

await ctx.updatePluginParameters({
  apiKey: 'new-key',
  debugMode: true,
});
ctx.notice('Settings saved!'); // do not await: settles only when the toast closes
```

## Pattern with `react-final-form`

For complex configuration screens, use `react-final-form` when you need validation, dirty tracking, or many fields.

### Dependencies

```json
{
  "dependencies": {
    "react-final-form": "^7.0.1",
    "final-form": "^5.0.1"
  }
}
```

`datocms-react-ui` 4 has no `Form` component: the form is a plain `<form>`, and each field is a `FieldWrapper` around a controlled input. Alias `react-final-form`'s `Form` (`Form as FinalForm`) so it does not read like a UI component. Full shell, layout rules and mistakes: [config screen in datocms-plugin-design](../../datocms-plugin-design/references/surfaces/config-screen.md).

### Complete Config Screen Example

```tsx
// src/main.tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import ConfigScreen from './entrypoints/ConfigScreen';
import 'datocms-react-ui/styles.css';

connect({
  renderConfigScreen(ctx) {
    render(<ConfigScreen ctx={ctx} />);
  },
  // ... other hooks
});
```

```tsx
// src/entrypoints/ConfigScreen.tsx
import type { RenderConfigScreenCtx } from 'datocms-plugin-sdk';
import Button from 'datocms-react-ui/Button';
import Canvas from 'datocms-react-ui/Canvas';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import StringInput from 'datocms-react-ui/StringInput';
import SwitchInput from 'datocms-react-ui/SwitchInput';
import { Form as FinalForm, Field } from 'react-final-form';

type Props = {
  ctx: RenderConfigScreenCtx;
};

type Settings = {
  apiKey: string;
  webhookUrl: string;
  debugMode: boolean;
};

export default function ConfigScreen({ ctx }: Props) {
  const savedSettings = ctx.plugin.attributes.parameters as Partial<Settings>;
  const canEdit = ctx.currentRole.meta.final_permissions.can_edit_schema;

  const initialValues: Settings = {
    apiKey: savedSettings.apiKey || '',
    webhookUrl: savedSettings.webhookUrl || '',
    debugMode: savedSettings.debugMode || false,
  };

  const validate = (values: Settings) => {
    const errors: Partial<Record<keyof Settings, string>> = {};

    if (!values.apiKey) {
      errors.apiKey = 'API key is required';
    }

    if (values.webhookUrl && !values.webhookUrl.startsWith('https://')) {
      errors.webhookUrl = 'Webhook URL must use HTTPS';
    }

    return errors;
  };

  const handleSubmit = async (values: Settings) => {
    await ctx.updatePluginParameters(values);
    ctx.notice('Settings saved successfully!');
  };

  return (
    <Canvas ctx={ctx}>
      <FinalForm<Settings>
        initialValues={initialValues}
        validate={validate}
        onSubmit={handleSubmit}
      >
        {({ handleSubmit, submitting, dirty }) => (
          <form onSubmit={handleSubmit}>
            <Field<string> name="apiKey">
              {({ input, meta }) => (
                <FieldWrapper
                  label="API key"
                  hint="Your external service API key"
                  required
                  error={meta.touched && meta.error ? meta.error : undefined}
                >
                  <StringInput
                    placeholder="sk-..."
                    disabled={!canEdit}
                    value={input.value}
                    onChange={(value) => input.onChange(value ?? '')}
                    onBlur={() => input.onBlur()}
                  />
                </FieldWrapper>
              )}
            </Field>

            <Field<string> name="webhookUrl">
              {({ input, meta }) => (
                <FieldWrapper
                  label="Webhook URL"
                  hint="Optional webhook endpoint"
                  error={meta.touched && meta.error ? meta.error : undefined}
                >
                  <StringInput
                    placeholder="https://example.com/hook"
                    disabled={!canEdit}
                    value={input.value}
                    onChange={(value) => input.onChange(value ?? '')}
                    onBlur={() => input.onBlur()}
                  />
                </FieldWrapper>
              )}
            </Field>

            <Field<boolean> name="debugMode" type="checkbox">
              {({ input }) => (
                <FieldWrapper hint="Enable verbose logging">
                  <SwitchInput
                    label="Debug mode"
                    disabled={!canEdit}
                    value={input.checked ?? false}
                    onChange={(value) => input.onChange(Boolean(value))}
                  />
                </FieldWrapper>
              )}
            </Field>

            {canEdit && (
              <Button
                tone="primary"
                submit
                label="Save settings"
                busy={submitting}
                disabled={!dirty}
              />
            )}
          </form>
        )}
      </FinalForm>
    </Canvas>
  );
}
```

## Simpler Config Screen (without react-final-form)

For simple configurations, you can use plain React state:

```tsx
import type { RenderConfigScreenCtx } from 'datocms-plugin-sdk';
import Button from 'datocms-react-ui/Button';
import Canvas from 'datocms-react-ui/Canvas';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import StringInput from 'datocms-react-ui/StringInput';
import { useState } from 'react';

type Props = {
  ctx: RenderConfigScreenCtx;
};

export default function ConfigScreen({ ctx }: Props) {
  const saved = ctx.plugin.attributes.parameters as Record<string, unknown>;
  const [apiKey, setApiKey] = useState<string | null>((saved.apiKey as string) || null);

  const canEdit = ctx.currentRole.meta.final_permissions.can_edit_schema;

  // A Button whose onClick returns a promise shows itself busy until it settles.
  const handleSave = async () => {
    await ctx.updatePluginParameters({ apiKey });
    ctx.notice('Settings saved!');
  };

  return (
    <Canvas ctx={ctx}>
      <FieldWrapper label="API key">
        <StringInput value={apiKey} onChange={setApiKey} disabled={!canEdit} />
      </FieldWrapper>
      {canEdit && (
        <Button tone="primary" label="Save" onClick={handleSave} disabled={!apiKey} />
      )}
    </Canvas>
  );
}
```

## Informational Config Screen

If your plugin doesn't need settings, use the config screen for usage instructions. Start with the text, not a heading: DatoCMS already draws the "Plugin settings" title above the frame.

```tsx
import type { RenderConfigScreenCtx } from 'datocms-plugin-sdk';
import Canvas from 'datocms-react-ui/Canvas';

export function Config({ ctx }: { ctx: RenderConfigScreenCtx }) {
  return (
    <Canvas ctx={ctx}>
      <p>This plugin adds a word counter to all text fields. No configuration is needed.</p>
    </Canvas>
  );
}
```

## `normalizeParameters` Pattern

When a plugin has configuration, define a `normalizeParameters()` function alongside a type guard to handle empty, partial, or legacy parameter shapes. This is the standard pattern across DatoCMS plugins:

```ts
// src/lib/normalizeParameters.ts

type PluginSettings = {
  apiKey: string;
  webhookUrl: string;
  debugMode: boolean;
};

function isValidSettings(params: Record<string, unknown>): params is PluginSettings {
  return typeof params.apiKey === 'string' && params.apiKey.length > 0;
}

function normalizeParameters(raw: Record<string, unknown>): PluginSettings {
  return {
    apiKey: typeof raw.apiKey === 'string' ? raw.apiKey : '',
    webhookUrl: typeof raw.webhookUrl === 'string' ? raw.webhookUrl : '',
    debugMode: typeof raw.debugMode === 'boolean' ? raw.debugMode : false,
  };
}
```

Use `normalizeParameters` anywhere you read plugin settings (config screen, field extensions, sidebar panels, etc.) to guarantee a well-typed object. Use `isValidSettings` in hooks that depend on config being complete (e.g., skip functionality if the API key is empty).

## Key Notes

- When `updatePluginParameters()` is called, the new values propagate **in real-time** to all connected users.
- `ctx.plugin.attributes.parameters` reflects the last **saved** state — it does not update as you modify component state. It only changes after `updatePluginParameters()` completes.
- Keep read-only permission branches simple; do not fork the screen into a second design.
- Do not open the screen with a section title or divider: DatoCMS already shows a "Plugin settings" divider right above the frame ([config screen](../../datocms-plugin-design/references/surfaces/config-screen.md)).
