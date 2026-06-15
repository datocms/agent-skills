# SDK Context and CMA

Use this when a task needs base `ctx` properties, partial entity repositories, form-value conversion, browser CMA calls, endpoint overrides, permissions, or async failure handling. Load `sdk-connect-and-frames.md` instead for hook wiring, render helpers, `<Canvas>`, and frame sizing.

## Contents

- Base context
- Entity repositories
- Form values
- Browser CMA
- Endpoint overrides
- Updating plugin state
- Async errors
- Common type imports
- CSS and theme context

## Base context

Every hook receives `ctx` with these common properties:

```ts
ctx.currentUser;
ctx.currentRole;
ctx.currentUserAccessToken; // requires permission and may still be undefined
ctx.plugin;
ctx.site;
ctx.environment;
ctx.isEnvironmentPrimary;
ctx.owner;
ctx.ui.locale;
ctx.cdaEndpointUrl;
ctx.cmaBaseUrl;
ctx.cssDesignTokens;
ctx.colorScheme; // 'light' | 'dark'
ctx.theme; // legacy, prefer cssDesignTokens
```

Common methods:

```ts
ctx.loadItemTypeFields(itemTypeId);
ctx.loadItemTypeFieldsets(itemTypeId);
ctx.loadFieldsUsingPlugin();
ctx.loadUsers();
ctx.loadSsoUsers();
ctx.updatePluginParameters(params);
ctx.updateFieldAppearance(fieldId, changes);
ctx.alert(message);
ctx.notice(message);
ctx.customToast(toast);
ctx.createNewItem(itemTypeId);
ctx.selectItem(itemTypeId, options);
ctx.editItem(itemId);
ctx.selectUpload(options);
ctx.editUpload(uploadId);
ctx.editUploadMetadata(fileFieldValue);
ctx.openModal(modal);
ctx.openConfirm(options);
ctx.navigateTo(path);
```

## Entity repositories

`ctx.itemTypes`, `ctx.fields`, `ctx.fieldsets`, `ctx.users`, and `ctx.ssoUsers` are partial maps containing only entities already loaded by the host UI.

```ts
const fields = await ctx.loadItemTypeFields(itemTypeId);
const field = ctx.fields[fieldId]; // may still be undefined
```

Always guard missing entries. Load what the flow needs instead of assuming the repo is complete.

## Form values

Item-form contexts expose internal form state, not always API-shaped data.

- Field extensions: use `get(ctx.formValues, ctx.fieldPath)` because `fieldPath` already includes the locale segment when needed.
- Localized values outside field extensions: read with `ctx.locale` or use the localized helpers in `form-values.md`.
- Structured Text values in `ctx.formValues` are Slate-shaped, not DAST-shaped.
- `ctx.formValuesToItem(ctx.formValues)` may return `undefined` when required nested data is not loaded. Check before using it.
- Use `ctx.itemToFormValues(item)` when a CMA item must populate form state.
- `ctx` object references are recreated across host messages. Use deep-compare effects when depending on object-shaped `ctx` values.

## Browser CMA

Prefer SDK helpers (`selectItem`, `editItem`, `updateFieldAppearance`, `loadItemTypeFields`, etc.) before direct CMA calls.

When direct browser CMA is required:

1. Add only the needed package and permission.
2. Guard `ctx.currentUserAccessToken` at runtime.
3. Pass `environment: ctx.environment` so calls target the current sandbox.
4. Pass `baseUrl: ctx.cmaBaseUrl` for internal/staging host support.

```ts
import { buildClient } from '@datocms/cma-client-browser';

if (!ctx.currentUserAccessToken) {
  await ctx.alert('This action requires API access. Check the plugin permissions.');
  return;
}

const client = buildClient({
  apiToken: ctx.currentUserAccessToken,
  environment: ctx.environment,
  baseUrl: ctx.cmaBaseUrl,
});
```

Do not add `currentUserAccessToken` for unused future flows. Keep the package permission, runtime guard, and visible disabled/error state aligned.

## Endpoint overrides

The SDK exposes host-provided endpoints for non-production DatoCMS environments:

- `ctx.cmaBaseUrl` maps to `baseUrl` in `@datocms/cma-client-browser` and other CMA clients.
- `ctx.cdaEndpointUrl` maps to `graphqlEndpointUrl` in `@datocms/cda-client`.

Most plugins do not need CDA calls. If a plugin does, prefer the client option over manually building URLs.

## Updating plugin state

Global plugin parameters:

```ts
const params = ctx.plugin.attributes.parameters as Record<string, unknown>;
await ctx.updatePluginParameters({ ...params, enabled: true });
```

Field appearance updates and plugin parameters require schema edit permissions. Guard before calling:

```ts
if (!ctx.currentRole.meta.final_permissions.can_edit_schema) {
  await ctx.alert('You do not have permission to edit this configuration.');
  return;
}
```

For `renderManualFieldExtensionConfigScreen`, do not use an independent form library. Use `ctx.parameters`, `ctx.errors`, and `ctx.setParameters()` directly.

## Async errors

Wrap SDK and CMA mutations in `try/catch`. Surface concise user-facing errors with `ctx.alert()` and successes with `ctx.notice()`.

```ts
try {
  await ctx.updatePluginParameters(nextParams);
  await ctx.notice('Settings saved');
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  await ctx.alert(`Could not save settings: ${message}`);
}
```

## Common type imports

Import SDK types with `import type`:

```ts
import type {
  RenderConfigScreenCtx,
  RenderFieldExtensionCtx,
  RenderItemFormSidebarPanelCtx,
  RenderModalCtx,
  OnBootCtx,
  ExecuteItemsDropdownActionCtx,
  ManualFieldExtension,
  ItemFormSidebarPanel,
  DropdownAction,
  ItemListLocationQuery,
  FieldAppearanceChange,
} from 'datocms-plugin-sdk';
```

Entity exports include `Account`, `Field`, `Item`, `ItemType`, `Plugin`, `Role`, `Site`, `SsoUser`, `Upload`, and `User`. Import `Fieldset` from `@datocms/cma-client` if needed.

Field extension `fieldTypes` values:

```ts
'all' | 'boolean' | 'color' | 'date_time' | 'date' | 'file' | 'float' |
'gallery' | 'integer' | 'json' | 'lat_lon' | 'link' | 'links' |
'rich_text' | 'seo' | 'single_block' | 'slug' | 'string' |
'structured_text' | 'text' | 'video'
```

Do not create editor field extensions for modular content, single block, or Structured Text. Use addon extensions for those cases.

## CSS and theme context

Inside `<Canvas>`, prefer semantic Canvas tokens from `ctx.cssDesignTokens`, for example:

- neutral: `--color--surface`, `--color--surface-muted`, `--color--ink`, `--color--ink-subtle`, `--color--border`
- paired contexts: `--color--primary--surface` + `--color--primary--ink`, `--color--danger-soft--surface` + `--color--danger-soft--ink`
- focus: `--color--focus--border`, `--color--focus--outline`
- type/spacing: `--base-font-family`, `--font-size-*`, `--font-weight-bold`, `--spacing-*`

Use `ctx.colorScheme` only for non-CSS branching such as third-party themes, syntax highlighting, or image assets.
