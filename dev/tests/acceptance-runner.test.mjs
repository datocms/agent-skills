// The acceptance runner with a stand-in native binary: a change task that ends without editing anything is
// reported as incomplete, while an actual edit still reaches the oracle.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const repoRoot = resolve(import.meta.dirname, '../..');

function runDocumentRename(actor) {
  const root = mkdtempSync(join(tmpdir(), 'acceptance-runner-'));
  const binary = join(root, 'codex');
  writeFileSync(binary, `#!${process.execPath}
if (process.argv.includes('--version')) { console.log('fixture-runtime'); process.exit(0); }
process.stdin.resume().on('end', () => {
  ${actor}
  console.log(JSON.stringify({ type: 'item.completed', item: { id: 'm1', type: 'agent_message', text: "I'll update it to replace matches only in prose text nodes." } }));
  console.log(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1 } }));
});
`, { mode: 0o700 });
  writeFileSync(join(root, 'auth.json'), '{}');
  const output = join(root, 'out');
  const run = spawnSync(process.execPath, [join(repoRoot, 'dev/e2e/acceptance/run.mjs'), '--skills-root', repoRoot, '--fixtures', root, '--cases', 'document-rename', '--output', output], {
    env: { ...process.env, CODEX_BIN: binary, CODEX_HOME: root }, encoding: 'utf8', timeout: 120000,
  });
  const [result] = JSON.parse(readFileSync(join(output, 'results.json'), 'utf8'));
  rmSync(root, { recursive: true, force: true });
  return { run, result };
}

test('a change task that ends without editing anything is incomplete, not a wrong change', () => {
  const { run, result } = runDocumentRename('');
  assert.equal(result.incomplete, 'Session ended without changing any file');
  assert.equal(result.passed, null);
  assert.equal(result.error, undefined, 'the oracle must not run on an untouched workspace');
  assert.equal(run.status, 1, 'an incomplete run is still not a pass');
});

test('a change task that edits a file still goes to the oracle', () => {
  const { result } = runDocumentRename(`require('node:fs').appendFileSync(require('node:path').join(process.cwd(), 'src/content/replaceBrand.ts'), '// edited\\n');`);
  assert.equal(result.incomplete, undefined);
  assert.deepEqual(result.changedFiles, ['workspace/src/content/replaceBrand.ts']);
  assert.equal(result.passed, false, 'the unchanged whole-document replacement must still fail the oracle');
});
