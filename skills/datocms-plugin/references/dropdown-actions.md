# Dropdown Actions Reference

Dropdown actions add custom actions to context menus throughout DatoCMS. Each scope has a declaration hook (returns the actions) and an execute hook (runs when clicked).

## Contents

- Five Action Scopes
- Shared Types
- Field Dropdown Actions
- Record Dropdown Actions
- Item Form Dropdown Actions
- Upload Dropdown Actions
- Schema Dropdown Actions
- Grouped Actions Example

## Five Action Scopes

| Declaration Hook | Execute Hook | Where It Appears |
| - | - | - |
| `fieldDropdownActions` | `executeFieldDropdownAction` | Individual field dropdown in record form |
| `itemsDropdownActions` | `executeItemsDropdownAction` | Record collection view (batch select) **and** individual record edit page |
| `itemFormDropdownActions` | `executeItemFormDropdownAction` | Record editing form top-right actions menu |
| `uploadsDropdownActions` | `executeUploadsDropdownAction` | Media Area (batch and single asset) |
| `schemaItemTypeDropdownActions` | `executeSchemaItemTypeDropdownAction` | Schema section (model/block actions) |

**`itemsDropdownActions` vs `itemFormDropdownActions`** — these are easy to confuse:

- **`itemsDropdownActions`** appears in **both** the record collection list view (when users select records) **and** on individual record edit pages. Its execute hook receives an **array** of `Item` objects (even for a single record).
- **`itemFormDropdownActions`** appears **only** in the record editing form's top-right actions dropdown. Its execute hook receives no items — instead, it has `ctx.formValues`, `ctx.item`, and all item form methods (`setFieldValue`, `saveCurrentItem`, etc.).

## Shared Types

### `DropdownAction`

```ts
{
  id: string;              // Action ID — passed to execute hook
  label: string;           // Display label (must be unique)
  icon: Icon;              // FontAwesome name or SVG definition
  parameters?: Record<string, unknown>; // Arbitrary params passed to execute
  active?: boolean;        // Whether action appears "active" (highlighted)
  alert?: boolean;         // Whether action appears in alert/danger style
  disabled?: boolean;      // Whether action is greyed out
  closeMenuOnClick?: boolean; // Whether menu closes when clicked
  rank?: number;           // Sort order (ascending)
}
```

### `DropdownActionGroup`

Groups actions into a submenu:

```ts
{
  label: string;           // Group label (must be unique)
  icon: Icon;              // FontAwesome name or SVG definition
  actions: DropdownAction[]; // Grouped actions
  rank?: number;           // Sort order (ascending)
}
```

## Field Dropdown Actions

### Declaration

```ts
fieldDropdownActions(
  field: Field,
  ctx: FieldDropdownActionsCtx  // has ItemFormAdditionalProperties & FieldAdditionalProperties
): Array<DropdownAction | DropdownActionGroup>
```

The context includes item form properties (`locale`, `item`, `itemType`, `formValues`, etc.) and field properties (`fieldPath`, `field`, `disabled`, etc.).

### Execute

```ts
executeFieldDropdownAction(
  actionId: string,
  ctx: ExecuteFieldDropdownActionCtx  // has ItemFormAdditionalProperties, FieldAdditionalProperties, parameters, and ItemFormAdditionalMethods
): Promise<void>
```

The execute context also has item form methods (`setFieldValue`, `toggleField`, `disableField`, `scrollToField`, `saveCurrentItem`, etc.).

### Example: Field Action

```tsx
import { get } from 'lodash-es';

connect({
  fieldDropdownActions(field) {
    if (field.attributes.field_type !== 'string') {
      return [];
    }
    return [
      {
        id: 'uppercase',
        label: 'Convert to uppercase',
        icon: 'font',
      },
    ];
  },
  async executeFieldDropdownAction(actionId, ctx) {
    if (actionId === 'uppercase') {
      const currentValue = get(ctx.formValues, ctx.fieldPath) as string;
      if (currentValue) {
        await ctx.setFieldValue(ctx.fieldPath, currentValue.toUpperCase());
        ctx.notice('Converted to uppercase!');
      }
    }
  },
});
```

## Record Dropdown Actions

### `itemsDropdownActions` (Collection View / Record Edit)

```ts
itemsDropdownActions(
  itemType: ItemType,
  ctx: ItemDropdownActionsCtx  // has ctx.itemType
): Array<DropdownAction | DropdownActionGroup>
```

### `executeItemsDropdownAction`

```ts
executeItemsDropdownAction(
  actionId: string,
  items: Item[],            // Array of selected records
  ctx: ExecuteItemsDropdownActionCtx  // has ctx.parameters
): Promise<void>
```

### Example: Batch Record Action

```tsx
connect({
  itemsDropdownActions(itemType) {
    return [
      {
        id: 'tag-featured',
        label: 'Tag as Featured',
        icon: 'star',
      },
    ];
  },
  async executeItemsDropdownAction(actionId, items, ctx) {
    if (actionId === 'tag-featured') {
      ctx.notice(`Would tag ${items.length} record(s) as featured`);
    }
  },
});
```

## Item Form Dropdown Actions

### `itemFormDropdownActions`

```ts
itemFormDropdownActions(
  itemType: ItemType,
  ctx: ItemFormDropdownActionsCtx  // has ItemFormAdditionalProperties
): Array<DropdownAction | DropdownActionGroup>
```

### `executeItemFormDropdownAction`

```ts
executeItemFormDropdownAction(
  actionId: string,
  ctx: ExecuteItemFormDropdownActionCtx  // has ItemFormAdditionalProperties, parameters, and ItemFormAdditionalMethods
): Promise<void>
```

### Example: Form Action

```tsx
// See form-values.md — always use readFieldValue for localized field safety
function readFieldValue(
  formValues: Record<string, unknown>,
  fieldApiKey: string,
  locale: string,
): unknown {
  const raw = formValues[fieldApiKey];
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    return (raw as Record<string, unknown>)[locale];
  }
  return raw;
}

connect({
  itemFormDropdownActions(itemType) {
    if (itemType.attributes.api_key !== 'blog_post') {
      return [];
    }
    return [
      {
        id: 'auto-slug',
        label: 'Generate slug from title',
        icon: 'link',
      },
    ];
  },
  async executeItemFormDropdownAction(actionId, ctx) {
    if (actionId === 'auto-slug') {
      const title = readFieldValue(ctx.formValues, 'title', ctx.locale) as string | undefined;
      if (title) {
        const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        await ctx.setFieldValue('slug', slug);
        ctx.notice('Slug generated!');
      }
    }
  },
});
```

## Upload Dropdown Actions

### `uploadsDropdownActions`

```ts
uploadsDropdownActions(
  ctx: UploadsDropdownActionsCtx
): Array<DropdownAction | DropdownActionGroup>
```

### `executeUploadsDropdownAction`

```ts
executeUploadsDropdownAction(
  actionId: string,
  uploads: Upload[],         // Array of selected assets
  ctx: ExecuteUploadsDropdownActionCtx  // has ctx.parameters
): Promise<void>
```

### Example: Asset Action

```tsx
connect({
  uploadsDropdownActions() {
    return [
      {
        id: 'show-id',
        label: 'Show asset ID',
        icon: 'info-circle',
      },
    ];
  },
  async executeUploadsDropdownAction(actionId, uploads, ctx) {
    if (actionId === 'show-id' && uploads.length === 1) {
      await ctx.notice(`Asset ID: ${uploads[0].id}`);
    }
  },
});
```

## Schema Dropdown Actions

### `schemaItemTypeDropdownActions`

```ts
schemaItemTypeDropdownActions(
  itemType: ItemType,
  ctx: SchemaItemTypeDropdownActionsCtx
): Array<DropdownAction | DropdownActionGroup>
```

### `executeSchemaItemTypeDropdownAction`

```ts
executeSchemaItemTypeDropdownAction(
  actionId: string,
  itemType: ItemType,        // The model/block model
  ctx: ExecuteSchemaItemTypeDropdownActionCtx  // has ctx.parameters
): Promise<void>
```

### Example: Schema Action (navigate to plugin page)

```tsx
connect({
  schemaItemTypeDropdownActions() {
    return [
      {
        id: 'export-model',
        label: 'Export as JSON...',
        icon: 'file-export',
      },
    ];
  },
  async executeSchemaItemTypeDropdownAction(actionId, itemType, ctx) {
    if (actionId === 'export-model') {
      const envPrefix = ctx.isEnvironmentPrimary ? '' : `/environments/${ctx.environment}`;
      const pagePath = `/configuration/p/${ctx.plugin.id}/pages/export`;
      ctx.navigateTo(`${envPrefix}${pagePath}?itemTypeId=${itemType.id}`);
    }
  },

  // Also need renderPage to handle the export page
  settingsAreaSidebarItemGroups() { /* ... */ },
  renderPage(pageId, ctx) { /* ... */ },
});
```

## Grouped Actions Example

```tsx
connect({
  itemsDropdownActions(itemType) {
    return [
      {
        label: 'Translations',
        icon: 'language',
        actions: [
          { id: 'translate-en', label: 'Translate to English', icon: 'flag' },
          { id: 'translate-fr', label: 'Translate to French', icon: 'flag' },
          { id: 'translate-de', label: 'Translate to German', icon: 'flag' },
        ],
      },
    ];
  },
  async executeItemsDropdownAction(actionId, items, ctx) {
    ctx.notice(`Would run ${actionId} on ${items.length} records`);
  },
});
```
