// Stand-in sessions exercise routing reports without model calls.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const repoRoot = resolve(import.meta.dirname, '../..');
function probe(rows, check, extra = []) {
  const root = mkdtempSync(join(tmpdir(), 'codex-routing-'));
  try {
    const binary = join(root, 'codex'), output = join(root, 'out');
    writeFileSync(binary, `#!${process.execPath}
if (process.argv.includes('--version')) { console.log('fixture-runtime'); process.exit(0); }
const fs = require('node:fs');
let prompt = '';
process.stdin.on('data', d => { prompt += d; }).on('end', () => {
  if (/CRASH/.test(prompt)) process.exit(7);
  if (/USAGE_LIMIT/.test(prompt)) {
    console.log(JSON.stringify({type:'turn.failed',error:{message:'usage_limit_reached'}}));
    setInterval(()=>{},1000); return;
  }
  if (/CAPPED/.test(prompt)) {
    for (const [id,command] of [['one','cat .agents/skills/datocms-cda/SKILL.md'],['two','over budget']]) console.log(JSON.stringify({type:'item.started',item:{id,type:'command_execution',command}}));
    setInterval(()=>{},1000); return;
  }
  if (/INCREMENTAL/.test(prompt)) {
    const path = ${JSON.stringify(join(output, 'results.json'))};
    if (!fs.existsSync(path) || JSON.parse(fs.readFileSync(path, 'utf8')).results.length !== 1) process.exit(8);
  }
  const read = /COREAD/.test(prompt) ? 'cat .agents/skills/datocms-cda/SKILL.md .agents/skills/datocms-cli/SKILL.md'
    : /GraphQL/.test(prompt) ? 'cat .agents/skills/datocms-cda/SKILL.md'
    : /MIGRATION/.test(prompt) ? 'sed -n 1,40p .agents/skills/datocms-cli/references/creating-migrations.md' : null;
  if (read) console.log(JSON.stringify({type:'item.completed',item:{id:'c1',type:'command_execution',command:read,exit_code:0}}));
  console.log(JSON.stringify({type:'item.completed',item:{id:'m1',type:'agent_message',text:'Done.'}}));
  console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:1}}));
});
`, { mode: 0o700 });
    writeFileSync(join(root, 'auth.json'), '{}');
    const fixture = join(root, 'fixture.json');
    writeFileSync(fixture, JSON.stringify(rows));
    const run = spawnSync(process.execPath, [join(repoRoot, 'dev/e2e/routing/codex.mjs'), '--skill', 'datocms-cda', '--fixture', fixture, '--output', output, '--jobs', '2', ...extra], {
      env: { ...process.env, CODEX_BIN: binary, CODEX_HOME: root }, encoding: 'utf8', timeout: 60000,
    });
    check({ run, output, report: existsSync(join(output, 'results.json')) ? JSON.parse(readFileSync(join(output, 'results.json'), 'utf8')) : undefined });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('routing probe preserves opening scores and reports full fixture indexes and loaded skills', () => {
  probe([
    { query: 'Use datocms-cda to fetch posts', should_trigger: true, query_mode: 'explicit' },
    { query: 'Fetch the latest posts with GraphQL', should_trigger: true, query_mode: 'implicit' },
    { query: 'Explain why pages are slow', should_trigger: true, query_mode: 'implicit' },
    { query: 'Write a MIGRATION adding a field', should_trigger: false, query_mode: 'overlap', boundary_with: ['datocms-cli'] },
    { query: 'A GraphQL question another skill owns', should_trigger: false, query_mode: 'overlap', boundary_with: ['datocms-cli'] },
  ], ({ run, output, report }) => {
    assert.equal(run.status, 0, run.stderr);
    const { summary, results } = report;
    assert.deepEqual(results.map(r => r.opened), [['datocms-cda'], [], ['datocms-cli'], ['datocms-cda']], 'explicit rows are excluded by default');
    assert.deepEqual({ tp: summary.tp, fp: summary.fp, fn: summary.fn, tn: summary.tn, noSkillOpened: summary.noSkillOpened }, { tp: 1, fp: 1, fn: 1, tn: 1, noSkillOpened: 1 });
    assert.deepEqual(results.map(r => r.fixtureIndex), [2, 3, 4, 5]);
    assert.deepEqual(results.map(r => r.loaded), [['datocms-cda'], [], [], ['datocms-cda']]);
    assert.equal(results[2].depth['datocms-cli'], 1);
    assert.equal(summary.model, 'gpt-6-luna');
    assert.ok(existsSync(join(output, '1/session.json')), 'filtered row folders keep their existing numbering');
  });
});

test('routing probe retains successful rows and records a failed native session', () => {
  probe([
    { query: 'GraphQL before failure', should_trigger: true },
    { query: 'CRASH without events', should_trigger: true },
    { query: 'Unrelated request after failure', should_trigger: false },
  ], ({ run, report }) => {
    assert.equal(run.status, 0, run.stderr);
    assert.equal(report.results.length, 3);
    assert.equal(typeof report.results[1].error, 'string');
    assert.match(report.results[1].error, /7|exit|failed/i);
    assert.equal(report.results[0].correct, true);
    assert.equal(report.results[2].correct, true);
    assert.equal(report.summary.queries, 2, 'unscored failures do not become routing misses');
    assert.equal(report.summary.errors, 1);
    assert.equal(report.summary.attempted, 3);
    assert.equal(report.summary.total, 3);
  });
});

test('routing probe persists each result before starting the next queued row', () => {
  probe([
    { query: 'First GraphQL request', should_trigger: true },
    { query: 'INCREMENTAL GraphQL request', should_trigger: true },
  ], ({ run, report }) => {
    assert.equal(run.status, 0, run.stderr);
    assert.equal(report.summary.errors, 0);
    assert.equal(report.summary.tp, 2);
    assert.ok(report.results.every(row => !row.error));
  }, ['--jobs', '1']);
});

test('routing co-reads remain false positives while reporting their boundary owner', () => {
  probe([{ query: 'COREAD this overlap', should_trigger: false, query_mode: 'overlap', boundary_with: ['datocms-cli'] }], ({ run, report }) => {
    assert.equal(run.status, 0, run.stderr);
    assert.equal(report.summary.fp, 1);
    assert.equal(report.summary.fpCoRead, 1);
    assert.equal(report.results[0].coRead, true);
    assert.equal(report.results[0].depth['datocms-cda'], 0);
    assert.deepEqual(report.results[0].loaded, ['datocms-cda', 'datocms-cli']);
  });
});

test('routing probe passes an explicit comparison model without changing effort', () => {
  probe([{ query: 'GraphQL comparison', should_trigger: true }], ({ run, output, report }) => {
    assert.equal(run.status, 0, run.stderr);
    assert.equal(report.summary.model, 'gpt-6-sol');
    assert.equal(report.summary.reasoningEffort, 'medium');
    const session = JSON.parse(readFileSync(join(output, '1/session.json'), 'utf8'));
    assert.equal(session.model, 'gpt-6-sol');
    assert.equal(session.reasoningEffort, 'medium');
  }, ['--model', 'gpt-6-sol']);
});

test('routing keeps early skill evidence from deliberately capped sessions', () => {
  probe([{ query: 'CAPPED early route', should_trigger: true }], ({ run, report }) => {
    assert.equal(run.status, 0, run.stderr);
    assert.equal(report.summary.errors, 0);
    assert.equal(report.summary.tp, 1);
    assert.equal(report.results[0].correct, true);
  }, ['--max-commands', '1']);
});

test('routing usage exhaustion preserves partial results and stops new rows', () => {
  probe([
    { query: 'GraphQL before quota', should_trigger: true },
    { query: 'USAGE_LIMIT', should_trigger: true },
    { query: 'GraphQL must not start', should_trigger: true },
  ], ({ run, output, report }) => {
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /Usage limit reached/);
    assert.equal(report.results.length, 2);
    assert.equal(report.results[0].correct, true);
    assert.match(report.results[1].error, /usage limit/i);
    assert.equal(report.summary.queries, 1);
    assert.equal(report.summary.errors, 1);
    assert.equal(report.summary.total, 3);
    assert.equal(existsSync(join(output, '3/session.json')), false);
  }, ['--jobs', '1']);
});
