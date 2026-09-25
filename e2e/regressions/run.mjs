import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { nativeSession, MODEL, EFFORT } from '../lib/nativeSession.ts';

const root = resolve(import.meta.dirname, '../..');
const { values } = parseArgs({
  options: {
    output: { type: 'string' },
    'skills-root': { type: 'string', default: root },
    cases: { type: 'string' },
    repetitions: { type: 'string', default: '1' },
    recheck: { type: 'string' },
    controls: { type: 'boolean', default: false },
  },
});
const repetitions = Number(values.repetitions);
assert.ok(Number.isInteger(repetitions) && repetitions > 0, 'repetitions must be a positive integer');
const output = resolve(values.output ?? join(root, 'local/regressions', new Date().toISOString().replace(/[:.]/g, '-')));
assert.ok(!existsSync(output), 'Preserve evidence: choose a fresh --output');
mkdirSync(output, { recursive: true });

const casesDir = join(import.meta.dirname, 'cases');
const all = [];
for (const file of readdirSync(casesDir).filter((f) => f.endsWith('.mjs')).sort())
  all.push(...(await import(pathToFileURL(join(casesDir, file)).href)).default);
assert.equal(new Set(all.map((c) => c.id)).size, all.length, 'Duplicate case id');
const requested = values.cases?.split(',');
const unknown = requested?.filter((id) => !all.some((c) => c.id === id)) ?? [];
assert.deepEqual(unknown, [], `Unknown cases: ${unknown.join(',')}`);
const selected = all.filter((c) => !requested || requested.includes(c.id));

const save = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
};
const results = [];
const record = (result) => {
  results.push(result);
  save(join(output, 'results.json'), results);
  console.log(JSON.stringify({ case: result.case, variant: result.variant ?? result.repetition, passed: result.passed, error: result.error }));
};

if (values.controls) {
  // Model-free oracle validation: a correct reference must pass and every
  // reproduction of the previously documented wrong fact must fail.
  for (const c of selected) {
    assert.ok(c.controls?.pass && c.controls.fail?.length, `${c.id} needs pass and fail controls`);
    for (const [variant, control, expectPass] of [['pass', c.controls.pass, true], ...c.controls.fail.map((f) => [`fail-${f.name}`, f, false])]) {
      const directory = join(output, c.id, variant), workspace = join(directory, 'workspace');
      mkdirSync(workspace, { recursive: true });
      const result = { case: c.id, variant, expected: expectPass ? 'pass' : 'fail', passed: false };
      let observedPass = false, reason;
      try {
        const ctx = { root, directory, workspace };
        await c.setup?.(workspace, ctx);
        for (const [path, content] of Object.entries(control.files ?? {})) save(join(workspace, path), content);
        result.evidence = await c.check(workspace, { ...ctx, session: { finalText: control.finalText ?? '', commands: [] } });
        observedPass = true;
      } catch (error) { reason = String(error?.stack ?? error); }
      result.passed = observedPass === expectPass;
      if (!result.passed) result.error = expectPass ? `Correct control rejected: ${reason}` : 'Wrong-fact control was accepted';
      else if (!expectPass) result.rejectedWith = reason.split('\n')[0];
      save(join(directory, 'result.json'), result);
      record(result);
    }
  }
} else {
  suite: for (let repetition = 1; repetition <= repetitions; repetition++)
    for (const c of selected) {
      const directory = join(output, `${c.id}-${repetition}`);
      const workspace = values.recheck ? join(resolve(values.recheck), `${c.id}-${repetition}`, 'workspace') : join(directory, 'workspace');
      mkdirSync(workspace, { recursive: true });
      const result = { case: c.id, repetition, model: MODEL, reasoningEffort: EFFORT, skillsRoot: resolve(values['skills-root']), guards: c.guards, passed: false };
      let session;
      try {
        const ctx = { root, directory, workspace };
        if (!values.recheck) {
          const prepared = (await c.setup?.(workspace, ctx)) ?? {};
          const started = Date.now();
          session = await nativeSession({
            repoRoot: resolve(values['skills-root']), workspace, output: directory, prompt: c.prompt,
            environment: prepared.environment, secrets: prepared.secrets,
            timeoutMs: c.budget?.timeoutMs ?? 360000, maxCommands: c.budget?.maxCommands ?? 80,
          });
          Object.assign(result, { elapsedMs: Date.now() - started, usage: session.usage, commandCount: session.commands.length, finalText: session.finalText });
          result.skillReads = [...new Set(session.commands.flatMap((cmd) => [...cmd.command.matchAll(/skills\/(datocms-[\w-]+(?:\/[\w./-]+)?)/g)].map((m) => m[1])))].sort();
          if (session.usageLimitReached) { result.error = 'Usage limit reached'; record(result); process.exitCode = 2; break suite; }
          assert.ok(session.completed && session.exitCode === 0 && !session.errors.length && !session.timedOut && !session.capped && !session.credentialLeak, 'Actor did not complete cleanly');
        } else {
          session = JSON.parse(readFileSync(join(resolve(values.recheck), `${c.id}-${repetition}`, 'session.json'), 'utf8'));
          assert.equal(session.model, MODEL, 'Recheck must use the original model');
          assert.equal(session.reasoningEffort, EFFORT);
          result.recheckedFrom = resolve(values.recheck);
        }
        result.evidence = await c.check(workspace, { ...ctx, session });
        result.passed = true;
      } catch (error) { result.error = String(error?.stack ?? error); }
      save(join(directory, 'result.json'), result);
      record(result);
    }
}
if (!process.exitCode && results.some((r) => !r.passed)) process.exitCode = 1;
