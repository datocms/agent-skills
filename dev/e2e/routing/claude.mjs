// Claude Code routing probe: which DatoCMS skill does Claude Code invoke for each trigger-fixture query?
// Every query runs in an empty directory through `claude -p` with the repo plugin loaded from --skills-root,
// only the Skill tool, no MCP servers (claude.ai connectors included) and no user settings, so nothing can
// change files or reach a DatoCMS project. Paid: run deliberately.
//   node dev/e2e/routing/claude.mjs --skills-root <dir containing skills/> --output local/routing/<run>
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const repo = resolve(import.meta.dirname, '../../..');
const { values } = parseArgs({
  options: {
    'skills-root': { type: 'string', default: repo },
    output: { type: 'string' },
    skill: { type: 'string', default: 'datocms-setup' },
    modes: { type: 'string', default: 'implicit,overlap' },
    jobs: { type: 'string', default: '4' },
    model: { type: 'string' },
  },
});
const output = resolve(values.output ?? join(repo, 'local/routing', new Date().toISOString().replace(/[:.]/g, '-')));
if (existsSync(join(output, 'results.json'))) throw Error('Preserve evidence: choose a fresh --output');
const plugin = join(output, 'plugin');
mkdirSync(join(plugin, '.claude-plugin'), { recursive: true });
cpSync(join(repo, '.claude-plugin/plugin.json'), join(plugin, '.claude-plugin/plugin.json'));
cpSync(join(resolve(values['skills-root']), 'skills'), join(plugin, 'skills'), { recursive: true });

const modes = values.modes.split(',');
const rows = JSON.parse(readFileSync(join(repo, 'evals/fixtures/trigger', `${values.skill}.json`), 'utf8')).filter((r) => modes.includes(r.query_mode ?? 'implicit'));

function probe(query) {
  const args = ['-p', query, '--plugin-dir', plugin, '--setting-sources', 'project', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--disallowedTools', 'mcp__*', '--tools', 'Skill', '--output-format', 'stream-json', '--verbose', '--no-session-persistence', '--max-turns', '2'];
  if (values.model) args.push('--model', values.model);
  return new Promise((done) => {
    const child = spawn('claude', args, { cwd: mkdtempSync(join(tmpdir(), 'routing-')), env: { ...process.env, ENABLE_CLAUDEAI_MCP_SERVERS: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let raw = '';
    child.stdout.on('data', (d) => { raw += d; });
    child.on('close', () => {
      const events = raw.split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
      const init = events.find((e) => e.type === 'system' && e.subtype === 'init');
      const skills = events.filter((e) => e.type === 'assistant').flatMap((e) => e.message.content).filter((c) => c.type === 'tool_use' && c.name === 'Skill').map((c) => c.input.skill);
      done({ model: init?.model, tools: init?.tools, skills, cost: events.find((e) => e.type === 'result')?.total_cost_usd ?? null });
    });
  });
}

const results = [];
const queue = rows.map((row, index) => ({ row, index }));
await Promise.all(Array.from({ length: Number(values.jobs) }, async () => {
  while (queue.length) {
    const { row, index } = queue.shift();
    const run = await probe(row.query);
    if (run.tools?.some((t) => t !== 'Skill')) throw Error(`Probe exposed tools beyond Skill: ${run.tools}`);
    const invoked = run.skills.some((s) => s.split(':').at(-1) === values.skill);
    results[index] = { ...row, ...run, invoked, correct: invoked === row.should_trigger };
    console.log(`${results[index].correct ? 'ok  ' : 'MISS'} ${row.should_trigger ? 'T' : 'F'} ${run.skills.join(',') || '-'} :: ${row.query.slice(0, 90)}`);
  }
}));
const count = (f) => results.filter(f).length;
const tp = count((r) => r.invoked && r.should_trigger), fp = count((r) => r.invoked && !r.should_trigger), fn = count((r) => !r.invoked && r.should_trigger);
const summary = { skill: values.skill, skillsRoot: resolve(values['skills-root']), model: results[0]?.model, queries: results.length, tp, fp, fn, tn: results.length - tp - fp - fn, precision: tp / (tp + fp || 1), recall: tp / (tp + fn || 1), cost: results.reduce((s, r) => s + (r.cost ?? 0), 0) };
writeFileSync(join(output, 'results.json'), JSON.stringify({ summary, results }, null, 2));
console.log(JSON.stringify(summary));
