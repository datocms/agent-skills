import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  symlinkSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { buildClient } from "@datocms/cma-client-node";
import { nativeSession } from "../lib/nativeSession.ts";
const root = resolve(import.meta.dirname, "../..");
const { values } = parseArgs({
  options: {
    output: { type: "string" },
    repetitions: { type: "string", default: "1" },
    cases: { type: "string" },
    recheck: { type: "string" },
  },
});
const repetitions = Number(values.repetitions);
if (!Number.isInteger(repetitions) || repetitions < 1)
  throw Error("repetitions must be a positive integer");
const output = resolve(
  values.output ??
    join(root, "local/code", new Date().toISOString().replace(/[:.]/g, "-")),
);
if (existsSync(join(output, "results.json")))
  throw Error("Choose fresh output");
mkdirSync(output, { recursive: true });
const cases = [
  {
    id: "local-reference-preservation",
    commits: ["cd4d4f4", "31c2626", "ec21052"],
    files: {},
    prompt:
      "Implement clean.ts exporting default clean(document), which receives a DatoCMS Structured Text DAST document and returns it with empty top-level prose paragraphs removed. A paragraph containing a record reference must remain even if its text is empty. Preserve nested lists and quotes, reference IDs, code whitespace, marks, and all other content exactly. This works on local editor documents, without calling a CMS.",
    async check(workspace) {
      const module = await loadModule(workspace, "clean.ts");
      for (const reference of ["record-one", "record-two"]) {
        const document = {
          schema: "dast",
          document: {
            type: "root",
            children: [
              { type: "paragraph", children: [{ type: "span", value: "" }] },
              {
                type: "paragraph",
                children: [{ type: "inlineItem", item: reference }],
              },
              {
                type: "paragraph",
                children: [
                  {
                    type: "itemLink",
                    item: reference,
                    children: [{ type: "span", value: "" }],
                  },
                ],
              },
              {
                type: "blockquote",
                children: [
                  {
                    type: "paragraph",
                    children: [{ type: "span", value: "" }],
                  },
                ],
              },
              {
                type: "list",
                style: "numbered",
                children: [
                  {
                    type: "listItem",
                    children: [
                      {
                        type: "paragraph",
                        children: [{ type: "span", value: "" }],
                      },
                    ],
                  },
                  {
                    type: "listItem",
                    children: [
                      {
                        type: "paragraph",
                        children: [{ type: "span", value: "Second" }],
                      },
                    ],
                  },
                ],
              },
              {
                type: "paragraph",
                children: [
                  { type: "span", value: "a  b\nnext()", marks: ["code"] },
                ],
              },
            ],
          },
        };
        const expected = structuredClone(document);
        expected.document.children.shift();
        assert.deepEqual(await module.default(document), expected);
      }
    },
  },

  {
    id: "creator-cross-model",
    commits: ["cd6b6bc"],
    files: {},
    prompt:
      "Implement audit.ts for our existing Node application. Export a default async function audit(client, sourceId) that returns the IDs of all current records created by the same creator as sourceId, across every model. Reuse the supplied @datocms/cma-client-node client; do not create a client, change configuration, or call a live project. Collections may span many pages, and the creator is not necessarily a user. Use TypeScript.",
    async check(workspace) {
      const module = await loadModule(workspace, "audit.ts");
      for (const type of ["access_token", "sso_user", "organization"]) {
        const creator = { type, id: "creator-7" };
        const { client, calls } = auditClient(creator);
        assert.deepEqual(
          await module.default(client, "source"),
          Array.from({ length: 137 }, (_, i) => `record-${i}`),
        );
        assert.ok(calls.length > 0);
      }
    },
  },
  {
    id: "creator-server-filter",
    commits: ["cd6b6bc"],
    files: {},
    prompt:
      "Implement audit.ts, exporting default async audit(client, sourceId). Return every current record ID whose creator matches the source record, across all models. This project has millions of records, so filter by creator on the server and stream all pages. The creator may be an API token, SSO user, organization, or ordinary user. Reuse the supplied CMA client and do not execute live calls.",
    async check(workspace) {
      const module = await loadModule(workspace, "audit.ts");
      for (const type of ["access_token", "sso_user", "organization", "user"]) {
        const { client, calls } = auditClient({ type, id: "actor-42" }, true);
        assert.deepEqual(
          await module.default(client, "source"),
          Array.from({ length: 137 }, (_, i) => `record-${i}`),
        );
        assert.ok(calls.length > 0);
      }
    },
  },
  {
    id: "plugin-package-operation",
    commits: ["da25e13"],
    files: {},
    prompt:
      "Implement switch-plugin.ts exporting default async switchPlugin(client, pluginId, packageName). Connect an existing private DatoCMS plugin installation to the published package, preserve all saved parameters, disable it without deleting it, and return its affected fields using the dedicated endpoint. Use the CMA SDK installed in this workspace and check its serialization support for the update attributes. Do not call a live project.",
    async check(workspace) {
      const module = await loadModule(workspace, "switch-plugin.ts");
      const parameters = {
        nested: { keep: "unchanged" },
        secretName: "parameter-reference",
      };
      const original = {
        id: "plugin-7",
        parameters,
        enabled: true,
        package_name: null,
      };
      const state = structuredClone(original),
        calls = [];
      // Exercise the installed SDK serializer and raw fallback at the HTTP boundary.
      const client = buildClient({ apiToken: "synthetic-not-used" });
      const raw = () => ({
        data: {
          id: state.id,
          type: "plugin",
          attributes: {
            parameters: state.parameters,
            enabled: state.enabled,
            package_name: state.package_name,
          },
        },
      });
      client.request = async ({ method, url, body }) => {
        if (method === "GET" && url === `/plugins/${state.id}/fields`)
          return { data: [{ id: "field-1", type: "field", attributes: {} }] };
        assert.equal(url, `/plugins/${state.id}`);
        if (method === "GET") return raw();
        assert.equal(method, "PUT", "Only the requested update is permitted");
        assert.equal(body.data.type, "plugin");
        assert.equal(body.data.id, state.id);
        const payload = body.data.attributes;
        assert.ok(
          payload,
          "SDK serialization removed the requested attributes",
        );
        if ("package_name" in payload)
          assert.ok(
            Object.keys(payload).every((k) =>
              ["package_name", "enabled"].includes(k),
            ),
            "Package switch must be isolated",
          );
        calls.push(payload);
        Object.assign(state, payload);
        return raw();
      };
      const fields = await module.default(
        client,
        "plugin-7",
        "datocms-plugin-example",
      );
      assert.deepEqual(
        fields.map((field) => field.id),
        ["field-1"],
      );
      assert.equal(state.package_name, "datocms-plugin-example");
      assert.equal(state.enabled, false);
      assert.deepEqual(state.parameters, parameters);
      assert.ok(calls.length >= 1 && calls.length <= 2);
    },
  },
  {
    id: "markdown-code-preservation",
    commits: ["a725ce6", "27c410f"],
    files: {
      "article.md":
        '# Code sample\n\nRun `const value = "a  b"` then **`x  y`** and [use `z  w`](https://example.test/docs).\n\n1. \n2. Second item\n',
    },
    prompt:
      "Convert article.md to DatoCMS Structured Text in article.dast.json. Preserve its text, code whitespace, marks, link, and list structure. This is a local file conversion; no CMS connection or project setup is needed.",
    async check(workspace) {
      const value = JSON.parse(
        readFileSync(join(workspace, "article.dast.json"), "utf8"),
      );
      assert.equal(value.schema, "dast");
      const nodes = [];
      function walk(n) {
        nodes.push(n);
        for (const x of n.children ?? []) walk(x);
      }
      walk(value.document);
      for (const code of ['const value = "a  b"', "x  y", "z  w"])
        assert.ok(
          nodes.some(
            (n) =>
              n.type === "span" &&
              n.value === code &&
              n.marks?.includes("code"),
          ),
          `Lost code text: ${code}`,
        );
      assert.ok(
        nodes.some(
          (n) =>
            n.type === "span" &&
            n.value === "x  y" &&
            n.marks?.includes("strong"),
        ),
      );
      assert.ok(
        nodes.some(
          (n) => n.type === "link" && n.url === "https://example.test/docs",
        ),
      );
      const list = nodes.find((n) => n.type === "list");
      assert.equal(list.style, "numbered");
      assert.equal(list.children.length, 2);
      assert.ok(
        nodes.some((n) => n.type === "span" && n.value === "Second item"),
      );
    },
  },
  {
    id: "cache-tag-collector",
    commits: ["4db6ce5"],
    files: {},
    prompt:
      "Implement cache-tags.ts for our DatoCMS SSR pages behind Cloudflare. Export createPageCacheTags() returning add(headerValue, isDraft = false) and headers(). Each page owns its collector. Merge and deduplicate whitespace-separated cache tags from multiple CDA queries. Return response headers for Cloudflare. If any query is draft content, that entire page must stay private even if published queries run afterward. Do not call external services.",
    async check(workspace) {
      const { createPageCacheTags } = await loadModule(
        workspace,
        "cache-tags.ts",
      );
      const a = createPageCacheTags(),
        b = createPageCacheTags();
      a.add("one two one");
      a.add("two\tthree\n");
      a.add(null);
      const headers = new Headers(a.headers());
      assert.deepEqual(
        new Set(headers.get("Cache-Tag").split(",").map(tag => tag.trim())),
        new Set(["one", "two", "three"]),
      );
      assert.equal(new Headers(b.headers()).has("Cache-Tag"), false);
      a.add("secret", true);
      a.add("four");
      const draft = new Headers(a.headers());
      assert.match(draft.get("Cache-Control"), /private/);
      assert.match(draft.get("Cache-Control"), /no-store/);
      assert.equal(draft.has("Cache-Tag"), false);
    },
  },
];
function auditClient(creator, requireServerFilter = false) {
  const client = buildClient({ apiToken: "synthetic-not-used" }),
    calls = [];
  const records = Array.from({ length: 137 }, (_, i) => ({
    id: `record-${i}`,
    creator,
  }));
  records.push(
    {
      id: "different-type",
      creator: {
        type: creator.type === "user" ? "access_token" : "user",
        id: creator.id,
      },
    },
    { id: "different-id", creator: { type: creator.type, id: "other" } },
    { id: "missing", creator: null },
  );
  client.items.find = async (id) => {
    assert.equal(id, "source");
    return { id, creator };
  };
  client.items.rawList = async (options = {}) => {
    calls.push(options);
    assert.equal(options.filter?.type, undefined);
    assert.ok(options.version === undefined || options.version === "current");
    const condition = options.filter?.fields?._creator;
    if (requireServerFilter)
      assert.ok(condition, "Task requires server-side filtering");
    if (condition) assert.deepEqual(condition.eq, creator);
    const filtered = condition
      ? records.filter(
          (r) =>
            r.creator?.type === creator.type && r.creator.id === creator.id,
        )
      : records;
    const { offset = 0, limit = 30 } = options.page ?? {};
    return {
      data: filtered.slice(offset, offset + limit).map((r) => ({
        id: r.id,
        type: "item",
        attributes: {},
        relationships: {
          creator: { data: r.creator },
          item_type: {
            data: {
              type: "item_type",
              id: "model-" + (Number(r.id.split("-").at(-1)) % 3),
            },
          },
        },
      })),
      meta: { total_count: filtered.length },
    };
  };
  return { client, calls };
}
async function loadModule(workspace, path) {
  const compiled = join(workspace, ".evaluated.mjs");
  await build({
    entryPoints: [join(workspace, path)],
    outfile: compiled,
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    logLevel: "silent",
  });
  return import(pathToFileURL(compiled).href + "?t=" + Date.now());
}
const selected = cases.filter(
  (c) => !values.cases || values.cases.split(",").includes(c.id),
);
if (
  !selected.length ||
  (values.cases &&
    values.cases.split(",").some((id) => !cases.some((c) => c.id === id)))
)
  throw Error("Unknown or empty case selection");
const results = [];
for (let repetition = 1; repetition <= repetitions; repetition++)
  for (const c of selected) {
    const directory = join(output, `${c.id}-${repetition}`),
      workspace = values.recheck
        ? join(resolve(values.recheck), `${c.id}-${repetition}`, "workspace")
        : join(directory, "workspace");
    mkdirSync(directory, { recursive: true });
    mkdirSync(workspace, { recursive: true });
    if (!values.recheck) {
      writeFileSync(
        join(workspace, "package.json"),
        JSON.stringify({
          private: true,
          type: "module",
          dependencies: { "@datocms/cma-client-node": "6.1.3" },
        }),
      );
      symlinkSync(join(root, "node_modules"), join(workspace, "node_modules"));
      for (const [path, value] of Object.entries(c.files))
        writeFileSync(join(workspace, path), value);
    }
    const result = {
      case: c.id,
      repetition,
      model: "gpt-5.6-luna",
      reasoningEffort: "medium",
      passed: false,
    };
    try {
      if (!values.recheck) {
        const session = await nativeSession({
          repoRoot: root,
          workspace,
          output: directory,
          prompt: c.prompt,
          timeoutMs: 420000,
        });
        assert.ok(
          session.completed &&
            session.exitCode === 0 &&
            !session.errors.length &&
            !session.timedOut,
          "Agent did not complete",
        );
      } else {
        const original = JSON.parse(
          readFileSync(
            join(
              resolve(values.recheck),
              `${c.id}-${repetition}`,
              "session.json",
            ),
            "utf8",
          ),
        );
        assert.ok(
          original.completed &&
            original.exitCode === 0 &&
            !original.errors.length &&
            !original.timedOut &&
            !original.capped,
          "Original native session did not complete",
        );
        assert.equal(original.model, "gpt-5.6-luna");
        assert.equal(original.reasoningEffort, "medium");
        result.recheckedFrom = resolve(values.recheck);
      }
      await c.check(workspace);
      result.passed = true;
    } catch (e) {
      result.error = String(e);
    }
    results.push(result);
    writeFileSync(
      join(directory, "result.json"),
      JSON.stringify(result, null, 2),
    );
    writeFileSync(
      join(output, "results.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(
      `${result.passed ? "PASS" : "FAIL"} ${c.id}/${repetition}${result.error ? ": " + result.error : ""}`,
    );
  }
if (results.some((r) => !r.passed)) process.exitCode = 1;
