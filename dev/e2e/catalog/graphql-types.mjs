import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import * as cda from "./cda.mjs";
import { configureFramework } from "./frameworks.mjs";

export const transport = "cda";
export const cleanup = cda.cleanup;
export const configure = configureFramework;

export async function prepare(options) {
  const state = await cda.prepare(options);
  state.framework = "nextjs";
  state.before = await options.project.cmaClient.items.list({
    filter: { type: state.records[0].item_type.id },
  });
  return state;
}

export function prompt({ project }) {
  return `Set up gql.tada query typing in this existing Next.js TypeScript project. Generate the GraphQL schema and TypeScript introspection from the real DatoCMS sandbox ${project.environment}, using the published read-only token from DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN and DATOCMS_ENVIRONMENT. Put the initialized graphql helper at src/lib/datocms/graphql.ts and provide a repeatable package generation script suitable for a fresh CI checkout. Preserve the existing app and scripts. Run generation and verify a typed catalogArticle query with a slug variable and title/sortIndex fields. Do not hardcode credentials, handwrite schema types, configure CMA types, or change CMS content or schema.`;
}

export async function check({ project, state, workspace, environment, save }) {
  const pkg = JSON.parse(readFileSync(join(workspace, "package.json")));
  const script = Object.entries(pkg.scripts ?? {}).find(
    ([key, value]) => /generat/.test(key) && /schema|tada/.test(value),
  );
  assert.ok(script, "Missing repeatable GraphQL generation script");
  const rerun = spawnSync("npm", ["run", script[0]], {
    cwd: workspace,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...environment },
    encoding: "utf8",
    timeout: 120000,
  });
  save("generation-rerun.log", (rerun.stdout ?? "") + (rerun.stderr ?? ""));
  assert.equal(rerun.status, 0, "Independent generation failed");
  writeFileSync(
    join(workspace, "typed-query-proof.ts"),
    `import {graphql} from './src/lib/datocms/graphql';
import type {ResultOf,VariablesOf} from 'gql.tada';
export const query=graphql('query TypedCatalogProof($slug: String!) { catalogArticle(filter: {slug: {eq: $slug}}) { title sortIndex } }');
type Result=ResultOf<typeof query>;
type IsAny<T> = 0 extends (1 & T) ? true : false;
function checkTypes(result:Result){
 const title:string|null|undefined=result.catalogArticle?.title;
 const index:number|null|undefined=result.catalogArticle?.sortIndex;
 const resultIsTyped:false=null! as IsAny<Result>;
 // @ts-expect-error Unknown fields must be rejected.
 result.catalogArticle?.nonexistent;
 // @ts-expect-error A title is not numeric.
 const badTitle:number=result.catalogArticle?.title;
 // @ts-expect-error Slug variables must be strings.
 const badVariable:VariablesOf<typeof query>={slug:123};
}
`,
  );
  writeFileSync(
    join(workspace, "type-proof.tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        module: "ESNext",
        moduleResolution: "Bundler",
        target: "ES2022",
      },
      files: ["typed-query-proof.ts"],
    }),
  );
  const compiled = spawnSync(
    process.execPath,
    [
      join(workspace, "node_modules/typescript/bin/tsc"),
      "--project",
      "type-proof.tsconfig.json",
    ],
    { cwd: workspace, encoding: "utf8", timeout: 60000 },
  );
  save("type-proof.log", (compiled.stdout ?? "") + (compiled.stderr ?? ""));
  assert.equal(compiled.status, 0, "GraphQL result or variable typing failed");
  writeFileSync(
    join(workspace, "typed-runtime-proof.ts"),
    `import {query} from './typed-query-proof';
import {executeQuery} from '@datocms/cda-client';
const data=await executeQuery(query,{token:process.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN!,environment:process.env.DATOCMS_ENVIRONMENT,variables:{slug:'article-0'}});
console.log(JSON.stringify(data));
`,
  );
  await build({
    entryPoints: [join(workspace, "typed-runtime-proof.ts")],
    outfile: join(workspace, "typed-runtime-proof.mjs"),
    bundle: true,
    packages: "external",
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  const executed = spawnSync(process.execPath, ["typed-runtime-proof.mjs"], {
    cwd: workspace,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...environment },
    encoding: "utf8",
    timeout: 60000,
  });
  save("typed-runtime.log", (executed.stdout ?? "") + (executed.stderr ?? ""));
  assert.equal(
    executed.status,
    0,
    "Generated typed query failed against the real CDA",
  );
  assert.deepEqual(JSON.parse(executed.stdout), {
    catalogArticle: { title: `English 0 ${state.marker}`, sortIndex: 0 },
  });
  assert.deepEqual(
    await project.cmaClient.items.list({
      filter: { type: state.records[0].item_type.id },
    }),
    state.before,
  );
  return [
    "schema and introspection generation rerun against the selected sandbox",
    "query results and variables retain useful types and reject invalid access",
    "generated typed document executes against real published CDA content",
    "generation and verification leave CMS content unchanged",
  ];
}
