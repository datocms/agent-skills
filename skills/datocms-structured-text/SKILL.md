---
name: datocms-structured-text
description: >-
  Load BEFORE building, converting, rewriting, inspecting or validating a
  DatoCMS Structured Text (DAST) document. With `datocms-cma` when the document
  is in a record: importing Markdown or HTML into a field, adding, moving or
  removing nodes, blocks, inline records, links or marks, rewriting prose,
  changing headings or lists. Alone for local work: explain nodes and marks,
  write a document, convert Markdown, HTML or a Google Docs export, edit a tree
  while preserving embedded references, diagnose an invalid document, tell CMA
  and GraphQL representations apart, extract text, serialize to HTML, Dastdown.
  Not for saving a ready document unchanged, publishing or editing other fields,
  choosing a field type (`datocms-content-modeling`), GraphQL queries
  (`datocms-cda`), framework rendering (`datocms-frontend-integrations`) or
  Slate editing in a plugin (`datocms-plugin`).
---

# DatoCMS Structured Text

DAST documents: understand, create, edit, convert, validate. Local document work needs no project, token, login or CLI.

## Pick the tool for the change

Document = `{ schema: "dast", document: { type: "root", children: [...] } }`, or `null` when empty. **Existing document: transform what was read, never retype it** — a retyped tree drops words, marks, `meta`, IDs.

| Change | Tool |
| - | - |
| New content | `parse("## Title\n\nText with **strong**")` — Dastdown text, no hand-built nodes |
| Wording, marks, links, lists; removing or reordering blocks | Text pass: `serialize(doc)` → edit the string → `parse(text, doc)` (blocks come back by ID; their fields are not in the text) |
| Same change on many nodes, a block's fields, a node swapped or added in place | Node pass: one `mapNodes` walk with guards. Return the node, `[node, newNode]`, or `null` to drop |
| Markdown, HTML, Google Docs export in; plain text or HTML out | [Conversion](references/conversion.md) |

- Combined: text pass → node pass → root appends → one write. A text pass after a node pass restores stale blocks and throws on new ones.
- Dastdown ≠ Markdown. `- ` bullets, `*emphasis*`, `==highlight==`, `++underline++`, `[text](dato:item/RECORD_ID)`, `<block id="…"/>`, `<inlineBlock id="…"/>`, `<inlineItem id="…"/>`. `_emphasis_`, `*` bullets, images, tables, raw HTML stay literal or are misread, with no error. Full syntax: [Editing](references/editing.md).
- Often wrong: `block` sits under `root` only, `inlineBlock` in text; marks are `strong` / `emphasis`, never `bold` / `italic`; `meta` of a link is `[{ id, value }]`; no table node, no image node (an image is a block model). Every node and what it holds: [Document model](references/document-model.md).
- Never save a CDA response (`{ value, blocks, links }`) as a CMA value, or hand DAST to a plugin's Slate form.

## In a record (with `datocms-cma`)

`datocms-cma` owns route, read, write, readback; this is the document part. In `datocms cma:script` everything below is ambient (no imports); elsewhere import from `@datocms/cma-client-node`, `datocms-structured-text-utils`, `datocms-structured-text-dastdown`, and `Schema` from generated types (`../datocms-cma/references/type-generation.md`).

```ts
const record = await client.items.find<Schema.GuidePage>("RECORD_ID", { nested: true });
const plain = (doc: FieldValueInRequest<typeof record, "body">) => (doc ? reduceNodes(doc, (text, node) => text + (isSpan(node) ? node.value : ""), "") : "");
if (!record.body) throw new Error("Field is empty");

// 1. Text pass. The round trip must keep the text first: a newline inside a code-marked span does not survive it.
if (plain(parse(serialize(record.body), record.body)) !== plain(record.body)) throw new Error("Text pass unsafe here: node pass only");
// Annotate the result with the field's own type, or step 2 fails type-checking.
const reworded: typeof record.body = parse(serialize(record.body).replace("Old wording", "Clear wording"), record.body);
if (!reworded) throw new Error("Nothing parsed");

// 2. Node pass. Annotate the result as a request value: it then takes edited and new blocks.
const body: NonNullable<FieldValueInRequest<typeof record, "body">> = mapNodes(reworded, (node) => {
  // Document nodes: isBlockWithItemOfType / isInlineBlockWithItemOfType. isBlockOfType is for block fields.
  if (isBlockWithItemOfType(Schema.CalloutBlock.ID, node)) {
    return { ...node, item: buildBlockRecord<Schema.CalloutBlock>({ id: node.item.id, tone: "warning" }) }; // id + changed fields
  }
  if (isHeading(node) && node.level === 1) return { ...node, level: 2 as const };
  return node; // everything else, untouched blocks included
});

// 3. A new block at the end. Next to an existing node: return [node, newNode] in step 2.
body.document.children.push({
  type: "block",
  item: buildBlockRecord<Schema.CalloutBlock>({ item_type: Schema.CalloutBlock.REF, text: "New callout", tone: "info" }),
});

await client.items.update<Schema.GuidePage>(record.id, { body });

// Read back with the same guards. A cast (`as any`) gets the whole script rejected.
const saved = await client.items.find<Schema.GuidePage>(record.id, { nested: true });
if (saved.body) {
  const callouts = collectNodes(saved.body, isBlockWithItemOfType(Schema.CalloutBlock.ID)).map(({ node }) => node.item.attributes);
  console.log(serialize(saved.body), JSON.stringify(callouts));
}
```

- Field = its API key on the record (`record.body`, `record.content`…): take it from the schema. Localized: read `record.body.en`, write `{ ...record.body, en: value }`.
- New document that also gets blocks: `const parsed = parse(text); if (!parsed) throw …; const body: NonNullable<FieldValueInRequest<typeof record, "body">> = parsed;` then `push` / `splice` the block nodes.
- Duplicating or moving blocks, documents inside blocks, adding a locale: [editing records](../datocms-cma/references/editing-records.md) § Structured text.

## Scope

- Conversion returns a document. Importing into a project also needs a destination mapping and an authorized write; local work gets no authentication or schema setup.
- Report unsupported source content and unresolved mappings (a URL is not a record link without an explicit URL-to-record mapping). Never invent IDs.
- Large documents stay in files: inspect excerpts and diagnostics, not whole trees. Packages: only what the operation needs, in task-local scratch. Google Docs: an available document connector or a user export — no new Google authentication here.

## Other owners

GraphQL selection and the CDA envelope → `datocms-cda` ([querying Structured Text](../datocms-cda/references/structured-text.md)); rendering components → `datocms-frontend-integrations`; Slate values in a plugin → `datocms-plugin` ([editor values](../datocms-plugin/references/structured-text.md)); script runtime, migrations → `datocms-cli` ([scripting](../datocms-cli/references/cma-script.md)); field design → `datocms-content-modeling`. Sibling skill absent → name it and how to install it; don't open a missing file.

## Done when

Requested change present; untouched nodes, blocks, links, marks and other locales as before (read back through the integration owner); unsupported content and unresolved mappings reported. Say which checks ran: library validation, content preservation, project readback.
