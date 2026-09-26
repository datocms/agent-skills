// Codex routing probe: which DatoCMS skills does a native Codex session open for each trigger-fixture query?
// Each query runs through the shared native runner (isolated workspace and home, pinned model and effort) with
// this checkout's skills installed in the workspace. A session stops after a few commands, so this measures
// whether Codex consults the right skill early, not whether it finishes the task. Paid: run deliberately.
//   node dev/e2e/routing/codex.mjs --skills-root <dir containing skills/> --skill <name> --output local/routing-codex/<run>
// Repeat by running the probe into distinct --output directories; retain every sample.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { nativeSession, MODEL, COMPARISON_MODEL, EFFORT, REPO_ROOT } from '../lib/nativeSession.ts';

const { values } = parseArgs({
  options: {
    'skills-root': { type: 'string', default: REPO_ROOT },
    output: { type: 'string' },
    skill: { type: 'string', default: 'datocms-setup' },
    fixture: { type: 'string' },
    modes: { type: 'string', default: 'implicit,overlap' },
    jobs: { type: 'string', default: '4' },
    'max-commands': { type: 'string', default: '4' },
    model: { type: 'string', default: MODEL },
  },
});
if (![MODEL, COMPARISON_MODEL].includes(values.model)) throw Error(`Unsupported evaluation model: ${values.model}`);
const output = resolve(values.output ?? join(REPO_ROOT, 'local/routing-codex', values.skill, new Date().toISOString().replace(/[:.]/g, '-')));
if (existsSync(join(output, 'results.json'))) throw Error('Preserve evidence: choose a fresh --output');
mkdirSync(output, { recursive: true });
const fixture = resolve(values.fixture ?? join(REPO_ROOT, 'evals/fixtures/trigger', `${values.skill}.json`));
const modes = values.modes.split(',');
const rows = JSON.parse(readFileSync(fixture, 'utf8'))
  .map((row, index) => ({ row, fixtureIndex: index + 1 }))
  .filter(({ row }) => modes.includes(row.query_mode ?? 'implicit'));

const results = [];
const queue = rows.map((entry, index) => ({ ...entry, index }));
let usageLimitReached = false;
function writeResults() {
  // Workers finish out of order. Preserve fixture order without null holes,
  // and keep execution failures separate from observed routing decisions.
  const completed = results.filter(Boolean);
  const scored = completed.filter((result) => !result.error);
  const count = (predicate) => scored.filter(predicate).length;
  const tp = count((r) => r.invoked && r.should_trigger), fp = count((r) => r.invoked && !r.should_trigger), fn = count((r) => !r.invoked && r.should_trigger);
  const summary = {
    skill: values.skill, skillsRoot: resolve(values['skills-root']), model: values.model, reasoningEffort: EFFORT, queries: scored.length,
    attempted: completed.length, total: rows.length, errors: completed.length - scored.length,
    usageLimitReached, incomplete: usageLimitReached || completed.length < rows.length,
    tp, fp, fn, tn: scored.length - tp - fp - fn, precision: tp / (tp + fp || 1), recall: tp / (tp + fn || 1),
    noSkillOpened: count((r) => !r.opened.length), fpCoRead: count((r) => r.coRead),
  };
  const temporary = join(output, '.results.json.tmp');
  writeFileSync(temporary, JSON.stringify({ summary, results: completed }, null, 2));
  renameSync(temporary, join(output, 'results.json'));
  return summary;
}
await Promise.all(Array.from({ length: Number(values.jobs) }, async () => {
  while (queue.length && !usageLimitReached) {
    const { row, fixtureIndex, index } = queue.shift();
    const directory = join(output, String(index + 1));
    try {
      const session = await nativeSession({
        repoRoot: resolve(values['skills-root']), workspace: join(directory, 'workspace'), output: directory,
        prompt: row.query, timeoutMs: 180000, maxCommands: Number(values['max-commands']), model: values.model,
      });
      const opened = [...new Set(session.skillReads.map((path) => path.split('/')[0]))];
      const loaded = [...new Set(session.skillReads.filter((path) => path.endsWith('/SKILL.md')).map((path) => path.split('/')[0]))];
      const depth = Object.fromEntries(opened.map((skill) => [skill, session.skillReads.filter((path) => path.startsWith(`${skill}/`) && !path.endsWith('/SKILL.md')).length]));
      results[index] = { ...row, fixtureIndex, opened, loaded, depth, commands: session.commands.length };
      if (session.usageLimitReached) {
        usageLimitReached = true;
        throw Error('Usage limit reached; session is incomplete');
      }
      // Caps and timeouts are expected in this early-routing probe. A native
      // startup/exit failure must not become an invented no-skill decision.
      if (session.exitCode !== 0 && !session.capped && !session.timedOut)
        throw Error(`Native session exited with code ${session.exitCode ?? 'unknown'}`);
      const invoked = opened.includes(values.skill);
      Object.assign(results[index], {
        invoked, correct: invoked === row.should_trigger,
        coRead: invoked && !row.should_trigger && (row.boundary_with ?? []).some((skill) => opened.includes(skill)),
      });
      console.log(`${results[index].correct ? 'ok  ' : 'MISS'} ${row.should_trigger ? 'T' : 'F'} ${opened.join(',') || '-'} :: ${row.query.slice(0, 90)}`);
    } catch (error) {
      results[index] = { ...row, fixtureIndex, ...results[index], error: error instanceof Error ? error.message : String(error) };
      console.log(`ERROR fixture ${fixtureIndex}: ${results[index].error}`);
    } finally {
      writeResults();
    }
  }
}));
const summary = writeResults();
console.log(JSON.stringify(summary));
if (usageLimitReached) throw Error('Usage limit reached; results are incomplete');
