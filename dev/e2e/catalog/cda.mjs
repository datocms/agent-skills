import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { buildBlockRecord } from "@datocms/cma-client-node";
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { chromium } from "./plugin/node_modules/playwright/index.mjs";
import { executeQuery } from "./web/node_modules/@datocms/cda-client/dist/esm/index.js";

export const transport = "cda";
export async function prepare({ project, workspace, secrets, save, variant }) {
  assert.ok(!variant || variant === "inline-blocks", "Unknown CDA variant");
  const client = project.cmaClient;
  await client.site.update({ locales: ["en", "it"] });
  const author = await client.itemTypes.create({
    name: "Catalog Author",
    api_key: "catalog_author",
  });
  await client.fields.create(author.id, {
    label: "Name",
    api_key: "name",
    field_type: "string",
  });
  const quote = await client.itemTypes.create({
    name: "Catalog Quote",
    api_key: "catalog_quote",
    modular_block: true,
  });
  await client.fields.create(quote.id, {
    label: "Quote",
    api_key: "quote",
    field_type: "text",
  });
  let badge;
  if (variant === "inline-blocks") {
    badge = await client.itemTypes.create({
      name: "Catalog Badge",
      api_key: "catalog_badge",
      modular_block: true,
    });
    await client.fields.create(badge.id, {
      label: "Label",
      api_key: "label",
      field_type: "string",
    });
  }
  const article = await client.itemTypes.create({
    name: "Catalog Article",
    api_key: "catalog_article",
    draft_mode_active: true,
  });
  for (const field of [
    { label: "Title", api_key: "title", field_type: "string", localized: true },
    { label: "Sort index", api_key: "sort_index", field_type: "integer" },
    { label: "Slug", api_key: "slug", field_type: "string" },
    {
      label: "Body",
      api_key: "body",
      field_type: "structured_text",
      localized: true,
      validators: {
        structured_text_blocks: { item_types: [quote.id] },
        structured_text_links: { item_types: [author.id] },
        structured_text_inline_blocks: { item_types: badge ? [badge.id] : [] },
      },
    },
  ])
    await client.fields.create(article.id, field);
  const marker = randomUUID().slice(0, 8);
  const writer = await client.items.create({
    item_type: author,
    name: `Writer ${marker}`,
  });
  await client.items.publish(writer.id);
  const records = [];
  const body = (locale, i) => ({
    schema: "dast",
    document: {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            { type: "span", value: `${locale} prose ${i} ${marker} ` },
            { type: "inlineItem", item: writer.id },
            { type: "span", value: " read " },
            ...(badge
              ? [
                  {
                    type: "inlineBlock",
                    item: buildBlockRecord({
                      item_type: badge,
                      label: `${locale} badge ${i} ${marker}`,
                    }),
                  },
                ]
              : []),
            {
              type: "itemLink",
              item: writer.id,
              children: [{ type: "span", value: "Author profile" }],
            },
          ],
        },
        {
          type: "block",
          item: buildBlockRecord({
            item_type: quote,
            quote: `${locale} quotation ${i} ${marker}`,
          }),
        },
      ],
    },
  });
  for (let i = 0; i < 4; i++) {
    const record = await client.items.create({
      item_type: article,
      title: {
        en: `English ${i} ${marker}`,
        it: i === 1 ? null : `Italiano ${i} ${marker}`,
      },
      sort_index: i,
      slug: `article-${i}`,
      body: { en: body("en", i), it: body("it", i) },
    });
    if (i < 3) await client.items.publish(record.id);
    records.push(record);
  }
  await client.items.update(records[0].id, {
    title: { en: `Draft English ${marker}`, it: `Bozza ${marker}` },
  });
  const role = (await client.roles.list()).find(
    (role) => role.can_edit_schema && role.environments_access === "all",
  );
  assert.ok(
    role,
    "Fixture requires an existing administrative role; it never changes roles",
  );
  project.catalogTokenIds = [];
  const environment = { DATOCMS_ENVIRONMENT: project.environment };
  for (const [name, preview] of [
    ["DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN", false],
    ["DATOCMS_DRAFT_CONTENT_CDA_TOKEN", true],
  ]) {
    const token = await client.accessTokens.create({
      name: `Catalog ${project.environment} ${preview ? "draft" : "published"}`,
      can_access_cma: false,
      can_access_cda: true,
      can_access_cda_preview: preview,
      role: { id: role.id, type: "role" },
    });
    project.catalogTokenIds.push(token.id);
    assert.ok(token.token);
    secrets.push(token.token);
    environment[name] = token.token;
  }
  // Establish CDA readiness before evaluating generated code. A setup failure is
  // an infrastructure failure, not a negative skill result.
  const expected = records.slice(0, 3).map((r) => r.id);
  let ready = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    const data = await executeQuery(
      "{ allCatalogArticles(orderBy: sortIndex_ASC) { id } }",
      {
        token: environment.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN,
        environment: project.environment,
      },
    );
    if (
      JSON.stringify(data.allCatalogArticles.map((r) => r.id)) ===
      JSON.stringify(expected)
    ) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.ok(ready, "CDA fixture did not become ready");
  mkdirSync(join(workspace, "src"), { recursive: true });
  writeFileSync(
    join(workspace, "SCHEMA.md"),
    "Models: catalog_article (localized title, localized Structured Text body, integer sort_index, string slug); catalog_quote block (text quote); catalog_author (string name). Body contains quote blocks, inline authors, and links to authors. " +
      (badge
        ? "It also contains catalog_badge inline blocks with a string label. "
        : "") +
      "GraphQL introspection is available through the real CDA.\n",
  );
  save("fixture.json", {
    marker,
    recordIds: records.map((r) => r.id),
    authorId: writer.id,
  });
  return {
    environment,
    marker,
    records,
    authorId: writer.id,
    variant: variant ?? "empty-inline-allowlist",
  };
}
export function prompt({ project }) {
  return `Implement src/catalog.tsx for this server-side React application. Export async function renderCatalog({locale,first,skip,preview}) returning {html,total,ids}. Query the real DatoCMS CDA in environment ${project.environment}; the published and draft read-only tokens are already provided in DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN and DATOCMS_DRAFT_CONTENT_CDA_TOKEN. Load catalog articles ordered by sort_index, paginate with first/skip, return the total matching count, and choose draft content only when preview is true. Use the requested locale with English fallback for missing translations. Render article titles as h2 and complete Structured Text bodies, including quotation blocks, inline author names, and author-profile links to /authors/<record-id>. Return server-rendered HTML plus the visible record IDs. Inspect SCHEMA.md and the API schema as needed. Use the installed CDA and rendering libraries. Do not mutate CMS content or hardcode content from API responses. This module runs server-side; do not expose credentials in output.`;
}
export async function check({
  project,
  state,
  workspace,
  output,
  save,
  environment,
}) {
  const outfile = join(workspace, "catalog-check-bundle.mjs");
  await build({
    entryPoints: [join(workspace, "src/catalog.tsx")],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    jsx: "automatic",
  });
  const script = `import {renderCatalog} from './catalog-check-bundle.mjs';const outputs=[];for(const args of [{locale:'it',first:2,skip:0,preview:false},{locale:'en',first:2,skip:2,preview:false},{locale:'it',first:10,skip:0,preview:true},{locale:'it',first:2,skip:20,preview:false}])outputs.push(await renderCatalog(args));console.log(JSON.stringify(outputs));`;
  writeFileSync(join(workspace, "catalog-check.mjs"), script);
  const run = spawnSync(process.execPath, ["catalog-check.mjs"], {
    cwd: workspace,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...environment },
    encoding: "utf8",
    timeout: 90000,
  });
  save("execution.log", run.stderr ?? "");
  assert.equal(run.status, 0, "Generated CDA renderer failed");
  const outputs = JSON.parse(run.stdout);
  save("rendered.json", outputs);
  const expectedIds = [
    state.records.slice(0, 2),
    state.records.slice(2, 3),
    state.records,
    [],
  ].map((rows) => rows.map((r) => r.id));
  const browser = await chromium.launch({
    channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
    headless: true,
  });
  const checks = [];
  try {
    const page = await browser.newPage();
    for (let i = 0; i < outputs.length; i++) {
      assert.deepEqual(outputs[i].ids, expectedIds[i]);
      assert.equal(outputs[i].total, i === 2 ? 4 : 3);
      assert.ok(
        !Object.values(state.environment)
          .filter((v) => v !== project.environment)
          .some((token) => JSON.stringify(outputs[i]).includes(token)),
        "Credential leaked into rendered output",
      );
      await page.setContent(outputs[i].html);
      assert.equal(await page.locator("h2").count(), expectedIds[i].length);
      if (i === 0) {
        assert.deepEqual(await page.locator("h2").allTextContents(), [
          `Italiano 0 ${state.marker}`,
          `English 1 ${state.marker}`,
        ]);
        assert.equal(
          await page
            .getByRole("link", { name: "Author profile" })
            .first()
            .getAttribute("href"),
          `/authors/${state.authorId}`,
        );
        assert.ok(
          (await page.locator("body").innerText()).includes(
            `it quotation 0 ${state.marker}`,
          ),
        );
        assert.ok(
          (await page.locator("body").innerText()).includes(
            `Writer ${state.marker}`,
          ),
        );
        if (state.variant === "inline-blocks")
          assert.ok(
            (await page.locator("body").innerText()).includes(
              `it badge 0 ${state.marker}`,
            ),
            "Inline block content was dropped",
          );
        await page.screenshot({ path: join(output, "cda-rendered.png") });
      }
      if (i === 2)
        assert.equal(
          await page.locator("h2").first().innerText(),
          `Bozza ${state.marker}`,
        );
    }
    checks.push(
      "real CDA pagination and totals",
      "localized title fallback",
      "Structured Text blocks, inline records and links render in browser",
      "published and draft content remain separate",
      "empty page keeps collection total",
      `generated schema variant: ${state.variant}`,
    );
    return checks;
  } finally {
    await browser.close();
  }
}
export async function cleanup({ project }) {
  for (const id of project.catalogTokenIds ?? [])
    await project.cmaClient.accessTokens.destroy(id);
  const remaining = await project.cmaClient.accessTokens.list();
  assert.ok(
    !remaining.some((t) => (project.catalogTokenIds ?? []).includes(t.id)),
    "Delivery token cleanup failed",
  );
}
