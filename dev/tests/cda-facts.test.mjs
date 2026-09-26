import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const repoRoot = process.env.REFERENCE_REPO_ROOT
  ? resolve(process.env.REFERENCE_REPO_ROOT)
  : fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(resolve(repoRoot, 'skills/datocms-cda', path), 'utf8');
const section = (markdown, start, end) => markdown.slice(markdown.indexOf(start), markdown.indexOf(end, markdown.indexOf(start)));

test('CDA rendering guidance names feature imports and the optional video peer', () => {
  assert.match(read('SKILL.md'), /`react-datocms\/structured-text`[^\n]*`@mux\/mux-player-react`/);
  assert.match(read('references/structured-text.md'), /\| React \| `react-datocms\/structured-text` \|/);
  assert.match(read('references/images-and-videos.md'), /\| React \| `react-datocms\/video-player` \|/);
});

const reactPackage = fileURLToPath(new URL('../e2e/catalog/web/node_modules/react-datocms/', import.meta.url));
test('the installed React root barrel loads the optional Mux peer through VideoPlayer', { skip: !existsSync(reactPackage) && 'catalog React fixture is absent' }, () => {
  const pkg = JSON.parse(readFileSync(resolve(reactPackage, 'package.json'), 'utf8'));
  assert.equal(pkg.peerDependenciesMeta['@mux/mux-player-react'].optional, true);
  assert.match(JSON.stringify(pkg.exports['./image']), /Image\/index\.js/);
  assert.match(JSON.stringify(pkg.exports['./rsc-image']), /RSCImage\/index\.js/);
  assert.match(readFileSync(resolve(reactPackage, 'dist/esm/index.js'), 'utf8'), /export \* from ['"]\.\/VideoPlayer\/index\.js['"]/);
  assert.match(readFileSync(resolve(reactPackage, 'dist/esm/VideoPlayer/index.js'), 'utf8'), /from ['"]@mux\/mux-player-react\/lazy['"]/);
});

test('Structured Text record selections include the required typename and id across every skill', () => {
  const missing = [];
  let selections = 0;
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) { walk(path); continue; }
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const markdown = readFileSync(path, 'utf8');
      for (const match of markdown.matchAll(/\b(blocks|links|inlineBlocks)\s*\{/g)) {
        selections++;
        const start = match.index + match[0].lastIndexOf('{');
        let depth = 1, end = start + 1;
        for (; end < markdown.length && depth; end++) {
          if (markdown[end] === '{') depth++;
          else if (markdown[end] === '}') depth--;
        }
        assert.equal(depth, 0, `unbalanced ${match[1]} selection in ${path}`);
        const body = markdown.slice(start + 1, end - 1);
        if (!/\b__typename\b/.test(body) || !/\bid\b/.test(body)) missing.push(`${path}:${markdown.slice(0, match.index).split('\n').length} ${match[1]}`);
      }
    }
  }
  walk(resolve(repoRoot, 'skills'));
  assert.ok(selections > 0, 'the scan must exercise shipped record selections');
  assert.deepEqual(missing, []);
});

test('the installed Structured Text record contract requires typename and id', () => {
  const types = readFileSync(new URL('../node_modules/datocms-structured-text-utils/dist/types/types.d.ts', import.meta.url), 'utf8');
  const record = types.match(/export type CdaStructuredTextRecord\s*=\s*\{([\s\S]*?)\}/);
  assert.ok(record);
  assert.match(record[1], /__typename:\s*string/);
  assert.match(record[1], /\bid:\s*string/);
});

test('CDA verification distinguishes inline blocks from inline record callbacks', () => {
  const item = read('SKILL.md').split('\n').find(line => line.startsWith('9. **Structured text**'));
  assert.match(item, /inlineBlocks[^\n]*renderInlineBlock/);
  assert.match(item, /not `renderInlineRecord`/);
});

test('inline block rendering requires its own callback in the installed React renderer', { skip: !existsSync(reactPackage) && 'catalog React fixture is absent' }, async () => {
  const require = createRequire(new URL('../e2e/catalog/web/package.json', import.meta.url));
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const pkg = JSON.parse(readFileSync(resolve(reactPackage, 'package.json'), 'utf8'));
  assert.match(JSON.stringify(pkg.exports['./structured-text'].import), /dist\/esm\/StructuredText\/index\.js/);
  const { StructuredText } = await import(new URL('../e2e/catalog/web/node_modules/react-datocms/dist/esm/StructuredText/index.js', import.meta.url));
  const data = {
    value: { schema: 'dast', document: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'inlineBlock', item: 'quote' }] }] } },
    inlineBlocks: [{ id: 'quote', __typename: 'QuoteRecord', text: 'Inline quotation' }],
  };
  const wrong = () => React.createElement('span', null, 'Wrong callback');
  assert.throws(() => renderToStaticMarkup(React.createElement(StructuredText, { data, renderInlineRecord: wrong })), /inlineBlock.*renderInlineBlock.*specified/);
  const rendered = renderToStaticMarkup(React.createElement(StructuredText, { data, renderInlineBlock: ({ record }) => React.createElement('span', null, record.text) }));
  assert.match(rendered, /Inline quotation/);
});

// cda-8: the starter kits and demos (datocms/{nextjs,astro,sveltekit,nuxt}-starter-kit,
// next-landing-page-demo, ecommerce-website-demo .env examples) name their CDA tokens
// *DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN / *DATOCMS_DRAFT_CONTENT_CDA_TOKEN, and starters ship
// them in .env.example / .env.local.example. The demos' graphql.config.ts authenticates
// codegen with DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN. (Actor guard: cda-existing-token-env-names.)
test('token detection finds the starter token names, including in .env.example', () => {
  const step = section(read('SKILL.md'), '3. ', '4. ');
  for (const name of ['DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN', 'DATOCMS_DRAFT_CONTENT_CDA_TOKEN', '.env.example'])
    assert.ok(step.includes(name), `Step 1 detection must mention ${name}`);
});

test('type-generation examples authenticate with one token name, the starters\' published-content token', () => {
  const code = [...read('references/type-generation.md').matchAll(/^```\w*\n([\s\S]*?)^```/gm)].map((m) => m[1]).join('\n');
  const names = new Set(code.match(/\b[A-Z_]*DATOCMS[A-Z_]*TOKEN\b/g));
  assert.deepEqual([...names], ['DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN']);
});

// cda-10: datocms.com/product-updates/improved-gql-visibility-control (2024-01-08): before the
// update a restricted token's response "simply showed a lack of data, but without explicitly
// hiding any related fields" ({ "data": { "blackFridayOffer": null } }); the update hides them
// from schema and response. The old note only said such
// projects "may have different access control behavior".
test('token row states the concrete legacy access-control behavior', () => {
  const row = read('references/client-and-config.md').split('\n').find((line) => line.startsWith('| `token` |'));
  assert.ok(row, 'token option row missing');
  assert.doesNotMatch(row, /may have different access control behavior/);
  assert.match(row, /Improved GraphQL Security/);
  assert.match(row, /inaccessible fields stay in schema, return `null`/);
});

// cda-11: gql.tada 1.11.3 (dist/chunks/index-chunk.d.ts decorateFragmentDef/makeFragmentRef):
// with initGraphQLTada<{ disableMasking: true }> fragment fields are readable directly and
// FragmentOf<> is the unmasked result, so masking and readFragment() are a project setting
// (verified with tsc). The composition array is needed in every gql.tada project.
test('verify step keeps the composition rule and defers masking to the project setup', () => {
  const item = read('SKILL.md').split('\n').find((line) => line.startsWith('12. '));
  assert.ok(item, 'verify item 12 missing');
  assert.doesNotMatch(item, /masked-by-default|readFragment\(\)` at boundary/);
  assert.match(item, /composition array mirrors every `\.\.\.Fragment` spread/);
  assert.match(item, /follow project's masking setup/);
});

test('CDN-first caching re-serializes x-cache-tags instead of forwarding the raw header', () => {
  // CDA tags are space-separated; CDNs need their own tag header format, and collectors that joined tags with
  // spaces broke purging.
  const text = readFileSync(resolve(repoRoot, 'skills/datocms-cda/references/draft-caching-environments.md'), 'utf8');
  assert.doesNotMatch(text, /Forward `x-cache-tags` as a response header/);
  assert.match(text, /Re-serialize space-separated `x-cache-tags` into the CDN's tag header/);
});

test('GraphQL string query guidance requires an explicit result type', () => {
  const queries = read('SKILL.md').match(/### GraphQL Queries\n([\s\S]*?)(?=\n###? |$)/)?.[1];
  assert.ok(queries);
  assert.match(queries, /returns `unknown`[^\n]*executeQuery<Result>/);
  assert.match(read('references/client-and-config.md'), /`executeQuery<Result>\(query, options\)`[^\n]*`unknown` unless typed/);
});

const cdaQueryTypes = fileURLToPath(new URL('../e2e/catalog/web/node_modules/@datocms/cda-client/dist/types/executeQuery.d.ts', import.meta.url));
test('the installed CDA client defaults string query results to unknown', { skip: !existsSync(cdaQueryTypes) && 'catalog CDA fixture is absent' }, () => {
  assert.match(readFileSync(cdaQueryTypes, 'utf8'), /executeQuery<Result = unknown, Variables = unknown>\(query: string/);
});
