# Block Records and Modular Content

Mental model, the ID/object duality, response modes, and the 5 rules for mutating block-bearing fields.

Worked examples live in the DatoCMS API reference — fetch on demand with `npx datocms cma:docs …` (see [`cma:docs` Examples Index](#cmadocs-examples-index)). This file owns the grammar; the docs own the long scripts.

## Quick Navigation

| If you need to… | Read |
|---|---|
| Understand why blocks behave differently from regular records | Mental Model |
| Decide whether to pass `nested: true` in a read | Response modes: Regular vs Nested |
| Build a payload that mixes add / update / keep / delete / reorder | The 5 Mutation Rules (Cheatsheet) |
| Create or update a modular content (`rich_text`) field | Modular Content — MWE |
| Create, replace, or clear a `single_block` field | Single Block — MWE |
| Embed blocks inside a structured text document | Structured Text — MWE |
| Know which helper function does what (`buildBlockRecord`, `duplicateBlockRecord`, `SchemaRepository`, …) | Helpers Toolkit |
| Find a canonical worked example for a specific scenario | `cma:docs` Examples Index |
| Update a block several levels deep in a tree | Recursive Nesting |
| Work with a block field that is localized | Localized Block Fields |
| Diagnose why an update is silently wrong | Common Pitfalls |

---

## Mental Model

Blocks are **records within records**. They live only inside block-bearing fields of a parent record. Unlike top-level records, blocks:

- Are not published or unpublished independently
- Cannot be fetched directly (`client.items.find(block.id)` does not work)
- Are created, updated, and deleted **only** through the parent record's endpoint
- Receive IDs from the server when created

Three field types carry blocks:

| Field type | Shape |
|---|---|
| `rich_text` (modular content) | Array of blocks (`[]` when empty) |
| `single_block` | One block, or `null` |
| `structured_text` | DAST tree with `block` / `inlineBlock` nodes |

### The ID / Object duality

In any block-bearing value — response *or* request — a block can appear in two forms:

```ts
// Lightweight reference
"dhVR2HqgRVCTGFi_0bWqLqA"

// Full object (JSON:API shape — what buildBlockRecord() produces)
{
  id: "dhVR2HqgRVCTGFi_0bWqLqA",
  type: "item",
  attributes: { title: "Hero Section", content: "..." },
  relationships: {
    item_type: { data: { id: "BxZ9Y2aKQVeTnM4hP8wLpD", type: "item_type" } }
  }
}
```

Knowing **when to use which form** is the single biggest source of bugs when writing block payloads. The rules are in [The 5 Mutation Rules](#the-5-mutation-rules-cheatsheet).

**Block fields are the only field type that change representation between the Regular and Nested modes.** Asset fields and record-link fields always return IDs — expand those with separate API calls.

---

## Response modes: Regular vs Nested

Every endpoint that returns records accepts `nested: true` to expand block fields. Applies to:

- `client.items.find(id, { nested: true })`
- `client.items.list({ …, nested: true })` and `listPagedIterator`
- `client.items.references(id, { nested: true })`
- `client.uploads.references(id, { nested: true })`

| Regular mode (default) | Nested mode (`nested: true`) |
|---|---|
| Block fields return ID strings | Block fields return full objects |
| Fast, small payloads | Slower, larger payloads |
| Max page size: **500** | Max page size: **30** |
| Listings, counting, "do these blocks exist?" | Displaying, editing, any transformation |

**Rule of thumb:** pass `nested: true` whenever you intend to read or modify attribute values inside a block. Forgetting it is the #1 cause of broken update payloads, because mapping over an array of strings produces garbage.

**Pagination cost:** with `nested: true` the iterator automatically uses the smaller page cap. For large collections this multiplies page fetches by ~16×. See `references/filtering-and-pagination.md`.

---

## The 5 Mutation Rules (Cheatsheet)

Block mutations happen on the **parent record's** `create` or `update` endpoint. The payload describes the desired final state using a mix of IDs and full objects.

| Operation | How to express it |
|---|---|
| **Create** a new block | Full object with `type: "item"` and `relationships.item_type` — no `id` |
| **Update** an existing block | Full object with `id` and only the changed `attributes`. Omit `relationships.item_type` |
| **Keep** a block unchanged | Its ID string |
| **Delete** a block | Omit it. Remove its ID from an array; set `null` for `single_block` |
| **Reorder** blocks (modular content) | Place IDs / objects in the desired order |

All five can appear in the same payload. Use `buildBlockRecord()` to avoid writing JSON:API shapes by hand — it accepts both "create" (no `id`) and "update" (with `id`) forms.

### A single payload showing all 5 rules

Assume `content` is a modular content field currently holding blocks `A, B, C, D`:

```ts
import * as Schema from "./cma-types";

await client.items.update<Schema.Page>("record-id", {
  content: [
    // 1. CREATE: new hero at the top
    buildBlockRecord<Schema.HeroBlock>({
      item_type: { id: heroBlockTypeId, type: "item_type" },
      headline: "Brand new hero",
    }),
    // 2. UPDATE: change only B's title (omit other attrs to keep them)
    buildBlockRecord<Schema.TextBlock>({
      id: "B_id",
      title: "Renamed B",
    }),
    // 3. REORDER + KEEP: D before C, both unchanged
    "D_id",
    "C_id",
    // 4. DELETE A: absent from the array
  ],
});
```

**Update ≠ partial patching of the record.** You still send the complete field value. Partial updates happen *within* a block object (set only the attributes you changed), not across the array.

---

## Modular Content (`rich_text`) — MWE

A `rich_text` field stores an array of blocks. The snippets below use generated schema types (`import * as Schema from "./cma-types"`) — produce the file once with `npx datocms schema:generate ./cma-types.ts` rather than writing `ItemTypeDefinition` types by hand. See [Typed usage](#typed-usage).

```ts
import { buildBlockRecord, buildClient } from "@datocms/cma-client-node";
import * as Schema from "./cma-types";

const client = buildClient({ apiToken: process.env.DATOCMS_API_TOKEN });

await client.items.create<Schema.Page>({
  item_type: { type: "item_type", id: "UZyfjdBES8y2W2ruMEHSoA" },
  title: "Launch",
  sections: [
    buildBlockRecord<Schema.HeroBlock>({
      item_type: { type: "item_type", id: "T4m4tPymSACFzsqbZS65WA" },
      headline: "Welcome",
    }),
    buildBlockRecord<Schema.TextBlock>({
      item_type: { type: "item_type", id: "JItInCQJSIeCLX3oGPvN1w" },
      body: "Opening paragraph.",
    }),
  ],
});
```

Full worked example — mixed add/update/keep/delete/reorder in a single API call:

```bash
npx datocms cma:docs items update --expand "Example: Managing blocks in existing Modular Content fields"
```

---

## Single Block (`single_block`) — MWE

A `single_block` field stores one block or `null`.

```ts
import * as Schema from "./cma-types";

// Create with a block
await client.items.create<Schema.ProductPage>({
  item_type: { type: "item_type", id: productPageId },
  hero: buildBlockRecord<Schema.HeroBlock>({
    item_type: { type: "item_type", id: heroBlockId },
    headline: "Audio Excellence",
  }),
});

// Replace with a different block type
await client.items.update<Schema.ProductPage>(recordId, {
  hero: buildBlockRecord<Schema.VideoBlock>({
    item_type: { type: "item_type", id: videoBlockId },
    video_url: "https://…",
  }),
});

// Remove the block
await client.items.update<Schema.ProductPage>(recordId, { hero: null });
```

Worked example — update in place, duplicate, replace, remove in sequence:

```bash
npx datocms cma:docs items update --expand "Example: Managing Single Block fields"
```

---

## Structured Text (`structured_text`) — MWE

A `structured_text` field carries a DAST document. Embedded blocks appear at root level as `block` nodes and inline as `inlineBlock` nodes. The 5 rules apply unchanged — just in the `item` position of those nodes.

```ts
import * as Schema from "./cma-types";

await client.items.create<Schema.Article>({
  item_type: { type: "item_type", id: articleId },
  content: {
    schema: "dast",
    document: {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [{ type: "span", value: "Lead paragraph." }],
        },
        {
          type: "block",
          item: buildBlockRecord<Schema.CtaBlock>({
            item_type: { type: "item_type", id: ctaBlockId },
            title: "Subscribe",
            button_url: "/subscribe",
          }),
        },
      ],
    },
  },
});
```

DAST node types and structural rules (lists, headings, marks, `itemLink` vs `block`) live in `references/structured-text-and-block-tools.md`. Worked examples:

```bash
# Full structured-text document with multiple embeds
npx datocms cma:docs items create --expand "Example: Structured text fields"

# Transforming a DAST tree (heading levels, link attrs, text replace)
npx datocms cma:docs items update --expand "Example: Managing Structured Text documents"

# Mixed block mutations inside structured text
npx datocms cma:docs items update --expand "Example: Managing blocks in Structured Text fields"
```

---

## Helpers Toolkit

### Imports

CMA-side helpers are re-exported from every CMA client package — pick the one that matches your runtime; the named exports are identical across the three:

```ts
// Universal (native fetch / edge runtimes)
import {
  buildBlockRecord,
  duplicateBlockRecord,
  generateId,
  SchemaRepository,
  inspectItem,
  visitBlocksInNonLocalizedFieldValue,
  findAllBlocksInNonLocalizedFieldValue,
  filterBlocksInNonLocalizedFieldValue,
  mapBlocksInNonLocalizedFieldValue,
  reduceBlocksInNonLocalizedFieldValue,
} from "@datocms/cma-client";
// or "@datocms/cma-client-node"    — adds createFromLocalFile / createFromUrl
// or "@datocms/cma-client-browser" — adds createFromFileOrBlob
```

DAST tree helpers live in a separate package:

```ts
import {
  mapNodes,
  filterNodes,
  findFirstNode,
  isBlock,
  isInlineBlock,
  isSpan,
  isHeading,
  isLink,
  isItemLink,
  isParagraph,
} from "datocms-structured-text-utils";
```

### Utilities

| Helper | Use for |
|---|---|
| `buildBlockRecord(payload)` | Build the full-object form. Include `id` to update in place; omit it to create. Accepts a `<T extends ItemTypeDefinition>` type parameter — see [Typed usage](#typed-usage). |
| `duplicateBlockRecord(block, schemaRepo)` | Deep-clone a block (and nested blocks), stripping all IDs, so the clone creates fresh blocks when saved. Async; needs a `SchemaRepository`. |
| `generateId()` | Generate a client-side ID. Needed only if you build JSON:API shapes manually instead of via `buildBlockRecord`. |
| `SchemaRepository(client)` | Caches model/field lookups. Required by `duplicateBlockRecord` and the block traversal utilities. |
| `inspectItem(item)` | Debug-print a record or block as a tree. Great for comparing before/after state. |
| `*BlocksInNonLocalizedFieldValue` | Recursive visit / find / filter / map / reduce over every block in a block-bearing value (any nesting depth, any field type). Details in `references/structured-text-and-block-tools.md`. |
| DAST tree helpers | `mapNodes`, `filterNodes`, `findFirstNode` plus type guards. Operate on the DAST tree shape itself, not the CMA payload wrapper. Details in `references/structured-text-and-block-tools.md`. |

### Typed usage

`buildBlockRecord<T>(…)`, `client.items.create<T>()`, `update<T>()`, and `find<T>()` all accept a type parameter that constrains `item_type.id` and `attributes` against the project schema so typos surface at compile time.

**Always source `T` from generated types.** Run `npx datocms schema:generate ./cma-types.ts` once (re-run after schema changes), then import as `Schema` and qualify every generic call:

```ts
import * as Schema from "./cma-types";

buildBlockRecord<Schema.HeroBlock>({
  item_type: { type: "item_type", id: "T4m4tPymSACFzsqbZS65WA" },
  headline: "Typed payload",
});

await client.items.create<Schema.Article>({
  item_type: { type: "item_type", id: "UZyfjdBES8y2W2ruMEHSoA" },
  title: "Hello",
  sections: [/* … */],
});
```

**Do not hand-write `ItemTypeDefinition<...>` types.** It is the shape the generator emits internally; writing it manually duplicates the schema, drifts silently when models change, and has no advantage over running `schema:generate`.

In `cma:script` stdin-mode, `Schema.*` is already an **ambient global** inside the CLI workspace — no generation step, no import needed.

See:
- `references/type-generation.md` — CMA-side workflow: install, env-var conventions per framework, `AnyBlock` / `AnyModel` unions, raw-API typing
- `datocms-cli` skill, `references/schema-generate.md` — CLI-side flags (`--environment`, `--item-types`, profile selection)

---

## `cma:docs` Examples Index

Long worked scripts live in the CMA reference — fetch them on demand. Each command prints the canonical example for the scenario and stays in sync with the official docs.

**Prerequisite:** the `datocms` npm package installed (normally bootstrapped per SKILL.md Step 1a). `cma:docs` itself needs *no* login and *no* linked project — it renders public API docs only. If `npx datocms …` fails because the CLI is not in `devDependencies`, either install it (`npm install --save-dev datocms`) or fetch the CLI on demand:

```bash
npx --yes datocms cma:docs items update --expand "Example: …"
```

**Concepts and read patterns** (`cma:docs items`):

| Scenario | Command |
|---|---|
| Block field types overview | `npx datocms cma:docs items --expand "Modular Content" --expand "Single Block" --expand "Structured Text"` |
| Working-with guides | `npx datocms cma:docs items --expand "Working with Modular Content Fields" --expand "Working with Single Block Fields" --expand "Working with Structured Text Fields"` |
| Deeply-nested block payloads | `npx datocms cma:docs items --expand "Example: Updating a nested block"` |
| Localized block-bearing fields | `npx datocms cma:docs items --expand "Example: Localized Modular Content field" --expand "Example: Localized Single Block field" --expand "Example: Localized Structured Text field"` |

**Creating records with blocks** (`cma:docs items create`):

| Scenario | Command |
|---|---|
| Modular content create | `npx datocms cma:docs items create --expand "Example: Modular content fields"` |
| Single block create | `npx datocms cma:docs items create --expand "Example: Single block fields"` |
| Structured text create | `npx datocms cma:docs items create --expand "Example: Structured text fields"` |
| Tree-like parent/child records | `npx datocms cma:docs items create --expand "Example: Tree-like structure"` |
| Localized fields on create | `npx datocms cma:docs items create --expand "Example: Managing localized fields"` |

**Updating block-bearing fields** (`cma:docs items update`):

| Scenario | Command |
|---|---|
| Modular content: mixed add/update/keep/delete/reorder | `npx datocms cma:docs items update --expand "Example: Managing blocks in existing Modular Content fields"` |
| Single block: update, replace, remove | `npx datocms cma:docs items update --expand "Example: Managing Single Block fields"` |
| DAST tree transforms (headings, links, text replace) | `npx datocms cma:docs items update --expand "Example: Managing Structured Text documents"` |
| Embedded blocks inside structured text | `npx datocms cma:docs items update --expand "Example: Managing blocks in Structured Text fields"` |
| Bulk delete blocks across a whole field | `npx datocms cma:docs items update --expand "Example: Delete blocks across all content"` |
| Bulk edit blocks across a whole field | `npx datocms cma:docs items update --expand "Example: Edit blocks across all content"` |
| Update a block in a single locale | `npx datocms cma:docs items update --expand "Example: Updating a block in one locale"` |
| Add a block to one locale only | `npx datocms cma:docs items update --expand "Example: Adding a new block to one locale"` |
| Add or remove a locale entirely | `npx datocms cma:docs items update --expand "Example: Adding a new locale" --expand "Example: Removing an existing locale"` |
| Copy content between locales | `npx datocms cma:docs items update --expand "Example: Copying content from one locale to another"` |

### If an `--expand` title is missing

`--expand` requires exact-match section titles, and the DatoCMS docs do rename sections occasionally. If a command reports "section not found", list available titles and pick the closest match:

```bash
npx datocms cma:docs items update | grep -oE '<details><summary>[^<]+</summary>'
```

The concepts in this file stay correct even when titles drift — only the commands need adjusting.

---

## Recursive Nesting

Block models can themselves contain `rich_text`, `single_block`, or `structured_text` fields. Nesting is allowed up to 5 levels deep. **The 5 mutation rules apply recursively at every level** — a block deep in the tree is described exactly like a top-level block, using its own ID or full object.

When you pass `nested: true` the whole tree expands in the response. On update, you send a payload to the top-level record and describe the full path down to the nested change:

```ts
import * as Schema from "./cma-types";

// Update a child block inside a parent wrapper block
await client.items.update<Schema.Page>(pageId, {
  sections: [
    {
      id: wrapperBlockId,
      type: "item",
      attributes: {
        nested_content: [
          {
            id: childBlockId,
            type: "item",
            attributes: { title: "Updated child" },
          },
          "sibling_block_id", // kept unchanged
        ],
      },
    },
  ],
});
```

Full worked example:

```bash
npx datocms cma:docs items --expand "Example: Updating a nested block"
```

---

## Localized Block Fields

When a block-bearing field is localized, the outer value is a locale object and the inner value is the block array or single block:

```ts
import * as Schema from "./cma-types";

await client.items.update<Schema.Page>(pageId, {
  sections: {
    en: [buildBlockRecord<Schema.HeroBlock>({ ... })],
    it: [buildBlockRecord<Schema.HeroBlock>({ ... })],
  },
});
```

Per-locale operations (update one locale without touching others, add a new locale, clone content across locales) follow the same 5 rules on each locale's inner value. Worked examples:

```bash
npx datocms cma:docs items update \
  --expand "Example: Updating a block in one locale" \
  --expand "Example: Adding a new block to one locale" \
  --expand "Example: Copying content from one locale to another" \
  --expand "Example: Adding a new locale"
```

For locale-object conventions and helper utilities, see `references/localization.md`.

---

## Common Pitfalls

### Forgetting `nested: true` before editing

Reading a record *without* `nested: true` returns block fields as arrays of ID strings. Mapping over them and passing the result back as an update produces invalid payloads — strings where objects are expected, or silently keeping blocks unchanged when you intended to modify them.

```ts
import * as Schema from "./cma-types";

// BROKEN: record.content is ["id1", "id2", ...], block.title is undefined
const record = await client.items.find<Schema.Page>(id);

// FIXED: record.content is [{ id, attributes: { title, ... } }, ...]
const record = await client.items.find<Schema.Page>(id, { nested: true });
```

### Page size drops to 30 with `nested: true`

Large iterations that also need full block data take ~16× more page fetches. If your pipeline is throughput-sensitive, fetch shallow first (find the IDs), then re-fetch only the records you must expand. See `references/filtering-and-pagination.md`.

### Mixing block nodes with record-link nodes in structured text

- `block` and `inlineBlock` **create / embed new block records** — `item` is a `buildBlockRecord(...)` payload (or an ID of an existing embedded block on update).
- `itemLink` and `inlineItem` **reference existing top-level records** — `item` is just a record ID string.

Swapping these produces cryptic API errors. Details in `references/structured-text-and-block-tools.md`.

### Forgetting `relationships.item_type` when creating a new block

For *new* blocks (no `id`), the payload must include `relationships.item_type` so the API knows which block model to instantiate. `buildBlockRecord({ item_type: { id, type: "item_type" }, … })` handles this — don't write the raw shape by hand.

### Passing no `id` to "update" and creating a duplicate instead

Sending an object *without* `id` for a block that already exists creates a new block and orphans the old one if you also leave out its ID elsewhere. To update in place, always include `id`. To clone a block as a template, use `duplicateBlockRecord()` — it strips every ID recursively so saving produces fresh blocks.

### Clearing a modular content field

Use `[]` (empty array). `null` is valid only for `single_block` fields.

### Mixing IDs and full objects in the same array

This is **supported and expected** — it is how "keep unchanged" coexists with "update these two" in a single payload. If a code review flags it as a type inconsistency, point the reviewer at the 5 rules above.
