import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { words } from '../../acceptance/checks.mjs';

const require = createRequire(import.meta.url);
const TOKENS = { DATOCMS_PRODUCTION_PROFILE_API_TOKEN: 'oracle-production-token', DATOCMS_API_TOKEN: 'oracle-default-token', DATOCMS_CLIENT_B_PROFILE_API_TOKEN: 'oracle-client-b-token' };

// CJS preload: replaces fetch before @datocms/cli-utils captures it, logs every request and serves a tiny CMA.
const MOCK = `const fs = require('node:fs');
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const fail = (status, code) => json(status, { data: [{ id: 'oracle', type: 'api_error', attributes: { code, details: {} } }] });
const envs = [['main', true], ['staging', false]].map(([id, primary]) => ({ id, type: 'environment', meta: { status: 'ready', primary, read_only_mode: false, created_at: '2026-01-01T00:00:00Z', last_data_change_at: '2026-01-01T00:00:00Z', forked_from: null } }));
const models = [['it_article', 'Article', 'article'], ['it_page', 'Page', 'page'], ['it_author', 'Author', 'author', false], ['it_legacy', 'Legacy promo', 'legacy_promo']].map(([id, name, api_key, draft = true]) => ({ id, type: 'item_type', attributes: { name, api_key, modular_block: false, draft_mode_active: draft, singleton: false, sortable: false, tree: false, all_locales_required: false, collection_appearance: 'table', hint: null, inverse_relationships_enabled: false, draft_saving_active: false }, relationships: { fields: { data: [] }, fieldsets: { data: [] } }, meta: { has_singleton_item: false } }));
const records = [['r1', 'it_article', 'draft'], ['r2', 'it_article', 'published'], ['r3', 'it_article', 'draft'], ['r4', 'it_page', 'draft'], ['r5', 'it_page', 'published'], ['r6', 'it_author', 'published']].map(([id, model, status]) => ({ id, model, status }));
const record = (r) => ({ id: r.id, type: 'item', attributes: { title: 'Record ' + r.id }, relationships: { item_type: { data: { id: r.model, type: 'item_type' } } }, meta: { status: r.status, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', published_at: r.status === 'draft' ? null : '2026-01-02T00:00:00Z', first_published_at: null, current_version: 'v_' + r.id, stage: null, is_valid: true, is_current_version_valid: true, is_published_version_valid: true, has_children: null } });
const modelId = (key) => models.find((m) => m.id === key || m.attributes.api_key === key)?.id;
function items(q) {
  const known = /^(filter\\[(type|ids)\\]|filter\\[fields\\]\\[_status\\]\\[(eq|neq|in|not_in)\\](\\[\\])?|page\\[(offset|limit)\\]|version|nested|order_by|locale)$/;
  if ([...q.keys()].some((k) => !known.test(k))) return fail(422, 'ORACLE_UNSUPPORTED_QUERY');
  let list = records;
  const types = q.get('filter[type]')?.split(',').map(modelId);
  if (types?.includes('it_legacy')) return fail(403, 'INSUFFICIENT_PERMISSIONS');
  if (types) list = list.filter((r) => types.includes(r.model));
  if (q.get('filter[ids]')) list = list.filter((r) => q.get('filter[ids]').split(',').includes(r.id));
  const status = (op) => [...q.getAll('filter[fields][_status][' + op + ']'), ...q.getAll('filter[fields][_status][' + op + '][]')].flatMap((v) => v.split(','));
  if (status('eq').length) list = list.filter((r) => r.status === status('eq')[0]);
  if (status('neq').length) list = list.filter((r) => r.status !== status('neq')[0]);
  if (status('in').length) list = list.filter((r) => status('in').includes(r.status));
  if (status('not_in').length) list = list.filter((r) => !status('not_in').includes(r.status));
  const offset = Number(q.get('page[offset]') ?? 0), limit = Number(q.get('page[limit]') ?? 30);
  return json(200, { data: list.slice(offset, offset + limit).map(record), meta: { total_count: list.length } });
}
function route(kind, method, path, q, env, body) {
  if (kind === 'migrations') {
    if (env || path.endsWith('/fork')) return fail(403, 'ORACLE_STOP');
    if (method === 'GET' && path === '/environments') return json(200, { data: envs });
    const found = method === 'GET' && envs.find((e) => path === '/environments/' + e.id);
    return found ? json(200, { data: found }) : fail(404, 'NOT_FOUND');
  }
  if (kind === 'script' && method === 'GET') {
    if (path === '/item-types') return json(200, { data: models });
    if (path.startsWith('/item-types/') && modelId(path.slice(12))) return json(200, { data: models.find((m) => m.id === modelId(path.slice(12))) });
    if (path === '/items') return items(q);
    const one = records.find((r) => path === '/items/' + r.id);
    if (one) return json(200, { data: record(one) });
  }
  const scheduled = path.match(/^\\/items\\/([^/]+)\\/scheduled-publication$/);
  if (kind === 'schedule' && method === 'POST' && scheduled) return json(201, { data: { id: scheduled[1], type: 'scheduled_publication', attributes: { publication_scheduled_at: body?.data?.attributes?.publication_scheduled_at ?? null }, relationships: { item: { data: { id: scheduled[1], type: 'item' } } } } });
  return fail(422, 'ORACLE_UNSUPPORTED');
}
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input)), headers = Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  const body = init.body ? JSON.parse(init.body) : undefined, method = init.method ?? 'GET';
  const response = url.host === 'site-api.datocms.com' ? route(process.env.ORACLE_CASE, method, url.pathname, url.searchParams, headers['x-environment'] ?? null, body) : fail(403, 'ORACLE_FOREIGN_HOST');
  fs.appendFileSync(process.env.ORACLE_LOG, JSON.stringify({ method, host: url.host, path: url.pathname, query: url.search, env: headers['x-environment'] ?? null, auth: headers.authorization, body, status: response.status }) + '\\n');
  return response;
};`;

// Actor HOME/XDG live outside the workspace so the host's DatoCMS login is unreachable.
function prepare(workspace, root, files) {
  const oracle = join(workspace, '..', 'oracle');
  const environment = Object.fromEntries(['HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME'].map((k) => [k, join(oracle, k.toLowerCase())]));
  Object.values(environment).forEach((dir) => mkdirSync(dir, { recursive: true }));
  for (const [path, content] of Object.entries({ 'package.json': JSON.stringify({ name: 'acme-content', private: true, devDependencies: { datocms: '4.2.0', typescript: '^5' } }, null, 2), ...files })) {
    mkdirSync(join(workspace, path, '..'), { recursive: true });
    writeFileSync(join(workspace, path), content);
  }
  symlinkSync(join(root, 'node_modules'), join(workspace, 'node_modules'));
  return { environment };
}

// Runs the real installed datocms CLI on a copy of the workspace with fetch mocked; returns the CMA requests it made.
function runCli({ root, directory, workspace }, name, kind, id, argv, env) {
  const check = join(directory, 'check', name), repo = join(check, 'repo'), home = join(check, 'home'), log = join(check, 'requests.jsonl');
  rmSync(check, { recursive: true, force: true });
  cpSync(workspace, repo, { recursive: true, filter: (p) => !/[\\/](node_modules|\.git|\.agents)$/.test(p) });
  symlinkSync(join(root, 'node_modules'), join(repo, 'node_modules'));
  for (const dir of ['.config', '.cache', '.local/share']) mkdirSync(join(home, dir), { recursive: true });
  writeFileSync(join(check, 'mock.cjs'), MOCK);
  const r = spawnSync(process.execPath, ['-r', join(check, 'mock.cjs'), join(root, 'node_modules/datocms/bin/run'), id, ...argv], {
    cwd: repo, encoding: 'utf8', timeout: 120000,
    env: { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR, HOME: home, XDG_CONFIG_HOME: join(home, '.config'), XDG_CACHE_HOME: join(home, '.cache'), XDG_DATA_HOME: join(home, '.local/share'), NO_COLOR: '1', DATOCMS_SKIP_NEW_VERSION_CHECK: 'true', ORACLE_CASE: kind, ORACLE_LOG: log, ...env },
  });
  const requests = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line)) : [];
  writeFileSync(join(check, 'output.log'), `${r.stdout}\n${r.stderr}`);
  return { argv, status: r.status, stdout: r.stdout, output: `${r.stdout}${r.stderr}`.slice(-800), requests };
}

// Extracts `datocms <id>` invocations (npx/pnpm/yarn, env prefixes, inline code) from the answer; shell vars resolve from the run env.
function commandsIn(text, id, env) {
  const seen = new Map();
  const pattern = new RegExp(`(?:^|[\\s\`(])((?:[A-Z_][A-Z0-9_]*=\\S+\\s+)*)(?:(?:npx|bunx|pnpm|yarn|npm)\\s+(?:(?:exec|dlx|--yes|-y|--)\\s+)*)?datocms(?:@[\\w.^~-]+)?\\s+${id}(?![\\w:-])([^\`\\n]*)`, 'g');
  for (const line of text.replace(/\\\r?\n\s*/g, ' ').split(/\n|\s(?:&&|\|\||;|\|)\s/))
    for (const [, prefix, rest] of line.matchAll(pattern)) {
      const vars = Object.fromEntries([...prefix.matchAll(/([A-Z_][A-Z0-9_]*)=(\S+)/g)].map(([, k, v]) => [k, v.replace(/^['"]|['"]$/g, '')]));
      const argv = words(rest.split(/\s[#>]/)[0].replace(/\$\{?(\w+)\}?/g, (_, k) => env[k] ?? 'oracle-shell-value'));
      if (!argv.some((a) => a === '--help' || a === '-h')) seen.set(JSON.stringify([vars, argv]), { env: vars, argv });
    }
  return [...seen.values()];
}

const MIGRATION = "import type { Client } from 'datocms/lib/cma-client-node';\n\nexport default async function (client: Client): Promise<void> {\n  await client.fields.create('author', { label: 'Bio', api_key: 'bio', field_type: 'text' });\n}\n";
const SCRIPT = (catchClause, status = 'item.meta.status') => `import type { Client } from 'datocms/lib/cma-client-node';

export default async function (client: Client): Promise<void> {
  for (const model of await client.itemTypes.list()) {
    if (model.modular_block) continue;
    try {
      let drafts = 0;
      for await (const item of client.items.listPagedIterator({ filter: { type: model.api_key } })) {
        if (${status} === 'draft') drafts++;
      }
      console.log(\`\${model.api_key}: \${drafts}\`);
    } ${catchClause} {
      console.warn(\`\${model.api_key}: skipped (\${error instanceof Error ? error.message : String(error)})\`);
    }
  }
}
`;
const PACKAGE = (script) => JSON.stringify({ name: 'acme-content', private: true, scripts: { 'migrate:primary': script }, devDependencies: { datocms: '4.2.0', typescript: '^5' } }, null, 2);
const SCHEDULE_ENV = { DATOCMS_CLIENT_B_PROFILE_API_TOKEN: TOKENS.DATOCMS_CLIENT_B_PROFILE_API_TOKEN };
const PRODUCTION_ENV = { DATOCMS_PRODUCTION_PROFILE_API_TOKEN: TOKENS.DATOCMS_PRODUCTION_PROFILE_API_TOKEN };

export default [
  {
    id: 'cli-primary-in-place',
    guards: ['skills/datocms-cli/references/running-migrations.md', 'skills/datocms-cli/SKILL.md'],
    prompt: 'Please add a `migrate:primary` npm script to package.json. We have one pending migration in `migrations/`; it only adds an optional field, nothing is removed or rewritten. Our team has reviewed the risk, accepts that there is no rollback if it fails partway through, and explicitly confirms that this script should apply our pending migrations directly on the primary environment (`main`) of the project behind our `production` CLI profile, in place, with no sandbox fork and no promotion. The `datocms` CLI is already installed as a devDependency, and the shell that runs the script exports the API token for that profile. Do not run the migrations; no live project or credentials are available here.',
    setup: (workspace, { root }) => prepare(workspace, root, {
      'datocms.config.json': JSON.stringify({ profiles: { default: { migrations: { directory: './migrations' } }, production: { migrations: { directory: './migrations' } } } }, null, 2),
      'migrations/1726000000_addAuthorBio.ts': MIGRATION,
    }),
    async check(workspace, ctx) {
      const script = JSON.parse(readFileSync(join(workspace, 'package.json'), 'utf8')).scripts?.['migrate:primary'] ?? '';
      const commands = commandsIn(script, 'migrations:run', PRODUCTION_ENV);
      assert.ok(commands.length, `migrate:primary has no datocms migrations:run command: ${script}`);
      const runs = commands.map((c, i) => runCli(ctx, `run-${i}`, 'migrations', 'migrations:run', c.argv, { ...PRODUCTION_ENV, ...c.env }));
      for (const run of runs) assert.ok(!/primary environment is not allowed/.test(run.output), `CLI refuses in-place primary run: ${run.argv.join(' ')}`);
      const real = runs.filter((run) => !run.argv.includes('--dry-run'));
      assert.equal(real.length, 1, `Expected one command that applies the migrations, got ${real.length}`);
      const [run] = real;
      assert.ok(!run.requests.some((q) => q.path.endsWith('/fork')), 'Command forks a sandbox instead of running in place');
      const scoped = run.requests.find((q) => q.env);
      assert.ok(scoped, `CLI stopped before touching an environment: ${run.output}`);
      assert.equal(scoped.env, 'main', 'Migrations must run on the primary environment');
      assert.ok(run.requests.every((q) => q.auth === `Bearer ${TOKENS.DATOCMS_PRODUCTION_PROFILE_API_TOKEN}`), 'Command does not use the production profile token');
      return { script, commands: runs.map(({ argv, requests }) => ({ argv, requests: requests.map(({ method, path, env }) => `${method} ${path} env=${env}`) })), network: 'mocked fetch; stopped at first environment-scoped request' };
    },
    controls: {
      pass: { files: { 'package.json': PACKAGE('datocms migrations:run --in-place --allow-primary --profile=production') } },
      fail: [{ name: 'old-in-place-only', files: { 'package.json': PACKAGE('datocms migrations:run --in-place --profile=production') } }],
    },
  },
  {
    id: 'cli-cma-script-file',
    guards: ['skills/datocms-cli/references/cma-script.md'],
    prompt: 'Please write `scripts/draft-counts.ts`, a one-off script we will run with `npx datocms cma:script scripts/draft-counts.ts`. It should print one line per model in our DatoCMS project with the model API key and how many of its records are currently drafts. If the API refuses a model (for example a permissions error), print a warning for that model and keep going. Our tsconfig is strict and the `datocms` CLI plus TypeScript are already installed. There is no live project or API token here, so do not run it against DatoCMS; just write the file.',
    setup: (workspace, { root }) => prepare(workspace, root, {
      'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true, target: 'es2022', module: 'nodenext', moduleResolution: 'nodenext', noEmit: true, skipLibCheck: true }, include: ['scripts'] }, null, 2),
    }),
    async check(workspace, ctx) {
      const source = readFileSync(join(workspace, 'scripts/draft-counts.ts'), 'utf8');
      // Same options as datocms 4.2.0 lib/commands/cma/script.js runFileMode.
      const { validateScriptStructure } = require('datocms/lib/utils/script-workspace/validation');
      const structure = validateScriptStructure(source, { allowedPackages: null, requiredFormat: 'default-export' });
      assert.ok(structure.valid, `cma:script file-mode validation rejects the script: ${structure.errors.join(' ')}`);
      const run = runCli(ctx, 'script', 'script', 'cma:script', ['scripts/draft-counts.ts'], { DATOCMS_API_TOKEN: TOKENS.DATOCMS_API_TOKEN });
      assert.equal(run.status, 0, `cma:script run failed: ${run.output}`);
      const unsupported = run.requests.filter((q) => q.status === 422);
      assert.deepEqual(unsupported, [], 'Script used CMA requests the oracle does not model');
      const counts = {};
      for (const key of ['article', 'page', 'author'])
        for (const line of run.stdout.split('\n')) {
          const at = line.toLowerCase().search(new RegExp(`\\b${key}\\b`));
          const number = at >= 0 && line.slice(at + key.length).match(/\d+/);
          if (number && !(key in counts)) counts[key] = Number(number[0]);
        }
      assert.equal(counts.article, 2, `Wrong draft count for article: ${run.stdout}`);
      assert.equal(counts.page, 1, `Wrong draft count for page: ${run.stdout}`);
      if ('author' in counts) assert.equal(counts.author, 0, 'Wrong draft count for author');
      return { structure, counts, requests: run.requests.map(({ method, path, query, status }) => `${method} ${path}${query} -> ${status}`) };
    },
    controls: {
      pass: { files: { 'scripts/draft-counts.ts': SCRIPT('catch (error)') } },
      fail: [
        { name: 'unknown-catch', files: { 'scripts/draft-counts.ts': SCRIPT('catch (error: unknown)') } },
        { name: 'any-cast', files: { 'scripts/draft-counts.ts': SCRIPT('catch (error)', '(item as any).meta.status') } },
      ],
    },
  },
  {
    id: 'cli-schedule-publication-call',
    guards: ['skills/datocms-cli/references/direct-cma-calls.md'],
    prompt: 'Give me the single `datocms cma:call` command that schedules record `abc123` to be published at 2026-10-01T09:00:00Z in environment `editorial-qa`, using our `client_b` CLI profile. My shell exports the API token for that profile when I run it. Do not run anything or change files; no live project or credentials are available to you.',
    setup: (workspace, { root }) => prepare(workspace, root, {
      'datocms.config.json': JSON.stringify({ profiles: { client_a: { logLevel: 'NONE' }, client_b: { logLevel: 'NONE' } } }, null, 2),
    }),
    async check(workspace, ctx) {
      // Prose mentions like "the `datocms cma:call` command" are argv prefixes of the real command.
      const found = commandsIn(ctx.session.finalText, 'cma:call', SCHEDULE_ENV);
      const commands = found.filter((c) => !found.some((o) => o.argv.length > c.argv.length && c.argv.every((a, i) => o.argv[i] === a)));
      assert.equal(commands.length, 1, `Expected one cma:call command, got ${commands.length}`);
      const run = runCli(ctx, 'call', 'schedule', 'cma:call', commands[0].argv, { ...SCHEDULE_ENV, ...commands[0].env });
      assert.equal(run.status, 0, `cma:call failed: ${run.output}`);
      assert.equal(run.requests.length, 1, 'Expected exactly one CMA request');
      const [q] = run.requests;
      assert.deepEqual([q.method, q.path, q.env], ['POST', '/items/abc123/scheduled-publication', 'editorial-qa']);
      assert.equal(q.auth, `Bearer ${TOKENS.DATOCMS_CLIENT_B_PROFILE_API_TOKEN}`, 'Command does not use the client_b profile token');
      assert.equal(Date.parse(q.body?.data?.attributes?.publication_scheduled_at), Date.parse('2026-10-01T09:00:00Z'), 'Wrong publication time');
      return { argv: commands[0].argv, request: q };
    },
    controls: {
      pass: { finalText: "```bash\nnpx datocms cma:call scheduledPublication create abc123 --data '{publication_scheduled_at: \"2026-10-01T09:00:00Z\"}' --environment=editorial-qa --profile=client_b\n```" },
      fail: [{ name: 'old-plural-resource', finalText: "```bash\nnpx datocms cma:call scheduledPublications create abc123 --data '{publication_scheduled_at: \"2026-10-01T09:00:00Z\"}' --environment=editorial-qa --profile=client_b\n```" }],
    },
  },
];
