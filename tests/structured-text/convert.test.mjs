import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, link, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const shipped = join(here, '../../skills/datocms-structured-text/scripts');
let scratch;
let runtime;
let sequence = 0;

before(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'structured-text-tests-'));
  runtime = join(scratch, 'runtime');
  await cp(shipped, runtime, { recursive: true });
  assert(!(await readdir(runtime)).includes('node_modules'), 'shipped runtime must not contain installed dependencies');
  const install = spawnSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: runtime, encoding: 'utf8', timeout: 120_000 });
  assert.equal(install.status, 0, `Scratch dependency installation failed: ${(install.stderr || install.error?.message || '').slice(-2000)}`);
});
after(async () => { if (scratch) await rm(scratch, { recursive: true, force: true }); });

async function files(source, format = 'markdown') {
  const directory = join(scratch, `case-${++sequence}`);
  await mkdir(directory);
  const input = join(directory, `source.${format === 'markdown' ? 'md' : 'html'}`);
  const output = join(directory, 'document.json');
  const report = join(directory, 'report.json');
  await writeFile(input, source);
  return { input, output, report, directory, format };
}

function invoke(paths, additional = []) {
  return spawnSync(process.execPath, [join(runtime, 'convert.mjs'), '--input', paths.input, '--format', paths.format, '--output', paths.output, '--report', paths.report, ...additional], { cwd: paths.directory, encoding: 'utf8', timeout: 30_000 });
}

async function convert(source, format = 'markdown') {
  const paths = await files(source, format);
  const result = invoke(paths);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(await readFile(paths.report, 'utf8'));
  assert.equal(report.ok, true);
  assert.deepEqual(report.diagnostics, []);
  return { paths, document: JSON.parse(await readFile(paths.output, 'utf8')), report };
}

const nodes = (node) => [node, ...(node.children || []).flatMap(nodes)];
const text = (node) => nodes(node).filter((child) => child.type === 'span').map((child) => child.value).join('');

for (const format of ['markdown', 'html']) {
  test(`${format}: semantic prose, nested lists, marks, links, code, and Unicode survive`, async () => {
    const source = await readFile(join(here, `fixtures/prose.${format === 'markdown' ? 'md' : 'html'}`), 'utf8');
    const { document } = await convert(source, format);
    assert.equal(document.schema, 'dast');
    const all = nodes(document.document);
    const heading = all.find((node) => node.type === 'heading');
    assert.equal(heading.level, format === 'markdown' ? 1 : 2);
    assert.equal(text(heading), 'Café & 東京');
    for (const mark of ['strong', 'emphasis', 'strikethrough', 'code', ...(format === 'html' ? ['underline', 'highlight'] : [])]) {
      assert(all.some((node) => node.type === 'span' && node.marks?.includes(mark)), `missing mark ${mark}`);
    }
    assert.equal(all.find((node) => node.type === 'span' && node.marks?.includes('code')).value, 'a < b');
    assert.equal(all.filter((node) => node.type === 'list').length, 3);
    assert.equal(all.filter((node) => node.type === 'listItem').length, 5);
    assert.equal(text(all.find((node) => node.type === 'blockquote')), 'A quoted paragraph.');
    assert.deepEqual(all.find((node) => node.type === 'code'), { type: 'code', language: 'js', code: 'const greeting = "Olá 🌍";\nconsole.log(greeting);' });
    const link = all.find((node) => node.type === 'link');
    assert.equal(link.url, 'https://example.com/path');
    assert(link.meta.some((entry) => entry.id === 'title' && entry.value === 'A title'));
    if (format === 'html') {
      assert(link.meta.some((entry) => entry.id === 'target' && entry.value === '_blank'));
      assert(link.meta.some((entry) => entry.id === 'rel' && entry.value === 'nofollow'));
    }
    assert(all.some((node) => node.type === 'thematicBreak'));
    assert(text(document.document).includes('A hard break.\nNext line.'));
    assert(!text(document.document).includes('Export metadata'));
  });
}

test('plain prose output has the expected DAST envelope and structure', async () => {
  const { document } = await convert('## Hello\n\nKeep **this**.');
  assert.deepEqual(document, { schema: 'dast', document: { type: 'root', children: [
    { type: 'heading', level: 2, children: [{ type: 'span', value: 'Hello' }] },
    { type: 'paragraph', children: [{ type: 'span', value: 'Keep ' }, { type: 'span', value: 'this', marks: ['strong'] }, { type: 'span', value: '.' }] },
  ] } });
});

test('synthetic Google Docs Markdown export preserves document order and text', async () => {
  const { document } = await convert(await readFile(join(here, 'fixtures/google-docs-export.md'), 'utf8'));
  assert.deepEqual(document.document.children.map((node) => node.type), ['heading', 'paragraph', 'heading', 'paragraph', 'list', 'heading', 'list']);
  assert(text(document.document).includes('naïve, ação, and café.'));
  assert(nodes(document.document).some((node) => node.type === 'link' && node.url === 'https://example.com/brief'));
});

test('reference links and GFM autolinks retain URL and title', async () => {
  const { document } = await convert('[Read][guide]\n\n[guide]: https://example.com "Guide"\n\nhttps://example.org');
  const links = nodes(document.document).filter((node) => node.type === 'link');
  assert.deepEqual(links.map((node) => node.url), ['https://example.com', 'https://example.org']);
  assert.deepEqual(links[0].meta, [{ id: 'title', value: 'Guide' }]);
});

for (const format of ['markdown', 'html']) {
  test(`${format}: tight list items preserve inline marks, links, and nested lists`, async () => {
    const source = format === 'markdown'
      ? 'A small document\n================\n\nA _careful_ author uses **clear** words.\n\n+ Café\n+ Second item with [a link][ref] and **strong** _emphasis_ `code` ~~old~~\n  + Nested [link](https://example.org)\n\n[ref]: https://example.com/read'
      : '<h1>A small document</h1><p>A <em>careful</em> author uses <strong>clear</strong> words.</p><ul><li>Café</li><li>Second item with <a href="https://example.com/read">a link</a> and <strong>strong</strong> <em>emphasis</em> <code>code</code> <del>old</del><ul><li>Nested <a href="https://example.org">link</a></li></ul></li></ul>';
    const { document } = await convert(source, format);
    assert.deepEqual(document.document.children.map((node) => node.type), ['heading', 'paragraph', 'list']);
    const list = document.document.children[2];
    assert.deepEqual(list.children.map((node) => node.children.map((child) => child.type)), [['paragraph'], ['paragraph', 'list']]);
    assert.equal(text(list.children[0]), 'Café');
    const paragraph = list.children[1].children[0];
    assert.equal(text(paragraph), 'Second item with a link and strong emphasis code old');
    assert.deepEqual(nodes(list).filter((node) => node.type === 'link').map((node) => node.url), ['https://example.com/read', 'https://example.org']);
    for (const [value, mark] of [['strong', 'strong'], ['emphasis', 'emphasis'], ['code', 'code'], ['old', 'strikethrough']]) {
      assert(nodes(paragraph).some((node) => node.value === value && node.marks?.includes(mark)), `missing ${mark}`);
    }
  });
}

test('supported inline styles preserve marks and HTML whitespace normalization is explicit', async () => {
  const { document, report } = await convert('<p>  A   <span style="font-weight: 700; font-style: italic; text-decoration: underline">word</span> &amp; B. </p>', 'html');
  assert.equal(text(document.document), 'A word & B.');
  assert.deepEqual(nodes(document.document).find((node) => node.value === 'word').marks, ['strong', 'emphasis', 'underline']);
  assert(report.normalizations.some((message) => message.includes('whitespace')));
});

test('output and report are deterministic and leave no staging files', async () => {
  const { paths } = await convert('# Repeat\n\n**Exactly** this.');
  const initialOutput = await readFile(paths.output, 'utf8');
  const initialReport = await readFile(paths.report, 'utf8');
  assert.equal(invoke(paths).status, 0);
  assert.equal(await readFile(paths.output, 'utf8'), initialOutput);
  assert.equal(await readFile(paths.report, 'utf8'), initialReport);
  assert.deepEqual((await readdir(paths.directory)).sort(), ['document.json', 'report.json', 'source.md']);
});

for (const [format, source, line] of [
  ['markdown', '1. One\n2. \n3. Three\n\nRefer to item 3 above.', 2],
  ['markdown', '1. One\n\n2.\n\n3. Three', 3],
  ['markdown', '- One\n-\n- Three', 2],
  ['html', '<ol>\n<li>One</li>\n<li></li>\n<li>Three</li></ol><p>Refer to item 3 above.</p>', 3],
  ['html', '<ol><li>One</li>\n<li> \t\n </li><li>Three</li></ol>', 2],
  ['html', '<ol><li>One</li>\n<li><p><strong> </strong><span><!-- blank --></span></p></li><li>Three</li></ol>', 2],
  ['html', '<ul><li>Outer<ul>\n<li><p></p></li></ul></li></ul>', 2],
  ['html', '<ol>\n<li><ul></ul></li><li>Two</li></ol>', 2],
]) {
  test(`${format}: empty list item on line ${line} fails without renumbering output: ${source.slice(0, 44)}`, async () => {
    const paths = await files(source, format);
    const previous = '{"preserve":"previous document"}\n';
    await writeFile(paths.output, previous);
    const result = invoke(paths);
    assert.equal(result.status, 1, result.stdout);
    const report = JSON.parse(await readFile(paths.report, 'utf8'));
    assert.equal(report.ok, false);
    const diagnostic = report.diagnostics.find((entry) => entry.code === 'EMPTY_LIST_ITEM');
    assert(diagnostic, JSON.stringify(report));
    assert.equal(diagnostic.position.line, line);
    assert(diagnostic.action.includes('preserving list positions'));
    assert.equal(await readFile(paths.output, 'utf8'), previous);
  });
}

test('HTML list items containing only nested lists, line breaks, or nonbreaking spaces survive', async () => {
  const { document } = await convert('<ol><li><ul><li>Nested</li></ul></li><li><p><strong><br></strong></p></li><li>&nbsp;</li><li>Fourth</li></ol>', 'html');
  const list = document.document.children[0];
  assert.equal(list.children.length, 4);
  assert.deepEqual(list.children[0].children.map((node) => node.type), ['list']);
  assert.equal(text(list.children[0]), 'Nested');
  assert.equal(text(list.children[1]), '\n');
  assert.equal(text(list.children[2]), '\u00a0');
  assert.equal(text(list.children[3]), 'Fourth');
});

test('a rejected empty list item does not create an output', async () => {
  const paths = await files('1. One\n2.\n3. Three');
  assert.equal(invoke(paths).status, 1);
  await assert.rejects(readFile(paths.output), { code: 'ENOENT' });
  const report = JSON.parse(await readFile(paths.report, 'utf8'));
  assert.equal(report.ok, false);
  assert.equal(report.diagnostics[0].code, 'EMPTY_LIST_ITEM');
});

const rejected = [
  ['markdown', 'Before\n\n![Alt](image.png)', 'UNSUPPORTED_MARKDOWN', 3],
  ['markdown', '| A | B |\n| - | - |\n| X | Y |', 'UNSUPPORTED_MARKDOWN', 1],
  ['markdown', '- [x] Done', 'TASK_LIST', 1],
  ['markdown', 'Text[^a]\n\n[^a]: Footnote', 'UNSUPPORTED_MARKDOWN', 1],
  ['markdown', 'Before\n\n<span>Raw HTML</span>', 'UNSUPPORTED_MARKDOWN', 3],
  ['markdown', '3. Third\n4. Fourth', 'LIST_START', 1],
  ['markdown', '```js title="file.js"\ncode\n```', 'CODE_METADATA', 1],
  ['markdown', '> ## Nested heading', 'UNSUPPORTED_NESTING', 1],
  ['markdown', '- Item\n\n  ```js\n  code\n  ```', 'UNSUPPORTED_NESTING', 3],
  ['html', '<p>Before</p>\n<img src="image.png" alt="Alt">', 'UNSUPPORTED_HTML', 2],
  ['html', '<table><tr><td>Cell</td></tr></table>', 'UNSUPPORTED_HTML', 1],
  ['html', '<p>Before</p><iframe src="https://example.com"></iframe>', 'UNSUPPORTED_HTML', 1],
  ['html', '<video src="video.mp4"></video>', 'UNSUPPORTED_HTML', 1],
  ['html', '<script>alert("never run")</script><p>Body</p>', 'UNSUPPORTED_HTML', 1],
  ['html', '<style>p {font-weight:bold}</style><p>Body</p>', 'UNSUPPORTED_HTML', 1],
  ['html', '<p style="font-weight: bold">Bold</p>', 'UNSUPPORTED_ATTRIBUTE', 1],
  ['html', '<p><span style="color: red">Red</span></p>', 'UNSUPPORTED_STYLE', 1],
  ['html', '<p id="bookmark">Anchor</p>', 'UNSUPPORTED_ATTRIBUTE', 1],
  ['html', '<ol start="3"><li><p>Three</p></li></ol>', 'UNSUPPORTED_ATTRIBUTE', 1],
  ['html', '<blockquote><ul><li>Item</li></ul></blockquote>', 'UNSUPPORTED_NESTING', 1],
  ['html', '<p><a href="/path"><u>Underlined link</u></a></p>', 'LINK_UNDERLINE', 1],
  ['html', '<p><u><a href="/path">Underlined link</a></u></p>', 'LINK_UNDERLINE', 1],
  ['html', '<p><span style="text-decoration: underline"><a href="/path">Underlined link</a></span></p>', 'LINK_UNDERLINE', 1],
  ['html', '<p><a>Missing URL</a></p>', 'MISSING_LINK_URL', 1],
  ['html', '<div>First</div><div>Second</div>', 'UNSUPPORTED_NESTING', 1],
  ['html', '<p><custom-element>Unknown</custom-element></p>', 'UNSUPPORTED_HTML', 1],
  ['html', '<p class="a" class="b">Malformed</p>', 'INVALID_HTML', 1],
];

for (const [format, source, code, line] of rejected) {
  test(`${format}: rejects ${code}: ${source.slice(0, 44)}`, async () => {
    const paths = await files(source, format);
    const previous = '{"preserve":"previous document"}\n';
    await writeFile(paths.output, previous);
    const result = invoke(paths);
    assert.equal(result.status, 1, result.stdout);
    const report = JSON.parse(await readFile(paths.report, 'utf8'));
    assert.equal(report.ok, false);
    const diagnostic = report.diagnostics.find((entry) => entry.code === code);
    assert(diagnostic, JSON.stringify(report));
    assert.equal(diagnostic.position.line, line);
    assert(diagnostic.action.length > 10);
    assert.equal(await readFile(paths.output, 'utf8'), previous);
    assert.deepEqual((await readdir(paths.directory)).sort(), ['document.json', 'report.json', `source.${format === 'markdown' ? 'md' : 'html'}`]);
  });
}

test('a rejected source does not create a partial output', async () => {
  const paths = await files('![Needs a block](image.png)');
  assert.equal(invoke(paths).status, 1);
  await assert.rejects(readFile(paths.output), { code: 'ENOENT' });
});

for (const source of ['', ' \n ', '<!doctype html><html><head><title>Only metadata</title></head></html>']) {
  test(`empty input/document reports failure: ${source.slice(0, 20)}`, async () => {
    const paths = await files(source, source.startsWith('<') ? 'html' : 'markdown');
    await writeFile(paths.output, 'existing');
    assert.equal(invoke(paths).status, 1);
    assert.equal(await readFile(paths.output, 'utf8'), 'existing');
    assert(JSON.parse(await readFile(paths.report, 'utf8')).diagnostics.some((entry) => ['EMPTY_INPUT', 'EMPTY_DOCUMENT'].includes(entry.code)));
  });
}

test('missing source produces a report and retains previous output', async () => {
  const paths = await files('Content');
  await rm(paths.input);
  await writeFile(paths.output, 'existing');
  assert.equal(invoke(paths).status, 1);
  assert.equal(await readFile(paths.output, 'utf8'), 'existing');
  assert.equal(JSON.parse(await readFile(paths.report, 'utf8')).diagnostics[0].code, 'CONVERSION_FAILED');
});

test('invalid UTF-8 cannot silently corrupt input text', async () => {
  const paths = await files(Buffer.from([0x48, 0x69, 0x20, 0xc3, 0x28]));
  await writeFile(paths.output, 'existing');
  assert.equal(invoke(paths).status, 1);
  assert.equal(await readFile(paths.output, 'utf8'), 'existing');
  assert.equal(JSON.parse(await readFile(paths.report, 'utf8')).diagnostics[0].code, 'CONVERSION_FAILED');
});

for (const args of [['--unknown'], ['--format', 'html'], ['--input']]) {
  test(`bad arguments do not overwrite output: ${args.join(' ')}`, async () => {
    const paths = await files('Content');
    await writeFile(paths.output, 'existing');
    assert.equal(invoke(paths, args).status, 1);
    assert.equal(await readFile(paths.output, 'utf8'), 'existing');
    assert.equal(JSON.parse(await readFile(paths.report, 'utf8')).diagnostics[0].code, 'INVALID_ARGUMENTS');
  });
}

test('invalid format produces a diagnostic', async () => {
  const paths = await files('Content');
  assert.equal(invoke({ ...paths, format: 'docx' }).status, 1);
  assert.equal(JSON.parse(await readFile(paths.report, 'utf8')).diagnostics[0].code, 'INVALID_ARGUMENTS');
});

for (const alias of ['same-input-output', 'same-input-report', 'same-output-report', 'symlink-output', 'hard-link-report', 'symlink-directory']) {
  test(`path safety rejects ${alias} without changing source/output`, async () => {
    const paths = await files('# Original');
    await writeFile(paths.output, 'existing');
    if (alias === 'same-input-output') paths.output = paths.input;
    if (alias === 'same-input-report') paths.report = paths.input;
    if (alias === 'same-output-report') paths.report = paths.output;
    if (alias === 'symlink-output') {
      await rm(paths.output);
      await symlink(paths.input, paths.output);
    }
    if (alias === 'hard-link-report') await link(paths.input, paths.report);
    if (alias === 'symlink-directory') {
      const directoryAlias = join(scratch, `alias-${sequence}`);
      await symlink(paths.directory, directoryAlias);
      paths.report = join(directoryAlias, 'document.json');
    }
    const result = invoke(paths);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).diagnostics[0].code, 'UNSAFE_PATHS');
    assert.equal(await readFile(paths.input, 'utf8'), '# Original');
    assert.equal(await readFile(paths.output, 'utf8'), ['same-input-output', 'symlink-output'].includes(alias) ? '# Original' : 'existing');
  });
}

test('report path failure prevents output replacement', async () => {
  const paths = await files('New content');
  await writeFile(paths.output, 'existing');
  paths.report = join(paths.directory, 'missing-parent', 'report.json');
  assert.equal(invoke(paths).status, 1);
  assert.equal(await readFile(paths.output, 'utf8'), 'existing');
});

async function inputHasCaseAlias(paths) {
  try {
    await readFile(join(paths.directory, 'SOURCE.MD'));
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return false;
  }
}

for (const destination of ['output', 'report']) {
  test(`fresh ${destination} with a long basename remains writable`, async () => {
    const paths = await files('# Original');
    const filename = `${'x'.repeat(205)}.json`;
    paths[destination] = join(paths.directory, filename);
    const result = invoke(paths);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(await readFile(paths.output, 'utf8')).schema, 'dast');
    assert.equal(JSON.parse(await readFile(paths.report, 'utf8')).ok, true);
    assert.deepEqual((await readdir(paths.directory)).sort(), ['source.md', destination === 'output' ? 'report.json' : 'document.json', filename].sort());
  });
}

for (const aliasedParent of [false, true]) {
  test(`fresh output/report case variants follow filesystem rules (symlink parent: ${aliasedParent})`, async () => {
    const paths = await files('# Original');
    const caseInsensitive = await inputHasCaseAlias(paths);
    let reportDirectory = paths.directory;
    if (aliasedParent) {
      reportDirectory = join(scratch, `fresh-alias-${sequence}`);
      await symlink(paths.directory, reportDirectory);
    }
    paths.report = join(reportDirectory, 'DOCUMENT.JSON');
    const result = invoke(paths);
    assert.equal(result.status, caseInsensitive ? 1 : 0, result.stderr);
    if (caseInsensitive) {
      assert.equal(JSON.parse(result.stderr).diagnostics[0].code, 'UNSAFE_PATHS');
      await assert.rejects(readFile(paths.output), { code: 'ENOENT' });
      await assert.rejects(readFile(paths.report), { code: 'ENOENT' });
    } else {
      assert.equal(JSON.parse(await readFile(paths.output, 'utf8')).schema, 'dast');
      assert.equal(JSON.parse(await readFile(paths.report, 'utf8')).ok, true);
    }
    assert.equal(await readFile(paths.input, 'utf8'), '# Original');
    assert.deepEqual((await readdir(paths.directory)).sort(), caseInsensitive ? ['source.md'] : ['DOCUMENT.JSON', 'document.json', 'source.md']);
  });
}

test('missing input/report case variants cannot create the input or replace existing output', async () => {
  const paths = await files('# Original');
  const caseInsensitive = await inputHasCaseAlias(paths);
  await rm(paths.input);
  await writeFile(paths.output, 'existing');
  paths.report = join(paths.directory, 'SOURCE.MD');
  const result = invoke(paths);
  assert.equal(result.status, 1);
  if (caseInsensitive) {
    assert.equal(JSON.parse(result.stderr).diagnostics[0].code, 'UNSAFE_PATHS');
    await assert.rejects(readFile(paths.report), { code: 'ENOENT' });
  } else {
    assert.equal(JSON.parse(await readFile(paths.report, 'utf8')).diagnostics[0].code, 'CONVERSION_FAILED');
  }
  await assert.rejects(readFile(paths.input), { code: 'ENOENT' });
  assert.equal(await readFile(paths.output, 'utf8'), 'existing');
  assert.deepEqual((await readdir(paths.directory)).sort(), caseInsensitive ? ['document.json'] : ['SOURCE.MD', 'document.json']);
});
