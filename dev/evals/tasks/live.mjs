// Runs task-eval solutions against a real DatoCMS project instead of the emulator.
//
//   node dev/evals/tasks/live.mjs controls
//       every reference solution (must pass) and wrong control (must fail),
//       with the emulator's verdict beside the real API's
//   node dev/evals/tasks/live.mjs check --case <id> --out <run dir> [--solution <file.ts>]
//       re-checks one agent run live; writes <run dir>/result-live.json
//   node dev/evals/tasks/live.mjs recheck <runs dir>
//       `check` for every run directory named <arm>-<model>-<case>
//   node dev/evals/tasks/live.mjs cleanup
//       destroys leftover eval environments
//
// Needs dev/.env with E2E_DATOCMS_API_TOKEN (full access) for an EMPTY project:
// the fixture is seeded into a sandbox environment (`eval-template`), every
// check runs in its own fork of that sandbox, and the primary environment is
// never written to.
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildClient } from '@datocms/cma-client-node';
import { config as loadEnv } from 'dotenv';
import { build } from 'esbuild';
import { cases } from './cases.mjs';
import { magazine } from './fixture.mjs';
import { checkSolution, prepareWorkspace } from './run.mjs';

const here = import.meta.dirname;
const devRoot = resolve(here, '../..');
loadEnv({ path: [resolve(devRoot, '.env.local'), resolve(devRoot, '.env')], quiet: true });

const TEMPLATE = 'eval-template';
const BLOCK_FIELD_TYPES = ['rich_text', 'single_block', 'structured_text'];
const apiToken = (process.env.E2E_DATOCMS_API_TOKEN ?? '').trim();
const clientFor = (environment) => buildClient({ apiToken, ...(environment ? { environment } : {}) });
const itemTypeRef = (id) => ({ type: 'item_type', id });

// ---------------------------------------------------------------- seeding

function rawBlock(fixture, block) {
  return { type: 'item', id: block.id, attributes: rawAttributes(fixture, block.item_type, block.attributes), relationships: { item_type: { data: itemTypeRef(block.item_type) } } };
}

function rawValue(fixture, field, value) {
  if (value == null) return value;
  if (field.field_type === 'rich_text') return value.map((block) => rawBlock(fixture, block));
  if (field.field_type === 'single_block') return rawBlock(fixture, value);
  if (field.field_type === 'structured_text') {
    const map = (node) => ({
      ...node,
      ...(node.type === 'block' || node.type === 'inlineBlock' ? { item: rawBlock(fixture, node.item) } : {}),
      ...(node.children ? { children: node.children.map(map) } : {}),
    });
    return { schema: 'dast', document: map(value.document) };
  }
  return value;
}

function rawAttributes(fixture, itemTypeId, attributes) {
  const out = {};
  for (const field of fixture.fields.filter((entry) => entry.item_type === itemTypeId)) {
    if (!(field.api_key in attributes)) continue;
    const stored = attributes[field.api_key];
    out[field.api_key] = field.localized
      ? Object.fromEntries(Object.entries(stored ?? {}).map(([locale, value]) => [locale, rawValue(fixture, field, value)]))
      : rawValue(fixture, field, stored);
  }
  return out;
}

async function seed(client, fixture) {
  await client.site.update({ locales: fixture.locales });
  for (const type of fixture.itemTypes) {
    await client.itemTypes.create({ id: type.id, name: type.name, api_key: type.api_key, modular_block: Boolean(type.modular_block), draft_mode_active: Boolean(type.draft_mode_active) });
  }
  for (const field of fixture.fields) {
    await client.fields.create(field.item_type, { id: field.id, label: field.label, api_key: field.api_key, field_type: field.field_type, localized: field.localized, validators: field.validators });
  }
  for (const record of fixture.records) {
    await client.items.create({ id: record.id, item_type: itemTypeRef(record.item_type), ...rawAttributes(fixture, record.item_type, record.attributes) });
  }
}

async function ensureTemplate() {
  const primary = clientFor();
  const environments = await primary.environments.list();
  const main = environments.find((environment) => environment.meta.primary);
  if ((await primary.itemTypes.list()).length > 0) throw new Error('The primary environment is not empty: refusing to use this project');
  const wanted = JSON.stringify(magazine());
  const marker = join(tmpdir(), `task-eval-template-${process.env.E2E_DATOCMS_SITE_ID}.json`);
  const current = environments.some((environment) => environment.id === TEMPLATE) && existsSync(marker) && readFileSync(marker, 'utf8') === wanted;
  if (current) return;
  if (environments.some((environment) => environment.id === TEMPLATE)) await primary.environments.destroy(TEMPLATE);
  await primary.environments.fork(main.id, { id: TEMPLATE });
  await seed(clientFor(TEMPLATE), magazine());
  writeFileSync(marker, wanted);
}

// ---------------------------------------------------------------- snapshot

function storedBlock(schema, block) {
  const itemType = block.relationships?.item_type?.data?.id ?? block.__itemTypeId;
  return { id: block.id, item_type: itemType, attributes: storedAttributes(schema, itemType, block.attributes) };
}

function storedValue(schema, field, value) {
  if (value == null) return field.field_type === 'rich_text' ? [] : null;
  if (field.field_type === 'rich_text') return value.map((block) => storedBlock(schema, block));
  if (field.field_type === 'single_block') return storedBlock(schema, value);
  if (field.field_type === 'structured_text') {
    const map = (node) => ({
      ...node,
      ...(node.type === 'block' || node.type === 'inlineBlock' ? { item: storedBlock(schema, node.item) } : {}),
      ...(node.children ? { children: node.children.map(map) } : {}),
    });
    return { schema: 'dast', document: map(value.document) };
  }
  return value;
}

function storedAttributes(schema, itemTypeId, attributes) {
  const out = {};
  for (const field of schema.fields.filter((entry) => entry.item_type === itemTypeId)) {
    const value = attributes[field.api_key];
    out[field.api_key] = field.localized
      ? Object.fromEntries(Object.entries(value ?? {}).map(([locale, localeValue]) => [locale, storedValue(schema, field, localeValue)]))
      : storedValue(schema, field, value);
  }
  return out;
}

/** The project state in the shape the emulator keeps, so the same `check` functions apply. */
async function snapshot(client) {
  const itemTypes = (await client.itemTypes.list()).map((type) => ({
    id: type.id, name: type.name, api_key: type.api_key, modular_block: type.modular_block, draft_mode_active: type.draft_mode_active,
  }));
  const fields = [];
  for (const type of itemTypes) {
    for (const field of await client.fields.list(type.id)) {
      fields.push({ id: field.id, item_type: type.id, label: field.label, api_key: field.api_key, field_type: field.field_type, localized: field.localized, validators: field.validators, appearance: field.appearance });
    }
  }
  const schema = { itemTypes, fields };
  const records = [];
  const statuses = {};
  for (const type of itemTypes.filter((entry) => !entry.modular_block)) {
    for await (const record of client.items.listPagedIterator({ filter: { type: type.id }, nested: true, version: 'current', order_by: '_created_at_ASC' }, { perPage: 30 })) {
      records.push({ id: record.id, item_type: type.id, attributes: storedAttributes(schema, type.id, record) });
      statuses[record.id] = record.meta.status;
    }
  }
  return { itemTypes, fields, records, statuses };
}

// ---------------------------------------------------------------- running

async function bundle(solutionPath) {
  const scratch = join(tmpdir(), `task-eval-live-${process.pid}-${Date.now()}`);
  await prepareWorkspace(scratch);
  cpSync(solutionPath, join(scratch, 'solution.ts'));
  const outfile = join(scratch, '.live.mjs');
  await build({ entryPoints: [join(scratch, 'solution.ts')], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', absWorkingDir: scratch, logLevel: 'silent' });
  return { scratch, outfile };
}

export async function checkLive(testCase, solutionPath) {
  const result = { case: testCase.id, passed: false, error: null };
  const environment = `eval-${Date.now().toString(36)}`;
  const primary = clientFor();
  const { scratch, outfile } = await bundle(solutionPath);
  await primary.environments.fork(TEMPLATE, { id: environment });
  try {
    const client = clientFor(environment);
    const original = await snapshot(client);
    const run = (await import(pathToFileURL(outfile).href)).default;
    await run(client);
    const state = await snapshot(client);
    state.published = Object.entries(state.statuses).filter(([id, status]) => status !== 'draft' && original.statuses[id] !== status).map(([id]) => ({ id }));
    testCase.check({ state, original });
    result.passed = true;
  } catch (error) {
    result.error = String(error?.errors ? JSON.stringify(error.errors.map((entry) => entry.attributes)) : (error?.message ?? error)).slice(0, 1500);
  } finally {
    await primary.environments.destroy(environment).catch(() => {});
    rmSync(scratch, { recursive: true, force: true });
  }
  return result;
}

const findCase = (id) => cases.find((entry) => entry.id === id) ?? (() => { throw new Error(`Unknown case ${id}`); })();
const option = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!apiToken) throw new Error('E2E_DATOCMS_API_TOKEN is not set in dev/.env');
  const command = process.argv[2];
  if (command === 'cleanup') {
    for (const environment of await clientFor().environments.list()) {
      if (environment.id.startsWith('eval-')) {
        await clientFor().environments.destroy(environment.id);
        console.log(`destroyed ${environment.id}`);
      }
    }
  } else if (command === 'controls') {
    await ensureTemplate();
    const scratch = join(tmpdir(), `task-eval-controls-${process.pid}`);
    await prepareWorkspace(scratch);
    let disagreements = 0;
    for (const [folder, expected] of [['solutions', true], ['controls', false]]) {
      for (const file of readdirSync(join(here, folder)).filter((name) => name.endsWith('.ts')).sort()) {
        const testCase = findCase(file.replace(/(\.[\w-]+)?\.ts$/, ''));
        cpSync(join(here, folder, file), join(scratch, 'solution.ts'));
        const emulated = await checkSolution(testCase, scratch);
        const live = emulated.typecheck === 'ok' ? await checkLive(testCase, join(here, folder, file)) : { passed: false, error: 'does not type-check' };
        const agree = emulated.passed === live.passed && live.passed === expected;
        if (!agree) disagreements += 1;
        console.log(`${agree ? 'ok  ' : 'DIFF'} ${folder}/${file}: emulator=${emulated.passed} live=${live.passed}`);
        if (!live.passed) console.log(`       live: ${(live.error ?? '').split('\n')[0].slice(0, 220)}`);
        if (!emulated.passed) console.log(`       emu : ${(emulated.error ?? '').split('\n')[0].slice(0, 220)}`);
      }
    }
    rmSync(scratch, { recursive: true, force: true });
    if (disagreements) process.exitCode = 1;
  } else if (command === 'check') {
    await ensureTemplate();
    const out = resolve(option('--out'));
    const result = await checkLive(findCase(option('--case')), option('--solution') ?? join(out, 'workspace', 'solution.ts'));
    writeFileSync(join(out, 'result-live.json'), `${JSON.stringify(result, null, 2)}\n`);
    console.log(`${result.case}: live passed=${result.passed}${result.error ? `\n${result.error}` : ''}`);
  } else if (command === 'recheck') {
    await ensureTemplate();
    const runs = resolve(process.argv[3]);
    for (const name of readdirSync(runs).sort()) {
      const testCase = cases.find((entry) => name.endsWith(`-${entry.id}`));
      const solution = join(runs, name, 'workspace', 'solution.ts');
      if (!testCase || !existsSync(solution)) continue;
      const result = await checkLive(testCase, solution);
      writeFileSync(join(runs, name, 'result-live.json'), `${JSON.stringify(result, null, 2)}\n`);
      console.log(`${name}: live passed=${result.passed}${result.error ? ` (${result.error.split('\n')[0].slice(0, 160)})` : ''}`);
    }
  } else {
    throw new Error('Usage: live.mjs controls | check --case <id> --out <run dir> | recheck <runs dir> | cleanup');
  }
}
