import { expect, test } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runE2ETest, type E2ETestOutcome } from "../lib/runE2ETest.js";

const check = (outcome: E2ETestOutcome) => {
  if (!outcome.passed)
    throw Error(`${outcome.reason}\n${outcome.transcriptPath}`);
};
const original = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4GQAAAAASUVORK5CYII=",
  "base64",
);
const replacement = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);

test("replaces an upload while retaining its public URL, ID and metadata", async () => {
  check(
    await runE2ETest({
      name: "upload-keep-url",
      maxAttempts: 12,
      fixtures: async (client) => {
        const dir = mkdtempSync(join(tmpdir(), "dato-upload-fixture-"));
        const path = join(dir, "original.png");
        writeFileSync(path, original);
        try {
          return await client.uploads.createFromLocalFile({
            localPath: path,
            default_field_metadata: {
              alt: { en: "Keep this alt" },
              title: { en: "Keep title" },
            },
          });
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      },
      files: () => ({ "replacement.png": replacement }),
      task: ({ context }) =>
        `Replace the file for upload ${context.id} with replacement.png while keeping its exact public URL, upload ID, and metadata. Do not create a second upload record or modify any records.`,
      assert: async ({ cmaClient, context }) => {
        const saved = await cmaClient.uploads.find(context.id);
        expect(saved.url).toBe(context.url);
        expect(saved.id).toBe(context.id);
        expect(saved.default_field_metadata).toEqual(
          context.default_field_metadata,
        );
        expect(saved.md5).not.toBe(context.md5);
        expect(await cmaClient.uploads.list()).toHaveLength(1);
      },
    }),
  );
});

test("a blocked publication cascade leaves all dependencies unpublished", async () => {
  check(
    await runE2ETest({
      name: "publication-cascade-atomicity",
      maxAttempts: 12,
      fixtures: async (client) => {
        const dep = await client.itemTypes.create({
          name: "Dependency",
          api_key: "dependency",
          draft_mode_active: true,
        });
        const title = await client.fields.create(dep.id, {
          label: "Title",
          api_key: "title",
          field_type: "string",
        });
        const valid = await client.items.create({
          item_type: dep,
          title: "Ready",
        });
        const invalid = await client.items.create({
          item_type: dep,
          title: null,
        });
        await client.fields.update(title.id, { validators: { required: {} } });
        const page = await client.itemTypes.create({
          name: "Landing Page",
          api_key: "landing_page",
          draft_mode_active: true,
        });
        await client.fields.create(page.id, {
          label: "Dependencies",
          api_key: "dependencies",
          field_type: "links",
          validators: {
            items_item_type: {
              item_types: [dep.id],
              on_publish_with_unpublished_references_strategy:
                "publish_references",
            },
          },
        });
        const record = await client.items.create({
          item_type: page,
          dependencies: [valid.id, invalid.id],
        });
        return { record, valid, invalid };
      },
      task: ({ context }) =>
        `Publish landing page ${context.record.id}, including any required linked dependencies. Do not edit content, schema, or validators. If something blocks publication, identify the blocker and leave the content untouched.`,
      assert: async ({ cmaClient, context }) => {
        for (const before of Object.values(context)) {
          const after = await cmaClient.items.find(before.id);
          expect(after.meta.status).toBe("draft");
          expect(after.meta.current_version).toBe(before.meta.current_version);
        }
      },
    }),
  );
});
