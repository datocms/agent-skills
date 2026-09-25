import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as cma from '@datocms/cma-client-node';
import * as structuredText from 'datocms-structured-text-utils';
import ts from 'typescript';

const repoRoot = process.env.REFERENCE_REPO_ROOT
  ? resolve(process.env.REFERENCE_REPO_ROOT)
  : fileURLToPath(new URL('../../', import.meta.url));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function shippedExample(path, marker) {
  const markdown = readFileSync(resolve(repoRoot, path), 'utf8');
  const examples = [...markdown.matchAll(/^```ts\n([\s\S]*?)^```/gm)]
    .map((match) => match[1])
    .filter((source) => source.includes(marker));
  assert.equal(examples.length, 1, `exactly one example containing ${marker}`);
  const result = ts.transpileModule(examples[0], {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  assert.equal(result.diagnostics?.length ?? 0, 0, 'example must transpile');
  return result.outputText;
}

test('shipped draft publication example finishes pagination before mutating the selection', async () => {
  const source = shippedExample(
    'skills/datocms-cli/references/cma-script.md',
    '// tmp/scripts/publish-drafts.ts',
  );
  const exports = {};
  new Function('exports', source)(exports);

  // Use the SDK's actual listPagedIterator and mock only the API boundary.
  const client = cma.buildClient({ apiToken: 'synthetic-test-token' });
  const initialIds = Array.from({ length: 60 }, (_, index) => `draft-${index}`);
  const drafts = new Set(initialIds);
  const published = [];
  const pages = [];
  client.items.rawList = async ({ filter, page }) => {
    assert.equal(filter.fields._status.eq, 'draft');
    pages.push({ ...page, published: published.length });
    return {
      data: [...drafts].slice(page.offset, page.offset + page.limit).map((id) => ({
        id,
        type: 'item',
        attributes: {},
        relationships: { item_type: { data: { type: 'item_type', id: 'article' } } },
      })),
      meta: { total_count: drafts.size },
    };
  };
  client.items.publish = async (id) => {
    assert.ok(drafts.delete(id), `publish selected draft once: ${id}`);
    published.push(id);
    // A draft appearing after selection must remain outside the authorized batch.
    drafts.add('later-draft');
  };

  await exports.default(client);

  assert.deepEqual(published, initialIds);
  assert.deepEqual([...drafts], ['later-draft']);
  assert.deepEqual(pages, [
    { limit: 30, offset: 0, published: 0 },
    { limit: 30, offset: 30, published: 0 },
  ]);
});

test('shipped node transformation preserves inline and nested content while removing empty root paragraphs', async () => {
  const source = shippedExample(
    'skills/datocms-cma/references/editing-records.md',
    'mapNodes(currentItem.content,',
  );
  const inlineParagraphs = [
    { type: 'paragraph', children: [{ type: 'inlineItem', item: 'inline-record' }] },
    { type: 'paragraph', children: [{ type: 'inlineBlock', item: {
      id: 'inline-block', type: 'item', attributes: { label: 'Keep this block' },
      relationships: { item_type: { data: { type: 'item_type', id: 'image' } } },
    } }] },
  ];
  const emptyRecordLink = { type: 'paragraph', children: [{ type: 'itemLink', item: 'original-record', children: [{ type: 'span', value: '' }] }] };
  const nestedContent = [
    { type: 'list', style: 'numbered', children: [
      { type: 'listItem', children: [
        { type: 'paragraph', children: [{ type: 'span', value: '', marks: ['strong'] }] },
      ] },
      { type: 'listItem', children: [
        { type: 'paragraph', children: [{ type: 'span', value: 'Second item', marks: ['strong'] }] },
      ] },
    ] },
    { type: 'blockquote', children: [
      { type: 'paragraph', children: [{ type: 'span', value: '', marks: ['strong'] }] },
    ] },
  ];
  const content = {
    schema: 'dast',
    document: { type: 'root', children: [
      ...structuredClone(inlineParagraphs),
      ...structuredClone(nestedContent),
      structuredClone(emptyRecordLink),
      { type: 'paragraph', children: [{ type: 'span', value: ' \n ' }] },
      { type: 'paragraph', children: [{ type: 'link', url: 'https://example.com', children: [
        { type: 'span', value: '' },
      ] }] },
      { type: 'paragraph', children: [{ type: 'span', value: 'Keep this prose' }] },
    ] },
  };
  assert.equal(structuredText.validate(content).valid, true);
  let saved;
  const client = { items: {
    find: async () => ({ id: 'article', content }),
    update: async (id, payload) => {
      assert.equal(id, 'article');
      assert.equal(saved, undefined, 'single record update');
      saved = payload.content;
    },
  } };
  const runtime = {
    ...cma, ...structuredText, client, id: 'article',
    Schema: { Mention: { ID: 'mention' }, Cta: { ID: 'cta' }, Warn: { ID: 'warn' } },
  };
  const helpers = Object.entries(runtime).filter(([name]) => name !== 'default' && /^[A-Za-z_$][\w$]*$/.test(name));
  await new AsyncFunction(...helpers.map(([name]) => name), source)(...helpers.map(([, value]) => value));

  assert.equal(structuredText.validate(saved).valid, true);
  assert.deepEqual(saved.document.children.slice(0, 2), inlineParagraphs);
  assert.deepEqual(saved.document.children.slice(2, 4), nestedContent);
  assert.deepEqual(saved.document.children[4], {type:'paragraph',children:[{type:'itemLink',item:'NEW_RECORD_ID',children:[{type:'span',value:'',marks:['strong']}]}]}, 'the example retargets the link but must not delete its paragraph');
  assert.equal(saved.document.children.length, 7, 'inline paragraphs, nested containers, record link, prose, and appended paragraph');
  assert.equal(saved.document.children[5].children[0].value, 'Keep this prose');
  assert.equal(saved.document.children[6].children[0].value, 'Updated');
});

test('shipped locale backfill updates every page and preserves existing translations', async () => {
  const source = shippedExample(
    'skills/datocms-cma/references/editing-records.md',
    'await client.site.update({ locales:',
  );
  const client = cma.buildClient({ apiToken: 'synthetic-test-token' });
  const records = Array.from({ length: 35 }, (_, index) => ({
    id: `faq-${String(index).padStart(2, '0')}`,
    type: 'item',
    attributes: {
      question: { en: `Question ${index}`, it: `Domanda ${index}` },
      answer: { en: `Answer ${index}`, it: `Risposta ${index}` },
    },
    relationships: { item_type: { data: { type: 'item_type', id: 'faq' } } },
  }));
  const updatedIds = [];
  const pages = [];
  const orderings = [];
  let localesUpdated = false;
  client.site.update = async ({ locales }) => {
    assert.deepEqual(locales, ['en', 'it', 'es']);
    localesUpdated = true;
  };
  client.items.rawList = async ({ filter, version, order_by, page = { limit: 30, offset: 0 } }) => {
    assert.equal(localesUpdated, true, 'enable the locale before backfilling it');
    assert.equal(filter.type, 'faq_entry');
    assert.equal(version, 'current');
    pages.push({ ...page });
    orderings.push(order_by);
    const orderedRecords = order_by === 'id_ASC'
      ? [...records].sort((a, b) => a.id.localeCompare(b.id))
      : records;
    return {
      data: orderedRecords.slice(page.offset, page.offset + page.limit),
      meta: { total_count: records.length },
    };
  };
  client.items.update = async (id, payload) => {
    const record = records.find((record) => record.id === id);
    assert.ok(record, 'only selected records are updated');
    assert.ok(!updatedIds.includes(id), 'update each record once');
    assert.deepEqual(payload, {
      question: { ...record.attributes.question, es: '...' },
      answer: { ...record.attributes.answer, es: '...' },
    });
    updatedIds.push(id);
  };

  await new AsyncFunction('client', source)(client);

  assert.deepEqual(updatedIds, records.map((record) => record.id));
  assert.deepEqual(pages, [{ limit: 30, offset: 0 }, { limit: 30, offset: 30 }]);
  assert.deepEqual(orderings, ['id_ASC', 'id_ASC'], 'pagination order remains stable when translations change');
});
