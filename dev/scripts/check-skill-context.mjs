import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { encode } from 'gpt-tokenizer';

export const tokens = (text) => encode(text).length;
const cma = 'skills/datocms-cma/SKILL.md';
const mcp = 'skills/datocms-cma/references/mcp.md';

export function discovery(text) {
  const frontmatter = text.split('\n---\n')[0].replace(/^---\n/, '');
  const name = frontmatter.match(/^name: (.+)$/m)?.[1] ?? '';
  const description = frontmatter.match(/^description: >-?\n((?:  .*\n?)*)/m)?.[1]
    ?.split('\n').map((line) => line.trim()).filter(Boolean).join(' ') ?? '';
  if (!name || !description) throw new Error('Missing skill discovery metadata');
  return `${name}\n${description}`;
}

export function measureContext(root, base) {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  git('rev-parse', '--verify', `${base}^{commit}`);
  const paths = git('ls-tree', '-r', '--name-only', base).trim().split('\n')
    .filter((path) => /^skills\/[^/]+\/SKILL\.md$/.test(path));
  const rows = paths.map((path) => {
    const before = git('show', `${base}:${path}`);
    const after = readFileSync(resolve(root, path), 'utf8');
    return { path, before: tokens(before), after: tokens(after),
      discoveryBefore: tokens(discovery(before)), discoveryAfter: tokens(discovery(after)),
      changed: before !== after };
  });
  const main = rows.find((row) => row.path === cma);
  const other = rows.filter((row) => row.changed && row.path !== cma);
  const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
  const mcpTokens = existsSync(resolve(root, mcp)) ? tokens(readFileSync(resolve(root, mcp), 'utf8')) : null;
  const gates = {
    cmaReduction: main.after <= Math.floor(main.before * 0.7),
    optionalMcp: mcpTokens !== null && mcpTokens <= 600,
    discovery: sum(rows, 'discoveryAfter') <= sum(rows, 'discoveryBefore'),
    otherEntrypoints: sum(other, 'after') <= sum(other, 'before'),
  };
  return { base: git('rev-parse', base).trim(), tokenizer: 'gpt-tokenizer', rows,
    cmaReductionPercent: Math.round((1 - main.after / main.before) * 10000) / 100,
    mcpTokens, gates, passed: Object.values(gates).every(Boolean) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const i = process.argv.indexOf('--base');
  if (i === -1 || !process.argv[i + 1]) throw new Error('Usage: node dev/scripts/check-skill-context.mjs --base <PR-base-commit>');
  const report = measureContext(resolve(import.meta.dirname, '../..'), process.argv[i + 1]);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}
