#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cases } from './cases.mjs';

const sum = (values) => values.reduce((total, value) => total + value, 0);
const range = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return { min: sorted[0], median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2, max: sorted.at(-1) };
};
const guidancePath = (path) => /(?:^|\/)(?:SKILL\.md|references\/|patterns\/)/.test(path);

export function guidanceMetrics(row) {
  const reads = (row.referenceReads ?? []).filter((read) => guidancePath(read.path));
  const supplied = row.guidanceDeliveries ?? [];
  const deliveries = [...reads.map((read) => ({ ...read, via: 'file' })), ...supplied.map((read) => ({ ...read, via: 'tool' }))];
  if (deliveries.every((read) => Number.isInteger(read.sequence))) deliveries.sort((a, b) => a.sequence - b.sequence);
  const seen = new Set();
  const hashes = new Set();
  let identicalRepeatTokens = 0;
  const repeated = deliveries.filter((read) => {
    const key = read.path;
    if (read.sha256) {
      if (hashes.has(read.sha256)) identicalRepeatTokens += read.tokens;
      hashes.add(read.sha256);
    }
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
  return { deliveries, repeatedReads: repeated.length, repeatedTokens: sum(repeated.map((read) => read.tokens)), identicalRepeatTokens,
    loadedGuidanceTokens: sum(deliveries.map((read) => read.tokens)),
    fileGuidanceTokens: sum(reads.map((read) => read.tokens)), toolGuidanceTokens: sum(supplied.map((read) => read.tokens)) };
}

export function reportResults(results, { repetitions = 3 } = {}) {
  const failures = [];
  const rows = results.map((row) => ({ ...row, guidance: guidanceMetrics(row) }));
  const expected = cases.flatMap((testCase) => (testCase.arms ?? ['base', 'candidate', 'none']).flatMap((arm) =>
    Array.from({ length: repetitions }, (_, index) => `${testCase.id}/${arm}/${index + 1}`)));
  const actual = rows.map((row) => `${row.case}/${row.arm}/${row.repetition}`);
  for (const key of expected) if (!actual.includes(key)) failures.push(`Missing comparison run: ${key}`);
  if (new Set(actual).size !== actual.length) failures.push('Duplicate comparison run identifiers');
  if (new Set(rows.map((row) => `${row.model}/${row.reasoningEffort}`)).size !== 1) failures.push('Comparison did not use one recorded model and effort');
  for (const testCase of cases) {
    const matching = rows.filter((row) => row.case === testCase.id);
    if (new Set(matching.map((row) => row.promptSha256)).size > 1) failures.push(`Nonidentical task prompts: ${testCase.id}`);
    for (const row of matching.filter((row) => row.arm === 'candidate')) {
      const paths = row.guidance.deliveries.map((read) => read.path);
      if (testCase.route === 'cli') {
        if (paths.some((path) => /references\/mcp\.md$/.test(path))) failures.push(`CLI loaded MCP reference: ${row.case}/${row.repetition}`);
        const base = matching.filter((entry) => entry.arm === 'base').map((entry) => entry.guidance.loadedGuidanceTokens);
        if (base.length && row.guidance.loadedGuidanceTokens > Math.min(...base)) failures.push(`CLI guidance exceeded baseline minimum: ${row.case}/${row.repetition}`);
      } else if (testCase.remote && testCase.operation !== 'migration') {
        const forbidden = paths.filter((path) => /datocms-cli\/(?:SKILL\.md|references\/(?:cli-setup|creating-migrations|running-migrations)\.md)|references\/(?:client-setup-and-errors|migration-patterns|type-generation)\.md|cli-bootstrap/.test(path));
        if (forbidden.length) failures.push(`MCP loaded unrelated setup/migration/client guidance: ${row.case}/${row.repetition}: ${forbidden.join(', ')}`);
      }
    }
  }
  const arms = Object.fromEntries(['base', 'candidate', 'none'].map((arm) => {
    const matching = rows.filter((row) => row.arm === arm);
    const qualityFailures = (row) => row.contentFailures ?? row.failures.filter((failure) => /Final record|Submitted script/.test(failure));
    // Include runner failures appended after scoring (timeouts, missing transcripts).
    const criticalFailures = (row) => row.failures.filter((failure) => !qualityFailures(row).includes(failure));
    const usageKeys = [...new Set(matching.flatMap((row) => Object.keys(row.usage ?? {})))];
    return [arm, {
      sessions: matching.length, passed: matching.filter((row) => row.passed).length,
      criticalPassed: matching.filter((row) => !criticalFailures(row).length).length,
      contentAndScriptPassed: matching.filter((row) => !qualityFailures(row).length).length,
      loadedGuidanceTokens: range(matching.map((row) => row.guidance.loadedGuidanceTokens)),
      repeatedGuidanceTokens: sum(matching.map((row) => row.guidance.repeatedTokens)),
      repeatedReads: sum(matching.map((row) => row.guidance.repeatedReads)),
      identicalRepeatTokens: sum(matching.map((row) => row.guidance.identicalRepeatTokens)),
      toolOutputTokens: range(matching.map((row) => row.toolOutputTokens)),
      usage: usageKeys.length ? Object.fromEntries(usageKeys.map((key) => [key, sum(matching.map((row) => row.usage?.[key] ?? 0))])) : null,
    }];
  }));
  const contextGatesPassed = failures.length === 0;
  const criticalGatesPassed = arms.candidate.sessions > 0 && arms.candidate.criticalPassed === arms.candidate.sessions;
  const contentAndScriptGatesPassed = arms.candidate.sessions > 0 && arms.candidate.contentAndScriptPassed === arms.candidate.sessions;
  return { synthetic: true, repetitions, model: rows[0]?.model, reasoningEffort: rows[0]?.reasoningEffort,
    contextGatesPassed, criticalGatesPassed, contentAndScriptGatesPassed,
    requiredGatesPassed: contextGatesPassed && criticalGatesPassed,
    gatesPassed: failures.length === 0 && rows.filter((row) => row.arm === 'candidate').every((row) => row.passed), failures, arms,
    runs: rows.map(({ case: caseId, arm, repetition, passed, failures, guidance, toolOutputTokens, usage }) =>
      ({ case: caseId, arm, repetition, passed, failures, ...guidance, toolOutputTokens, usage })) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) throw Error('Usage: node evals/coexistence/report.mjs <results.json> [report.json]');
  const report = reportResults(JSON.parse(readFileSync(file, 'utf8')));
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (process.argv[3]) writeFileSync(process.argv[3], output);
  process.stdout.write(`${JSON.stringify({ gatesPassed: report.gatesPassed, requiredGatesPassed: report.requiredGatesPassed,
    contextGatesPassed: report.contextGatesPassed, criticalGatesPassed: report.criticalGatesPassed,
    contentAndScriptGatesPassed: report.contentAndScriptGatesPassed, failures: report.failures, arms: report.arms }, null, 2)}\n`);
  if (!report.gatesPassed) process.exitCode = 1;
}
