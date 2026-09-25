import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import YAML from 'yaml';

// The shipped CI assets must reach the real CLI with a usable token even when
// datocms.config.json is linked (siteId), where token env vars are never read.
const root = resolve(import.meta.dirname, '..');
const recipes = join(root, '../skills/datocms-setup/recipes/migrations');
const datocms = join(root, 'node_modules/datocms');

// Instantiates the real CLI command and runs its own flag parsing and token resolution.
const probe = `const [root, id, ...argv] = JSON.parse(process.argv[1]);
globalThis.fetch = async () => { throw new Error('network blocked'); };
(async () => {
  const { Config } = require(require.resolve('@oclif/core', { paths: [root] }));
  const config = await Config.load(root);
  const Command = await config.findCommand(id).load();
  const cmd = new Command(argv, config);
  await cmd.init();
  const { flags, args } = await cmd.parse(Command);
  console.log(JSON.stringify({ token: cmd.client.config.apiToken, profile: cmd.profileId, destination: flags.destination ?? null, args }));
})().catch((e) => console.log(JSON.stringify({ error: e.message })));`;

function sandbox(profiles) {
  const directory = mkdtempSync(join(tmpdir(), 'ci-assets-'));
  const bin = join(directory, 'bin'), log = join(directory, 'argv.jsonl');
  mkdirSync(bin);
  mkdirSync(join(directory, 'home'));
  writeFileSync(join(bin, 'npx'), `#!${process.execPath}\nconst fs=require('node:fs');fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(process.argv.slice(2))+'\\n');process.exit(process.argv[3]===process.env.SHIM_FAIL?1:0);\n`, {mode: 0o755});
  writeFileSync(join(directory, 'datocms.config.json'), JSON.stringify({profiles: Object.fromEntries(profiles.map((p, i) => [p, {siteId: String(90001 + i), logLevel: 'NONE', migrations: {directory: './migrations', modelApiKey: 'schema_migration'}}]))}));
  const env = {PATH: `${bin}:${dirname(process.execPath)}:/usr/bin:/bin`, HOME: join(directory, 'home'), XDG_CONFIG_HOME: join(directory, 'home/.config')};
  const calls = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line)) : []);
  return {directory, env, calls, cleanup: () => rmSync(directory, {recursive: true, force: true})};
}

// Runs the asset's helper step exactly as written, with GitHub expressions substituted.
function runAssetStep(asset, script, box, inputs) {
  const workflow = YAML.parse(readFileSync(join(recipes, asset), 'utf8'));
  const step = Object.values(workflow.jobs).flatMap((job) => job.steps).find((s) => s.run?.includes(`scripts/${script.split('/').pop()}`));
  const expand = (value) => String(value).replace(/\$\{\{\s*(inputs|secrets)\.(\w+)\s*\}\}/g, (_, scope, name) => (scope === 'inputs' ? inputs[name] : `secret-${name.toLowerCase()}`));
  assert.doesNotMatch(expand(step.run), /\$\{\{/, 'Unsupported expression in asset');
  const secrets = Object.fromEntries(Object.entries(step.env ?? {}).map(([k, v]) => [k, expand(v)]));
  mkdirSync(join(box.directory, 'scripts'), {recursive: true});
  copyFileSync(join(recipes, script), join(box.directory, 'scripts', script.split('/').pop()));
  const result = spawnSync('bash', ['-eo', 'pipefail', '-c', expand(step.run)], {cwd: box.directory, env: {...box.env, ...secrets}, encoding: 'utf8'});
  return {result, secrets};
}

function resolveWithRealCli(box, argv) {
  assert.equal(argv[0], 'datocms');
  const out = spawnSync(process.execPath, ['-e', probe, JSON.stringify([datocms, ...argv.slice(1)])], {cwd: box.directory, env: box.env, encoding: 'utf8'});
  return JSON.parse(out.stdout.trim().split('\n').at(-1));
}

test('release asset passes the destination flag and authenticates every command on a linked profile', () => {
  const box = sandbox(['default']);
  try {
    const {result, secrets} = runAssetStep('migration-release-workflow/assets/datocms-release.github-actions.yml', 'migration-release-workflow/scripts/datocms-release.mjs', box, {destination: 'release-42'});
    assert.equal(result.status, 0, result.stderr);
    const calls = box.calls();
    assert.deepEqual(calls.map((argv) => argv[1]), ['maintenance:on', 'migrations:run', 'environments:promote', 'maintenance:off']);
    for (const argv of calls) {
      const resolved = resolveWithRealCli(box, argv);
      assert.equal(resolved.error, undefined, `${argv[1]}: ${resolved.error}`);
      assert.equal(resolved.token, secrets.DATOCMS_API_TOKEN);
    }
    assert.equal(resolveWithRealCli(box, calls[1]).destination, 'release-42');
    assert.equal(resolveWithRealCli(box, calls[2]).args.ENVIRONMENT_ID, 'release-42');
  } finally { box.cleanup(); }
});

test('sync asset maps a secret per destination profile and each linked profile gets its own token', () => {
  const profiles = ['client_a', 'client_b'];
  const box = sandbox(profiles);
  try {
    const {result, secrets} = runAssetStep('blueprint-sync/assets/datocms-sync.github-actions.yml', 'blueprint-sync/scripts/datocms-sync-projects.mjs', box, {profiles: profiles.join(' '), dry_run: 'true'});
    assert.equal(result.status, 0, result.stderr);
    const calls = box.calls();
    assert.equal(calls.length, profiles.length);
    profiles.forEach((profile, i) => {
      const secret = secrets[`DATOCMS_${profile.toUpperCase()}_PROFILE_API_TOKEN`];
      assert.ok(secret, `No secret mapped for destination profile ${profile}`);
      const resolved = resolveWithRealCli(box, calls[i]);
      assert.equal(resolved.error, undefined, `${profile}: ${resolved.error}`);
      assert.equal(resolved.profile, profile);
      assert.equal(resolved.token, secret);
      assert.match(resolved.destination, new RegExp(`^${profile}-sync-`));
    });
  } finally { box.cleanup(); }
});

test('helpers keep local OAuth runs token-free and never print the token on failure', () => {
  for (const [script, args, env] of [
    ['migration-release-workflow/scripts/datocms-release.mjs', ['--destination=rel', '--profile=client_a'], {DATOCMS_CLIENT_A_PROFILE_API_TOKEN: 'leak-canary-1'}],
    ['blueprint-sync/scripts/datocms-sync-projects.mjs', ['client_a'], {DATOCMS_CLIENT_A_PROFILE_API_TOKEN: 'leak-canary-1'}],
  ]) {
    const box = sandbox(['client_a']);
    try {
      const local = spawnSync(process.execPath, [join(recipes, script), ...args], {cwd: box.directory, env: box.env, encoding: 'utf8'});
      assert.equal(local.status, 0, local.stderr);
      assert.ok(box.calls().every((argv) => !argv.some((a) => a.startsWith('--api-token'))));
      const failed = spawnSync(process.execPath, [join(recipes, script), ...args], {cwd: box.directory, env: {...box.env, ...env, SHIM_FAIL: 'migrations:run'}, encoding: 'utf8'});
      assert.notEqual(failed.status, 0);
      assert.ok(box.calls().some((argv) => argv.includes('--api-token=leak-canary-1')));
      assert.doesNotMatch(failed.stdout + failed.stderr, /leak-canary-1/);
      assert.match(failed.stderr, /Command failed: npx datocms migrations:run/);
    } finally { box.cleanup(); }
  }
});

test('sync helper only emits migrations:run flag combinations the real CLI accepts', () => {
  // datocms 4.2.0 migrations:run: --force dependsOn --fast-fork, --fast-fork dependsOn --destination.
  for (const flags of [['--force'], ['--fast-fork'], ['--fast-fork', '--force']]) {
    const box = sandbox(['client_a']);
    try {
      const env = {...box.env, DATOCMS_CLIENT_A_PROFILE_API_TOKEN: 'token-a'};
      const run = spawnSync(process.execPath, [join(recipes, 'blueprint-sync/scripts/datocms-sync-projects.mjs'), 'client_a', ...flags], {cwd: box.directory, env, encoding: 'utf8'});
      if (run.status !== 0) {
        assert.deepEqual(box.calls(), [], `${flags}: refused after running commands`);
        assert.match(run.stderr, /--force requires --fast-fork/);
        continue;
      }
      for (const argv of box.calls()) {
        const resolved = resolveWithRealCli({...box, env}, argv);
        assert.equal(resolved.error, undefined, `${flags.join(' ')}: ${resolved.error}`);
      }
    } finally { box.cleanup(); }
  }
});
