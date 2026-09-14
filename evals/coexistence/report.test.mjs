import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guidanceMetrics, reportResults } from './report.mjs';
import { cases } from './cases.mjs';

test('guidance metrics include repeated file and tool deliveries but exclude project data files', () => {
  const read = { path: 'skills/datocms-cma/references/records.md', tokens: 20, sha256: 'same' };
  const metrics = guidanceMetrics({ referenceReads: [read, { path: 'package.json', tokens: 50 }], guidanceDeliveries: [read] });
  assert.equal(metrics.loadedGuidanceTokens, 40);
  assert.equal(metrics.repeatedReads, 1);
  assert.equal(metrics.repeatedTokens, 20);
  assert.equal(metrics.identicalRepeatTokens, 20);
});

test('filtered tool guidance counts as a repeated source without claiming byte-identical duplication', () => {
  const path = 'skills/datocms-cma/references/records.md';
  const metrics = guidanceMetrics({ referenceReads: [{ path, tokens: 20 }], guidanceDeliveries: [{ path, tokens: 18, sha256: 'filtered' }] });
  assert.equal(metrics.repeatedReads, 1);
  assert.equal(metrics.repeatedTokens, 18);
  assert.equal(metrics.identicalRepeatTokens, 0);
});

test('repeated-source totals follow the actual order of tool and file deliveries', () => {
  const path = 'skills/datocms-cma/references/records.md';
  const metrics = guidanceMetrics({ referenceReads: [{ path, tokens: 20, sequence: 9 }], guidanceDeliveries: [{ path, tokens: 18, sequence: 3 }] });
  assert.equal(metrics.repeatedTokens, 20);
  assert.equal(metrics.deliveries[0].via, 'tool');
});

test('missing repetitions cannot be reported as a passing comparison', () => {
  const report = reportResults([]);
  assert.equal(report.gatesPassed, false);
  assert.ok(report.failures.some((failure) => failure.startsWith('Missing comparison run:')));
});

test('CLI guidance inflation and MCP reference loading fail the context gate', () => {
  const row = { case: 'skills-only-cli', model: 'same-model', reasoningEffort: 'same-effort', repetition: 1,
    promptSha256: 'same-prompt', passed: true, failures: [], toolOutputTokens: 100, usage: null };
  const report = reportResults([
    { ...row, arm: 'base', referenceReads: [{ path: 'skills/datocms-cma/SKILL.md', tokens: 50 }] },
    { ...row, arm: 'candidate', referenceReads: [{ path: 'skills/datocms-cma/references/mcp.md', tokens: 60 }] },
  ]);
  assert.ok(report.failures.some((failure) => failure.startsWith('CLI loaded MCP reference:')));
  assert.ok(report.failures.some((failure) => failure.startsWith('CLI guidance exceeded baseline minimum:')));
});

test('MCP content work cannot load unrelated client construction guidance', () => {
  const report = reportResults([{ case: 'explicit-mcp', arm: 'candidate', repetition: 1,
    model: 'same-model', reasoningEffort: null, promptSha256: 'same', passed: true, failures: [], toolOutputTokens: 100,
    referenceReads: [{ path: 'skills/datocms-cma/references/client-setup-and-errors.md', tokens: 100 }] }]);
  assert.ok(report.failures.some((failure) => failure.startsWith('MCP loaded unrelated setup/migration/client guidance:')));
});

test('recovered script errors remain quality failures independently of required routing and scope gates', () => {
  const rows = cases.flatMap((testCase) => (testCase.arms ?? ['base', 'candidate', 'none']).flatMap((arm) =>
    Array.from({ length: 3 }, (_, index) => ({ case: testCase.id, arm, repetition: index + 1,
      model: 'same-model', reasoningEffort: 'same-effort', promptSha256: testCase.id,
      passed: true, failures: [], contentFailures: [], toolOutputTokens: 0 }))));
  const recovered = rows.find((row) => row.case === 'long-followup' && row.arm === 'candidate');
  recovered.passed = false;
  recovered.failures = ['Submitted script failed compilation or bounded execution'];
  recovered.contentFailures = [...recovered.failures];
  const report = reportResults(rows);
  assert.equal(report.contextGatesPassed, true);
  assert.equal(report.criticalGatesPassed, true);
  assert.equal(report.requiredGatesPassed, true);
  assert.equal(report.contentAndScriptGatesPassed, false);
  assert.equal(report.gatesPassed, false);
  assert.equal(report.arms.candidate.passed, 47);
});
