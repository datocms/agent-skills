// Offline check for the Codex routing probe: a stand-in native binary opens a skill depending on the query, so
// the probe's scoring is exercised without model calls.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const repoRoot = resolve(import.meta.dirname, '../..');

test('Codex routing probe scores the skills a session opens, including sessions that open none', () => {
  const root = mkdtempSync(join(tmpdir(), 'codex-routing-'));
  try {
    const binary = join(root, 'codex');
    const event = (item) => JSON.stringify({ type: 'item.completed', item });
    writeFileSync(binary, `#!${process.execPath}
if (process.argv.includes('--version')) { console.log('fixture-runtime'); process.exit(0); }
let prompt = '';
process.stdin.on('data', (d) => { prompt += d; }).on('end', () => {
  const read = /GraphQL/.test(prompt) ? 'cat .agents/skills/datocms-cda/SKILL.md' : /MIGRATION/.test(prompt) ? 'sed -n 1,40p .agents/skills/datocms-cli/references/creating-migrations.md' : null;
  if (read) console.log(${JSON.stringify(event({ id: 'c1', type: 'command_execution', command: '__READ__', exit_code: 0 }))}.replace('__READ__', read));
  console.log(${JSON.stringify(event({ id: 'm1', type: 'agent_message', text: 'Done.' }))});
  console.log(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1 } }));
});
`, { mode: 0o700 });
    writeFileSync(join(root, 'auth.json'), '{}');
    const fixture = join(root, 'fixture.json');
    writeFileSync(fixture, JSON.stringify([
      { query: 'Fetch the latest posts with GraphQL', should_trigger: true, query_mode: 'implicit' },
      { query: 'Explain why pages are slow', should_trigger: true, query_mode: 'implicit' },
      { query: 'Write a MIGRATION adding a field', should_trigger: false, query_mode: 'overlap', boundary_with: ['datocms-cli'] },
      { query: 'A GraphQL question another skill owns', should_trigger: false, query_mode: 'overlap', boundary_with: ['datocms-cli'] },
      { query: 'Use datocms-cda to fetch posts', should_trigger: true, query_mode: 'explicit' },
    ]));
    const output = join(root, 'out');
    const run = spawnSync(process.execPath, [join(repoRoot, 'dev/e2e/routing/codex.mjs'), '--skill', 'datocms-cda', '--fixture', fixture, '--output', output, '--jobs', '2'], {
      env: { ...process.env, CODEX_BIN: binary, CODEX_HOME: root }, encoding: 'utf8', timeout: 60000,
    });
    assert.equal(run.status, 0, run.stderr);
    const { summary, results } = JSON.parse(readFileSync(join(output, 'results.json'), 'utf8'));
    assert.deepEqual(results.map((r) => r.opened), [['datocms-cda'], [], ['datocms-cli'], ['datocms-cda']], 'explicit rows are excluded by default');
    assert.deepEqual({ tp: summary.tp, fp: summary.fp, fn: summary.fn, tn: summary.tn, noSkillOpened: summary.noSkillOpened }, { tp: 1, fp: 1, fn: 1, tn: 1, noSkillOpened: 1 });
    assert.equal(summary.model, 'gpt-6-luna');
    assert.ok(existsSync(join(output, '1/session.json')), 'each query keeps its session evidence');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
