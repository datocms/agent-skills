export const BASE_REVISION = "94e4bd8128e52963829f65bce8f202fcd68ac8d6";
export const MCP_REVISION = "exposed-tools-2026-09-18";
export const TARGET = { site_id: "fixture-project", environment: "sandbox" };

const simple = 'Change the title of the article with record ID "article-1" to "Summer update". Leave every other field unchanged. Do not publish.';
const structured = 'In the article with record ID "article-1", make three edits to the English Structured Text: change the existing greeting span "Hello reader" to "Welcome reader", change the caption of existing image block "block-1" to "Summer portrait", and append a final paragraph containing "See you soon.". Preserve the greeting marks, existing link, block ID and image, all other nodes and fields, and the entire Italian locale. Do not publish.';

// The same prompts, tool descriptions, records and assertions are used for every arm.
// "none" is a control with no skill text; it is not a server change.
export const cases = [
  { id: "skills-only-cli", cli: true, remote: false, route: "cli", operation: "simple", task: simple, arms: ["base", "candidate"] },
  { id: "both-default-cli", cli: true, remote: true, route: "cli", operation: "simple", task: simple, arms: ["base", "candidate"] },
  { id: "explicit-mcp", cli: true, remote: true, route: "mcp", operation: "simple", task: `Use the current hosted DatoCMS MCP for this task. ${simple}` },
  { id: "editor-mcp", cli: false, remote: true, route: "mcp", operation: "simple", task: simple },
  { id: "localized-structured-text", cli: false, remote: true, route: "mcp", operation: "structured", task: structured },
  { id: "cma-only-editor", cli: false, remote: true, route: "mcp", operation: "simple", distribution: "cma-only", task: simple },
  { id: "migration-local", cli: true, remote: true, route: "none", operation: "migration", artifact: "migrations/20260914-add-subtitle.ts", task: 'Create a reviewable local migration at migrations/20260914-add-subtitle.ts that adds an optional string field with API key "subtitle" to the existing article model. Use the repository migration workflow. Do not execute the migration or mutate the live project.', arms: ["base", "candidate"] },
  { id: "neither-ready", cli: false, remote: false, route: "none", operation: "unavailable", task: simple, arms: ["base", "candidate"] },
  { id: "permission-known-read-only", cli: true, remote: true, route: "none", operation: "known-denied", task: `The selected current DatoCMS MCP connection has already confirmed read-only access. Keep that route. ${simple}` },
  { id: "permission-denied", cli: true, remote: true, route: "none", operation: "denied", task: `Keep using the current hosted DatoCMS MCP selected earlier. ${simple}` },
  { id: "current-auth-error", cli: true, remote: true, route: "none", operation: "auth-error", task: `Keep using the current hosted DatoCMS MCP selected earlier. ${simple}` },
  { id: "current-connection-error", cli: true, remote: true, route: "none", operation: "connection-error", task: `Keep using the current hosted DatoCMS MCP selected earlier. ${simple}` },
  { id: "uncertain-write", cli: true, remote: true, route: "mcp", operation: "uncertain", task: `Keep using the current hosted DatoCMS MCP selected earlier. ${simple}` },
  { id: "legacy-only", cli: false, remote: false, legacy: true, route: "none", operation: "legacy", task: `The old local DatoCMS MCP is installed but no longer works. ${simple}`, arms: ["base", "candidate"] },
  { id: "explicit-legacy-beside-current", cli: false, remote: true, legacy: true, route: "none", operation: "legacy", task: `Use the old local DatoCMS MCP for this task, even though the current hosted connection is also registered. The old local server is retired. ${simple}`, arms: ["base", "candidate"] },
  { id: "legacy-beside-current", cli: false, remote: true, legacy: true, route: "mcp", operation: "simple", task: `Use the current hosted DatoCMS MCP already selected for this project. The old local MCP is also registered. ${simple}`, arms: ["base", "candidate", "none"] },
  { id: "long-followup-unseen", cli: true, remote: true, route: "mcp", operation: "structured", long: true, variant: "unseen", task: structured, arms: ["base", "candidate"] },
  { id: "long-followup-rich-values", cli: true, remote: true, route: "mcp", operation: "structured", long: true, variant: "rich", task: structured, arms: ["base", "candidate"] },
  // The runner establishes the route/schema in a separate turn, then resumes with this task.
  { id: "long-followup", cli: true, remote: true, route: "mcp", operation: "structured", long: true, task: structured, arms: ["base", "candidate", "none"] },
];

export function initialRecord(testCase) {
  const record = {
    id: "article-1", title: "Original title", untouched: "Keep this value",
    body: {
      en: { schema: "dast", document: { type: "root", children: [
        { type: "paragraph", children: [
          { type: "span", value: "Hello reader", marks: ["strong"] },
          { type: "span", value: " — " },
          { type: "link", url: "https://example.test/help", children: [{ type: "span", value: "Help" }] },
        ] },
        { type: "block", item: { id: "block-1", type: "item", __itemTypeId: "image-block", attributes: { caption: "Keep the caption", image: null } } },
      ] } },
      it: { schema: "dast", document: { type: "root", children: [{ type: "paragraph", children: [{ type: "span", value: "Ciao lettore" }] }] } },
    },
    meta: {
      current_version: "1", status: "draft", created_at: "2026-09-01T09:00:00Z", updated_at: "2026-09-01T09:00:00Z",
      published_at: null, first_published_at: null, publication_scheduled_at: null, unpublishing_scheduled_at: null,
      is_valid: true, is_current_version_valid: true, is_published_version_valid: null, stage: null, has_children: false,
    },
  };
  if(testCase?.variant === "unseen") {record.title="Release notes: café";record.untouched="";record.body.it.document.children[0].children[0].value="Contenuto invariato\nSeconda riga";}
  if (testCase?.variant === "rich") {
    record.title = "Autumn notes: ‘keep’";
    record.untouched = "0 — preserve this exact value";
    record.meta.status = "updated";
    record.meta.published_at = "2026-09-01T10:00:00Z";
    record.meta.first_published_at = record.meta.published_at;
    record.meta.is_published_version_valid = true;
    record.body.en.document.children[0].children[0].marks = ["strong", "emphasis"];
    record.body.en.document.children[0].children[2].meta = [{ id: "rel", value: "nofollow" }];
    record.body.en.document.children[1].item.attributes.image = {
      upload_id: "existing-upload", alt: "Original alt", title: null,
      custom_data: { source: "archive" }, focal_point: { x: 0.25, y: 0.75 }, poster_time: null,
    };
    record.body.it.document.children.push({ type: "code", language: "js", code: "  keep()\n\nnext();  " });
  }
  return record;
}

export function expectedRecord(testCase) {
  const record = initialRecord(testCase);
  if (["simple", "uncertain"].includes(testCase.operation)) record.title = "Summer update";
  if (testCase.operation === "structured") {
    record.body.en.document.children[0].children[0].value = "Welcome reader";
    record.body.en.document.children[1].item.attributes.caption = "Summer portrait";
    record.body.en.document.children.push({ type: "paragraph", children: [{ type: "span", value: "See you soon." }] });
  }
  if (["simple", "structured", "uncertain"].includes(testCase.operation)) {
    record.meta.current_version = "2";
    record.meta.updated_at = "2026-09-18T12:00:00Z";
  }
  return record;
}
