import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import { encode } from "gpt-tokenizer";
import { declarations, mcpDeclarations, mcpMethodTypes, execute, inspectSource } from "./runtime.mjs";
import { TARGET, MCP_REVISION } from "./cases.mjs";

const [statePath, role] = process.argv.slice(2);
const initial = JSON.parse(readFileSync(statePath, "utf8"));
const auditPath = initial.auditPath;
const json = (value) => JSON.stringify(value);
const schema = (properties, required = []) => ({ type: "object", properties, required, additionalProperties: false });
const str = { type: "string" };
const bool = { type: "boolean" };
const tool = (name, description, inputSchema, readOnly = true) => ({ name, description, inputSchema, annotations: { readOnlyHint: readOnly, destructiveHint: !readOnly, openWorldHint: false } });
const targetSchema = { site_id: str, environment: str };
const scriptSchema = schema({ ...targetSchema, name: str, body: schema({ mode: { enum: ["full", "patch"] }, content: str, replacements: { type: "array", items: schema({ old_str: str, new_str: str }, ["old_str", "new_str"]) } }, ["mode"]), method_tokens: { type: "array", items: str }, no_execute: bool }, ["site_id", "name", "body", "method_tokens"]);

const workspaceTools = [
  tool("read_file", "Read a file from the isolated evaluation workspace. Use this to load an available skill or its references. Only paths inside the fixture workspace exist.", schema({ path: str }, ["path"])),
  ...(initial.testCase.cli ? [
    tool("exec_command", "Execute local DatoCMS CLI commands in the configured fixture repository. Supports npx datocms whoami, projects:list, schema:inspect, cma:docs, cma:call and cma:script via stdin heredoc. The CLI is installed and authenticated for fixture-project/sandbox. This bounded adapter does not expose an operating-system shell.", schema({ cmd: str }, ["cmd"]), false),
    tool("write_file", "Write a local migration file under migrations/. This creates a reviewable artifact only; it does not execute or mutate a DatoCMS project.", schema({ path: str, content: str }, ["path", "content"]), false),
  ] : []),
];
const remoteTools = [
  tool("whoami", "Returns information about the currently authenticated DatoCMS account (email, name, company).", schema({})),
  tool("search_projects", "Find accessible DatoCMS projects by optional fuzzy query.", schema({ query: str })),
  tool("get_schema", "Get project schema and generated Schema types. Select the project and environment explicitly. Read schema before manipulating fields and nested content.", schema({ ...targetSchema, filter_by_name: str, filter_by_type: { enum: ["all", "models_only", "blocks_only"] }, fields_details: { anyOf: [{ enum: ["basic", "complete"] }, { type: "array", items: { enum: ["validators", "appearance", "default_values"] } }] }, include_fieldsets: bool, include_nested_blocks: bool, include_referenced_models: bool, include_embedding_models: bool }, ["site_id"])),
  tool("get_api_methods", "Discover CMA resources, actions and methods. Request a specific method to receive its exact TypeScript signature and verification token. Include each distinct client.resource.method token when submitting a script. Only client and Schema are implicit globals. Import helpers and types from the documented packages. Pass earlier tokens via have so already-loaded sections are skipped.", schema({ methods: { type: "array", minItems: 1, maxItems: 20, items: schema({ resource: str, action: str, method: str }, ["resource"]) }, expand_details: { type: "array", items: str }, expand_types: { type: "array", items: str }, have: { type: "array", items: str, description: "Tokens previously returned by `get_api_methods`. Sections corresponding to these tokens are skipped (one-line marker only) so this call returns just the new content." } }, ["methods"])),
  ...["safe", "unsafe"].map((kind) => tool(`upsert_and_execute_${kind}_script`, `Store and execute a TypeScript script (${kind === "safe" ? "read-only client" : "writes allowed by actual access"}). name is script://name.ts. Use body full content or exact patch replacements. Only preauthenticated client and Schema are implicit globals. Import helper values and types from @datocms/cma-client-node, datocms-structured-text-utils, or datocms-structured-text-dastdown. Scripts are TypeScript ESM. Top-level await and console.log work. No any/unknown or type-check suppression. Supply verification tokens from get_api_methods. no_execute only stores; it does not compile or execute.`, scriptSchema, kind === "safe")),
];
const legacyTools = [tool("list_models", "List models using the retired local DatoCMS MCP server. This installed legacy server is unavailable.", schema({}))];
const tools = role === "workspace" ? workspaceTools : role === "legacy_datocms" ? legacyTools : remoteTools;

function log(entry) { appendFileSync(auditPath, `${json({ time: new Date().toISOString(), role, ...entry })}\n`); }
function load() { return JSON.parse(readFileSync(statePath, "utf8")); }
function save(state) { writeFileSync(statePath, json(state)); }
function assertTarget(args) {
  if (args.site_id !== TARGET.site_id || args.environment !== TARGET.environment) throw Error("Select fixture-project and environment sandbox explicitly; no primary-environment writes are allowed");
}
function schemaText(state) {
  let text = `Project: ${TARGET.site_id}; environment: ${TARGET.environment}. Model article, API key article, generated type Schema.Article. Fields: title string (nonlocalized), untouched string, body localized structured_text (en and it). Blocks: image-block with caption and nullable image. \n${role === "datocms" ? mcpDeclarations : declarations}`;
  if (state.testCase.long) {
    let index = 0;
    while (encode(text).length < 32000) {
      const batch = Array.from({ length: 40 }, () => `Unrelated model catalog_${index++}: field_a string, field_b string, field_c integer, locale en, no requested changes.\n`).join("");
      text += batch;
    }
  }
  return text;
}
function methodsText(args, state, includeGuidance = false) {
  const sections = [];
  const discoveryTokens = [];
  const methodTokens = [];
  const have = new Set(args.have ?? []);
  function guide(name) {
    const path = `skills/datocms-cma/references/${name}`;
    const text = state.serverGuidance?.[path];
    if (!text) return "";
    const sha256 = createHash("sha256").update(text).digest("hex");
    log({ kind: "guidance", path, tokens: encode(text).length, sha256, source: "mcp", sourceRevision: state.baseline, projection: "remove-lines-containing-cma-colon" });
    return text;
  }
  for (const resource of [...new Set(args.methods.map((entry) => entry.resource))]) {
    if (resource !== "items") { sections.push(`Resource ${resource} is outside this bounded fixture. Available: items.find, items.update.`); continue; }
    sections.push("## Resource: items");
    if (includeGuidance) {
      if (have.has("fixture-resource-items")) sections.push("_(skipped — already loaded; resource token in `have`)_");
      else { sections.push(guide("records.md")); discoveryTokens.push("fixture-resource-items"); }
    } else sections.push("items actions: find (read), update (write).");
    const names = [...new Set(args.methods.filter((entry) => entry.resource === resource).map((entry) => entry.method ?? entry.action).filter(Boolean))];
    for (const name of names) {
      sections.push(`### Action: items / ${name}`);
      if (!["find", "update"].includes(name)) { sections.push("Method outside bounded fixture; available: find, update."); continue; }
      if (have.has(`fixture-action-items.${name}`)) sections.push("_(skipped — already loaded; action token in `have`)_");
      else {
        if (includeGuidance && name === "update") sections.push(guide("editing-records.md"));
        discoveryTokens.push(`fixture-action-items.${name}`);
      }
      if (args.methods.some((entry) => entry.resource === "items" && entry.method === name)) {
        sections.push(role === "datocms" ? (name === "find" ? "client.items.find<Schema.Article>(id, {nested: true}) returns a nested record; import types from @datocms/cma-client-node when needed." : "client.items.update<Schema.Article>(id, payload) takes fields at the top level and optional meta.current_version; SDK types are supplied below.") : name === "find" ? "client.items.find<Schema.Article>(id: string, options?: {nested?: boolean}): Promise<Item<Schema.Article>>" : "client.items.update<Schema.Article>(id: string, values: Partial<Schema.Article> & {meta?: {current_version: string}}): Promise<Item<Schema.Article>>");
        methodTokens.push(name);
      }
    }
  }
  const footer = ["---"];
  if (discoveryTokens.length) footer.push("**Discovery tokens** (pass via `have` on future `get_api_methods` calls to skip already-loaded sections):", ...discoveryTokens.map((token) => token === "fixture-resource-items" ? `  - resource \`items\`: \`${token}\`` : `  - action \`items/${token.split(".").at(-1)}\`: \`${token}\``), "");
  if (methodTokens.length) footer.push("**Method tokens** (pass ALL of these as `method_tokens` to `upsert_and_execute_safe_script` / `upsert_and_execute_unsafe_script`):", ...methodTokens.map((name) => `  - \`client.items.${name}\`: \`fixture-token-items.${name}\``));
  else footer.push("_No method tokens issued — pass `{ resource, method }` entries to obtain tokens for `upsert_and_execute_*_script`._");
  return [...sections, role === "datocms" ? mcpDeclarations + "\n" + mcpMethodTypes : declarations, footer.join("\n")].join("\n\n");
}
function runSource(state, source, route, name, writable, tokens) {
  const inspection = inspectSource(source, { runtime: route });
  if (route === "mcp") {
    const missing = inspection.methods.filter((method) => !tokens.includes(`fixture-token-${method}`));
    if (missing.length) throw Error(`Missing method verification tokens: ${missing.join(", ")}`);
  }
  const result = execute(source, state.record, { writable, runtime: route, publishedRecord: state.publishedRecord });
  log({ kind: "execution", route, name, source, errors: result.errors, calls: result.calls, output: result.output });
  state.record = result.record;
  const writes = result.calls.filter((call) => call.method === "items.update" && call.applied).length;
  state.writes += writes;
  save(state);
  if (result.errors.length) throw Error(result.errors.join("\n"));
  if (state.testCase.operation === "uncertain" && writes > 0) throw Error("Upstream connection timed out after dispatch. The write may have been applied; its status is unknown.");
  return result.output.join("\n") || "Script completed. No console output.";
}
function readFile(state, path) {
  const absolute = resolve(state.workspace, path);
  const local = relative(state.workspace, absolute);
  if (local.startsWith("..") || isAbsolute(local)) throw Error(`No fixture file: ${path}`);
  const text = state.artifacts?.[local] ?? (existsSync(absolute) ? readFileSync(absolute, "utf8") : undefined);
  if (text === undefined) throw Error(`No fixture file: ${path}`);
  log({ kind: "reference", path: local, tokens: encode(text).length, sha256: createHash("sha256").update(text).digest("hex") });
  return text;
}
function execFixture(state, command) {
  if (/\b(?:login|link|install|curl|wget|npm\s+exec)\b/.test(command)) throw Error("Installation, authentication changes and network commands are unavailable in this isolated fixture");
  for (const match of command.matchAll(/--(environment|site-id|profile)(?:=|\s+)["']?([^\s"']+)/g)) {
    const expected = { environment: TARGET.environment, "site-id": TARGET.site_id, profile: "default" }[match[1]];
    if (match[2] !== expected) throw Error(`Wrong fixture target: --${match[1]} ${match[2]}`);
  }
  log({ kind: "cli-target", ...TARGET });
  if (/\bcma:script\b/.test(command)) {
    const heredoc = command.match(/<<-?\s*['"]?(\w+)['"]?[^\n]*\n([\s\S]*?)\n\1\s*$/);
    if (!heredoc || !/^\s*(?:npx\s+)?datocms\s+cma:script\b/.test(command)) throw Error("Fixture accepts cma:script with a stdin heredoc only");
    return runSource(state, heredoc[2], "cli", "stdin", true, []);
  }
  if (/^\s*(?:npx\s+)?datocms\s+whoami\s*(?:--json)?\s*$/.test(command)) return json({ authenticated: true, access_level: "unrestricted", ...TARGET });
  if (/^\s*(?:npx\s+)?datocms\s+projects:list\b/.test(command)) return json([{ id: TARGET.site_id, name: "Fixture project" }]);
  if (/^\s*(?:npx\s+)?datocms\s+schema:inspect\b/.test(command)) return schemaText(state);
  const methods = command.match(/^\s*(?:npx\s+)?datocms\s+cma:docs\s+(\w+)(?:\s+(\w+))?/);
  if (methods) {
    if (/--environment(?:=|\s)/.test(command)) throw Error("Nonexistent flag: --environment. cma:docs describes methods without accessing a project.");
    if (methods[1] === "items") {
      if (!methods[2]) return "items documentation actions: self (client.items.find), update (client.items.update).";
      const method = { self: "find", update: "update" }[methods[2]];
      if (!method) throw Error(`Action "${methods[2]}" not found for resource "items". Run datocms cma:docs items to see available actions.`);
      return methodsText({ methods: [{ resource: "items", method }] }, state);
    }
    return methodsText({ methods: [{ resource: methods[1], method: methods[2] }] }, state);
  }
  const call = command.match(/^\s*(?:npx\s+)?datocms\s+cma:call\s+items\s+(find|update)\s+["']?([\w-]+)["']?/);
  if (call) {
    const rendered = (output) => /(?:^|\s)--json(?:\s|$)/.test(command) ? "" : output;
    if (call[1] === "find") return rendered(runSource(state, `console.log(await client.items.find<Schema.Article>(${JSON.stringify(call[2])}, {nested: true}));`, "cli", "cma:call items.find", false, []));
    const data = command.match(/--data(?:=|\s+)('([^']*)'|"((?:\\.|[^"\\])*)")/);
    if (!data) throw Error("items update requires --data with a quoted JSON/JSON5 object");
    const object = data[2] ?? data[3].replace(/\\"/g, '"');
    return rendered(runSource(state, `console.log(await client.items.update<Schema.Article>(${JSON.stringify(call[2])}, ${object}));`, "cli", "cma:call items.update", true, []));
  }
  if (/^\s*(?:npx\s+)?datocms\s+migrations:new\b/.test(command)) return "Migration creation is available through workspace.write_file. Use migrations/20260914-add-subtitle.ts; do not run it.";
  if (/^\s*(?:pwd|ls(?:\s+.*)?)\s*$/.test(command)) return "package.json\ndatocms.config.json\nskills/";
  const cat = command.match(/^\s*cat\s+([^\s]+)\s*$/);
  if (cat) return readFile(state, cat[1]);
  throw Error("Command outside bounded fixture. Use read_file, datocms schema:inspect, cma:docs or cma:script with stdin heredoc.");
}
function handleCall(name, args) {
  const state = load();
  if (role === "legacy_datocms") throw Error("Legacy local DatoCMS MCP unavailable: connection refused");
  if (role === "workspace") {
    if (name === "read_file") return readFile(state, args.path);
    if (name === "write_file") {
      if (!/^migrations\/[a-zA-Z0-9_-]+\.ts$/.test(args.path)) throw Error("Only a migration .ts file can be written");
      state.artifacts ??= {}; state.artifacts[args.path] = args.content; save(state);
      log({ kind: "artifact", path: args.path, content: args.content });
      return "Local migration saved; not executed.";
    }
    return execFixture(state, args.cmd);
  }
  if (state.testCase.operation === "auth-error") throw Error("Current hosted MCP authentication failed: reconnect the current hosted MCP account");
  if (state.testCase.operation === "connection-error") throw Error("Current hosted MCP connection failed: service unavailable");
  if (name === "whoami") return json({ email: "fixture@example.test", name: "Fixture account", company: "Fixture organization" });
  if (name === "search_projects") return json([{ id: TARGET.site_id, name: "Fixture project", environments: [TARGET.environment] }]);
  if (name === "get_schema") { assertTarget(args); return schemaText(state); }
  if (name === "get_api_methods") return methodsText(args, state, true);
  if (name.startsWith("upsert_and_execute_")) {
    assertTarget(args);
    if (!/^script:\/\/.+\.ts$/.test(args.name)) throw Error("Script name must be script://name.ts");
    let source = state.scripts[args.name] ?? "";
    if (args.body.mode === "full") {
      if (typeof args.body.content !== "string") throw Error("Full body requires content");
      source = args.body.content;
    } else {
      if (!args.body.replacements?.length) throw Error("Patch requires replacements");
      for (const replacement of args.body.replacements) {
        if (!replacement.old_str || source.split(replacement.old_str).length !== 2) throw Error("Patch old_str must match exactly once");
        source = source.replace(replacement.old_str, replacement.new_str);
      }
    }
    state.scripts[args.name] = source; save(state);
    if (args.no_execute) return "Stored only. Not compiled or executed.";
    if (name.includes("_unsafe_") && state.testCase.operation === "denied") throw Error("Permission denied: content_view_only");
    return runSource(state, source, "mcp", args.name, name.includes("_unsafe_"), args.method_tokens);
  }
  throw Error(`Unknown tool ${name}`);
}

// Minimal MCP stdio transport: initialize, tools/list, tools/call, ping. No SDK
// dependency or remote endpoint. Requests are processed serially by this process.
const input = createInterface({ input: process.stdin });
for await (const line of input) {
  let request;
  try { request = JSON.parse(line); } catch { continue; }
  if (request.id === undefined) continue;
  let result;
  if (request.method === "initialize") result = { protocolVersion: request.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: `coexistence-${role}`, version: MCP_REVISION } };
  else if (request.method === "tools/list") result = { tools };
  else if (request.method === "ping") result = {};
  else if (request.method === "tools/call") {
    const { name, arguments: args = {} } = request.params;
    try {
      if (!tools.some((entry) => entry.name === name)) throw Error(`Unavailable tool ${name}`);
      const text = handleCall(name, args);
      result = { content: [{ type: "text", text }] };
    } catch (error) { result = { content: [{ type: "text", text: String(error.message ?? error) }], isError: true }; }
    log({ kind: "tool", name, args, isError: !!result.isError, output: result.content[0].text, tokens: encode(result.content[0].text).length });
  } else {
    process.stdout.write(`${json({ jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "Method not found" } })}\n`);
    continue;
  }
  process.stdout.write(`${json({ jsonrpc: "2.0", id: request.id, result })}\n`);
}
