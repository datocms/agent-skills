import assert from "node:assert/strict";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
  existsSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { build } from "esbuild";

// This diagnostic executes the literal reference with real Vue effect scopes.
// Only fetch/subscription transport is replaced; it is not a live CMS E2E.
const root = resolve(import.meta.dirname, "../..");
const { values } = parseArgs({ options: { output: { type: "string" } } });
const output = resolve(
  values.output ?? join(root, "local", `nuxt-reference-${Date.now()}`),
);
assert.ok(!existsSync(output), "Use a fresh diagnostic directory");
const app = join(output, "app");
mkdirSync(join(app, "composables"), { recursive: true });
const modules = join(root, "e2e/catalog/web-nuxt/node_modules");
symlinkSync(modules, join(app, "node_modules"));
symlinkSync(modules, join(output, "node_modules"));
const markdown = readFileSync(
  join(root, "skills/datocms-frontend-integrations/references/nuxt.md"),
  "utf8",
);
const code = markdown
  .split("### Query Composable with Real-Time Subscription")[1]
  .match(/```ts\n([\s\S]*?)\n```/)[1];
writeFileSync(join(app, "composables/useQuery.ts"), code + "\n");
writeFileSync(
  join(app, "composables/useDraftMode.ts"),
  "export function useDraftMode(): {datocmsDraftContentCdaToken: string} | undefined { return undefined; }\n",
);
writeFileSync(
  join(app, "nuxt.config.ts"),
  "export default defineNuxtConfig({srcDir: '.', runtimeConfig: {public: {datocmsPublishedContentCdaToken: ''}}});\n",
);
writeFileSync(
  join(app, "tsconfig.json"),
  JSON.stringify({
    extends: "./.nuxt/tsconfig.json",
    compilerOptions: { skipLibCheck: true },
  }),
);
writeFileSync(
  join(app, "package.json"),
  JSON.stringify({ type: "module", private: true }),
);
const result = {
  kind: "model-free-reference-diagnostic",
  status: "pending",
  modelCalls: 0,
  harnessSha256: createHash("sha256")
    .update(readFileSync(import.meta.filename))
    .digest("hex"),
  snippetSha256: createHash("sha256").update(code).digest("hex"),
  checks: [],
};
try {
  for (const [name, executable, args] of [
    [
      "prepare",
      process.execPath,
      [join(modules, "nuxt/bin/nuxt.mjs"), "prepare"],
    ],
    [
      "typecheck",
      join(modules, ".bin/tsc"),
      ["--noEmit", "-p", "tsconfig.json"],
    ],
  ]) {
    const checked = spawnSync(executable, args, {
      cwd: app,
      encoding: "utf8",
      timeout: 60000,
    });
    writeFileSync(
      join(output, `${name}.log`),
      (checked.stdout ?? "") + (checked.stderr ?? ""),
    );
    assert.equal(checked.status, 0, `${name} failed; see ${name}.log`);
  }
  result.checks.push(
    "literal Nuxt reference typechecks against the pinned framework, listener and typed-document packages",
  );
  writeFileSync(
    join(output, "transport.mjs"),
    `export function subscribeToQuery(options) {
    globalThis.connections.started++;
    return new Promise(resolve => {
      globalThis.releaseSubscription = () => {
        options.onUpdate({response: {data: {live: true}}});
        resolve(() => {globalThis.connections.stopped++});
      };
    });
  }`,
  );
  writeFileSync(
    join(output, "probe.mjs"),
    `import assert from 'node:assert/strict';
import {effectScope, ref} from 'vue';
globalThis.window = {};
globalThis.useRuntimeConfig = () => ({public: {datocmsPublishedContentCdaToken: 'synthetic-public'}});
globalThis.useDraftMode = () => globalThis.draftEnabled ? {datocmsDraftContentCdaToken: 'synthetic-draft'} : undefined;
globalThis.useFetch = () => {
  const state = {data: ref(undefined)};
  return Object.assign(new Promise(resolve => {
    globalThis.releaseFetch = () => {state.data.value = {initial: true}; resolve(state)};
  }), state);
};
const {useQuery} = await import('./app/composables/useQuery.ts');
const results = [];
for (const phase of ['connected', 'during-fetch', 'during-subscription', 'published']) {
  globalThis.draftEnabled = phase !== 'published';
  globalThis.connections = {started: 0, stopped: 0};
  globalThis.releaseSubscription = undefined;
  const scope = effectScope();
  const task = scope.run(() => useQuery('{_site{id}}'));
  if (phase === 'during-fetch') scope.stop();
  releaseFetch();
  const data = await task;
  if (phase === 'during-subscription') scope.stop();
  globalThis.releaseSubscription?.();
  await new Promise(resolve => setTimeout(resolve, 0));
  scope.stop();
  assert.equal(connections.started, connections.stopped, phase + ' leaked a connection');
  assert.equal(connections.started, ['connected', 'during-subscription'].includes(phase) ? 1 : 0);
  assert.deepEqual(data.value, phase === 'during-fetch' ? undefined : phase === 'connected' ? {live: true} : {initial: true});
  results.push({phase, ...connections, data: data.value ?? null});
}
console.log(JSON.stringify(results));`,
  );
  await build({
    entryPoints: [join(output, "probe.mjs")],
    outfile: join(output, "probe-bundle.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["vue", "@mux/mux-player"],
    alias: { "datocms-listen": join(output, "transport.mjs") },
    logLevel: "silent",
  });
  const probe = spawnSync(
    process.execPath,
    [join(output, "probe-bundle.mjs")],
    { cwd: output, encoding: "utf8", timeout: 30000 },
  );
  writeFileSync(
    join(output, "lifecycle.log"),
    (probe.stdout ?? "") + (probe.stderr ?? ""),
  );
  assert.equal(
    probe.status,
    0,
    "Subscription lifecycle failed; see lifecycle.log",
  );
  result.lifecycle = JSON.parse(probe.stdout);
  result.checks.push(
    "normal disposal, disposal during fetch, disposal during connection startup and published reads release all owned subscriptions",
  );
  result.status = "passed";
} catch (error) {
  result.status = "failed";
  result.error = String(error);
  process.exitCode = 1;
} finally {
  writeFileSync(
    join(output, "result.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({ output, status: result.status, error: result.error }),
  );
}
