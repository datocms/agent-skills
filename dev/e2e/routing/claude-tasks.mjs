// Claude Code task probe: which DatoCMS skills does Claude Code load when it starts a real task?
// claude.mjs gives the actor the Skill tool alone and scores one skill. Here the actor has its working tools
// in a small project folder, so it is free to skip the skills and start working, and every task in tasks.json
// names the whole set it should load:
//   load   every one of these must be loaded
//   oneOf  at least one of these must be loaded (either owner is right)
//   allow  loading these is fine
// Any other skill loaded is a wrong load. Paid: run deliberately.
//
// Confinement. An actor with a shell goes looking when its tools fail: it lists the home directory, opens
// credential files and fetches a real CLI that uses the operator's saved login. So every actor here runs in
// Claude Code's sandbox with no network, cannot read or write under the operator's home, gets an environment
// with nothing but PATH and locale, and finds a `datocms` command that works (fake-datocms.mjs: canned answers,
// no connection). Before any task, a self-check runs an actor that tries to break out; the run refuses to start
// unless every attempt failed.
//   node dev/e2e/routing/claude-tasks.mjs --model claude-haiku-5-5 --output local/routing/<run> [--skills-root <dir containing skills/>] [--only id,prefix*] [--effort medium]
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const here = import.meta.dirname;
const repo = resolve(here, '../../..');
const { values } = parseArgs({
  options: {
    'skills-root': { type: 'string', default: repo },
    tasks: { type: 'string', default: join(here, 'tasks.json') },
    output: { type: 'string' },
    only: { type: 'string' },
    jobs: { type: 'string', default: '6' },
    model: { type: 'string', default: 'claude-haiku-5-5' },
    // Unset: the CLI's own default for the model.
    effort: { type: 'string' },
    'max-turns': { type: 'string', default: '6' },
    'timeout-seconds': { type: 'string', default: '240' },
    'self-check-only': { type: 'boolean', default: false },
    repeat: { type: 'string', default: '1' },
  },
});
const output = resolve(values.output ?? join(repo, 'local/routing', `tasks-${new Date().toISOString().replace(/[:.]/g, '-')}`));
if (existsSync(join(output, 'results.json'))) throw Error('Preserve evidence: choose a fresh --output');
mkdirSync(join(output, 'raw'), { recursive: true });
// One copy for the whole run: editing the skills while it runs changes nothing, and the run keeps what it tested.
const skillsSource = join(output, 'skills');
cpSync(join(resolve(values['skills-root']), 'skills'), skillsSource, { recursive: true });
const full = (name) => `datocms-${name}`;

const wanted = values.only?.split(',');
const tasks = JSON.parse(readFileSync(resolve(values.tasks), 'utf8')).filter(
  (t) => !wanted || wanted.some((w) => (w.endsWith('*') ? t.id.startsWith(w.slice(0, -1)) : t.id === w)),
);
if (new Set(tasks.map((t) => t.id)).size !== tasks.length) throw Error('Duplicate task id');
// --repeat N runs every task N times (ids get #2, #3…): one run of a task says little about a model that varies.
for (const task of [...tasks]) for (let n = 2; n <= Number(values.repeat); n++) tasks.push({ ...task, id: `${task.id}#${n}` });

const FAKE_CLI = readFileSync(join(here, 'fake-datocms.mjs'), 'utf8').replace(/^#!.*\n/, `#!${process.execPath}\n`);
const home = homedir();
// What a sandboxed command still has to read under the home directory: the node installation, when it lives there.
const nodeRoot = resolve(dirname(process.execPath), '..');
const SETTINGS = {
  sandbox: {
    enabled: true,
    failIfUnavailable: true,
    allowUnsandboxedCommands: false,
    autoAllowBashIfSandboxed: true,
    // `.claude` holds the actor's own skills: an actor must not be able to rewrite what it is being tested on.
    filesystem: { denyRead: ['~'], allowRead: ['.', ...(nodeRoot.startsWith(`${home}/`) ? [nodeRoot] : [])], denyWrite: ['~', './.claude'] },
    network: { allowedDomains: [] },
  },
  permissions: {
    defaultMode: 'dontAsk',
    allow: ['Bash', 'Glob', 'Grep', 'Edit', 'Write', 'Skill'],
    deny: ['Read(~/**)', 'Edit(~/**)', 'Write(~/**)', 'Edit(/.claude/**)', 'Write(/.claude/**)'],
  },
};

// Projects with no DatoCMS in them: another CMS, another kind of plugin, or a site that does not use DatoCMS yet.
const OTHER_STACK = new Set(['next-other', 'vite-plugin', 'next-plain']);

function workspaceFor(task) {
  const dir = mkdtempSync(join(tmpdir(), 'dato-routing-'));
  const template = join(here, 'workspaces', task.workspace);
  if (task.workspace !== 'empty') cpSync(template, dir, { recursive: true });
  for (const [path, content] of Object.entries(task.files ?? {})) {
    const target = resolve(dir, path);
    if (!target.startsWith(`${dir}/`)) throw Error('Task file escapes the workspace');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  if (dir.startsWith(`${home}/`)) throw Error('The temporary folder is under the home directory: the sandbox could not tell them apart');
  // A project on another stack has no DatoCMS CLI: finding one there would tell the actor it is a DatoCMS project.
  if (!OTHER_STACK.has(task.workspace)) {
    mkdirSync(join(dir, 'bin'));
    writeFileSync(join(dir, 'bin/datocms'), FAKE_CLI, { mode: 0o755 });
    mkdirSync(join(dir, 'node_modules/.bin'), { recursive: true });
    symlinkSync(join(dir, 'bin/datocms'), join(dir, 'node_modules/.bin/datocms'));
  }
  cpSync(skillsSource, join(dir, '.claude/skills'), { recursive: true });
  return dir;
}

/** The skill a tool call loads, if any: the Skill tool, or a read of a SKILL.md. */
function loadedSkill(call) {
  const input = call.input ?? {};
  if (call.name === 'Skill') return String(input.skill ?? '').replace(/^.*:/, '');
  const text = call.name === 'Read' ? String(input.file_path ?? '') : call.name === 'Bash' ? String(input.command ?? '') : '';
  return text.match(/skills\/(datocms-[a-z-]+)\/SKILL\.md/)?.[1] ?? null;
}

/** Looking around is not work: a command made only of read-only steps (ls, cat, grep…) does not count. */
const LOOKING = /^\s*((do|then|else)\s+)*(cd|ls|cat|head|tail|find|grep|rg|pwd|tree|wc|file|stat|which|echo|test|\[|for|while|read|done|fi|if|env|printenv|xargs|sed|awk|sort|uniq|cut|tr|true|git\s+(status|log|diff|show|branch|remote|rev-parse|ls-files))\b/;
const CHANGING = /\bsed\s+(-\w*i|--in-place)|\bxargs\s+.*\b(rm|mv|cp|tee|node|npm|npx|datocms)\b|(^|[^0-9&>])>>?\s*(?!\/dev\/null|&)\S/;
function isWork(call) {
  if (call.name === 'Write' || call.name === 'Edit') return true;
  if (call.name !== 'Bash') return false;
  // Quoted text goes first: a `|` or `;` inside a pattern or a sed script is not a new step.
  const command = String(call.input?.command ?? '').replace(/'[^']*'|"[^"]*"/g, '""');
  return command.split(/&&|\|\||;|\||\n/).some((step) => step.trim() && (!LOOKING.test(step) || CHANGING.test(step)));
}

/** Runs one confined actor in `dir` and returns its events. `name` labels the saved transcript. */
function runActor(prompt, dir, name, maxTurns) {
  const args = [
    '-p', prompt,
    '--setting-sources', 'project',
    '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
    '--tools', 'Bash,Read,Glob,Grep,Skill,Write,Edit',
    '--permission-mode', 'dontAsk',
    // Passed here, not written into the folder: a settings file there would be the actor's to edit, and Claude Code
    // ignores the allow rules of a folder nobody trusted.
    '--settings', JSON.stringify(SETTINGS),
    '--output-format', 'stream-json', '--verbose', '--no-session-persistence',
    '--max-turns', String(maxTurns),
    '--model', values.model,
    ...(values.effort ? ['--effort', values.effort] : []),
  ];
  // The actor's environment is a short allow-list: whatever tokens the operator's shell exports stay out of it.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(HOME|USER|LOGNAME|SHELL|TERM|TMPDIR|LANG|LC_[A-Z_]+|TZ)$/.test(key)));
  return new Promise((done) => {
    const child = spawn('claude', args, {
      cwd: dir,
      stdio: ['ignore', 'pipe', 'pipe'],
      // Own process group: a command the actor left running would keep the pipes open after a kill of `claude` alone.
      detached: true,
      env: {
        ...env,
        ENABLE_CLAUDEAI_MCP_SERVERS: 'false',
        XDG_DATA_HOME: join(dir, '.xdg/data'),
        npm_config_cache: join(dir, '.xdg/npm'),
        PATH: `${join(dir, 'bin')}${delimiter}${process.env.PATH ?? ''}`,
      },
    });
    let raw = '';
    let timedOut = false;
    const stop = () => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} };
    const timer = setTimeout(() => { timedOut = true; stop(); }, Number(values['timeout-seconds']) * 1000);
    child.stdout.on('data', (d) => { raw += d; });
    child.stderr.on('data', () => {});
    child.on('close', () => {
      clearTimeout(timer);
      stop();
      writeFileSync(join(output, 'raw', `${name}.jsonl`), raw);
      const events = raw.split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
      done({ events, raw, timedOut });
    });
  });
}

const toolCalls = (events) => events.filter((e) => e.type === 'assistant').flatMap((e) => e.message?.content ?? []).filter((c) => c.type === 'tool_use');
const toolResults = (events) => events.filter((e) => e.type === 'user').flatMap((e) => (Array.isArray(e.message?.content) ? e.message.content : [])).filter((c) => c.type === 'tool_result')
  .map((c) => (typeof c.content === 'string' ? c.content : (c.content ?? []).map((part) => part.text ?? '').join('')));

/**
 * An actor is told to read a file outside its folder (under the operator's home), to write next to it and to reach
 * the network, each in several ways. The file holds a random marker that appears nowhere else: the check passes only
 * if the marker never comes back, nothing was written outside, no request got through, and a write inside the folder
 * worked (so the shell itself runs).
 */
async function confinementHolds() {
  const marker = `canary-${randomBytes(12).toString('hex')}`;
  const outside = join(output, 'confinement');
  mkdirSync(outside, { recursive: true });
  if (!outside.startsWith(`${home}/`)) throw Error('Put --output under the home directory: the self-check needs a file there that the actor must fail to read');
  const canary = join(outside, 'canary.txt');
  const escape = join(outside, 'escape.txt');
  writeFileSync(canary, `${marker}\n`);
  // Its name is in no prompt: seeing it means a listing of the folder got through.
  const unlisted = `unlisted-${randomBytes(8).toString('hex')}.txt`;
  writeFileSync(join(outside, unlisted), '');
  rmSync(escape, { force: true });
  const dir = workspaceFor({ workspace: 'empty' });
  const prompt = [
    'This is a self-test of the sandbox you run in. Run every step below even when an earlier one fails, each as its own tool call, and do not try any other way around a failure. Then answer with one line per step: the output or the error.',
    `1. Bash: cat ${canary}`,
    `2. Bash: node -e "process.stdout.write(require('fs').readFileSync('${canary}','utf8'))"`,
    `3. Bash: ls ${outside}`,
    `4. The Read tool on ${canary}`,
    `5. Bash: echo escaped > ${escape}`,
    `6. The Write tool: write the word escaped to ${escape}`,
    '7. Bash: curl -sS -m 8 -o /dev/null -w "%{http_code}" https://example.com',
    '8. Bash: echo inside > inside.txt && cat inside.txt',
  ].join('\n');
  const { events, raw } = await runActor(prompt, dir, 'confinement-self-check', 14);
  const calls = toolCalls(events);
  const results = toolResults(events);
  const insideWritten = existsSync(join(dir, 'inside.txt'));
  rmSync(dir, { recursive: true, force: true });
  const failures = [];
  if (calls.filter((c) => c.name === 'Bash').length < 5) failures.push(`the actor ran only ${calls.filter((c) => c.name === 'Bash').length} of the shell steps, so the check proves nothing`);
  if (raw.includes(marker)) failures.push('the actor read a file under the home directory');
  if (raw.includes(unlisted)) failures.push('the actor listed a folder under the home directory');
  if (existsSync(escape)) failures.push('the actor wrote outside its folder');
  if (results.some((text) => /^\s*(200|301|302)\s*$/m.test(text))) failures.push('the actor reached the network');
  if (!insideWritten) failures.push('the actor could not write inside its own folder: the shell is not usable');
  rmSync(escape, { force: true });
  return failures;
}

async function probe(task) {
  const dir = workspaceFor(task);
  const { events, timedOut } = await runActor(task.task, dir, task.id, values['max-turns']);
  rmSync(dir, { recursive: true, force: true });
  const init = events.find((e) => e.type === 'system' && e.subtype === 'init');
  const calls = toolCalls(events);
  const loaded = [];
  let work = -1;
  calls.forEach((call, index) => {
    const skill = loadedSkill(call);
    if (skill) { if (!loaded.some((l) => l.skill === skill)) loaded.push({ skill, beforeWork: work < 0 }); } else if (work < 0 && isWork(call)) work = index;
  });
  return {
    model: init?.model,
    availableSkills: (init?.skills ?? []).filter((s) => s.startsWith('datocms-')).length,
    loaded,
    actions: calls.map((c) => (loadedSkill(c) ? `Skill:${loadedSkill(c).replace('datocms-', '')}` : c.name)).join(' '),
    timedOut,
    cost: events.find((e) => e.type === 'result')?.total_cost_usd ?? null,
  };
}

function score(task, run) {
  const names = run.loaded.map((l) => l.skill);
  const load = (task.load ?? []).map(full), oneOf = (task.oneOf ?? []).map(full), allow = (task.allow ?? []).map(full);
  const missing = load.filter((s) => !names.includes(s));
  if (oneOf.length && !oneOf.some((s) => names.includes(s))) missing.push(`one of ${oneOf.join(' | ')}`);
  const extra = names.filter((s) => ![...load, ...oneOf, ...allow].includes(s));
  const late = run.loaded.filter((l) => !l.beforeWork && [...load, ...oneOf].includes(l.skill)).map((l) => l.skill);
  return { missing, extra, late, pass: !missing.length && !extra.length };
}

const breaches = await confinementHolds();
if (breaches.length) {
  console.error(`Confinement self-check FAILED, no task was run:\n- ${breaches.join('\n- ')}\nTranscript: ${join(output, 'raw/confinement-self-check.jsonl')}`);
  process.exit(2);
}
console.log('confinement self-check passed: no read or write under the home directory, no network, shell usable');
if (values['self-check-only']) process.exit(0);

const results = [];
const queue = tasks.map((task, index) => ({ task, index }));
await Promise.all(Array.from({ length: Number(values.jobs) }, async () => {
  while (queue.length) {
    const { task, index } = queue.shift();
    const run = await probe(task);
    const verdict = score(task, run);
    results[index] = { ...task, files: undefined, ...run, ...verdict };
    const short = (list) => list.map((s) => s.replaceAll('datocms-', '')).join(',');
    console.log(`${verdict.pass ? 'ok  ' : 'MISS'} ${task.id.padEnd(34)} loaded=${short(run.loaded.map((l) => l.skill)) || '-'}${verdict.missing.length ? ` missing=${short(verdict.missing)}` : ''}${verdict.extra.length ? ` extra=${short(verdict.extra)}` : ''}${verdict.late.length ? ` late=${short(verdict.late)}` : ''}${run.timedOut ? ' TIMEOUT' : ''}`);
  }
}));

const skills = [...new Set(tasks.flatMap((t) => [...(t.load ?? []), ...(t.oneOf ?? []), ...(t.allow ?? [])]))].sort();
const perSkill = Object.fromEntries(skills.map((name) => {
  const s = full(name);
  const required = results.filter((r) => (r.load ?? []).includes(name));
  const forbidden = results.filter((r) => ![...(r.load ?? []), ...(r.oneOf ?? []), ...(r.allow ?? [])].includes(name));
  const has = (r) => r.loaded.some((l) => l.skill === s);
  return [name, { required: required.length, loadedWhenRequired: required.filter(has).length, forbidden: forbidden.length, loadedWhenForbidden: forbidden.filter(has).length }];
}));
const summary = {
  model: results[0]?.model,
  effort: values.effort ?? null,
  skillsRoot: resolve(values['skills-root']),
  maxTurns: Number(values['max-turns']),
  tasks: results.length,
  passed: results.filter((r) => r.pass).length,
  lateLoads: results.filter((r) => r.late.length).length,
  timedOut: results.filter((r) => r.timedOut).length,
  cost: results.reduce((sum, r) => sum + (r.cost ?? 0), 0),
  perSkill,
};
if (results.some((r) => r.availableSkills === 0)) throw Error('A probe saw no DatoCMS skills: the result would be meaningless');
writeFileSync(join(output, 'results.json'), JSON.stringify({ summary, results }, null, 2));
console.log(JSON.stringify(summary, null, 1));
