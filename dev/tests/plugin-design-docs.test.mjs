// Offline checks for the datocms-plugin-design skill: the page index matches the mirrored docs,
// every datocms-react-ui import in the hand-written files is a public entry, SKILL.md stays small,
// and long references carry a table of contents.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { DOCS_DIR, SKILL_DIR, compareSets, localPages, parseSkillIndex, readPage, splitPage } from '../scripts/sync-react-ui-docs.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/react-ui-entries.json', import.meta.url), 'utf8'));
const entries = new Set(fixture.entries);
const skill = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8');
const surfaceRecipes = readdirSync(join(SKILL_DIR, 'references/surfaces')).filter((file) => file.endsWith('.md')).sort();
const handWritten = ['SKILL.md', 'references/surfaces.md', ...surfaceRecipes.map((file) => `references/surfaces/${file}`), 'references/upgrade-from-2.md', 'references/review-checklist.md'];
const SKILLS_ROOT = join(SKILL_DIR, '..');
const markdownUnder = (dir) => readdirSync(dir, { recursive: true })
  .filter((file) => file.endsWith('.md'))
  .map((file) => join(dir, file));
// A datocms-react-ui/<path> mention that is a public entry, the stylesheet, a forbidden private path named in
// prose, a wildcard group, or a dist/ file path.
const isAllowedSpecifier = (path) => path === fixture.styles || entries.has(path)
  || /^(internal|ui-public|react-ui|ui)\//.test(path) || path.endsWith('*') || path.startsWith('dist/');

test('the pinned entry list has the 127 public entries of the package', () => {
  assert.equal(fixture.entries.length, 127);
  assert.ok(entries.has('Canvas') && entries.has('hooks/useMediaQuery') && entries.has('Table/cells/TimeCell'));
});

test('SKILL.md page index lists every mirrored page once, and nothing else', () => {
  const index = parseSkillIndex(skill);
  const pages = localPages(DOCS_DIR);
  assert.equal(pages.length, 72, 'mirror should hold 72 pages');
  const { missing, extra } = compareSets(pages, index);
  assert.deepEqual(missing, [], `pages missing from the index: ${missing.join(', ')}`);
  assert.deepEqual(extra, [], `index entries with no mirrored page: ${extra.join(', ')}`);
  assert.equal(new Set(index).size, index.length, 'an index entry is repeated');
});

test('each mirrored page is stored split at its props tables, and the parts join back into the page', () => {
  let withProps = 0;
  for (const path of localPages(DOCS_DIR)) {
    const page = readFileSync(join(DOCS_DIR, `${path}.md`), 'utf8');
    assert.doesNotMatch(page, /^## Props$/m, `${path}.md still holds its props tables`);
    const joined = readPage(path);
    const parts = splitPage(joined);
    assert.equal(parts.page.toString('utf8'), page, `${path}: the stored page is not the part before "## Props"`);
    if (!parts.props) continue;
    withProps += 1;
    assert.ok(readFileSync(join(DOCS_DIR, `${path}.props.md`), 'utf8').startsWith('## Props\n'), `${path}.props.md does not start with "## Props"`);
  }
  assert.equal(withProps, 66, 'pages with props tables');
});

test('every datocms-react-ui import path resolves to a public entry', () => {
  const specifier = /datocms-react-ui\/([A-Za-z0-9_./-]+)/g;
  for (const file of handWritten) {
    const text = readFileSync(join(SKILL_DIR, file), 'utf8');
    for (const [, raw] of text.matchAll(specifier)) {
      const path = raw.replace(/[.,;:)]+$/, '');
      assert.ok(isAllowedSpecifier(path), `${file}: datocms-react-ui/${path} is not a public entry`);
    }
  }
});

test('every import statement in fenced code uses a public entry', () => {
  const importLine = /from '(datocms-react-ui(?:\/[^']*)?)'/g;
  for (const file of handWritten) {
    const text = readFileSync(join(SKILL_DIR, file), 'utf8');
    for (const block of text.matchAll(/```tsx\n([\s\S]*?)```/g)) {
      for (const [, spec] of block[1].matchAll(importLine)) {
        const entry = spec.slice('datocms-react-ui/'.length);
        assert.ok(entries.has(entry), `${file}: import from '${spec}' is not a public entry`);
      }
    }
  }
});

test('SKILL.md stays under 18,000 bytes', () => {
  const size = statSync(join(SKILL_DIR, 'SKILL.md')).size;
  assert.ok(size < 18000, `SKILL.md is ${size} bytes`);
});

test('hand-written references over 100 lines start with a table of contents', () => {
  for (const file of handWritten.filter((f) => f.startsWith('references/'))) {
    const lines = readFileSync(join(SKILL_DIR, file), 'utf8').split('\n');
    if (lines.length <= 100) continue;
    const firstH2 = lines.find((line) => line.startsWith('## '));
    assert.equal(firstH2, '## Contents', `${file}: first section should be "## Contents"`);
  }
});

test('every datocms-react-ui import in the datocms-plugin skill resolves to a public entry', () => {
  const pluginDir = join(SKILLS_ROOT, 'datocms-plugin');
  for (const file of markdownUnder(pluginDir)) {
    const text = readFileSync(file, 'utf8');
    for (const [, raw] of text.matchAll(/datocms-react-ui\/([A-Za-z0-9_./-]+)/g)) {
      const path = raw.replace(/[.,;:)]+$/, '');
      assert.ok(isAllowedSpecifier(path), `${relative(SKILLS_ROOT, file)}: datocms-react-ui/${path} is not a public entry`);
    }
    for (const [, spec] of text.matchAll(/from '(datocms-react-ui\/[^']*)'/g)) {
      const entry = spec.slice('datocms-react-ui/'.length);
      assert.ok(entry === fixture.styles || entries.has(entry), `${relative(SKILLS_ROOT, file)}: import from '${spec}'`);
    }
  }
});

test('no code example in any skill imports from the datocms-react-ui root', () => {
  // datocms-react-ui 4 has no root entry: `from 'datocms-react-ui'` fails to resolve.
  const rootImport = /(?:from\s+|import\s*\(\s*|require\(\s*)['"]datocms-react-ui['"]/;
  for (const file of markdownUnder(SKILLS_ROOT)) {
    if (file.startsWith(DOCS_DIR)) continue;
    const text = readFileSync(file, 'utf8');
    for (const [, code] of text.matchAll(/```[a-z]*\n([\s\S]*?)```/g)) {
      assert.doesNotMatch(code, rootImport, `${relative(SKILLS_ROOT, file)} has a root import in a code block`);
    }
  }
});
