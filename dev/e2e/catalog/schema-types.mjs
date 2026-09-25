import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

async function snapshot(client) {
  const models = await client.itemTypes.list();
  return Promise.all(
    models
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(async (model) => ({
        model,
        fields: await client.fields.list(model.id),
        records: await client.items.list({ filter: { type: model.id } }),
      })),
  );
}

export async function prepare({ project, save }) {
  const client = project.cmaClient;
  await client.site.update({ locales: ["en", "it"] });
  const author = await client.itemTypes.create({
    name: "Author",
    api_key: "author",
  });
  await client.fields.create(author.id, {
    label: "Name",
    api_key: "name",
    field_type: "string",
  });
  const article = await client.itemTypes.create({
    name: "Article",
    api_key: "article",
  });
  for (const field of [
    { label: "Title", api_key: "title", field_type: "string", localized: true },
    { label: "Views", api_key: "views", field_type: "integer" },
    {
      label: "Author",
      api_key: "author",
      field_type: "link",
      validators: { item_item_type: { item_types: [author.id] } },
    },
  ])
    await client.fields.create(article.id, field);
  await client.itemTypes.create({ name: "Unrelated", api_key: "unrelated" });
  const writer = await client.items.create({
    item_type: author,
    name: "Preserved author",
  });
  await client.items.create({
    item_type: article,
    title: { en: "Preserved English", it: "Italiano" },
    views: 17,
    author: writer.id,
  });
  const before = await snapshot(client);
  save("schema-before.json", before);
  return { before, article, author };
}

export function prompt({ project }) {
  return `Inspect the actual schema of sandbox ${project.environment} using the DatoCMS CLI. Generate reusable TypeScript CMA schema definitions into src/lib/datocms/cma-types.ts for the article model and its dependencies only; unrelated models should be excluded. Add a repeatable package script that uses the configured sandbox and environment-provided authentication, then run it. Summarize the discovered article fields and localization. This is read-only CMS work: preserve every model, field and record, and never change primary. Do not replace generated types with handwritten approximations or add credentials to files.`;
}

export async function check({
  project,
  state,
  workspace,
  output,
  environment,
  save,
}) {
  const generated = readFileSync(
    join(workspace, "src/lib/datocms/cma-types.ts"),
    "utf8",
  );
  assert.ok(generated.includes(state.article.id));
  assert.ok(generated.includes(state.author.id));
  const pkg = JSON.parse(readFileSync(join(workspace, "package.json")));
  const script = Object.entries(pkg.scripts ?? {}).find(([, value]) =>
    value.includes("schema:generate"),
  );
  assert.ok(script, "Missing repeatable schema generation script");
  const session = JSON.parse(readFileSync(join(output, "native/session.json")));
  const usedSchemaInspect = session.commands.some((c) =>
    c.command.includes("schema:inspect"),
  );
  writeFileSync(
    join(workspace, "type-proof.ts"),
    `import type {Client} from '@datocms/cma-client-node';
import * as Schema from './src/lib/datocms/cma-types';
async function proof(client:Client){
 const article=await client.items.find<Schema.Article>('unused');
 const title:string|null|undefined=article.title.en;
 const views:number|null|undefined=article.views;
 const author:string|null|undefined=article.author;
 const modelId:string=Schema.Article.ID;
 const linkedModelId:string=Schema.Author.ID;
 // @ts-expect-error Unknown fields must not become any.
 article.nonexistent;
 // @ts-expect-error A localized title is not a number.
 const invalid:number=article.title.en;
}
// @ts-expect-error Unrelated models must be excluded by the requested scope.
type Excluded = Schema.Unrelated;
`,
  );
  const compiled = spawnSync(
    process.execPath,
    [
      join(workspace, "node_modules/typescript/bin/tsc"),
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--target",
      "ES2022",
      "type-proof.ts",
    ],
    { cwd: workspace, encoding: "utf8", timeout: 60000 },
  );
  save("type-proof.log", (compiled.stdout ?? "") + (compiled.stderr ?? ""));
  assert.equal(compiled.status, 0, "Generated type contract failed");
  const rerun = spawnSync("npm", ["run", script[0]], {
    cwd: workspace,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...environment },
    encoding: "utf8",
    timeout: 120000,
  });
  save("generation-rerun.log", (rerun.stdout ?? "") + (rerun.stderr ?? ""));
  assert.equal(rerun.status, 0);
  assert.equal(
    readFileSync(join(workspace, "src/lib/datocms/cma-types.ts"), "utf8"),
    generated,
    "Generation is not stable on the unchanged schema",
  );
  assert.deepEqual(
    await snapshot(project.cmaClient),
    state.before,
    "Read-only generation changed CMS state",
  );
  return [
    ...(usedSchemaInspect ? ["real CLI schema inspection"] : []),
    "real CLI scoped schema generation",
    "linked model included and unrelated model excluded",
    "localized strings and numeric fields retain compile-time types",
    "repeatable generation preserves all CMS state",
  ];
}
