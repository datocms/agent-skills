import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const moduleUrl = new URL('../e2e/lib/commandFailures.mjs', import.meta.url);
const helpers = existsSync(moduleUrl) ? await import(moduleUrl.href) : {};
function helper(name) {
  assert.equal(typeof helpers[name], 'function', `${name} must be exported`);
  return helpers[name];
}
for (const [name, command, exitCode, output, expected] of [
  ['empty search result', 'rg --files src && cat src/index.ts', 1, '', 'search-no-match'],
  ['login-shell search', `/bin/zsh -lc 'rg absent src'`, 1, '', 'search-no-match'],
  ['prescribed whoami probe', 'npx datocms whoami', 2, 'Error: Not logged in.', 'auth-probe'],
  ['prescribed project-list probe', 'npx datocms projects:list', 2, 'Not logged in.', 'auth-probe'],
  ['incorrect docs action', 'datocms cma:docs itemTypes list', 2, 'Action "list" not found', 'failure'],
  ['failing test', 'npm test', 1, 'not ok 1', 'failure'],
  ['type error before search', 'npx tsc --noEmit && rg x src', 2, 'error TS2339', 'failure'],
  ['missing find path', 'find ./missing', 1, '', 'failure'],
  ['read skill text containing error before no-match', 'cat .agents/skills/datocms-cli/SKILL.md && rg absent src', 1, 'Report the error reason.', 'failure'],
  ['search command error', 'rg pattern missing', 2, 'No such file or directory', 'failure'],
]) {
  test(`command failure classification: ${name}`, () => {
    assert.equal(helper('classifyCommandFailure')(command, exitCode, output), expected);
  });
}

test('command summaries separate probes and real failures with bounded excerpts', () => {
  const summarize = helper('summarizeCommandExecution');
  const commands = [
    { id: 'ok', command: 'npm run build', exit_code: 0, aggregated_output: 'built' },
    { id: 'search', command: 'rg absent src', exit_code: 1, aggregated_output: '' },
    { id: 'auth', command: 'npx datocms whoami', exit_code: 2, aggregated_output: 'Error: Not logged in.' },
    { id: 'build', command: 'npm test', exit_code: 1, aggregated_output: 'not ok '.repeat(200) },
    { id: 'unfinished', command: 'node src/catalog.mjs' },
  ];
  const result = summarize(commands);
  assert.deepEqual(result.commandFailures.map(({ id, exit_code, kind }) => ({ id, exit_code, kind })), [
    { id: 'search', exit_code: 1, kind: 'search-no-match' },
    { id: 'auth', exit_code: 2, kind: 'auth-probe' },
    { id: 'build', exit_code: 1, kind: 'failure' },
    { id: 'unfinished', exit_code: null, kind: 'failure' },
  ]);
  assert.ok(result.commandFailures.every(failure => typeof failure.excerpt === 'string' && failure.excerpt.length <= 500));
  assert.equal(result.commandsPassExcludingProbes, false);
  assert.equal(result.executedDeliverable, true);
  assert.equal(summarize(commands.slice(0, 3)).commandsPassExcludingProbes, true);
});

test('deliverable execution requires running or checking code, not merely inspecting files', () => {
  const summarize = helper('summarizeCommandExecution');
  for (const command of ['npm run build', 'npm test', 'pnpm run typecheck', 'npx tsc --noEmit', 'node src/catalog.mjs', 'npx tsx src/catalog.tsx']) {
    assert.equal(summarize([{ command, exit_code: 0 }]).executedDeliverable, true, command);
  }
  for (const command of ['rg --files', 'cat package.json', 'node --version', 'npx tsx --help', 'npx tsc --showConfig', 'npx tsc --listFilesOnly', 'node -e "console.log(1)"', 'cat instructions.md # npm run build']) {
    assert.equal(summarize([{ command, exit_code: 0 }]).executedDeliverable, false, command);
  }
  assert.deepEqual(summarize([]), { commandFailures: [], executedDeliverable: false, commandsPassExcludingProbes: true });
});
