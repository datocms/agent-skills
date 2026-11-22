// Summarizes knowledge-eval run directories.
//
//   node dev/evals/knowledge/summarize.mjs <runs dir> [--prefix base-sonnet-]
//
// Each run directory holds questions.json (the ids it was asked), answers.json,
// optional verdicts.json (judge), reads.json (files the agent read) and
// usage.json ({ tokens, tool_uses, duration_ms }). Run directories are named
// <arm>-<model>-<areas>-<chunk>; runs that share <arm>-<model> are one row.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkQuestions, grade, loadQuestions } from './grade.mjs';

const runsDir = resolve(process.argv[2] ?? '.');
const prefixIndex = process.argv.indexOf('--prefix');
const prefix = prefixIndex === -1 ? '' : process.argv[prefixIndex + 1];
const questions = checkQuestions(loadQuestions());
const read = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback);
const fileBytes = (path) => (existsSync(path) && statSync(path).isFile() ? statSync(path).size : 0);

const groups = new Map();
for (const name of readdirSync(runsDir).sort()) {
  const dir = resolve(runsDir, name);
  if (!name.startsWith(prefix) || !existsSync(resolve(dir, 'questions.json'))) continue;
  const ids = new Set(read(resolve(dir, 'questions.json'), []));
  const answers = read(resolve(dir, 'answers.json'), {});
  const verdicts = read(resolve(dir, 'verdicts.json'), {});
  const usage = read(resolve(dir, 'usage.json'), {});
  const reads = read(resolve(dir, 'reads.json'), []).filter((path) => path.includes('/skills/'));
  const result = grade(questions.filter((question) => ids.has(question.id)), answers, verdicts);
  const key = name.split('-').slice(0, 2).join('-');
  const group = groups.get(key) ?? { runs: 0, total: 0, passed: 0, pending: 0, tokens: 0, tools: 0, reads: 0, readBytes: 0, failed: [], files: new Map() };
  group.runs += 1;
  group.total += result.total;
  group.passed += result.passed;
  group.pending += result.pendingJudge.length;
  group.tokens += usage.tokens ?? 0;
  group.tools += usage.tool_uses ?? 0;
  group.reads += reads.length;
  for (const path of reads) {
    group.readBytes += fileBytes(path);
    const short = path.split('/skills/')[1];
    group.files.set(short, (group.files.get(short) ?? 0) + 1);
  }
  group.failed.push(...result.failed);
  groups.set(key, group);
}

console.log('| Arm-model | Runs | Passed | Pending judge | Files read | KB read | Tokens | Tool calls |');
console.log('| - | -: | -: | -: | -: | -: | -: | -: |');
for (const [key, group] of groups) {
  console.log(
    `| ${key} | ${group.runs} | ${group.passed}/${group.total} (${Math.round((100 * group.passed) / group.total)}%) | ${group.pending} | ${group.reads} | ${Math.round(group.readBytes / 1000)} | ${group.tokens} | ${group.tools} |`,
  );
}
for (const [key, group] of groups) {
  console.log(`\n${key} failed: ${group.failed.sort().join(', ') || 'none'}`);
  if (group.files.size) {
    console.log(`${key} read: ${[...group.files].sort((a, b) => b[1] - a[1]).map(([path, count]) => `${path}${count > 1 ? ` x${count}` : ''}`).join(', ')}`);
  }
}
