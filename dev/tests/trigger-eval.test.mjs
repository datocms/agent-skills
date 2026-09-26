// Offline checks for the trigger eval (evals/scripts): stand-in `claude` and `codex` binaries replace the paid
// classifiers, so these tests make no model calls and write only to temp directories.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const repoRoot = resolve(import.meta.dirname, '../..');
const scripts = join(repoRoot, 'evals/scripts');
const skills = readdirSync(join(repoRoot, 'skills')).filter((name) => existsSync(join(repoRoot, 'skills', name, 'SKILL.md'))).sort();
const fixture = (skill) => JSON.parse(readFileSync(join(repoRoot, 'evals/fixtures/trigger', `${skill}.json`), 'utf8'));

function python(code) {
  const run = spawnSync('python3', ['-c', `import sys, json, pathlib\nsys.path.insert(0, ${JSON.stringify(scripts)})\n${code}`], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout);
}

// Fake CLIs log what they were given and answer every odd query id with true, in reverse order.
const fakeCommon = `const fs = require('node:fs'), path = require('node:path');
const argv = process.argv.slice(2);
const answer = (prompt) => {
  const predictions = [...prompt.matchAll(/^(\\d+)\\. /gm)].map((m) => ({ id: Number(m[1]), trigger: Number(m[1]) % 2 === 1 })).reverse();
  if (process.env.FAKE_MODE === 'duplicate') predictions[1].id = predictions[0].id;
  return JSON.stringify({ predictions });
};
const log = (extra) => fs.writeFileSync(process.env.FAKE_LOG, JSON.stringify({ argv, cwd: process.cwd(), cwdEntries: fs.readdirSync(process.cwd()), ...extra }));
`;
const fakeClaude = `${fakeCommon}
const prompt = argv[argv.indexOf('-p') + 1];
log({ prompt, mcp: process.env.ENABLE_CLAUDEAI_MCP_SERVERS });
const events = [
  { type: 'system', subtype: 'init', model: 'fake-claude-model', tools: [] },
  { type: 'result', subtype: 'success', is_error: false, result: 'Sure:\\n\\x60\\x60\\x60json\\n' + answer(prompt) + '\\n\\x60\\x60\\x60' },
];
process.stdout.write(events.map((e) => JSON.stringify(e)).join('\\n') + '\\n');
`;
const fakeCodex = `${fakeCommon}
const prompt = argv.at(-1), home = process.env.CODEX_HOME;
const schema = JSON.parse(fs.readFileSync(argv[argv.indexOf('--output-schema') + 1], 'utf8'));
log({ prompt, cd: fs.realpathSync(argv[argv.indexOf('--cd') + 1]), codexHome: fs.readdirSync(home), auth: fs.realpathSync(path.join(home, 'auth.json')), home: process.env.HOME, homeEntries: fs.readdirSync(process.env.HOME), schema });
if (process.env.FAKE_MODE === 'stall') {
  // Like the npm codex launcher: the real work runs in a child the launcher does not take down with it.
  const child = require('node:child_process').spawn('sleep', ['60'], { stdio: 'ignore' });
  fs.writeFileSync(process.env.FAKE_LOG + '.child', String(child.pid));
  setTimeout(() => {}, 60000);
} else fs.writeFileSync(argv[argv.indexOf('--output-last-message') + 1], answer(prompt));
`;

function sandbox() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'trigger-eval-')));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'claude'), `#!${process.execPath}\n${fakeClaude}`, { mode: 0o755 });
  writeFileSync(join(bin, 'codex'), `#!${process.execPath}\n${fakeCodex}`, { mode: 0o755 });
  mkdirSync(join(dir, 'codex-home'));
  writeFileSync(join(dir, 'codex-home/auth.json'), '{}');
  writeFileSync(join(dir, 'codex-home/config.toml'), 'model = "user-model"\n');
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_LOG: join(dir, 'log.json'), CODEX_HOME: join(dir, 'codex-home') };
  const run = (args, extraEnv = {}, cwd = undefined) =>
    spawnSync('python3', [join(scripts, 'run_trigger_eval.py'), '--repo-root', repoRoot, '--results-root', join(dir, 'results'), ...args], { env: { ...env, ...extraEnv }, cwd, encoding: 'utf8' });
  const logged = () => JSON.parse(readFileSync(env.FAKE_LOG, 'utf8'));
  const result = (skill, track, source = 'frontmatter') => JSON.parse(readFileSync(join(dir, 'results/trigger', skill, track, source, 'results.json'), 'utf8'));
  return { dir, env, run, logged, result, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('classifier prompts show only the numbered query text, never the fixture metadata', () => {
  const prompts = python(`
import trigger_eval_common as t
repo = pathlib.Path(${JSON.stringify(repoRoot)})
out = {}
for c in t.discover_eval_configs(repo):
    name, description = t.extract_frontmatter(repo / c.skill_file)
    rows = json.loads((repo / c.eval_file).read_text())
    out[name] = {s: t.build_prompt(s, name, description, t.extract_metadata(repo / c.skill_file), rows) for s in t.VALID_SOURCES}
print(json.dumps(out))`);
  assert.deepEqual(Object.keys(prompts).sort(), skills);
  for (const [skill, bySource] of Object.entries(prompts)) {
    const expected = fixture(skill).map((row, i) => `${i + 1}. ${row.query}`).join('\n');
    for (const [source, prompt] of Object.entries(bySource)) {
      assert.equal(prompt.slice(prompt.indexOf('Queries:\n') + 9).trimEnd(), expected, `${skill}/${source}`);
      assert.doesNotMatch(prompt, /mode=|boundary_with|implicit invocation/i, `${skill}/${source}`);
    }
  }
});

test('answers are matched to queries by id, and a skipped, repeated or unknown id fails', () => {
  const outcomes = python(`
import trigger_eval_common as t
def attempt(items, n=3):
    try:
        return t.predictions_from_payload({"predictions": items}, n)
    except ValueError as e:
        return str(e)
item = lambda i, v: {"id": i, "trigger": v}
print(json.dumps({
  "shuffled": attempt([item(3, True), item(1, False), item(2, True)]),
  "repeated": attempt([item(1, True), item(1, False), item(3, True)]),
  "skipped": attempt([item(1, True), item(3, True)]),
  "unknown": attempt([item(1, True), item(2, True), item(3, True), item(4, False)]),
  "bool id": attempt([item(True, True), item(2, True), item(3, True)]),
  "fenced": t.predictions_from_payload(t.find_predictions_object('ok {x}\\n\x60\x60\x60json\\n{"predictions":[{"id":1,"trigger":true}]}\\n\x60\x60\x60'), 1),
  "decoy": t.predictions_from_payload(t.find_predictions_object('Shape: {"predictions":[{"id":1,"trigger":true},...]}\\n{"predictions":[{"id":1,"trigger":false}]}'), 1),
}))`);
  assert.deepEqual(outcomes.shuffled, [false, true, true]);
  assert.match(outcomes.repeated, /answered twice/);
  assert.match(outcomes.skipped, /missing \[2\]/);
  assert.match(outcomes.unknown, /unknown \[4\]/);
  assert.match(outcomes['bool id'], /integer `id`/);
  assert.deepEqual(outcomes.fenced, [true]);
  assert.deepEqual(outcomes.decoy, [false], 'an object without `predictions` is not the answer');
});

test('Claude track runs isolated, maps answers by id and records the model that answered', () => {
  const box = sandbox();
  try {
    const run = box.run(['--track', 'claude', '--skill', 'datocms-plugin']);
    assert.equal(run.status, 0, run.stderr);
    const call = box.logged();
    assert.deepEqual(call.cwdEntries, [], 'classifier must start in an empty directory');
    assert.ok(!call.cwd.startsWith(repoRoot));
    assert.equal(call.mcp, 'false');
    for (const [flag, value] of [['--setting-sources', 'project'], ['--mcp-config', '{"mcpServers":{}}'], ['--disallowedTools', 'mcp__*'], ['--tools', '']])
      assert.equal(call.argv[call.argv.indexOf(flag) + 1], value, flag);
    assert.ok(call.argv.includes('--strict-mcp-config'));
    assert.ok(!call.argv.includes('--dangerously-skip-permissions'));
    const saved = box.result('datocms-plugin', 'claude');
    assert.equal(saved.model, 'fake-claude-model');
    assert.deepEqual(saved.results.map((r) => r.trigger_rate), fixture('datocms-plugin').map((_, i) => (i % 2 === 0 ? 1 : 0)));
  } finally {
    box.cleanup();
  }
});

test('a repeated answer id fails the run before any result is written', () => {
  const box = sandbox();
  try {
    const run = box.run(['--track', 'claude', '--skill', 'datocms-plugin'], { FAKE_MODE: 'duplicate' });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /answered twice/);
    assert.ok(!existsSync(join(box.dir, 'results/trigger/datocms-plugin')));
  } finally {
    box.cleanup();
  }
});

test('Codex track runs outside the repo with an empty HOME and a fresh CODEX_HOME holding only the login', () => {
  const box = sandbox();
  try {
    const unpinned = box.run(['--track', 'codex', '--skill', 'datocms-cda']);
    assert.equal(unpinned.status, 0, unpinned.stderr);
    const call = box.logged();
    assert.deepEqual(call.cwdEntries, []);
    assert.ok(!call.cwd.startsWith(repoRoot));
    assert.equal(call.cd, call.cwd);
    assert.deepEqual(call.codexHome, ['auth.json'], 'no user config, skills, plugins or MCP servers');
    assert.equal(call.auth, join(box.dir, 'codex-home/auth.json'));
    assert.deepEqual(call.homeEntries, [], 'no ~/.agents/skills');
    assert.ok(!call.home.startsWith(repoRoot) && call.home !== process.env.HOME);
    assert.deepEqual(call.schema.properties.predictions.items.required, ['id', 'trigger']);
    assert.equal(box.result('datocms-cda', 'codex').model, null, 'an unpinned Codex model is unknown');
    assert.deepEqual(box.result('datocms-cda', 'codex').results.map((r) => r.trigger_rate), fixture('datocms-cda').map((_, i) => (i % 2 === 0 ? 1 : 0)));

    // A relative CODEX_HOME still links the real login.
    const pinned = box.run(['--track', 'codex', '--skill', 'datocms-cda', '--model', 'pinned-model'], { CODEX_HOME: 'codex-home' }, box.dir);
    assert.equal(pinned.status, 0, pinned.stderr);
    assert.equal(box.logged().auth, join(box.dir, 'codex-home/auth.json'));
    assert.equal(box.result('datocms-cda', 'codex').model, 'pinned-model');
  } finally {
    box.cleanup();
  }
});

test('a stalled classifier times out and takes its child processes down with it', () => {
  const box = sandbox();
  try {
    const run = spawnSync('python3', ['-c', `import sys\nsys.path.insert(0, ${JSON.stringify(scripts)})\nimport run_trigger_eval as r\nr.TIMEOUT_SECONDS = 1\ntry:\n    r._run_codex_predictions("1. q", 1, None)\nexcept RuntimeError as e:\n    print(str(e).splitlines()[0])`], { env: { ...box.env, FAKE_MODE: 'stall' }, encoding: 'utf8', timeout: 20000 });
    assert.equal(run.stdout.trim(), 'codex exec timed out', run.stderr);
    const child = Number(readFileSync(`${box.env.FAKE_LOG}.child`, 'utf8'));
    assert.throws(() => process.kill(child, 0), /ESRCH/, 'the classifier child outlived the timeout');
  } finally {
    box.cleanup();
  }
});

test('the summary gate needs results for every skill and flags stale descriptions and mixed models', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'trigger-summary-')));
  try {
    // Perfect answers for every skill, written by the real result writer.
    python(`
import trigger_eval_common as t
repo = pathlib.Path(${JSON.stringify(repoRoot)})
for c in t.discover_eval_configs(repo):
    labels = [bool(r["should_trigger"]) for r in json.loads((repo / c.eval_file).read_text())]
    for source in ("frontmatter", "combined"):
        t.evaluate_skill(repo, c, pathlib.Path(${JSON.stringify(dir)}), "claude", None, source, lambda p, n, m, labels=labels: (labels, "stub-model"))
print("null")`);
    const analyze = (source = 'frontmatter') =>
      spawnSync('python3', [join(scripts, 'analyze_trigger_results.py'), '--repo-root', repoRoot, '--results-dir', join(dir, 'trigger'), '--track', 'claude', '--source', source, '--no-write', '--fail-on-gate'], { encoding: 'utf8' });
    const complete = analyze();
    assert.equal(complete.status, 0, complete.stdout + complete.stderr);
    assert.match(complete.stdout, new RegExp(`PASS — ${skills.length}/${skills.length} skills`));
    assert.match(complete.stdout, /Models: `stub-model`/);
    assert.doesNotMatch(complete.stdout, /## Warnings/);

    rmSync(join(dir, 'trigger/datocms-cda'), { recursive: true });
    const edited = join(dir, 'trigger/datocms-plugin/claude/frontmatter/results.json');
    const saved = JSON.parse(readFileSync(edited, 'utf8'));
    writeFileSync(edited, JSON.stringify({ ...saved, routing_surface: { description: 'An older description.' }, model: 'other-model' }));
    const partial = analyze();
    assert.equal(partial.status, 1, 'a missing skill fails the gate');
    assert.match(partial.stdout, new RegExp(`FAIL — 0/${skills.length} skills below F1 90\\.0%, 1/${skills.length} without results`));
    assert.match(partial.stdout, /No results for: `datocms-cda`/);
    assert.match(partial.stdout, /different models/);
    assert.match(partial.stdout, /changed after these results were produced: `datocms-plugin`\./);

    // The combined prompt also shows the Codex metadata, so a metadata-only edit makes its results stale.
    const combined = join(dir, 'trigger/datocms-cma/claude/combined/results.json');
    const before = JSON.parse(readFileSync(combined, 'utf8'));
    assert.deepEqual(Object.keys(before.routing_surface), ['description', 'display_name', 'short_description', 'default_prompt']);
    writeFileSync(combined, JSON.stringify({ ...before, routing_surface: { ...before.routing_surface, default_prompt: 'An older prompt.' } }));
    assert.match(analyze('combined').stdout, /changed after these results were produced: `datocms-cma`\./);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
