# Outlets Reference

Outlets are plugin-rendered areas that appear at the top of record editing forms and record collection (list) views. They are useful for displaying banners, status indicators, bulk action tools, or any custom UI above the standard content.

## Contents

- Item Form Outlets
- Item Collection Outlets
- Key Notes

## Item Form Outlets

Appear at the top of a record's editing page.

### Declaration: `itemFormOutlets`

Called once per model to declare which outlets appear.

```ts
itemFormOutlets(itemType: ItemType, ctx: ItemFormOutletsCtx): ItemFormOutlet[]
```

`ItemFormOutletsCtx` is a plain `Ctx` (base context only).

### `ItemFormOutlet` shape

```ts
{
  id: string;              // Unique ID — passed to renderItemFormOutlet
  rank?: number;           // Sort order (ascending) among multiple outlets
  initialHeight?: number;  // Initial iframe height in pixels
}
```

### Render: `renderItemFormOutlet`

```ts
renderItemFormOutlet(itemFormOutletId: string, ctx: RenderItemFormOutletCtx): void
```

### `RenderItemFormOutletCtx`

A `SelfResizingPluginFrameCtx` (auto-resizing iframe) with all item form properties and methods.

**Additional properties:**

```
ctx.itemFormOutletId  // string — the outlet ID being rendered
```

**Item form properties:**

```
ctx.locale, ctx.item, ctx.itemType, ctx.formValues, ctx.itemStatus,
ctx.isSubmitting, ctx.isFormDirty, ctx.blocksAnalysis
```

**Item form methods:**

```
ctx.setFieldValue(path, value)
ctx.toggleField(path, show)
ctx.disableField(path, disable)
ctx.scrollToField(path, locale?)
ctx.saveCurrentItem(showToast?)
ctx.formValuesToItem(formValues, skipUnchanged?)
ctx.itemToFormValues(item)
```

### Complete Item Form Outlet Example

```tsx
// src/main.tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import DraftBanner from './entrypoints/DraftBanner';
import 'datocms-react-ui/styles.css';

connect({
  itemFormOutlets(itemType) {
    if (itemType.attributes.api_key !== 'blog_post') {
      return [];
    }
    return [
      {
        id: 'draft-banner',
        initialHeight: 0,
      },
    ];
  },
  renderItemFormOutlet(outletId, ctx) {
    switch (outletId) {
      case 'draft-banner':
        render(<DraftBanner ctx={ctx} />);
        break;
    }
  },
});
```

```tsx
// src/entrypoints/DraftBanner.tsx
import type { RenderItemFormOutletCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';

type Props = {
  ctx: RenderItemFormOutletCtx;
};

export default function DraftBanner({ ctx }: Props) {
  if (ctx.itemStatus !== 'draft') {
    return <Canvas ctx={ctx}>{null}</Canvas>;
  }

  return (
    <Canvas ctx={ctx}>
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--color--warning-soft--surface)',
          borderRadius: '4px',
          fontSize: 'var(--font-size-s)',
          color: 'var(--color--warning-soft--ink)',
        }}
      >
        This record is still a draft. It will not appear on the live site until
        published.
      </div>
    </Canvas>
  );
}
```

## Item Collection Outlets

Appear at the top of a record collection (list) view for a specific model.

### Declaration: `itemCollectionOutlets`

Called once per model to declare which outlets appear on the collection page.

```ts
itemCollectionOutlets(
  itemType: ItemType,
  ctx: ItemCollectionOutletsCtx
): ItemCollectionOutlet[]
```

`ItemCollectionOutletsCtx` is a plain `Ctx` (base context only).

### `ItemCollectionOutlet` shape

```ts
{
  id: string;              // Unique ID — passed to renderItemCollectionOutlet
  rank?: number;           // Sort order (ascending) among multiple outlets
  initialHeight?: number;  // Initial iframe height in pixels
}
```

### Render: `renderItemCollectionOutlet`

```ts
renderItemCollectionOutlet(
  itemCollectionOutletId: string,
  ctx: RenderItemCollectionOutletCtx
): void
```

### `RenderItemCollectionOutletCtx`

A `SelfResizingPluginFrameCtx` (auto-resizing iframe). Does NOT have item form methods (there's no single record being edited).

**Additional properties:**

```
ctx.itemCollectionOutletId  // string — the outlet ID being rendered
ctx.itemType                // ItemType — the model whose collection is displayed
```

### Complete Item Collection Outlet Example

```tsx
// src/main.tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import CollectionBanner from './entrypoints/CollectionBanner';
import 'datocms-react-ui/styles.css';

connect({
  itemCollectionOutlets(itemType) {
    if (itemType.attributes.api_key !== 'blog_post') {
      return [];
    }
    return [
      {
        id: 'collection-banner',
        initialHeight: 0,
      },
    ];
  },
  renderItemCollectionOutlet(outletId, ctx) {
    switch (outletId) {
      case 'collection-banner':
        render(<CollectionBanner ctx={ctx} />);
        break;
    }
  },
});
```

```tsx
// src/entrypoints/CollectionBanner.tsx
import type { RenderItemCollectionOutletCtx } from 'datocms-plugin-sdk';
import { Canvas, Button } from 'datocms-react-ui';

type Props = {
  ctx: RenderItemCollectionOutletCtx;
};

export default function CollectionBanner({ ctx }: Props) {
  return (
    <Canvas ctx={ctx}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: 'var(--color--surface-muted)',
          borderRadius: '4px',
        }}
      >
        <span style={{ fontSize: 'var(--font-size-s)' }}>
          Viewing {ctx.itemType.attributes.name} records
        </span>
        <Button buttonSize="xxs" onClick={() => ctx.notice('Action triggered!')}>
          Custom Action
        </Button>
      </div>
    </Canvas>
  );
}
```

## Key Notes

- Outlets use `SelfResizingPluginFrameCtx` — they auto-resize to fit content
- Item form outlets have full access to item form properties and methods (same as field extensions and sidebar panels)
- Item collection outlets do NOT have item form methods — they only have the model (`ctx.itemType`) and base context
- Use `initialHeight: 0` for outlets that may render nothing (e.g., conditionally shown banners) to avoid blank space
- Both declaration hooks receive the `ItemType` as the first argument, so you can conditionally show outlets per model
- **`ctx.item` is `null` for new records** (item form outlets only): Always guard `if (ctx.item) { ... }` before accessing record data
