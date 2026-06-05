# Record Presentation Reference

These hooks customize how records appear in collection views, link fields, and record pickers throughout DatoCMS.

## `buildItemPresentationInfo`

Customizes how records appear in collection views and link fields.

**Performance**: This hook executes every time a record is presented in lists or link fields. Avoid expensive operations (external API calls) — cache results when possible.

```ts
buildItemPresentationInfo(
  item: Item,
  ctx: BuildItemPresentationInfoCtx
): ItemPresentationInfo | undefined | Promise<ItemPresentationInfo | undefined>
```

### `ItemPresentationInfo` shape

```ts
{
  title: string;           // Display title for the record
  imageUrl?: string;       // Representative image URL
  rank?: number;           // Priority if multiple plugins provide info
}
```

### Example

```ts
connect({
  buildItemPresentationInfo(item, ctx) {
    const itemType = ctx.itemTypes[item.relationships.item_type.data.id];
    if (itemType?.attributes.api_key !== 'product') {
      return undefined;
    }

    const name = item.attributes.name as string;
    const price = item.attributes.price as number;
    const imageField = item.attributes.image as { upload_id: string } | null;

    return {
      title: `${name} — $${price}`,
      imageUrl: imageField
        ? `https://www.datocms-assets.com/${imageField.upload_id}`
        : undefined,
    };
  },
});
```

## `initialLocationQueryForItemSelector`

Pre-filters the record picker when opening "Single link" or "Multiple links" fields.

```ts
initialLocationQueryForItemSelector(
  openerField: Field,
  itemType: ItemType,
  ctx: InitialLocationQueryForItemSelectorCtx
): InitialLocationQueryForItemSelector | undefined | Promise<...>
```

### Return type

```ts
{
  locationQuery: {
    locale?: string;
    filter?: {
      query?: string;
      fields?: Record<string, unknown>;
    };
  };
  rank?: number;
}
```

### Example

```ts
connect({
  initialLocationQueryForItemSelector(openerField, itemType) {
    if (itemType.attributes.api_key === 'product') {
      return {
        locationQuery: {
          filter: {
            query: '',
            fields: { status: { eq: 'active' } },
          },
        },
      };
    }
  },
});
```
