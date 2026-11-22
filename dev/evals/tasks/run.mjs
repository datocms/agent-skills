// Task evals: prepare a workspace for an agent, then check what it wrote.
//
//   node dev/evals/tasks/run.mjs prepare --case <id> --out <run dir>
//        [--arm skills|none] [--skills-root <dir with skills/>]
//   node dev/evals/tasks/run.mjs check --case <id> --out <run dir> [--solution <file.ts>]
//   node dev/evals/tasks/run.mjs controls
//
// `prepare` writes <run dir>/workspace (a TypeScript project with the project's
// generated `schema.ts`) and <run dir>/prompt.md. The agent writes
// workspace/solution.ts. `check` type-checks it, runs its default export
// against the emulated project and applies the case's assertions, writing
// <run dir>/result.json. `controls` runs every reference solution in
// dev/evals/tasks/solutions (must pass) and every wrong one in
// dev/evals/tasks/controls (must fail), with no model involved.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateSchemaTypes } from '@datocms/cma-schema-types-generator';
import { build } from 'esbuild';
import { skillListing } from '../knowledge/prompt.mjs';
import { cases } from './cases.mjs';
import { createProject } from './emulator.mjs';
import { magazine } from './fixture.mjs';

const here = import.meta.dirname;
const devRoot = resolve(here, '../..');

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function findCase(id) {
  const found = cases.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown case ${id}. Cases: ${cases.map((entry) => entry.id).join(', ')}`);
  return found;
}

export async function prepareWorkspace(workspace) {
  mkdirSync(workspace, { recursive: true });
  writeFileSync(join(workspace, 'package.json'), `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`);
  writeFileSync(
    join(workspace, 'tsconfig.json'),
    `${JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, noEmit: true, skipLibCheck: true }, include: ['*.ts'] }, null, 2)}\n`,
  );
  if (!existsSync(join(workspace, 'node_modules'))) symlinkSync(join(devRoot, 'node_modules'), join(workspace, 'node_modules'));
  writeFileSync(join(workspace, 'schema.ts'), await generateSchemaTypes(createProject(magazine()).client));
}

function prompt({ task, arm, skillsRoot, workspace }) {
  const sources =
    arm === 'none'
      ? ['Work from your own knowledge of DatoCMS and from the type definitions installed in the workspace. Do not use the Skill tool, the web, MCP tools or the datocms CLI.']
      : [
          `You have DatoCMS skills installed at ${resolve(skillsRoot, 'skills')}. Each skill is a folder with a SKILL.md and reference files. The list below is your skill listing: open a skill's SKILL.md when its description fits the task, then follow it to the reference files it points to.`,
          '',
          'Your only sources are your own knowledge, the files under that folder, and the type definitions installed in the workspace. Do not use the Skill tool, the web, MCP tools or the datocms CLI. Work as you normally would: read only what you need.',
          '',
          'Installed skills:',
          skillListing(skillsRoot),
        ];
  return [
    'You are a coding agent helping a developer who works with DatoCMS.',
    '',
    ...sources,
    '',
    `Workspace: ${workspace}`,
    '',
    'It is a TypeScript project with `@datocms/cma-client-node` and the Structured Text packages (`datocms-structured-text-utils`, `datocms-structured-text-dastdown`) installed. `schema.ts` holds the generated types of the DatoCMS project (`import * as Schema from "./schema"`). There are no DatoCMS credentials here, so you cannot call the API or run the code against the project.',
    '',
    'Deliverable: create `solution.ts` in the workspace. Its default export must be `async function (client: Client): Promise<void>`, where `Client` comes from `@datocms/cma-client-node`. It will be run once, by someone else, against the real project with an authenticated client. It must compile: check with `npx tsc --noEmit` in the workspace. Do not create other files.',
    '',
    'Task:',
    '',
    task,
    '',
    arm === 'none' ? 'When `solution.ts` is written and compiles, reply with only the word "done".' : `When \`solution.ts\` is written and compiles, write ${resolve(workspace, '..', 'reads.json')}: a JSON array of the skill file paths you read, in order. Then reply with only the word "done".`,
    '',
  ].join('\n');
}

export async function checkSolution(testCase, workspace, solution = 'solution.ts') {
  const result = { case: testCase.id, typecheck: 'ok', passed: false, error: null, calls: [], updates: 0 };
  if (!existsSync(join(workspace, solution))) return { ...result, typecheck: 'missing', error: `${solution} was not written` };
  try {
    execFileSync(join(devRoot, 'node_modules/.bin/tsc'), ['--noEmit', '-p', workspace], { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    return { ...result, typecheck: 'failed', error: String(error.stdout || error.message).slice(0, 2000) };
  }
  const outfile = join(tmpdir(), `task-eval-${process.pid}-${Date.now()}.mjs`);
  await build({ entryPoints: [join(workspace, solution)], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', absWorkingDir: workspace, logLevel: 'silent' });
  const bundled = join(workspace, `.evaluated-${Date.now()}.mjs`);
  cpSync(outfile, bundled);
  rmSync(outfile);
  const project = createProject(magazine());
  try {
    const run = (await import(pathToFileURL(bundled).href)).default;
    if (typeof run !== 'function') throw new Error('solution.ts has no default-exported function');
    await run(project.client);
    testCase.check({ state: project.state, original: project.original });
    result.passed = true;
  } catch (error) {
    result.error = String(error?.errors ? JSON.stringify(error.errors) : (error?.message ?? error)).slice(0, 2000);
  } finally {
    rmSync(bundled, { force: true });
  }
  result.calls = project.state.calls;
  result.updates = project.state.writes.length;
  return result;
}

async function controls() {
  const scratch = join(tmpdir(), `task-eval-controls-${process.pid}`);
  await prepareWorkspace(scratch);
  let failures = 0;
  for (const [folder, expected] of [['solutions', true], ['controls', false]]) {
    const dir = join(here, folder);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.ts')).sort()) {
      const testCase = findCase(file.replace(/(\.[\w-]+)?\.ts$/, ''));
      cpSync(join(dir, file), join(scratch, 'solution.ts'));
      const result = await checkSolution(testCase, scratch);
      const ok = result.passed === expected;
      if (!ok) failures += 1;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${folder}/${file} -> passed=${result.passed}${result.error ? ` (${result.error.split('\n')[0].slice(0, 160)})` : ''}`);
    }
  }
  rmSync(scratch, { recursive: true, force: true });
  if (failures) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const command = process.argv[2];
  if (command === 'controls') {
    await controls();
  } else if (command === 'prepare' || command === 'check') {
    const testCase = findCase(option('--case'));
    const out = resolve(option('--out') ?? '.');
    const workspace = join(out, 'workspace');
    if (command === 'prepare') {
      await prepareWorkspace(workspace);
      const arm = option('--arm') ?? 'skills';
      writeFileSync(join(out, 'prompt.md'), prompt({ task: testCase.prompt, arm, skillsRoot: option('--skills-root') ?? resolve(devRoot, '..'), workspace }));
      console.log(`${testCase.id} (${arm}) -> ${join(out, 'prompt.md')}`);
    } else {
      const result = await checkSolution(testCase, workspace, option('--solution'));
      writeFileSync(join(out, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
      console.log(`${testCase.id}: typecheck=${result.typecheck} passed=${result.passed}${result.error ? `\n${result.error}` : ''}`);
    }
  } else {
    throw new Error('Usage: run.mjs prepare|check --case <id> --out <run dir> | run.mjs controls');
  }
}
