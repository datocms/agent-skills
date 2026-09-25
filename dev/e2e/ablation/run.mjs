import { mkdirSync, writeFileSync, readFileSync, existsSync, symlinkSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { nativeSession } from '../lib/nativeSession.ts';
import { cases } from './cases.mjs';

const root = resolve(import.meta.dirname, '../..');
const { values } = parseArgs({ options: { cases: { type: 'string' }, 'skills-root': { type: 'string' }, output: { type: 'string' } } });
if (!values.cases || !values['skills-root'] || !values.output) throw Error('Specify --cases, --skills-root and a fresh --output');
const selected = values.cases.split(',').map(id => {
  const c = cases.find(c => c.id === id);
  if (!c) throw Error(`Unknown case: ${id}`);
  return c;
});
const output = resolve(values.output);
if (existsSync(output)) throw Error('Preserve evidence: choose a fresh output directory');
mkdirSync(output, { recursive: true });
const results = [];
for (const c of selected) {
  const directory = join(output, c.id), workspace = join(directory, 'workspace');
  mkdirSync(workspace, { recursive: true });
  const files = { ...(c.files ?? {}) };
  if (c.fixture === 'react') {
    files['package.json'] = readFileSync(join(root, 'e2e/catalog/web/package.json'), 'utf8');
    files['tsconfig.json'] = JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['ES2022', 'DOM'], jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true, module: 'ESNext', moduleResolution: 'Bundler' }, include: ['ProductCard.tsx'] });
    symlinkSync(join(root, 'e2e/catalog/web/node_modules'), join(workspace, 'node_modules'));
  }
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(workspace, path)), { recursive: true });
    writeFileSync(join(workspace, path), text);
  }
  const started = Date.now();
  const session = await nativeSession({ repoRoot: resolve(values['skills-root']), workspace, output: directory, prompt: c.prompt, timeoutMs: 360000 });
  const result = {
    case: c.id, phase: c.phase, area: c.area, model: session.model, reasoningEffort: session.reasoningEffort,
    completed: session.completed && session.exitCode === 0 && !session.errors.length && !session.timedOut && !session.capped,
    usageLimitReached: session.usageLimitReached, elapsedMs: Date.now() - started,
    usage: session.usage, commandCount: session.commands.length,
    failedCommands: session.commands.filter(c => c.exit_code !== undefined && c.exit_code !== 0).length,
    finalText: session.finalText, rubric: c.rubric, review: 'pending',
  };
  if (c.fixture === 'react' && result.completed) {
    try {
      const { checkCard } = await import('./react-check.mjs');
      result.runtime = await checkCard(workspace, directory);
    } catch (error) { result.runtime = { passed: false, error: String(error) }; }
  }
  results.push(result);
  writeFileSync(join(directory, 'result.json'), JSON.stringify(result, null, 2));
  writeFileSync(join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ case: c.id, completed: result.completed, runtime: result.runtime, elapsedMs: result.elapsedMs, usage: result.usage }));
  if (session.usageLimitReached) { process.exitCode = 2; break; }
}
// Completion is not a quality pass. Advisory outcomes require transcript review.
