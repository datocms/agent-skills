import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse, serialize } from 'datocms-structured-text-dastdown';

const references = new URL(
  '../../skills/datocms-structured-text/references/',
  import.meta.url,
);
const editing = readFileSync(new URL('editing.md', references), 'utf8');
const documentModel = readFileSync(
  new URL('document-model.md', references),
  'utf8',
);

function exampleInSection(markdown, heading, language, fence = '```') {
  const headingLine = `## ${heading}\n`;
  const sections = markdown.split(headingLine);
  assert.equal(sections.length, 2, `exactly one section named ${heading}`);
  const section = sections[1].split('\n## ')[0];
  const escapedFence = fence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^${escapedFence}${language}\\n([\\s\\S]*?)\\n${escapedFence}$`,
    'gm',
  );
  const matches = [...section.matchAll(pattern)];
  assert.equal(
    matches.length,
    1,
    `exactly one ${language} example in ${heading}`,
  );
  return matches[0][1];
}

const example = exampleInSection(
  editing,
  'Dastdown syntax',
  'markdown',
  '````',
);
const tree = parse(example);
const nodes = [];
function walk(node) {
  nodes.push(node);
  node.children?.forEach(walk);
}
walk(tree.document);

// Preserve every assertion on the shipped syntax example.
assert(nodes.some((n) => n.type === 'heading' && n.style === 'display'));
assert(nodes.some((n) => n.type === 'paragraph' && n.style === 'lead'));
assert(
  nodes.some((n) => n.type === 'blockquote' && n.attribution === 'Oscar Wilde'),
);
assert(
  nodes.some(
    (n) =>
      n.type === 'code' &&
      n.language === 'js' &&
      JSON.stringify(n.highlight) === '[0,2]',
  ),
);
for (const mark of ['highlight', 'underline', 'footnote-ref'])
  assert(
    nodes.some((n) => n.marks?.includes(mark)),
    mark,
  );
assert(
  nodes.some((n) => n.type === 'span' && n.value.includes('\n')),
  'hard line break',
);
assert(
  nodes.some(
    (n) =>
      n.type === 'link' &&
      n.url === 'https://example.com' &&
      n.meta?.some((m) => m.id === 'rel' && m.value === 'nofollow'),
  ),
);
for (const [type, id] of [
  ['itemLink', 'RECORD_ID'],
  ['inlineItem', 'INLINE_RECORD_ID'],
  ['inlineBlock', 'INLINE_BLOCK_ID'],
  ['block', 'BLOCK_ID'],
])
  assert(
    nodes.some((n) => n.type === type && n.item === id),
    type,
  );
assert.deepEqual(
  parse(serialize(tree)),
  tree,
  'all constructs survive serialization',
);

const block = {
  id: 'BLOCK_ID',
  type: 'item',
  item_type: { id: 'MODEL', type: 'item_type' },
  title: 'Block fixture',
};
const inline = { ...block, id: 'INLINE_BLOCK_ID', title: 'Inline fixture' };
const original = structuredClone(tree);
function hydrate(node) {
  if (node.type === 'block') node.item = block;
  if (node.type === 'inlineBlock') node.item = inline;
  node.children?.forEach(hydrate);
}
hydrate(original.document);
const restored = parse(example, original);
assert.deepEqual(restored, original, 'synthetic block payloads restored by ID');
assert.throws(() => parse(example.replace('BLOCK_ID', 'UNKNOWN'), original));

function findNode(document, type) {
  const pending = [document.document];
  while (pending.length) {
    const node = pending.shift();
    if (node.type === type) return node;
    pending.push(...(node.children ?? []));
  }
  assert.fail(`missing ${type} node`);
}

assert.strictEqual(
  findNode(restored, 'block').item,
  block,
  'round-trip preserves block object identity',
);
assert.strictEqual(
  findNode(restored, 'inlineBlock').item,
  inline,
  'round-trip preserves inline block object identity',
);
for (const [type, id] of [
  ['block', 'BLOCK_ID'],
  ['inlineBlock', 'INLINE_BLOCK_ID'],
]) {
  const unknown = example.replace(
    `<${type} id="${id}"/>`,
    `<${type} id="UNKNOWN"/>`,
  );
  assert.throws(
    () => parse(unknown, original),
    (error) =>
      error.name === 'DastdownParseError' &&
      error.message.includes(
        `${type} with id "UNKNOWN" was not found in the original document`,
      ),
    `unknown ${type} reference has an actionable diagnostic`,
  );
}

// Test-local modules exercise the extracted exports and resolve their real imports.
const temporary = mkdtempSync(
  join(dirname(fileURLToPath(import.meta.url)), '.examples-'),
);
try {
  const examples = [
    ['round-trip.mjs', exampleInSection(editing, 'Dastdown round-trip', 'js')],
    ['traversal.mjs', exampleInSection(editing, 'Tree transformations', 'js')],
    [
      'validation.mjs',
      exampleInSection(documentModel, 'Validation and diagnosis', 'js'),
    ],
  ];
  for (const [filename, source] of examples)
    writeFileSync(join(temporary, filename), source);
  const { replaceWording } = await import(
    pathToFileURL(join(temporary, 'round-trip.mjs'))
  );
  const { updateDocument } = await import(
    pathToFileURL(join(temporary, 'traversal.mjs'))
  );
  const { assertDocument } = await import(
    pathToFileURL(join(temporary, 'validation.mjs'))
  );

  const roundTripInput = {
    ...original,
    document: {
      ...original.document,
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'span', value: 'Old wording' }],
        },
        ...original.document.children,
      ],
    },
  };
  const roundTripSnapshot = structuredClone(roundTripInput);
  const rewritten = replaceWording(roundTripInput);
  const expectedRewrite = structuredClone(roundTripSnapshot);
  expectedRewrite.document.children[0].children[0].value = 'Clear wording';
  assert.deepEqual(
    rewritten,
    expectedRewrite,
    'exported round-trip changes only requested prose',
  );
  assert.deepEqual(
    roundTripInput,
    roundTripSnapshot,
    'round-trip leaves its original lookup unchanged',
  );
  assert.strictEqual(
    findNode(rewritten, 'block').item,
    block,
    'exported round-trip restores the original block object',
  );
  assert.strictEqual(
    findNode(rewritten, 'inlineBlock').item,
    inline,
    'exported round-trip restores the original inline block object',
  );
  assert(
    !serialize(roundTripInput).includes('Block fixture'),
    'nested block contents stay opaque when serialized',
  );

  const untouchedBlock = {
    id: 'NESTED_BLOCK',
    attributes: {
      title: 'Old wording inside a block',
      body: parse('Old wording inside a nested document'),
    },
  };
  const traversalInput = {
    schema: 'dast',
    document: {
      type: 'root',
      children: [
        {
          type: 'heading',
          level: 1,
          style: 'display',
          children: [
            {
              type: 'span',
              value: 'Old wording',
              marks: ['strong', 'footnote-ref'],
            },
          ],
        },
        {
          type: 'heading',
          level: 2,
          children: [{ type: 'span', value: 'Keep this heading' }],
        },
        {
          type: 'paragraph',
          style: 'lead',
          children: [
            {
              type: 'span',
              value: 'Keep this text ',
              marks: ['highlight', 'footnote-ref'],
            },
            {
              type: 'link',
              url: 'https://example.com/Old%20wording',
              meta: [{ id: 'target', value: '_blank' }],
              children: [{ type: 'span', value: 'Old wording' }],
            },
            { type: 'inlineItem', item: 'INLINE_RECORD_ID' },
            { type: 'inlineBlock', item: inline },
            {
              type: 'itemLink',
              item: 'RECORD_ID',
              meta: [{ id: 'rel', value: 'nofollow' }],
              children: [{ type: 'span', value: 'Keep record link' }],
            },
          ],
        },
        { type: 'block', item: untouchedBlock },
        { type: 'code', language: 'js', highlight: [0], code: 'Old wording' },
        { type: 'thematicBreak' },
      ],
    },
  };
  const traversalSnapshot = structuredClone(traversalInput);
  const expectedTraversal = structuredClone(traversalInput);
  expectedTraversal.document.children[0].level = 2;
  expectedTraversal.document.children[0].children[0].value = 'Clear wording';
  expectedTraversal.document.children[2].children[1].children[0].value =
    'Clear wording';
  const transformed = updateDocument(traversalInput);
  assert.deepEqual(
    transformed,
    expectedTraversal,
    'exported traversal preserves other headings, styles, marks, URLs, metadata, refs and code',
  );
  assert.deepEqual(
    traversalInput,
    traversalSnapshot,
    'traversal leaves the source unchanged',
  );
  assert.strictEqual(
    findNode(transformed, 'block').item,
    untouchedBlock,
    'DAST traversal does not recurse into block fields',
  );
  assert.strictEqual(
    findNode(transformed, 'inlineBlock').item,
    inline,
    'traversal retains untouched inline block payloads',
  );

  assert.strictEqual(
    assertDocument(tree),
    tree,
    'validation returns the original valid document',
  );
  for (const invalid of [
    null,
    undefined,
    { value: tree },
    { schema: 'dast', document: { type: 'paragraph', children: [] } },
  ]) {
    assert.throws(
      () => assertDocument(invalid),
      /Expected a DAST document wrapper/,
      'invalid wrapper has a useful error',
    );
  }
  const invalidStructures = [
    [
      {
        schema: 'dast',
        document: {
          type: 'root',
          children: [{ type: 'span', value: 'Preserve this text' }],
        },
      },
      /"root" has invalid child "span"/,
    ],
    [
      {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'block', item: 'BLOCK_ID' }],
            },
          ],
        },
      },
      /"paragraph" has invalid child "block"/,
    ],
    [
      {
        schema: 'dast',
        document: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              className: 'unsupported',
              children: [{ type: 'span', value: 'Keep this content' }],
            },
          ],
        },
      },
      /"paragraph" has an invalid attribute "className"/,
    ],
    [
      {
        schema: 'dast',
        document: { type: 'root', children: [{ type: 'table', children: [] }] },
      },
      /"root" has invalid child "table"/,
    ],
    [
      {
        schema: 'dast',
        document: {
          type: 'root',
          children: [{ type: 'paragraph', children: ['malformed child'] }],
        },
      },
      /"paragraph" has invalid child "undefined"/,
    ],
  ];
  for (const [invalid, diagnostic] of invalidStructures) {
    const snapshot = structuredClone(invalid);
    assert.throws(
      () => assertDocument(invalid),
      diagnostic,
      'invalid node reports its rejected shape',
    );
    assert.deepEqual(
      invalid,
      snapshot,
      'diagnosis must not silently drop or repair content',
    );
  }
  const malformedMetadata = {
    schema: 'dast',
    document: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'link',
              url: 'https://example.com',
              meta: [null],
              children: [{ type: 'span', value: 'Keep the link text' }],
            },
          ],
        },
      ],
    },
  };
  const malformedSnapshot = structuredClone(malformedMetadata);
  assert.throws(
    () => assertDocument(malformedMetadata),
    (error) =>
      error.name === 'Error' &&
      error.message.startsWith('DAST validation failed: ') &&
      error.message.endsWith('Check node types and required properties.'),
    'validator exceptions receive the documented diagnostic context',
  );
  assert.deepEqual(
    malformedMetadata,
    malformedSnapshot,
    'validator exception must not alter the input',
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

console.log(
  'Dastdown shipped examples: syntax, styles, links, references, round-trip identity, unknown-reference diagnostics, traversal preservation, and document validation passed.',
);
