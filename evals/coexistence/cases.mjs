export const BASE_REVISION = "94e4bd8128e52963829f65bce8f202fcd68ac8d6";
export const MCP_REVISION = "beeca70bdf702461ae8e226bfd9714d8e58f33ac";
export const TARGET = { site_id: "fixture-project", environment: "sandbox" };

const simple = 'Change the title of article "article-1" to "Summer update". Leave every other field unchanged. Do not publish.';
const structured = 'In article "article-1", make three edits to the English Structured Text: change the existing greeting span "Hello reader" to "Welcome reader", change the caption of existing image block "block-1" to "Summer portrait", and append a final paragraph containing "See you soon.". Preserve the greeting marks, existing link, block ID and image, all other nodes and fields, and the entire Italian locale. Do not publish.';

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
  { id: "permission-denied", cli: true, remote: true, route: "none", operation: "denied", task: `Keep using the current hosted DatoCMS MCP selected earlier. ${simple}` },
  { id: "current-auth-error", cli: true, remote: true, route: "none", operation: "auth-error", task: `Keep using the current hosted DatoCMS MCP selected earlier. ${simple}` },
  { id: "current-connection-error", cli: true, remote: true, route: "none", operation: "connection-error", task: `Keep using the current hosted DatoCMS MCP selected earlier. ${simple}` },
  { id: "uncertain-write", cli: true, remote: true, route: "mcp", operation: "uncertain", task: `Keep using the current hosted DatoCMS MCP selected earlier. ${simple}` },
  { id: "legacy-only", cli: false, remote: false, legacy: true, route: "none", operation: "legacy", task: `The old local DatoCMS MCP is installed but no longer works. ${simple}`, arms: ["base", "candidate"] },
  { id: "explicit-legacy-beside-current", cli: false, remote: true, legacy: true, route: "none", operation: "legacy", task: `Use the old local DatoCMS MCP for this task, even though the current hosted connection is also registered. The old local server is retired. ${simple}`, arms: ["base", "candidate"] },
  { id: "legacy-beside-current", cli: false, remote: true, legacy: true, route: "mcp", operation: "simple", task: `Use the current hosted DatoCMS MCP already selected for this project. The old local MCP is also registered. ${simple}`, arms: ["base", "candidate", "none"] },
  // The runner establishes the route/schema in a separate turn, then resumes with this task.
  { id: "long-followup", cli: true, remote: true, route: "mcp", operation: "structured", long: true, task: structured, arms: ["base", "candidate", "none"] },
];

export function initialRecord() {
  return {
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
    meta: { current_version: "1", status: "draft" },
  };
}

export function expectedRecord(testCase) {
  const record = initialRecord();
  if (["simple", "uncertain"].includes(testCase.operation)) record.title = "Summer update";
  if (testCase.operation === "structured") {
    record.body.en.document.children[0].children[0].value = "Welcome reader";
    record.body.en.document.children[1].item.attributes.caption = "Summer portrait";
    record.body.en.document.children.push({ type: "paragraph", children: [{ type: "span", value: "See you soon." }] });
  }
  if (["simple", "structured", "uncertain"].includes(testCase.operation)) record.meta.current_version = "2";
  return record;
}
