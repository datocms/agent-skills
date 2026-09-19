import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { buildClient as dashboardClient } from "@datocms/dashboard-client";
import { buildClient } from "@datocms/cma-client-node";
import { readCredentials } from "@datocms/cli-utils";
import {
  createTestProject,
  destroyTestProject,
} from "../lib/createTestProject.ts";
import { sourceHashes } from "../lib/nativeSession.ts";

// The browser operator uses the actual signed-in editor. No browser cookies or
// management tokens enter the plugin, which receives no extra permissions.
const { values } = parseArgs({
  options: {
    site: { type: "string" },
    organization: { type: "string" },
    implementation: { type: "string" },
    output: { type: "string" },
    "editing-base": { type: "string" },
    variant: { type: "string", default: "field" },
  },
});
assert.match(values.site ?? "", /^\d+$/);
assert.ok(values.implementation && values.output && values["editing-base"]);
assert.ok(["field", "sidebar-modal"].includes(values.variant));
const output = resolve(values.output),
  source = resolve(values.implementation);
assert.ok(!existsSync(output), "Use a fresh evidence directory");
mkdirSync(output, { recursive: true, mode: 0o700 });
const previous = JSON.parse(readFileSync(join(source, "result.json")));
assert.equal(
  previous.status,
  "passed",
  "Use an independently verified plugin implementation",
);
assert.equal(
  previous.scenario,
  values.variant === "sidebar-modal"
    ? "plugin-sidebar-modal"
    : "plugin-localized-field-editor",
);
const workspace = join(source, "workspace"),
  dist = join(workspace, "dist");
const secrets = [];
const save = (name, data) =>
  writeFileSync(
    join(output, name),
    secrets.reduce(
      (text, secret) => text.replaceAll(secret, "[REDACTED]"),
      typeof data === "string" ? data : JSON.stringify(data, null, 2),
    ),
    { mode: 0o600 },
  );
const result = {
  scenario:
    values.variant === "sidebar-modal"
      ? "actual-hosted-plugin-sidebar-modal"
      : "actual-hosted-plugin-editor",
  status: "pending",
  modelCalls: 0,
  implementationHashes: sourceHashes(workspace, "src"),
  cleanup: "not-needed",
  harnessHashes: sourceHashes(
    resolve(import.meta.dirname, "../.."),
    "e2e/catalog",
  ),
};
let project, plugin, server, root, before;
async function snapshot(client) {
  const [site, models, uploads, plugins, environments, tokens] =
    await Promise.all([
      client.site.find(),
      client.itemTypes.list(),
      client.uploads.list(),
      client.plugins.list(),
      client.environments.list(),
      client.accessTokens.list(),
    ]);
  return {
    siteId: site.id,
    locales: site.locales,
    models: models.map((x) => x.id).sort(),
    uploads: uploads.map((x) => x.id).sort(),
    plugins: plugins.map((x) => x.id).sort(),
    environments: environments
      .map((x) => ({ id: x.id, primary: x.meta.primary }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    tokens: tokens.map((x) => x.id).sort(),
  };
}
try {
  const built = spawnSync("npm", ["run", "build"], {
    cwd: workspace,
    encoding: "utf8",
    timeout: 120000,
  });
  save("build.log", (built.stdout ?? "") + (built.stderr ?? ""));
  assert.equal(built.status, 0);
  const credentials = await readCredentials();
  assert.ok(credentials, "CLI OAuth required");
  secrets.push(credentials.apiToken);
  const site = await dashboardClient({
    apiToken: credentials.apiToken,
    organization: values.organization,
    ...(credentials.dashboardBaseUrl
      ? { baseUrl: credentials.dashboardBaseUrl }
      : {}),
  }).sites.find(values.site);
  secrets.push(site.access_token);
  root = buildClient({ apiToken: site.access_token });
  before = await snapshot(root);
  assert.equal(before.siteId, values.site);
  assert.deepEqual(before.models, []);
  assert.deepEqual(before.uploads, []);
  save("primary-before.json", before);
  process.env.E2E_DATOCMS_API_TOKEN = site.access_token;
  process.env.E2E_DATOCMS_SITE_ID = values.site;
  project = await createTestProject();
  result.cleanup = "pending";
  result.environment = project.environment;
  save("checkpoint.json", result);
  server = createServer((request, response) => {
    const path = resolve(
      dist,
      "." +
        decodeURIComponent(new URL(request.url, "http://localhost").pathname),
    );
    const file = path === dist ? join(dist, "index.html") : path;
    if (!file.startsWith(dist + "/") || !existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
      }[extname(file)] ?? "application/octet-stream",
    );
    response.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://localhost:${server.address().port}`;
  const client = project.cmaClient;
  await client.site.update({ locales: ["en", "it"] });
  plugin = await client.plugins.create({
    name: `Hosted title proof ${project.environment}`,
    url: origin,
    permissions: [],
  });
  save("checkpoint.json", { ...result, pluginId: plugin.id });
  const model = await client.itemTypes.create({
    name: "Hosted Editor Proof",
    api_key:
      values.variant === "sidebar-modal" ? "article" : "hosted_editor_proof",
    draft_mode_active: true,
  });
  const field = await client.fields.create(model.id, {
    label: "Title",
    api_key: "title",
    field_type: "string",
    localized: true,
    ...(values.variant === "field"
      ? {
          appearance: {
            editor: plugin.id,
            field_extension: "title-editor",
            parameters: {},
            addons: [],
          },
        }
      : {}),
  });
  await client.fields.create(model.id, {
    label: "Untouched note",
    api_key: "note",
    field_type: "string",
  });
  const record = await client.items.create({
    item_type: model,
    title: { en: "English original", it: "Italiano preservato" },
    note: "Unchanged sentinel",
  });
  const editorUrl = `${new URL(values["editing-base"]).origin}/environments/${project.environment}/editor/item_types/${model.id}/items/${record.id}/edit`;
  save("browser-task.json", {
    editorUrl,
    origin,
    pluginId: plugin.id,
    recordId: record.id,
    fieldId: field.id,
    instructions:
      values.variant === "sidebar-modal"
        ? "In the actual editor, open the Title tools sidebar and its Edit title modal. Change English Title to Hosted title proof with Apply, then save the record and reload to verify persistence. Leave Italian and Untouched note unchanged. Write finish.json with modalApplied and savedAndReloaded observations; the runner independently verifies saved CMA state."
        : "In the actual editor, change English Title through the plugin to Hosted title proof, save, reload, and verify the persisted value and character count. Leave Italian and Untouched note unchanged. Write finish.json with browser observations; the runner independently verifies saved CMA state.",
    expectedTitle: "Hosted title proof",
  });
  console.log(
    JSON.stringify({ status: "awaiting-browser", output, editorUrl }),
  );
  const deadline = Date.now() + 20 * 60 * 1000;
  while (!existsSync(join(output, "finish.json")) && Date.now() < deadline)
    await new Promise((r) => setTimeout(r, 500));
  assert.ok(
    existsSync(join(output, "finish.json")),
    "Hosted browser check timed out",
  );
  const observation = JSON.parse(readFileSync(join(output, "finish.json")));
  assert.equal(
    observation.savedAndReloaded,
    true,
    "Browser save/reload did not complete",
  );
  if (values.variant === "sidebar-modal")
    assert.equal(
      observation.modalApplied,
      true,
      "Hosted modal application was not observed",
    );
  const after = await client.items.find(record.id);
  assert.deepEqual(after.title, {
    en: "Hosted title proof",
    it: "Italiano preservato",
  });
  assert.equal(after.note, "Unchanged sentinel");
  save("record-after.json", after);
  result.checks = [
    "plugin rendered inside the actual hosted editor",
    ...(values.variant === "sidebar-modal"
      ? ["actual sidebar opens the custom modal and applies its returned title"]
      : []),
    "browser edit saved and survived reload",
    "independent CMA read verifies requested locale and preserves other locale and field",
  ];
  result.status = "passed";
} catch (error) {
  result.status = "failed";
  result.error = String(error.stack ?? error);
  process.exitCode = 1;
} finally {
  server?.closeAllConnections();
  await new Promise((r) => (server ? server.close(r) : r()));
  if (project) {
    try {
      try {
        if (plugin) await project.cmaClient.plugins.destroy(plugin.id);
      } finally {
        await destroyTestProject(project);
      }
      const after = await snapshot(root);
      save("primary-after.json", after);
      assert.deepEqual(after, before);
      result.cleanup = "verified";
    } catch (error) {
      result.cleanup = "failed";
      result.cleanupError = String(error);
      process.exitCode = 1;
    }
  }
  save("result.json", result);
  console.log(
    JSON.stringify({ output, status: result.status, cleanup: result.cleanup }),
  );
}
