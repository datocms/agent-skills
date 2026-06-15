# Lifecycle Hooks Reference

Lifecycle hooks run at specific moments in the DatoCMS workflow. They execute in the hidden boot iframe (no UI rendering) and can modify behavior, validate data, or perform side effects.

## Contents

- `onBoot`
- `onBeforeItemUpsert`
- `onBeforeItemsPublish`
- `onBeforeItemsUnpublish`
- `onBeforeItemsDestroy`

## `onBoot`

Called once when the plugin first loads. Use for initialization, parameter migrations, and integrity checks. Runs in a hidden iframe — no UI rendering.

```ts
onBoot(ctx: OnBootCtx): void
```

`OnBootCtx` has all base context properties and methods (see `sdk-context-and-cma.md`). No sizing utilities are relevant since this hook has no visible UI.

### Example: Parameter Migration

```ts
connect({
  async onBoot(ctx) {
    // Migrate old parameter format to new format
    const params = ctx.plugin.attributes.parameters as Record<string, unknown>;

    if (params.apiKey && !params.config) {
      // Old format: { apiKey: "..." }
      // New format: { config: { apiKey: "...", version: 2 } }
      if (ctx.currentRole.meta.final_permissions.can_edit_schema) {
        await ctx.updatePluginParameters({
          config: {
            apiKey: params.apiKey,
            version: 2,
          },
        });
      }
    }
  },
});
```

### Example: Integrity Check

```ts
connect({
  async onBoot(ctx) {
    const params = ctx.plugin.attributes.parameters as Record<string, unknown>;

    if (!params.apiKey) {
      ctx.customToast({
        type: 'warning',
        message: 'Plugin not configured. Please set your API key.',
        dismissOnPageChange: false,
        dismissAfterTimeout: false,
        cta: {
          label: 'Configure',
          value: 'configure',
        },
      }).then((result) => {
        if (result === 'configure') {
          const envPrefix = ctx.isEnvironmentPrimary
            ? ''
            : `/environments/${ctx.environment}`;
          ctx.navigateTo(`${envPrefix}/configuration/plugins/${ctx.plugin.id}/edit`);
        }
      });
    }
  },
});
```

## `onBeforeItemUpsert`

Called when the user attempts to save a record. Return `false` to block the save, `true` to allow it.

```ts
onBeforeItemUpsert(
  createOrUpdateItemPayload: ItemUpdateSchema | ItemCreateSchema,
  ctx: OnBeforeItemUpsertCtx
): boolean | Promise<boolean>
```

`OnBeforeItemUpsertCtx` extends `Ctx` with:

```
ctx.scrollToField(path, locale?)  // Scroll to a specific field
```

### Payload shape

The payload is a `SchemaTypes.ItemUpdateSchema` (existing record) or `SchemaTypes.ItemCreateSchema` (new record) — raw JSON:API format with a `data` wrapper:

```ts
import type { SchemaTypes } from '@datocms/cma-client';
```

Key paths:

```ts
payload.data.relationships?.item_type?.data?.id  // Model ID — use to identify which model
payload.data.attributes                          // Field values (API key → value)
payload.data.meta?.current_version               // Present on updates, absent on creates
```

**Important**: This runs BEFORE server-side validation. Client-side field validations (onBlur) are not affected.

If you return `false`, DatoCMS shows "A plugin blocked the action". Use `ctx.alert()` for a better user experience.

### Example: Validation Hook

```ts
connect({
  async onBeforeItemUpsert(payload, ctx) {
    // Only validate blog_post model
    const itemType = Object.values(ctx.itemTypes).find(
      (it) => it?.id === payload.data.relationships?.item_type?.data?.id
    );
    if (itemType?.attributes.api_key !== 'blog_post') {
      return true;
    }

    // Check that SEO title is filled
    const seoField = payload.data.attributes?.seo_analysis;
    if (!seoField) {
      ctx.alert('Please fill in the SEO analysis field before saving.');
      ctx.scrollToField('seo_analysis');
      return false;
    }

    return true;
  },
});
```

## `onBeforeItemsPublish`

Called before publishing one or more records. Return `false` to block.

```ts
onBeforeItemsPublish(
  items: Item[],
  ctx: OnBeforeItemsPublishCtx
): boolean | Promise<boolean>
```

`OnBeforeItemsPublishCtx` is a plain `Ctx`.

### Example

```ts
connect({
  async onBeforeItemsPublish(items, ctx) {
    for (const item of items) {
      const itemType = ctx.itemTypes[item.relationships.item_type.data.id];
      if (itemType?.attributes.api_key === 'blog_post') {
        // Check if post has a featured image
        if (!item.attributes.featured_image) {
          ctx.alert(`Record "${item.id}" needs a featured image before publishing.`);
          return false;
        }
      }
    }
    return true;
  },
});
```

## `onBeforeItemsUnpublish`

Called before unpublishing records. Return `false` to block.

```ts
onBeforeItemsUnpublish(
  items: Item[],
  ctx: OnBeforeItemsUnpublishCtx
): boolean | Promise<boolean>
```

## `onBeforeItemsDestroy`

Called before deleting records. Return `false` to block.

```ts
onBeforeItemsDestroy(
  items: Item[],
  ctx: OnBeforeItemsDestroyCtx
): boolean | Promise<boolean>
```

### Example

```ts
connect({
  async onBeforeItemsDestroy(items, ctx) {
    if (items.length > 5) {
      ctx.alert('Cannot delete more than 5 records at once for safety.');
      return false;
    }
    return true;
  },
});
```
