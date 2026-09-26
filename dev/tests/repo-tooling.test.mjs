// Guards for the repo tooling: the pre-commit hook and the validator's link, anchor and frontmatter checks.
// Everything runs on temp copies; the real repo is never touched.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const devRoot = fileURLToPath(new URL('../', import.meta.url));
const repoRoot = resolve(devRoot, '..');

function write(root, files) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
}

// Runs the validator on a copy of what it reads plus `files`, minus `remove`, returning its error lines relative to the copy.
function validatorErrors(files, remove = []) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'validator-')));
  for (const part of ['skills', 'evals/fixtures', 'README.md', '.claude-plugin', '.codex-plugin'])
    cpSync(join(repoRoot, part), join(root, part), { recursive: true });
  write(root, files);
  for (const path of remove) rmSync(join(root, path));
  const run = spawnSync('python3', [join(repoRoot, 'evals/scripts/validate_skill_repo.py'), '--repo-root', root], { encoding: 'utf8' });
  rmSync(root, { recursive: true, force: true });
  assert.equal(run.stderr, '');
  return run.stdout.split('\n').filter((line) => line.startsWith('- ')).map((line) => line.slice(2).replaceAll(`${root}/`, ''));
}
const about = (errors, file) => errors.filter((error) => error.startsWith(`${file}:`));

test('validator checks relative links and anchors in every skill reference', () => {
  const probe = 'skills/datocms-cda/references/zz-probe.md';
  const errors = about(validatorErrors({
    [probe]: '# Probe\n\n## The `buildClient()` *helper* & <b>more</b>\n\n[missing](./zz-missing.md) [bad anchor](zz-target.md#nope) [good](zz-target.md#the-executequery-options) [self](#the-buildclient-helper--more) [dir](../)\n',
    'skills/datocms-cda/references/zz-target.md': '# Target\n\n## The `executeQuery()` _options_\n',
  }), probe);
  assert.deepEqual(errors, [
    `${probe}: link target \`./zz-missing.md\` does not resolve to a file or directory`,
    `${probe}: link target \`zz-target.md#nope\` names no heading in zz-target.md`,
  ]);
});

test('validator ignores link syntax inside code spans and fences', () => {
  // CommonMark spans: a run closes only at a run of the same length, may cross lines within a paragraph, and an
  // unmatched run is literal (so the last link is real and must still be checked).
  const probe = 'skills/datocms-cda/references/zz-code.md';
  const errors = about(validatorErrors({
    [probe]: [
      '# Code',
      '',
      '`**strong**` `` `code` `` `~~strike~~`, `[text](url)`, `\\` escapes.',
      '',
      'A span `opens here',
      '[wrapped](zz-a.md)` and closes a line later.',
      '',
      '```md',
      '[fenced](zz-b.md)',
      '```',
      '',
      'A lone ` backtick, then [real](zz-c.md).',
      '',
      // Real links too: an escaped backtick opens nothing, spans end with their list item or heading, a backtick
      // fence can't have a backtick in its info string, and definitions are links.
      'Press \\` then [escaped](zz-d.md) then \\` again.',
      '',
      '- item `one',
      '- [item](zz-e.md) two`',
      '',
      '## Heading `h',
      '[after](zz-f.md) `',
      '',
      '```a``` is inline code, [inline](zz-g.md)',
      '',
      '[ref]: zz-h.md',
      '',
    ].join('\n'),
  }), probe);
  assert.deepEqual(errors, ['zz-c.md', 'zz-d.md', 'zz-e.md', 'zz-f.md', 'zz-g.md', 'zz-h.md'].map(
    (target) => `${probe}: link target \`${target}\` does not resolve to a file or directory`,
  ));
});

test('skill files may only link inside skills/, other docs anywhere in the repo', () => {
  const errors = validatorErrors({
    'skills/datocms-cda/references/zz-out.md': '# Out\n\n[readme](../../../README.md)\n',
    'docs/zz-probe.md': '# Docs\n\n[readme](../README.md) [skills](../skills/) [gone](../README.md#no-such-section) [case](../readme.md) [abs](/README.md) [out](../../zz.md)\n',
  });
  assert.deepEqual(about(errors, 'skills/datocms-cda/references/zz-out.md'), [
    'skills/datocms-cda/references/zz-out.md: link target `../../../README.md` is outside skills/ and won\'t ship with the skills',
  ]);
  // Case is checked even on macOS, where the filesystem ignores it but GitHub and Linux hosts don't.
  assert.deepEqual(about(errors, 'docs/zz-probe.md').map((error) => error.replace(/ (differs in case from the path on disk|does not resolve to a file or directory)$/, ' <case>')), [
    'docs/zz-probe.md: link target `../README.md#no-such-section` names no heading in README.md',
    'docs/zz-probe.md: link target `../readme.md` <case>',
    'docs/zz-probe.md: link target `/README.md` must be a path relative to the file, inside the repo',
    'docs/zz-probe.md: link target `../../zz.md` must be a path relative to the file, inside the repo',
  ]);
});

test('SKILL.md frontmatter accepts only Agent Skills spec keys', () => {
  const skill = 'skills/datocms-cda/SKILL.md';
  const text = readFileSync(join(repoRoot, skill), 'utf8');
  const extra = '\nlicense: MIT\nallowed-tools:\n- Bash(git status:*)\nwhen_to_use: probe\n---\n';
  const errors = about(validatorErrors({ [skill]: text.replace('\n---\n', extra) }), skill);
  assert.equal(errors.length, 1, errors.join('\n'));
  assert.match(errors[0], /frontmatter key `when_to_use` is not in the Agent Skills spec .*claude\.ai and Skills API uploads of the zip reject it/);
});

test('validator fails when a CMA reference the hosted MCP server fetches is missing', () => {
  const reference = 'skills/datocms-cma/references/editing-records.md';
  const errors = about(validatorErrors({}, [reference]), reference);
  assert.equal(errors.length, 1, errors.join('\n'));
  assert.match(errors[0], /missing; the hosted MCP server fetches this exact path from master/);
});

// A throwaway git repo with the real hook, remark config and dev dependencies, and a stub validator. The hook runs
// the way husky runs it (`sh -e`, which ignores the bash shebang). The markdown name has a space and a non-ASCII
// letter, which git quotes by default.
const md = 'docs/a é.md';
function hookRepo() {
  const root = mkdtempSync(join(tmpdir(), 'hook-'));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  const git = (...args) => {
    const run = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], { cwd: root, env, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    return run.stdout;
  };
  git('init', '-q');
  for (const file of ['.husky/pre-commit', '.remarkignore', 'dev/remark.config.mjs']) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(repoRoot, file), join(root, file));
  }
  symlinkSync(join(devRoot, 'node_modules'), join(root, 'dev/node_modules'));
  write(root, { '.gitignore': 'node_modules\n', 'evals/scripts/validate_skill_repo.py': 'print("stub validator")\n', [md]: '# A\n\nText.\n' });
  git('add', '.');
  git('commit', '-qm', 'init');
  const hook = () => spawnSync('sh', ['-e', '.husky/pre-commit'], { cwd: root, env, encoding: 'utf8' });
  return { root, git, hook, append: (text) => writeFileSync(join(root, md), readFileSync(join(root, md), 'utf8') + text) };
}

test('pre-commit refuses partially staged markdown before formatting anything', () => {
  const { root, git, hook, append } = hookRepo();
  append('\n* staged\n');
  git('add', md);
  append('\n* unstaged\n');
  const index = git('write-tree');
  const run = hook();
  assert.equal(run.status, 1, run.stdout + run.stderr);
  assert.match(run.stderr, /^ {2}docs\/a é\.md$/m);
  assert.match(run.stderr, /git stash push --keep-index/);
  assert.equal(git('write-tree'), index, 'the index changed');
  assert.match(readFileSync(join(root, md), 'utf8'), /\* staged\n\n\* unstaged\n$/, 'the working tree was formatted');
  rmSync(root, { recursive: true, force: true });
});

test('pre-commit formats and restages fully staged markdown', () => {
  const { root, git, hook, append } = hookRepo();
  append('\n* staged\n');
  git('add', md);
  const run = hook();
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /stub validator/);
  assert.equal(git('show', `:${md}`), '# A\n\nText.\n\n- staged\n');
  assert.equal(git('diff', '--name-only'), '');
  rmSync(root, { recursive: true, force: true });
});
