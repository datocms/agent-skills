# Editing records

Mutate record fields — block-bearing fields (Modular Content `rich_text`, Single Block `single_block`, Structured Text `structured_text` w/ `block` / `inlineBlock` nodes) + localized fields, plus add locale + backfill per-locale values.

> Endpoint shapes for `items.*` (find / list / update / create / publish / …): `npx datocms cma:docs items <action>` (add `--expand-types '*'` for full TS definitions). This file owns CMA adaptation: peek-then-mutate ordering, typed guards, block request payloads, locales, and version checks. DAST algorithms live in [Structured Text editing](../../datocms-structured-text/references/editing.md).

Peek + mutate in ONE script. No top-level `return` — wrap in `if (currentItem.body) { ... }`. Always pass `Schema.X` as generic to typed helpers; never hand-roll JSON:API.

> **`any` / `unknown` forbidden** — rejected pre-execution. Typed surface below (`Schema.X` generics, `FieldValueInRequest`, type-guard imports) makes them unnecessary. Untyped callback param → guard (`isSpan(c)`, `isBlockWithItemOfType(...)`), not `any`.

## Contents

- Workflow
- Imports
- Typing values you build up in code
- `Schema.X` is mandatory on every typed call
- Prerequisites the workflow assumes
- Modular content (`rich_text`)
- Single block (`single_block`)
- Structured text (`structured_text`)
- Localized fields and adding a locale
- Optimistic locking via `meta.current_version`

## Workflow

1. Inspect schema model, including nested blocks for block IDs.
2. `client.items.find<Schema.M>(id, { nested: true })` — `<Schema.M>` generic is **mandatory**, not optional (see "`Schema.X` is mandatory on every typed call" below). Blocks have `.id`, `.__itemTypeId`, fields under `.attributes` (NOT `block.title`). Every field on `.attributes` typed as nullable (`string | null`, etc.) regardless of validator — generated types reflect what CMA can transport, not whether `required` set. Guard against `null` before passing values to APIs expecting non-nullable type (e.g. `new URL(...)`, string concat that would coerce `null` to `"null"`).
3. Build w/ `buildBlockRecord<Schema.B>({...})` / `duplicateBlockRecord(...)`.
4. `client.items.update<Schema.M>(id, { ... })`. Skip unchanged fields.

## Imports

> Two runtime classes (terms used throughout this file):
>
> - **Ambient-globals** (`cma:script` stdin-mode, MCP `upsert_and_execute_{safe,unsafe}_script`): `client`, `Schema.*`, all 3 modules' named exports already on `globalThis` — skip imports below.
> - **Explicit-import** (`cma:script` file-mode, migrations, repo scripts): import as shown.

```ts
import {
  type ApiTypes, type BlockInNestedResponse, type FieldValueInRequest,
  buildBlockRecord, duplicateBlockRecord,
  isBlockOfType, SchemaRepository,
} from "@datocms/cma-client-node";

import {
  mapNodes, findFirstNode,
  isBlockWithItemOfType, isInlineBlockWithItemOfType,
} from "datocms-structured-text-utils";
```

Every generated `Schema.X` is **both type and runtime value**. Value side exposes two typed constants:

- `Schema.X.ID` — model/block id as literal-typed string. Use anywhere you'd hard-code an id (`isBlockOfType`, `isBlockWithItemOfType`, `isInlineBlockWithItemOfType`, `__itemTypeId === …`, `findFirstNode(…, isBlockWithItemOfType(…))`).
- `Schema.X.REF` — `{ type: "item_type", id } as const`. Use as `item_type:` value in `buildBlockRecord<Schema.X>({ item_type: Schema.X.REF, … })`.

Use these instead of local `const FOO_ID = "…" as const;` literals — guards narrow w/o manual `as const`, refactors / id changes flow from single source.

## Typing values you build up in code

When collecting new field value to send back to `client.items.update` — typically rebuilding array of blocks — type local var w/ `FieldValueInRequest<T, K>`. `T` is **any item-shaped value CMA returned** (top-level record OR nested block); `K` is field key. Same expression for both:

```ts
const page = await client.items.find<Schema.LandingPage>(id, { nested: true });
const sections: NonNullable<FieldValueInRequest<typeof page, "sections">> = [];

for (const section of page.sections) {
  if (isBlockOfType(Schema.HeroBlock.ID, section)) {
    const ctas: NonNullable<FieldValueInRequest<typeof section, "ctas">> = []; // same expression, nested block
  }
}
```

When no value in scope yet — typing helper or function param that _builds_ payload from scratch — pass model marker as first arg instead:

```ts
type Sections = NonNullable<FieldValueInRequest<Schema.LandingPage, "sections">>;

function buildLaunchSections(headline: string): Sections {
  return [buildBlockRecord<Schema.HeroBlock>({ item_type: Schema.HeroBlock.REF, headline })];
}
```

Prefer this over `ApiTypes.ItemUpdateSchema<Schema.X>["foo"]` indexing or verbose `Parameters<typeof client.items.update<Schema.X>>[1]["foo"]` form — no need to restate model name in value-based form, and on nested block's field same expression works.

## `Schema.X` is mandatory on every typed call

W/o generic, `client.items.find(id)` returns bare CMA shape: every field `unknown`, every block `unknown`, no typed guard narrows, every spread over localized field becomes hand-written `Record<string, string>` cast. Editing w/o `Schema.X` works at runtime but not the pattern this skill teaches — typed payloads, guards, localized spreads below all assume it.

```ts
// BAD — fields untyped, guards inert, spread requires manual cast
const currentItem = await client.items.find(id);
currentItem.title; // unknown
currentItem.question; // unknown — { ...currentItem.question, es: "..." } is a type error

// GOOD — fields typed end to end
const currentItem = await client.items.find<Schema.FaqEntry>(id);
currentItem.title; // string | null
currentItem.question; // Record<string, string | null>
```

**Ambient-globals**: `Schema.*` ambient — no import, no `schema:generate`, no `tsconfig` change. **Explicit-import**: `Cannot find name 'Schema'` → run `npx datocms schema:generate ./datocms-schema.ts` next to script + `import * as Schema from "./datocms-schema"`.

Same for `client.items.update<Schema.X>`, `client.items.create<Schema.X>`, `buildBlockRecord<Schema.B>`, `duplicateBlockRecord<Schema.B>`. `client.items.list` and `client.items.listPagedIterator` accept `<Schema.X>` when `filter.type` is set, or `<Schema.AnyModel>` when unset — always generic.

## Prerequisites the workflow assumes

### Response modes — default vs `nested: true`

Every read endpoint returning records accepts `nested: true` (`items.find`, `items.list`, `items.listPagedIterator`, `items.references`, `uploads.references`).

| Default mode | Nested mode (`nested: true`) |
| - | - |
| Block fields return ID strings | Block fields return full objects with `.attributes` |
| Max page size 500 | Max page size 30 (iterators auto-adjust → \~16× more page fetches) |
| Counting, listing, "do these exist?" | Any read you intend to mutate or display |

Forgetting `nested: true` is #1 cause of broken update payloads — mapping over array of strings produces garbage. Block fields are only field type that change shape between two modes; asset fields + record-link fields always return IDs.

### ID / object duality

Inside any block-bearing value — request OR response — block can appear in two forms:

- **ID string** (`"dhVR2HqgRVCTGFi_0bWqLqA"`) — lightweight reference, means "this block, unchanged".
- **Full object** (`{ id, type: "item", attributes, relationships: { item_type } }`) — what `buildBlockRecord<Schema.B>({...})` produces. No `id` creates a block with a server-assigned ID. An `id` can identify an existing block to update, or an unused custom ID for a new block; new blocks also require `item_type`.

Mutation rules in parent record's `update` call:

| Operation | Payload form |
| - | - |
| **Create** a new block (default) | `buildBlockRecord<Schema.B>({ item_type: Schema.B.REF, ...attrs })` — server assigns the ID |
| **Create** with a custom ID | `buildBlockRecord<Schema.B>({ id: customBlockId, item_type: Schema.B.REF, ...attrs })` — valid unused ID, with the block type supplied |
| **Update** an existing block | `buildBlockRecord<Schema.B>({ id, ...changedAttrs })` — only the diff; `item_type` is implicit |
| **Keep** unchanged | Its ID string |
| **Delete** | Omit it — remove from the array; set `null` for `single_block` |
| **Reorder** (modular content) | Place IDs / objects in desired order |

Custom IDs let you choose a new block's identity. Supply a DatoCMS public ID in URL-safe base64 UUIDv4 format that is unused in the environment.

When creating a record, an ID on a nested block object creates that block. When updating a record, you can reuse IDs of blocks already in the field and locale you are updating. You cannot reuse a block from a different record, field, or locale. An unused ID creates a new block and requires `item_type`. A bare ID string only keeps an existing block unchanged; it cannot create one. These rules apply only to nested blocks.

### Structured Text document shape

Load [document model](../../datocms-structured-text/references/document-model.md) for the DAST envelope, nodes, marks, and child rules. New Markdown/HTML content → [conversion](../../datocms-structured-text/references/conversion.md); existing document changes → [editing](../../datocms-structured-text/references/editing.md). Keep the CMA block ID/object rules above when adapting the resulting document to a record request.

## Modular content (`rich_text`)

Each entry is block-id string (keep) OR `buildBlockRecord` result. When mixing both, **declare array w/ request type** so TS unifies union.

Two call styles, same narrowing: curried `isBlockOfType(ID)` returns predicate (use w/ `Array#filter` / `Array#find`); direct `isBlockOfType(ID, b)` checks single block inline (use inside `if`).

```ts
const page = await client.items.find<Schema.LandingPage>(id, { nested: true });
const repo = new SchemaRepository(client);

const sections: NonNullable<FieldValueInRequest<typeof page, "sections">> = [];

sections.push(buildBlockRecord<Schema.HeroBlock>({ // ADD
  item_type: Schema.HeroBlock.REF,
  headline: "New",
}));

for (const b of page.sections) {
  if (b.__itemTypeId === Schema.OldHero.ID) continue; // REMOVE
  if (isBlockOfType(Schema.Cta.ID, b)) { // EDIT — fields on .attributes
    sections.push(buildBlockRecord<Schema.Cta>({
      id: b.id, button_url: b.attributes.button_url + "?utm=x",
    }));
    continue;
  }
  if (isBlockOfType(Schema.HeroBlock.ID, b)) { // EDIT a nested rich_text on the block
    const ctas: NonNullable<FieldValueInRequest<typeof b, "ctas">> = [];
    for (const cta of b.attributes.ctas) {
      ctas.push(
        isBlockOfType(Schema.Button.ID, cta) && cta.attributes.label === "Get started"
          ? buildBlockRecord<Schema.Button>({ id: cta.id, url: "/start-free-trial" })
          : cta.id, // keep others unchanged → id string
      );
    }
    sections.push(buildBlockRecord<Schema.HeroBlock>({ id: b.id, ctas }));
    continue;
  }
  if (isBlockOfType(Schema.Testimonial.ID, b)) { // DUPLICATE
    sections.push(b.id);
    sections.push(await duplicateBlockRecord<Schema.Testimonial>(b, repo));
    continue;
  }
  sections.push(b.id); // KEEP → id string
}

await client.items.update<Schema.LandingPage>(page.id, { sections });
```

## Single block (`single_block`)

```ts
await client.items.update<Schema.Product>(id, {
  hero: buildBlockRecord<Schema.Hero>({ id: currentItem.hero!.id, headline: "X" }), // edit
});
await client.items.update<Schema.Product>(id, { hero: null }); // remove
await client.items.update<Schema.Product>(id, { // duplicate
  hero: await duplicateBlockRecord<Schema.Hero>(currentItem.hero!, repo),
});
```

## Structured text (`structured_text`)

Load [Structured Text editing](../../datocms-structured-text/references/editing.md) for Dastdown round-trips, traversal, preservation, and validation. For create/import from Markdown or HTML, load [conversion](../../datocms-structured-text/references/conversion.md) before constructing the CMA payload. If either reference is missing, install `datocms-structured-text` from `datocms/agent-skills` or update the full bundle before continuing the DAST portion.

**CMA adapter order:** read with `client.items.find<Schema.M>(id, { nested: true })`; guard nullable content; apply only needed passes; finish with one `client.items.update<Schema.M>`:

1. Dastdown text changes first, using the original response as `parse`'s block lookup.
2. Map the result once for requested AST changes and typed block edits. Build changed items with `buildBlockRecord<Schema.B>`; duplicate donors from the original response, not an already rewritten item.
3. Append new root entries after the walk. Never run a Dastdown rehydration after block creation or mutation: the original lookup can lose those changes or reject new IDs.

`isBlockWithItemOfType` / `isInlineBlockWithItemOfType` narrow `node.item` to `BlockInNestedResponse<Schema.X>` automatically — no manual cast, no runtime id check. Work inside `mapNodes`/`findFirstNode` callbacks as long as `currentItem.content` carries schema generic (i.e. you called `client.items.find<Schema.M>`).

Two call styles, same narrowing: curried `isBlockWithItemOfType(ID)` returns predicate (use w/ `findFirstNode` / `findAllNodes` / `Array#filter`); direct `isBlockWithItemOfType(ID, node)` checks node inline (use inside `if`).

Rule: write typed-guard branch ONLY for block/inline-block IDs you actually need to mutate. Everything else — including untouched blocks/inline-blocks — falls through to bare `return node`. Update accepts original nested-response shape unchanged; rewrite to id string (`{ ...node, item: node.item.id }`) is payload-size optimization, never correctness requirement.

Do NOT add generic keep-as-id catch-all (`"item" in node`, `node.type === "block" | "inlineBlock"`): once typed guards exhaust every block (or inline-block) variant schema allows for that field, TS narrows rest of union and catch-all becomes type error (`never`) or dead code. Skip it — `return node` does right thing.

### Typed block changes and duplication

The document algorithm comes from [editing](../../datocms-structured-text/references/editing.md); this example shows the CMA request types and persistence boundary.

```ts
const currentItem = await client.items.find<Schema.Article>(id, { nested: true });
const repo = new SchemaRepository(client);

if (currentItem.content) {
  let content: NonNullable<FieldValueInRequest<typeof currentItem, "content">> =
    currentItem.content;
  content = mapNodes(content, (node) => {
    if (isInlineBlockWithItemOfType(Schema.Mention.ID, node)) { // EDIT inline
      return { ...node, item: buildBlockRecord<Schema.Mention>({
        id: node.item.id, url: node.item.attributes.url + "?utm=x",
      }) };
    }
    if (isBlockWithItemOfType(Schema.Cta.ID, node)) { // EDIT block
      return { ...node, item: buildBlockRecord<Schema.Cta>({
        id: node.item.id, button_url: node.item.attributes.button_url + "?utm=x",
      }) };
    }
    return node; // untouched nodes pass through unchanged
  });

  // findFirstNode composes directly with the typed guard.
  const found = findFirstNode(currentItem.content, isBlockWithItemOfType(Schema.Warn.ID));
  if (found) {
    content.document.children.push({
      type: "block",
      item: await duplicateBlockRecord<Schema.Warn>(found.node.item, repo),
    });
  }

  await client.items.update<Schema.Article>(currentItem.id, { content });
}
```

## Localized fields and adding a locale

Site update + per-item backfill in ONE script. Spread existing per-locale objects. Structured Text backfills also need [editing](../../datocms-structured-text/references/editing.md) for existing DAST or [conversion](../../datocms-structured-text/references/conversion.md) for Markdown/HTML; validate each locale document independently.

```ts
await client.site.update({ locales: ["en", "it", "es"] });

const items = await client.items.list<Schema.FaqEntry>({ filter: { type: "faq_entry" }, version: "current" });
for (const it of items) {
  await client.items.update<Schema.FaqEntry>(it.id, {
    question: { ...it.question, es: "..." },
    answer:   { ...it.answer,   es: "..." },
  });
}
```

If TS rejects spread (typically because per-locale value nullable + `Update` shape requires non-null), cast precisely w/ request schema rather than reaching for `Record<string, string>`:

```ts
question: { ...(currentItem.question as NonNullable<FieldValueInRequest<typeof currentItem, "question">>), es: "..." },
```

For block-bearing localized fields same per-locale shape applies — each locale key holds whatever value field expects (array of blocks/IDs for `rich_text`, full object or `null` for `single_block`, DAST tree for `structured_text`).

**Locale Sync Rule:** adding a locale changes the record's locale set, so you must send **every** localized field in that one update — each gaining the new locale (value or `null`). It's the one case you can't send just the field you changed: adding `es` to `question` alone is rejected; include `es` on `answer` too (exactly what the loop above does). See `references/localization.md` § Localized fields must share one locale set per payload.

Casting `node.item as BlockInNestedResponse<Schema.X>` after runtime id check allowed — but only manual-discriminator fallback needs it; `isBlockWithItemOfType` / `isInlineBlockWithItemOfType` narrow w/o cast.

## Optimistic locking via `meta.current_version`

`update` is **last-write-wins by default**. When two clients update same record concurrently, second silently overwrites first — no error. To get 409 conflict instead, echo `meta.current_version` you read back into update:

```ts
const before = await client.items.find<Schema.Article>(id);
await client.items.update<Schema.Article>(id, {
  title: "new",
  meta: { current_version: before.meta.current_version },
});
```

Use this pattern any time update path concurrent (multiple workers, retry loops, UI editor sync). Cost: one read per write; benefit: no silent data loss. Catch `ApiError` + check `e.findError("STALE_ITEM_VERSION")` to retry w/ fresh read.
