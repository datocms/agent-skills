import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { parseArgs } from 'node:util';

const root = resolve(import.meta.dirname, '../..');
const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output) throw Error('Specify a fresh --output directory');
const output = resolve(values.output);
if (existsSync(output)) throw Error('Refusing to replace fixture evidence');
const sources = [
  ['vite', 'vitejs/vite', 'e9078f865cdff6bed77cd729214a7e2868f126b5', 'packages/create-vite/template-react-ts/'],
  ['astro', 'withastro/astro', 'db2eaf17ce84a5f75c5eab30f4ae15af32de1a13', 'examples/basics/'],
];
const api = path => JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', maxBuffer: 20e6 }));
for (const [name, repository, revision, directory] of sources) {
  const tree = api(`repos/${repository}/git/trees/${revision}?recursive=1`);
  if (tree.truncated) throw Error('Incomplete upstream tree');
  const sha256 = {};
  for (const entry of tree.tree) {
    if (entry.type !== 'blob' || !(entry.path.startsWith(directory) || entry.path === 'LICENSE')) continue;
    const path = entry.path.startsWith(directory) ? entry.path.slice(directory.length) : entry.path;
    if (path.startsWith('.vscode/') || path.startsWith('.codesandbox/')) continue;
    const blob = api(`repos/${repository}/git/blobs/${entry.sha}`);
    const content = Buffer.from(blob.content, 'base64');
    const target = join(output, name, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    sha256[path] = createHash('sha256').update(content).digest('hex');
  }
  writeFileSync(join(output, name, 'UPSTREAM.json'), JSON.stringify({ repository: `https://github.com/${repository}`, revision, directory, sha256 }, null, 2));
}
const dependencies = join(output, 'vite-dependencies');
mkdirSync(dependencies);
for (const file of ['package.json', 'package-lock.json']) copyFileSync(join(import.meta.dirname, 'vite', file), join(dependencies, file));
execFileSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: dependencies, stdio: 'inherit' });
// Other cases reuse existing, pinned harness dependencies. No live project is needed.
for (const path of ['node_modules', 'e2e/catalog/web-astro/node_modules', 'e2e/catalog/plugin/node_modules']) {
  if (!existsSync(join(root, path))) throw Error(`Install prerequisite ${path}`);
}
console.log(output);
