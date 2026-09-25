import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

const TOKEN = 'ci-synthetic-cma-token-7f3a';
const SHA = 'c0ffee1234567890abcdef1234567890abcdef12';
const WORKFLOW = '.github/workflows/datocms-migrations.yml';
// Shape written by `datocms link --site-id=...` (datocms 4.2.0 lib/commands/link.js).
const CONFIG = { profiles: { default: { siteId: '184932', logLevel: 'NONE', migrations: { directory: './migrations', modelApiKey: 'schema_migration' } } } };
const GITHUB = { 'github.sha': SHA, 'github.event.after': SHA, 'github.event.head_commit.id': SHA, 'github.ref': 'refs/heads/main', 'github.ref_name': 'main', 'github.run_id': '9012345678', 'github.run_number': '42', 'github.run_attempt': '1', 'github.event_name': 'push', 'github.repository': 'acme/site', 'github.actor': 'dev' };

// Real CLI command class: its own flag parser and CmaClientCommand token resolution; fetch is blocked.
const PROBE = `const [root, id, ...argv] = JSON.parse(process.argv[1]);
globalThis.fetch = async () => { throw new Error('Network blocked by oracle'); };
(async () => {
  const { Config } = require(require.resolve('@oclif/core', { paths: [root] }));
  const config = await Config.load(root);
  const found = config.findCommand(id);
  if (!found) throw new Error('Unknown datocms command ' + id);
  const Command = await found.load();
  const cmd = new Command(argv, config);
  await cmd.init();
  const { flags, args } = await cmd.parse(Command);
  console.log(JSON.stringify({ id: found.id, cma: 'client' in cmd, token: cmd.client?.config?.apiToken ?? null, flags: { ...flags, 'api-token': flags['api-token'] && '[token]' }, args }));
})().catch((e) => console.log(JSON.stringify({ id, error: e.message })));`;

// Records argv after the `datocms` token for npx/npm exec/pnpm/yarn/bin calls; `npm run` executes package scripts.
const shim = (log) => `#!${process.execPath}
const fs = require('node:fs'), argv = process.argv.slice(2), tool = require('node:path').basename(process.argv[1]);
const at = tool === 'datocms' ? -1 : argv.findIndex((a) => a === 'datocms' || a.startsWith('datocms@'));
if (tool === 'datocms' || at >= 0) fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ argv: argv.slice(at + 1).filter((a, i) => i || a !== '--'), cwd: process.cwd(), env: process.env }) + '\\n');
else if (tool === 'npm' && ['run', 'run-script'].includes(argv[0])) {
  const script = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts?.[argv[1]];
  if (!script) { console.error('Missing script ' + argv[1]); process.exit(1); }
  process.exit(require('node:child_process').spawnSync('bash', ['-c', script + ' "$@"', 'npm', ...argv.slice(2).filter((a) => a !== '--')], { stdio: 'inherit' }).status ?? 1);
}`;

function dotenvFile(path) {
  const vars = {}, lines = existsSync(path) ? readFileSync(path, 'utf8').split('\n') : [];
  for (let i = 0; i < lines.length; i++) {
    const heredoc = lines[i].match(/^([^=<]+)<<(.+)$/);
    if (heredoc) { const end = lines.indexOf(heredoc[2], i + 1); vars[heredoc[1]] = lines.slice(i + 1, end).join('\n'); i = end; }
    else if (lines[i].includes('=')) vars[lines[i].slice(0, lines[i].indexOf('='))] = lines[i].slice(lines[i].indexOf('=') + 1);
  }
  return vars;
}

// Emulates the GitHub runner for the success path: bash steps with substituted expressions and shimmed package tools.
function runWorkflow(workflow, workspace, directory) {
  const check = join(directory, 'check'), repo = join(check, 'repo'), bin = join(check, 'bin'), home = join(check, 'home'), log = join(check, 'calls.jsonl');
  rmSync(check, { recursive: true, force: true });
  cpSync(workspace, repo, { recursive: true, filter: (p) => !/[\\/](node_modules|\.git|\.agents)$/.test(p) });
  for (const dir of [bin, join(repo, 'node_modules/.bin'), join(home, '.config'), join(home, '.cache'), join(home, '.local/share'), join(check, 'tmp')]) mkdirSync(dir, { recursive: true });
  for (const tool of ['npx', 'npm', 'pnpm', 'yarn', 'datocms']) writeFileSync(join(bin, tool), shim(log), { mode: 0o755 });
  writeFileSync(join(repo, 'node_modules/.bin/datocms'), shim(log), { mode: 0o755 });
  // Shims are CommonJS; the enclosing repo package.json is "type": "module".
  for (const dir of [bin, join(repo, 'node_modules/.bin')]) writeFileSync(join(dir, 'package.json'), '{"type":"commonjs"}');
  const base = { PATH: `${bin}:${process.env.PATH}`, HOME: home, XDG_CONFIG_HOME: join(home, '.config'), XDG_CACHE_HOME: join(home, '.cache'), XDG_DATA_HOME: join(home, '.local/share'), CI: 'true', GITHUB_ACTIONS: 'true', GITHUB_SHA: SHA, GITHUB_REF: 'refs/heads/main', GITHUB_REF_NAME: 'main', GITHUB_RUN_ID: GITHUB['github.run_id'], GITHUB_RUN_NUMBER: '42', GITHUB_RUN_ATTEMPT: '1', GITHUB_EVENT_NAME: 'push', GITHUB_REPOSITORY: 'acme/site', GITHUB_WORKSPACE: repo, RUNNER_TEMP: join(check, 'tmp') };
  const steps = [];
  for (const [jobId, job] of Object.entries(workflow.jobs ?? {})) {
    const outputs = {}, githubEnv = join(check, `${jobId}.env`);
    const expand = (text, env) => String(text).replace(/\$\{\{\s*([\s\S]*?)\s*\}\}/g, (_, e) => {
      let m;
      if ((m = e.match(/^secrets(?:\.(\w+)|\[['"](\w+)['"]\])$/))) return (m[1] ?? m[2]) === 'DATOCMS_API_TOKEN' ? TOKEN : '';
      if (e in GITHUB) return GITHUB[e];
      if ((m = e.match(/^env\.(\w+)$/))) return env[m[1]] ?? '';
      if ((m = e.match(/^steps\.([\w-]+)\.outputs\.([\w-]+)$/))) return outputs[m[1]]?.[m[2]] ?? '';
      if (/^vars\.\w+$/.test(e)) return '';
      throw new Error(`Oracle cannot evaluate expression: ${e}`);
    });
    const layer = (env, map) => Object.entries(map ?? {}).reduce((acc, [k, v]) => ({ ...acc, [k]: expand(v, acc) }), env);
    for (const [index, step] of (job.steps ?? []).entries()) {
      const condition = String(step.if ?? '');
      if (!step.run || (!/always\(\)/.test(condition) && /failure\(\)|cancelled\(\)/.test(condition))) continue;
      const output = join(check, `${jobId}-${index}.out`);
      const env = { ...layer(layer(layer({ ...base, ...dotenvFile(githubEnv) }, workflow.env), job.env), step.env), GITHUB_ENV: githubEnv, GITHUB_OUTPUT: output };
      const script = join(check, `${jobId}-${index}.sh`);
      writeFileSync(script, expand(step.run, env));
      const cwd = join(repo, step['working-directory'] ?? job.defaults?.run?.['working-directory'] ?? '.');
      const result = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', script], { cwd, env, encoding: 'utf8', timeout: 60000 });
      steps.push({ job: jobId, step: step.name ?? step.id ?? index, status: result.status });
      assert.equal(result.status, 0, `Step "${step.name ?? index}" failed: ${(result.stderr || result.stdout).slice(-500)}`);
      if (step.id) outputs[step.id] = dotenvFile(output);
    }
  }
  const calls = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line)) : [];
  return { steps, calls };
}

const pass = `name: DatoCMS migrations
on:
  push:
    branches: [main]
    paths: ['migrations/**']
jobs:
  migrate:
    runs-on: ubuntu-latest
    env:
      DATOCMS_API_TOKEN: \${{ secrets.DATOCMS_API_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx datocms maintenance:on --api-token="$DATOCMS_API_TOKEN"
      - run: npx datocms migrations:run --destination=\${{ github.sha }} --api-token="$DATOCMS_API_TOKEN"
      - run: npx datocms environments:promote \${{ github.sha }} --api-token="$DATOCMS_API_TOKEN"
      - if: always()
        run: npx datocms maintenance:off --api-token="$DATOCMS_API_TOKEN"
`;
// Verbatim CI example from the previous skills/datocms-cli/references/deployment-workflow.md.
const oldExample = `name: Deploy Migrations
on:
  push:
    branches: [main]
    paths: ['migrations/**']

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Enable maintenance mode
        run: npx datocms maintenance:on
        env:
          DATOCMS_API_TOKEN: \${{ secrets.DATOCMS_API_TOKEN }}

      - name: Run migrations
        run: npx datocms migrations:run --destination=\${{ github.sha }}
        env:
          DATOCMS_API_TOKEN: \${{ secrets.DATOCMS_API_TOKEN }}

      - name: Promote environment
        run: npx datocms environments:promote \${{ github.sha }}
        env:
          DATOCMS_API_TOKEN: \${{ secrets.DATOCMS_API_TOKEN }}

      - name: Disable maintenance mode
        run: npx datocms maintenance:off
        env:
          DATOCMS_API_TOKEN: \${{ secrets.DATOCMS_API_TOKEN }}
        if: always()
`;

export default [
  {
    id: 'cli-ci-linked-auth',
    guards: ['skills/datocms-cli/references/deployment-workflow.md', 'skills/datocms-cli/references/cli-setup.md'],
    prompt: 'Please add a GitHub Actions workflow at `.github/workflows/datocms-migrations.yml`. On every push to `main` that touches `migrations/`, it must turn on DatoCMS maintenance mode, fork our primary environment into a new sandbox named after the commit, run the pending migrations from `migrations/` in that sandbox, promote the sandbox to primary, and turn maintenance mode off again even if an earlier step failed. The GitHub runner has no DatoCMS login; the only credential there is the repository secret `DATOCMS_API_TOKEN` (a full-access API token). Leave `datocms.config.json` exactly as it is; the team uses it for local work. The `datocms` CLI is already a devDependency and installed (`npm ci` works in CI). No live DatoCMS project or credentials are available in this environment, so do not run commands against DatoCMS; just write the workflow file.',
    async setup(workspace, { root }) {
      const oracle = join(workspace, '..', 'oracle');
      const environment = Object.fromEntries(['HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME'].map((k) => [k, join(oracle, k.toLowerCase())]));
      Object.values(environment).forEach((dir) => mkdirSync(dir, { recursive: true }));
      // No-op browser openers so `datocms login` cannot reach the host browser; login-shell profiles re-prepend after path_helper.
      const bin = join(oracle, 'bin');
      mkdirSync(bin, { recursive: true });
      for (const tool of ['open', 'xdg-open']) writeFileSync(join(bin, tool), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
      for (const rc of ['.zprofile', '.bash_profile']) writeFileSync(join(environment.HOME, rc), `export PATH="${bin}:$PATH"\n`);
      environment.PATH = `${bin}:${process.env.PATH}`;
      writeFileSync(join(workspace, 'package.json'), JSON.stringify({ name: 'acme-site', private: true, devDependencies: { datocms: '4.2.0' } }, null, 2));
      writeFileSync(join(workspace, 'datocms.config.json'), JSON.stringify(CONFIG, null, 2));
      mkdirSync(join(workspace, 'migrations'), { recursive: true });
      writeFileSync(join(workspace, 'migrations/1726000000_addAuthorModel.ts'), "import { Client } from 'datocms/lib/cma-client-node';\n\nexport default async function (client: Client): Promise<void> {\n  await client.itemTypes.create({ name: 'Author', api_key: 'author' });\n}\n");
      symlinkSync(join(root, 'node_modules'), join(workspace, 'node_modules'));
      return { environment };
    },
    async check(workspace, { root, directory }) {
      assert.deepEqual(JSON.parse(readFileSync(join(workspace, 'datocms.config.json'), 'utf8')), CONFIG, 'datocms.config.json must stay as committed');
      const workflow = YAML.parse(readFileSync(join(workspace, WORKFLOW), 'utf8'));
      assert.ok(workflow.on?.push, 'Workflow must run on push');
      if (workflow.on.push.branches) assert.ok([].concat(workflow.on.push.branches).includes('main'), 'Push trigger must include main');
      const { steps, calls } = runWorkflow(workflow, workspace, directory);
      const results = calls.filter(({ argv }) => argv[0] && !argv[0].startsWith('-') && argv[0] !== 'help').map(({ argv, cwd, env }) => {
        const out = spawnSync(process.execPath, ['-e', PROBE, JSON.stringify([join(root, 'node_modules/datocms'), ...argv])], { cwd, env, encoding: 'utf8', timeout: 60000 });
        return JSON.parse(out.stdout.trim().split('\n').at(-1) || JSON.stringify({ id: argv[0], error: out.stderr.slice(-300) }));
      });
      for (const r of results) {
        assert.equal(r.error, undefined, `datocms ${r.id} cannot authenticate on the CI runner: ${r.error}`);
        if (r.cma) assert.equal(r.token, TOKEN, `datocms ${r.id} did not resolve the repository secret`);
      }
      const ids = results.map((r) => r.id);
      const at = { on: ids.indexOf('maintenance:on'), migrate: ids.indexOf('migrations:run'), promote: ids.indexOf('environments:promote'), off: ids.lastIndexOf('maintenance:off') };
      assert.ok(Object.values(at).every((i) => i >= 0), `Missing CLI steps: ${JSON.stringify(ids)}`);
      assert.ok(at.on < at.migrate && at.migrate < at.promote && at.promote < at.off, `Wrong order: ${JSON.stringify(ids)}`);
      const migrate = results[at.migrate];
      assert.ok(!migrate.flags['dry-run'], 'Migrations must actually run');
      const fork = migrate.flags.destination ?? (migrate.flags['in-place'] ? migrate.flags.source : undefined);
      assert.ok(fork, 'Migrations must run in a forked sandbox');
      if (!migrate.flags.destination) assert.ok(results.some((r) => r.id === 'environments:fork' && r.args.NEW_ENVIRONMENT_ID === fork), 'In-place run needs a fork');
      assert.equal(results[at.promote].args.ENVIRONMENT_ID, fork, 'Promote the migrated sandbox');
      return { steps, commands: results.map(({ id, flags, args, token }) => ({ id, flags, args, tokenResolved: token === TOKEN })), network: 'none; fetch blocked, no OAuth credentials in isolated HOME' };
    },
    controls: {
      pass: { files: { [WORKFLOW]: pass } },
      fail: [{ name: 'old-env-only-example', files: { [WORKFLOW]: oldExample } }],
    },
  },
];
