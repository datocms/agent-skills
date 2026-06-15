# Working with Form Values Reference

The `ctx.formValues` object contains the internal form state for the record being edited. This reference covers the internal data formats, which differ from the API/DAST formats in important ways.

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

You cannot know at code time whether a field is localized — the user may change it at any point. **Always use `readFieldValue` when reading form values in sidebar panels, outlets, and dropdown execute hooks**:

```ts
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
```

Usage:

```ts
// CORRECT — works for both localized and non-localized fields
const title = readFieldValue(ctx.formValues, 'title', ctx.locale) as string | undefined;

// WRONG — breaks if the field is localized
const title = ctx.formValues.title as string;
```

**When to use `readFieldValue` vs `ctx.fieldPath`:**

- **Field extensions** have `ctx.fieldPath` which already includes the locale — use `get(ctx.formValues, ctx.fieldPath)` from `lodash-es`
- **Everything else** (sidebar panels, outlets, dropdown execute hooks) — use `readFieldValue` with `ctx.locale`

### Writing localized field values

When setting a localized field value from a non-field-extension context, include the locale in the path:

```ts
// For localized fields, set via the locale-specific path
await ctx.setFieldValue(`title.${ctx.locale}`, 'New Title');

// For non-localized fields, set directly
await ctx.setFieldValue('title', 'New Title');
```

To check whether a field is localized, look up its `Field` entity:

```ts
const fields = await ctx.loadItemTypeFields(ctx.itemType.id);
const titleField = fields.find((f) => f.attributes.api_key === 'title');
const isLocalized = titleField?.attributes.localized ?? false;
```

## Modular Content Fields

Modular Content (and Single Block) values are arrays of block objects containing `itemId`, `itemTypeId`, and the block's field values:

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

### Nested blocks and recursive structures

Modular Content blocks can themselves contain Modular Content fields, creating arbitrarily nested structures. Structured Text fields can also contain blocks. This means traversing all content in a record may require recursive logic.

For simple use cases (reading/writing top-level block fields), the examples above are sufficient. For advanced scenarios involving deeply nested block traversal, recursive block manipulation, or complex Structured Text block operations, use the **datocms-cma** skill and its section on nested blocks. If the user does not have the `datocms-cma` skill installed, ask them to install it.

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
