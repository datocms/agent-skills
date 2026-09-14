# Creating and editing Structured Text

## Choose the smallest operation

- Controlled prose authoring or text-shaped edits: Dastdown `parse` / `serialize`.
- Arbitrary Markdown/HTML input: conversion workflow; Dastdown does not implement CommonMark.
- Node structure, marks, links, metadata, or block slots: typed guards and `mapNodes` from `datocms-structured-text-utils`.
- Block internals, duplication, or persistence: combine document operations with the CMA integration's typed helpers. A block ID alone contains no editable fields.

Read only the target field/document. Preserve unaffected nodes and reference payloads. Empty or unset content is a task decision: construct requested content for a create, or leave an unset field alone when the request only transforms existing documents.

## Dastdown round-trip

```js
import { parse, serialize } from 'datocms-structured-text-dastdown';

export function replaceWording(original) {
  const serialized = serialize(original);
  const edited = serialized.replace('Old wording', 'Clear wording');
  return parse(edited, original);
}
```

Use a targeted edit on known prose; avoid replacements that unintentionally modify URLs, IDs, code, or markup. For edits spanning marks/links, inspect the relevant nodes before deciding whether text or AST editing is simpler.

`parse(edited, original)` restores original `block` / `inlineBlock` objects by ID. Surviving block objects retain identity; unknown block placeholders throw. Keep the original lookup unchanged. `serialize` emits IDs for blocks even after a nested CMA read; block internals stay opaque.

Controlled new content can use `parse('Your **content**')`. `parse(null)` / `parse(undefined)` return `null`; `parse('')` creates one empty paragraph. Do not mistake this for faithful parsing of arbitrary Markdown: underscore emphasis, alternative list syntax, image syntax, tables, and raw HTML require the conversion path.

## Dastdown syntax

Supported Markdown-like forms: headings `#`–`######`, paragraphs, hyphen bullets, numbered lists, two-space nested lists, blockquotes, backtick code fences, thematic breaks, explicit `[text](url)` links, escapes, `**strong**`, `*emphasis*`, inline code, `~~strike~~`. Tables unsupported.

The canonical example below uses synthetic reference IDs. For editing an existing document, retain real IDs from that document; placeholder syntax never creates records.

````markdown
# Heading {style="display"}

Paragraph with ==highlight==, ++underline++, <m k="footnote-ref">custom mark</m>, and a<br/>line break.
{style="lead"}

> Quote body.
{attribution="Oscar Wilde"}

```js {highlight=[0,2]}
const first = 1;
const second = 2;
console.log(first + second);
```

[External link](https://example.com){rel="nofollow" target="_blank"}
[Record link](dato:item/RECORD_ID){rel="nofollow"}
<inlineItem id="INLINE_RECORD_ID"/> <inlineBlock id="INLINE_BLOCK_ID"/>

<block id="BLOCK_ID"/>
````

Mark canonical order, outer to inner: `highlight → strikethrough → underline → strong → emphasis → code`; custom marks innermost, alphabetical. Serialization drops redundant empty spans and merges adjacent spans with identical marks. Assert semantic preservation rather than byte-identical serialization.

## Tree transformations

`mapNodes` walks bottom-up. Return a node to keep/replace it, an array to expand it into siblings, or `null`/`undefined` to remove it. Expanding/removing the root throws. `findFirstNode` / `collectNodes` return node/path entries; guards narrow node types.

```js
import { isHeading, isSpan, mapNodes } from 'datocms-structured-text-utils';

export function updateDocument(original) {
  return mapNodes(original, (node) => {
    if (isHeading(node) && node.level === 1) return { ...node, level: 2 };
    if (isSpan(node)) return { ...node, value: node.value.replace('Old wording', 'Clear wording') };
    return node;
  });
}
```

Preserve properties through object spreads. Change only requested marks; preserve custom marks, styles, and link metadata. External links use `url`, record links use `item`; use the matching guard rather than treating every `item` field as interchangeable.

Check structural constraints when returning arrays or moving nodes. Root-only blocks cannot become list children. Paragraphs containing inline blocks or record references are not empty merely because their text spans are empty.

`mapNodes` traverses DAST children, not the fields inside an embedded block. Edit nested Structured Text block fields explicitly through their own document operation. For asynchronous block work, use the relevant async utilities or the CMA integration's established sequence.

## Combining prose and block edits

Keep this order when multiple operations share a document:

1. Serialize/edit/parse against the **original** document, if a text round-trip is needed.
2. Apply requested AST and block changes to that result.
3. Append new root nodes after the traversal.
4. Validate the final document and hand it to the integration owner for its single final update.

Parsing after block mutations can restore stale original objects; newly created block IDs have no original lookup entry. Duplicate from the original block source when later transformations may have changed the working tree. Skip steps the task does not need.

## Verification

Compare requested changes and preserved content separately: prose/structure changed as requested; untouched blocks, inline references, link metadata, custom marks and other locales remained intact. Then validate document structure. Persistence checks belong to the integration owner.

[Traversal implementation](https://github.com/datocms/structured-text/blob/97fc3da80b466267f91ba87f064f173f907af5f9/packages/utils/src/manipulation.ts#L205-L234), [Dastdown reference restoration](https://github.com/datocms/structured-text/blob/97fc3da80b466267f91ba87f064f173f907af5f9/packages/dastdown/src/parse.ts#L802-L854), [Dastdown non-goals](https://github.com/datocms/structured-text/blob/97fc3da80b466267f91ba87f064f173f907af5f9/packages/dastdown/SPEC.md#L29-L41).
