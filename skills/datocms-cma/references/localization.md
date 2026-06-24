# Localization

Covers working with localized field values and the normalized field value utilities.

> Endpoint shapes touching localized fields: `npx datocms cma:docs {items <action>|site update}` (add `--expand-types '*'` for full TS definitions). This file covers the per-locale value shape, `all_locales_required` semantics, and the partial-vs-full-update rule for localized fields.

## Contents

- Localized vs Non-Localized Values
- Getting Available Locales
- Creating Records with Localized Fields
- Updating Localized Fields
- Localized fields must share one locale set per payload
- Localized File Fields
- Checking if a Field is Localized
- Normalized Field Value Utilities
- Complete Example: Migrate Content to a New Locale

## Localized vs Non-Localized Values

When a field is **not** localized, its value is a plain value:

```ts
{ title: "Hello World" }
```

When a field **is** localized, its value is an object keyed by locale code:

```ts
{ title: { en: "Hello World", it: "Ciao Mondo", de: "Hallo Welt" } }
```

This applies to all field types — strings, files, links, blocks, structured text, etc.

## Getting Available Locales

```ts
const site = await client.site.find();
console.log(site.locales); // ["en", "it", "de"]
```

The first locale in the array is the primary locale.

## Creating Records with Localized Fields

```ts
const record = await client.items.create({
  item_type: { id: modelId, type: "item_type" },
  // Non-localized field — plain value
  slug: "hello-world",
  // Localized field — object keyed by locale
  title: {
    en: "Hello World",
    it: "Ciao Mondo",
  },
  body: {
    en: "English content here",
    it: "Contenuto italiano qui",
  },
});
```

**Important:** If the model has `all_locales_required: true`, you must provide values for every locale on the site. If `all_locales_required: false`, you can provide values for only some locales.

## Updating Localized Fields

When updating a localized field, you provide the full object with every locale you want to keep — there is no "partial locale update", and omitting a locale deletes it:

```ts
// First, read the current record
const record = await client.items.find("record-id");

// Update only the Italian translation
await client.items.update("record-id", {
  title: {
    ...record.title, // Preserve other locales
    it: "Nuovo Titolo",
  },
});
```

## Localized fields must share one locale set per payload

Mental model: a record has **one locale set**, shared by all its localized fields, and the CMA keeps it consistent. So the write rules split by whether you're _keeping_ that set or _changing_ it. This mirrors the official rules — [`item/create` § Localization](https://www.datocms.com/docs/content-management-api/resources/item/create#localization) and [`item/update` § Updating localized fields](https://www.datocms.com/docs/content-management-api/resources/item/update#updating-localized-fields).

**Per field, every operation:** the value must be a per-locale object with **≥1 locale**, and every key must be one of the **site's locales** — `{}`, a bare value, or an unknown locale is rejected.

**Which locales each field you send must carry:**

| Operation | What to send | Locale set on each sent field |
| - | - | - |
| **Edit values** — record's locales unchanged | only the fields you're changing | **exactly the record's current locales** |
| **Add / remove a locale** — changing the set | **every** localized field, in one request | the **new** set, identical across all (`null` for empties) |
| **Create** a record | the fields you want filled (the rest auto-fill `null`) | one set, identical across the fields you send (≥1 field) |

> **`all_locales_required: true` model** overrides the table: every sent field must carry **all** site locales — keys mandatory, values may be `null`.

Two consequences to internalize:

- `title: { it }` alone on an `{ en, it }` record is **rejected** — it would drop `en` from one field only. To actually drop `en`, use the add/remove row (send every field).
- Adding `fr` means sending **every** localized field with an `fr` key (value or `null`) in the same request — the one time you can't send just the field you changed (DatoCMS calls this the "Locale Sync Rule").

**Replace, not merge** ([update Rule 1](https://www.datocms.com/docs/content-management-api/resources/item/update#updating-localized-fields)). A sent field's per-locale object fully replaces the stored one, so omitting a locale deletes it — spread to preserve, as in _Updating Localized Fields_ above. Whole fields you don't send stay untouched.

**Locale-scoped tokens — update only** ([update Rule 3](https://www.datocms.com/docs/content-management-api/resources/item/update#updating-localized-fields)). A token that can write only some locales sends just those; the CMA preserves the record's existing values for the locales it can't access (so the set stays consistent), and rejects any write to an out-of-scope locale with `INSUFFICIENT_PERMISSIONS`. No such preservation on create.

**Errors.** Violations return `INVALID_FIELD` — read `details.field` + `details.code` (e.g. `INVALID_LOCALES`) for which field and why; a create with no locale at all returns `MISSING_LOCALES`. Match with `error.findError("INVALID_FIELD")`, then read `.attributes.details`. Catalogue: <https://www.datocms.com/docs/content-management-api/errors.md>.

## Localized File Fields

```ts
await client.items.create({
  item_type: { id: modelId, type: "item_type" },
  hero_image: {
    en: {
      upload_id: "upload-en",
      alt: "English hero",
      title: null,
      custom_data: {},
      focal_point: null,
    },
    it: {
      upload_id: "upload-it",
      alt: "Eroe italiano",
      title: null,
      custom_data: {},
      focal_point: null,
    },
  },
});
```

Under the `non_localized_focal_points` migration (see `references/uploads.md` § Metadata), `focal_point` becomes non-localized — one value shared across all locales — so don't expect per-locale focal points on migrated/new projects.

## Checking if a Field is Localized

```ts
import { isLocalized } from "@datocms/cma-client-node";

const fields = await client.fields.list(model.id);

for (const field of fields) {
  if (isLocalized(field)) {
    console.log(`${field.api_key} is localized`);
  }
}
```

## Normalized Field Value Utilities

These utilities let you work with field values uniformly, regardless of whether they are localized. They abstract away the `string` vs `{ en: string, it: string }` distinction.

All utilities are imported from the same package as `buildClient`.

### `toNormalizedFieldValueEntries()`

Convert any field value into a flat array of `{ locale, value }` entries:

```ts
import { toNormalizedFieldValueEntries } from "@datocms/cma-client-node";

// For a non-localized field:
const entries = toNormalizedFieldValueEntries("Hello", field);
// → [{ locale: undefined, value: "Hello" }]

// For a localized field:
const entries = toNormalizedFieldValueEntries(
  { en: "Hello", it: "Ciao" },
  field,
);
// → [{ locale: "en", value: "Hello" }, { locale: "it", value: "Ciao" }]
```

### `fromNormalizedFieldValueEntries()`

Convert entries back to the original format:

```ts
import { fromNormalizedFieldValueEntries } from "@datocms/cma-client-node";

// For a non-localized field:
const value = fromNormalizedFieldValueEntries(
  [{ locale: undefined, value: "Hello" }],
  field,
);
// → "Hello"

// For a localized field:
const value = fromNormalizedFieldValueEntries(
  [{ locale: "en", value: "Hello" }, { locale: "it", value: "Ciao" }],
  field,
);
// → { en: "Hello", it: "Ciao" }
```

### `mapNormalizedFieldValues()`

Transform all locale values of a field:

```ts
import { mapNormalizedFieldValues } from "@datocms/cma-client-node";

// Uppercase all values, regardless of localization
const uppercased = mapNormalizedFieldValues(
  record.title,
  titleField,
  (locale, value) => value.toUpperCase(),
);
// Non-localized: "HELLO"
// Localized: { en: "HELLO", it: "CIAO" }
```

### Async Variant

```ts
import { mapNormalizedFieldValuesAsync } from "@datocms/cma-client-node";

const translated = await mapNormalizedFieldValuesAsync(
  record.title,
  titleField,
  async (locale, value) => {
    if (locale === "it") return await translateToItalian(value);
    return value;
  },
);
```

### `filterNormalizedFieldValues()`

Filter out locale values that don't match a predicate:

```ts
import { filterNormalizedFieldValues } from "@datocms/cma-client-node";

// Remove empty strings
const filtered = filterNormalizedFieldValues(
  record.title,
  titleField,
  (locale, value) => value.length > 0,
);
```

### `someNormalizedFieldValues()`

Check if at least one locale value matches:

```ts
import { someNormalizedFieldValues } from "@datocms/cma-client-node";

const hasContent = someNormalizedFieldValues(
  record.body,
  bodyField,
  (locale, value) => value.length > 0,
);
```

### `everyNormalizedFieldValue()`

Check if all locale values match:

```ts
import { everyNormalizedFieldValue } from "@datocms/cma-client-node";

const allFilled = everyNormalizedFieldValue(
  record.title,
  titleField,
  (locale, value) => value.length > 0,
);
```

### `visitNormalizedFieldValues()`

Execute a side-effect for each locale value (no return value):

```ts
import { visitNormalizedFieldValues } from "@datocms/cma-client-node";

visitNormalizedFieldValues(
  record.title,
  titleField,
  (locale, value) => {
    console.log(`${locale ?? "default"}: ${value}`);
  },
);
```

### Complete List of Async Variants

Every function above has an async counterpart:

- `mapNormalizedFieldValuesAsync()`
- `filterNormalizedFieldValuesAsync()`
- `someNormalizedFieldValuesAsync()`
- `everyNormalizedFieldValueAsync()`
- `visitNormalizedFieldValuesAsync()`

## Complete Example: Migrate Content to a New Locale

```ts
import {
  buildClient,
  toNormalizedFieldValueEntries,
  fromNormalizedFieldValueEntries,
} from "@datocms/cma-client-node";

const client = buildClient({
  apiToken: process.env.DATOCMS_API_TOKEN!,
});

async function addFrenchLocale() {
  const model = (await client.itemTypes.list()).find(
    (m) => m.api_key === "blog_post",
  );
  if (!model) throw new Error("Model not found");

  const fields = await client.fields.list(model.id);
  const localizedFields = fields.filter((f) => f.localized);

  let count = 0;

  for await (const record of client.items.listPagedIterator<Schema.BlogPost>({
    filter: { type: "blog_post" },
  })) {
    const updates: Record<string, unknown> = {};

    for (const field of localizedFields) {
      const fieldValue = record[field.api_key];
      if (!fieldValue) continue;

      const entries = toNormalizedFieldValueEntries(fieldValue, field);
      const enEntry = entries.find((e) => e.locale === "en");

      if (enEntry && !entries.find((e) => e.locale === "fr")) {
        // Copy English value as placeholder for French
        entries.push({ locale: "fr", value: enEntry.value });
        updates[field.api_key] = fromNormalizedFieldValueEntries(
          entries,
          field,
        );
      }
    }

    if (Object.keys(updates).length > 0) {
      await client.items.update(record.id, updates);
      count++;
      console.log(`Updated record ${record.id} (${count})`);
    }
  }

  console.log(`Done. Updated ${count} records.`);
}

addFrenchLocale().catch(console.error);
```
