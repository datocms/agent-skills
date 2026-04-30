# DatoCMS Plugin SDK — Core Architecture

## Quick Navigation

- `connect()` entrypoint rules
- Hook catalog by category
- Shared render and `Canvas` patterns
- Frame sizing model
- Base `ctx` properties and methods
- Partial repositories and iframe `ctx` recreation
- `formValues`, CMA access, and async error handling
- Parameter migration and declaration/render pairing rules
- Type exports, CSS variables, and field-type tables

## Entry Point: `connect()`

Every DatoCMS plugin has a single entry point — the `connect()` function from `datocms-plugin-sdk`. You pass it an object whose keys are hook names and whose values are hook implementations.

```tsx
import { connect } from 'datocms-plugin-sdk';

connect({
  // Declaration hooks (return data)
  manualFieldExtensions(ctx) { /* ... */ },

  // Render hooks (render UI into iframe)
  renderFieldExtension(fieldExtensionId, ctx) { /* ... */ },
});
```

The `connect()` function accepts a `Partial<FullConnectParameters>` — you only implement the hooks you need.

**Important**: `connect()` must be called exactly **once** per plugin. Do not call it conditionally, inside components, or multiple times. It runs at module load time and registers all hooks with the DatoCMS parent window.

## Complete Hook Reference

The SDK supports 40+ hooks in total. Here is every hook, grouped by category:

### Declaration Hooks (return data, no DOM access)

| Hook | Purpose |
| - | - |
| `manualFieldExtensions` | Declare field extensions users can install on fields |
| `overrideFieldExtensions` | Programmatically force field extensions onto fields |
| `itemFormSidebarPanels` | Declare collapsible panels in the record editing sidebar |
| `itemFormSidebars` | Declare full-width sidebars that replace the record sidebar |
| `mainNavigationTabs` | Declare top navigation tabs (pointing to pages or inspectors) |
| `settingsAreaSidebarItemGroups` | Declare pages in the Settings area sidebar |
| `contentAreaSidebarItems` | Declare items in the Content area sidebar |
| `assetSources` | Declare custom upload sources in the Media Area |
| `itemFormOutlets` | Declare outlets at the top of record editing forms |
| `itemCollectionOutlets` | Declare outlets at the top of record collection views |
| `uploadSidebarPanels` | Declare collapsible panels in the Media Area asset sidebar |
| `uploadSidebars` | Declare full-width sidebars in the Media Area asset view |
| `fieldDropdownActions` | Declare actions in field context menus |
| `itemsDropdownActions` | Declare actions in record collection/edit context menus |
| `itemFormDropdownActions` | Declare actions in the record editing form menu |
| `uploadsDropdownActions` | Declare actions in the Media Area context menu |
| `schemaItemTypeDropdownActions` | Declare actions in the Schema section model menu |
| `customMarksForStructuredTextField` | Declare custom inline marks for Structured Text |
| `customBlockStylesForStructuredTextField` | Declare custom block styles for Structured Text |
| `buildItemPresentationInfo` | Customize how records appear in lists and link fields |
| `initialLocationQueryForItemSelector` | Pre-filter the record picker for link fields |
| `validateManualFieldExtensionParameters` | Validate per-field extension config parameters |

### Render Hooks (render UI into iframes)

| Hook | Frame Type | Purpose |
| - | - | - |
| `renderFieldExtension` | `SelfResizingPluginFrameCtx` | Render a field extension |
| `renderManualFieldExtensionConfigScreen` | `SelfResizingPluginFrameCtx` | Render per-field config for a configurable extension |
| `renderItemFormSidebarPanel` | `SelfResizingPluginFrameCtx` | Render a collapsible sidebar panel |
| `renderItemFormSidebar` | `ImposedSizePluginFrameCtx` | Render a full-width sidebar |
| `renderPage` | `ImposedSizePluginFrameCtx` | Render a custom page |
| `renderConfigScreen` | `SelfResizingPluginFrameCtx` | Render the plugin config screen |
| `renderModal` | `SelfResizingPluginFrameCtx` | Render a custom modal |
| `renderAssetSource` | `SelfResizingPluginFrameCtx` | Render an asset source picker |
| `renderItemFormOutlet` | `SelfResizingPluginFrameCtx` | Render an outlet at top of record form |
| `renderItemCollectionOutlet` | `SelfResizingPluginFrameCtx` | Render an outlet at top of collection view |
| `renderUploadSidebarPanel` | `SelfResizingPluginFrameCtx` | Render a collapsible panel in Media Area sidebar |
| `renderUploadSidebar` | `ImposedSizePluginFrameCtx` | Render a full-width sidebar in Media Area |
| `renderInspector` | `ImposedSizePluginFrameCtx` | Render the left side of an inspector |
| `renderInspectorPanel` | `ImposedSizePluginFrameCtx` | Render a custom panel in the inspector right side |

Frame types determine iframe sizing behavior: `SelfResizingPluginFrameCtx` auto-resizes to content height; `ImposedSizePluginFrameCtx` fills the available space (pass `noAutoResizer` to Canvas).

### Lifecycle Hooks (no UI, run in hidden iframe)

| Hook | Purpose |
| - | - |
| `onBoot` | Plugin initialization, parameter migration, integrity checks |
| `onBeforeItemUpsert` | Before a record is saved — can block the save |
| `onBeforeItemsPublish` | Before publishing records — can block |
| `onBeforeItemsUnpublish` | Before unpublishing records — can block |
| `onBeforeItemsDestroy` | Before deleting records — can block |

### Execute Hooks (triggered by dropdown action clicks, no UI)

| Hook | Purpose |
| - | - |
| `executeFieldDropdownAction` | Run when a field dropdown action is clicked |
| `executeItemsDropdownAction` | Run when a record dropdown action is clicked |
| `executeItemFormDropdownAction` | Run when a record form dropdown action is clicked |
| `executeUploadsDropdownAction` | Run when a Media Area dropdown action is clicked |
| `executeSchemaItemTypeDropdownAction` | Run when a Schema model dropdown action is clicked |

## The `render()` Utility

Every plugin should define a `render()` helper in `src/utils/render.tsx`:

```tsx
import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');
const root = createRoot(container!);

export function render(component: ReactNode) {
  root.render(<StrictMode>{component}</StrictMode>);
}
```

Usage in `connect()`:

```tsx
import { render } from './utils/render';
import FieldExtension from './entrypoints/FieldExtension';

connect({
  renderFieldExtension(id, ctx) {
    render(<FieldExtension ctx={ctx} />);
  },
});
```

**Important**: The `root` is created once at module level. Each render hook call re-renders into the same root. This is correct — only one render hook runs per iframe instance.

## The `Canvas` Wrapper

Every rendered component **must** be wrapped in `<Canvas ctx={ctx}>`. Canvas:

- Injects CSS custom properties for theming (accent color, font, spacing)
- Starts the auto-resizer (for self-resizing frames)
- Provides context via `useCtx()` hook

```tsx
import { Canvas } from 'datocms-react-ui';
import 'datocms-react-ui/styles.css';

function MyComponent({ ctx }: { ctx: SomeCtx }) {
  return (
    <Canvas ctx={ctx}>
      {/* Your UI here */}
    </Canvas>
  );
}
```

**Always import styles**: `import 'datocms-react-ui/styles.css'` — do this once in your entry file (e.g., `src/main.tsx`).

### `useCtx()` Hook

Canvas provides context via the `useCtx<T>()` hook from `datocms-react-ui`. This lets deeply nested child components access the plugin context without prop-drilling:

```tsx
import { useCtx } from 'datocms-react-ui';
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';

// In a deeply nested child — no need to pass ctx through every level
function NestedChild() {
  const ctx = useCtx<RenderFieldExtensionCtx>();
  return <span>{ctx.field.attributes.api_key}</span>;
}
```

Use this when components are 2+ levels deep. For top-level entrypoint components, passing `ctx` as a prop is fine.

### `noAutoResizer` Prop

For hooks that use `ImposedSizePluginFrameCtx` (pages, full-width sidebars, inspectors), the auto-resizer does nothing because DatoCMS controls the iframe size. Pass `noAutoResizer` to avoid unnecessary resize attempts:

```tsx
// For pages, full-width sidebars, and inspectors
<Canvas ctx={ctx} noAutoResizer>
  {/* content fills the imposed size */}
</Canvas>
```

**When to use `noAutoResizer`:** `renderPage`, `renderItemFormSidebar`, `renderUploadSidebar`, `renderInspector`, `renderInspectorPanel`.

**When NOT to use it:** `renderFieldExtension`, `renderItemFormSidebarPanel`, `renderConfigScreen`, `renderModal`, `renderAssetSource`, `renderItemFormOutlet`, `renderItemCollectionOutlet`, `renderUploadSidebarPanel`.

## Plugin Frame Types

Render hooks receive one of two frame context types:

### `SelfResizingPluginFrameCtx`

For components embedded within the DatoCMS page (field extensions, sidebar panels, config screen, modals, asset sources, outlets, upload sidebar panels). The iframe auto-resizes to fit content.

**Additional sizing utilities available:**

- `ctx.startAutoResizer()` — auto-resize on DOM changes (Canvas does this for you)
- `ctx.stopAutoResizer()` — stop auto-resizing
- `ctx.updateHeight(newHeight?)` — manually set height
- `ctx.setHeight(number)` — set exact iframe height

### `ImposedSizePluginFrameCtx`

For full-screen contexts (pages, full-width sidebars, inspectors). DatoCMS controls the iframe size — no auto-resize.

## Base Context Properties (available in ALL hooks)

Every hook receives a `ctx` object. The base properties available in every context:

```
ctx.currentUser        // User | SsoUser | Account | Organization — the logged-in user
ctx.currentRole        // Role — the user's role with permissions
ctx.currentUserAccessToken // string | undefined — API token (requires permission)
ctx.plugin             // Plugin — the current plugin entity
ctx.site               // Site — the current DatoCMS project
ctx.environment        // string — current environment ID
ctx.isEnvironmentPrimary // boolean — whether this is the primary environment
ctx.owner              // Account | Organization — project owner
ctx.account            // DEPRECATED — use ctx.owner instead (owner can be an Organization)
ctx.ui                 // { locale: string } — DatoCMS interface language (NOT the content locale — see ctx.locale in item form contexts)
ctx.theme              // { primaryColor, accentColor, semiTransparentAccentColor, lightColor, darkColor }
ctx.itemTypes          // Partial<Record<string, ItemType>> — all models, indexed by ID
ctx.fields             // Partial<Record<string, Field>> — loaded fields, indexed by ID
ctx.fieldsets          // Partial<Record<string, Fieldset>> — loaded fieldsets, indexed by ID (Fieldset is not exported from datocms-plugin-sdk — import from @datocms/cma-client if needed)
ctx.users              // Partial<Record<string, User>> — loaded users, indexed by ID
ctx.ssoUsers           // Partial<Record<string, SsoUser>> — loaded SSO users, indexed by ID
```

## Base Context Methods (available in ALL hooks)

```
// Data loading
ctx.loadItemTypeFields(itemTypeId)     // Promise<Field[]> — load all fields for a model
ctx.loadItemTypeFieldsets(itemTypeId)   // Promise<Fieldset[]> — load all fieldsets for a model
ctx.loadFieldsUsingPlugin()            // Promise<Field[]> — fields using this plugin
ctx.loadUsers()                        // Promise<User[]>
ctx.loadSsoUsers()                     // Promise<SsoUser[]>

// Plugin parameters
ctx.updatePluginParameters(params)     // Promise<void> — save global plugin config
ctx.updateFieldAppearance(fieldId, changes) // Promise<void> — modify field appearance

// Toasts
ctx.alert(message)                     // Promise<void> — error toast
ctx.notice(message)                    // Promise<void> — success toast
ctx.customToast(toast)                 // Promise<CtaValue | null> — custom toast with optional CTA

// Record dialogs
ctx.createNewItem(itemTypeId)          // Promise<Item | null>
ctx.selectItem(itemTypeId, options?)   // Promise<Item | Item[] | null>
ctx.editItem(itemId)                   // Promise<Item | null>

// Upload dialogs
ctx.selectUpload(options?)             // Promise<Upload | Upload[] | null>
ctx.editUpload(uploadId)              // Promise<(Upload & { deleted?: true }) | null>
ctx.editUploadMetadata(fileFieldValue) // Promise<FileFieldValue | null>

// Custom dialogs
ctx.openModal(modal)                   // Promise<unknown> — open custom modal
ctx.openConfirm(options)               // Promise<unknown> — confirmation dialog

// Navigation
ctx.navigateTo(path)                   // Promise<void> — navigate within DatoCMS
```

## Entity Repositories Are Partial

`ctx.itemTypes`, `ctx.fields`, `ctx.fieldsets`, `ctx.users`, and `ctx.ssoUsers` are `Partial<Record<string, T>>` — they only contain entities that DatoCMS has **already loaded** in the current UI context. If you need data for a model that hasn't been loaded yet, you must explicitly fetch it:

```ts
// ctx.fields may NOT contain all fields — explicitly load them
const fields = await ctx.loadItemTypeFields(itemTypeId);
```

Always check for `undefined` when accessing these repositories (e.g., `ctx.itemTypes[id]?.attributes.name`).

## `ctx` Object Recreation in Iframes

The `ctx` object is **recreated on every message** from the DatoCMS parent window to the plugin iframe. This means reference equality changes even when values are identical. Using `ctx` properties in a `useEffect` dependency array will cause the effect to re-fire on every update, even if nothing changed.

**Solution**: Use `useDeepCompareEffect` from `use-deep-compare-effect` instead of `useEffect` when depending on `ctx` properties:

```ts
import useDeepCompareEffect from 'use-deep-compare-effect';

// BAD — re-fires on every ctx recreation
useEffect(() => { /* ... */ }, [ctx.formValues]);

// GOOD — only fires when values actually change
useDeepCompareEffect(() => { /* ... */ }, [ctx.formValues]);
```

## `ctx.formValues` Gotchas

Hooks with access to `ctx.formValues` (field extensions, sidebar panels, outlets, dropdown execute hooks) should be aware of two pitfalls:

- **Localized fields** store values as nested objects keyed by locale (`{ en: "Hello", it: "Ciao" }`), not plain values. Use `ctx.locale` to read the correct locale, or use `get(ctx.formValues, ctx.fieldPath)` from `lodash-es` in field extensions (where `ctx.fieldPath` already includes the locale). See `field-extensions.md` for full localization guidance.
- **Structured Text fields** store values in internal **Slate editor format**, not DAST. Do not assume the value matches the API's DAST schema. See `form-values.md` for the Slate ↔ DAST differences and conversion utilities.
- **`formValuesToItem()` can return `undefined`**: If required nested blocks or relationships aren't loaded yet, this method returns `undefined` instead of throwing. Always check the return value before using it.

## Using the CMA Client API

For plugins that need to make DatoCMS API calls (fetching records, updating content, etc.), use the `@datocms/cma-client-browser` package with `ctx.currentUserAccessToken`. Plugins run inside browser iframes, so always use the `-browser` variant (not `@datocms/cma-client`).

**Requires** adding `"permissions": ["currentUserAccessToken"]` to `datoCmsPlugin` in `package.json` (see project-scaffold.md).

```ts
import { buildClient } from '@datocms/cma-client-browser';

// Always check the token exists before creating the client
if (!ctx.currentUserAccessToken) {
  ctx.alert('This plugin requires API access. Please reinstall it.');
  return;
}

// Create a client using the current user's token
const client = buildClient({
  apiToken: ctx.currentUserAccessToken,
  // IMPORTANT: pass the environment so API calls target the correct
  // sandbox environment. Without this, calls default to the primary
  // environment, which can cause unexpected data issues.
  environment: ctx.environment,
});

// Example: Fetch all records for a model
const records = await client.items.list({
  filter: { type: 'blog_post' },
  page: { limit: 100 },
});

// Example: Update a record
await client.items.update(recordId, {
  title: 'New Title',
});
```

`ctx.currentUserAccessToken` is `undefined` if the plugin doesn't have the `currentUserAccessToken` permission declared in `package.json`, or if the user's role doesn't grant it. Always check before use.

## Error Handling in Async Operations

SDK methods (`ctx.setFieldValue`, `ctx.updatePluginParameters`, CMA client calls, etc.) return Promises and can fail. Wrap async operations in try/catch and use `ctx.alert()` to show errors to the user:

```ts
try {
  await ctx.setFieldValue(ctx.fieldPath, newValue);
  ctx.notice('Value updated!');
} catch (error) {
  ctx.alert(`Failed to update value: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

For CMA client API calls, errors include rate limiting, permission issues, and validation failures:

```ts
try {
  await client.items.update(recordId, { title: 'New Title' });
} catch (error) {
  if (error instanceof ApiError && error.response.status === 422) {
    ctx.alert('Validation error — check the record data.');
  } else {
    ctx.alert('Failed to update record. Please try again.');
  }
}
```

## Icon Type

Icons can be specified in two ways:

### FontAwesome string

```ts
icon: 'calendar'  // FontAwesome icon name (without "fa-" prefix)
```

### Custom SVG

```ts
icon: {
  type: 'svg',
  viewBox: '0 0 24 24',
  content: '<path d="M12 2l3.09 6.26L22 9.27..."/>'
}
```

For content area sidebar items, emojis are also supported:

```ts
icon: { type: 'emoji', emoji: '📅' }
```

## Reading Plugin Global Parameters

```ts
const settings = ctx.plugin.attributes.parameters as Record<string, unknown>;
const apiKey = settings.apiKey as string;
```

## Permission Check Before Updating Parameters

Always check before calling `updatePluginParameters` or `updateFieldAppearance`:

```ts
if (ctx.currentRole.meta.final_permissions.can_edit_schema) {
  await ctx.updatePluginParameters({ /* ... */ });
}
```

## Version Migration Pattern

When plugin parameters evolve over time (e.g., adding new settings, restructuring existing ones), use the `onBoot` lifecycle hook to migrate old parameter formats to the new format at plugin initialization. This ensures existing installations are updated automatically. See `lifecycle-hooks.md` for the full `onBoot` migration pattern with examples.

## Declaration + Render Hook Pairing Rule

Declaration hooks tell DatoCMS _what_ exists. Render hooks tell it _how_ to display it. They are paired by ID:

| Declaration Hook | Render Hook | ID Parameter |
| - | - | - |
| `manualFieldExtensions` | `renderFieldExtension` | `fieldExtensionId` |
| `itemFormSidebarPanels` | `renderItemFormSidebarPanel` | `sidebarPaneId` |
| `itemFormSidebars` | `renderItemFormSidebar` | `sidebarId` |
| `mainNavigationTabs` | `renderPage` | `pageId` |
| `mainNavigationTabs` | `renderInspector` | `inspectorId` |
| `settingsAreaSidebarItemGroups` | `renderPage` | `pageId` |
| `contentAreaSidebarItems` | `renderPage` | `pageId` |
| `assetSources` | `renderAssetSource` | `assetSourceId` |
| `itemFormOutlets` | `renderItemFormOutlet` | `itemFormOutletId` |
| `itemCollectionOutlets` | `renderItemCollectionOutlet` | `itemCollectionOutletId` |
| `uploadSidebarPanels` | `renderUploadSidebarPanel` | `sidebarPaneId` |
| `uploadSidebars` | `renderUploadSidebar` | `sidebarId` |
| — (called via `ctx.openModal`) | `renderModal` | `modalId` |
| — (called via `setInspectorMode`) | `renderInspectorPanel` | `panelId` |
| — (always available) | `renderConfigScreen` | (no ID) |

## All Type Exports from `datocms-plugin-sdk`

Key types you can import:

```ts
import type {
  // Entity types
  Account, Field, Item, ItemType, Plugin, Role, Site, SsoUser, Upload, User,

  // Connect
  FullConnectParameters,

  // Context types — render hooks
  RenderFieldExtensionCtx,
  RenderManualFieldExtensionConfigScreenCtx,
  RenderItemFormSidebarPanelCtx,
  RenderItemFormSidebarCtx,
  RenderPageCtx,
  RenderConfigScreenCtx,
  RenderModalCtx,
  RenderAssetSourceCtx,
  RenderItemFormOutletCtx,
  RenderItemCollectionOutletCtx,
  RenderUploadSidebarPanelCtx,
  RenderUploadSidebarCtx,
  RenderInspectorCtx,
  RenderInspectorPanelCtx,

  // Context types — lifecycle hooks
  OnBootCtx,
  OnBeforeItemUpsertCtx,
  OnBeforeItemsPublishCtx,
  OnBeforeItemsUnpublishCtx,
  OnBeforeItemsDestroyCtx,

  // Context types — execute hooks (dropdown actions)
  ExecuteFieldDropdownActionCtx,
  ExecuteItemFormDropdownActionCtx,
  ExecuteItemsDropdownActionCtx,
  ExecuteUploadsDropdownActionCtx,
  ExecuteSchemaItemTypeDropdownActionCtx,

  // Context types — declaration hooks
  OverrideFieldExtensionsCtx,

  // Declaration types
  ManualFieldExtension,
  FieldExtensionType,
  FieldType,
  FieldExtensionOverride,
  ItemFormSidebarPanel,
  ItemFormSidebar,
  MainNavigationTab,
  SettingsAreaSidebarItemGroup,
  ContentAreaSidebarItem,
  AssetSource,
  ItemFormOutlet,
  ItemCollectionOutlet,
  UploadSidebarPanel,
  UploadSidebar,

  // Shared types
  DropdownAction,
  DropdownActionGroup,
  ItemFormSidebarPanelPlacement,

  // Base types
  Theme,
  Toast,
  Modal,
  ConfirmOptions,
  FieldAppearanceChange,
  FileFieldValue,
  FocalPoint,
  ItemListLocationQuery,

  // Sizing
  SizingUtilities,

  // Icon
  Icon,
  SvgDefinition,
} from 'datocms-plugin-sdk';
```

## Converting Between Form Values and API Items

Two utility methods are available in item form contexts (field extensions, sidebar panels, outlets):

- **`ctx.formValuesToItem(formValues, skipUnchangedFields?)`** — Converts the internal form state into an API-compatible `Item` object. Useful when you need to send form data to an external API or compare with the persisted record. Returns `undefined` if required nested data (blocks, relationships) hasn't loaded yet — **always check the return value**.

- **`ctx.itemToFormValues(item)`** — Converts an API `Item` object into the internal form value format. Useful when you receive data from the CMA API and want to populate the form.

```ts
// Example: send current form state to an external preview API
const item = ctx.formValuesToItem(ctx.formValues);
if (item) {
  await fetch('https://preview.example.com/api', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}
```

## CSS Custom Properties

Inside `<Canvas>`, DatoCMS injects CSS custom properties that match the project's theme. Use these instead of hardcoded colors to keep your plugin visually consistent:

**Text:** `--base-body-color`, `--light-body-color`, `--placeholder-body-color`

**UI surfaces:** `--light-bg-color`, `--lighter-bg-color`, `--disabled-bg-color`

**Borders:** `--border-color`, `--darker-border-color`

**Semantic colors:** `--alert-color`, `--warning-color`, `--warning-bg-color`, `--notice-color`, `--add-color`, `--remove-color`

**Project theme (set by DatoCMS admins):** `--accent-color`, `--primary-color`, `--light-color`, `--dark-color`

**Typography:** `--base-font-family`, `--monospaced-font-family`, `--font-size-xxs`, `--font-size-xs`, `--font-size-s`, `--font-size-m`, `--font-size-l`, `--font-size-xl`, `--font-size-xxl`, `--font-size-xxxl`, `--font-weight-bold`

**Spacing:** `--spacing-s`, `--spacing-m`, `--spacing-l`, `--spacing-xl`, `--spacing-xxl`, `--spacing-xxxl` (and negative variants `--negative-spacing-*`)

**Animation:** `--material-ease`, `--inertial-ease`

```tsx
// Example: use theme-consistent styles
<div style={{
  fontSize: 'var(--font-size-s)',
  color: 'var(--light-body-color)',
  padding: 'var(--spacing-m)',
  borderBottom: '1px solid var(--border-color)',
}}>
  Plugin content here
</div>
```

## FieldType Values

All supported field types for `manualFieldExtensions.fieldTypes`:

```
'boolean' | 'color' | 'date_time' | 'date' | 'file' | 'float' | 'gallery' |
'integer' | 'json' | 'lat_lon' | 'link' | 'links' | 'rich_text' | 'seo' |
'single_block' | 'slug' | 'string' | 'structured_text' | 'text' | 'video'
```

Or use `'all'` to match every field type.
