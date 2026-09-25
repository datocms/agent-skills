// Guards for frontend-integrations facts that no ordinary actor task exercises reliably.
// REFERENCE_REPO_ROOT points the checks at another skills snapshot (e.g. a baseline).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const dev = fileURLToPath(new URL('../', import.meta.url));
const repoRoot = process.env.REFERENCE_REPO_ROOT ? resolve(process.env.REFERENCE_REPO_ROOT) : resolve(dev, '..');
const skill = join(repoRoot, 'skills/datocms-frontend-integrations');
const read = (path) => readFileSync(join(skill, path), 'utf8');

// Serves the two CMA calls `schema:generate` makes (primary environment lookup, then
// GET /site?include=item_types,item_types.fields) from a one-model schema.
const MOCK = `const json = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
const field = (id, api_key, field_type, validators = {}) => ({ id, type: 'field', attributes: { api_key, field_type, localized: false, validators, position: 1 }, relationships: { item_type: { data: { id: 'it_page', type: 'item_type' } } } });
globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  if (url.host !== 'site-api.datocms.com') throw new Error('unexpected host ' + url.host);
  if (url.pathname === '/environments') return json({ data: [{ id: 'main', type: 'environment', meta: { primary: true, status: 'ready' } }] });
  if (url.pathname === '/site') return json({
    data: { id: 'site', type: 'site', attributes: { locales: ['en'] } },
    included: [
      { id: 'it_page', type: 'item_type', attributes: { api_key: 'page', modular_block: false, sortable: false, tree: false }, relationships: { fields: { data: [{ id: 'f_title', type: 'field' }, { id: 'f_slug', type: 'field' }] } } },
      field('f_title', 'title', 'string'), field('f_slug', 'slug', 'slug', { slug_title_field: { title_field_id: 'f_title' } }),
    ],
  });
  return new Response('{}', { status: 404 });
};`;

function generate(project, target) {
  const home = join(project, '.home');
  mkdirSync(home, { recursive: true });
  writeFileSync(join(project, 'mock.cjs'), MOCK);
  return spawnSync(process.execPath, ['-r', join(project, 'mock.cjs'), join(dev, 'node_modules/datocms/bin/run'), 'schema:generate', target], {
    cwd: project, encoding: 'utf8', timeout: 60000,
    env: { PATH: process.env.PATH, HOME: home, XDG_CONFIG_HOME: join(home, 'c'), XDG_DATA_HOME: join(home, 'd'), XDG_CACHE_HOME: join(home, 'k'), NO_COLOR: '1', DATOCMS_SKIP_NEW_VERSION_CHECK: 'true', DATOCMS_API_TOKEN: 'test-token' },
  });
}

// frontend-10: the recordToWebsiteRoute snippets import a generated `cma-types` module. The
// documented command must run on the real datocms CLI (dev/node_modules/datocms,
// lib/commands/schema/generate.js: `schema:generate FILENAME`) and emit the module the
// shipped skeleton imports — `Schema.X.ID` values and the `AnyModel` union.
test('web previews document the cma-types generation command, and it produces the imported module', () => {
  const concepts = read('references/web-previews-concepts.md');
  const command = concepts.match(/`npx datocms (schema:generate) ([^`\s]+)`/);
  assert.ok(command, 'web-previews-concepts.md does not say how to generate cma-types');
  for (const name of ['nextjs', 'nuxt', 'sveltekit', 'astro']) {
    const line = read(`references/${name}.md`).split('\n').find((l) => l.includes('`cma-types`'));
    assert.match(line ?? '', /web-previews-concepts\.md|schema:generate/, `${name}.md cma-types note has no generation pointer`);
  }

  const project = mkdtempSync(join(tmpdir(), 'cma-types-'));
  mkdirSync(dirname(join(project, command[2])), { recursive: true }); // the CLI does not create parent dirs; recordInfo.ts lives there
  const cli = generate(project, command[2]);
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
  const generated = join(project, command[2]);
  assert.ok(existsSync(generated), `command did not write ${command[2]}`);

  // Typecheck the shipped skeleton (Page case uncommented) against the generated module.
  const skeleton = concepts.match(/```ts\n(import type \{ RawApiTypes \}[\s\S]*?)```/)[1]
    .replace(/\/\/ (case Schema\.Page\.ID:)\n\s*\/\/ (\s*return [^\n]+)/, '$1\n$2');
  assert.match(skeleton, /^\s*case Schema\.Page\.ID:$/m);
  const route = join(dirname(generated), 'recordInfo.ts');
  writeFileSync(route, skeleton.replace(/from '[^']*cma-types'/, "from './cma-types'"));
  writeFileSync(join(project, 'package.json'), '{"type":"module"}');
  const program = ts.createProgram([route], {
    strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, typeRoots: [], baseUrl: project, paths: { '@datocms/*': [join(dev, 'node_modules/@datocms/*')] },
  });
  const errors = ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  assert.deepEqual(errors, []);
});

// datocms 4.2.0 lib/commands/schema/generate.js writes with writeFileSync and never creates the
// parent directory, so a fresh project fails with ENOENT. The CLI reference must say to create it first.
test('schema:generate needs an existing output directory, and the docs say so', () => {
  const project = mkdtempSync(join(tmpdir(), 'cma-types-missing-'));
  const cli = generate(project, 'src/lib/datocms/cma-types.ts');
  assert.notEqual(cli.status, 0);
  assert.match(cli.stdout + cli.stderr, /ENOENT/);
  const docs = [join(repoRoot, 'skills/datocms-cli/references/schema-generate.md')];
  for (const path of docs) assert.match(readFileSync(path, 'utf8'), /(creat\w* (the )?(output )?(directory|folders)|mkdir -p)[^\n]*|directory must exist/i, path);
});

// frontend-8: next@15.5.26 dist/server/web/spec-extension/revalidate.d.ts declares
// `revalidateTag(tag: string)`; next@16.3.6 requires `(tag, profile)`. The two-argument calls
// in nextjs.md must come with the Next ≤15 single-argument form.
test('nextjs.md gives the single-argument revalidateTag form for Next 15 and earlier', () => {
  const next = read('references/nextjs.md');
  assert.match(next, /revalidateTag\(\w+, \{ expire: 0 \}\)/);
  assert.match(next, /Next ≤15[^\n]*revalidateTag\(\w+\)|revalidateTag\(\w+\)[^\n]*Next ≤15/);
});

// frontend-12: datocms/nuxt-starter-kit composables/useQuery.ts sets `contentLink: draftMode ? 'v1' : undefined`
// and `baseEditingUrl` (lines 75-76, again at 104-105 for the subscription) since d61903c
// (2026-01-25, "Add support to DatoCMS Content Link"); still true at e21f5aa (2026-09-24).
test('nuxt.md does not claim the Nuxt starter kit lacks Content Link options', () => {
  const nuxt = read('references/nuxt.md');
  assert.doesNotMatch(nuxt, /starter kit doesn't use `contentLink`|doesn't pass Content Link options/);
  assert.match(nuxt, /To add Content Link, modify `useQuery` composable:/);
});

// frontend-5: the `remix` package throws RemixPackageNotUsedError on import and its types export
// nothing else (remix@2.17.5 README: "deprecated in v1.6.0 then finally removed in v2.0.0");
// Remix v2 exports MetaFunction from @remix-run/node. React Router framework mode
// (`@react-router/dev`, 7+/8) is Remix's successor and must be detected, and its MetaArgs has
// only `loaderData` in v8 (react-router@8.4.0 lib/dom/ssr/routeModules.d.ts).
test('Remix / React Router guidance uses live packages and detects framework mode', () => {
  const seo = read('references/react-seo.md');
  assert.doesNotMatch(seo, /from ['"]remix['"]/);
  assert.match(seo, /import type \{ MetaFunction \} from '@remix-run\/node';/);
  assert.match(seo, /`loaderData`/);
  // react-router 7.18.4 and 8.4.0 export useNavigate/useLocation; react-router-dom stops at 7.x
  // (a re-export of react-router), so v8 apps don't have it installed.
  assert.match(read('references/react-content-link.md'), /import \{ useNavigate, useLocation \} from 'react-router';[^\n]*react-router-dom/);
  const main = read('SKILL.md');
  assert.match(main.split('\n').find((l) => l.includes('**Framework**')), /`@react-router\/dev`/);
  for (const [, path] of main.matchAll(/`(references\/[\w-]+\.md)`/g)) assert.ok(existsSync(join(skill, path)), path);
  const remix = join(skill, 'references/remix.md');
  assert.ok(!existsSync(remix) || !/not bundled here yet/.test(readFileSync(remix, 'utf8')), 'dated remix.md stub still shipped');
});
