import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { nativeSession, sourceHashes, MODEL, EFFORT } from '../lib/nativeSession.ts';
import { cases } from './cases.mjs';
import { checkCli, checkLinks, checkDocument, checkCounter, checkNotice, productionBuild } from './checks.mjs';

const root = resolve(import.meta.dirname, '../..');
const { values } = parseArgs({ options: { 'skills-root': { type: 'string' }, fixtures: { type: 'string' }, dependencies: { type: 'string' }, output: { type: 'string' }, cases: { type: 'string', default: cases.map(c => c.id).join(',') }, recheck: { type: 'string' }, model: { type: 'string', default: MODEL } } });
if (!values['skills-root'] || !values.fixtures || !values.output) throw Error('Specify --skills-root, --fixtures and a fresh --output');
if (![MODEL, 'gpt-5.6-sol'].includes(values.model)) throw Error('Choose gpt-5.6-luna or gpt-5.6-sol');
const output = resolve(values.output), fixtures = resolve(values.fixtures);
if (existsSync(output)) throw Error('Preserve evidence: choose a fresh output');
mkdirSync(output, { recursive: true });
const dependencies = values.dependencies ? resolve(values.dependencies) : join(fixtures, 'vite-dependencies');
const selected = values.cases.split(',').map(id => { const c = cases.find(c => c.id === id); if (!c) throw Error(`Unknown case ${id}`); return c; });
if (values.model !== MODEL && selected.some(c => c.check === 'preview')) throw Error('The preview replay currently verifies the default model only');
const save = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value, null, 2)); };
const results = [];
for (const c of selected) {
  const directory = join(output, c.id);
  const workspace = values.recheck ? join(resolve(values.recheck), c.id, 'workspace') : join(directory, 'workspace');
  mkdirSync(directory, { recursive: true });
  const result = { case: c.id, model: values.model, reasoningEffort: EFFORT, passed: false, rubric: c.rubric };
  let session;
  try {
    if (!values.recheck) {
      mkdirSync(workspace, { recursive: true });
      if (c.fixture === 'utility') {
        save(join(workspace, 'package.json'), { private: true, type: 'module', packageManager: 'pnpm@10.11.0', devDependencies: { datocms: '4.2.0', typescript: '5.9.3', 'datocms-structured-text-utils': '6.0.1' } });
        symlinkSync(join(root, 'node_modules'), join(workspace, 'node_modules'));
      } else {
        cpSync(join(fixtures, c.fixture), workspace, { recursive: true });
        result.upstream = JSON.parse(readFileSync(join(workspace, 'UPSTREAM.json'), 'utf8'));
        // Verify downloaded source before applying explicitly recorded adaptations.
        const original = sourceHashes(directory, 'workspace');
        for (const [path, digest] of Object.entries(result.upstream.sha256)) assert.equal(original[`workspace/${path}`], digest);
        if (c.fixture === 'vite') {
          for (const file of ['package.json', 'package-lock.json']) cpSync(join(dependencies, file), join(workspace, file));
          symlinkSync(join(dependencies, 'node_modules'), join(workspace, 'node_modules'));
        } else {
          const pkg = JSON.parse(readFileSync(join(workspace, 'package.json'), 'utf8'));
          const pinned = JSON.parse(readFileSync(join(root, 'e2e/catalog/web-astro/package.json'), 'utf8'));
          save(join(workspace, 'package.json'), { ...pkg, dependencies: pinned.dependencies, devDependencies: pinned.devDependencies });
          save(join(directory, 'install.log'), execFileSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: workspace, encoding: 'utf8', timeout: 180000, maxBuffer: 20e6 }));
        }
      }
      for (const [path, content] of Object.entries(c.files ?? {})) save(join(workspace, path), content);
      const before = sourceHashes(directory, 'workspace');
      save(join(directory, 'fixture-hashes.json'), before);
      const started = Date.now();
      session = await nativeSession({ model: values.model, repoRoot: resolve(values['skills-root']), workspace, output: directory, prompt: c.prompt, timeoutMs: 600000 });
      result.elapsedMs = Date.now() - started;
      result.usage = session.usage;
      result.commandCount = session.commands.length;
      result.finalText = session.finalText;
      result.usageLimitReached = session.usageLimitReached;
      result.skillPathsMentionedInCommands = [...new Set(session.commands.flatMap(cmd => [...cmd.command.matchAll(/(?:\.agents\/)?skills\/(datocms-[\w-]+)(?:\/[\w./-]+)?/g)].map(m => m[0])))].sort();
      assert.ok(session.completed && session.exitCode === 0 && !session.errors.length && !session.timedOut && !session.capped && !session.credentialLeak, 'Actor did not complete cleanly');
      const after = sourceHashes(directory, 'workspace');
      const sourcePaths = new Set([...Object.keys(before), ...Object.keys(after)]);
      result.changedFiles = [...sourcePaths].filter(path => !/\/\.(?:agents|git)\//.test(path) && before[path] !== after[path]);
      if (['cli', 'review'].includes(c.check)) assert.deepEqual(result.changedFiles, [], 'Advice-only task modified files');
    } else {
      session = JSON.parse(readFileSync(join(resolve(values.recheck), c.id, 'session.json'), 'utf8'));
      assert.equal(session.model, values.model, 'Recheck must use the original model label');
      assert.equal(session.reasoningEffort, EFFORT);
      assert.ok(session.completed && session.exitCode === 0 && !session.errors.length && !session.timedOut && !session.capped);
      result.recheckedFrom = resolve(values.recheck);
    }
    if (c.check === 'cli') result.runtime = await checkCli(session.finalText);
    else if (c.check === 'document') result.runtime = await checkDocument(workspace, directory);
    else if (['links', 'counter', 'notice'].includes(c.check)) {
      productionBuild(workspace, directory);
      result.runtime = await ({ links: checkLinks, counter: checkCounter, notice: checkNotice }[c.check])(workspace);
    } else if (c.check === 'preview') {
      const replay = join(directory, 'production-replay');
      // Reuse the independent production-server oracle without another actor.
      // Its 20 HTTP requests exercise credentials, redirect handling and cookies.
      try {
        execFileSync(process.execPath, [join(root, 'e2e/frontend/run.mjs'), '--frameworks', 'astro', '--recheck', values.recheck ? resolve(values.recheck) : output, '--output', replay], { cwd: root, encoding: 'utf8', timeout: 240000, maxBuffer: 20e6 });
      } catch (error) { save(join(directory, 'replay.log'), `${error.stdout ?? ''}${error.stderr ?? ''}`); }
      const checked = JSON.parse(readFileSync(join(replay, 'results.json'), 'utf8'))[0];
      assert.ok(checked.passed, checked.error);
      result.runtime = { passed: true, assertions: checked.assertions };
    } else result.review = 'pending';
    // Advisory completion is not a quality pass; a human-readable review follows.
    result.passed = c.check === 'review' ? null : true;
  } catch (error) { result.error = String(error); }
  results.push(result);
  save(join(directory, 'result.json'), result);
  save(join(output, 'results.json'), results);
  console.log(JSON.stringify({ case: c.id, passed: result.passed, error: result.error, elapsedMs: result.elapsedMs }));
  if (session?.usageLimitReached) { process.exitCode = 2; break; }
}
if (!process.exitCode && results.some(r => r.passed === false)) process.exitCode = 1;
