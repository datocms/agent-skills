# Editing records

Mutate record fields — block-bearing fields (Modular Content `rich_text`, Single Block `single_block`, Structured Text `structured_text` w/ `block` / `inlineBlock` nodes) + localized fields, plus add locale + backfill per-locale values.

This file owns CMA adaptation: peek-then-mutate ordering, typed guards, block request payloads, locales, version checks, persistence, and the structured-text Pass 1 → Pass 2 → root-append invariant. When `datocms-structured-text` is available, use its document model and editing or conversion reference for the underlying DAST operation; keep this workflow for the record read, mutation, and verification boundary.

> In CLI mode: `cma:docs items self` documents `client.items.find()` / `cma:call items find`; `cma:docs items update` documents `client.items.update()`. Use `--expand-types <Type>` for a specific declaration.

Peek + mutate in ONE script. No top-level `return` — wrap in `if (currentItem.body) { ... }`. Always pass `Schema.X` as generic to typed helpers; never hand-roll JSON:API.

> **Keep concrete types; don't erase them with `any`, `unknown`, casts, or JSON round-trips.** Use `Schema.X`, `FieldValueInRequest`, and guards (`isSpan(c)`, `isBlockWithItemOfType(...)`) to resolve mismatches. Record fields are top-level; `attributes` belongs to nested blocks.

## Contents

- Workflow
- Verify saved content
- Imports
- Chaining Structured Text helpers
- Typing values you build up in code
- `Schema.X` is mandatory on every typed call
- Prerequisites the workflow assumes
- Structured text (`structured_text`)
- Modular content (`rich_text`)
- Single block (`single_block`)
- Localized fields and adding a locale
- Optimistic locking via `meta.current_version`

## Workflow

1. Inspect schema model, including nested blocks for block IDs.
2. `client.items.find<Schema.M>(id, { nested: true })` — `<Schema.M>` generic is **mandatory**, not optional (see "`Schema.X` is mandatory on every typed call" below). Blocks have `.id`, `.__itemTypeId`, fields under `.attributes` (NOT `block.title`). Every field on `.attributes` typed as nullable (`string | null`, etc.) regardless of validator — generated types reflect what CMA can transport, not whether `required` set. Guard against `null` before passing values to APIs expecting non-nullable type (e.g. `new URL(...)`, string concat that would coerce `null` to `"null"`).
3. Build w/ `buildBlockRecord<Schema.B>({...})` / `duplicateBlockRecord(...)`.
4. `client.items.update<Schema.M>(id, { ... })`. Skip unchanged fields.

## Verify saved content

Resolve target nodes with typed guards before transforming them, then capture snapshots with `const` and inferred types. Avoid nullable callback accumulators and indexing `item` on a generic node union. Derive preservation checks from the original values, including `null` and empty values. Preserving an optional asset means keeping its original value, not requiring a populated asset.

On a draft-enabled model, “do not publish” permits editing the current version of an already-published record: preserve its published version rather than requiring `meta.status === "draft"`. An update changes `meta.current_version` and `meta.updated_at` without publishing. Exclude those bookkeeping values from publication-preservation checks; compare publication timestamps, schedules, and the published content when a published version exists.

Keep an independent snapshot of the original read. After updating, read back the same record/version with `nested: true`. Compare relevant field/node semantics in matching response shapes: optional arrays or metadata can normalize, while `===`/`!==` only compares object identity across API reads. Do not use `serialize()` or whole-tree JSON equality as the post-write oracle. Check requested field values against the intended changes and unchanged content against that snapshot. Check block identity, type, attributes, node order, marks, links, other locales, and publication state where relevant.

Do not serialize an update payload to compare it with a saved response. Structured Text request types also allow new blocks without IDs, so they are not valid `serialize()` inputs. Block ID references and partial `buildBlockRecord` payloads expand into full objects on read, including unchanged attributes and response metadata; object-key order is also irrelevant. Compare the relevant values in matching response shapes. Do not strip block attributes or identity just to make equality pass. If post-write verification throws, inspect the saved state before deciding whether any further write is needed; never replay the mutation merely because its verification failed.

For typed inspection, bind and guard the locale first, then use `collectNodes` with a type guard and `.map()` to infer snapshot types. Root children exclude nested spans; do not use their union as a visitor type. Untyped `[]` seeds in `reduceNodes` infer `never[]`. For example, with a checked `english` locale:

```ts
const spans = collectNodes(english, isSpan).map(({ node }) => ({
  text: node.value,
  marks: [...(node.marks ?? [])],
}));
const images = collectNodes(english, isBlockWithItemOfType(Schema.ImageBlock.ID))
  .map(({ node }) => ({
    id: node.item.id,
    image: structuredClone(node.item.attributes.image),
  }));
```

Capture these values before transforming content. Apply the same projections to a checked saved locale, comparing the values relevant to the requested edit; an authorized added span or changed caption is not a preservation failure.

In Node runtimes, use the standard value comparator for unchanged response fields. Keep this snapshot and comparison in the same execution as the authorized update and fresh read; do not hand-write a generic deep-equality function:

```ts
import { isDeepStrictEqual } from "node:util";

const originalItalian = structuredClone(before.body.it);
// Apply the authorized update, then fetch saved with nested: true.
if (!isDeepStrictEqual(saved.body.it, originalItalian)) {
  throw new Error("Italian content changed");
}
```

This compares values independently of object identity and key order. Use it for unchanged field values in the same response shape, not partial update payloads against hydrated responses. Normalize only documented representational differences when needed; never drop meaningful attributes to pass verification.

The utility library's `validate()` accepts plain DAST with block IDs. Its `Document` signature does not accept hydrated CMA blocks or partial/new block request payloads. Use it before hydration for raw document work. For CMA edits, keep generated request types and the integration's API/preflight and saved-state checks; do not cast a nested payload to `Document` or serialize it to satisfy this validator.

## Imports

> Examples assume an authenticated `client` and project-specific `Schema`. Use helpers already supplied by the selected runtime; otherwise import them from the packages shown below.

```ts
import {
  type ApiTypes, type BlockInNestedResponse, type FieldValueInRequest,
  buildBlockRecord, duplicateBlockRecord,
  isBlockOfType, SchemaRepository,
} from "@datocms/cma-client-node";

// Structured Text helpers come from their own package.

import {
  mapNodes, findFirstNode, collectNodes, reduceNodes,
  isBlockWithItemOfType, isInlineBlockWithItemOfType,
  isHeading, isParagraph, isSpan, isLink, isItemLink, isInlineItem,
} from "datocms-structured-text-utils";

import { parse, serialize } from "datocms-structured-text-dastdown";
```

Every generated `Schema.X` is **both type and runtime value**. Value side exposes two typed constants:

- `Schema.X.ID` — model/block id as literal-typed string. Use anywhere you'd hard-code an id (`isBlockOfType`, `isBlockWithItemOfType`, `isInlineBlockWithItemOfType`, `__itemTypeId === …`, `findFirstNode(…, isBlockWithItemOfType(…))`).
- `Schema.X.REF` — `{ type: "item_type", id } as const`. Use as `item_type:` value in `buildBlockRecord<Schema.X>({ item_type: Schema.X.REF, … })`.

Use these instead of local `const FOO_ID = "…" as const;` literals — guards narrow w/o manual `as const`, refactors / id changes flow from single source.

## Chaining Structured Text helpers

Keep the nested response type on the input to `mapNodes`; annotate its **result** with `FieldValueInRequest`. Widening the input first allows block IDs and partial request objects, so typed guards can no longer promise nested attributes. For a localized field, bind and check the locale before callbacks (`if (!english)` handles both null and undefined):

```ts
const english = currentItem.body.en;
if (!english) throw new Error("Missing English content");
// If text edits need parse(), pass its checked result instead of english.
const content: NonNullable<FieldValueInRequest<typeof currentItem, "body">>["en"] =
  mapNodes(english, (node) => {
    if (isBlockWithItemOfType(Schema.ImageBlock.ID, node)) {
      return { ...node, item: buildBlockRecord<Schema.ImageBlock>({
        id: node.item.id, caption: node.item.attributes.caption + " (reviewed)",
      }) };
    }
    return node;
  });
```

Keep the original response for inspection and verification. Run typed block edits in one walk over that response (or `parse(editedText, english)`), then append to the writable result. Do not inspect a rewritten block as if it still contained the full response. Preserve values with inferred constants or `JSON.stringify(originalValue)`; do not introduce broad `unknown`/`any` types for snapshots.

Compound predicates such as `(node) => isSpan(node) && node.value === text` can return only `boolean` and lose narrowing. Reapply the corresponding guard before every node-specific access, including verification or logging after re-indexing. Guard paragraph children too: they may be links or inline records; `isParagraph(node)` does not make every child a span.

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

Use the project types supplied by the selected runtime. For local scripts that need a generated `Schema` module, see `references/type-generation.md`.

Same for `client.items.update<Schema.X>`, `client.items.create<Schema.X>`, `buildBlockRecord<Schema.B>`, `duplicateBlockRecord<Schema.B>`. `client.items.list` and `client.items.listPagedIterator` accept `<Schema.X>` when `filter.type` is set, or `<Schema.AnyModel>` when unset — always generic.

## Prerequisites the workflow assumes

### Response modes — default vs `nested: true`

Every read endpoint returning records accepts `nested: true` (`items.find`, `items.list`, `items.listPagedIterator`, `items.references`, `uploads.references`).

| Default mode | Nested mode (`nested: true`) |
| - | - |
| Block fields return ID strings | Block fields return full objects with `.attributes` |
| Max page size 500 | Max page size 30 (iterators don't lower `perPage` — keep ≤ 30 → \~16× more page fetches) |
| Counting, listing, "do these exist?" | Any read you intend to mutate or display |

Forgetting `nested: true` is #1 cause of broken update payloads — mapping over array of strings produces garbage. Block fields are the field type that changes shape between these modes. Asset fields retain file-value objects (`upload_id`, alt/title, custom data, focal point, poster time), or `null`; record-link fields retain record IDs. Infer asset snapshot types from the fetched value instead of declaring them as strings.

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

### DAST grammar (structured text)

Top-level value is `{ schema: "dast", document: { type: "root", children: [...] } }`. Children allowed per node — violations produce API errors:

| Node | Allowed children |
| - | - |
| `root` | `paragraph`, `heading`, `list`, `code`, `blockquote`, `block`, `thematicBreak` |
| `paragraph`, `heading` | `span`, `link`, `itemLink`, `inlineItem`, `inlineBlock` |
| `list` | `listItem` |
| `listItem` | `paragraph`, `list` (lists nest) |
| `blockquote` | `paragraph` |
| `link`, `itemLink` | `span` only — no nested links or inline embeds |
| `span`, `code`, `thematicBreak`, `block`, `inlineBlock`, `inlineItem` | leaf — no children |

`block` may only sit at root depth; inside text flow use `inlineBlock`. Line breaks live as literal `\n` inside `span.value` — no dedicated break node. Default marks include `strong`, `emphasis`, `code`, `underline`, `strikethrough`, and `highlight`. Custom marks are possible: preserve the fetched `string[]` instead of narrowing snapshots to a union of defaults.

## Structured text (`structured_text`)

Wrap in `if (currentItem.content) { ... }`. Pass **original response** into `mapNodes` / `parse`.

Canonical order: **Pass 1 → Pass 2 → root-level appends**. Apply only steps you need; end w/ single `client.items.update`.

1. **Pass 1 — dastdown round-trip.** Text-shaped edits: rephrase paragraphs, restructure lists, reorder/delete blocks, add/remove marks on substrings (`**strong**`, `*em*`, `==highlight==`, `++underline++`, `~~strike~~`, `` `code` ``), autolink emails/URLs as `[text](url)` or `[text](mailto:…)`, swap inline link targets — anything expressible as text edit on serialized form. `serialize` to dastdown, edit text, `parse(text, currentItem.content)` rehydrates blocks by id. Output type follows `currentItem.content`; untouched blocks pass through as same object reference. Blocks opaque here — only ids encoded; can't touch internals. **Use when equivalent AST change would require writing many DAST nodes instead of simple markdown — `parse` does the split for you.**
2. **Pass 2 — single `mapNodes` walk** over Pass 1's result (or `currentItem.content` if you skipped Pass 1). One walk handles both flavors of edit:
   - **Prose AST surgery** — heading levels, link metas, span splits, drop empty paragraphs, mass-replacement across every link / span / heading.
   - **Block edits, replacements, creations at existing slots** — return `{ ...node, item: buildBlockRecord<Schema.B>({ id, ...diff }) }` to edit, `buildBlockRecord<Schema.B>({ item_type, ...attrs })` (no `id`) to swap in new block at existing slot, `duplicateBlockRecord<Schema.B>(source, repo)` to clone. Source duplicate from **original** tree via `findFirstNode` — `mapNodes` may have rewritten `node.item`, so post-walk tree not safe to clone from.
3. **Post-walk — root-level appends.** `mapNodes` can't splat at root, so push fresh top-level entries (new paragraph, `{ type: "block", item: buildBlockRecord(...) }`, duplicated block) directly into `content.document.children` after walk.

Prefer dastdown for text-shaped edits after the unedited round-trip check below. If it throws or changes existing text, apply the requested edit with `mapNodes` on the original document before making any write.

**Why Pass 1 must come first:** `parse` uses `currentItem.content` as lookup table for `<block id="…"/>` placeholders — block created or rewritten by Pass 2 first would either be missing from lookup (and `parse` would throw) or get its mutation silently overwritten by rehydration.

`isBlockWithItemOfType` / `isInlineBlockWithItemOfType` narrow `node.item` to `BlockInNestedResponse<Schema.X>` automatically — no manual cast, no runtime id check. Work inside `mapNodes`/`findFirstNode` callbacks as long as `currentItem.content` carries schema generic (i.e. you called `client.items.find<Schema.M>`).

Two call styles, same narrowing: curried `isBlockWithItemOfType(ID)` returns predicate (use w/ `findFirstNode` / `collectNodes` / `Array#filter`); direct `isBlockWithItemOfType(ID, node)` checks node inline (use inside `if`).

Rule: write typed-guard branch ONLY for block/inline-block IDs you actually need to mutate. Everything else — including untouched blocks/inline-blocks — falls through to bare `return node`. Update accepts original nested-response shape unchanged; rewrite to id string (`{ ...node, item: node.item.id }`) is payload-size optimization, never correctness requirement.

Do NOT add generic keep-as-id catch-all (`"item" in node`, `node.type === "block" | "inlineBlock"`): once typed guards exhaust every block (or inline-block) variant schema allows for that field, TS narrows rest of union and catch-all becomes type error (`never`) or dead code. Skip it — `return node` does right thing.

### Pass 1 — dastdown round-trip

```ts
import { parse, serialize } from "datocms-structured-text-dastdown";
import { isSpan, reduceNodes } from "datocms-structured-text-utils";

const currentItem = await client.items.find<Schema.Article>(id, { nested: true });

if (currentItem.content) {
  const text = serialize(currentItem.content);
  const unedited = parse(text, currentItem.content);
  const originalText = reduceNodes(currentItem.content, (text, node) => text + (isSpan(node) ? node.value : ""), "");
  const roundTripText = reduceNodes(unedited, (text, node) => text + (isSpan(node) ? node.value : ""), "");
  if (originalText !== roundTripText) {
    throw new Error("Dastdown changes existing text; use mapNodes on the original document.");
  }
  const edited = /* … LLM / regex / diff-merge on `text` … */ text;

  // `parse` reuses the original `item` for surviving block/inlineBlock IDs.
  // Keep the nested response type if continuing through mapNodes.
  const content = parse(edited, currentItem.content);

  await client.items.update<Schema.Article>(currentItem.id, { content });
}
```

Dastdown 6.0.0 changes newlines inside code-marked spans into literal `<br/>` text. This pre-write check catches that while tolerating span merging and mark normalization; it supplements the structure, marks, links, and reference checks, not the saved-content verification. If it fails, transform the original AST instead. Omit the imports when the selected runtime already supplies these helpers.

Creating brand new structured text content, use `parse("Your **content**")` instead of building DAST manually: much faster.

`parse(text, original)` throws if edit references `<block id="…"/>` / `<inlineBlock id="…"/>` whose id not in `original` — signal to either drop placeholder or move block creation to Pass 2. Editing block's contents through dastdown impossible (only id encoded): Pass 2 owns block-internal edits.

For dastdown syntax (what it adds beyond plain markdown, mark canonical order, canonicalization rules), see `records.md` § "dastdown syntax — what's NOT plain markdown".

### Pass 2 — `mapNodes` walk (prose AST + block edits)

**`mapNodes` walks bottom-up. Return `node` (1:1), `node[]` (splatted into parent's `children`, 1:N), or `null`/`undefined` (drop, 1:0); splat/drop at root throws.** Beyond editing `marks`, `value`, `url`, `level`, `meta`, `item` in place, you can split span into siblings, wrap span in link, drop nodes, or rewrite parent's `children` from inside callback — when mapper sees node, descendants already transformed. Pass 1 (regex on dastdown) often simpler for bulk span-splitting / autolinking.

```ts
const currentItem = await client.items.find<Schema.Article>(id, { nested: true });
const repo = new SchemaRepository(client);

if (currentItem.content) {
  const content: NonNullable<FieldValueInRequest<typeof currentItem, "content">> =
    mapNodes(currentItem.content, (node, parent) => {
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
    if (isHeading(node) && node.level === 1) return { ...node, level: 2 as const };
    if (isSpan(node)) { // marks: add/remove decorators
      const marks = new Set(node.marks ?? []);
      marks.add("strong"); // Preserve existing custom marks too.
      return { ...node, marks: [...marks], value: node.value.replace(/x/g, "y") };
    }
    if (isLink(node)) { // link: { url, meta?, children: Span[] }
      return { ...node, url: node.url + "?utm=x", meta: [
        ...(node.meta ?? []).filter((m) => m.id !== "rel"),
        { id: "rel", value: "nofollow" },
      ] };
    }
    if (isItemLink(node)) return { ...node, item: "NEW_RECORD_ID" }; // itemLink/inlineItem: item is a record id string
    if (
      isParagraph(node) &&
      parent?.type === "root" &&
      !node.children.some((child) => child.type === "inlineItem" || child.type === "inlineBlock" || child.type === "itemLink") &&
      reduceNodes(node, (acc, n) => isSpan(n) ? acc + n.value.trim() : acc, "").length === 0
    ) {
      return null; // Drop empty root paragraphs; lists and blockquotes need their paragraphs.
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

  // Append a paragraph at the end of the document
  content.document.children.push({
    type: "paragraph",
    children: [{ type: "span", value: "Updated" }],
  });

  await client.items.update<Schema.Article>(currentItem.id, { content });
}
```

### Post-walk — root-level appends

Example's tail covers post-walk hook: `content.document.children.push({ type: "paragraph", ... })` for fresh top-level prose node, `push({ type: "block", item: await duplicateBlockRecord<Schema.Warn>(found.node.item, repo) })` for fresh top-level block. `mapNodes` can't splat at root, so root-level inserts always live here. For duplication, source donor via `findFirstNode` on **original** `currentItem.content` — Pass 2 may have rewritten `node.item` on mapped tree.

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

## Localized fields and adding a locale

Site update + per-item backfill in ONE script. Spread existing per-locale objects.

```ts
await client.site.update({ locales: ["en", "it", "es"] });

for await (const it of client.items.listPagedIterator<Schema.FaqEntry>({
  filter: { type: "faq_entry" }, version: "current",
  order_by: "id_ASC", // Keep pagination order stable while updating translations.
})) {
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
