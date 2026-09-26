import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { nativeSession, MODEL, EFFORT, REPO_ROOT } from '../lib/nativeSession.ts';

const root = resolve(import.meta.dirname, '../..');
const { values } = parseArgs({
  options: {
    output: { type: 'string' },
    'skills-root': { type: 'string', default: REPO_ROOT },
    cases: { type: 'string' },
    repetitions: { type: 'string', default: '1' },
    recheck: { type: 'string' },
    controls: { type: 'boolean', default: false },
  },
});
const repetitions = Number(values.repetitions);
assert.ok(Number.isInteger(repetitions) && repetitions > 0, 'repetitions must be a positive integer');
const output = resolve(values.output ?? join(REPO_ROOT, 'local/regressions', new Date().toISOString().replace(/[:.]/g, '-')));
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
// Workspace state as { path: sha256 }. snapshots[0] is taken after setup, then one per turn,
// so multi-turn cases can check what each turn changed.
const snapshot = (dir, base = dir, out = {}) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['.git', '.agents', 'node_modules', '.next'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) snapshot(path, base, out);
    else if (entry.isFile()) out[relative(base, path)] = createHash('sha256').update(readFileSync(path)).digest('hex');
  }
  return out;
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
    // `pass` is one control or a list of acceptable variants.
    const passes = [].concat(c.controls.pass).map((p, i) => [i ? `pass-${p.name}` : 'pass', p, true]);
    for (const [variant, control, expectPass] of [...passes, ...c.controls.fail.map((f) => [`fail-${f.name}`, f, false])]) {
      const directory = join(output, c.id, variant), workspace = join(directory, 'workspace');
      mkdirSync(workspace, { recursive: true });
      const result = { case: c.id, variant, expected: expectPass ? 'pass' : 'fail', passed: false };
      let observedPass = false, reason;
      try {
        const ctx = { root, directory, workspace };
        await c.setup?.(workspace, ctx);
        // A control is one simulated turn ({ files, finalText }) or several ({ turns: [...] }).
        const turns = control.turns ?? [control];
        const snapshots = [snapshot(workspace)];
        for (const turn of turns) {
          for (const [path, content] of Object.entries(turn.files ?? {})) save(join(workspace, path), content);
          snapshots.push(snapshot(workspace));
        }
        const session = { finalText: turns.at(-1).finalText ?? '', turns: turns.map((t) => ({ finalText: t.finalText ?? '', messages: [t.finalText ?? ''], completed: true })), commands: turns.flatMap((t, turn) => (t.commands ?? []).map((c) => ({ turn, ...c }))) };
        result.evidence = await c.check(workspace, { ...ctx, session, snapshots });
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
        let snapshots;
        if (!values.recheck) {
          const prepared = (await c.setup?.(workspace, ctx)) ?? {};
          const started = Date.now();
          snapshots = [snapshot(workspace)];
          session = await nativeSession({
            repoRoot: resolve(values['skills-root']), workspace, output: directory, prompt: c.prompt, followUps: c.followUps,
            onTurnComplete: () => { snapshots.push(snapshot(workspace)); },
            environment: prepared.environment, secrets: prepared.secrets,
            timeoutMs: c.budget?.timeoutMs ?? 360000, maxCommands: c.budget?.maxCommands ?? 80,
          });
          save(join(directory, 'snapshots.json'), snapshots);
          Object.assign(result, { elapsedMs: Date.now() - started, usage: session.usage, commandCount: session.commands.length, finalText: session.finalText });
          result.skillReads = [...new Set(session.commands.flatMap((cmd) => [...cmd.command.matchAll(/skills\/(datocms-[\w-]+(?:\/[\w./-]+)?)/g)].map((m) => m[1])))].sort();
          if (session.usageLimitReached) { result.error = 'Usage limit reached'; record(result); process.exitCode = 2; break suite; }
          assert.ok(session.completed && session.exitCode === 0 && !session.errors.length && !session.timedOut && !session.capped && !session.credentialLeak, 'Actor did not complete cleanly');
          assert.ok(!session.oracleAccess.length, `Actor referenced evaluation state: ${session.oracleAccess.map((a) => a.command).join(' | ')}`);
        } else {
          session = JSON.parse(readFileSync(join(resolve(values.recheck), `${c.id}-${repetition}`, 'session.json'), 'utf8'));
          // Sessions recorded before per-turn messages existed: rebuild them from the transcript.
          if (session.turns?.some((t) => !t.messages)) {
            const events = readFileSync(join(resolve(values.recheck), `${c.id}-${repetition}`, 'native.jsonl'), 'utf8').split('\n').flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
            let turn = 0;
            for (const e of events) {
              if (e.type === 'item.completed' && e.item?.type === 'agent_message') (session.turns[turn].messages ??= []).push(String(e.item.text ?? ''));
              if (e.type === 'turn.completed' || e.type === 'turn.failed') turn = Math.min(turn + 1, session.turns.length - 1);
            }
          }
          const saved = join(resolve(values.recheck), `${c.id}-${repetition}`, 'snapshots.json');
          snapshots = existsSync(saved) ? JSON.parse(readFileSync(saved, 'utf8')) : undefined;
          assert.equal(session.model, MODEL, 'Recheck must use the original model');
          assert.equal(session.reasoningEffort, EFFORT);
          result.recheckedFrom = resolve(values.recheck);
        }
        result.evidence = await c.check(workspace, { ...ctx, session, snapshots });
        result.passed = true;
      } catch (error) { result.error = String(error?.stack ?? error); }
      save(join(directory, 'result.json'), result);
      record(result);
    }
}
if (!process.exitCode && results.some((r) => !r.passed)) process.exitCode = 1;
