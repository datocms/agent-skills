// Which skills did the live cases load? Reads the session.json of every case in one or more finished live runs
// (local/e2e/<run>) and compares the skills loaded with live-expected.json: `load` must all be loaded, at least one of
// `oneOf` must be (a schema change belongs to the CMA skill when made directly and to the CLI skill as a migration),
// `allow` may be, anything else is a wrong load. No model runs here.
//   node dev/e2e/routing/live-loads.mjs local/e2e/<run> [local/e2e/<run> …]
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const expected = JSON.parse(readFileSync(join(import.meta.dirname, 'live-expected.json'), 'utf8'));
let failed = false;
for (const run of process.argv.slice(2)) {
  const dir = resolve(run);
  const rows = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name, 'session.json');
    if (!existsSync(path)) continue;
    const session = JSON.parse(readFileSync(path, 'utf8'));
    const loaded = [...new Set((session.skillReads ?? []).filter((r) => r.endsWith('/SKILL.md')).map((r) => r.split('/').at(-2).replace('datocms-', '')))];
    const { load = [], oneOf = [], allow = [] } = expected.cases[name] ?? expected.default;
    const missing = load.filter((s) => !loaded.includes(s));
    if (oneOf.length && !oneOf.some((s) => loaded.includes(s))) missing.push(oneOf.join('|'));
    const extra = loaded.filter((s) => !load.includes(s) && !oneOf.includes(s) && !allow.includes(s));
    rows.push({ name, model: session.model, loaded, missing, extra });
  }
  const wrong = rows.filter((r) => r.missing.length || r.extra.length);
  failed ||= wrong.length > 0;
  console.log(`${run} (${rows[0]?.model ?? 'no cases'}): ${rows.length - wrong.length}/${rows.length} cases loaded the expected skills`);
  for (const r of wrong) console.log(`  ${r.name}: loaded ${r.loaded.join('+') || '-'}${r.missing.length ? `, missing ${r.missing.join('+')}` : ''}${r.extra.length ? `, extra ${r.extra.join('+')}` : ''}`);
}
process.exitCode = failed ? 1 : 0;
