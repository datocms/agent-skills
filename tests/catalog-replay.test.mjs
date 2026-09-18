import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { replayVisualApplication } from "../e2e/catalog/replay.mjs";

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
      }),
    );
    writeFileSync(
      join(previous, "native/provenance.json"),
      JSON.stringify({
        prompt: "Map the catalog_article model model-old to /articles/<slug>.",
      }),
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
      state: { records: [{ item_type: { id: "model-new" } }] },
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
