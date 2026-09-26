#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { build } from 'esbuild';
import { runOne } from './run.mjs';
import { BASE_REVISION } from './cases.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
export const authoringCase = {
  id: 'existing-client-and-types', cli: true, remote: true, route: 'none', operation: 'code-only',
  task: 'Write an exported async getArticleTitle(id: string): Promise<string | null> helper for src/article-title.ts in this repository’s server-side application. It should read one article and return its title. Follow the project’s existing conventions. Return the complete module in one TypeScript code block; do not execute CMS operations or change files, dependencies, credentials, or configuration. Existing project files: package.json, src/cms.ts, src/generated/project.ts.',
  files: {
    'package.json': JSON.stringify({ private: true, type: 'module', dependencies: { '@datocms/cma-client': '6.1.3' }, devDependencies: { datocms: '4.0.26' }, scripts: { 'generate:cms': 'datocms schema:generate src/generated/project.ts --environment sandbox' } }),
    'src/cms.ts': 'import { buildClient } from "@datocms/cma-client";\nexport const cms = buildClient({ apiToken: process.env.EDITOR_CMA_KEY!, environment: "sandbox", extraHeaders: { "X-Workflow": "existing-app" } });\n',
    // Deliberately small synthetic project type; this fixture tests reuse, not SDK schema generation.
    'src/generated/project.ts': 'export type Article = { id: string; title: string | null; readonly __model: "article" };\n',
  },
};

export async function verifyAuthoring(row) {
  const failures = [...row.failures];
  const sources = [...row.finalText.matchAll(/```(?:ts|typescript)\s*\n([\s\S]*?)```/g)];
  if (sources.length !== 1) return { passed: false, failures: [...failures, 'Expected one complete TypeScript module'] };
  const source = sources[0][1];
  const tree = ts.createSourceFile('article-title.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const imports = tree.statements.filter(ts.isImportDeclaration).map((node) => node.moduleSpecifier.text.replace(/\.(?:js|ts)$/, ''));
  if (!imports.includes('./cms') || !imports.includes('./generated/project')) failures.push('Did not reuse both the existing client and generated model module');
  function visit(node) {
    if ([ts.SyntaxKind.AnyKeyword, ts.SyntaxKind.UnknownKeyword, ts.SyntaxKind.AsExpression].includes(node.kind)) failures.push('Used a type escape instead of the existing concrete model');
    ts.forEachChild(node, visit);
  }
  visit(tree);
  for (const path of ['src/cms.ts', 'src/generated/project.ts']) if (!row.referenceReads.some((entry) => entry.path === path)) failures.push(`Did not inspect existing project file: ${path}`);
  if (row.calls.some((call) => call.name === 'write_file' || call.name.startsWith('upsert_and_execute_'))) failures.push('Attempted execution or file changes in a code-only task');
  if (row.calls.some((call) => call.name === 'exec_command' && /(?:schema:generate|\binstall\b|\blogin\b|\blink\b|cma:call|cma:script)/.test(call.args.cmd))) failures.push('Introduced setup, type generation, or live execution');
  const directory = mkdtempSync(join(tmpdir(), 'datocms-authoring-check-'));
  try {
    for (const [path, contents] of Object.entries(authoringCase.files)) {
      const target = join(directory, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, contents);
    }
    const artifact = join(directory, 'src/article-title.ts'); writeFileSync(artifact, source);
    const declarations = join(directory, 'fixture.d.ts');
    writeFileSync(declarations, 'declare const process: {env: Record<string,string|undefined>}; declare module "@datocms/cma-client" { export function buildClient(options:{apiToken:string;environment:string;extraHeaders:Record<string,string>}):{items:{find<D>(id:string):Promise<D>}}; }');
    const program = ts.createProgram([artifact, declarations], { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, allowImportingTsExtensions: true, types: [] });
    failures.push(...ts.getPreEmitDiagnostics(program).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')));
    const compiled = await build({ stdin: { contents: source, loader: 'ts', resolveDir: join(directory, 'src') }, bundle: true, write: false, format: 'cjs', platform: 'neutral', logLevel: 'silent', plugins: [{ name: 'existing-project-client', setup(builder) {
      builder.onResolve({ filter: /.*/ }, (args) => {
        if (/^\.\/cms(?:\.[jt]s)?$/.test(args.path)) return { path: 'cms', namespace: 'fixture' };
        return { errors: [{ text: `Unexpected runtime dependency: ${args.path}` }] };
      });
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ loader: 'js', contents: 'export const cms={items:{find:async(id)=>{globalThis.calls.push(id);return {id,title:id==="empty"?null:`Title ${id}`}}}};' }));
    } }] });
    const context = vm.createContext({});
    vm.runInContext('globalThis.calls=[];globalThis.module={exports:{}};globalThis.exports=module.exports;', context);
    vm.runInContext(compiled.outputFiles[0].text, context, { timeout: 1000 });
    for (const [id, expected] of [['one', 'Title one'], ['empty', null]]) {
      const result = vm.runInContext(`module.exports.getArticleTitle(${JSON.stringify(id)})`, context, { timeout: 1000 });
      let timer;
      const value = await Promise.race([result, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Helper timed out')), 1000); })]).finally(() => clearTimeout(timer));
      if (value !== expected) failures.push(`Wrong helper result for ${id}`);
    }
    if (JSON.stringify(context.calls) !== JSON.stringify(['one', 'empty'])) failures.push('Helper did not read exactly the requested records through the existing client');
  } catch (error) { failures.push(String(error)); }
  finally { rmSync(directory, { recursive: true, force: true }); }
  return { passed: failures.length === 0, failures, source };
}

async function main() {
  const output = resolve(process.argv[2] ?? `local/coexistence/authoring-${Date.now()}`);
  if (existsSync(join(output, 'run.json'))) throw Error('Use a new output directory; retained observations must not be overwritten');
  mkdirSync(output, { recursive: true });
  const model = process.env.EVAL_MODEL;
  if (!model) throw Error('Set EVAL_MODEL explicitly to the same recorded model used in the comparison');
  const binary = process.env.CODEX_BIN ?? 'codex';
  const candidateRevision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const settings = { model, effort: process.env.EVAL_EFFORT, candidateRevision,
    fixtureSourceSha256: digest(['authoring.mjs', 'run.mjs', 'server.mjs', 'runtime.mjs', 'cases.mjs'].map((path) => readFileSync(new URL(path, import.meta.url))).join('\n')),
    dependencyLockSha256: digest(readFileSync(new URL('../../package-lock.json', import.meta.url))) };
  writeFileSync(join(output, 'run.json'), JSON.stringify({ ...settings, baseline: BASE_REVISION, binaryVersion: execFileSync(binary, ['--version'], { encoding: 'utf8' }).trim(), createdAt: new Date().toISOString() }, null, 2));
  const results = [];
  for (const arm of ['base', 'candidate']) {
    await Promise.all([1, 2, 3].map(async (repetition) => {
      const row = await runOne({ testCase: authoringCase, arm, repetition, settings, output, baseline: BASE_REVISION, binary, timeout: 300 });
      const authoring = await verifyAuthoring(row); const result = { ...row, authoring };
      results.push(result); writeFileSync(join(output, 'results.json'), JSON.stringify(results, null, 2));
      console.log(`${authoring.passed ? 'PASS' : 'FAIL'} ${arm}/${repetition}: ${authoring.failures.join('; ')}`);
    }));
  }
  if (results.some((row) => !row.authoring.passed)) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { console.error(error); process.exitCode = 1; });
