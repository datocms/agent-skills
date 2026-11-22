# Config screen

Skeleton assumes `datocms-react-ui/styles.css` imported in the entry and the template's `render` helper (`src/utils/render.tsx`); icons from the plugin's own set. Frame sizing and padding: `../surfaces.md`.

Host draws "Plugin settings" (a section title between hairlines) right above the frame, inside a page column. Starting with `Page.SectionTitle`, a heading or a divider stacks a second title under it. Open with the fields (or one short description sentence that reads without a title); `Page.SectionTitle` only from the second section. No `Page`/`Pane` wrapper: the host already provides the column. Save is one `primary` button at the natural size, never `expand`.

```tsx
import type { RenderConfigScreenCtx } from 'datocms-plugin-sdk';
import Button from 'datocms-react-ui/Button';
import Canvas from 'datocms-react-ui/Canvas';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import { Page } from 'datocms-react-ui/Page';
import PasswordInput from 'datocms-react-ui/PasswordInput';
import StringInput from 'datocms-react-ui/StringInput';
import SwitchInput from 'datocms-react-ui/SwitchInput';
import { useState } from 'react';

type Params = { apiKey?: string; autoSync?: boolean; webhookUrl?: string };

function ConfigScreen({ ctx }: { ctx: RenderConfigScreenCtx }) {
  const saved = ctx.plugin.attributes.parameters as Params;
  const [apiKey, setApiKey] = useState<string | null>(saved.apiKey ?? null);
  const [autoSync, setAutoSync] = useState<boolean | null>(saved.autoSync ?? false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(saved.webhookUrl ?? null);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await ctx.updatePluginParameters({ apiKey, autoSync, webhookUrl });
        ctx.notice('Settings saved'); // not awaited: it settles when the toast closes
      }}
    >
      <FieldWrapper label="API key" required error={apiKey ? undefined : 'Enter the API key'}>
        <PasswordInput value={apiKey} onChange={setApiKey} />
      </FieldWrapper>
      <FieldWrapper hint="Sync runs each time a record is published.">
        <SwitchInput label="Sync automatically" value={autoSync} onChange={setAutoSync} />
      </FieldWrapper>
      <Page.SectionTitle>Advanced</Page.SectionTitle>
      {/* a title is fine from the second section on */}
      <FieldWrapper label="Webhook URL" hint="Leave empty to use the default endpoint.">
        <StringInput value={webhookUrl} onChange={setWebhookUrl} placeholder="https://example.com/hook" />
      </FieldWrapper>
      <Button tone="primary" submit label="Save settings" disabled={!apiKey} />
    </form>
  );
}

export function renderConfigScreen(ctx: RenderConfigScreenCtx) {
  render(
    <Canvas ctx={ctx}>
      <ConfigScreen ctx={ctx} />
    </Canvas>,
  );
}
```

Topics of read-only facts or one-click actions: `SettingsList` rows (`Lists/SettingsList`). Destructive actions last, `ghost-alert`, confirmed with `ctx.openConfirm`. Mistakes: a heading or `Page.SectionTitle` as the first element; `Page` around everything (adds a second column padding and `min-height: 60vh`); full-width Save; an in-frame toast instead of `ctx.notice`.
