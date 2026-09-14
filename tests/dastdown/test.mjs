import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse, serialize } from 'datocms-structured-text-dastdown';
const path = 'skills/datocms-cma/references/records.md';
const markdown = readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const example = markdown.match(/````markdown\n([\s\S]*?)\n````/)[1];
const tree = parse(example);
const nodes = [];
function walk(node) { nodes.push(node); node.children?.forEach(walk); }
walk(tree.document);
assert(nodes.some(n => n.type === 'heading' && n.style === 'display'));
assert(nodes.some(n => n.type === 'paragraph' && n.style === 'lead'));
assert(nodes.some(n => n.type === 'blockquote' && n.attribution === 'Oscar Wilde'));
assert(nodes.some(n => n.type === 'code' && n.language === 'js' && JSON.stringify(n.highlight) === '[0,2]'));
for (const mark of ['highlight', 'underline', 'footnote-ref'])
    assert(nodes.some(n => n.marks?.includes(mark)), mark);
assert(nodes.some(n => n.type === 'span' && n.value.includes('\n')), 'hard line break');
assert(nodes.some(n => n.type === 'link' && n.url === 'https://example.com' && n.meta?.some(m => m.id === 'rel' && m.value === 'nofollow')));
for (const [type, id] of [['itemLink', 'RECORD_ID'], ['inlineItem', 'INLINE_RECORD_ID'], ['inlineBlock', 'INLINE_BLOCK_ID'], ['block', 'BLOCK_ID']])
    assert(nodes.some(n => n.type === type && n.item === id), type);
assert.deepEqual(parse(serialize(tree)), tree, 'all constructs survive serialization');
const block = { id: 'BLOCK_ID', type: 'item', item_type: { id: 'MODEL', type: 'item_type' }, title: 'Block fixture' };
const inline = { ...block, id: 'INLINE_BLOCK_ID', title: 'Inline fixture' };
const original = structuredClone(tree);
function hydrate(n) { if (n.type === 'block')
    n.item = block; if (n.type === 'inlineBlock')
    n.item = inline; n.children?.forEach(hydrate); }
hydrate(original.document);
assert.deepEqual(parse(example, original), original, 'synthetic block payloads restored by ID');
assert.throws(() => parse(example.replace('BLOCK_ID', 'UNKNOWN'), original));
console.log('Dastdown shipped example: syntax, styles, links, references, round-trip, block rehydration, and unknown-reference rejection passed.');
