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

const contextBase = '27c410f7952bf14d12c0284a81cfb5d5d266fb6c';
const retentionBase = '94e4bd8128e52963829f65bce8f202fcd68ac8d6';
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
  return tree.children.slice(start, end).map(semanticTree).map((node) => {
    if (node.type !== 'code') return node;
    // Allow only the reviewed request-type, content-preservation and pagination fixes.
    // All other code and prose must still match the base exactly.
    return { ...node, value: node.value.replace(
      'marks.add("strong"); // Preserve existing custom marks too.',
      "marks.add(\"strong\"); // 'strong'|'emphasis'|'code'|'underline'|'strikethrough'|'highlight'",
    ).replace(
      '  // Keep the nested response type if continuing through mapNodes.\n  const content = parse(edited, currentItem.content);',
      '  // Use the writable field type when continuing through `mapNodes`.\n  const content: NonNullable<FieldValueInRequest<typeof currentItem, "content">> =\n    parse(edited, currentItem.content);',
    ).replace(
      '  const content: NonNullable<FieldValueInRequest<typeof currentItem, "content">> =\n    mapNodes(currentItem.content, (node, parent) => {',
      '  let content: NonNullable<FieldValueInRequest<typeof currentItem, "content">> =\n    currentItem.content;\n  content = mapNodes(content, (node, parent) => {',
    ).replace(
      '  // `parse` reuses the original `item` for surviving block/inlineBlock IDs.\n  // Use the writable field type when continuing through `mapNodes`.\n  const content: NonNullable<FieldValueInRequest<typeof currentItem, "content">> =\n    parse(edited, currentItem.content);',
      '  // `content` keeps the static type of `currentItem.content` and reuses the original\n  // `item` object for every block/inlineBlock whose id survives the edit.\n  const content = parse(edited, currentItem.content);',
    ).replace(
      '      !node.children.some((child) => child.type === "inlineItem" || child.type === "inlineBlock" || child.type === "itemLink") &&\n',
      '',
    ).replace(
      '  content = mapNodes(content, (node, parent) => {',
      '  content = mapNodes(content, (node) => {',
    ).replace(
      '      parent?.type === "root" &&\n',
      '',
    ).replace(
      '      return null; // Drop empty root paragraphs; lists and blockquotes need their paragraphs.',
      '      return null; // 1:0 — reduceNodes descends into links/itemLinks; bottom-up: drop the paragraph',
    ).replace(
      'for await (const it of client.items.listPagedIterator<Schema.FaqEntry>({\n  filter: { type: "faq_entry" }, version: "current",\n  order_by: "id_ASC", // Keep pagination order stable while updating translations.\n})) {',
      'const items = await client.items.list<Schema.FaqEntry>({ filter: { type: "faq_entry" }, version: "current" });\nfor (const it of items) {',
    ) };
  });
}

// Preserve domain workflows, allowing only the explicit corrections above.
// Compare their full prose, lists, tables and remaining code with the reviewed base.
const preservedWorkflows = {
  records: [
    'Selective publish / unpublish',
    'validateNew / validateExisting — preflight without commit',
    'Versions and restore',
    'Field value formats — beyond the simple types',
    "dastdown syntax — what's NOT plain markdown",
    'Bulk operations are async + 200-cap',
  ],
  'editing-records': [
    'Workflow',
    'Typing values you build up in code',
    'Prerequisites the workflow assumes',
    'Modular content (rich_text)',
    'Single block (single_block)',
    'Structured text (structured_text)',
    'Localized fields and adding a locale',
    'Optimistic locking via meta.current_version',
  ],
};

function withReviewedDastdownPreflight(source) {
  const corrections = [
    [
      'Forgetting `nested: true` is #1 cause of broken update payloads — mapping over array of strings produces garbage. Block fields are only field type that change shape between two modes; asset fields + record-link fields always return IDs.',
      'Forgetting `nested: true` is #1 cause of broken update payloads — mapping over array of strings produces garbage. Block fields are the field type that changes shape between these modes. Asset fields retain file-value objects (`upload_id`, alt/title, custom data, focal point, poster time), or `null`; record-link fields retain record IDs. Infer asset snapshot types from the fetched value instead of declaring them as strings.',
    ],
    [
      '**Prefer dastdown over AST building/manipulation when possible!** Much less chance of logic/typing errors.',
      'Prefer dastdown for text-shaped edits after the unedited round-trip check below. If it throws or changes existing text, apply the requested edit with `mapNodes` on the original document before making any write.',
    ],
    [
      'import { parse, serialize } from "datocms-structured-text-dastdown";\n\nconst currentItem',
      'import { parse, serialize } from "datocms-structured-text-dastdown";\nimport { isSpan, reduceNodes } from "datocms-structured-text-utils";\n\nconst currentItem',
    ],
    [
      '  const text = serialize(currentItem.content);\n  const edited',
      '  const text = serialize(currentItem.content);\n  const unedited = parse(text, currentItem.content);\n  const originalText = reduceNodes(currentItem.content, (text, node) => text + (isSpan(node) ? node.value : ""), "");\n  const roundTripText = reduceNodes(unedited, (text, node) => text + (isSpan(node) ? node.value : ""), "");\n  if (originalText !== roundTripText) {\n    throw new Error("Dastdown changes existing text; use mapNodes on the original document.");\n  }\n  const edited',
    ],
    [
      'Creating brand new structured text content,',
      'Dastdown 6.0.0 changes newlines inside code-marked spans into literal `<br/>` text. This pre-write check catches that while tolerating span merging and mark normalization; it supplements the structure, marks, links, and reference checks, not the saved-content verification. If it fails, transform the original AST instead. Omit the imports when the selected runtime already supplies these helpers.\n\nCreating brand new structured text content,',
    ],
  ];
  for (const [before, after] of corrections) {
    assert.equal(source.split(before).length, 2, 'apply each reviewed Dastdown correction exactly once');
    source = source.replace(before, after);
  }
  return source;
}

function withReviewedRestoreGuidance(source) {
  const before = '`itemVersions.listPagedIterator(recordId)` walks history. `itemVersions.restore(versionId)` creates a **new version** whose content matches the restored one — it does not delete history, and it does not re-publish: the record\'s publication state stays where it was. If the record was published before the restore and you want the restored content live, call `publish` explicitly afterward.';
  const after = [
    '`itemVersions.listPagedIterator(recordId)` walks history. `itemVersions.restore(versionId)` creates a **new current version** from the selected version without deleting history. Publication depends on the model\'s `draft_mode_active` setting:',
    '',
    '- **Draft mode enabled:** the restored version is unpublished; any previously published version stays live. Publish the restored content only when authorized.',
    '- **Draft mode disabled:** restoring automatically publishes the restored content. A request to restore without changing live content cannot use this operation on that model; explain the constraint before writing, and do not change the model\'s draft-mode setting without authorization.',
    '',
    'Check the model setting before restoring and verify the current and published content afterward. Do not promise that restoration leaves publication unchanged.',
  ].join('\n');
  assert.equal(source.split(before).length, 2, 'apply the reviewed restore correction exactly once');
  return source.replace(before, after);
}

test('optional MCP keeps the agreed discovery and entrypoint context budgets', () => {
  const report = measureContext(process.cwd(), contextBase);
  assert.equal(report.passed, true, JSON.stringify(report, null, 2));
});

for (const [name, workflows] of Object.entries(preservedWorkflows)) {
  const path = `skills/datocms-cma/references/${name}.md`;
  const source = readFileSync(path, 'utf8');
  const baseline = execFileSync('git', ['show', `${retentionBase}:${path}`], { encoding: 'utf8' });
  const previous = markdown.parse(name === 'editing-records'
    ? withReviewedDastdownPreflight(baseline)
    : withReviewedRestoreGuidance(baseline));

  test(`${name}: exact MCP filter preserves the full Markdown structure and shared content`, () => {
    const raw = parseMarkdown(source, `${name} raw`);
    const projected = parseMarkdown(project(source), `${name} projected`);
    assert.deepEqual(semanticTree(projected), semanticTree(withoutCliHints(raw, source)));
  });

  for (const [mode, content] of [['raw', source], ['projected', project(source)]]) {
    test(`${name} ${mode}: domain workflows retain the reviewed base content`, () => {
      const tree = parseMarkdown(content, `${name} ${mode}`);
      for (const title of workflows) assert.deepEqual(section(tree, title), section(previous, title), `Changed domain workflow: ${title}`);
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
