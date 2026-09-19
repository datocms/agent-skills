import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export async function prepare({ project, workspace, save }) {
  const client = project.cmaClient;
  const model = await client.itemTypes.create({
    name: "Imported Article",
    api_key: "imported_article",
  });
  for (const field of [
    {
      label: "External ID",
      api_key: "external_id",
      field_type: "string",
      validators: { unique: {} },
    },
    { label: "Title", api_key: "title", field_type: "string" },
    { label: "Body", api_key: "body", field_type: "text" },
    { label: "Attachment", api_key: "attachment", field_type: "file" },
    { label: "Editor note", api_key: "editor_note", field_type: "string" },
  ])
    await client.fields.create(model.id, field);
  const existing = await client.items.create({
    item_type: model,
    external_id: "source-2",
    title: "Old title",
    body: "Old body",
    editor_note: "Keep this editor note",
  });
  const sentinel = await client.items.create({
    item_type: model,
    external_id: "outside-import",
    title: "Unrelated title",
    body: "Unrelated body",
    editor_note: "Untouched",
  });
  mkdirSync(join(workspace, "source/assets"), { recursive: true });
  writeFileSync(
    join(workspace, "source/assets/shared.txt"),
    "Shared source attachment. Preserve this file exactly.\n",
  );
  writeFileSync(
    join(workspace, "source/assets/other.txt"),
    "Other source attachment.\n",
  );
  const rows = [
    {
      external_id: "source-1",
      title: 'A comma, and a quote "inside"',
      body: "First line\nSecond line",
      attachment: "assets/shared.txt",
    },
    {
      external_id: "source-2",
      title: "Updated imported title",
      body: "Updated body",
      attachment: "assets/shared.txt",
    },
    {
      external_id: "source-3",
      title: "Third article",
      body: "Third body",
      attachment: "assets/other.txt",
    },
  ];
  const cell = (value) => '"' + value.replaceAll('"', '""') + '"';
  writeFileSync(
    join(workspace, "source/articles.csv"),
    [
      "external_id,title,body,attachment",
      ...rows.map((row) => Object.values(row).map(cell).join(",")),
    ].join("\r\n") + "\r\n",
  );
  save("fixture.json", {
    modelId: model.id,
    existingId: existing.id,
    sentinelId: sentinel.id,
    rows,
  });
  return { model, existing, sentinel, rows };
}
export function prompt({ project }) {
  return `Import source/articles.csv and its local attachments into DatoCMS model imported_article, sandbox ${project.environment}. Write a reusable Node script import.mjs and run it. DATOCMS_API_TOKEN and DATOCMS_ENVIRONMENT are already set. Match records by external_id, create missing records and update title/body/attachment for existing source records while preserving editor_note. Leave records absent from the CSV untouched. CSV fields may contain commas, quotes and multiline content. Reuse a shared source attachment across records and make subsequent runs safe without creating duplicate records or uploads; preserve the exact attachment bytes. Only this disposable sandbox is authorized. Do not change schema, create migrations, or publish records. Verify a rerun.`;
}
async function observe(client, state) {
  const records = await client.items.list({
    filter: { type: state.model.id },
    page: { limit: 100 },
  });
  const uploads = await client.uploads.list({ page: { limit: 100 } });
  return {
    records: records.sort((a, b) => a.id.localeCompare(b.id)),
    uploads: uploads.sort((a, b) => a.id.localeCompare(b.id)),
  };
}
export async function check({ project, state, workspace, environment, save }) {
  const client = project.cmaClient;
  const before = await observe(client, state);
  assert.equal(before.records.length, 4);
  assert.equal(before.uploads.length, 2);
  const byExternal = Object.fromEntries(
    before.records.map((r) => [r.external_id, r]),
  );
  for (const row of state.rows) {
    const actual = byExternal[row.external_id];
    assert.equal(actual.title, row.title);
    assert.equal(actual.body, row.body);
    assert.ok(actual.attachment?.upload_id);
    const upload = before.uploads.find(
      (u) => u.id === actual.attachment.upload_id,
    );
    const response = await fetch(upload.url);
    assert.ok(response.ok);
    assert.equal(
      await response.text(),
      row.attachment.endsWith("shared.txt")
        ? "Shared source attachment. Preserve this file exactly.\n"
        : "Other source attachment.\n",
    );
  }
  assert.equal(byExternal["source-2"].id, state.existing.id);
  assert.equal(byExternal["source-2"].editor_note, state.existing.editor_note);
  assert.deepEqual(byExternal["outside-import"], state.sentinel);
  assert.equal(
    byExternal["source-1"].attachment.upload_id,
    byExternal["source-2"].attachment.upload_id,
  );
  const rerun = spawnSync(process.execPath, ["import.mjs"], {
    cwd: workspace,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...environment },
    encoding: "utf8",
    timeout: 120000,
  });
  save("independent-rerun.log", (rerun.stdout ?? "") + (rerun.stderr ?? ""));
  assert.equal(rerun.status, 0, "Independent import rerun failed");
  const after = await observe(client, state);
  assert.deepEqual(
    after.records.map((r) => r.id),
    before.records.map((r) => r.id),
  );
  assert.deepEqual(
    after.uploads.map((u) => u.id),
    before.uploads.map((u) => u.id),
  );
  for (const previous of before.records) {
    const current = after.records.find((r) => r.id === previous.id);
    for (const field of [
      "external_id",
      "title",
      "body",
      "attachment",
      "editor_note",
    ])
      assert.deepEqual(current[field], previous[field]);
  }
  save("observations.json", { before, after });
  return [
    "quoted and multiline CSV imported exactly",
    "existing record updated; editor note and unrelated record preserved",
    "shared asset reused and bytes verified from CDN",
    "independent rerun creates no records or uploads",
  ];
}
