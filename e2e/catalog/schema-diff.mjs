import assert from "node:assert/strict";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  cpSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { buildBlockRecord } from "@datocms/cma-client-node";

async function snapshot(client) {
  const models = (await client.itemTypes.list()).sort((a, b) =>
    a.api_key.localeCompare(b.api_key),
  );
  const result = [];
  for (const model of models)
    result.push({
      model,
      fields: await client.fields.list(model.id),
      records: model.modular_block
        ? []
        : await client.items.list({ filter: { type: model.id } }),
    });
  return result;
}

export function replay({ previous, workspace, project, save }) {
  previous = resolve(previous);
  const prior = JSON.parse(readFileSync(join(previous, "result.json")));
  assert.equal(prior.scenario, "schema-diff");
  assert.equal(prior.siteId, project.siteId);
  const source = join(previous, "workspace"),
    files = [];
  for (const name of [
    "scripts",
    "migrations",
    "package.json",
    "package-lock.json",
  ]) {
    if (!existsSync(join(source, name))) continue;
    cpSync(join(source, name), join(workspace, name), { recursive: true });
    const inspect = (path, relative) => {
      const entries = readdirSync(path, { withFileTypes: true });
      for (const entry of entries) {
        const file = join(path, entry.name),
          label = join(relative, entry.name);
        if (entry.isDirectory()) inspect(file, label);
        else if (entry.isFile())
          files.push({
            path: label,
            sha256: createHash("sha256")
              .update(readFileSync(file))
              .digest("hex"),
          });
      }
    };
    if (["scripts", "migrations"].includes(name))
      inspect(join(workspace, name), name);
    else
      files.push({
        path: name,
        sha256: createHash("sha256")
          .update(readFileSync(join(workspace, name)))
          .digest("hex"),
      });
  }
  save("replay.json", {
    previous,
    modelCalls: 0,
    files,
    note: "Original helper and generated migration copied byte-for-byte. The runner supplies fresh environment authentication; generated schema IDs and application logic are unchanged.",
  });
}

function schemaContract(rows) {
  const names = new Map(rows.map(({ model }) => [model.id, model.api_key]));
  return rows.map(({ model, fields }) => ({
    key: model.api_key,
    modular: model.modular_block,
    draft: model.draft_mode_active,
    fields: fields
      .map((f) => {
        const validators = structuredClone(f.validators);
        if (validators.rich_text_blocks)
          validators.rich_text_blocks.item_types =
            validators.rich_text_blocks.item_types
              .map((id) => names.get(id) ?? id)
              .sort();
        return {
          key: f.api_key,
          type: f.field_type,
          localized: f.localized,
          validators,
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key)),
  }));
}

export async function prepare({ project, workspace, save }) {
  const client = project.cmaClient;
  await client.site.update({ locales: ["en", "it"] });
  const block = await client.itemTypes.create({
    name: "Feature card",
    api_key: "feature_card",
    modular_block: true,
  });
  await client.fields.create(block.id, {
    label: "Heading",
    api_key: "heading",
    field_type: "string",
    validators: { required: {} },
  });
  const page = await client.itemTypes.create({
    name: "Landing page",
    api_key: "landing_page",
    draft_mode_active: true,
  });
  await client.fields.create(page.id, {
    label: "Title",
    api_key: "title",
    field_type: "string",
    localized: true,
    validators: { required: {} },
  });
  await client.fields.create(page.id, {
    label: "Sections",
    api_key: "sections",
    field_type: "rich_text",
    validators: { rich_text_blocks: { item_types: [block.id] } },
  });
  await client.items.create({
    item_type: page,
    title: { en: "Source content must not migrate", it: "Contenuto sorgente" },
    sections: [buildBlockRecord({ item_type: block, heading: "Source card" })],
  });
  mkdirSync(join(workspace, "migrations"), { recursive: true });
  const before = await snapshot(client);
  save("schema-before.json", before);
  return { before, page, block };
}

export function prompt({ project }) {
  return `Set up the thin DatoCMS migration-autogenerate helper in this existing CLI project and use it to generate one TypeScript migration that captures the schema changes in sandbox ${project.environment} compared with the empty primary. Add a repeatable package script and preserve environment-provided authentication. This task only generates a schema migration for review: do not execute migrations or change any CMS content, schema or environment. Explain what the generated file includes and what it does not copy. The evaluator will apply the file separately to an empty disposable target.`;
}

export async function check({ project, state, workspace, environment, save }) {
  const client = project.cmaClient;
  assert.deepEqual(
    await snapshot(client),
    state.before,
    "Generating the diff changed source schema or records",
  );
  const pkg = JSON.parse(readFileSync(join(workspace, "package.json")));
  assert.ok(
    Object.entries(pkg.scripts ?? {}).some(([key, value]) =>
      /diff|autogenerat/i.test(`${key} ${value}`),
    ),
    "Missing repeatable diff helper script",
  );
  const files = readdirSync(join(workspace, "migrations")).filter((name) =>
    /^\d+.*\.ts$/.test(name),
  );
  assert.equal(files.length, 1, "Expected one generated TypeScript migration");
  const expected = schemaContract(state.before);
  // Generation has been verified as read-only. Reuse this owned sandbox as a
  // clean application target; source records deliberately must not be copied.
  await client.itemTypes.destroy(state.page.id);
  await client.itemTypes.destroy(state.block.id);
  const run = spawnSync(
    process.execPath,
    [
      join(
        resolve(import.meta.dirname, "../.."),
        "node_modules/datocms/bin/run",
      ),
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
  save("generated-migration-run.log", (run.stdout ?? "") + (run.stderr ?? ""));
  assert.equal(run.status, 0, "Generated migration failed on the empty target");
  const actual = (await snapshot(client)).filter(
    (entry) => entry.model.api_key !== "schema_migration",
  );
  assert.deepEqual(schemaContract(actual), expected);
  for (const entry of actual)
    assert.deepEqual(entry.records, [], "Schema diff copied source content");
  const tracker = await client.itemTypes.find("schema_migration");
  assert.deepEqual(
    (await client.items.list({ filter: { type: tracker.id } })).map(
      (r) => r.name,
    ),
    files,
  );
  save("applied-schema.json", actual);
  return [
    "diff generation and helper setup preserve the source schema and records",
    "generated TypeScript migration executes on an empty target through the CLI",
    "localized fields, validators, draft mode and block allowlist are recreated",
    "source content is excluded and migration tracking is recorded",
  ];
}
