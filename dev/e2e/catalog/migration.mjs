import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "../..");
export async function prepare({ project, workspace, save }) {
  const client = project.cmaClient;
  // Reproduce the state left by a migration that failed after the first write.
  // The failed migration has no tracking row; the source record must survive.
  const model = await client.itemTypes.create({
    name: "Catalog Product",
    api_key: "catalog_product",
  });
  await client.fields.create(model.id, {
    label: "Name",
    api_key: "name",
    field_type: "string",
  });
  const record = await client.items.create({
    item_type: model,
    name: "Original inventory sentinel",
  });
  mkdirSync(join(workspace, "migrations"), { recursive: true });
  writeFileSync(
    join(workspace, "migrations/001_create_catalog_product.ts"),
    `import type {Client} from '@datocms/cma-client-node';
export default async function(client:Client){
  const model=await client.itemTypes.create({name:'Catalog Product',api_key:'catalog_product'});
  await client.fields.create(model.id,{label:'Name',api_key:'name',field_type:'string'});
  throw new Error('Previous deployment interrupted after schema creation');
}
`,
  );
  save("fixture.json", {
    modelId: model.id,
    recordId: record.id,
    state: "partial migration, not recorded as applied",
  });
  return { model, record };
}
export function prompt({ project }) {
  return `Recover this project's interrupted migration, then add a new migration for catalog_product.price (float) and catalog_product.sku (string). The previous attempt left the catalog_product model and name field in disposable sandbox ${project.environment}, but failed before it was recorded as applied. The existing record must remain untouched. Repair the migration so it safely completes from this partial state and also works on a clean target, then create the separate additive migration. Run the migrations for real using the installed DatoCMS CLI, in place only on sandbox ${project.environment}, and verify a second run is a no-op. Credentials are in DATOCMS_API_TOKEN. Preserve migration tracking through the CLI; do not manually insert or remove tracking records. No promotion, primary changes or environment operations are authorized.`;
}
async function snapshot(client) {
  const models = await client.itemTypes.list();
  const rows = [];
  for (const model of models)
    rows.push({
      id: model.id,
      key: model.api_key,
      fields: (await client.fields.list(model.id))
        .map((f) => ({ id: f.id, key: f.api_key, type: f.field_type }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      records: await client.items.list({
        filter: { type: model.id },
        page: { limit: 100 },
      }),
    });
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}
export async function check({ project, state, workspace, environment, save }) {
  const client = project.cmaClient;
  const files = readdirSync(join(workspace, "migrations")).filter((f) =>
    /^\d+.*\.(ts|js)$/.test(f),
  );
  assert.equal(
    files.length,
    2,
    "Expected repair plus separate additive migration",
  );
  const model = await client.itemTypes.find("catalog_product");
  assert.equal(model.id, state.model.id);
  const fields = Object.fromEntries(
    (await client.fields.list(model.id)).map((f) => [f.api_key, f.field_type]),
  );
  assert.deepEqual(fields, { name: "string", price: "float", sku: "string" });
  const record = await client.items.find(state.record.id);
  assert.equal(record.name, state.record.name);
  const tracker = await client.itemTypes.find("schema_migration");
  const tracked = await client.items.list({
    filter: { type: tracker.id },
    page: { limit: 100 },
  });
  assert.deepEqual(tracked.map((r) => r.name).sort(), files.sort());
  const before = await snapshot(client);
  const rerun = spawnSync(
    process.execPath,
    [
      join(root, "node_modules/datocms/bin/run"),
      "migrations:run",
      `--source=${project.environment}`,
      "--in-place",
      "--json",
    ],
    {
      cwd: workspace,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, ...environment },
      encoding: "utf8",
      timeout: 120000,
    },
  );
  save("independent-rerun.log", (rerun.stdout ?? "") + (rerun.stderr ?? ""));
  assert.equal(rerun.status, 0, "Independent migration rerun failed");
  assert.deepEqual(
    await snapshot(client),
    before,
    "Rerun changed schema or records",
  );
  save("recovered-state.json", before);
  // Reuse the owned sandbox to check the repaired files from an empty schema,
  // avoiding another concurrent environment or any primary-environment writes.
  assert.ok(project.environment.startsWith("e2e-"));
  assert.deepEqual(before.map((m) => m.key).sort(), [
    "catalog_product",
    "schema_migration",
  ]);
  await client.itemTypes.destroy(model.id);
  await client.itemTypes.destroy(tracker.id);
  const fresh = spawnSync(
    process.execPath,
    [
      join(root, "node_modules/datocms/bin/run"),
      "migrations:run",
      `--source=${project.environment}`,
      "--in-place",
      "--json",
    ],
    {
      cwd: workspace,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, ...environment },
      encoding: "utf8",
      timeout: 120000,
    },
  );
  save("clean-target-run.log", (fresh.stdout ?? "") + (fresh.stderr ?? ""));
  assert.equal(fresh.status, 0, "Repaired migrations fail on a clean target");
  const freshModel = await client.itemTypes.find("catalog_product");
  assert.deepEqual(
    Object.fromEntries(
      (await client.fields.list(freshModel.id)).map((f) => [
        f.api_key,
        f.field_type,
      ]),
    ),
    fields,
  );
  const freshTracker = await client.itemTypes.find("schema_migration");
  assert.deepEqual(
    (await client.items.list({ filter: { type: freshTracker.id } }))
      .map((r) => r.name)
      .sort(),
    files.sort(),
  );
  return [
    "partial migration recovered without replacing model or record",
    "new fields created by a separate tracked migration",
    "independent CLI rerun leaves schema and records unchanged",
    "repaired migrations also execute on a clean sandbox schema",
  ];
}
