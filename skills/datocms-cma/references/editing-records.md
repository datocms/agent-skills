# Editing records

Change record fields that hold blocks (Modular Content `rich_text`, Single Block `single_block`, Structured Text `structured_text`), nested blocks at any depth, and localized fields. Three rules cover most mistakes:

- **A field you send replaces that field's whole value; a field you leave out is untouched.** In a block field, a block you leave out is deleted.
- **Read with `nested: true`, change, write once.** Without it block fields are ID strings and there is nothing to edit.
- **Keep the types.** `Schema.X` on every call, no `any`, `unknown`, casts or JSON round-trips. A record's fields are top-level; a block's fields are under `attributes`.

> In CLI mode: `cma:docs items self` documents `client.items.find()` / `cma:call items find`; `cma:docs items update` documents `client.items.update()`. Use `--expand-types <Type>` for a specific declaration.

## Contents

- Workflow
- `Schema.X` is mandatory on every typed call
- Typing values you build up in code
- Block rules in detail
- Modular content (`rich_text`)
- Single block (`single_block`)
- Structured text (`structured_text`)
- Structured text: Pass 1, dastdown round-trip
- Structured text: Pass 2, `mapNodes` walk
- Localized fields and adding a locale
- Verify saved content

## Workflow

1. Inspect the model and the block models its fields allow (IDs, field API keys).

2. Read: `client.items.find<Schema.M>(id, { nested: true })`. Blocks come back with `.id`, `.__itemTypeId` and their fields under `.attributes` (NOT `block.title`). Every field on `.attributes` is typed nullable (`string | null`, etc.) whatever its validators: guard `null` before passing a value to something that needs it non-null (`new URL(...)`, string concatenation).

3. Build the new value of each field you change. In a block field, every slot (array element of `rich_text`, the value of `single_block`, the `item` of a Structured Text `block` / `inlineBlock` node) is one of:

   | To | Put in the slot |
   | - | - |
   | Keep a block unchanged | its ID string |
   | Edit a block | `buildBlockRecord<Schema.B>({ id, ...changedFields })` — only the fields that change; the others keep their values |
   | Add a block | `buildBlockRecord<Schema.B>({ item_type: Schema.B.REF, ...fields })` — the server assigns the ID |
   | Copy a block | `await duplicateBlockRecord<Schema.B>(block, repo)` |
   | Delete a block | leave it out (`null` for `single_block`) |
   | Reorder | put the slots in the new order |

4. Write once: `client.items.update<Schema.M>(id, { ...onlyTheFieldsYouChanged })`. Do not write a peek script and then a second mutate script: read and write in ONE script, with no top-level `return` (wrap in `if (currentItem.body) { ... }`).

5. `update` returns block IDs, not objects: read again with `nested: true` to check the result.

> In CLI mode: run it through `cma:script` stdin mode (a heredoc). `client`, `Schema` and every helper used here are ambient there and the script is type-checked before it runs. File mode needs explicit imports and a file inside the project, never the system `/tmp`.

The same slots apply at every depth: a block's own block fields are edited the same way, inside the `buildBlockRecord` of their parent block. Without the helper a block object is `{ type: "item", id?, attributes: {...}, relationships: { item_type: { data: { type: "item_type", id } } } }`; `relationships` is needed only for a new block.

Two limits on ID strings: when **creating** a record every block must be an object, and a block ID works only in the field and locale it already lives in (see "Block rules in detail").

## `Schema.X` is mandatory on every typed call

Without the generic, `client.items.find(id)` returns the bare CMA shape: every field and block is `unknown`, no guard narrows, a spread over a localized field does not type-check. Everything below assumes it.

```ts
// BAD
const currentItem = await client.items.find(id);
currentItem.question; // unknown — { ...currentItem.question, es: "..." } is a type error

// GOOD
const currentItem = await client.items.find<Schema.FaqEntry>(id);
currentItem.title; // string | null
currentItem.question; // Record<string, string | null>
```

Use the project types supplied by the selected runtime. For local scripts that need a generated `Schema` module, see `references/type-generation.md`.

Same for `client.items.update<Schema.X>`, `client.items.create<Schema.X>`, `buildBlockRecord<Schema.B>`, `duplicateBlockRecord<Schema.B>`. `client.items.list` and `client.items.listPagedIterator` accept `<Schema.X>` when `filter.type` is set, or `<Schema.AnyModel>` when unset — always generic.

Every generated `Schema.X` is **both type and runtime value**. Value side exposes two typed constants:

- `Schema.X.ID` — model/block id as literal-typed string. Use anywhere you'd hard-code an id (`isBlockOfType`, `isBlockWithItemOfType`, `isInlineBlockWithItemOfType`, `__itemTypeId === …`, `findFirstNode(…, isBlockWithItemOfType(…))`).
- `Schema.X.REF` — `{ type: "item_type", id } as const`. Use as `item_type:` value in `buildBlockRecord<Schema.X>({ item_type: Schema.X.REF, … })`.

Use these instead of local `const FOO_ID = "…" as const;` literals. Every guard has two call styles with the same narrowing: curried `isBlockOfType(ID)` / `isBlockWithItemOfType(ID)` returns a predicate (for `Array#filter`, `Array#find`, `findFirstNode`, `collectNodes`); direct `isBlockOfType(ID, block)` / `isBlockWithItemOfType(ID, node)` checks one value inside an `if`.

## Typing values you build up in code

> Examples assume an authenticated `client` and project-specific `Schema`. Use helpers already supplied by the selected runtime; otherwise import them from the packages shown below.

```ts
import {
  type ApiTypes, type BlockInNestedResponse, type FieldValueInRequest,
  buildBlockRecord, duplicateBlockRecord,
  isBlockOfType, SchemaRepository,
} from "@datocms/cma-client-node";

import {
  mapNodes, findFirstNode, collectNodes, reduceNodes,
  isBlockWithItemOfType, isInlineBlockWithItemOfType,
  isHeading, isParagraph, isSpan, isLink, isItemLink, isInlineItem,
} from "datocms-structured-text-utils";

import { parse, serialize } from "datocms-structured-text-dastdown";
```

A value you collect to send back (typically a rebuilt array of blocks) is typed `FieldValueInRequest<T, K>`: `T` is **any item-shaped value the CMA returned** (a record OR a nested block), `K` the field key. Record: `const sections: NonNullable<FieldValueInRequest<typeof page, "sections">> = [];`. Nested block, same expression: `NonNullable<FieldValueInRequest<typeof section, "ctas">>`.

With no value in scope yet (a helper that builds a payload from scratch), pass the model type instead: `NonNullable<FieldValueInRequest<Schema.LandingPage, "sections">>`.

Structured Text: keep the nested response type on the input to `mapNodes`; annotate its **result** with `FieldValueInRequest`. Widening the input first allows block IDs and partial request objects, so typed guards can no longer promise nested attributes. For a localized field, bind and check the locale before callbacks (`if (!english)` handles both null and undefined):

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

Compound predicates such as `(node) => isSpan(node) && node.value === text` return plain `boolean` and lose narrowing: reapply the guard before every node-specific access, verification and logging included. Guard paragraph children too: they may be links or inline records, not only spans.

## Block rules in detail

- **A block ID belongs to one slot.** It is valid only in the same field and the same locale of the same record. To move a block to another field, another locale or another record, add a copy there (`duplicateBlockRecord`, or a new object without `id`) and leave it out of the source. Reusing the ID fails: `Block record ID "…" belongs to another record (or another field/locale on this record)`.
- **Creating a record:** every block is an object; an ID string fails with `Cannot use IDs instead of block records objects when creating an Item`.
- **New block:** needs `item_type` (a block model the field's validator allows). **Existing block:** `id` is enough; an `item_type` that differs from its real model is ignored, so a block cannot change model — replace it.
- **Your own ID for a new block:** allowed. Use `generateId()` from the CMA client (a URL-safe base64 UUIDv4), unused in the environment, on an object that also has `item_type`. A malformed ID fails with `INVALID_ENTITY_ID`.
- **One ID once per payload**, at any depth: `Block record ID "…" is used twice in this payload`.
- **A bare ID string only keeps a block.** It never creates one and never changes one.
- **Localized block field:** the value is `{ en: [...], it: [...] }` with separate blocks per locale. Send every locale the record has: leaving one out is rejected (`INVALID_LOCALES`) unless every localized field of the record is sent without it: then that locale is deleted with its blocks (never with `all_locales_required`).
- **Blocks cannot be written directly:** `client.items.update(blockId)`, `publish`, `destroy` answer 404. They are saved, published and deleted with their record.
- **Limits** (blocks per record, nesting depth, record size), **error paths** such as `sections.0.ctas.0.title`: see the `items` guide (`records.md`), "Limits per record" and "Errors on writes".

## Modular content (`rich_text`)

Each entry is block-id string (keep) OR `buildBlockRecord` result. When mixing both, **declare array w/ request type** so TS unifies union.

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

The value is `{ schema: "dast", document: { type: "root", children: [...] } }` or `null`. Nodes, their attributes and the children each one allows:

| Node | Attributes | Children |
| - | - | - |
| `root` | | `paragraph`, `heading`, `list`, `code`, `blockquote`, `block`, `thematicBreak` |
| `paragraph` | `style`? | `span`, `link`, `itemLink`, `inlineItem`, `inlineBlock` |
| `heading` | `level` 1–6, `style`? | same as `paragraph` |
| `list` | `style`: `"bulleted"` \| `"numbered"` | `listItem` |
| `listItem` | | `paragraph`, `list` (lists nest) |
| `blockquote` | `attribution`? | `paragraph` |
| `code` | `code`, `language`?, `highlight`? (zero-based line numbers) | none |
| `thematicBreak` | | none |
| `span` | `value`, `marks`? | none |
| `link` | `url`, `meta`? | `span` only |
| `itemLink` | `item` (record ID), `meta`? | `span` only |
| `inlineItem` | `item` (record ID) | none |
| `block` | `item` (block ID or block object) | none |
| `inlineBlock` | `item` (block ID or block object) | none |

- `block` may only sit directly under `root`; inside text flow use `inlineBlock`. Text never sits directly in `root`, `listItem` or `blockquote`: wrap it in a `paragraph`.
- Line breaks live as literal `\n` inside `span.value` — no dedicated break node.
- Default marks include `strong`, `emphasis`, `code`, `underline`, `strikethrough`, and `highlight`. Custom marks are possible: preserve the fetched `string[]` instead of narrowing snapshots to a union of defaults.
- `meta` on `link` / `itemLink` is `[{ id, value }]`, e.g. `{ id: "target", value: "_blank" }`, `{ id: "rel", value: "nofollow" }`.
- The `item` of `block` / `inlineBlock` follows the slot rules of "Workflow" (ID = keep, object = edit or add). One block ID may appear once in a document. The `item` of `itemLink` / `inlineItem` is always a record ID string.
- Three separate validators decide what may be embedded: `structured_text_blocks` for `block`, `structured_text_inline_blocks` for `inlineBlock` (a field without it allows none: `VALIDATION_STRUCTURED_TEXT_INLINE_BLOCKS`), `structured_text_links` for `itemLink` / `inlineItem`.
- The API rejects link URLs with the `javascript:`, `vbscript:` or `data:` schemes, and any tree that breaks the table above (`INVALID_FORMAT`).
- The API normalizes what it stores: adjacent spans with the same marks are merged, empty nodes and unknown attributes are dropped, an empty document becomes `null`. Compare meaning after a write, not tree equality.
- The field's editor settings (`nodes`, `marks`, `heading_levels`) limit the dashboard toolbar only; the API accepts any valid node. When editors must be able to maintain what you write, stay inside those settings.

Pick the cheapest tool for the change. Hand-indexing the tree (`document.children[2].children[0].value`) is the expensive one: every node is a union, so each access needs a guard, and scripts fail type-checking again and again.

| Change | Tool |
| - | - |
| Wording, marks, links, list structure; reordering or deleting blocks; turning blocks into text or list items | Pass 1: edit the document as dastdown text |
| The same attribute on many nodes (heading levels, link metas); editing a block's fields; replacing or duplicating a block in place | Pass 2: one `mapNodes` walk with typed guards |
| New nodes at the end of the document | push into `content.document.children` |

Apply only the steps you need, in this order: Pass 1 (dastdown round-trip), Pass 2 (one `mapNodes` walk), root-level appends. End with a single `client.items.update`. Wrap in `if (currentItem.content) { ... }` and pass the **original response** into `mapNodes` / `parse`. `mapNodes` can't add siblings at root, so new top-level nodes (a paragraph, `{ type: "block", item: buildBlockRecord(...) }`) are pushed into `content.document.children` after the walk.

**Pass 1 comes first** because `parse` looks up `<block id="…"/>` placeholders in `currentItem.content`: a block created by Pass 2 would be missing (`parse` throws) and one rewritten by Pass 2 would be silently restored.

Creating brand new structured text content, use `parse("Your **content**")` instead of building DAST manually: much faster.

## Structured text: Pass 1, dastdown round-trip

`serialize` to dastdown, edit the text, `parse(text, currentItem.content)` rehydrates blocks by id (only ids are encoded: block internals cannot be edited here). Output type follows `currentItem.content`. **Use when the same change as AST edits would mean writing many DAST nodes.** Run the unedited round-trip check below first: if it throws or changes existing text, make the edit with `mapNodes` on the original document instead.

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

Dastdown 6.0.0 turns newlines inside code-marked spans into literal `<br/>` text; the check above catches that while tolerating span merging and mark normalization. If it fails, transform the original AST instead. Omit the imports when the runtime already supplies these helpers.

`parse(text, original)` throws when the text names a `<block id="…"/>` / `<inlineBlock id="…"/>` whose id is not in `original`: drop the placeholder or create the block in Pass 2, which also owns edits inside a block.

Blocks are lines of their own in the text (`<block id="…"/>`), so removing, reordering or replacing them is string work. Turning every Step block into an item of one numbered list:

```ts
const steps = collectNodes(currentItem.content, isBlockWithItemOfType(Schema.StepBlock.ID))
  .map(({ node }) => ({ id: node.item.id, text: node.item.attributes.description ?? "" }));

let text = serialize(currentItem.content);
steps.forEach((step, index) => {
  text = text.replace(`<block id="${step.id}"/>`, `${index + 1}. ${step.text}`);
});
const content = parse(text, currentItem.content); // consecutive items become one list; the blocks are gone
```

Text you insert is read as dastdown: backticks, `*`, `[` and `<` in it become marks, links or tags. Escape them with `\` when they must stay literal.

For dastdown syntax (what it adds beyond plain markdown, mark canonical order, canonicalization rules), see `records.md` § "dastdown syntax — what's NOT plain markdown".

## Structured text: Pass 2, `mapNodes` walk

Nodes are a union: never read `node.children[0].value` or `node.item.attributes` on a node you have not narrowed. Narrow with the guards (`isParagraph`, `isHeading`, `isSpan`, `isLink`, `isBlockWithItemOfType(Schema.X.ID, node)`), read a node's text with `reduceNodes(node, (text, n) => text + (isSpan(n) ? n.value : ""), "")`, and give block attributes a fallback (`node.item.attributes.order ?? 0`): they are typed nullable.

**`mapNodes` walks bottom-up. Return `node` (1:1), `node[]` (splatted into parent's `children`, 1:N), or `null`/`undefined` (drop, 1:0); splat/drop at root throws.** Beyond editing `marks`, `value`, `url`, `level`, `meta`, `item` in place, you can split span into siblings, wrap span in link, drop nodes, or rewrite parent's `children` from inside callback — when mapper sees node, descendants already transformed. Pass 1 (regex on dastdown) often simpler for bulk span-splitting / autolinking.

Block edits at existing positions: return `{ ...node, item: buildBlockRecord<Schema.B>({ id, ...diff }) }` to edit, `buildBlockRecord<Schema.B>({ item_type, ...attrs })` (no `id`) to swap in new block at existing slot, `duplicateBlockRecord<Schema.B>(source, repo)` to clone. Source duplicate from **original** tree via `findFirstNode` — `mapNodes` may have rewritten `node.item`, so post-walk tree not safe to clone from.

`isBlockWithItemOfType` / `isInlineBlockWithItemOfType` narrow `node.item` to `BlockInNestedResponse<Schema.X>` automatically — no manual cast, no runtime id check. Work inside `mapNodes`/`findFirstNode` callbacks as long as `currentItem.content` carries schema generic (i.e. you called `client.items.find<Schema.M>`).

Write a typed-guard branch ONLY for the block / inline-block models you mutate; everything else, untouched blocks included, falls through to a bare `return node` (the update accepts the nested response shape unchanged; rewriting to an ID string only shrinks the payload). Do NOT add a generic keep-as-id catch-all (`"item" in node`, `node.type === "block"`): once the guards cover every model the field allows, TS narrows the rest to `never` and the catch-all is a type error.

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
    if (isItemLink(node)) return { ...node, item: "NEW_RECORD_ID" }; // a record id string
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

## Localized fields and adding a locale

A localized field's value is an object keyed by locale. Two rules:

- **Send every locale of a field you update:** spread the current value and change what you need (`{ ...it.question, es: "..." }`). A locale left out of one field is rejected with `INVALID_LOCALES`; left out of every localized field of the record, all sent together, it is removed from the record (that is how a translation is deleted, never with `all_locales_required`: an empty string keeps the locale).
- **All localized fields of a record share one set of locales.** Adding or removing a locale on one field means sending **every** localized field in that update, each with the new set (a value or `null`). Adding `es` to `question` alone is rejected; include `es` on `answer` too.

Adding a locale = two executions: record types come from the environment's locales before a script runs, so the script that adds a locale cannot type it. 1) Append the locale (keep order; first = primary), read `site.locales` back. 2) New execution (regenerate any local schema file first): backfill. Spread existing per-locale objects.

```ts
// Execution 1
const site = await client.site.find();
await client.site.update({ locales: [...site.locales, "es"] });
console.log((await client.site.find()).locales);
```

```ts
// Execution 2: types now include es
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

If TS rejects spread (typically because field value may be `null` while `Update` shape requires object), guard the null instead of casting or reaching for `Record<string, string>`:

```ts
question: { ...(currentItem.question ?? {}), es: "..." },
```

A localized block field holds, per locale, what the field expects (block array for `rich_text`, object or `null` for `single_block`, DAST for `structured_text`). Block IDs are per locale: to give `es` the blocks of `en`, duplicate them (`duplicateBlockRecord`), never reuse the `en` IDs.

## Verify saved content

Keep an independent snapshot of the original read, write, then read the same record back with `nested: true` and compare.

- Snapshot before transforming, with typed guards and `const` + inferred types (or `structuredClone(originalValue)`); no `unknown` / `any` accumulators. Derive checks from the original values, `null` and empty included: preserving an optional asset means keeping its original value, not requiring one.
- Compare the values that matter (block identity, type, attributes, node order, marks, links, other locales, publication state) in matching response shapes. `===` compares object identity across reads and the API normalizes Structured Text, optional arrays and metadata: no whole-tree JSON equality, no `serialize()` output.
- Never compare the update payload with the saved response: block IDs and partial `buildBlockRecord` payloads expand into full objects on read, with unchanged attributes and response metadata. Do not strip attributes or identity to make equality pass.
- "Do not publish" on a draft-enabled model still allows editing the current version of a published record: an update changes `meta.current_version` and `meta.updated_at` without publishing. Compare publication timestamps, schedules and the published content, not `meta.status === "draft"`.
- If verification throws, inspect the saved state before deciding on any further write; never replay the mutation merely because its verification failed.

Typed snapshots of a Structured Text locale (root children exclude nested spans, so do not use their union as a visitor type; untyped `[]` seeds in `reduceNodes` infer `never[]`):

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

Apply the same projections to the saved locale and compare what the requested edit should have left alone; an authorized added span or changed caption is not a preservation failure.

In Node runtimes, use the standard value comparator for unchanged response fields, in the same execution as the update and the fresh read; do not hand-write a generic deep-equality function:

```ts
import { isDeepStrictEqual } from "node:util";

const originalItalian = structuredClone(before.body.it);
// Apply the authorized update, then fetch saved with nested: true.
if (!isDeepStrictEqual(saved.body.it, originalItalian)) {
  throw new Error("Italian content changed");
}
```

> In CLI mode: `cma:script` stdin-mode rejects `node:` imports; there compare the relevant leaf values (text, IDs, marks, attributes) with `===`, or use file-mode when whole-object equality is required.
