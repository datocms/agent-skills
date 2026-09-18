import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { cases, expectedRecord, initialRecord, TARGET } from "./cases.mjs";
import { execute } from "./runtime.mjs";
import { externalSkillOverrides, loadServerGuidance, score } from "./run.mjs";

const sourceDir = dirname(fileURLToPath(import.meta.url));
const caseById = (id) => {
  const found = cases.find((entry) => entry.id === id);
  assert.ok(found, `Missing case ${id}`);
  return found;
};
const toolEvent = (name, extra = {}) => ({ kind: "tool", role: "datocms", name, args: {}, isError: false, output: "", ...extra });
const writeEvent = (route = "mcp") => ({ kind: "execution", route, name: "script://edit.ts", errors: [], calls: [{ method: "items.update", id: "article-1", values: { title: "Summer update" }, applied: true }] });

test("shipped localized mapper keeps response narrowing and creates a valid partial block update", () => {
  const reference = readFileSync(new URL("../../skills/datocms-cma/references/editing-records.md", import.meta.url), "utf8");
  const example = reference.split("## Chaining Structured Text helpers")[1].split("```ts\n")[1].split("```")[0];
  const source = `
    import { buildBlockRecord, type FieldValueInRequest } from '@datocms/cma-client-node';
    import { mapNodes, isBlockWithItemOfType } from 'datocms-structured-text-utils';
    const currentItem = await client.items.find<Schema.Article>('article-1', {nested: true});
    ${example}
    await client.items.update<Schema.Article>(currentItem.id, {body: {...currentItem.body, en: content}});
  `;
  for (const variant of [undefined, "unseen", "rich", "multiple"]) {
    const original = initialRecord({variant});
    const result = execute(source, original, {runtime: "mcp", writable: true});
    assert.deepEqual(result.errors, []);
    const expected = structuredClone(original);
    for (const node of expected.body.en.document.children) {
      if (node.type === "block") node.item.attributes.caption += " (reviewed)";
    }
    expected.meta.current_version = "2";
    expected.meta.updated_at = "2026-09-18T12:00:00Z";
    assert.deepEqual(result.record, expected);
  }
  for (const missing of [null, undefined]) {
    const original = initialRecord(); original.body.en = missing;
    const result = execute(source, original, {runtime: "mcp", writable: true});
    assert.match(result.errors.join("\n"), /Missing English content/);
    assert.equal(result.calls.filter(call => call.method === "items.update").length, 0);
  }
});

test("host-skill isolation disables actual entrypoint files, including symlinks", () => {
  const root = mkdtempSync(join(tmpdir(), "coexistence-skills-"));
  try {
    const skills = join(root, "skills"), external = join(root, "external");
    mkdirSync(skills); mkdirSync(external);
    writeFileSync(join(external, "SKILL.md"), "# External skill");
    symlinkSync(external, join(skills, "linked"), "dir");
    symlinkSync(skills, join(skills, "cycle"), "dir");
    const overrides = externalSkillOverrides([skills]);
    assert.deepEqual(new Set(overrides.map((entry) => entry.path)), new Set([realpathSync(join(external, "SKILL.md")), join(skills, "linked", "SKILL.md")]));
    assert.ok(overrides.every((entry) => entry.enabled === false));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("script logging accepts mixed primitive and nullable field values", () => {
  const result = execute('const item = await client.items.find<Schema.Article>("article-1"); console.log(null, undefined, true, 3, "text", item.body.it);', initialRecord(), { writable: false });
  assert.deepEqual(result.errors, []);
  assert.match(result.output[0], /null.*true.*3.*text/);
  assert.deepEqual(result.record, initialRecord());
});

async function withServer(testCase, role, run) {
  const directory = mkdtempSync(join(tmpdir(), "coexistence-unit-"));
  const statePath = join(directory, "state.json");
  writeFileSync(join(directory, "tools.jsonl"), "");
  writeFileSync(statePath, JSON.stringify({ workspace: directory, auditPath: join(directory, "tools.jsonl"), testCase, serverGuidance: { "skills/datocms-cma/references/records.md": "RECORDS_GUIDE", "skills/datocms-cma/references/editing-records.md": "EDITING_GUIDE" }, record: initialRecord(), scripts: {}, writes: 0 }));
  const child = spawn(process.execPath, [join(sourceDir, "server.mjs"), statePath, role], { env: {}, stdio: ["pipe", "pipe", "pipe"] });
  const pending = new Map();
  let nextId = 0;
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  const rejectPending = (error) => {
    for (const { reject, timer } of pending.values()) { clearTimeout(timer); reject(error); }
    pending.clear();
  };
  child.on("error", rejectPending);
  child.on("close", (code) => rejectPending(new Error(`Fixture server exited ${code}: ${stderr}`)));
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    const response = JSON.parse(line);
    const request = pending.get(response.id);
    if (request) { clearTimeout(request.timer); pending.delete(response.id); request.resolve(response); }
  });
  const request = (method, params) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Fixture request timed out: ${method}`)); }, 10000);
    pending.set(id, { resolve, reject, timer });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
  const call = async (name, args = {}) => (await request("tools/call", { name, arguments: args })).result;
  try {
    await request("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "fixture-tests", version: "1" } });
    await run({ call, state: () => JSON.parse(readFileSync(statePath, "utf8")) });
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.stdin.end();
      const timer = setTimeout(() => child.kill("SIGKILL"), 2000);
      await new Promise((resolve) => child.once("close", resolve));
      clearTimeout(timer);
    }
    lines.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

test("unchanged record expectations cover migration and unavailable connections", () => {
  for (const id of ["migration-local", "neither-ready", "permission-denied", "current-auth-error", "current-connection-error", "legacy-only"]) {
    assert.deepEqual(expectedRecord(caseById(id)), initialRecord(), id);
  }
});

test("saved migration artifacts can be read back without executing them", async () => {
  await withServer(caseById("migration-local"), "workspace", async ({ call, state }) => {
    const path = "migrations/20260914-add-subtitle.ts";
    const content = "export default async function (client) { /* review only */ }";
    assert.ok(!(await call("write_file", { path, content })).isError);
    const saved = await call("read_file", { path });
    assert.ok(!saved.isError);
    assert.equal(saved.content[0].text, content);
    assert.deepEqual(state().record, initialRecord());
    assert.equal(state().writes, 0);
    assert.ok((await call("read_file", { path: "../state.json" })).isError);
  });
});

test("runtime executes typed synthetic edits and preserves effects before a later error", () => {
  const result = execute('await client.items.update<Schema.Article>("article-1", { title: "Summer update" }); throw new Error("later failure");', initialRecord(), { writable: true });
  assert.match(result.errors.join("\n"), /later failure/);
  assert.equal(result.record.title, "Summer update");
  assert.equal(result.record.meta.current_version, "2");
  assert.deepEqual(result.record.body, initialRecord().body);
});

test("runtime retains an applied update and call trace after an execution timeout", { timeout: 5000 }, () => {
  // VM interruption under node:test's async hooks can crash Node 24 itself.
  // Exercise the same runtime in a plain process, as the fixture server does.
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import { execute } from ${JSON.stringify(new URL("./runtime.mjs", import.meta.url).href)};
    const result = execute('await client.items.update<Schema.Article>("article-1", { title: "Summer update" }); while (true) {}', ${JSON.stringify(initialRecord())}, { writable: true });
    console.log(JSON.stringify(result));
  `], { env: {}, encoding: "utf8", timeout: 4000 });
  assert.equal(child.status, 0, child.stderr || String(child.error));
  const result = JSON.parse(child.stdout);
  assert.match(result.errors.join("\n"), /timed out|timeout/i);
  assert.deepEqual(result.record, expectedRecord(caseById("explicit-mcp")));
  assert.equal(result.calls.filter((call) => call.method === "items.update" && call.applied).length, 1);
});

test("read-only update attempts have no applied effect", () => {
  const result = execute('await client.items.update<Schema.Article>("article-1", { title: "Summer update" });', initialRecord());
  assert.match(result.errors.join("\n"), /read-only|denied/i);
  assert.deepEqual(result.record, initialRecord());
  assert.equal(result.calls.filter((call) => call.method === "items.update").length, 1);
  assert.equal(result.calls.filter((call) => call.applied).length, 0);
});

test("runtime rejects forbidden I/O and unsafe type escapes before execution", () => {
  for (const source of ['await fetch("https://example.test")', 'const item: any = {};', 'const item: unknown = {};', 'await import("node:fs")']) {
    const result = execute(source, initialRecord(), { writable: true });
    assert.ok(result.errors.length, source);
    assert.deepEqual(result.record, initialRecord());
    assert.deepEqual(result.calls, []);
  }
});

test("runtime allows own-property value checks while keeping general prototype access unavailable", () => {
  const valid = execute('const value = {title: "Summer update"}; if (!Object.prototype.hasOwnProperty.call(value, "title") || Object.prototype.hasOwnProperty.call(value, "missing")) throw Error("Wrong own-property result");', initialRecord());
  assert.deepEqual(valid.errors, []);
  for (const source of ['const value = Object.prototype;', 'const value = Object.prototype.hasOwnProperty;', 'Object.prototype.hasOwnProperty.call(Object.prototype, "title");', 'Object.prototype.toString.call({});']) {
    const result = execute(source, initialRecord());
    assert.match(result.errors.join("\n"), /Prototype access/, source);
    assert.deepEqual(result.calls, []);
  }
});

test("complex localized edits preserve the existing block, marks, link and other locale", () => {
  const source = `
    const record = await client.items.find<Schema.Article>("article-1", { nested: true });
    const english = record.body.en;
    if (!english) throw new Error("Missing English content");
    for (const node of english.document.children) {
      if (isParagraph(node)) {
        for (const child of node.children) if (isSpan(child) && child.value === "Hello reader") child.value = "Welcome reader";
      } else if (isBlock(node) && node.item.id === "block-1") node.item.attributes.caption = "Summer portrait";
    }
    english.document.children.push({ type: "paragraph", children: [{ type: "span", value: "See you soon." }] });
    await client.items.update<Schema.Article>(record.id, { body: record.body });
  `;
  const result = execute(source, initialRecord(), { writable: true });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.record, expectedRecord(caseById("localized-structured-text")));
  const incomplete = initialRecord();
  incomplete.body.en.document.children[0].children[0].value = "Welcome reader";
  incomplete.meta.current_version = "2";
  assert.equal(score(caseById("localized-structured-text"), [writeEvent()], incomplete, "All three edits are done.", 0).passed, false);
});

test("document round-trip and typed block helpers perform all three localized edits", () => {
  const source = `
    const record = await client.items.find<Schema.Article>("article-1", { nested: true });
    const original = record.body.en;
    if (!original) throw new Error("Missing English content");
    const changedText = parse(serialize(original).replace("Hello reader", "Welcome reader"), original);
    const english = mapNodes(changedText, (node) => {
      if (isBlockWithItemOfType(Schema.ImageBlock.ID, node) && node.item.id === "block-1") {
        return { ...node, item: buildBlockRecord<Schema.ImageBlock>({ id: node.item.id, caption: "Summer portrait" }) };
      }
      return node;
    });
    english.document.children.push(...parse("See you soon.").document.children);
    await client.items.update<Schema.Article>(record.id, { body: { ...record.body, en: english }, meta: { current_version: record.meta.current_version } });
  `;
  const result = execute(source, initialRecord(), { writable: true });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.record, expectedRecord(caseById("localized-structured-text")));
  assert.equal(result.calls.filter((call) => call.method === "items.update" && call.applied).length, 1);
});

const partialBlockEdit = `
  const before = await client.items.find<Schema.Article>("article-1", { nested: true, version: "current" });
  if (!before.body.en) throw new Error("Missing English content");
  const body = { ...before.body, en: mapNodes(before.body.en, (node) =>
    isBlockWithItemOfType(Schema.ImageBlock.ID, node)
      ? { ...node, item: buildBlockRecord<Schema.ImageBlock>({ id: node.item.id, caption: "Summer portrait" }) }
      : node) };
  await client.items.update<Schema.Article>(before.id, { body, meta: { current_version: before.meta.current_version } });
  const saved = await client.items.find<Schema.Article>(before.id, { nested: true, version: "current" });
`;

const verifySavedBlock = `
  const previousBlock = before.body.en.document.children[1];
  const savedBlock = saved.body.en?.document.children[1];
  if (!savedBlock || !isBlockWithItemOfType(Schema.ImageBlock.ID, savedBlock)
      || !isBlockWithItemOfType(Schema.ImageBlock.ID, previousBlock)
      || savedBlock.item.id !== previousBlock.item.id
      || savedBlock.item.attributes.caption !== "Summer portrait"
      || savedBlock.item.attributes.image !== previousBlock.item.attributes.image) {
    throw new Error("Saved block values or identity differ");
  }
  if (JSON.stringify(saved.body.it) !== JSON.stringify(before.body.it)
      || JSON.stringify(saved.body.en?.document.children[0]) !== JSON.stringify(before.body.en.document.children[0])
      || saved.body.en?.document.children.length !== before.body.en.document.children.length
      || saved.title !== before.title || saved.untouched !== before.untouched
      || saved.meta.status !== before.meta.status) throw new Error("Unrelated content changed");
`;

test("partial block payload equality fails after a correct write while saved-value verification passes", () => {
  const bad = execute(`${partialBlockEdit}
    if (JSON.stringify(saved.body) !== JSON.stringify(body)) throw new Error("Raw payload comparison failed");`, initialRecord(), { writable: true });
  assert.match(bad.errors.join("\n"), /Raw payload comparison failed/);
  const good = execute(partialBlockEdit + verifySavedBlock, initialRecord(), { writable: true });
  assert.deepEqual(good.errors, []);
  assert.deepEqual(good.record, bad.record);
  assert.equal(good.calls.filter((call) => call.method === "items.update" && call.applied).length, 1);
  assert.equal(good.calls.filter((call) => call.method === "items.find").length, 2);
});

test("saved-value verification still rejects actual loss of unrelated localized content", () => {
  const source = partialBlockEdit.replace("{ body, meta:", "{ body: { ...body, it: null }, meta:") + verifySavedBlock;
  const result = execute(source, initialRecord(), { writable: true });
  assert.match(result.errors.join("\n"), /Unrelated content changed/);
  assert.equal(result.calls.filter((call) => call.method === "items.update" && call.applied).length, 1);
});

test("scoring observes state and executions rather than trusting completion text", () => {
  const testCase = caseById("explicit-mcp");
  assert.equal(score(testCase, [], initialRecord(), "Done, updated and verified.", 0).passed, false);
  const damaged = expectedRecord(testCase);
  damaged.body.it = null;
  assert.equal(score(testCase, [writeEvent()], damaged, "Done.", 0).passed, false);
  assert.equal(score(testCase, [writeEvent("cli")], expectedRecord(testCase), "Done.", 0).passed, false);
});

const migrationSource = (target = "'article'", setup = "") => `
  import type { Client } from 'datocms/lib/cma-client-node';
  export default async function(client: Client): Promise<void> {
    ${setup}
    await client.fields.create(${target}, {
      label: 'Subtitle', api_key: 'subtitle', field_type: 'string', validators: {},
    });
  }
`;
const scoreMigration = (content, path = caseById("migration-local").artifact) => score(
  caseById("migration-local"), [{ kind: "artifact", path, content }], initialRecord(), "Migration saved; not executed.", 0,
);

test("migration scoring accepts the requested field using its model key or an explicit ID lookup", () => {
  for (const source of [migrationSource(), migrationSource().replace("validators: {},", ""), migrationSource("article.id", "const article = await client.itemTypes.find('article');")]) {
    const result = scoreMigration(source);
    assert.equal(result.passed, true, result.failures.join("\n"));
  }
});

test("migration scoring rejects wrong paths, comment-only artifacts and invalid or unrelated code", () => {
  const valid = migrationSource();
  const invalid = [
    [valid, "migrations/wrong-file.ts"],
    ["// TODO: subtitle fields.create"],
    [valid.replace("validators: {}", "validators: {")],
    [valid.replace("default async", "default")],
    [valid.replace("export default", "export")],
    [valid.replace("api_key: 'subtitle'", "api_key: 'title'")],
    [valid.replace("field_type: 'string'", "field_type: 'text'")],
    [valid.replace("validators: {}", "validators: { required: {} }")],
    [valid.replace("validators: {}", "required: false")],
    [valid.replace("validators: {}", "required: false, validators: {}")],
    [valid.replace("await client.fields.create", "return; await client.fields.create")],
    [migrationSource("'unrelated_model'")],
    [migrationSource("article.id", "const article = await client.itemTypes.find('unrelated_model');")],
    [valid.replace("await client.fields.create", "const unused = async () => client.fields.create")],
  ];
  for (const [content, path] of invalid) {
    const result = scoreMigration(content, path);
    assert.equal(result.passed, false, `${path ?? "requested path"}: ${content}`);
    assert.match(result.contentFailures.join("\n"), /Requested migration artifact/);
  }
  const overwritten = score(caseById("migration-local"), [
    { kind: "artifact", path: caseById("migration-local").artifact, content: valid },
    { kind: "artifact", path: caseById("migration-local").artifact, content: "// TODO: subtitle fields.create" },
  ], initialRecord(), "Done.", 0);
  assert.equal(overwritten.passed, false, "The final artifact content must satisfy the request");
});

test("neither-ready completion claims fail even when fixture state stayed unchanged", () => {
  const result = score(caseById("neither-ready"), [], initialRecord(), "Done. The title is updated to Summer update.", 0);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /no execution route|reporting|completion/i);
});

test("one denied permission discovery can stop safely but retrying after denial fails", () => {
  const testCase = caseById("permission-denied");
  const denied = toolEvent("upsert_and_execute_unsafe_script", { args: TARGET, isError: true, output: "Permission denied: content_view_only" });
  const stopped = score(testCase, [denied], initialRecord(), "The connection denied permission. I did not change the article.", 0);
  assert.equal(stopped.passed, true, stopped.failures.join("\n"));
  const retried = score(testCase, [denied, denied], initialRecord(), "The connection denied permission again. I did not change the article.", 0);
  assert.equal(retried.passed, false);
  assert.match(retried.failures.join("\n"), /bypass|denied|permission/i);
});

test("scoring rejects duplicate writes even when the final content looks right", () => {
  const testCase = caseById("explicit-mcp");
  const result = score(testCase, [writeEvent(), writeEvent()], expectedRecord(testCase), "Done.", 0);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /write/i);
});

test("a successful safe script without a read is not uncertain-write verification", () => {
  const testCase = caseById("uncertain-write");
  const events = [
    toolEvent("whoami"), writeEvent(),
    toolEvent("upsert_and_execute_unsafe_script", { args: TARGET, isError: true, output: "Upstream connection timed out after dispatch. The write may have been applied; its status is unknown." }),
    { kind: "execution", route: "mcp", name: "script://check.ts", errors: [], calls: [], output: ["done"] },
    toolEvent("upsert_and_execute_safe_script", { args: TARGET, output: "done" }),
  ];
  const result = score(testCase, events, expectedRecord(testCase), "Updated and verified successfully.", 0);
  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /uncertain|verif|disclos/i);
});

test("CLI fixture rejects wrong environment and supports ordinary single calls", { timeout: 15000 }, async () => {
  await withServer(caseById("skills-only-cli"), "workspace", async ({ call, state }) => {
    const wrong = await call("exec_command", { cmd: 'npx datocms cma:script --environment primary <<\'EOF\'\nawait client.items.update<Schema.Article>("article-1", { title: "Summer update" });\nEOF' });
    assert.equal(wrong.isError, true);
    assert.deepEqual(state().record, initialRecord());
    const found = await call("exec_command", { cmd: "npx datocms cma:call items find article-1 --environment sandbox" });
    assert.notEqual(found.isError, true, found.content[0].text);
    assert.match(found.content[0].text, /Original title/);
    const updated = await call("exec_command", { cmd: 'npx datocms cma:call items update article-1 --environment sandbox --data=\'{"title":"Summer update"}\'' });
    assert.notEqual(updated.isError, true, updated.content[0].text);
    assert.deepEqual(state().record, expectedRecord(caseById("skills-only-cli")));
  });
});

test("CLI documentation actions differ from callable SDK methods", { timeout: 15000 }, async () => {
  await withServer(caseById("skills-only-cli"), "workspace", async ({ call, state }) => {
    const invalid = await call("exec_command", { cmd: "npx datocms cma:docs items find" });
    assert.equal(invalid.isError, true);
    const actions = await call("exec_command", { cmd: "npx datocms cma:docs items" });
    assert.match(actions.content[0].text, /self.*client.items.find/);
    const method = await call("exec_command", { cmd: "npx datocms cma:docs items self" });
    assert.match(method.content[0].text, /client.items.find<Schema.Article>/);
    const wrongFlag = await call("exec_command", { cmd: "npx datocms cma:docs items self --environment sandbox" });
    assert.equal(wrongFlag.isError, true);
    const wrongMethod = await call("exec_command", { cmd: "npx datocms cma:call items self article-1" });
    assert.equal(wrongMethod.isError, true);
    assert.deepEqual(state().record, initialRecord());
  });
});

test("CLI JSON flag can suppress output after a successful write", { timeout: 15000 }, async () => {
  await withServer(caseById("skills-only-cli"), "workspace", async ({ call, state }) => {
    const result = await call("exec_command", { cmd: 'npx datocms cma:call items update article-1 --environment sandbox --data=\'{"title":"Summer update"}\' --json' });
    assert.notEqual(result.isError, true);
    assert.equal(result.content[0].text, "");
    assert.deepEqual(state().record, expectedRecord(caseById("skills-only-cli")));
    assert.equal(state().writes, 1);
    const saved = await call("exec_command", { cmd: "npx datocms cma:call items find article-1 --environment sandbox" });
    assert.match(saved.content[0].text, /Summer update/);
    assert.equal(state().writes, 1);
  });
});

test("server preserves a completed update before a later script failure", { timeout: 15000 }, async () => {
  await withServer(caseById("explicit-mcp"), "datocms", async ({ call, state }) => {
    const result = await call("upsert_and_execute_unsafe_script", { ...TARGET, name: "script://partial.ts", body: { mode: "full", content: 'await client.items.update<Schema.Article>("article-1", { title: "Summer update" }); throw new Error("later failure");' }, method_tokens: ["fixture-token-items.update"] });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /later failure/);
    assert.deepEqual(state().record, expectedRecord(caseById("explicit-mcp")));
    assert.equal(state().writes, 1);
  });
});

test("server does not count rejected read-only update attempts as applied writes", { timeout: 15000 }, async () => {
  await withServer(caseById("explicit-mcp"), "datocms", async ({ call, state }) => {
    const result = await call("upsert_and_execute_safe_script", { ...TARGET, name: "script://denied.ts", body: { mode: "full", content: 'await client.items.update<Schema.Article>("article-1", { title: "Summer update" });' }, method_tokens: ["fixture-token-items.update"] });
    assert.equal(result.isError, true);
    assert.deepEqual(state().record, initialRecord());
    assert.equal(state().writes, 0);
  });
});

test("fixture file reads cannot escape the temporary workspace", { timeout: 15000 }, async () => {
  await withServer(caseById("editor-mcp"), "workspace", async ({ call }) => {
    const result = await call("read_file", { path: "../outside.txt" });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /No fixture file/);
  });
});

test("discovery tokens suppress loaded guides while method tokens require explicit methods", { timeout: 15000 }, async () => {
  await withServer(caseById("explicit-mcp"), "datocms", async ({ call }) => {
    const action = (await call("get_api_methods", { methods: [{ resource: "items", action: "update" }] })).content[0].text;
    assert.match(action, /RECORDS_GUIDE/);
    assert.match(action, /EDITING_GUIDE/);
    assert.match(action, /No method tokens issued/);
    assert.doesNotMatch(action, /fixture-token-items\.update/);
    const method = (await call("get_api_methods", { methods: [{ resource: "items", method: "update" }], have: ["fixture-resource-items", "fixture-action-items.update"] })).content[0].text;
    assert.doesNotMatch(method, /RECORDS_GUIDE|EDITING_GUIDE/);
    assert.match(method, /skipped — already loaded/);
    assert.match(method, /fixture-token-items\.update/);
    const methodHave = (await call("get_api_methods", { methods: [{ resource: "items", method: "update" }], have: ["fixture-token-items.update"] })).content[0].text;
    assert.match(methodHave, /RECORDS_GUIDE/);
    assert.match(methodHave, /EDITING_GUIDE/);
  });
});

test("long conversation requires all three turns and defers the write until the final request", () => {
  const testCase = caseById("long-followup");
  const events = [{ kind: "turn-start", turn: 1 }, toolEvent("get_schema", { args: TARGET, tokens: 32000 }), { kind: "turn-start", turn: 2 }, { kind: "turn-start", turn: 3 }, writeEvent()];
  assert.equal(score(testCase, events, expectedRecord(testCase), "Done.", 0).passed, true);
  const early = [events[0], events[1], writeEvent(), events[2], events[3]];
  assert.match(score(testCase, early, expectedRecord(testCase), "Done.", 0).failures.join("\n"), /before the final content request/);
  const missing = events.filter((entry) => entry.turn !== 3);
  assert.match(score(testCase, missing, expectedRecord(testCase), "Done.", 0).failures.join("\n"), /Three native conversation turns/);
});


test('fixture accepts optional link metadata exposed by the real DAST types', () => {
  const record=initialRecord();
  const source='const item=await client.items.find<Schema.Article>("article-1"); if(item.body.en) mapNodes(item.body.en,node=>{if(isLink(node)) console.log(node.meta?.length ?? 0);return node;});';
  assert.deepEqual(execute(source,record).errors,[]);
  record.body.en.document.children[0].children[2].meta=[{id:'rel',value:'nofollow'}];
  assert.deepEqual(execute(source,record).errors,[]);
});


test('fixture status uses the real CMA status union rather than narrowing every read to draft', () => {
  const result=execute('const item=await client.items.find<Schema.Article>("article-1"); console.log(item.meta.status === "published");',initialRecord());
  assert.deepEqual(result.errors,[]);
});

test("MCP scripts import real SDK and document-helper types, including aliased and namespace imports", () => {
  const source = `
    import { buildBlockRecord, type FieldValueInRequest } from '@datocms/cma-client-node';
    import { isSpan as span, isBlockWithItemOfType, mapNodes } from 'datocms-structured-text-utils';
    import * as markdown from 'datocms-structured-text-dastdown';
    const before = await client.items.find<Schema.Article>('article-1', {nested: true});
    const original = before.body.en;
    if (!original) throw Error('Missing locale');
    let body: NonNullable<FieldValueInRequest<typeof before, 'body'>>['en'] = original;
    body = mapNodes(body, node => {
      if (span(node) && node.value === 'Hello reader') return {...node, value: 'Welcome reader'};
      if (isBlockWithItemOfType(Schema.ImageBlock.ID, node) && node.item.id === 'block-1')
        return {...node, item: buildBlockRecord<Schema.ImageBlock>({id: node.item.id, caption: 'Summer portrait'})};
      return node;
    });
    body.document.children.push(...markdown.parse('See you soon.').document.children);
    await client.items.update<Schema.Article>(before.id, {body: {...before.body, en: body}});
  `;
  const result = execute(source, initialRecord(), { writable: true, runtime: 'mcp' });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.record, expectedRecord(caseById('localized-structured-text')));
});

test("MCP rejects missing imports, nonexistent exports and modules outside the bounded fixture", () => {
  for (const source of [
    'console.log(isSpan({type:"span",value:"text"}));',
    'import {notAnExport} from "datocms-structured-text-utils"; console.log(notAnExport);',
    'import {readFileSync} from "node:fs"; console.log(readFileSync("secret"));',
  ]) {
    const result = execute(source, initialRecord(), {runtime: 'mcp'});
    assert.ok(result.errors.length, source);
    assert.deepEqual(result.calls, []);
  }
});

test("MCP checks narrowing against real node unions instead of permissive fixture types", () => {
  const prefix = `import {isParagraph} from 'datocms-structured-text-utils';
    const item = await client.items.find<Schema.Article>('article-1', {nested: true});
    if (!item.body.en) throw Error('Missing locale');
    const first = item.body.en.document.children[0];
  `;
  const invalid = prefix + `function assert(condition: boolean): void { if (!condition) throw Error('Bad node'); }
    assert(isParagraph(first)); console.log(first.children);`;
  assert.ok(execute(invalid, initialRecord(), {runtime: 'mcp'}).errors.length);
  const valid = prefix + `function assert(condition: boolean): asserts condition { if (!condition) throw Error('Bad node'); }
    assert(isParagraph(first)); console.log(first.children);`;
  assert.deepEqual(execute(valid, initialRecord(), {runtime: 'mcp'}).errors, []);
});

test("MCP supports pure Node value comparison without host callbacks or order-sensitive JSON equality", () => {
  const source = `import {isDeepStrictEqual} from 'node:util';
    if (!isDeepStrictEqual({image: {alt: null, ids: ['one']}}, {image: {ids: ['one'], alt: null}})) throw Error('Object key order');
    if (isDeepStrictEqual({image: null}, {image: {alt: null}})) throw Error('Lost image');
    if (isDeepStrictEqual(['one', 'two'], ['two', 'one'])) throw Error('Array order');
    const before = await client.items.find<Schema.Article>('article-1', {nested: true});
    const snapshot = structuredClone(before.body.it);
    if (!isDeepStrictEqual(snapshot, before.body.it)) throw Error('Snapshot equality');
    console.log('compared independent JSON values');`;
  const result = execute(source, initialRecord({variant: 'rich'}), {runtime: 'mcp'});
  assert.deepEqual(result.errors, []);
  assert.match(result.output.join('\n'), /compared independent JSON values/);
  assert.equal(result.calls.length, 1);
});

test("shipped snapshot comparison accepts independent equal values and catches changed content", () => {
  const reference = readFileSync(new URL("../../skills/datocms-cma/references/editing-records.md", import.meta.url), "utf8");
  const example = reference.split('In Node runtimes, use the standard value comparator')[1].split('```ts\n')[1].split('```')[0];
  for (const change of [false, true]) {
    const source = `
      const before = await client.items.find<Schema.Article>('article-1', {nested: true});
      const saved = await client.items.find<Schema.Article>('article-1', {nested: true});
      ${change ? "saved.body.it = null;" : ""}
      ${example}
    `;
    const result = execute(source, initialRecord({variant: 'rich'}), {runtime: 'mcp'});
    if (change) assert.match(result.errors.join('\n'), /Italian content changed/);
    else assert.deepEqual(result.errors, []);
    assert.equal(result.calls.length, 2);
  }
});

test("asset snapshots preserve typed file objects and reject string-ID annotations", () => {
  const prefix = `import {findFirstNode, isBlockWithItemOfType} from 'datocms-structured-text-utils';
    const record = await client.items.find<Schema.Article>('article-1', {nested: true});
    if (!record.body.en) throw Error('Missing English');
    const block = findFirstNode(record.body.en, isBlockWithItemOfType(Schema.ImageBlock.ID));
    if (!block) throw Error('Missing block');`;
  const invalid = execute(prefix + 'const image: string | null = block.node.item.attributes.image;', initialRecord({variant: 'rich'}), {runtime: 'mcp'});
  assert.ok(invalid.errors.some(message => message.includes('FileFieldValue')));
  const valid = execute(prefix + 'const image = structuredClone(block.node.item.attributes.image); console.log(image);', initialRecord({variant: 'rich'}), {runtime: 'mcp'});
  assert.deepEqual(valid.errors, []);
  assert.deepEqual(JSON.parse(valid.output[0]), initialRecord({variant: 'rich'}).body.en.document.children[1].item.attributes.image);
});

test("published reads reject never-published drafts and retain a separate published snapshot after updates", () => {
  const draftRead = execute('await client.items.find<Schema.Article>("article-1", {version: "published"});', initialRecord(), {runtime: "mcp"});
  assert.match(draftRead.errors.join('\n'), /NOT_FOUND/);
  const original = initialRecord({variant: 'rich'});
  const published = structuredClone(original); published.title = 'Previously published title';
  const result = execute(`
    await client.items.update<Schema.Article>('article-1', {title: 'New draft title'});
    const current = await client.items.find<Schema.Article>('article-1');
    const published = await client.items.find<Schema.Article>('article-1', {version: 'published'});
    if (current.title !== 'New draft title' || published.title !== 'Previously published title') throw Error('Versions conflated');
  `, original, {runtime: 'mcp', writable: true, publishedRecord: published});
  assert.deepEqual(result.errors, []);
  const later = execute(`console.log((await client.items.find<Schema.Article>('article-1', {version: 'published'})).title);`, result.record, {runtime: 'mcp', publishedRecord: published});
  assert.deepEqual(later.errors, []);
  assert.equal(later.output[0], 'Previously published title');
});

test("known read-only access stops before a mutation while an unknown restriction may be discovered once", () => {
  const scenario = caseById('permission-known-read-only');
  assert.equal(score(scenario, [], initialRecord(), 'This connection is read-only; no content was changed.', 0).passed, true);
  const attempt = toolEvent('upsert_and_execute_unsafe_script', {args: TARGET, isError: true, output: 'Permission denied'});
  assert.equal(score(scenario, [attempt], initialRecord(), 'Permission denied.', 0).passed, false);
});

test("held-out MCP data keeps publication status, image metadata and code whitespace observable", () => {
  const scenario = caseById('long-followup-rich-values');
  const before = initialRecord(scenario), after = expectedRecord(scenario);
  assert.equal(after.meta.status, 'updated');
  assert.deepEqual(after.body.en.document.children[1].item.attributes.image, before.body.en.document.children[1].item.attributes.image);
  assert.deepEqual(after.body.it, before.body.it);
  assert.equal(after.body.it.document.children[1].code, '  keep()\n\nnext();  ');
  assert.notDeepEqual(before, initialRecord());
});

test("MCP can keep an independent JSON content snapshot using the Node runtime clone function", () => {
  const source = `
    const before = await client.items.find<Schema.Article>('article-1', {nested: true});
    const snapshot = structuredClone(before);
    before.title = 'Only the local object changed';
    if (snapshot.title !== 'Original title') throw Error('Snapshot alias');
    console.log(snapshot.body.it);
  `;
  const result = execute(source, initialRecord(), {runtime: 'mcp'});
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.record, initialRecord());
});


test("release server guidance is frozen separately from the skill comparison baseline", () => {
  const directory = mkdtempSync(join(tmpdir(), "coexistence-guidance-"));
  try {
    const referenceDirectory = join(directory, "datocms-cma/references");
    mkdirSync(referenceDirectory, {recursive: true});
    for (const name of ["records.md", "editing-records.md"]) writeFileSync(join(referenceDirectory, name), `${name} candidate\nCLI cma:script removed\nShared guidance`);
    const guidance = loadServerGuidance({revision: "candidate", candidateSkills: directory});
    writeFileSync(join(referenceDirectory, "records.md"), "later working-tree edit");
    assert.equal(guidance["skills/datocms-cma/references/records.md"], "records.md candidate\nShared guidance");
    const baseline = loadServerGuidance({revision: "4c01e875325a19c50658dbcbc4ad34767bb08a98"});
    assert.notDeepEqual(baseline, guidance);
    assert.ok(Object.values(baseline).every(text => !text.includes("cma:")));
    assert.throws(() => loadServerGuidance({revision: "missing-evaluation-revision"}), /Missing frozen server guide/);
  } finally { rmSync(directory, {recursive: true, force: true}); }
});

test("MCP rejects never casts used to escape request types", () => {
  const result = execute('await client.items.update("article-1", {title: 42 as never});', initialRecord(), {runtime: "mcp", writable: true});
  assert.match(result.errors.join("\n"), /Casts to never/);
  assert.equal(result.calls.length, 0);
});


test("shipped typed inspection captures nested spans, custom marks and nullable asset values", () => {
  const reference = readFileSync(new URL("../../skills/datocms-cma/references/editing-records.md", import.meta.url), "utf8");
  const example = reference.split("For typed inspection,")[1].split("```ts\n")[1].split("```")[0];
  for (const variant of [undefined, "rich"]) {
    const original = initialRecord({variant});
    const result = execute(`
      import {collectNodes, isSpan, isBlockWithItemOfType} from 'datocms-structured-text-utils';
      const record = await client.items.find<Schema.Article>('article-1', {nested:true});
      const english = record.body.en;
      if (!english) throw new Error('Missing English content');
      ${example}
      console.log({spans, images});
    `, original, {runtime:"mcp", writable:false});
    assert.deepEqual(result.errors, []);
    const snapshot = JSON.parse(result.output[0]);
    assert.deepEqual(snapshot.spans.map(span => span.text), ["Hello reader", " — ", "Help"]);
    assert.deepEqual(snapshot.spans[0].marks, original.body.en.document.children[0].children[0].marks);
    assert.deepEqual(snapshot.images, [{id:"block-1", image:original.body.en.document.children[1].item.attributes.image}]);
    assert.deepEqual(result.record, original);
  }
});


test("multiple-block holdout preserves the non-target block and masks only the appended slot", () => {
  const testCase = caseById("long-followup-multiple-blocks");
  const original = initialRecord(testCase), final = expectedRecord(testCase);
  assert.deepEqual(final.body.en.document.children[2], original.body.en.document.children[2]);
  const events = [{kind:"turn-start",turn:1}, {kind:"tool", role:"datocms",name:"get_schema",args:TARGET,tokens:32000}, {kind:"turn-start",turn:3}, writeEvent()];
  assert.deepEqual(score(testCase,events,final,"Updated",0).failures, []);
  final.body.en.document.children[2].item.attributes.caption = "Unauthorized change";
  assert.ok(score(testCase,events,final,"Updated",0).failures.some(f => /unrelated content/.test(f)));
});
