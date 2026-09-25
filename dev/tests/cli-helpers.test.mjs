import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import YAML from 'yaml';

// The helpers bundled with datocms-cli (scripts/, assets/) must reach the real CLI with a usable token even when
// datocms.config.json is linked (siteId), where token env vars are never read.
const root = resolve(import.meta.dirname, '..');
const cliSkill = join(root, '../skills/datocms-cli');
const datocms = join(root, 'node_modules/datocms');
const assets = ['assets/datocms-release.github-actions.yml', 'assets/datocms-sync.github-actions.yml'];

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

// Runs the asset's helper step (or the step `pick` selects) exactly as written, with GitHub expressions substituted.
function runAssetStep(asset, script, box, inputs, pick = (s) => s.run?.includes(`scripts/${script.split('/').pop()}`)) {
  const workflow = YAML.parse(readFileSync(join(cliSkill, asset), 'utf8'));
  const step = Object.values(workflow.jobs).flatMap((job) => job.steps).find(pick);
  const expand = (value) => String(value).replace(/\$\{\{\s*(inputs|secrets)\.(\w+)\s*\}\}/g, (_, scope, name) => (scope === 'inputs' ? inputs[name] : `secret-${name.toLowerCase()}`));
  assert.doesNotMatch(expand(step.run), /\$\{\{/, 'Unsupported expression in asset');
  const secrets = Object.fromEntries(Object.entries(step.env ?? {}).map(([k, v]) => [k, expand(v)]));
  mkdirSync(join(box.directory, 'scripts'), {recursive: true});
  copyFileSync(join(cliSkill, script), join(box.directory, 'scripts', script.split('/').pop()));
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
    const {result, secrets} = runAssetStep('assets/datocms-release.github-actions.yml', 'scripts/datocms-release.mjs', box, {destination: 'release-42'});
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

test('release asset serializes runs and unlocks the project in a last always-run step', () => {
  // The helper's finally never runs when a cancelled job kills node; the asset's last step must still unlock.
  const workflow = YAML.parse(readFileSync(join(cliSkill, assets[0]), 'utf8'));
  assert.ok(workflow.concurrency?.group, 'no concurrency group: overlapping releases unlock each other');
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.equal(workflow.jobs.release.steps.at(-1).if, 'always()');
  const box = sandbox(['default']);
  try {
    const {result, secrets} = runAssetStep(assets[0], 'scripts/datocms-release.mjs', box, {}, (s, i, steps) => i === steps.length - 1);
    assert.equal(result.status, 0, result.stderr);
    const calls = box.calls();
    assert.deepEqual(calls.map((argv) => argv[1]), ['maintenance:off']);
    const resolved = resolveWithRealCli(box, calls[0]);
    assert.equal(resolved.error, undefined, resolved.error);
    assert.equal(resolved.token, secrets.DATOCMS_API_TOKEN);
  } finally { box.cleanup(); }
});

test('release helper runs maintenance:off last whichever step fails, and after --skip-promote', () => {
  for (const [fail, extra, expected] of [
    ['maintenance:on', [], ['maintenance:on', 'maintenance:off']],
    ['migrations:run', [], ['maintenance:on', 'migrations:run', 'maintenance:off']],
    ['environments:promote', [], ['maintenance:on', 'migrations:run', 'environments:promote', 'maintenance:off']],
    ['', ['--skip-promote'], ['maintenance:on', 'migrations:run', 'maintenance:off']],
  ]) {
    const box = sandbox(['default']);
    try {
      const run = spawnSync(process.execPath, [join(cliSkill, 'scripts/datocms-release.mjs'), '--destination=rel', ...extra], {cwd: box.directory, env: {...box.env, SHIM_FAIL: fail}, encoding: 'utf8'});
      assert.deepEqual(box.calls().map((argv) => argv[1]), expected, fail || extra.join(' '));
      if (fail) {
        assert.notEqual(run.status, 0);
        assert.match(run.stderr, new RegExp(`Command failed: npx datocms ${fail}`));
      } else assert.equal(run.status, 0, run.stderr);
    } finally { box.cleanup(); }
  }
});

test('sync asset maps a secret per destination profile and each linked profile gets its own token', () => {
  const profiles = ['client_a', 'client_b'];
  const box = sandbox(profiles);
  try {
    const {result, secrets} = runAssetStep('assets/datocms-sync.github-actions.yml', 'scripts/datocms-sync-projects.mjs', box, {profiles: profiles.join(' '), dry_run: 'true'});
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
      // Environment ids can't carry the profile id's underscore.
      assert.match(resolved.destination, new RegExp(`^${profile.replace('_', '-')}-sync-`));
      assert.ok(calls[i].includes('--dry-run'), `${profile}: dry_run input not forwarded`);
    });
  } finally { box.cleanup(); }
});

test('helpers keep local OAuth runs token-free and never print the token on failure', () => {
  for (const [script, args, env] of [
    ['scripts/datocms-release.mjs', ['--destination=rel', '--profile=client_a'], {DATOCMS_CLIENT_A_PROFILE_API_TOKEN: 'leak-canary-1'}],
    ['scripts/datocms-sync-projects.mjs', ['client_a'], {DATOCMS_CLIENT_A_PROFILE_API_TOKEN: 'leak-canary-1'}],
  ]) {
    const box = sandbox(['client_a']);
    try {
      const local = spawnSync(process.execPath, [join(cliSkill, script), ...args], {cwd: box.directory, env: box.env, encoding: 'utf8'});
      assert.equal(local.status, 0, local.stderr);
      assert.ok(box.calls().every((argv) => !argv.some((a) => a.startsWith('--api-token'))));
      const failed = spawnSync(process.execPath, [join(cliSkill, script), ...args], {cwd: box.directory, env: {...box.env, ...env, SHIM_FAIL: 'migrations:run'}, encoding: 'utf8'});
      assert.notEqual(failed.status, 0);
      assert.ok(box.calls().some((argv) => argv.includes('--api-token=leak-canary-1')));
      assert.doesNotMatch(failed.stdout + failed.stderr, /leak-canary-1/);
      assert.match(failed.stderr, /Command failed: npx datocms migrations:run/);
      if (script.endsWith('datocms-release.mjs')) assert.equal(box.calls().at(-1)[1], 'maintenance:off', 'failed release left maintenance on');
    } finally { box.cleanup(); }
  }
});

test('sync helper only emits migrations:run flag combinations the real CLI accepts', () => {
  // datocms 4.2.0 migrations:run: --force dependsOn --fast-fork, --fast-fork dependsOn --destination.
  for (const flags of [['--force'], ['--fast-fork'], ['--fast-fork', '--force']]) {
    const box = sandbox(['client_a']);
    try {
      const env = {...box.env, DATOCMS_CLIENT_A_PROFILE_API_TOKEN: 'token-a'};
      const run = spawnSync(process.execPath, [join(cliSkill, 'scripts/datocms-sync-projects.mjs'), 'client_a', ...flags], {cwd: box.directory, env, encoding: 'utf8'});
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

test('helpers create valid environment ids and refuse invalid ones before running any command', () => {
  // @datocms/cma-client ApiTypes EnvironmentIdentity: "Can only contain lowercase letters, numbers and dashes".
  const types = readFileSync(join(root, 'node_modules/@datocms/cma-client/dist/types/generated/ApiTypes.d.ts'), 'utf8');
  assert.match(types, /ID of environment\. Can only contain lowercase letters, numbers and dashes/);
  const environmentId = /^[a-z0-9-]+$/;
  const flag = (argv, name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

  // The old default `{profile}-sync-{ISO timestamp}` produced `client_a-sync-2026-09-25T10-11-12-123Z`.
  const box = sandbox(['client_a', 'Client_B']);
  try {
    const run = spawnSync(process.execPath, [join(cliSkill, 'scripts/datocms-sync-projects.mjs'), 'client_a', 'Client_B', '--dry-run'], {cwd: box.directory, env: box.env, encoding: 'utf8'});
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(box.calls().map((argv) => flag(argv, 'profile')), ['client_a', 'Client_B']);
    const destinations = box.calls().map((argv) => flag(argv, 'destination'));
    destinations.forEach((destination) => assert.match(destination, environmentId));
    assert.match(destinations[0], /^client-a-sync-\d{14}$/);
    assert.match(destinations[1], /^client-b-sync-\d{14}$/);
  } finally { box.cleanup(); }

  for (const [script, args] of [
    ['scripts/datocms-sync-projects.mjs', ['client_a', '--destination-template={profile}_Sync']],
    ['scripts/datocms-sync-projects.mjs', ['client_a', 'client_b', '--destination-template=release.{profile}']],
    ['scripts/datocms-release.mjs', ['--destination=Release_42']],
    ['scripts/datocms-release.mjs', ['--destination=release 42']],
  ]) {
    const refused = sandbox(['client_a', 'client_b']);
    try {
      const run = spawnSync(process.execPath, [join(cliSkill, script), ...args], {cwd: refused.directory, env: refused.env, encoding: 'utf8'});
      assert.notEqual(run.status, 0, `${script} ${args.join(' ')} accepted an invalid id`);
      assert.match(run.stderr, /lowercase letters, numbers and dashes/);
      // Release: maintenance:on never ran, so a bad id can't lock the project.
      assert.deepEqual(refused.calls(), [], `${script} ${args.join(' ')} ran commands before refusing`);
    } finally { refused.cleanup(); }
  }
});

test('workflow assets pass dispatch inputs through env, never into run scripts', () => {
  for (const asset of assets) {
    const workflow = YAML.parse(readFileSync(join(cliSkill, asset), 'utf8'));
    const steps = Object.values(workflow.jobs).flatMap((job) => job.steps);
    for (const step of steps.filter((s) => s.run))
      assert.doesNotMatch(step.run, /\$\{\{\s*inputs\./, `${asset}: an input is expanded inside run:`);
    for (const input of Object.keys(workflow.on.workflow_dispatch.inputs))
      assert.ok(steps.some((s) => Object.values(s.env ?? {}).some((v) => new RegExp(`^\\$\\{\\{\\s*inputs\\.${input}\\s*\\}\\}$`).test(String(v)))), `${asset}: input ${input} not passed through env`);
  }

  // Shell metacharacters in an input stay data: nothing runs, the helper sees the literal text.
  const payload = (marker) => `x"; touch ${marker}; echo "$(touch ${marker}-sub)\`touch ${marker}-tick\``;
  const release = sandbox(['default']);
  try {
    const {result} = runAssetStep(assets[0], 'scripts/datocms-release.mjs', release, {destination: payload('pwned')});
    assert.notEqual(result.status, 0, 'helper accepted a destination with shell metacharacters');
    assert.deepEqual(release.calls(), []);
    for (const marker of ['pwned', 'pwned-sub', 'pwned-tick']) assert.ok(!existsSync(join(release.directory, marker)), `release input executed: ${marker}`);
  } finally { release.cleanup(); }

  const sync = sandbox(['client_a', 'client_b']);
  try {
    const {result} = runAssetStep(assets[1], 'scripts/datocms-sync-projects.mjs', sync, {profiles: `client_a $(touch pwned-sub) client_b; touch pwned`, dry_run: payload('pwned-dry')});
    assert.equal(result.status, 0, result.stderr);
    for (const marker of ['pwned', 'pwned-sub', 'pwned-dry', 'pwned-dry-sub', 'pwned-dry-tick']) assert.ok(!existsSync(join(sync.directory, marker)), `sync input executed: ${marker}`);
    // Profiles split on whitespace only; a non-"true" dry_run adds nothing.
    assert.deepEqual(sync.calls().map((argv) => argv.find((a) => a.startsWith('--profile='))), ['--profile=client_a', '--profile=$(touch', '--profile=pwned-sub)', '--profile=client_b;', '--profile=touch', '--profile=pwned']);
    assert.ok(sync.calls().every((argv) => !argv.includes('--dry-run')));
  } finally { sync.cleanup(); }
});
