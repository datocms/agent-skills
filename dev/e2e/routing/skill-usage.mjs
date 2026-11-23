// What did the agent do with each skill file? Replays the transcripts of finished runs (no model runs here, unless
// --judge is given) and reports, per skill file and per section:
//   - reach: did its text enter the agent's context at all, and how much of it (lines of the file found in what the
//     agent was shown: the skill body a Skill call injects, and the output of every Read, cat, sed, grep or MCP call);
//   - timing: at which tool call, before or after the first write attempt, and after how many failed calls;
//   - echo: code terms the agent used after the read that it first met in that file (not used before, not shown by any
//     other tool output first). Evidence that the text was used, not proof: a model may know the term anyway.
// With --judge <model>, a model without tools reads each case's timeline and says, per file read, whether the later
// actions relied on it (used / not used / misled) and what the agent needed but was not given.
//   node dev/e2e/routing/skill-usage.mjs [--skills <dir>] [--out <report.md>] [--only <case>] [--judge <model>] <run dir> …
// A run dir is local/e2e/<run> (live suite), local/hosted/<run> (hosted MCP smoke) or any folder of case folders that
// hold raw.jsonl (Claude) or native.jsonl (Codex).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
// A line this short ("```ts", "| - | - |") says nothing about which file it came from.
const MIN_LINE = 24;
const WRITE = /cma:script|cma:call\s+\S+\s+(?!list|find|instances|self|references|query)\w+|migrations:(new|run)|environments:(fork|promote|destroy|rename)|upsert_and_execute_unsafe_script/;

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? (name === 'node_modules' ? [] : walk(path)) : [path];
});

// Terms worth tracing: code a reader could only repeat because it is written down. Plain words are dropped.
export function terms(line, inFence) {
  const found = [...line.matchAll(/`([^`\n]{3,80})`/g)].map((m) => m[1]);
  if (inFence) found.push(...(line.match(/client\.\w+\.\w+|--[a-z][\w-]+|datocms [\w:-]+|\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b|\b[a-z]+(?:_[a-z0-9]+)+\b|\b[a-z]+[A-Z]\w+\b/g) ?? []));
  // Terms any script contains say nothing about a DatoCMS file.
  const generic = /^(?:(?:console|JSON|process|Object|Array|Promise|Math|String|Number)\.\w+|\.\w+|--?(?:help|version|json))$/;
  return [...new Set(found.map((t) => t.trim()))].filter((t) => t.length >= 5 && !generic.test(t) && !/[<>…]|\.\.\./.test(t) && (/[._:/\-\s\d(]/.test(t) || /[a-z][A-Z]/.test(t)));
}

// Every .md file of every skill, split into sections. Mirrored third-party docs are data, not guidance: skipped.
export function loadSkills(root) {
  const files = walk(root).filter((p) => p.endsWith('.md') && !p.includes('/references/docs/')).map((path) => {
    const sections = [];
    let section = { title: '(top)', lines: [] };
    let inFence = false;
    let frontmatter = false;
    readFileSync(path, 'utf8').split('\n').forEach((raw, index) => {
      const text = raw.trim();
      if (index === 0 && text === '---') { frontmatter = true; return; }
      if (frontmatter) { frontmatter = text !== '---'; return; }
      if (text.startsWith('```')) { inFence = !inFence; return; }
      if (!inFence && /^#{1,4} /.test(text)) { sections.push(section); section = { title: text.replace(/^#+ /, ''), lines: [] }; return; }
      if (text) section.lines.push({ text, terms: terms(text, inFence) });
    });
    sections.push(section);
    return { file: relative(root, path), bytes: statSync(path).size, sections: sections.filter((s) => s.lines.length) };
  });
  // Only lines found in a single file can tell which file was read; only terms found in few files point at one.
  const owners = new Map();
  const termFiles = new Map();
  for (const f of files) for (const s of f.sections) for (const l of s.lines) {
    owners.set(l.text, (owners.get(l.text) ?? new Set()).add(f.file));
    for (const t of l.terms) termFiles.set(t, (termFiles.get(t) ?? new Set()).add(f.file));
  }
  for (const f of files) for (const s of f.sections) for (const l of s.lines) {
    l.unique = l.text.length >= MIN_LINE && owners.get(l.text).size === 1;
    l.terms = l.terms.filter((t) => termFiles.get(t).size <= 4);
  }
  return files;
}

const flatten = (value) => (typeof value === 'string' ? value : value && typeof value === 'object' ? Object.values(value).map(flatten).join('\n') : String(value ?? ''));
const parseLines = (path) => readFileSync(path, 'utf8').split('\n').filter(Boolean).flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });

// One ordered list for both agents: `action` is what the agent wrote (a tool call or a message), `context` is what it
// was shown in return. `step` counts tool calls.
export function readTranscript(dir) {
  const events = [];
  let step = 0;
  let model = null;
  if (existsSync(join(dir, 'raw.jsonl'))) {
    const calls = new Map();
    for (const e of parseLines(join(dir, 'raw.jsonl'))) {
      if (e.type === 'system' && e.subtype === 'init') model = e.model;
      const content = Array.isArray(e.message?.content) ? e.message.content : [];
      if (e.type === 'assistant') for (const c of content) {
        if (c.type === 'text') events.push({ kind: 'action', step, tool: 'message', text: c.text });
        if (c.type === 'tool_use') { step += 1; calls.set(c.id, { step, tool: c.name, mcp: c.name.startsWith('mcp__') }); events.push({ kind: 'action', step, tool: c.name, text: flatten(c.input) }); }
      }
      if (e.type === 'user') for (const c of content) {
        if (c.type === 'tool_result') { const call = calls.get(c.tool_use_id) ?? { step, tool: '?' }; events.push({ kind: 'context', ...call, text: flatten(c.content), failed: c.is_error === true }); }
        // The body of a skill the Skill tool loaded arrives as a message of its own.
        if (c.type === 'text') events.push({ kind: 'context', step, tool: 'Skill', text: c.text, failed: false });
      }
    }
  } else if (existsSync(join(dir, 'native.jsonl'))) {
    for (const e of parseLines(join(dir, 'native.jsonl'))) {
      const item = e.item;
      if (e.type !== 'item.completed' || !item) continue;
      if (item.type === 'agent_message') events.push({ kind: 'action', step, tool: 'message', text: item.text ?? '' });
      if (item.type === 'command_execution') { step += 1; events.push({ kind: 'action', step, tool: 'shell', text: item.command ?? '' }, { kind: 'context', step, tool: 'shell', text: item.aggregated_output ?? '', failed: (item.exit_code ?? 0) !== 0 }); }
      if (item.type === 'mcp_tool_call') {
        step += 1;
        const text = flatten(item.result ?? item.error);
        events.push({ kind: 'action', step, tool: item.tool, text: `${item.tool}\n${flatten(item.arguments)}` }, { kind: 'context', step, tool: item.tool, mcp: true, text, failed: item.status !== 'completed' || /execution failed|are unverified|refused the access token/.test(text) });
      }
    }
  } else return null;
  const session = existsSync(join(dir, 'session.json')) ? JSON.parse(readFileSync(join(dir, 'session.json'), 'utf8')) : {};
  model ??= session.model ?? null;
  // Runs made before the harness saved the prompt have none: terms the prompt gave the agent then count as echoes.
  const prompt = session.prompt ?? session.prompts?.join('\n\n') ?? null;
  let passed = null;
  if (existsSync(join(dir, 'outcome.json'))) passed = JSON.parse(readFileSync(join(dir, 'outcome.json'), 'utf8')).passed ?? null;
  const report = join(dirname(dir), 'report.json');
  if (passed === null && existsSync(report)) passed = JSON.parse(readFileSync(report, 'utf8')).cases?.find((c) => `case-${c.kind}` === basename(dir))?.correctOutcome ?? null;
  return { name: basename(dir), dir, model, prompt, events, steps: step, passed };
}

// Lines as the agent saw them: `cat` prints them bare, Read numbers them, grep prefixes a file name or a line number.
function shownLines(text) {
  const shown = new Set();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.length < MIN_LINE) continue;
    shown.add(line);
    shown.add(line.replace(/^\d+\s*[→\t|:-]\s*/, '').trim());
    shown.add(line.replace(/^[^\s:]+\.md[:-](\d+[:-])?\s*/, '').trim());
  }
  return shown;
}

export function analyse(skills, transcript) {
  const { events } = transcript;
  const firstWrite = events.find((e) => e.kind === 'action' && (WRITE.test(e.text) || ['Write', 'Edit', 'apply_patch'].includes(e.tool)))?.step ?? null;
  const failedSteps = [...new Set(events.filter((e) => e.kind === 'context' && e.failed).map((e) => e.step))];
  const contexts = events.filter((e) => e.kind === 'context').map((e) => ({ ...e, shown: shownLines(e.text), skillText: false }));
  const actions = events.filter((e) => e.kind === 'action');
  const reads = [];
  for (const f of skills) {
    const total = f.sections.flatMap((s) => s.lines).filter((l) => l.unique).length;
    if (!total) continue;
    let firstStep = null;
    const calls = new Set();
    const via = new Set();
    const counted = new Set();
    const carriers = [];
    const sections = f.sections.map((s) => ({ title: s.title, total: s.lines.filter((l) => l.unique).length, seen: 0, terms: new Set() }));
    for (const c of contexts) {
      let hit = 0;
      f.sections.forEach((s, i) => { for (const l of s.lines) if (l.unique && !counted.has(l) && c.shown.has(l.text)) { hit += 1; sections[i].seen += 1; counted.add(l); for (const t of l.terms) sections[i].terms.add(t); } });
      if (!hit) continue;
      if (hit >= Math.min(3, total)) carriers.push(c);
      calls.add(c.step);
      via.add(c.tool === 'Skill' ? 'skill load' : c.mcp ? `MCP ${c.tool.replace(/^mcp__/, '')}` : 'file read');
      firstStep ??= c.step;
    }
    const seen = sections.reduce((n, s) => n + s.seen, 0);
    // One stray matching line is a quotation in some other output, not a read.
    if (seen < Math.min(3, total)) continue;
    for (const c of carriers) c.skillText = true;
    // The text as the agent saw it. A line too short or too common to trace follows the traceable line before it.
    f.sections.forEach((s, i) => {
      let on = counted.has(s.lines.find((l) => l.unique));
      sections[i].shown = s.lines.filter((l) => { if (l.unique) on = counted.has(l); return on; }).map((l) => l.text);
    });
    const failuresBefore = failedSteps.filter((s) => s < firstStep).length;
    // When the read happened: before the agent first tried to write, after a call had failed, or later with nothing failing.
    const when = firstWrite === null || firstStep <= firstWrite ? 'before' : failuresBefore ? 'afterFailure' : 'later';
    reads.push({ file: f.file, bytes: f.bytes, firstStep, calls: calls.size, via: [...via], seen, total, part: seen / total, sections, when, failuresBefore, echoes: [] });
  }
  // Output that carries skill text cannot be the "other place" a term was first met.
  const other = contexts.filter((c) => !c.skillText);
  for (const read of reads) {
    const traced = new Set();
    for (const section of read.sections) for (const term of section.terms) {
      if (traced.has(term)) continue;
      traced.add(term);
      const use = actions.find((a) => a.step > read.firstStep && a.text.includes(term));
      if (!use) continue;
      if (transcript.prompt?.includes(term) || actions.some((a) => a.step <= read.firstStep && a.text.includes(term))) continue;
      if (other.some((c) => c.step < use.step && c.text.includes(term))) continue;
      read.echoes.push({ term, step: use.step, section: section.title });
    }
    for (const section of read.sections) section.echoes = read.echoes.filter((e) => e.section === section.title).map((e) => e.term);
  }
  return { ...transcript, firstWrite, failedSteps, reads: reads.sort((a, b) => a.firstStep - b.firstStep) };
}

// A model without tools reads the timeline and judges each read. It sees what the agent saw of each file.
function judge(model, result, skills) {
  const clip = (text, max) => (text.length > max ? `${text.slice(0, max)} … [${text.length - max} more characters]` : text);
  const readSteps = new Map();
  for (const r of result.reads) readSteps.set(r.firstStep, [...(readSteps.get(r.firstStep) ?? []), r.file]);
  const timeline = result.events.map((e) => {
    if (e.kind === 'action') return `[step ${e.step}] AGENT ${e.tool}: ${clip(e.text, 3000)}`;
    const files = readSteps.get(e.step);
    return `[step ${e.step}] RESULT${e.failed ? ' (FAILED)' : ''}: ${files && e.text.length > 1500 ? `(skill text: ${files.join(', ')}; given in full below)` : clip(e.text, 1500)}`;
  }).join('\n');
  const texts = result.reads.map((r) => {
    const file = skills.find((f) => f.file === r.file);
    const body = file.sections.map((s, i) => {
      const { shown } = r.sections[i];
      if (!shown.length) return `## ${s.title}\n(not shown to the agent)`;
      return `## ${s.title}${shown.length < s.lines.length ? ` (the agent saw ${shown.length} of ${s.lines.length} lines: these)` : ''}\n${shown.join('\n')}`;
    }).join('\n\n');
    return `<file name="${r.file}">\n${clip(body, 45000)}\n</file>`;
  }).join('\n\n');
  const prompt = `You are auditing a transcript of a coding agent that worked on a DatoCMS task with instruction files ("skills") available. Decide, for each skill file the agent was shown, whether the agent's LATER actions relied on it.

Verdicts:
- "used": a later action does something specific that this file states and that the agent had not already done before reading it. Quote the action.
- "not_used": nothing the agent did afterwards depends on this file, or the file only repeated what the agent already did.
- "misled": a later action failed or went wrong because it followed this file.

Also say what the agent needed but no file gave it (a failed call the files could have prevented), or null.

Answer with JSON only, no prose and no code fence:
{"files":[{"file":"<name>","verdict":"used|not_used|misled","evidence":"<at most 30 words, name the step>"}],"missing":"<at most 40 words or null>"}

${result.prompt ? `<task>\n${result.prompt}\n</task>` : "The task prompt is not recorded; infer the task from the agent's first actions."}

Outcome recorded by the test: ${result.passed === null ? 'unknown' : result.passed ? 'passed' : 'failed'}.

<timeline>
${timeline}
</timeline>

Skill files shown to the agent (only the sections that reached it):

${texts}`;
  const cwd = join(tmpdir(), 'skill-usage-judge');
  mkdirSync(cwd, { recursive: true });
  // No tools, no MCP servers, no project settings: the judge can only answer.
  const run = spawnSync('claude', ['-p', '--model', model, '--tools', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--setting-sources', '', '--no-session-persistence', '--output-format', 'json'], { cwd, input: prompt, encoding: 'utf8', maxBuffer: 1 << 26, timeout: 300_000 });
  try {
    const answer = JSON.parse(run.stdout).result;
    return JSON.parse(answer.slice(answer.indexOf('{'), answer.lastIndexOf('}') + 1));
  } catch {
    return { error: (run.stderr || run.stdout || 'no answer').slice(0, 200) };
  }
}

const pct = (n) => `${Math.round(n * 100)}%`;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

export function report(skills, results) {
  const out = [];
  const byFile = new Map(skills.map((f) => [f.file, []]));
  for (const r of results) for (const read of r.reads) byFile.get(read.file).push({ ...read, run: r });
  const skillOf = (file) => file.split('/')[0];
  // A skill counts as opened in a case when its SKILL.md reached the agent.
  const openedIn = (r, skill) => r.reads.some((x) => x.file === `${skill}/SKILL.md`);
  const loads = new Map();
  for (const r of results) for (const read of r.reads) if (read.file.endsWith('/SKILL.md')) loads.set(skillOf(read.file), (loads.get(skillOf(read.file)) ?? 0) + 1);
  const tally = (list) => [...list.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1]).map(([name, n]) => `${name} ${n}`).join(', ');
  const judged = results.some((r) => r.judge);
  out.push(`# Skill usage`, '', `${results.length} cases: ${[...new Set(results.map((r) => basename(dirname(r.dir))))].map((run) => `${run} (${tally(results.filter((r) => basename(dirname(r.dir)) === run).map((r) => r.model ?? 'model not recorded'))})`).join(', ')}.`, '');
  out.push('Reach is measured, echo is evidence. "Echo" counts code terms the agent used after the read that it first met in that file.', '');
  out.push('## Files that reached the agent', '', `| File | Size | Cases it reached | Of cases that opened its skill | How it arrived | Part read | Read before the first write | Read after a failed call | Read later, nothing failed | Cases with an echo |${judged ? ' Judge: used / not used / misled |' : ''}`, `| - | - | - | - | - | - | - | - | - | - |${judged ? ' - |' : ''}`);
  const opened = [...byFile].filter(([, reads]) => reads.length).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  for (const [file, reads] of opened) {
    const verdicts = reads.map((x) => x.run.judge?.files?.find((f) => f.file === file)?.verdict).filter(Boolean);
    const count = (v) => verdicts.filter((x) => x === v).length;
    out.push(`| \`${file}\` | ${kb(reads[0].bytes)} | ${reads.length}/${results.length} | ${file.endsWith('/SKILL.md') ? '-' : `${reads.filter((x) => openedIn(x.run, skillOf(file))).length}/${loads.get(skillOf(file)) ?? 0}`} | ${tally(reads.flatMap((x) => x.via))} | ${pct(reads.reduce((n, x) => n + x.part, 0) / reads.length)} | ${reads.filter((x) => x.when === 'before').length} | ${reads.filter((x) => x.when === 'afterFailure').length} | ${reads.filter((x) => x.when === 'later').length} | ${reads.filter((x) => x.echoes.length).length} |${judged ? ` ${verdicts.length ? `${count('used')} / ${count('not_used')} / ${count('misled')}` : '-'} |` : ''}`);
  }
  out.push('', '## Files no agent opened', '');
  for (const skill of [...new Set(skills.map((f) => skillOf(f.file)))].sort()) {
    const never = skills.filter((f) => skillOf(f.file) === skill && !byFile.get(f.file).length);
    const all = skills.filter((f) => skillOf(f.file) === skill);
    if (never.length) out.push(`- **${skill}** (skill opened in ${loads.get(skill) ?? 0} cases): ${never.length} of ${all.length} files, ${kb(never.reduce((n, f) => n + f.bytes, 0))}: ${never.map((f) => `\`${f.file.split('/').slice(1).join('/')}\``).join(', ')}`);
  }
  out.push('', '## Sections of the files that were opened', '', 'Cases where at least one line of the section was shown, and cases where a term from it was used afterwards.', '');
  for (const [file, reads] of opened) {
    out.push(`### \`${file}\` (${reads.length} cases)`, '', '| Section | Lines | Shown in | Echoed in | Terms echoed |', '| - | - | - | - | - |');
    reads[0].sections.forEach((s, i) => {
      if (!s.total) return;
      const shown = reads.filter((x) => x.sections[i].seen).length;
      const echoed = reads.filter((x) => x.sections[i].echoes.length);
      const top = [...new Set(echoed.flatMap((x) => x.sections[i].echoes))].slice(0, 4).map((t) => `\`${t.replaceAll('|', '\\|')}\``).join(', ');
      out.push(`| ${s.title.replaceAll('|', '\\|')} | ${s.total} | ${shown} | ${echoed.length} | ${top} |`);
    });
    out.push('');
  }
  out.push('## Cases', '');
  for (const r of results) {
    out.push(`### ${basename(dirname(r.dir))}/${r.name} (${r.passed === null ? 'outcome not recorded' : r.passed ? 'passed' : 'failed'}; ${r.steps} tool calls, first write at ${r.firstWrite ?? 'none'}, failed calls at ${r.failedSteps.join(', ') || 'none'})`, '');
    if (!r.reads.length) out.push('- No skill text reached the agent.');
    for (const read of r.reads) {
      const verdict = r.judge?.files?.find((f) => f.file === read.file);
      out.push(`- call ${read.firstStep}: \`${read.file}\` (${read.via.join(', ')}), ${pct(read.part)} read${read.calls > 1 ? ` over ${read.calls} calls` : ''}${read.when === 'before' ? '' : read.when === 'afterFailure' ? `, after the first write and ${read.failuresBefore} failed call${read.failuresBefore > 1 ? 's' : ''}` : ', after the first write'}; echoes: ${read.echoes.length ? read.echoes.slice(0, 6).map((e) => `\`${e.term}\` (call ${e.step})`).join(', ') : 'none'}${verdict ? `; judge: **${verdict.verdict}**, ${verdict.evidence}` : ''}`);
    }
    if (r.judge?.missing) out.push(`- judge, missing: ${r.judge.missing}`);
    if (r.judge?.error) out.push(`- judge failed: ${r.judge.error}`);
    out.push('');
  }
  return out.join('\n');
}

function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { skills: { type: 'string' }, out: { type: 'string' }, only: { type: 'string', multiple: true }, judge: { type: 'string' } } });
  if (!positionals.length) throw Error('Give at least one run folder, e.g. local/e2e/<run>');
  const skills = loadSkills(resolve(values.skills ?? join(REPO, 'skills')));
  const results = [];
  for (const run of positionals) for (const name of readdirSync(resolve(run)).sort()) {
    if (values.only && !values.only.includes(name)) continue;
    const dir = join(resolve(run), name);
    const transcript = statSync(dir).isDirectory() ? readTranscript(dir) : null;
    if (!transcript) continue;
    const result = analyse(skills, transcript);
    if (values.judge && result.reads.length) { result.judge = judge(values.judge, result, skills); console.error(`judged ${basename(run)}/${name}`); }
    results.push(result);
  }
  const text = report(skills, results);
  if (values.out) { mkdirSync(dirname(resolve(values.out)), { recursive: true }); writeFileSync(resolve(values.out), `${text}\n`); }
  console.log(values.out ? text.slice(0, text.indexOf('\n## Sections')) : text);
  if (values.out) console.log(`\nSections and cases: ${values.out}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
