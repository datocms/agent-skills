import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import ts from 'typescript';
import { measureContext } from '../scripts/check-skill-context.mjs';

// Reads shipped skills by repo-relative path; run from the repo root whatever the caller's cwd.
process.chdir(new URL('../../', import.meta.url).pathname);

const contextBase = '27c410f7952bf14d12c0284a81cfb5d5d266fb6c';
const retentionBase = '3d6855fb87ab18a0abb556176819f5a7ee0f31a4';
// Exact compatibility projection from remote-mcp; it consumes the whole files.
// https://github.com/datocms/remote-mcp/blob/beeca70bdf702461ae8e226bfd9714d8e58f33ac/src/tools/getApiMethods/index.ts#L69-L74
const project = (text) => text.split('\n').filter((line) => !line.includes('cma:')).join('\n');
const markdown = unified().use(remarkParse).use(remarkGfm);
const textOf = (node) => node.value ?? (node.children ?? []).map(textOf).join('');
const semanticTree = (node) => JSON.parse(JSON.stringify(node, (key, value) => key === 'position' ? undefined : value));

function visit(node, callback) {
  callback(node);
  for (const child of node.children ?? []) visit(child, callback);
}

function parseMarkdown(source, label) {
  const tree = markdown.parse(source);
  const lines = source.split('\n');
  visit(tree, (node) => {
    if (node.type !== 'code') return;
    const opening = lines[node.position.start.line - 1].match(/^\s*(`{3,}|~{3,})/);
    assert.ok(opening, `${label}: expected fenced example at line ${node.position.start.line}`);
    const fence = opening[1];
    const closing = new RegExp(`^\\s*${fence[0]}{${fence.length},}\\s*$`);
    assert.ok(node.position.end.line > node.position.start.line && closing.test(lines[node.position.end.line - 1]), `${label}: unclosed example at line ${node.position.start.line}`);
  });
  return tree;
}

function withoutCliHints(node, source) {
  if (node.type !== 'root') {
    const fragment = source.slice(node.position.start.offset, node.position.end.offset);
    const lines = fragment.split('\n').filter((line) => line.trim());
    if (lines.length && lines.every((line) => line.includes('cma:'))) {
      assert.match(fragment, /CLI/i, 'The server filter may remove only explicitly scoped CLI hints');
      return null;
    }
  }
  return {
    ...node,
    ...(node.children ? { children: node.children.map((child) => withoutCliHints(child, source)).filter(Boolean) } : {}),
  };
}

function section(tree, title) {
  const start = tree.children.findIndex((node) => node.type === 'heading' && textOf(node) === title);
  assert.notEqual(start, -1, `Missing workflow section: ${title}`);
  const heading = tree.children[start];
  let end = start + 1;
  while (end < tree.children.length && !(tree.children[end].type === 'heading' && tree.children[end].depth <= heading.depth)) end++;
  return tree.children.slice(start, end).map(semanticTree);
}

// Preserve domain workflows, allowing only the reviewed corrections listed below.
// Compare their full prose, lists, tables and code with the reviewed base.
const preservedWorkflows = {
  records: [
    'Field value formats',
    'Selective publish / unpublish',
    'validateNew / validateExisting — preflight without commit',
    'Versions and restore',
    "dastdown syntax — what's NOT plain markdown",
    'Bulk operations are async + 200-cap',
    'Limits per record',
    'Errors on writes',
    'Optimistic locking via meta.current_version',
  ],
  'editing-records': [
    'Workflow',
    'Block rules in detail',
    'Modular content (rich_text)',
    'Single block (single_block)',
    'Structured text (structured_text)',
    'Structured text: Pass 1, dastdown round-trip',
    'Structured text: Pass 2, mapNodes walk',
    'Localized fields and adding a locale',
    'Typing values you build up in code',
    'Verify saved content',
  ],
};

// Reviewed corrections to the base, per guide: [before, after] pairs applied exactly once each.
// An intended change to a section listed above is added here in the same commit; the list is
// emptied when the base moves to a commit that already holds the reviewed text.
const reviewedCorrections = {
  records: [
    // Measured on the API: a date-time without an offset is stored as UTC.
    [
      "| `date_time` | ISO 8601 with offset, `\"2026-03-01T09:30:00+01:00\"`, or `null` |",
      "| `date_time` | ISO 8601 with offset, `\"2026-03-01T09:30:00+01:00\"`, or `null`. Without an offset the time is taken as UTC, not as the editor's timezone |",
    ],
    // Client types: the two limits sit under the nullable `extras` of the public info.
    [
      "`client.publicInfo.find()` returns this project's `blocks_per_item` and `blocks_depth`.",
      "`client.publicInfo.find()` returns this project's `extras.blocks_per_item` and `extras.blocks_depth` (`extras` can be `null`).",
    ],
    // Measured in a live case: dependencies published one by one stayed live after the cascade was refused.
    [
      "A single cascading publication runs in a transaction: a blocked or invalid dependency can abort the requested publication and its cascade.",
      "Publish the linking record only and let the API cascade. A single cascading publication runs in a transaction: a blocked or invalid dependency can abort the requested publication and its cascade, while linked records you publish yourself one by one stay live when a later one is refused.",
    ],
    // Measured on the API: the first publication of a record cannot leave its non-localized content out.
    [
      "Useful when some locales finish before others — publish ready locales now without lying about field values to satisfy validators.",
      "Useful when some locales finish before others — publish ready locales now without lying about field values to satisfy validators.\n\nPublishing a record that has no published version (never published, or unpublished): if its model has non-localized fields, send `non_localized_content: true` with the first locales (`false` fails with `NON_LOCALIZED_CONTENT_MUST_BE_PUBLISHED`). Those fields are part of that first version, not an extra publication, so \"publish only English\" on such a record is `{ content_in_locales: [\"en\"], non_localized_content: true }`. A model with `all_locales_required` cannot publish one locale first: `ALL_LOCALES_MUST_BE_PUBLISHED` until every locale is sent.",
    ],
  ],
  'editing-records': [
    // Measured on the API: a locale left out of one field is rejected; left out of all, it is deleted
    // (never on a model with `all_locales_required`).
    [
      "- **Localized block field:** the value is `{ en: [...], it: [...] }` with separate blocks per locale. Send every locale: a locale you leave out is deleted with its blocks.",
      "- **Localized block field:** the value is `{ en: [...], it: [...] }` with separate blocks per locale. Send every locale the record has: leaving one out is rejected (`INVALID_LOCALES`) unless every localized field of the record is sent without it: then that locale is deleted with its blocks (never with `all_locales_required`).",
    ],
    [
      "- **Send every locale of a field you update.** A locale left out of the object is removed: spread the current value and change what you need (`{ ...it.question, es: \"...\" }`).",
      "- **Send every locale of a field you update:** spread the current value and change what you need (`{ ...it.question, es: \"...\" }`). A locale left out of one field is rejected with `INVALID_LOCALES`; left out of every localized field of the record, all sent together, it is removed from the record (that is how a translation is deleted, never with `all_locales_required`: an empty string keeps the locale).",
    ],
    // Measured through the CLI: a callback that returns `[node, newNode]` for a child of the root adds a sibling there.
    [
      "`mapNodes` can't add siblings at root, so new top-level nodes (a paragraph, `{ type: \"block\", item: buildBlockRecord(...) }`) are pushed into `content.document.children` after the walk.",
      "New top-level nodes (a paragraph, `{ type: \"block\", item: buildBlockRecord(...) }`): next to an existing node return `[node, newNode]` from the walk; at the end push into `content.document.children` after it.",
    ],
  ],
};

function withReviewedCorrections(name, source) {
  for (const [before, after] of reviewedCorrections[name]) {
    assert.equal(source.split(before).length, 2, 'apply each reviewed correction exactly once');
    source = source.replace(before, after);
  }
  return source;
}

test('optional MCP keeps the agreed discovery and entrypoint context budgets', () => {
  const report = measureContext(process.cwd(), contextBase);
  assert.equal(report.passed, true, JSON.stringify(report, null, 2));
});

for (const [name, workflows] of Object.entries(preservedWorkflows)) {
  const path = `skills/datocms-cma/references/${name}.md`;
  const source = readFileSync(path, 'utf8');
  const baseline = execFileSync('git', ['show', `${retentionBase}:${path}`], { encoding: 'utf8' });
  const reviewed = withReviewedCorrections(name, baseline);
  // The server drops CLI-only lines from the base too, so each mode compares like with like.
  const previous = { raw: markdown.parse(reviewed), projected: markdown.parse(project(reviewed)) };

  test(`${name}: exact MCP filter preserves the full Markdown structure and shared content`, () => {
    const raw = parseMarkdown(source, `${name} raw`);
    const projected = parseMarkdown(project(source), `${name} projected`);
    assert.deepEqual(semanticTree(projected), semanticTree(withoutCliHints(raw, source)));
  });

  for (const [mode, content] of [['raw', source], ['projected', project(source)]]) {
    test(`${name} ${mode}: domain workflows retain the reviewed base content`, () => {
      const tree = parseMarkdown(content, `${name} ${mode}`);
      for (const title of workflows) assert.deepEqual(section(tree, title), section(previous[mode], title), `Changed domain workflow: ${title}`);
    });

    test(`${name} ${mode}: TypeScript examples have valid syntax`, () => {
      const tree = parseMarkdown(content, `${name} ${mode}`);
      const examples = [];
      visit(tree, (node) => {
        if (node.type === 'code' && ['ts', 'typescript'].includes(node.lang)) examples.push(node);
      });
      assert.ok(examples.length > 0);
      for (const example of examples) {
        // This example documents object properties rather than a full statement.
        const snippet = /^question: \{/.test(example.value) ? `const payload = {\n${example.value}\n};` : example.value;
        const parsed = ts.createSourceFile(`${name}.ts`, snippet, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        assert.deepEqual(parsed.parseDiagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')), [], `${name} ${mode} example at line ${example.position.start.line}`);
      }
    });
  }
}

test('record version semantics and runtime guidance survive the server projection', () => {
  const records = project(readFileSync('skills/datocms-cma/references/records.md', 'utf8'));
  const previous = execFileSync('git', ['show', `${retentionBase}:skills/datocms-cma/references/records.md`], { encoding: 'utf8' });
  // The endpoint-lookup sentence changes; the preceding distinction must remain.
  const versionSemantics = previous.split('\n').find((line) => line.startsWith('Reference-discovery endpoints')).split(' Check ')[0];
  assert.ok(records.includes(versionSemantics));
  assert.match(records, /runtime.*supplies.*parse.*serialize.*omit their imports/);
  const editing = project(readFileSync('skills/datocms-cma/references/editing-records.md', 'utf8'));
  assert.match(editing, /helpers already supplied by the selected runtime/);
  for (const source of [records, editing]) {
    assert.doesNotMatch(source, /npx datocms|Two runtime classes/);
  }
});

test('shipped CMA round-trip preflight prevents lossy writes in imported and ambient runtimes', async () => {
  const require = createRequire(import.meta.url);
  const { parse, serialize } = require('datocms-structured-text-dastdown');
  const { isSpan, reduceNodes } = require('datocms-structured-text-utils');
  const source = readFileSync('skills/datocms-cma/references/editing-records.md', 'utf8');
  for (const [mode, markdownSource] of [['imported', source], ['ambient', project(source)]]) {
    const examples = [];
    visit(markdown.parse(markdownSource), (node) => {
      if (node.type === 'code' && node.value.includes('const text = serialize(currentItem.content);')) examples.push(node.value);
    });
    assert.equal(examples.length, 1);
    const script = mode === 'ambient'
      ? examples[0].replace(/^import .*;\n/gm, '')
      : examples[0];
    const { outputText } = ts.transpileModule(script, {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    });
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const run = new AsyncFunction('exports', 'require', 'client', 'id', 'parse', 'serialize', 'isSpan', 'reduceNodes', outputText);
    const writes = [];
    let content = parse('Ordinary prose');
    content.document.children.push({
      type: 'paragraph', children: [{ type: 'span', value: 'x\ny', marks: ['code'] }],
    });
    const snapshot = structuredClone(content);
    const client = { items: {
      find: async () => ({ id: 'record', content }),
      update: async (id, payload) => { writes.push({ id, payload }); },
    } };
    const execute = () => run({}, require, client, 'record', parse, serialize, isSpan, reduceNodes);
    await assert.rejects(execute(), /Dastdown changes existing text/, `${mode}: lossy round-trip rejected`);
    assert.equal(writes.length, 0, `${mode}: no mutation before successful preflight`);
    assert.deepEqual(content, snapshot, `${mode}: original remains available for AST fallback`);

    content = parse('Faithful content');
    content.document.children[0].children = [
      { type: 'span', value: 'Faithful ', marks: [] },
      { type: 'span', value: 'content' },
    ];
    await execute();
    assert.deepEqual(writes, [{ id: 'record', payload: { content: parse('Faithful content') } }], `${mode}: harmless normalization may be saved`);
  }
});
