import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// REFERENCE_REPO_ROOT points at an alternate tree containing skills/ (e.g. a baseline snapshot).
const repoRoot = process.env.REFERENCE_REPO_ROOT
  ? resolve(process.env.REFERENCE_REPO_ROOT)
  : fileURLToPath(new URL('../../', import.meta.url));
const skill = (path) => readFileSync(resolve(repoRoot, 'skills', path), 'utf8');
const installed = (path) => readFileSync(fileURLToPath(new URL(`../node_modules/${path}`, import.meta.url)), 'utf8');
const require = createRequire(import.meta.url);

test('migrations:run flag table states every flag dependency and exclusion the CLI enforces', () => {
  // datocms 4.2.0 lib/commands/migrations/run.js: e.g. 'fast-fork' dependsOn ['destination'];
  // oclif rejects `migrations:run --fast-fork` alone before any API call.
  const { default: Command } = require('datocms/lib/commands/migrations/run.js');
  const rows = Object.fromEntries([...skill('datocms-cli/references/running-migrations.md').matchAll(/^\| `--([\w-]+)[^|]*\|.*$/gm)].map(([row, flag]) => [flag, row]));
  for (const [flag, { dependsOn = [], exclusive = [] }] of Object.entries(Command.flags)) {
    for (const other of dependsOn) assert.ok(rows[flag]?.includes(`requires \`--${other}\``), `--${flag} row must say it requires --${other}`);
    for (const other of exclusive) assert.ok(rows[flag]?.includes(`exclusive with \`--${other}\``), `--${flag} row must say it is exclusive with --${other}`);
  }
});

test('schema:inspect flag table matches the installed command', () => {
  // Every flag but the shared connection and logging plumbing, and nothing the command lacks: a missing
  // --profile once sent inspections to the default project.
  const { flags } = require('datocms/oclif.manifest.json').commands['schema:inspect'];
  const plumbing = ['config-file', 'api-token', 'log-level', 'log-mode', 'base-url'];
  const documented = [...skill('datocms-cli/references/schema-inspect.md').matchAll(/^\| `(?:-\w, )?--([\w-]+)/gm)].map(([, flag]) => flag).sort();
  assert.deepEqual(documented, Object.keys(flags).filter((flag) => !plumbing.includes(flag)).sort());
});

test('every CMA statement of the nested items page cap agrees with the installed client default', () => {
  // Agents that stop at SKILL.md used page size 500 with nested: true, which the API rejects, and read block
  // fields flattened, where nested blocks keep them under attributes.
  const { default: Item } = require('@datocms/cma-client/dist/cjs/generated/resources/Item.js');
  const source = Item.toString();
  assert.match(source, /defaultLimit: 30/, 'items iterator default page size changed');
  for (const [file, pattern] of [
    ['datocms-cma/SKILL.md', /`nested: true`, keep `perPage` ≤ 30[^\n]*embedded blocks keep theirs under `block\.attributes`/],
    ['datocms-cma/references/filtering-and-pagination.md', /rejects page size > \*\*30\*\*/],
    ['datocms-cma/references/records.md', /max page size drops from 500 to 30/],
  ]) assert.match(skill(file), pattern, file);
});

test('migration authoring looks up schema and signatures through the CLI even with an MCP connected', () => {
  // Agents writing a local migration beside a connected MCP asked MCP tools for signatures and failed the route.
  assert.match(skill('datocms-cli/references/creating-migrations.md'), /DatoCMS MCP connected: look up schema \(`schema:inspect`\) and method signatures \(`cma:docs <resource> <action>`\) via CLI/);
  const { commands } = require('datocms/oclif.manifest.json');
  for (const command of ['schema:inspect', 'cma:docs']) assert.ok(commands[command], `${command} is not a CLI command`);
});

test('a route the user picked (MCP or CLI) holds for the whole conversation in both skills', () => {
  // An agent that chose MCP switched to the CLI on a later turn it read as a new task.
  const cma = skill('datocms-cma/SKILL.md');
  assert.match(cma, /or a route already used in this conversation\./);
  assert.match(cma, /\*\*Route lock:\*\* once chosen, the live-operation route holds for the whole conversation, later requests on other topics included, until the user explicitly switches\. MCP chosen → don't load \*\*datocms-cli\*\* or run CLI commands for live work, even schema lookups; CLI chosen → don't load `references\/mcp\.md` or call DatoCMS MCP tools\./);
  const cli = skill('datocms-cli/SKILL.md');
  assert.match(cli, /User chose the DatoCMS MCP for live work → stop here and stay on it until they explicitly switch\./);
});

test('the sandbox allowance excludes the primary environment wherever the skills state it', () => {
  // DatoCMS counts sandbox usage as environments minus the primary; agents counted main as a sandbox.
  assert.match(skill('datocms-cli/references/environment-commands.md'), /The allowance counts sandboxes only: the primary environment \(usually `main`\) never counts\./);
  assert.match(skill('datocms-cma/references/project-settings-and-usage.md'), /The environment threshold concerns sandboxes, excluding the primary environment\./);
});

test('upload helper-only options match the installed CMA client helper schemas', () => {
  // @datocms/cma-client-node 6.1.3 (and cma-client-browser 6.1.0) Upload.d.ts: helper schemas are
  // Omit<UploadCreateSchema, 'path'> plus source, filename?, skipCreationIfAlreadyExists? (Node create) and onProgress?.
  const types = installed('@datocms/cma-client-node/dist/types/resources/Upload.d.ts');
  const helperKeys = new Set([...types.matchAll(/CreateUploadFrom\w+Schema = Omit<ApiTypes\.UploadCreateSchema, 'path'> & \{([^}]*)\}/g)]
    .flatMap(([, body]) => [...body.matchAll(/^\s+(\w+)\??:/gm)].map(([, key]) => key)));
  const raw = installed('@datocms/cma-client/dist/types/generated/ApiTypes.d.ts').match(/export type UploadCreateSchema = \{([\s\S]*?)\n\};/)[1];
  const rawKeys = new Set([...raw.matchAll(/^ {4}(\w+)\??:/gm)].map(([, key]) => key));
  assert.match(types, /createFromLocalFile\(body: \w+\): CancelablePromise<ApiTypes\.Upload>/);

  const section = skill('datocms-cma/references/uploads.md').split('\n## Helper-only options\n')[1].split('\n## ')[0];
  const listed = [...section.matchAll(/^- \*\*`(\w+)/gm)].map(([, key]) => key);
  assert.ok(listed.length > 0, 'Helper-only options lists no options');
  for (const key of listed) assert.ok(helperKeys.has(key) && !rawKeys.has(key), `${key} is not a helper-only option`);
  // The old intro promised "three properties" but listed two plus the return type.
  const count = section.match(/\b(one|two|three|four|five) (?:properties|options)\b/)?.[1];
  if (count) assert.equal(['one', 'two', 'three', 'four', 'five'].indexOf(count) + 1, listed.length, `Intro says ${count} but lists ${listed.length}`);
});

test('CMA route selection keeps the CLI config readable and honors a requested route over the retired-MCP stop', () => {
  // Round-2 audit cma-3 (verifier-corrected): the CLI readiness check reads datocms.config.json, so the
  // configuration ban must be scoped to MCP client configuration, and the stop rule that runs before the
  // route rules must yield when the user asks for the CLI or current MCP instead (the explicit-route rule);
  // merely mentioning the current connection while requesting the retired one must not bypass it.
  assert.match(skill('datocms-cli/SKILL.md'), /datocms\.config\.json/);
  const cma = skill('datocms-cma/SKILL.md');
  assert.ok(cma.includes("don't run startup connection checks or scan MCP client configuration."), 'configuration ban must name MCP client configuration');
  assert.ok(!cma.includes('scan client configuration'), 'unscoped configuration ban is back');
  assert.ok(cma.includes('Apply this stop condition before the normal route rules below, unless the user asks for the CLI or current MCP instead.'), 'stop rule must yield to a requested route');
});

// Native DAST nodes are an editor setting: @datocms/cma-client fieldTypes/appearance/structured_text.d.ts
// `nodes?: Array<...>` (default: all). Enabling one means extending the current list.
test('schema reference enables native structured text nodes through editor appearance', () => {
  const nodes = [...installed('@datocms/cma-client/dist/types/fieldTypes/appearance/structured_text.d.ts').match(/nodes\?: Array<([^>]+)>/)[1].matchAll(/'(\w+)'/g)].map((m) => m[1]).sort();
  const line = skill('datocms-cma/references/schema.md').split('\n').find((l) => l.includes('appearance.parameters.nodes'));
  assert.ok(line, 'schema.md never names appearance.parameters.nodes');
  assert.deepEqual([...line.split(' and marks')[0].matchAll(/`(\w+)`/g)].map((m) => m[1]).sort(), nodes);
  assert.match(line, /current list plus/);
});

// datocms/api app/models/item_type.rb `avoid_ordering_without_direction`: ordering_field or
// ordering_meta without ordering_direction (or the reverse) is invalid, and the error is added to
// ordering_meta / ordering_field. The SDK type allows null, so nothing else warns agents.
test('schema reference requires ordering_direction with automatic ordering', () => {
  assert.match(installed('@datocms/cma-client/dist/types/generated/ApiTypes.d.ts'), /ordering_direction\?: null \| 'asc' \| 'desc'/);
  assert.match(skill('datocms-cma/references/schema.md'), /`ordering_field` or `ordering_meta` requires `ordering_direction`[^\n]*reports the error on the ordering attribute/);
});
