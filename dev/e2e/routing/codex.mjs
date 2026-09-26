// Codex routing probe: which DatoCMS skills does a native Codex session open for each trigger-fixture query?
// Each query runs through the shared native runner (isolated workspace and home, pinned model and effort) with
// this checkout's skills installed in the workspace. A session stops after a few commands, so this measures
// whether Codex consults the right skill early, not whether it finishes the task. Paid: run deliberately.
//   node dev/e2e/routing/codex.mjs --skills-root <dir containing skills/> --skill <name> --output local/routing-codex/<run>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { nativeSession, MODEL, EFFORT, REPO_ROOT } from '../lib/nativeSession.ts';

const { values } = parseArgs({
  options: {
    'skills-root': { type: 'string', default: REPO_ROOT },
    output: { type: 'string' },
    skill: { type: 'string', default: 'datocms-setup' },
    fixture: { type: 'string' },
    modes: { type: 'string', default: 'implicit,overlap' },
    jobs: { type: 'string', default: '4' },
    'max-commands': { type: 'string', default: '4' },
  },
});
const output = resolve(values.output ?? join(REPO_ROOT, 'local/routing-codex', values.skill, new Date().toISOString().replace(/[:.]/g, '-')));
if (existsSync(join(output, 'results.json'))) throw Error('Preserve evidence: choose a fresh --output');
mkdirSync(output, { recursive: true });
const fixture = resolve(values.fixture ?? join(REPO_ROOT, 'evals/fixtures/trigger', `${values.skill}.json`));
const modes = values.modes.split(',');
const rows = JSON.parse(readFileSync(fixture, 'utf8')).filter((r) => modes.includes(r.query_mode ?? 'implicit'));

const results = [];
const queue = rows.map((row, index) => ({ row, index }));
let usageLimitReached = false;
await Promise.all(Array.from({ length: Number(values.jobs) }, async () => {
  while (queue.length && !usageLimitReached) {
    const { row, index } = queue.shift();
    const directory = join(output, String(index + 1));
    const session = await nativeSession({
      repoRoot: resolve(values['skills-root']), workspace: join(directory, 'workspace'), output: directory,
      prompt: row.query, timeoutMs: 180000, maxCommands: Number(values['max-commands']),
    });
    if (session.usageLimitReached) { usageLimitReached = true; break; }
    const opened = [...new Set(session.skillReads.map((path) => path.split('/')[0]))];
    const invoked = opened.includes(values.skill);
    results[index] = { ...row, opened, commands: session.commands.length, invoked, correct: invoked === row.should_trigger };
    console.log(`${results[index].correct ? 'ok  ' : 'MISS'} ${row.should_trigger ? 'T' : 'F'} ${opened.join(',') || '-'} :: ${row.query.slice(0, 90)}`);
  }
}));
if (usageLimitReached) throw Error('Usage limit reached; results are incomplete');
const count = (f) => results.filter(f).length;
const tp = count((r) => r.invoked && r.should_trigger), fp = count((r) => r.invoked && !r.should_trigger), fn = count((r) => !r.invoked && r.should_trigger);
const summary = {
  skill: values.skill, skillsRoot: resolve(values['skills-root']), model: MODEL, reasoningEffort: EFFORT, queries: results.length,
  tp, fp, fn, tn: results.length - tp - fp - fn, precision: tp / (tp + fp || 1), recall: tp / (tp + fn || 1),
  noSkillOpened: count((r) => !r.opened.length),
};
writeFileSync(join(output, 'results.json'), JSON.stringify({ summary, results }, null, 2));
console.log(JSON.stringify(summary));
