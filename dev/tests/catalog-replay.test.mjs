import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { replayVisualApplication } from "../e2e/catalog/replay.mjs";
import { hostLoaders } from "../e2e/catalog/plugin-host-loaders.mjs";
import { replay as replaySchemaDiff } from "../e2e/catalog/schema-diff.mjs";

for (const scenario of ["public-site", "video-playback"])
  test(`${scenario} replay preserves model literals and requires the original scenario`, () => {
    const root = mkdtempSync(join(tmpdir(), "public-site-replay-"));
    const previous = join(root, "previous"),
      workspace = join(root, "recheck");
    try {
      for (const directory of [
        "previous/native",
        "previous/workspace/src",
        "previous/workspace/node_modules",
        "recheck",
      ])
        mkdirSync(join(root, directory), { recursive: true });
      writeFileSync(
        join(previous, "result.json"),
        JSON.stringify({
          scenario,
          siteId: "123",
          environment: "e2e-old",
          framework: "nextjs",
        }),
      );
      writeFileSync(
        join(previous, "native/provenance.json"),
        JSON.stringify({ prompt: "Render published content from e2e-old." }),
      );
      const original =
        "export const environment='e2e-old'; export const model='literal-model-id';";
      writeFileSync(join(previous, "workspace/src/query.ts"), original);
      const options = {
        previous,
        workspace,
        project: { siteId: "123", environment: "e2e-new" },
        state: { framework: "nextjs" },
        save: () => {},
      };
      assert.throws(() => replayVisualApplication(options), /visual-editing/);
      replayVisualApplication({ ...options, scenario });
      assert.equal(
        readFileSync(join(workspace, "src/query.ts"), "utf8"),
        original.replace("e2e-old", "e2e-new"),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

test("schema diff rechecks preserve generated IDs without copying private authentication or an old CLI launcher", () => {
  const root = mkdtempSync(join(tmpdir(), "schema-replay-"));
  const previous = join(root, "previous"),
    workspace = join(root, "recheck");
  try {
    for (const dir of [
      "previous/workspace/scripts",
      "previous/workspace/migrations",
      "previous/workspace/bin",
      "recheck/bin",
    ])
      mkdirSync(join(root, dir), { recursive: true });
    writeFileSync(
      join(previous, "result.json"),
      JSON.stringify({ scenario: "schema-diff", siteId: "123" }),
    );
    const migration =
      "export default async c => c.itemTypes.create({id:'original-id',api_key:'article'});";
    writeFileSync(
      join(previous, "workspace/migrations/001_schema.ts"),
      migration,
    );
    writeFileSync(
      join(previous, "workspace/scripts/generate.mjs"),
      "export const environment=process.env.DATOCMS_ENVIRONMENT;",
    );
    writeFileSync(
      join(previous, "workspace/.env"),
      "SECRET=synthetic-private-value",
    );
    writeFileSync(join(previous, "workspace/bin/datocms"), "old launcher");
    writeFileSync(join(workspace, "bin/datocms"), "fresh launcher");
    let evidence;
    replaySchemaDiff({
      previous,
      workspace,
      project: { siteId: "123" },
      save: (_name, value) => {
        evidence = value;
      },
    });
    assert.equal(
      readFileSync(join(workspace, "migrations/001_schema.ts"), "utf8"),
      migration,
    );
    assert.equal(
      readFileSync(join(workspace, "bin/datocms"), "utf8"),
      "fresh launcher",
    );
    assert.equal(existsSync(join(workspace, ".env")), false);
    assert.equal(evidence.modelCalls, 0);
    assert.equal(evidence.files.length, 2);
    assert.throws(() =>
      replaySchemaDiff({
        previous,
        workspace,
        project: { siteId: "456" },
        save: () => {},
      }),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("visual recheck preserves implementation logic and excludes credentials and old evaluator files", () => {
  const root = mkdtempSync(join(tmpdir(), "catalog-replay-"));
  const previous = join(root, "previous"),
    workspace = join(root, "recheck");
  const saveOutputs = {};
  try {
    for (const directory of [
      "previous/native",
      "previous/workspace/src",
      "previous/workspace/node_modules",
      "recheck",
    ])
      mkdirSync(join(root, directory), { recursive: true });
    writeFileSync(
      join(previous, "result.json"),
      JSON.stringify({
        scenario: "visual-editing",
        siteId: "123",
        environment: "e2e-old",
        framework: "nuxt",
      }),
    );
    writeFileSync(
      join(previous, "native/provenance.json"),
      JSON.stringify({
        prompt: "Map the catalog_article model model-old to /articles/<slug>.",
      }),
    );
    writeFileSync(
      join(previous, "workspace/nuxt.config.ts"),
      "export default defineNuxtConfig({});",
    );
    writeFileSync(
      join(previous, "workspace/app.vue"),
      "<template><div>e2e-old model-old</div></template>",
    );
    const original =
      "export const environment='e2e-old'; export const model='model-old'; export const query='query { allCatalogArticles { title } }';";
    writeFileSync(join(previous, "workspace/src/query.ts"), original);
    writeFileSync(
      join(previous, "workspace/package.json"),
      '{"type":"module"}',
    );
    writeFileSync(
      join(previous, "workspace/.env.local"),
      "SECRET=synthetic-private-value",
    );
    writeFileSync(
      join(previous, "workspace/old-evaluator.mjs"),
      "throw Error('must not be copied')",
    );
    const options = {
      previous,
      workspace,
      project: { siteId: "123", environment: "e2e-new" },
      state: {
        framework: "nuxt",
        records: [{ item_type: { id: "model-new" } }],
      },
      save: (name, data) => {
        saveOutputs[name] = data;
      },
    };
    replayVisualApplication(options);
    assert.equal(
      readFileSync(join(workspace, "src/query.ts"), "utf8"),
      original
        .replaceAll("e2e-old", "e2e-new")
        .replaceAll("model-old", "model-new"),
    );
    assert.equal(
      readFileSync(join(workspace, "app.vue"), "utf8"),
      "<template><div>e2e-new model-new</div></template>",
    );
    assert.equal(existsSync(join(workspace, "nuxt.config.ts")), true);
    assert.throws(
      () =>
        replayVisualApplication({
          ...options,
          state: { ...options.state, framework: "astro" },
        }),
      /original framework/,
    );
    assert.equal(existsSync(join(workspace, ".env.local")), false);
    assert.equal(existsSync(join(workspace, "old-evaluator.mjs")), false);
    assert.equal(saveOutputs["replay.json"].modelCalls, 0);
    const source = saveOutputs["replay.json"].files.find(
      (f) => f.path === "src/query.ts",
    );
    assert.equal(source.rebound, true);
    assert.notEqual(source.before, source.after);
    assert.throws(
      () =>
        replayVisualApplication({
          ...options,
          project: { siteId: "456", environment: "e2e-new" },
        }),
      /123/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fake plugin hosts answer every SDK loader the plugin skill tells plugins to call", async () => {
  // The SDK builds ctx from the host's methods, so a loader the host lacks never resolves and the plugin stalls.
  const skill = resolve(import.meta.dirname, "../../skills/datocms-plugin");
  const text = readdirSync(skill, { recursive: true })
    .filter((path) => path.endsWith(".md"))
    .map((path) => readFileSync(join(skill, path), "utf8"))
    .join("\n");
  const documented = [...new Set([...text.matchAll(/ctx\.(load\w+)\(/g)].map((m) => m[1]))];
  assert.ok(documented.includes("loadItemTypeFields"), documented.join(", "));
  const title = { id: "title", relationships: { item_type: { data: { id: "article" } } } };
  const loaders = hostLoaders(() => ({ fields: { title }, fieldsets: {}, users: {} }));
  assert.deepEqual(documented.filter((name) => typeof loaders[name] !== "function"), []);
  assert.deepEqual(await loaders.loadItemTypeFields("article"), [title]);
  assert.deepEqual(await loaders.loadItemTypeFields("other"), []);
  for (const host of ["plugin-check.mjs", "plugin-modal-check.mjs"]) {
    const source = readFileSync(resolve(import.meta.dirname, "../e2e/catalog", host), "utf8");
    assert.match(source, /\.\.\.hostLoaders\(/, `${host} does not expose the loaders`);
  }
});
