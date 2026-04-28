# Editing records

Mutating record fields — block-bearing fields (Modular Content `rich_text`, Single Block `single_block`, Structured Text `structured_text` with `block` / `inlineBlock` nodes) and localized fields, plus adding a locale and backfilling per-locale values.

> For endpoint shapes of `items.*` (find / list / update / create / publish / …), consult `npx datocms cma:docs items <action> --types-depth 2` (raise the depth or use `--expand-types` for deeper nested types). This file owns the workflow: peek-then-mutate ordering, typed guards, the structured-text Pass 1 → Pass 2 → root-append invariant.

Do peek + mutate in ONE script. No top-level `return` — wrap in `if (currentItem.body) { ... }`. Always pass `Schema.X` as the generic to typed helpers; never hand-roll JSON:API.

## Workflow

1. `schema:inspect <model> --include-nested-blocks` for block IDs.
2. `client.items.find<Schema.M>(id, { nested: true })` — the `<Schema.M>` generic is **mandatory**, not optional (see "`Schema.X` is mandatory on every typed call" below). Blocks have `.id`, `.__itemTypeId`, fields under `.attributes` (NOT `block.title`). Every field on `.attributes` is typed as nullable (`string | null`, etc.) regardless of the validator — the generated types reflect what the CMA can transport, not whether `required` is set. Guard against `null` before passing values to APIs that expect a non-nullable type (e.g. `new URL(...)`, string concatenation that would coerce `null` to `"null"`).
3. Build with `buildBlockRecord<Schema.B>({...})` / `duplicateBlockRecord(...)`.
4. `client.items.update<Schema.M>(id, { ... })`. Skip unchanged fields.

## Imports

```ts
import {
  type ApiTypes, type BlockInNestedResponse,
  buildBlockRecord, duplicateBlockRecord,
  isBlockOfType, SchemaRepository,
} from "@datocms/cma-client-node";
import {
  mapNodes, findFirstNode, reduceNodes,
  isBlockWithItemOfType, isInlineBlockWithItemOfType,
  isHeading, isParagraph, isSpan, isLink, isItemLink, isInlineItem,
} from "datocms-structured-text-utils";
```

Declare ID literals with `as const` so guards see the literal type.

## `Schema.X` is mandatory on every typed call

Without the generic, `client.items.find(id)` returns the bare CMA shape: every field is `unknown`, every block is `unknown`, no typed guard narrows, and every spread over a localized field becomes a hand-written `Record<string, string>` cast. Editing without `Schema.X` works at runtime but is not the pattern this skill teaches — the typed payloads, the guards, and the localized spreads below all assume it.

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

In `cma:script` **stdin-mode** `Schema.*` is **ambient** — no import, no `schema:generate`, no `tsconfig` change. Just call `await client.items.find<Schema.FaqEntry>(id)` and the marker resolves. If TS reports `Cannot find name 'Schema'` you are in file-mode, where you must run `npx datocms schema:generate ./datocms-schema.ts` and `import * as Schema from "./datocms-schema"`.

The same rule applies to `client.items.update<Schema.X>`, `client.items.create<Schema.X>`, `buildBlockRecord<Schema.B>`, `duplicateBlockRecord<Schema.B>`. **`client.items.list` and `client.items.listPagedIterator` are the exceptions** — their return shape is the generic untyped item, because the result spans many models. When you iterate a list and mean to mutate, do a per-record `client.items.find<Schema.X>(it.id)` first; do **not** mutate off the list result directly (`item.question` will be `unknown` and you will reach for a `Record<string, string>` cast — that is the smell that you skipped the find).

## Prerequisites the workflow assumes

### Response modes — default vs `nested: true`

Every read endpoint that returns records accepts `nested: true` (`items.find`, `items.list`, `items.listPagedIterator`, `items.references`, `uploads.references`).

| Default mode | Nested mode (`nested: true`) |
|---|---|
| Block fields return ID strings | Block fields return full objects with `.attributes` |
| Max page size 500 | Max page size 30 (iterators auto-adjust → ~16× more page fetches) |
| Counting, listing, "do these exist?" | Any read you intend to mutate or display |

Forgetting `nested: true` is the #1 cause of broken update payloads — mapping over an array of strings produces garbage. Block fields are the only field type that change shape between the two modes; asset fields and record-link fields always return IDs.

### ID / object duality

Inside any block-bearing value — request OR response — a block can appear in two forms:

- **ID string** (`"dhVR2HqgRVCTGFi_0bWqLqA"`) — lightweight reference, means "this block, unchanged".
- **Full object** (`{ id, type: "item", attributes, relationships: { item_type } }`) — what `buildBlockRecord<Schema.B>({...})` produces. Means "create if `id` missing, update if `id` present".

Mutation rules in the parent record's `update` call:

| Operation | Payload form |
|---|---|
| **Create** a new block | `buildBlockRecord<Schema.B>({ item_type: { type: "item_type", id }, ...attrs })` — no `id` on the outer object |
| **Update** an existing block | `buildBlockRecord<Schema.B>({ id, ...changedAttrs })` — only the diff; `item_type` is implicit |
| **Keep** unchanged | Its ID string |
| **Delete** | Omit it — remove from the array; set `null` for `single_block` |
| **Reorder** (modular content) | Place IDs / objects in desired order |

### DAST grammar (structured text)

Top-level value is `{ schema: "dast", document: { type: "root", children: [...] } }`. Children allowed per node — violations produce API errors:

| Node | Allowed children |
|---|---|
| `root` | `paragraph`, `heading`, `list`, `code`, `blockquote`, `block`, `thematicBreak` |
| `paragraph`, `heading` | `span`, `link`, `itemLink`, `inlineItem`, `inlineBlock` |
| `list` | `listItem` |
| `listItem` | `paragraph`, `list` (lists nest) |
| `blockquote` | `paragraph` |
| `link`, `itemLink` | `span` only — no nested links or inline embeds |
| `span`, `code`, `thematicBreak`, `block`, `inlineBlock`, `inlineItem` | leaf — no children |

`block` may only sit at root depth; inside text flow use `inlineBlock`. Line breaks live as literal `\n` inside `span.value` — no dedicated break node. Available marks: `'strong' | 'emphasis' | 'code' | 'underline' | 'strikethrough' | 'highlight'`.

## Modular content (`rich_text`)

Each entry is a block-id string (keep) OR a `buildBlockRecord` result. When mixing both, **declare the array with the request type** so TS unifies the union.

Two call styles, same narrowing: curried `isBlockOfType(ID)` returns a predicate (use it with `Array#filter` / `Array#find`); direct `isBlockOfType(ID, b)` checks a single block inline (use it inside an `if`).

```ts
const page = await client.items.find<Schema.LandingPage>(id, { nested: true });
const repo = new SchemaRepository(client);

type Entry = NonNullable<ApiTypes.ItemUpdateSchema<Schema.LandingPage>["sections"]>[number];
const sections: Entry[] = [];

sections.push(buildBlockRecord<Schema.HeroBlock>({ // ADD
  item_type: { type: "item_type", id: "HERO_ID" },
  headline: "New",
}));

for (const b of page.sections) {
  if (b.__itemTypeId === "OLD_HERO_ID") continue; // REMOVE
  if (isBlockOfType("CTA_ID", b)) { // EDIT — fields on .attributes
    sections.push(buildBlockRecord<Schema.Cta>({
      id: b.id, button_url: b.attributes.button_url + "?utm=x",
    }));
    continue;
  }
  if (isBlockOfType("TESTIMONIAL_ID", b)) { // DUPLICATE
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

Wrap in `if (currentItem.content) { ... }`. Pass the **original response** into `mapNodes` / `parse`.

The canonical order is **Pass 1 → Pass 2 → root-level appends**. Apply only the steps you need; end with a single `client.items.update`.

1. **Pass 1 — dastdown round-trip.** Text-shaped edits: rephrase paragraphs, restructure lists, reorder/delete blocks, add/remove marks on substrings (`**strong**`, `*em*`, `==highlight==`, `++underline++`, `~~strike~~`, `` `code` ``), autolink emails/URLs as `[text](url)` or `[text](mailto:…)`, swap inline link targets — anything expressible as a text edit on the serialized form. `serialize` to dastdown, edit text, `parse(text, currentItem.content)` rehydrates blocks by id. Output type follows `currentItem.content`; untouched blocks pass through as the same object reference. Blocks are opaque here — only their ids are encoded; can't touch their internals. **Use when the equivalent AST change would require writing a lot of DAST nodes instead of simple markdown — `parse` does the split for you.**
2. **Pass 2 — single `mapNodes` walk** over Pass 1's result (or `currentItem.content` if you skipped Pass 1). One walk handles both flavors of edit:
    - **Prose AST surgery** — heading levels, link metas, span splits, drop empty paragraphs, mass-replacement across every link / span / heading.
    - **Block edits, replacements, and creations at existing slots** — return `{ ...node, item: buildBlockRecord<Schema.B>({ id, ...diff }) }` to edit, `buildBlockRecord<Schema.B>({ item_type, ...attrs })` (no `id`) to swap in a new block at an existing slot, `duplicateBlockRecord<Schema.B>(source, repo)` to clone. Source the duplicate from the **original** tree via `findFirstNode` — `mapNodes` may have rewritten `node.item`, so the post-walk tree is not safe to clone from.
3. **Post-walk — root-level appends.** `mapNodes` can't splat at the root, so push fresh top-level entries (a new paragraph, `{ type: "block", item: buildBlockRecord(...) }`, a duplicated block) directly into `content.document.children` after the walk.

**If you can, prefer dastdown instad of AST building/manipulation.** Much less chance of logic or typing errors!

**Why Pass 1 must come first:** `parse` uses `currentItem.content` as the lookup table for `<block id="…"/>` placeholders — a block created or rewritten by Pass 2 first would either be missing from that lookup (and `parse` would throw) or get its mutation silently overwritten by the rehydration.

`isBlockWithItemOfType` / `isInlineBlockWithItemOfType` narrow `node.item` to `BlockInNestedResponse<Schema.X>` automatically — no manual cast, no runtime id check. They work inside `mapNodes`/`findFirstNode` callbacks as long as `currentItem.content` carries the schema generic (i.e. you called `client.items.find<Schema.M>`).

Two call styles, same narrowing: curried `isBlockWithItemOfType(ID)` returns a predicate (use it with `findFirstNode` / `findAllNodes` / `Array#filter`); direct `isBlockWithItemOfType(ID, node)` checks a node inline (use it inside an `if`).

Rule: write a typed-guard branch ONLY for the block/inline-block IDs you actually need to mutate. Everything else — including untouched blocks/inline-blocks — falls through to a bare `return node`. The update accepts the original nested-response shape unchanged; the rewrite to an id string (`{ ...node, item: node.item.id }`) is a payload-size optimization, never a correctness requirement.

Do NOT add a generic keep-as-id catch-all (`"item" in node`, `node.type === "block" | "inlineBlock"`): once your typed guards have exhausted every block (or inline-block) variant the schema allows for that field, TS narrows the rest of the union and the catch-all becomes a type error (`never`) or dead code. Skip it — `return node` already does the right thing.

### Pass 1 — dastdown round-trip

```ts
import { parse, serialize } from "datocms-structured-text-dastdown";

const currentItem = await client.items.find<Schema.Article>(id, { nested: true });

if (currentItem.content) {
  const text = serialize(currentItem.content);
  const edited = /* … LLM / regex / diff-merge on `text` … */ text;

  // `content` keeps the static type of `currentItem.content` and reuses the original
  // `item` object for every block/inlineBlock whose id survives the edit.
  const content = parse(edited, currentItem.content);

  await client.items.update<Schema.Article>(currentItem.id, { content });
}
```

`parse(text, original)` throws if the edit references a `<block id="…"/>` / `<inlineBlock id="…"/>` whose id is not in `original` — that's the signal to either drop the placeholder or move the block creation to Pass 2. Editing a block's contents through dastdown is impossible (only the id is encoded): Pass 2 owns block-internal edits.

#### dastdown syntax — what's NOT plain markdown

Markdown-identical: `# H1`–`###### H6`, paragraphs, `- ` / `1. ` lists (2-space indent for nesting), `> ` blockquote, ` ```lang ` fences, `---` thematic break, `**strong**` `*emphasis*` `` `code` `` `~~strike~~`, `[text](url)`, `\` escapes. Full spec: `datocms-structured-text-dastdown/SPEC.md`.

Everything dastdown adds, in one document:

```dastdown
# Heading {style="display"} ← style trailer on heading line

Paragraph with ==highlight==, ++underline++, custom mark <m k="footnote-ref">x</m>, and span-internal<br/>linebreak.
{style="lead"} ← paragraph style: own line AFTER

> Quote body.
{attribution="Oscar Wilde"} ← blockquote attribution: own line AFTER

```js {highlight=[0,2]} ← highlight 0-indexed; no escapes inside fence
code
```

Link with meta: [text](https://x.com){rel="nofollow" target="_blank"}
Record link: [text](dato:item/RECORD_ID){rel="nofollow"}
Inline refs: <inlineItem id="…"/>  <inlineBlock id="…"/>

<block id="…"/> ← root-level only, own line
```

Rules that bite:

- `<block|inlineBlock|inlineItem id="…"/>` and `dato:item/ID`: opaque record refs. Don't invent ids — `parse` throws on unknown `block`/`inlineBlock` ids; create them in Pass 2 instead.
- Mark canonical order outer→inner: `highlight → strikethrough → underline → strong → emphasis → code`; custom marks innermost, alphabetical. Serializer rewrites freely — don't depend on input order.
- Canonicalization also drops empty spans and coalesces adjacent same-marks spans. `parse(null|undefined)` → `null`; `parse("")` → single empty paragraph.

### Pass 2 — `mapNodes` walk (prose AST + block edits)

**`mapNodes` walks bottom-up. Return `node` (1:1), `node[]` (splatted into parent's `children`, 1:N), or `null`/`undefined` (drop, 1:0); splat/drop at the root throws.** Beyond editing `marks`, `value`, `url`, `level`, `meta`, `item` in place, you can split a span into siblings, wrap a span in a link, drop nodes, or rewrite a parent's `children` from inside the callback — when the mapper sees a node, its descendants are already the transformed ones. Pass 1 (regex on dastdown) is still often simpler for bulk span-splitting / autolinking.

```ts
const CTA_ID    = "d-CHYg-rShOt3kiL6ZN1yA" as const;
const MENTION_ID= "VGXgXav9SwG5P48frGrFxA" as const;
const WARN_ID   = "Hh3vSyvnQE2nViJ3jq7CBQ" as const;

const currentItem = await client.items.find<Schema.Article>(id, { nested: true });
const repo = new SchemaRepository(client);

if (currentItem.content) {
  type Body = NonNullable<ApiTypes.ItemUpdateSchema<Schema.Article>["content"]>;

  let content: Body = currentItem.content;
  content = mapNodes(content, (node) => {
    if (isInlineBlockWithItemOfType(MENTION_ID, node)) { // EDIT inline
      return { ...node, item: buildBlockRecord<Schema.Mention>({
        id: node.item.id, url: node.item.attributes.url + "?utm=x",
      }) };
    }
    if (isBlockWithItemOfType(CTA_ID, node)) { // EDIT block
      return { ...node, item: buildBlockRecord<Schema.Cta>({
        id: node.item.id, button_url: node.item.attributes.button_url + "?utm=x",
      }) };
    }
    if (isHeading(node) && node.level === 1) return { ...node, level: 2 as const };
    if (isSpan(node)) { // marks: add/remove decorators
      const marks = new Set(node.marks ?? []);
      marks.add("strong"); // 'strong'|'emphasis'|'code'|'underline'|'strikethrough'|'highlight'
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
      reduceNodes(node, (acc, n) => isSpan(n) ? acc + n.value.trim() : acc, "").length === 0
    ) {
      return null; // 1:0 — reduceNodes descends into links/itemLinks; bottom-up: drop the paragraph
    }
    return node; // untouched nodes pass through unchanged
  });

  // findFirstNode composes directly with the typed guard.
  const found = findFirstNode(currentItem.content, isBlockWithItemOfType(WARN_ID));
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

The example's tail covers the post-walk hook: `content.document.children.push({ type: "paragraph", ... })` for a fresh top-level prose node, and `push({ type: "block", item: await duplicateBlockRecord<Schema.Warn>(found.node.item, repo) })` for a fresh top-level block. `mapNodes` can't splat at the root, so root-level inserts always live here. For duplication, source the donor via `findFirstNode` on the **original** `currentItem.content` — Pass 2 may have rewritten `node.item` on the mapped tree.

## Localized fields and adding a locale

Site update + per-item backfill in ONE script. Spread existing per-locale objects. The per-record `find<Schema.FaqEntry>` is the typed source for the spread — do **not** spread off the `list` result, its fields are `unknown`.

```ts
await client.site.update({ locales: ["en", "it", "es"] });

const items = await client.items.list({ filter: { type: "faq_entry" }, version: "current" });
for (const it of items) {
  const currentItem = await client.items.find<Schema.FaqEntry>(it.id);
  await client.items.update<Schema.FaqEntry>(it.id, {
    question: { ...currentItem.question, es: "..." },
    answer:   { ...currentItem.answer,   es: "..." },
  });
}
```

If TS rejects the spread (typically because the per-locale value is nullable and the `Update` shape requires non-null), cast precisely with the request schema rather than reaching for `Record<string, string>`:

```ts
question: { ...(currentItem.question as NonNullable<ApiTypes.ItemUpdateSchema<Schema.FaqEntry>["question"]>), es: "..." },
```

For block-bearing localized fields the same per-locale shape applies — each locale key holds whatever value the field expects (array of blocks/IDs for `rich_text`, full object or `null` for `single_block`, DAST tree for `structured_text`).

Casting `node.item as BlockInNestedResponse<Schema.X>` after a runtime id check is allowed — but only the manual-discriminator fallback needs it; `isBlockWithItemOfType` / `isInlineBlockWithItemOfType` narrow without a cast.

## Optimistic locking via `meta.current_version`

`update` is **last-write-wins by default**. When two clients update the same record concurrently, the second silently overwrites the first — no error. To get a 409 conflict instead, echo the `meta.current_version` you read back into the update:

```ts
const before = await client.items.find<Schema.Article>(id);
await client.items.update<Schema.Article>(id, {
  title: "new",
  meta: { current_version: before.meta.current_version },
});
```

Reach for this pattern any time the update path is concurrent (multiple workers, retry loops, UI editor sync). The cost is one read per write; the benefit is no silent data loss. Catch `ApiError` and check `e.findError("STALE_ITEM_VERSION")` to retry with a fresh read.
