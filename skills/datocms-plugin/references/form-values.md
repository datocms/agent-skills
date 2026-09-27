# Working with Form Values Reference

The `ctx.formValues` object contains the internal form state for the record being edited.

## Contents

- Localized Fields — Always Guard
- Modular Content Fields
- Structured Text Fields — Slate Format
- Key Notes

## Localized Fields — Always Guard

**This is the most common pitfall when reading `ctx.formValues` outside field extensions.** Localized fields store values as objects keyed by locale, not plain values:

```ts
// Non-localized field
ctx.formValues.title // "Hello World"

// Localized field — SAME key, DIFFERENT shape
ctx.formValues.title // { en: "Hello World", it: "Ciao Mondo" }
```

Use the field's `attributes.localized` flag when reading form values in sidebar panels, outlets, and dropdown execute hooks. Do not infer localization from the value's shape: non-localized file, SEO, color, location, and Single Block values can also be objects.

```ts
import type { Field } from 'datocms-plugin-sdk';

function readFieldValue(
  formValues: Record<string, unknown>,
  field: Field,
  locale: string,
): unknown {
  const raw = formValues[field.attributes.api_key];
  return field.attributes.localized
    ? (raw as Record<string, unknown> | null | undefined)?.[locale]
    : raw;
}
```

Usage:

```ts
const fields = await ctx.loadItemTypeFields(ctx.itemType.id);
const titleField = fields.find((field) => field.attributes.api_key === 'title');
if (!titleField) throw new Error('Title field not found');

const title = readFieldValue(ctx.formValues, titleField, ctx.locale) as string | null | undefined;
```

**When to use `readFieldValue` vs `ctx.fieldPath`:**

- **Field extensions** have `ctx.fieldPath` which already includes the locale — use `get(ctx.formValues, ctx.fieldPath)` from `lodash-es`
- **Everything else** (sidebar panels, outlets, dropdown execute hooks) — use `readFieldValue` with the current model's `Field` entity and `ctx.locale`. `ctx.fields` is a partial map; load the model's fields if the needed metadata is missing instead of guessing localization.

### Writing localized field values

When setting a localized field value from a non-field-extension context, include the locale in the path:

```ts
// For localized fields, set via the locale-specific path
await ctx.setFieldValue(`title.${ctx.locale}`, 'New Title');

// For non-localized fields, set directly
await ctx.setFieldValue('title', 'New Title');
```

Use that same field metadata to choose the write path:

```ts
const titlePath = titleField.attributes.localized
  ? `${titleField.attributes.api_key}.${ctx.locale}`
  : titleField.attributes.api_key;
await ctx.setFieldValue(titlePath, 'New Title');
```

## Modular Content Fields

Modular Content (`rich_text`) values are arrays of block objects containing `itemId`, `itemTypeId`, and the block's field values:

```ts
// ctx.formValues.social_profiles
[
  {
    itemId: "39830695",
    itemTypeId: "810886",
    social: "twitter",
    url: "https://twitter.com/datocms"
  },
  {
    itemId: "39830696",
    itemTypeId: "810886",
    social: "github",
    url: "https://github.com/datocms"
  }
]
```

You can reorder, filter, or add blocks. When creating a new block, **omit `itemId`** — the API generates it on save:

```ts
await ctx.setFieldValue('social_profiles', [
  ...currentBlocks,
  {
    itemTypeId: "810886",  // block model ID
    social: "linkedin",
    url: "https://linkedin.com/company/datocms"
  },
]);
```

**Warning**: Avoid creating **Editor** field extensions for Modular Content fields. Use **Addon** extensions instead — editor extensions require reimplementing the rendering and update logic for all contained fields and blocks.

### Single Block fields

A `single_block` form value is **one block object or `null`**, not an array. A localized field wraps that value in a locale map, such as `{ en: { itemId, itemTypeId, heading }, it: null }`. Passing an array can serialize as `null` on save and clear the block.

Read the current locale and preserve the existing block ID and untouched fields when editing:

```ts
const fields = await ctx.loadItemTypeFields(ctx.itemType.id);
const heroField = fields.find((field) => field.attributes.api_key === 'hero');
if (!heroField || heroField.attributes.field_type !== 'single_block') {
  throw new Error('Expected the hero Single Block field');
}
const heroPath = heroField.attributes.localized
  ? `${heroField.attributes.api_key}.${ctx.locale}`
  : heroField.attributes.api_key;
const hero = readFieldValue(ctx.formValues, heroField, ctx.locale) as
  | { itemId?: string; itemTypeId: string; [key: string]: unknown }
  | null
  | undefined;

if (hero) {
  await ctx.setFieldValue(heroPath, { ...hero, heading: 'Updated heading' });
}
```

To create a block in an empty slot, pass a single object and omit `itemId`. Use a block model allowed by the field's validator:

```ts
await ctx.setFieldValue(heroPath, {
  itemTypeId: '810886',
  heading: 'New hero',
});
```

To clear an optional Single Block field, pass `null`:

```ts
await ctx.setFieldValue(heroPath, null);
```

These paths update only the selected locale. In a field extension, use `ctx.fieldPath` directly; it also handles nested blocks.

### Nested blocks and recursive structures

Modular Content blocks can themselves contain Modular Content fields, creating arbitrarily nested structures. Structured Text fields can also contain blocks. This means traversing all content in a record may require recursive logic.

For top-level form fields, use the Slate examples here. API nested-block payloads → [CMA editing records](../../datocms-cma/references/editing-records.md); DAST traversal after `slateToDast` → [Structured Text editing](../../datocms-structured-text/references/editing.md). These are different representations: keep `ctx.setFieldValue` writes Slate-shaped. Load a companion only when the task needs that representation.

## Structured Text Fields — Slate Format

**Critical**: `ctx.formValues` stores Structured Text in **Slate editor format**, not DAST. DatoCMS uses Slate internally for performance (avoiding continuous DAST conversion on every keystroke).

### Slate vs DAST comparison

**Slate format** (what `ctx.formValues` contains):

```ts
[
  {
    type: "paragraph",
    children: [
      { text: "Meet " },
      { text: "the best way", highlight: true },
      { text: " to manage content" }
    ]
  }
]
```

**DAST format** (what the API returns/accepts):

```ts
{
  schema: "dast",
  document: {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [
          { type: "span", value: "Meet " },
          { type: "span", marks: ["highlight"], value: "the best way" },
          { type: "span", value: " to manage content" }
        ]
      }
    ]
  }
}
```

### Key differences

| Aspect | Slate (formValues) | DAST (API) |
| - | - | - |
| Root wrapper | No `root` node — value is directly an array | Wrapped in `{ schema, document: { type: "root", children } }` |
| Text nodes | `{ text: "..." }` | `{ type: "span", value: "..." }` |
| Marks | Boolean keys on node: `{ text: "bold", strong: true }` | Array: `{ marks: ["strong"], value: "bold" }` |

Full DAST rules and validation live in [document model](../../datocms-structured-text/references/document-model.md); DAST content transforms in [editing](../../datocms-structured-text/references/editing.md); Markdown/HTML import and format export in [conversion](../../datocms-structured-text/references/conversion.md). Missing required reference → install `datocms-structured-text` from `datocms/agent-skills` or update the full bundle.

### Converting Slate to DAST

For **read-only** operations (e.g., analyzing content in a sidebar panel), convert with `datocms-structured-text-slate-utils`:

```ts
import { slateToDast } from 'datocms-structured-text-slate-utils';

const slateValue = ctx.formValues.body; // Slate format
const dast = slateToDast(slateValue);   // Standard DAST
```

For **read-write** operations, work directly with the Slate format using the package's TypeScript types and type guards:

```ts
import { isLink, isNonTextNode } from 'datocms-structured-text-slate-utils';
```

### Block and inline nodes in Structured Text

Structured Text can contain block records, inline items, and item links:

```ts
// Block node
{
  type: "block",
  id: "87031498",          // existing block ID
  blockModelId: "810933",  // block model ID
  children: [{ text: "" }],
  title: "My Block Title"  // block field values are inline
}

// Item link
{
  type: "itemLink",
  item: "78722383",        // linked record ID
  itemTypeId: "810907",
  children: [{ text: "link text" }]
}
```

### Creating new blocks in Structured Text

When programmatically adding a block, use a `key` attribute with a unique string instead of `id`. The API generates the real `id` on save and removes `key`:

```ts
await ctx.setFieldValue('body', [
  ...ctx.formValues.body,
  {
    type: 'block',
    key: `${Date.now()}`,       // temporary unique key
    blockModelId: '810933',
    children: [{ text: '' }],
    title: 'New Block',
  },
]);
```

## Key Notes

- **Do not use Editor extensions for Structured Text fields** — use Addon extensions instead. Overriding the Structured Text editor requires reimplementing its entire rendering logic.
- When reading Structured Text for analysis (word count, link extraction, etc.), convert to DAST first with `slateToDast()` for a cleaner tree structure.
- The Slate format is an implementation detail — it may evolve. Prefer using `datocms-structured-text-slate-utils` types over hardcoding format assumptions.
