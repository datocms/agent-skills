import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
// Lower bound of a caret/tilde/exact range such as ^6.1.0, as [major, minor, patch].
const floor = (range) => range.match(/(\d+)\.(\d+)\.(\d+)/).slice(1).map(Number);
const atLeast = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

// Skill statements checked against the installed plugin fixture packages (npm ci --prefix dev/e2e/catalog/plugin).
const repoRoot = process.env.REFERENCE_REPO_ROOT
  ? resolve(process.env.REFERENCE_REPO_ROOT)
  : fileURLToPath(new URL('../../', import.meta.url));
const ref = (name) => readFileSync(resolve(repoRoot, 'skills/datocms-plugin/references', name), 'utf8');
const pkg = (path) => readFileSync(fileURLToPath(new URL(`../e2e/catalog/plugin/node_modules/${path}`, import.meta.url)), 'utf8');
const fixture = existsSync(fileURLToPath(new URL('../e2e/catalog/plugin/node_modules/datocms-plugin-sdk/package.json', import.meta.url)))
  ? {} : { skip: 'plugin fixture not installed: npm ci --prefix dev/e2e/catalog/plugin' };
const jsonAfter = (md, heading) => JSON.parse(md.slice(md.indexOf(heading)).match(/```json\n([\s\S]*?)```/)[1]);

test('asset-source default_field_metadata keys match the SDK NewUploadDefaultFieldMetadata type', fixture, () => {
  const sdkType = pkg('datocms-plugin-sdk/dist/types/hooks/renderAssetSource.d.ts').match(/export type NewUploadDefaultFieldMetadata = \{([\s\S]*?)\n\};/)[1];
  const documented = ref('asset-sources.md').match(/default_field_metadata\?: \{\n([\s\S]*?)\n {2}\};/)[1];
  const keys = (body) => [...body.matchAll(/^ {4}(\[[^\]]+\]|\w+)\??:/gm)].map((m) => m[1]).sort();
  assert.deepEqual(keys(documented), keys(sdkType));
});

test('documented field types match the SDK FieldType union, and SKILL.md maps Modular Content to rich_text', fixture, () => {
  // Nothing in the name `rich_text` says Modular Content, so the always-loaded SKILL.md has to.
  const union = (text) => [...text.matchAll(/'(\w+)'/g)].map((m) => m[1]).sort();
  const sdk = pkg('datocms-plugin-sdk/dist/types/hooks/manualFieldExtensions.d.ts').match(/export type FieldType = ([^;]+);/)[1];
  const documented = ref('sdk-context-and-cma.md').match(/Field extension `fieldTypes`[^\n]*\n\n```ts\n([\s\S]*?)```/)[1];
  assert.deepEqual(union(documented), union(sdk));
  assert.match(readFileSync(resolve(repoRoot, 'skills/datocms-plugin/SKILL.md'), 'utf8'), /Modular Content is `rich_text`/);
});

test('scaffold browser CMA client shares the SDK cma-client major', fixture, () => {
  // datocms-plugin-sdk >=2.3 depends on @datocms/cma-client ^6.1.0; a ^5 browser client installs a second major.
  const scaffold = ref('project-scaffold.md');
  const browserRange = jsonAfter(scaffold, '### Optional Dependencies').dependencies['@datocms/cma-client-browser'];
  const sdkClientRange = JSON.parse(pkg('datocms-plugin-sdk/package.json')).dependencies['@datocms/cma-client'];
  assert.equal(floor(browserRange)[0], floor(sdkClientRange)[0]);
  // NewUploadDefaultFieldMetadata (documented in asset-sources.md) first ships in datocms-plugin-sdk 2.4.0 (npm pack 2.3.0 vs 2.4.0).
  const sdkRange = jsonAfter(scaffold, '## `package.json`').dependencies['datocms-plugin-sdk'];
  assert.ok(atLeast(floor(sdkRange), [2, 4, 0]) >= 0, `scaffold SDK floor ${sdkRange} predates the documented metadata shape`);
});

test('current-plugin-patterns points at the public plugins repo without version baselines', () => {
  const text = ref('current-plugin-patterns.md');
  assert.doesNotMatch(text, /\b\d+\.\d+\.x\b/);
  assert.match(text, /https:\/\/github\.com\/datocms\/plugins\b/);
  // `gh api repos/datocms/plugins/contents` (private: false), 2026-09-25.
  const folders = ['import-export-schema', 'web-previews', 'shopify-product', 'record-comments', 'bulk-operations-workbench', 'unsplash'];
  const named = [...text.matchAll(/^- `([\w-]+)`/gm)].map((m) => m[1]);
  assert.ok(named.length > 0, 'no example folders named');
  assert.deepEqual(named.filter((name) => !folders.includes(name)), []);
});

test('in-frame dimming overlay uses the token datocms-react-ui uses, not a hardcoded color', fixture, () => {
  const surfaces = ref('design-plugin-surfaces.md');
  const backdrops = surfaces.slice(surfaces.indexOf('### Backdrops'), surfaces.indexOf('\n## ', surfaces.indexOf('### Backdrops')));
  const hardcoded = new RegExp(ref('dark-mode-upgrade.md').match(/-E '(\(#\[0-9a-fA-F\][^']+)'/)[1]);
  assert.doesNotMatch(backdrops, hardcoded);
  const overlay = pkg('datocms-react-ui/src/VerticalSplit/styles.module.css').match(/\.VerticalSplitPaneOverlay \{[^}]*background: (var\(--[\w-]+\))/)[1];
  assert.ok(backdrops.includes(overlay), `expected ${overlay}`);
});

test('disabled-copy token is consistent across design references and exists in Canvas', fixture, () => {
  const upgrade = ref('dark-mode-upgrade.md').match(/disabled copy[^`\n]*`(--color--[\w-]+)`/)[1];
  const foundations = ref('design-foundations.md').match(/`(--color--[\w-]+)` for disabled copy/)[1];
  assert.equal(upgrade, foundations);
  assert.ok(pkg('datocms-react-ui/src/Canvas/index.tsx').includes(`'${upgrade}'`));
});
