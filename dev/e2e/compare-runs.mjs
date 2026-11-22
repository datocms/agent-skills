#!/usr/bin/env node
// Puts live-suite runs side by side: per case and per run, whether it passed, how many scripts
// the actor ran and how many commands failed, the tokens it used and the skill text it read.
//
//   node dev/e2e/compare-runs.mjs local/e2e/new-sonnet-1 local/e2e/old-sonnet-1=local/baseline/skills
//
// A run is a directory of case folders holding `outcome.json` and `session.json`. `=<skills root>`
// names the skill tree that run used (default: this checkout's skills/), to size the files it read.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../..');
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const sum = (list, pick) => list.reduce((total, entry) => total + (Number(pick(entry)) || 0), 0);

function readRun(argument) {
  const [dir, skillsRoot = join(repoRoot, 'skills')] = argument.split('=');
  const cases = {};
  for (const name of readdirSync(dir).sort()) {
    const outcomePath = join(dir, name, 'outcome.json');
    if (!existsSync(outcomePath)) continue;
    const outcome = json(outcomePath);
    const sessionPath = join(dir, name, 'session.json');
    const session = existsSync(sessionPath) ? json(sessionPath) : {};
    const usage = session.usage ?? [];
    const commands = session.commands ?? [];
    const reads = session.skillReads ?? [];
    const input = sum(usage, (u) => u.input_tokens);
    cases[name] = {
      passed: Boolean(outcome.passed),
      reason: outcome.reason,
      attempts: outcome.attempts ?? 0,
      commands: commands.length,
      failedCommands: commands.filter((command) => command.exit_code).length,
      uncached: input - sum(usage, (u) => u.cached_input_tokens),
      output: sum(usage, (u) => u.output_tokens),
      cost: sum(usage, (u) => u.total_cost_usd),
      skillFiles: reads.length,
      skillKB: Math.round(sum(reads, (file) => {
        const path = join(skillsRoot, file);
        return existsSync(path) && statSync(path).isFile() ? statSync(path).size : 0;
      }) / 1000),
    };
  }
  return { name: basename(resolve(dir)), cases };
}

const runs = process.argv.slice(2).map(readRun);
if (runs.length === 0) {
  console.error('usage: node dev/e2e/compare-runs.mjs <run dir>[=<skills root>] ...');
  process.exit(2);
}
const names = [...new Set(runs.flatMap((run) => Object.keys(run.cases)))].sort();
const cell = (entry) => entry
  ? `${entry.passed ? 'pass' : 'FAIL'} scripts ${String(entry.attempts).padStart(2)} failed ${String(entry.failedCommands).padStart(2)} out ${String(entry.output).padStart(5)} skill ${String(entry.skillKB).padStart(3)}KB`
  : '-'.padEnd(48);
console.log(`${'case'.padEnd(38)} ${runs.map((run) => run.name.padEnd(48)).join(' | ')}`);
for (const name of names) console.log(`${name.padEnd(38)} ${runs.map((run) => cell(run.cases[name])).join(' | ')}`);

console.log('\ntotals, over the cases every run finished:');
const shared = names.filter((name) => runs.every((run) => run.cases[name]));
for (const run of runs) {
  const entries = shared.map((name) => run.cases[name]);
  const total = (key) => sum(entries, (entry) => entry[key]);
  console.log(
    `  ${run.name.padEnd(16)} ${entries.filter((entry) => entry.passed).length}/${entries.length} passed, ${total('attempts')} scripts, ${total('failedCommands')} failed commands of ${total('commands')}, ` +
    `${total('uncached')} uncached input + ${total('output')} output tokens, ${total('skillFiles')} skill files (${total('skillKB')} KB)` +
    (total('cost') ? `, $${total('cost').toFixed(2)}` : ''),
  );
}
for (const run of runs) {
  for (const [name, entry] of Object.entries(run.cases)) if (!entry.passed) console.log(`  ${run.name} ${name}: ${String(entry.reason).slice(0, 200)}`);
}
