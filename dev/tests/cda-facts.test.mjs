import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = process.env.REFERENCE_REPO_ROOT
  ? resolve(process.env.REFERENCE_REPO_ROOT)
  : fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(resolve(repoRoot, 'skills/datocms-cda', path), 'utf8');
const section = (markdown, start, end) => markdown.slice(markdown.indexOf(start), markdown.indexOf(end, markdown.indexOf(start)));

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
