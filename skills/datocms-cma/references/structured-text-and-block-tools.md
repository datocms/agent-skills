# Structured Text and Block Tools

DatoCMS structured text (DAST) — node types, embedded block and record-link nodes, DAST tree manipulation with `datocms-structured-text-utils`, block traversal with `SchemaRepository`, and the `inspectItem()` debugging helper.

For the *mental model* of blocks (ID/object duality, response modes, the 5 mutation rules), read `references/block-records-and-modular-content.md` first — this file extends those rules to the DAST tree and its tooling. Each code snippet below shows its own import; the full per-package import map and the generics pattern (`buildBlockRecord<Schema.HeroBlock>`) live in that file under **Helpers Toolkit → Imports / Typed usage**.

## Quick Navigation

| If you need to… | Read |
|---|---|
| Compose paragraphs, headings, lists, links, code blocks, blockquotes | Text Nodes, Lists, Code Blocks, Blockquote, Thematic Break |
| Embed or edit a block in structured text | Block Nodes, Inline Block Nodes |
| Reference an existing record from within text | Item Link Nodes, Inline Item Nodes |
| Decide between `block`, `inlineBlock`, `itemLink`, `inlineItem` | Structured Text Embedded Content Types |
| See a full DAST document with multiple node types assembled | Complete Structured Text Example |
| Transform the DAST tree (rename headings, replace text, add link attrs) | DAST Tree Manipulation (`datocms-structured-text-utils`) |
| Resolve block models or cache schema lookups across a traversal | `SchemaRepository` |
| Walk every block in a block-bearing value at any depth | Block Traversal Utilities |
| Debug a record or block payload as a readable tree | `inspectItem()` |
| Find a canonical worked example for structured text | Worked Examples via `cma:docs` |
| Diagnose a DAST or embed error | Common Pitfalls |

---

## Structured Text (`structured_text`) Field

Structured text fields use the DatoCMS Abstract Syntax Tree (DAST) format. The canonical types live in `datocms-structured-text-utils` — fall back to them when an edge case is not covered here.

### DAST Document Structure

The top-level value is `{ schema: "dast", document: Root }`:

```ts
{
  schema: "dast",
  document: {
    type: "root",
    children: [
      // block-level nodes only — see grammar below
    ],
  },
}
```

### DAST Grammar

Each node may only contain the children listed here. Violating the grammar produces API errors.

| Node | Allowed children |
|---|---|
| `root` | `paragraph`, `heading`, `list`, `code`, `blockquote`, `block`, `thematicBreak` |
| `paragraph` | `span`, `link`, `itemLink`, `inlineItem`, `inlineBlock` |
| `heading` | `span`, `link`, `itemLink`, `inlineItem`, `inlineBlock` |
| `list` | `listItem` |
| `listItem` | `paragraph`, `list` (lists can nest) |
| `blockquote` | `paragraph` |
| `link` | `span` |
| `itemLink` | `span` |
| `span`, `code`, `thematicBreak`, `block`, `inlineBlock`, `inlineItem` | leaf nodes — no children |

Notes:
- `block` may appear **only** as a direct child of `root`. Inside text flow use `inlineBlock`.
- `link` and `itemLink` contain only `span` children — no nested links or inline embeds.
- Line breaks inside a `span` use the literal `\n` in `value`; there is no dedicated break node.

---

## Text Nodes

```ts
// Paragraph — optional `style` for custom styles defined via Plugin SDK
{
  type: "paragraph",
  style: "lead",            // optional
  children: [{ type: "span", value: "Hello world" }],
}

// Heading — `level` is 1–6; optional `style` via Plugin SDK
{
  type: "heading",
  level: 2,
  style: "section-title",   // optional
  children: [{ type: "span", value: "Section Title" }],
}

// Span — optional `marks`; line breaks use \n inside `value`
{
  type: "span",
  marks: ["strong", "emphasis"],
  value: "Line one.\nLine two.",
}

// Link — optional `meta` for custom attributes (rel, target, …)
{
  type: "link",
  url: "https://example.com",
  meta: [{ id: "target", value: "_blank" }],
  children: [{ type: "span", value: "Click here" }],
}
```

**Default span marks:** `strong`, `emphasis`, `underline`, `strikethrough`, `code`, `highlight`. Custom marks can be defined via the Plugin SDK — any string is accepted in the `marks` array.

**`meta` on `link` / `itemLink`:** array of `{ id: string; value: string }` tuples. Typically used for `rel`, `target`, `class`, or anything the frontend renderer honours. The API does not enforce a fixed vocabulary.

---

## Lists

```ts
{
  type: "list",
  style: "bulleted",
  children: [
    {
      type: "listItem",
      children: [
        {
          type: "paragraph",
          children: [{ type: "span", value: "First item" }],
        },
      ],
    },
  ],
}
```

Ordered lists use `style: "numbered"`.

---

## Code Blocks

```ts
{
  type: "code",
  language: "typescript",   // optional — syntax-highlighting hint
  highlight: [0, 3],        // optional — zero-based line numbers to highlight
  code: "const x = 42;",
}
```

---

## Blockquote

```ts
{
  type: "blockquote",
  attribution: "Oscar Wilde",   // optional
  children: [
    {
      type: "paragraph",
      children: [{ type: "span", value: "Be yourself; everyone else is taken." }],
    },
  ],
}
```

---

## Thematic Break

```ts
{ type: "thematicBreak" }
```

---

## Block Nodes (Embedded Blocks)

Use `block` nodes for full-width embedded block records. These obey the 5 mutation rules (`references/block-records-and-modular-content.md`) — `item` is either a `buildBlockRecord(...)` payload (create / update) or an ID string (keep unchanged).

```ts
{
  type: "block",
  item: buildBlockRecord({
    item_type: { id: imageBlockId, type: "item_type" },
    image: {
      upload_id: "upload-id",
      alt: "Photo",
      title: null,
      custom_data: {},
      focal_point: null,
    },
    caption: "A beautiful photo",
  }),
}
```

---

## Inline Block Nodes

Use `inlineBlock` nodes for inline embedded block records. Same 5 rules as `block` — just inline inside text flow.

```ts
{
  type: "paragraph",
  children: [
    { type: "span", value: "Check out this " },
    {
      type: "inlineBlock",
      item: buildBlockRecord({
        item_type: { id: badgeBlockId, type: "item_type" },
        label: "NEW",
        color: "green",
      }),
    },
    { type: "span", value: " feature!" },
  ],
}
```

---

## Item Link Nodes

Use `itemLink` when the text should link to an existing top-level record. `item` is always a record ID string — no embedding, no block duality. `meta` follows the same `Array<{ id, value }>` shape as `link`.

```ts
{
  type: "paragraph",
  children: [
    { type: "span", value: "Read our " },
    {
      type: "itemLink",
      item: "linked-record-id",
      meta: [{ id: "target", value: "_blank" }],   // optional
      children: [{ type: "span", value: "blog post" }],
    },
    { type: "span", value: " for more details." },
  ],
}
```

---

## Inline Item Nodes

Use `inlineItem` to reference an existing record inline (self-closing, no child text).

```ts
{
  type: "paragraph",
  children: [
    { type: "span", value: "Written by " },
    { type: "inlineItem", item: "author-record-id" },
  ],
}
```

---

## Structured Text Embedded Content Types

| Node | `item` value | Position in tree | Use case |
|---|---|---|---|
| `block` | `buildBlockRecord({...})` or ID string | Root-level | Full-width embeds such as images, CTAs, or videos |
| `inlineBlock` | `buildBlockRecord({...})` or ID string | Inline inside text | Badges, tooltips, inline widgets |
| `itemLink` | ID string (existing record) | Inline, wraps text | Hyperlink text to another record |
| `inlineItem` | ID string (existing record) | Inline, self-closing | Inline preview or card of another record |

The important distinction: `block` / `inlineBlock` **embed new or existing block records** (the whole 5-rules machinery applies to the `item` position); `itemLink` / `inlineItem` only **reference existing top-level records** by ID.

---

## Complete Structured Text Example

```ts
import { buildBlockRecord } from "@datocms/cma-client-node";
import * as Schema from "./cma-types";

await client.items.create<Schema.Post>({
  item_type: { id: modelId, type: "item_type" },
  content: {
    schema: "dast",
    document: {
      type: "root",
      children: [
        {
          type: "heading",
          level: 1,
          children: [{ type: "span", value: "Welcome to Our Blog" }],
        },
        {
          type: "paragraph",
          children: [
            { type: "span", value: "This is an " },
            { type: "span", marks: ["strong"], value: "important" },
            { type: "span", value: " announcement." },
          ],
        },
        {
          type: "block",
          item: buildBlockRecord<Schema.ImageBlock>({
            item_type: { id: imageBlockId, type: "item_type" },
            image: {
              upload_id: "upload-id",
              alt: "Banner",
              title: null,
              custom_data: {},
              focal_point: null,
            },
          }),
        },
        {
          type: "paragraph",
          children: [
            { type: "span", value: "Check out our " },
            {
              type: "itemLink",
              item: "about-page-id",
              children: [{ type: "span", value: "about page" }],
            },
            { type: "span", value: " for more info." },
          ],
        },
      ],
    },
  },
});
```

---

## DAST Tree Manipulation (`datocms-structured-text-utils`)

For transformations that walk the DAST tree itself — changing heading levels, replacing text, adding link attributes, removing empty paragraphs — use the tree helpers from `datocms-structured-text-utils`. They operate on the raw DAST shape, so you do not have to match node types by hand.

```ts
import {
  mapNodes,
  filterNodes,
  findFirstNode,
  // Type guards
  isBlock,
  isInlineBlock,
  isSpan,
  isHeading,
  isLink,
  isItemLink,
  isParagraph,
} from "datocms-structured-text-utils";
```

| Helper | Use for |
|---|---|
| `mapNodes(document, fn)` | Transform nodes recursively. Return a replacement node; return the node unchanged to pass through. |
| `filterNodes(document, predicate)` | Remove nodes that fail the predicate (returns `null` if the root fails). |
| `findFirstNode(document, predicate)` | Return the first node (and its path) matching the predicate, or `undefined`. |
| `isBlock`, `isInlineBlock`, `isSpan`, `isHeading`, `isLink`, `isItemLink`, `isParagraph`, … | Type guards to narrow nodes inside `mapNodes` / `filterNodes` callbacks. |

### Anchor example: rebrand + clean a document

Demote every `h1` to `h2`, replace every "ZEIT" span with "Vercel", add `target="_blank"` to external links, and drop empty paragraphs:

```ts
import {
  filterNodes,
  isHeading,
  isLink,
  isParagraph,
  isSpan,
  mapNodes,
} from "datocms-structured-text-utils";
import * as Schema from "./cma-types";

const transformed = mapNodes(record.content, (node) => {
  if (isHeading(node) && node.level === 1) {
    return { ...node, level: 2 };
  }
  if (isLink(node)) {
    return {
      ...node,
      meta: [...(node.meta || []), { id: "target", value: "_blank" }],
    };
  }
  if (isSpan(node) && node.value.includes("ZEIT")) {
    return { ...node, value: node.value.replace(/ZEIT/g, "Vercel") };
  }
  return node;
});

const cleaned = filterNodes(transformed, (node) =>
  isParagraph(node)
    ? node.children.some((c) => !isSpan(c) || c.value.trim().length > 0)
    : true,
);

await client.items.update<Schema.BlogPost>(recordId, { content: cleaned });
```

For embedded *blocks* inside structured text (updating attributes of an embedded `block` / `inlineBlock`), `mapNodes` reaches the node itself — but mutating the block's attributes is still a block payload concern, so combine these helpers with `buildBlockRecord()` and the 5 mutation rules. See the worked example via `cma:docs` below.

### When to use DAST helpers vs the CMA Block Traversal utilities

| Task | Use |
|---|---|
| Walk every block inside *any* block-bearing field value (modular content, single block, structured text), at any nesting depth | [`*BlocksInNonLocalizedFieldValue`](#block-traversal-utilities) |
| Walk the structured-text DAST tree itself (nodes, not just blocks) | `mapNodes` / `filterNodes` / `findFirstNode` |
| Transform mixed nodes (headings, spans, links) *and* embedded blocks in the same pass | `mapNodes` + `buildBlockRecord` inside the callback |

---

## `SchemaRepository`

`SchemaRepository` caches schema lookups. Use it when you repeatedly inspect models or fields while traversing nested blocks.

```ts
import { SchemaRepository } from "@datocms/cma-client-node";

const schemaRepo = new SchemaRepository(client);

const allModels = await schemaRepo.getAllItemTypes();
const blogModel = await schemaRepo.getItemTypeByApiKey("blog_post");
const fields = await schemaRepo.getItemTypeFields(blogModel);

await schemaRepo.prefetchAllModelsAndFields();
```

### Key Methods

| Method | Returns |
|---|---|
| `getAllItemTypes()` | All models, including blocks |
| `getAllModels()` | Only regular models |
| `getAllBlockModels()` | Only block models |
| `getItemTypeByApiKey(apiKey)` | A model by `api_key` |
| `getItemTypeById(id)` | A model by ID |
| `getItemTypeFields(itemType)` | All fields for a model |
| `getItemTypeFieldsets(itemType)` | All fieldsets for a model |
| `prefetchAllModelsAndFields()` | Pre-cache all models and fields |

---

## Block Traversal Utilities

These helpers recursively inspect block-bearing field values of any type. They require a `SchemaRepository` so nested block types can be resolved correctly.

```ts
import {
  visitBlocksInNonLocalizedFieldValue,
  findAllBlocksInNonLocalizedFieldValue,
  filterBlocksInNonLocalizedFieldValue,
  mapBlocksInNonLocalizedFieldValue,
  reduceBlocksInNonLocalizedFieldValue,
  SchemaRepository,
} from "@datocms/cma-client-node";

const schemaRepo = new SchemaRepository(client);

await visitBlocksInNonLocalizedFieldValue(
  record.content,
  "rich_text",
  schemaRepo,
  (block, path) => console.log(block.item_type.id, path),
);

const ctaBlocks = await findAllBlocksInNonLocalizedFieldValue(
  record.content,
  "rich_text",
  schemaRepo,
  (block) => block.item_type.id === ctaBlockModelId,
);

const withoutCtas = await filterBlocksInNonLocalizedFieldValue(
  record.content,
  "rich_text",
  schemaRepo,
  (block) => block.item_type.id !== ctaBlockModelId,
);

const transformed = await mapBlocksInNonLocalizedFieldValue(
  record.content,
  "rich_text",
  schemaRepo,
  (block) => block.item_type.id === textBlockModelId
    ? { ...block, body: block.body.toUpperCase() }
    : block,
);

const blockCount = await reduceBlocksInNonLocalizedFieldValue(
  record.content,
  "rich_text",
  schemaRepo,
  (count) => count + 1,
  0,
);
```

`filter` and `map` accept an options object with `traversalDirection: "top-down" | "bottom-up"`.

If the field is localized, extract each locale's inner value first. See `references/localization.md` for locale utilities.

---

## `inspectItem()`

`inspectItem()` is a debugging helper that prints a record or block as a readable tree:

```ts
import { inspectItem } from "@datocms/cma-client-node";
import * as Schema from "./cma-types";

const record = await client.items.find<Schema.Post>("record-id", { nested: true });
console.log(inspectItem(record));
```

You can pass options such as `maxWidth` to control formatting. Pair it with `buildBlockRecord()` + `inspectItem()` around an update to see before / payload / after when debugging block mutations.

---

## Worked Examples via `cma:docs`

Long worked scripts for structured text and embedded blocks are maintained in the CMA reference. Fetch the canonical version on demand.

**Prerequisite:** the `datocms` npm package installed (normally bootstrapped per SKILL.md Step 1a). `cma:docs` itself needs *no* login and *no* linked project. If `npx datocms …` errors with "command not found", install the CLI (`npm install --save-dev datocms`) or invoke on demand with `npx --yes datocms cma:docs …`.

| Scenario | Command |
|---|---|
| Create a structured text document with multiple embedded blocks | `npx datocms cma:docs items create --expand "Example: Structured text fields"` |
| Transform a DAST tree (heading levels, link attrs, text replace) | `npx datocms cma:docs items update --expand "Example: Managing Structured Text documents"` |
| Mixed block mutations inside structured text (add + update + keep) | `npx datocms cma:docs items update --expand "Example: Managing blocks in Structured Text fields"` |
| Localized structured text | `npx datocms cma:docs items --expand "Example: Localized Structured Text field"` |

If a section title is renamed in the docs, list the available titles:

```bash
npx datocms cma:docs items update | grep -oE '<details><summary>[^<]+</summary>'
```

The full examples index (create, update, localization) is in `references/block-records-and-modular-content.md` under [`cma:docs` Examples Index](block-records-and-modular-content.md#cmadocs-examples-index).

---

## Common Pitfalls

### Invalid DAST Tree Structure

DAST enforces strict parent-child rules — see the [DAST Grammar](#dast-grammar) table above. The most common violation is putting a `block` node inside a `paragraph` instead of at root level:

```ts
// Invalid: block inside paragraph
{ type: "paragraph", children: [{ type: "block", item: ... }] }

// Valid: block at root, inlineBlock for inline embeds
{
  type: "root",
  children: [
    { type: "paragraph", children: [{ type: "span", value: "Text" }] },
    { type: "block", item: buildBlockRecord({...}) },
  ],
}
```

### Forgetting `nested: true` for Structured Text Embeds

Without `nested: true`, `block` and `inlineBlock` nodes contain string IDs in `item` instead of expanded block objects. Any `mapNodes` callback that expects `node.item.attributes` then reads `undefined`. See the mental model in `references/block-records-and-modular-content.md`.

### Confusing Block Nodes with Record-Link Nodes

`block` and `inlineBlock` embed new block records (the 5 rules apply to `item`). `itemLink` and `inlineItem` reference existing top-level records by string ID. Mixing those up produces API errors.

### Mutating the DAST in place

`mapNodes` expects you to return new node objects, not mutate the input. Always return `{ ...node, … }` so the transform is pure and subtrees that did not change pass through unchanged.
