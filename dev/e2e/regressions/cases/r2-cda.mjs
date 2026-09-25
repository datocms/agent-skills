import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Pinned dependency set, installed once under ignored local/ (same pattern as cases/cda.mjs).
const DEPS = { '@0no-co/graphql.web': '1.3.4', '@datocms/cda-client': '0.3.2', '@types/node': '22.19.17', typescript: '5.9.3' };

function fixture(root) {
  const dir = join(root, '../local/regressions/round2/cda/fixture');
  if (!Object.keys(DEPS).every((name) => existsSync(join(dir, 'node_modules', name, 'package.json')))) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: DEPS }, null, 2));
    const npm = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', dir], { stdio: 'inherit' });
    assert.equal(npm.status, 0, 'fixture install failed');
  }
  return dir;
}

// .env.example as shipped by datocms/astro-starter-kit@7a4dfff (the Next.js starter and both
// fully-fledged demos use the same DATOCMS_*_CONTENT_CDA_TOKEN names). The deployment sets
// every variable it lists, each to a distinct value.
const ENV_EXAMPLE = 'DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=\nDATOCMS_DRAFT_CONTENT_CDA_TOKEN=\nDATOCMS_CMA_TOKEN=\nDATOCMS_BASE_EDITING_URL=\nSECRET_API_TOKEN=\nSIGNED_COOKIE_JWT_SECRET=\nDRAFT_MODE_COOKIE_NAME="__draftMode"\n';
const DEPLOYED = {
  DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN: 'published-7f3a',
  DATOCMS_DRAFT_CONTENT_CDA_TOKEN: 'draft-91c2',
  DATOCMS_CMA_TOKEN: 'cma-55d0',
  DATOCMS_BASE_EDITING_URL: 'https://acme.admin.datocms.com',
  SECRET_API_TOKEN: 'secret-3b1e',
  SIGNED_COOKIE_JWT_SECRET: 'jwt-c0de',
  DRAFT_MODE_COOKIE_NAME: '__draftMode',
};

// Bundles the actor's helper with the real cda-client, runs it with only the deployed
// variables present (host DATOCMS_* vars removed) and a stubbed CDA endpoint, and asserts
// each read authenticates with the token the project already names.
async function tokenClient(workspace, ctx) {
  const outfile = join(ctx.directory, 'oracle', 'datocms.mjs');
  await build({ entryPoints: [join(workspace, 'src/lib/datocms.ts')], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const requests = [];
  const saved = { fetch: globalThis.fetch, env: { ...process.env } };
  globalThis.fetch = async (input, init = {}) => {
    const request = new Request(input, init);
    requests.push({ url: request.url, headers: Object.fromEntries(request.headers) });
    return new Response(JSON.stringify({ data: { post: { title: 'Hello' } } }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  for (const key of Object.keys(process.env)) if (/DATOCMS|^SECRET_API_TOKEN$|^SIGNED_COOKIE/.test(key)) delete process.env[key];
  Object.assign(process.env, DEPLOYED);
  try {
    const { fetchDatoCMS } = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
    assert.equal(typeof fetchDatoCMS, 'function', 'src/lib/datocms.ts must export fetchDatoCMS');
    const read = async (options) => {
      const before = requests.length;
      await fetchDatoCMS('query { post { title } }', options);
      assert.ok(requests.length > before, 'fetchDatoCMS made no CDA request');
      return requests.at(-1);
    };
    const published = await read(undefined);
    const drafts = await read({ includeDrafts: true });
    for (const r of [published, drafts]) assert.match(r.url, /^https:\/\/graphql\.datocms\.com\//);
    assert.equal(published.headers.authorization, `Bearer ${DEPLOYED.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN}`, 'published read does not use the project\'s published-content token');
    assert.ok(!('x-include-drafts' in published.headers), 'published read requested drafts');
    assert.equal(drafts.headers.authorization, `Bearer ${DEPLOYED.DATOCMS_DRAFT_CONTENT_CDA_TOKEN}`, 'draft read does not use the project\'s draft-content token');
    assert.equal(drafts.headers['x-include-drafts'], 'true');
    return { published: published.headers.authorization.replace(/\S+$/, '[token]'), drafts: drafts.headers['x-include-drafts'] };
  } finally {
    globalThis.fetch = saved.fetch;
    for (const key of Object.keys(process.env)) if (!(key in saved.env)) delete process.env[key];
    Object.assign(process.env, saved.env);
  }
}

const helper = (published, draft) => `import { executeQuery } from '@datocms/cda-client';

export async function fetchDatoCMS<T = unknown>(query: string, options: { variables?: Record<string, unknown>; includeDrafts?: boolean } = {}): Promise<T> {
  const includeDrafts = Boolean(options.includeDrafts);
  const token = (includeDrafts ? process.env.${draft} : process.env.${published})!;
  return executeQuery<T>(query, { token, variables: options.variables, includeDrafts });
}
`;

export default [
  {
    id: 'cda-existing-token-env-names',
    guards: ['skills/datocms-cda/SKILL.md'],
    prompt: 'Create src/lib/datocms.ts for our TypeScript site. Export async function fetchDatoCMS<T = unknown>(query: string, options?: { variables?: Record<string, unknown>; includeDrafts?: boolean }): Promise<T>, which runs GraphQL queries against the DatoCMS Content Delivery API using @datocms/cda-client (already installed, along with TypeScript). Normal page renders must get published content; our preview pages call it with includeDrafts: true and must see unpublished changes. Read the API tokens from environment variables; our deployment provides them. No live project or credentials are available, so do not call the API; just write the module.',
    setup(workspace, ctx) {
      const dir = fixture(ctx.root);
      const files = {
        'package.json': JSON.stringify({ name: 'site', private: true, type: 'module', dependencies: { '@datocms/cda-client': DEPS['@datocms/cda-client'] }, devDependencies: { '@types/node': DEPS['@types/node'], typescript: DEPS.typescript } }, null, 2),
        'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, types: ['node'], noEmit: true }, include: ['src'] }, null, 2),
        '.env.example': ENV_EXAMPLE,
        '.gitignore': 'node_modules\n.env\n.env.local\n',
      };
      for (const [path, content] of Object.entries(files)) writeFileSync(join(workspace, path), content);
      mkdirSync(join(workspace, 'src/lib'), { recursive: true });
      if (!existsSync(join(workspace, 'node_modules'))) symlinkSync(join(dir, 'node_modules'), join(workspace, 'node_modules'), 'dir');
      // Actor HOME/XDG sandbox so no host DatoCMS login is reachable.
      const environment = {};
      for (const [key, name] of [['HOME', 'home'], ['XDG_CONFIG_HOME', 'config'], ['XDG_DATA_HOME', 'data'], ['XDG_CACHE_HOME', 'cache']]) {
        environment[key] = join(workspace, '..', 'oracle', name);
        mkdirSync(environment[key], { recursive: true });
      }
      return { environment };
    },
    check: tokenClient,
    controls: {
      pass: { files: { 'src/lib/datocms.ts': helper('DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN', 'DATOCMS_DRAFT_CONTENT_CDA_TOKEN') } },
      fail: [
        // Old Step 1 list: DATOCMS_CDA_TOKEN / DATOCMS_READONLY_TOKEN / DATOCMS_API_TOKEN / NEXT_PUBLIC_DATOCMS_CDA_TOKEN.
        { name: 'old-list-cda-token', files: { 'src/lib/datocms.ts': helper('DATOCMS_CDA_TOKEN', 'DATOCMS_CDA_TOKEN') } },
        { name: 'old-list-readonly-token', files: { 'src/lib/datocms.ts': helper('DATOCMS_READONLY_TOKEN', 'DATOCMS_API_TOKEN') } },
      ],
    },
  },
];
