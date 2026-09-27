import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = process.env.REFERENCE_REPO_ROOT
  ? resolve(process.env.REFERENCE_REPO_ROOT)
  : fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
const cliRoot = dirname(require.resolve('datocms/package.json'));
const MigrationCommand = require(join(cliRoot, 'lib/commands/migrations/run.js')).default;

function reference(path) {
  return readFileSync(join(repoRoot, 'skills', path), 'utf8');
}

// Extract the actual rollout commands, including the old fork/promote recipe when
// REFERENCE_REPO_ROOT points at a pre-fix checkout. Discovery and dry-run are excluded.
function blueprintRollout() {
  const workflow = reference('datocms-cli/references/blueprint-sync.md')
    .split('## Daily Workflow')[1].split('## Automation Guidance')[0];
  const commands = [...workflow.matchAll(/^```bash\n([\s\S]*?)^```/gm)]
    .flatMap((match) => match[1].trim().split('\n'))
    .filter((line) => /^(?:npx datocms (?:migrations:run|environments:promote)|node scripts\/datocms-release\.mjs)/.test(line))
    .filter((line) => !line.includes('--dry-run'));
  assert.ok(commands.length > 0, 'the documented workflow includes rollout commands');
  return commands.join('\n');
}

function releaseSandbox() {
  const directory = mkdtempSync(join(tmpdir(), 'migration-release-safety-'));
  mkdirSync(join(directory, 'bin'));
  mkdirSync(join(directory, 'scripts'));
  copyFileSync(
    join(repoRoot, 'skills/datocms-cli/scripts/datocms-release.mjs'),
    join(directory, 'scripts/datocms-release.mjs'),
  );
  copyFileSync(
    join(repoRoot, 'skills/datocms-cli/scripts/datocms-sync-projects.mjs'),
    join(directory, 'scripts/datocms-sync-projects.mjs'),
  );
  const statePath = join(directory, 'state.json');
  const projects = Object.fromEntries(['client_a', 'client_b'].map((id) => [id, {
    maintenance: false,
    primary: 'main',
    environments: { main: { records: ['original'] } },
    lostEdits: [],
  }]));
  writeFileSync(statePath, JSON.stringify({ projects, calls: [] }));
  writeFileSync(join(directory, 'bin/npx'), `#!${process.execPath}
const fs = require('node:fs');
const argv = process.argv.slice(2);
const command = argv[1];
const flag = (name) => argv.find((arg) => arg.startsWith('--' + name + '='))?.split('=').slice(1).join('=');
const state = JSON.parse(fs.readFileSync(process.env.RELEASE_STATE, 'utf8'));
const profile = flag('profile');
const project = state.projects[profile];
if (!project) throw new Error('Unknown profile: ' + profile);
state.calls.push({ command, profile, maintenance: project.maintenance });
if (command === process.env.FAIL_COMMAND && profile === process.env.FAIL_PROFILE && project.maintenance) {
  fs.writeFileSync(process.env.RELEASE_STATE, JSON.stringify(state));
  process.exit(1);
}
if (command === 'maintenance:on') project.maintenance = true;
else if (command === 'maintenance:off') project.maintenance = false;
else if (command === 'migrations:run') {
  const destination = flag('destination');
  project.environments[destination] = structuredClone(project.environments[project.primary]);
  project.environments[destination].migrated = true;
  // An editor tries to save after the fork. A real maintenance window blocks it.
  if (!project.maintenance) project.environments[project.primary].records.push('editor-' + destination);
} else if (command === 'environments:promote') {
  const destination = argv[2];
  const previous = project.environments[project.primary];
  const promoted = project.environments[destination];
  project.lostEdits.push(...previous.records.filter((id) => !promoted.records.includes(id)));
  project.primary = destination;
} else throw new Error('Unexpected command: ' + command);
fs.writeFileSync(process.env.RELEASE_STATE, JSON.stringify(state));
`, { mode: 0o755 });
  return {
    directory,
    env: { PATH: `${join(directory, 'bin')}:${dirname(process.execPath)}:/usr/bin:/bin`, RELEASE_STATE: statePath },
    state: () => JSON.parse(readFileSync(statePath, 'utf8')),
    cleanup: () => rmSync(directory, { recursive: true, force: true }),
  };
}

test('documented blueprint releases preserve edits and freeze each fresh fork through promotion', () => {
  const box = releaseSandbox();
  try {
    const result = spawnSync('bash', ['-e', '-c', blueprintRollout()], {
      cwd: box.directory, env: box.env, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const { projects, calls } = box.state();
    for (const [profile, project] of Object.entries(projects)) {
      assert.deepEqual(project.lostEdits, [], `${profile}: promotion lost edits made after the rehearsal fork`);
      assert.equal(project.environments[project.primary].migrated, true);
      assert.equal(project.maintenance, false, `${profile}: release left editors locked`);
      const promotion = calls.find((call) => call.profile === profile && call.command === 'environments:promote');
      assert.equal(promotion?.maintenance, true, `${profile}: primary was writable at promotion`);
      const releaseStart = calls.findIndex((call) => call.profile === profile && call.command === 'maintenance:on');
      const releaseFork = calls.slice(releaseStart + 1).find((call) => call.profile === profile && call.command === 'migrations:run');
      assert.equal(releaseFork?.maintenance, true, `${profile}: release fork predates the maintenance window`);
    }
  } finally { box.cleanup(); }
});

test('documented blueprint release failure unlocks primary and prevents promotion', () => {
  const box = releaseSandbox();
  try {
    const result = spawnSync('bash', ['-e', '-c', blueprintRollout()], {
      cwd: box.directory,
      env: { ...box.env, FAIL_COMMAND: 'migrations:run', FAIL_PROFILE: 'client_a' },
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    const { projects, calls } = box.state();
    assert.ok(calls.every((call) => call.command !== 'environments:promote'));
    const start = calls.findIndex((call) => call.profile === 'client_a' && call.command === 'maintenance:on');
    const failedMigration = calls.findIndex((call) => call.profile === 'client_a' && call.command === 'migrations:run' && call.maintenance);
    const cleanup = calls.findIndex((call) => call.profile === 'client_a' && call.command === 'maintenance:off');
    assert.ok(start >= 0 && failedMigration > start && cleanup > failedMigration, 'failure occurs inside the release window and cleanup follows it');
    for (const [profile, project] of Object.entries(projects)) {
      assert.equal(project.primary, 'main');
      assert.equal(project.maintenance, false);
      assert.deepEqual(project.environments.main.records, ['original', `editor-${profile.replace('_', '-')}-sync`], 'rehearsal-time edits survive failed release');
    }
  } finally { box.cleanup(); }
});

test('sync helper leaves primary writable and identifies its forks as rehearsals', () => {
  const box = releaseSandbox();
  try {
    const result = spawnSync(process.execPath, [
      'scripts/datocms-sync-projects.mjs', 'client_a', '--destination-template=client-a-sync',
    ], { cwd: box.directory, env: box.env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const { projects, calls } = box.state();
    assert.deepEqual(calls.map((call) => call.command), ['migrations:run']);
    assert.equal(projects.client_a.primary, 'main');
    assert.equal(projects.client_a.maintenance, false);
    assert.deepEqual(projects.client_a.environments['client-a-sync'].records, ['original']);
    assert.deepEqual(projects.client_a.environments.main.records, ['original', 'editor-client-a-sync']);
    assert.equal([...result.stdout.matchAll(/Rehearsal sandbox:/g)].length, 1);
    assert.match(result.stdout, /fresh release fork/);
    assert.match(result.stdout, /do not promote/);
  } finally { box.cleanup(); }
});

function batchMigration() {
  const examples = [...reference('datocms-cma/references/migration-patterns.md').matchAll(/^```ts\n([\s\S]*?)^```/gm)]
    .map((match) => match[1]).filter((source) => source.includes('async function updateBatch('));
  assert.equal(examples.length, 1, 'one executable example defines the batch failure contract');
  const compiled = ts.transpileModule(examples[0], {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  return `${compiled.outputText}\nmodule.exports = async function (client) {
    await updateBatch(client.recordIds, (id) => client.updateRecord(id));
    await client.afterBatch();
  };`;
}

test('documented batch failures reach the real CLI runner and remain eligible for retry', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'migration-batch-safety-'));
  try {
    const reportedErrors = [];
    t.mock.method(console, 'error', (...args) => reportedErrors.push(args));
    const filename = '1700000000_backfill.js';
    const path = join(directory, filename);
    writeFileSync(path, batchMigration());
    const runner = Object.create(MigrationCommand.prototype);
    Object.assign(runner, {
      startSpinner() {}, stopSpinner() {}, stopSpinnerWithFailure() {}, log() {},
      error(message) { throw new Error(message); },
    });
    const writes = [];
    const completed = new Set();
    const tracking = [];
    let rejectSecond = true;
    let laterPhaseCalls = 0;
    const client = {
      recordIds: ['first', 'second', 'third'],
      async updateRecord(id) {
        writes.push(id);
        if (id === 'second' && rejectSecond) throw new Error('Record validation failed');
        completed.add(id); // Idempotent operation on retry.
      },
      async afterBatch() { laterPhaseCalls += 1; },
      items: {
        async create(record) { tracking.push(record.name); },
        async *listPagedIterator() { for (const name of tracking) yield { name }; },
      },
    };
    const model = { id: 'tracking' };
    const script = { filename, path, legacy: false };
    await assert.rejects(
      runner.runMigrationScript(script, client, null, false, model, directory),
      /Migration .* failed/,
    );
    assert.deepEqual(writes, client.recordIds, 'independent later records still ran');
    assert.equal(reportedErrors.length, 1);
    assert.equal(reportedErrors[0][0], 'Record second failed');
    assert.deepEqual([...completed], ['first', 'third']);
    assert.deepEqual(tracking, [], 'partial migration must not be recorded as complete');
    assert.equal(laterPhaseCalls, 0, 'later destructive phases must remain unreachable');
    assert.equal((await runner.migrationScriptsToRun(model, client, directory)).length, 1);

    rejectSecond = false;
    await runner.runMigrationScript(script, client, null, false, model, directory);
    assert.equal(completed.size, 3);
    assert.deepEqual(tracking, [filename]);
    assert.equal(laterPhaseCalls, 1);
    assert.deepEqual(await runner.migrationScriptsToRun(model, client, directory), []);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
