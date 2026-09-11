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
await ctx.notice('Settings saved!');
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

**Important**: Both `datocms-react-ui` and `react-final-form` export a component named `Form`. You need both — `Form` from `datocms-react-ui` is the styled wrapper, while `Form` from `react-final-form` manages form state. Always alias the `react-final-form` import (e.g., `Form as FinalForm`) to avoid the collision.

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
import { Canvas, Button, TextField, SwitchField, FieldGroup, Form } from 'datocms-react-ui';
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
          <Form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field name="apiKey">
                {({ input, meta }) => (
                  <TextField
                    id="apiKey"
                    name="apiKey"
                    label="API Key"
                    hint="Your external service API key"
                    placeholder="sk-..."
                    required
                    disabled={!canEdit}
                    value={input.value}
                    onChange={input.onChange}
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>

              <Field name="webhookUrl">
                {({ input, meta }) => (
                  <TextField
                    id="webhookUrl"
                    name="webhookUrl"
                    label="Webhook URL"
                    hint="Optional webhook endpoint"
                    placeholder="https://..."
                    disabled={!canEdit}
                    value={input.value}
                    onChange={input.onChange}
                    error={meta.touched && meta.error ? meta.error : undefined}
                  />
                )}
              </Field>

              <Field name="debugMode" type="checkbox">
                {({ input }) => (
                  <SwitchField
                    id="debugMode"
                    name="debugMode"
                    label="Debug Mode"
                    hint="Enable verbose logging"
                    disabled={!canEdit}
                    value={input.checked || false}
                    onChange={input.onChange}
                  />
                )}
              </Field>
            </FieldGroup>

            {canEdit && (
              <Button
                type="submit"
                fullWidth
                buttonSize="l"
                buttonType="primary"
                disabled={submitting || !dirty}
              >
                {submitting ? 'Saving...' : 'Save settings'}
              </Button>
            )}
          </Form>
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
import { Canvas, Button, TextField, FieldGroup } from 'datocms-react-ui';
import { useState } from 'react';

type Props = {
  ctx: RenderConfigScreenCtx;
};

export default function ConfigScreen({ ctx }: Props) {
  const saved = ctx.plugin.attributes.parameters as Record<string, unknown>;
  const [apiKey, setApiKey] = useState((saved.apiKey as string) || '');
  const [saving, setSaving] = useState(false);

  const canEdit = ctx.currentRole.meta.final_permissions.can_edit_schema;

  const handleSave = async () => {
    setSaving(true);
    try {
      await ctx.updatePluginParameters({ apiKey });
      await ctx.notice('Settings saved!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Canvas ctx={ctx}>
      <FieldGroup>
        <TextField
          id="apiKey"
          name="apiKey"
          label="API Key"
          value={apiKey}
          onChange={setApiKey}
          disabled={!canEdit}
        />
      </FieldGroup>
      {canEdit && (
        <Button
          onClick={handleSave}
          buttonType="primary"
          disabled={saving || !apiKey}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      )}
    </Canvas>
  );
}
```

## Informational Config Screen

If your plugin doesn't need settings, you can use the config screen to display usage instructions:

```tsx
export function Config({ ctx }: { ctx: RenderConfigScreenCtx }) {
  return (
    <Canvas ctx={ctx}>
      <h3>How this plugin works</h3>
      <ul>
        <li>This plugin automatically adds a word counter to all text fields.</li>
        <li>No configuration is needed.</li>
      </ul>
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
