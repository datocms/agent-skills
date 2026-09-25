# CMA Type Generation Setup

Use this setup only for local scripts or application code that need a generated types file. When the execution runtime already supplies project types, use those instead.

First inspect existing schema imports, `cma-types.ts` / `datocms-schema.ts` files, and generation commands in `package.json`. Reuse the existing module, output path, and environment configuration. Do not proactively suggest a new type-generation setup. Generate or refresh types only when the requested local code needs them and the current types are absent or outdated.

The generated types are useful for **both** CMA API styles:

- the **simplified API** via `ItemTypeDefinition` generics on methods such as `client.items.create/update/upsert/...`
- the **raw API** via `raw*()` methods and `RawApiTypes.Item<>` when you intentionally need raw JSON:API payloads or metadata

Default to the simplified API. Reach for raw methods only when the task explicitly needs them. See `client-types-and-behaviors.md` for the `RawApiTypes` overview and dual-API guidance.

## Contents

- Install
- Generate Script
- Generated Output
- Usage

## Install

```bash
npm install --save-dev datocms
```

`datocms` provides `schema:generate`. Interactive local runs authenticate through the OAuth-linked profile ([datocms-cli › Bootstrap flow](../../datocms-cli/SKILL.md#bootstrap-flow-cli-available-but-not-linked)) — no CMA token in `.env`, no `dotenv-cli`, no `--api-token` in the script.

## Generate Script

Add to `package.json` scripts (output directory must exist first — [schema-generate.md › Core command](../../datocms-cli/references/schema-generate.md#core-command)):

```json
"generate-cma-types": "npx datocms schema:generate src/lib/datocms/cma-types.ts"
```

Then run `npm run generate-cma-types`. Re-run after model/field changes.

Unattended/CI (no OAuth session): linked profile never reads env tokens and errors without `datocms login` — pass a CMA-enabled token (`can_access_cma: true`; read-only CDA tokens fail) from an env var: `npx datocms schema:generate src/lib/datocms/cma-types.ts --api-token="$DATOCMS_API_TOKEN"`. Resolution order: [cli-setup.md › API Token Resolution](../../datocms-cli/references/cli-setup.md#api-token-resolution).

**Output path** — where the code's `cma-types` import resolves:

| Framework | Import (framework reference) | Output path |
| - | - | - |
| Next.js | `@/lib/datocms/cma-types` | `src/lib/datocms/cma-types.ts`; no `src/` (`@/*` → `./*`) → `lib/datocms/cma-types.ts` |
| Astro | `@/lib/datocms/cma-types` | `src/lib/datocms/cma-types.ts` |
| SvelteKit | `$lib/datocms/cma-types` | `src/lib/datocms/cma-types.ts` — always, never root `lib/` |
| Nuxt | `~/lib/datocms/cma-types` | `<srcDir>/lib/datocms/cma-types.ts` — `~` = `srcDir`; Nuxt 4 default: `app/` when it exists, else root |

## Generated Output

The generated `cma-types.ts` file contains:

1. **`EnvironmentSettings`** — describes the project's locales (e.g., `{ locales: 'en' }` or `{ locales: 'en' | 'it' }`)

2. **One exported type per model/block** — each uses `ItemTypeDefinition<EnvironmentSettings, ModelId, FieldsMap>`:

```ts
import type { ItemTypeDefinition } from '@datocms/cma-client';

type EnvironmentSettings = {
  locales: 'en';
};

export type Page = ItemTypeDefinition<
  EnvironmentSettings,
  'JdG722SGTSG_jEB1Jx-0XA',
  {
    title: { type: 'string' };
    slug: { type: 'slug' };
    structured_text: {
      type: 'structured_text';
      blocks: ImageBlock | VideoBlock;
    };
  }
>;

export type ImageBlock = ItemTypeDefinition<
  EnvironmentSettings,
  'dZOhbVOTSpeaaA-wQMgPCA',
  { asset: { type: 'file' } }
>;
```

3. **Convenience union types** at the bottom:

```ts
export type AnyBlock = ImageGalleryBlock | ImageBlock | VideoBlock;
export type AnyModel = Page;
export type AnyBlockOrModel = AnyBlock | AnyModel;
```

- `AnyBlock` — union of all block models
- `AnyModel` — union of all regular models
- `AnyBlockOrModel` — union of both

4. **Paired value per model/block** — `export const X = { ID, REF } as const`, emitted right after its same-name type, so `Schema.X` is both type and value: `Schema.X.ID` = literal id, `Schema.X.REF` = `{ type: 'item_type', id }` (`item_type:` value). Consume via `import * as Schema from './cma-types'`; more uses in [editing-records.md › Imports](editing-records.md#imports).

```ts
export const Page = {
  ID: 'JdG722SGTSG_jEB1Jx-0XA',
  REF: { type: 'item_type', id: 'JdG722SGTSG_jEB1Jx-0XA' },
} as const;
```

## Usage

### Simplified API (default)

Use the generated model/block types directly on simplified item methods:

```ts
import type { Client } from '@datocms/cma-client';
import * as Schema from './cma-types';

export async function createPage(client: Client) {
  return client.items.create<Schema.Page>({
    item_type: Schema.Page.REF,
    title: 'Hello world',
    slug: 'hello-world',
  });
}
```

### Raw API (only when you need it)

Pass the generated types as generics to `raw*()` methods and `RawApiTypes.Item<>`:

```ts
import type { RawApiTypes } from '@datocms/cma-client';
import type { AnyModel } from './cma-types';

// Typed record access — TypeScript knows which fields exist
function getTitle(item: RawApiTypes.Item<AnyModel>) {
  return item.attributes.title;
}
```

See `client-types-and-behaviors.md` for the `RawApiTypes` namespace overview and the `ItemTypeDefinition` generic system.
