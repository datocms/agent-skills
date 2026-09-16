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
  : fileURLToPath(new URL('../', import.meta.url));
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

test('shipped node transformation preserves inline content while removing empty paragraphs', async () => {
  const source = shippedExample(
    'skills/datocms-cma/references/editing-records.md',
    'content = mapNodes(content,',
  );
  const inlineParagraphs = [
    { type: 'paragraph', children: [{ type: 'inlineItem', item: 'inline-record' }] },
    { type: 'paragraph', children: [{ type: 'inlineBlock', item: {
      id: 'inline-block', type: 'item', attributes: { label: 'Keep this block' },
      relationships: { item_type: { data: { type: 'item_type', id: 'image' } } },
    } }] },
  ];
  const content = {
    schema: 'dast',
    document: { type: 'root', children: [
      ...structuredClone(inlineParagraphs),
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
  assert.equal(saved.document.children.length, 4, 'two inline paragraphs, prose, and the appended paragraph');
  assert.equal(saved.document.children[2].children[0].value, 'Keep this prose');
  assert.equal(saved.document.children[3].children[0].value, 'Updated');
});
