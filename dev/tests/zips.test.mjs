// Guards the claude.ai zips that the release workflow attaches: one per shipped skill, holding exactly its tracked
// files minus agents/. Builds into a temp dir; the repo is never touched.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)), '..');

const run = (command, args, cwd = repoRoot) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};
const lines = (text) => text.split('\n').filter(Boolean).sort();

test('build-zips packs every shipped skill with exactly its tracked files, minus agents/', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'zips-'));
  run('bash', ['dev/scripts/build-zips.sh', outDir]);

  const skills = lines(run('git', ['ls-files', 'skills'])).map((path) => path.split('/')[1]).filter((name, index, all) => name.startsWith('datocms-') && all.indexOf(name) === index);
  assert.deepEqual(readdirSync(outDir).sort(), skills.map((name) => `${name}.zip`));

  for (const name of skills) {
    const entries = lines(run('unzip', ['-Z1', join(outDir, `${name}.zip`)]));
    const expected = lines(run('git', ['ls-files', name], join(repoRoot, 'skills'))).filter((path) => !path.startsWith(`${name}/agents/`));
    assert.deepEqual(entries, expected, `${name}.zip content`);
    assert.ok(entries.includes(`${name}/SKILL.md`), `${name}.zip has no top-level ${name}/SKILL.md`);
  }
  rmSync(outDir, { recursive: true, force: true });
});

test('build-zips replaces stale zips in the output directory', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'zips-'));
  run('bash', ['-c', `touch "${outDir}/datocms-removed.zip"`]);
  run('bash', ['dev/scripts/build-zips.sh', outDir]);
  assert.ok(!readdirSync(outDir).includes('datocms-removed.zip'));
  rmSync(outDir, { recursive: true, force: true });
});
