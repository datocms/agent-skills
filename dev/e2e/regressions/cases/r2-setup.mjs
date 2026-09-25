import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';

const SITE = 'https://www.acme-example.com';
const SECRET = 'wp-preview-4f9c2e71b8'; // developer's .env.local value
const ROTATED = 'ci-rotated-93d1a6c5'; // value the machine running migrations:run supplies
const SEEDED = '1750000000_createArticleModel.ts';
const MIGRATION = /^\d+.*\.(js|ts)$/; // datocms 4.2.0 commands/migrations/run.js MIGRATION_FILE_REGEXP

const repo = {
  'package.json': JSON.stringify({
    name: 'acme-site', private: true,
    scripts: { dev: 'next dev', build: 'next build', 'datocms:migrations:run': 'npx datocms migrations:run' },
    dependencies: { '@datocms/cda-client': '^0.3.2', '@datocms/cma-client': '^5.1.0', '@datocms/rest-client-utils': '^5.1.0', next: '15.5.4', react: '19.1.1', 'react-dom': '19.1.1' },
    devDependencies: { datocms: '4.2.0', typescript: '5.9.3' },
  }, null, 2),
  'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'esnext', moduleResolution: 'bundler', strict: true, jsx: 'preserve', paths: { '@/*': ['./src/*'] } }, include: ['src', 'migrations'] }, null, 2),
  'datocms.config.json': JSON.stringify({ profiles: { default: { siteId: '184753', logLevel: 'NONE', migrations: { directory: './migrations', modelApiKey: 'schema_migration' } } } }, null, 2),
  '.gitignore': 'node_modules\n.next\n.env.local\n',
  '.env.example': 'DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=\nDATOCMS_DRAFT_CONTENT_CDA_TOKEN=\nSECRET_API_TOKEN=\nSITE_URL=https://www.example.com\n',
  '.env.local': `DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=cda-published-local\nDATOCMS_DRAFT_CONTENT_CDA_TOKEN=cda-draft-local\nSECRET_API_TOKEN=${SECRET}\nSITE_URL=${SITE}\n`,
  [`migrations/${SEEDED}`]: `import type { Client } from 'datocms/lib/cma-client-node';

export default async function (client: Client): Promise<void> {
  const article = await client.itemTypes.create({ name: 'Article', api_key: 'article' });
  await client.fields.create(article, { label: 'Slug', api_key: 'slug', field_type: 'slug' });
}
`,
  'src/lib/recordToWebsiteRoute.ts': `export function recordToWebsiteRoute(item: { attributes: Record<string, unknown> }, itemTypeApiKey: string): string | null {
  if (itemTypeApiKey === 'article') return \`/articles/\${item.attributes.slug}\`;
  return null;
}
`,
  'src/app/api/draft-mode/enable/route.ts': `import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('token') !== process.env.SECRET_API_TOKEN) return new Response('Invalid token', { status: 401 });
  (await draftMode()).enable();
  redirect(searchParams.get('url') ?? '/');
}
`,
  'src/app/api/preview-links/route.ts': `import { recordToWebsiteRoute } from '@/lib/recordToWebsiteRoute';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };

export function OPTIONS() {
  return new Response('ok', { headers: cors });
}

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  if (token !== process.env.SECRET_API_TOKEN) return Response.json({ error: 'Invalid token' }, { status: 401, headers: cors });
  const { item, itemType } = await request.json();
  const url = recordToWebsiteRoute(item, itemType.attributes.api_key);
  if (!url) return Response.json({ previewLinks: [] }, { headers: cors });
  const draft = new URL(\`/api/draft-mode/enable?token=\${token}&url=\${encodeURIComponent(url)}\`, request.url);
  return Response.json({ previewLinks: [{ label: 'Draft version', url: draft.toString() }, { label: 'Published version', url: new URL(url, request.url).toString() }] }, { headers: cors });
}
`,
};

const install = (secretExpr, siteExpr) => `import type { Client } from 'datocms/lib/cma-client-node';

export default async function (client: Client): Promise<void> {
  const secret = ${secretExpr};
  const baseUrl = ${siteExpr};
  const existing = (await client.plugins.list()).find((p) => p.package_name === 'datocms-plugin-web-previews');
  const plugin = existing ?? (await client.plugins.create({ package_name: 'datocms-plugin-web-previews' }));
  await client.plugins.update(plugin.id, {
    parameters: {
      frontends: [{ name: 'Production', previewWebhook: \`\${baseUrl}/api/preview-links?token=\${secret}\` }],
      startOpen: true,
    },
  });
}
`;
const ENV_READ = "process.env.SECRET_API_TOKEN ?? ''";

// Loads every new migration the way `datocms migrations:run` does: @datocms/cli-utils runs
// dotenv on .env.local/.env (existing env wins), then tsx require()s each file in-process.
// The CMA client is a recording fake; nothing reaches DatoCMS.
const RUNNER = `
const [cliUtils, tsxApi, ...files] = process.argv.slice(2);
require(cliUtils);
const calls = [];
const resource = (name) => new Proxy({}, { get: (_, method) => typeof method !== 'string' || method === 'then' ? undefined : async (...args) => {
  calls.push({ resource: name, method, args });
  if (/list/i.test(method)) return [];
  if (/create$/i.test(method)) return { id: name + '-1', ...(args.at(-1) ?? {}) };
  return { id: typeof args[0] === 'string' ? args[0] : args[0]?.id, ...(args[1] ?? {}) };
} });
const client = new Proxy({}, { get: (_, name) => typeof name !== 'string' || name === 'then' ? undefined : resource(name) });
(async () => {
  for (const file of files) {
    const exported = require(tsxApi).require(file, __filename);
    const migration = typeof exported === 'function' ? exported : exported?.default;
    if (typeof migration !== 'function') throw new Error(file + ' does not export a migration function');
    await migration(client);
  }
  process.stdout.write(JSON.stringify(calls));
})().catch((error) => { console.error(error?.stack ?? String(error)); process.exit(1); });
`;

function walk(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (['node_modules', '.git', '.agents', '.next'].includes(entry.name)) return [];
    return entry.isDirectory() ? walk(path, base) : entry.isFile() ? [relative(base, path)] : [];
  });
}

export default [
  {
    id: 'setup-web-previews-migration-secret',
    guards: ['skills/datocms-setup/recipes/frontend-foundation/web-previews/recipe.md'],
    prompt: `$datocms-setup Our Next.js site already has DatoCMS draft mode and a working \`/api/preview-links\` endpoint. Please finish the side-by-side preview setup by installing and configuring the Web Previews plugin for our Production frontend at ${SITE} (sidebar open by default; we don't need the Visual tab). We keep every DatoCMS project change in this repo's migrations, so do it as a new migration; we'll review it and run it ourselves later with \`npx datocms migrations:run\`. Those settings are final, no need to confirm them again. Don't run anything against DatoCMS: there is no DatoCMS login on this machine.`,
    budget: { timeoutMs: 420000, maxCommands: 60 },
    setup(workspace, ctx) {
      for (const [path, content] of Object.entries(repo)) {
        mkdirSync(join(workspace, path, '..'), { recursive: true });
        writeFileSync(join(workspace, path), content);
      }
      // Installed CLI (the real datocms 4.2.0) without a writable link into dev/node_modules.
      mkdirSync(join(workspace, 'node_modules/.bin'), { recursive: true });
      symlinkSync(join(ctx.root, 'node_modules/datocms'), join(workspace, 'node_modules/datocms'), 'dir');
      symlinkSync('../datocms/bin/run', join(workspace, 'node_modules/.bin/datocms'));
      const environment = {};
      for (const [key, name] of [['HOME', 'home'], ['XDG_CONFIG_HOME', 'config'], ['XDG_DATA_HOME', 'data'], ['XDG_CACHE_HOME', 'cache']]) {
        environment[key] = join(workspace, '..', 'oracle', 'actor', name);
        mkdirSync(environment[key], { recursive: true });
      }
      return { environment };
    },
    check(workspace, ctx) {
      const dir = join(workspace, 'migrations');
      const added = readdirSync(dir).filter((f) => MIGRATION.test(f) && f !== SEEDED).sort();
      assert.ok(added.length, 'No new migration in migrations/');
      // Migrations are committed: no tracked file may carry the developer's local secret.
      const leaked = walk(workspace).filter((f) => f !== '.env.local' && readFileSync(join(workspace, f), 'utf8').includes(SECRET));
      assert.deepEqual(leaked, [], 'Local SECRET_API_TOKEN value copied into repository files');
      // Run on another machine/CI: every env var holding the local secret carries a rotated value there.
      const envFiles = ['.env.local', '.env'].filter((f) => existsSync(join(workspace, f))).map((f) => readFileSync(join(workspace, f), 'utf8')).join('\n');
      const rotated = Object.fromEntries([...envFiles.matchAll(/^\s*(?:export\s+)?([A-Za-z_][\w]*)\s*=\s*["']?([^"'\n]*)/gm)].filter(([, , v]) => v.trim() === SECRET).map(([, k]) => [k, ROTATED]));
      const oracle = join(ctx.directory, 'oracle');
      mkdirSync(join(oracle, 'home'), { recursive: true });
      writeFileSync(join(oracle, 'run-migrations.cjs'), RUNNER);
      const run = spawnSync(process.execPath, [join(oracle, 'run-migrations.cjs'), ...['@datocms/cli-utils', 'tsx/cjs/api'].map((m) => createRequire(join(ctx.root, 'node_modules/datocms/lib/commands/migrations/run.js')).resolve(m)), ...added.map((f) => join(dir, f))], {
        cwd: workspace, encoding: 'utf8', timeout: 120000,
        env: { PATH: process.env.PATH, HOME: join(oracle, 'home'), TMPDIR: process.env.TMPDIR ?? '/tmp', ...rotated },
      });
      assert.equal(run.status, 0, `Migration run failed: ${run.stderr.slice(-1500)}`);
      const calls = JSON.parse(run.stdout).filter((c) => c.resource === 'plugins');
      assert.ok(calls.some((c) => /create$/i.test(c.method) && c.args.some((a) => a?.package_name === 'datocms-plugin-web-previews')), 'Web Previews plugin not installed');
      const parameters = calls.filter((c) => /(create|update)$/i.test(c.method)).flatMap((c) => c.args).filter((a) => a?.parameters?.frontends).at(-1)?.parameters;
      assert.ok(parameters?.frontends?.length, 'No frontends configured');
      for (const frontend of parameters.frontends)
        for (const [label, value, path] of [['previewWebhook', frontend.previewWebhook, '/api/preview-links'], ['enableDraftModeUrl', frontend.visualEditing?.enableDraftModeUrl, '/api/draft-mode/enable']]) {
          if (label === 'enableDraftModeUrl' && value === undefined) continue;
          const url = new URL(value);
          assert.equal(url.origin + url.pathname, SITE + path, `${frontend.name} ${label}`);
          assert.equal(url.searchParams.get('token'), ROTATED, `${frontend.name} ${label} does not use the runtime SECRET_API_TOKEN: ${value}`);
        }
      return { migrations: added, rotated: Object.keys(rotated), parameters };
    },
    controls: {
      pass: { files: { 'migrations/1760000000_installWebPreviewsPlugin.ts': install(ENV_READ, `process.env.SITE_URL ?? '${SITE}'`) } },
      fail: [
        { name: 'resolved-secret-inlined', files: { 'migrations/1760000000_installWebPreviewsPlugin.ts': install(`'${SECRET}'`, `'${SITE}'`) } },
        { name: 'reference-body-verbatim', files: { 'migrations/1760000000_installWebPreviewsPlugin.ts': install(ENV_READ, `'${SITE}'`).replace(/const secret[^\n]+\n\s+const baseUrl[^\n]+\n/, '').replace('${secret}', '${SECRET_API_TOKEN}') } },
      ],
    },
  },
];
