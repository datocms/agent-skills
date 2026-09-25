import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// CJS preload for every node process the npm script starts: replaces fetch before @datocms/cli-utils
// captures it, logs each request and serves a tiny CMA whose primary has editors active. Forked
// environments persist across CLI processes (e.g. environments:fork then migrations:run --in-place),
// and browser launchers (datocms login) are refused so no host browser session is reachable.
const MOCK = `const fs = require('node:fs'), cp = require('node:child_process'), spawn = cp.spawn;
cp.spawn = (cmd, ...rest) => { if (/(^|\\/)(open|xdg-open)$/.test(String(cmd))) throw new Error('ORACLE_NO_BROWSER'); return spawn(cmd, ...rest); };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const fail = (status, code) => json(status, { data: [{ id: 'oracle', type: 'api_error', attributes: { code, details: {} } }] });
const env = (id, primary) => ({ id, type: 'environment', meta: { status: 'ready', primary, read_only_mode: false, created_at: '2026-01-01T00:00:00Z', last_data_change_at: '2026-01-01T00:00:00Z', forked_from: primary ? null : 'main' } });
const forked = process.env.ORACLE_LOG + '.envs';
const envs = () => [env('main', true), env('staging', false), ...(fs.existsSync(forked) ? fs.readFileSync(forked, 'utf8').split('\\n').filter(Boolean).map((id) => env(id, false)) : [])];
function route(method, path, q, scoped, body) {
  // Inside an environment: no migration model yet, and every write stops the run after being logged.
  if (scoped) return method === 'GET' && path.startsWith('/item-types/') ? fail(404, 'NOT_FOUND') : fail(403, 'ORACLE_STOP');
  if (method === 'GET' && path === '/environments') return json(200, { data: envs() });
  const found = method === 'GET' && envs().find((e) => path === '/environments/' + e.id);
  if (found) return json(200, { data: found });
  if (method === 'POST' && /^\\/environments\\/[^/]+\\/fork$/.test(path)) {
    if (q.get('fast') === 'true' && q.get('force') !== 'true') return fail(422, 'ACTIVE_EDITING_SESSIONS');
    fs.appendFileSync(forked, body?.data?.id + '\\n');
    return json(200, { data: env(body?.data?.id, false) });
  }
  return fail(422, 'ORACLE_UNSUPPORTED');
}
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input)), headers = Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  const body = init.body ? JSON.parse(init.body) : undefined, method = init.method ?? 'GET';
  const response = url.host === 'site-api.datocms.com' ? route(method, url.pathname, url.searchParams, headers['x-environment'] ?? null, body) : fail(403, 'ORACLE_FOREIGN_HOST');
  fs.appendFileSync(process.env.ORACLE_LOG, JSON.stringify({ method, host: url.host, path: url.pathname, query: url.search, env: headers['x-environment'] ?? null, body, status: response.status }) + '\\n');
  return response;
};`;

const MIGRATION = "import type { Client } from 'datocms/lib/cma-client-node';\n\nexport default async function (client: Client): Promise<void> {\n  await client.fields.create('author', { label: 'Bio', api_key: 'bio', field_type: 'text' });\n}\n";
const PACKAGE = (script) => JSON.stringify({ name: 'acme-content', private: true, scripts: { ...(script && { 'migrate:sandbox': script }) }, devDependencies: { datocms: '4.2.0', typescript: '^5' } }, null, 2);

// Runs the actor's npm script on a copy of the workspace with the real installed datocms CLI and fetch mocked.
function runScript({ root, directory, workspace }) {
  const check = join(directory, 'check'), repo = join(check, 'repo'), home = join(check, 'home'), log = join(check, 'requests.jsonl');
  rmSync(check, { recursive: true, force: true });
  cpSync(workspace, repo, { recursive: true, filter: (p) => !/[\\/](node_modules|\.git|\.agents)$/.test(p) });
  symlinkSync(join(root, 'node_modules'), join(repo, 'node_modules'));
  for (const dir of ['.config', '.cache', '.local/share']) mkdirSync(join(home, dir), { recursive: true });
  writeFileSync(join(check, 'mock.cjs'), MOCK);
  const r = spawnSync('npm', ['run', 'migrate:sandbox'], {
    cwd: repo, encoding: 'utf8', timeout: 180000,
    env: { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR, HOME: home, XDG_CONFIG_HOME: join(home, '.config'), XDG_CACHE_HOME: join(home, '.cache'), XDG_DATA_HOME: join(home, '.local/share'), NO_COLOR: '1', DATOCMS_SKIP_NEW_VERSION_CHECK: 'true', npm_config_offline: 'true', npm_config_update_notifier: 'false', NODE_OPTIONS: `--require=${join(check, 'mock.cjs')}`, ORACLE_LOG: log, DATOCMS_API_TOKEN: 'oracle-default-token' },
  });
  const requests = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line)) : [];
  writeFileSync(join(check, 'output.log'), `${r.stdout}\n${r.stderr}`);
  return { status: r.status, output: `${r.stdout}${r.stderr}`.slice(-1200), requests };
}

export default [
  {
    // datocms 4.2.0 lib/commands/migrations/run.js: 'fast-fork' dependsOn ['destination'], so oclif rejects
    // `migrations:run --fast-fork` without an explicit destination before any API call.
    id: 'cli-fast-fork-destination',
    guards: ['skills/datocms-cli/references/running-migrations.md'],
    prompt: 'Please add a `migrate:sandbox` npm script to package.json that applies our pending migrations in `migrations/` to a brand-new sandbox environment forked from our primary environment, so we can review the result before promoting anything. Our primary environment is large, so the script should use fast forking; editors are usually working in the primary environment when we run it, and we accept pausing their edits and want the fork to go ahead anyway. Any sandbox name is fine. The `datocms` CLI is already a devDependency and configured in `datocms.config.json`, and the shell that runs the script exports `DATOCMS_API_TOKEN`. Do not run the migrations; no live project or credentials are available here.',
    setup(workspace, { root }) {
      const oracle = join(workspace, '..', 'oracle');
      const environment = Object.fromEntries(['HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME'].map((k) => [k, join(oracle, k.toLowerCase())]));
      Object.values(environment).forEach((dir) => mkdirSync(dir, { recursive: true }));
      mkdirSync(join(workspace, 'migrations'), { recursive: true });
      writeFileSync(join(workspace, 'package.json'), PACKAGE());
      writeFileSync(join(workspace, 'datocms.config.json'), JSON.stringify({ profiles: { default: { migrations: { directory: './migrations' } } } }, null, 2));
      writeFileSync(join(workspace, 'migrations/1726000000_addAuthorBio.ts'), MIGRATION);
      symlinkSync(join(root, 'node_modules'), join(workspace, 'node_modules'));
      return { environment };
    },
    async check(workspace, ctx) {
      const script = JSON.parse(readFileSync(join(workspace, 'package.json'), 'utf8')).scripts?.['migrate:sandbox'];
      assert.ok(script, 'package.json has no migrate:sandbox script');
      // The run stops at the first sandbox write, so a chained `&& datocms environments:promote` would never execute.
      assert.doesNotMatch(script, /environments:promote/, 'Script must leave promotion until after review');
      const run = runScript(ctx);
      assert.ok(!/must be provided when using --fast-fork/.test(run.output), `CLI rejects the fast-fork flags: ${run.output}`);
      const forks = run.requests.filter((q) => q.method === 'POST' && q.path.endsWith('/fork'));
      assert.equal(forks.length, 1, `Expected one environment fork, got ${forks.length}: ${run.output}`);
      const [fork] = forks;
      assert.equal(fork.path, '/environments/main/fork', 'Fork must start from the primary environment');
      assert.equal(new URLSearchParams(fork.query).get('fast'), 'true', 'Fork is not a fast fork');
      assert.equal(fork.status, 200, `Fast fork refused while editors are active: ${run.output}`);
      const sandbox = fork.body?.data?.id;
      const writes = run.requests.filter((q) => q.env && q.method !== 'GET');
      assert.ok(writes.length, `CLI never started migrating the new sandbox: ${run.output}`);
      assert.ok(writes.every((q) => q.env === sandbox), 'Migration writes left the new sandbox');
      assert.ok(run.requests.every((q) => q.env || q.method === 'GET' || q === fork), 'Unexpected project-level write');
      return { script, sandbox, requests: run.requests.map(({ method, path, query, env, status }) => `${method} ${path}${query} env=${env} -> ${status}`), network: 'mocked fetch; stopped at first sandbox write' };
    },
    controls: {
      pass: { files: { 'package.json': PACKAGE('datocms migrations:run --destination=release-review --fast-fork --force') } },
      fail: [
        { name: 'old-fast-fork-without-destination', files: { 'package.json': PACKAGE('datocms migrations:run --fast-fork --force') } },
        { name: 'regular-fork', files: { 'package.json': PACKAGE('datocms migrations:run --destination=release-review') } },
      ],
    },
  },
];
