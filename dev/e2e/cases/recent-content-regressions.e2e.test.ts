import type {
  ApiTypes,
  ItemTypeDefinition,
  Client,
} from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest, type E2ETestOutcome } from "../lib/runE2ETest.js";

type Article = ItemTypeDefinition<
  { locales: "en" | "it" | "es" },
  string,
  {
    title: { type: "string" };
    body: { type: "structured_text" };
    translation: { type: "text"; localized: true };
  }
>;
const check = (outcome: E2ETestOutcome) => {
  if (!outcome.passed)
    throw Error(`${outcome.reason}\n${outcome.transcriptPath}`);
};
async function model(client: Client, draft = true) {
  const result = await client.itemTypes.create({
    name: "Article",
    api_key: "article",
    draft_mode_active: draft,
  });
  await client.fields.create(result.id, {
    label: "Title",
    api_key: "title",
    field_type: "string",
  });
  return result;
}
async function batches<T>(
  count: number,
  callback: (i: number) => Promise<T>,
): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; offset < count; offset += 6)
    result.push(
      ...(await Promise.all(
        Array.from({ length: Math.min(6, count - offset) }, (_, i) =>
          callback(offset + i),
        ),
      )),
    );
  return result;
}

test("publishes the complete draft selection without publishing updated records", async () => {
  check(
    await runE2ETest({
      name: "publish-paginated-drafts",
      maxAttempts: 12,
      timeoutMs: 600000,
      fixtures: async (client) => {
        const type = await model(client);
        const drafts = await batches(121, (i) =>
          client.items.create<Article>({
            item_type: type,
            title: `Draft ${String(i).padStart(3, "0")}`,
          }),
        );
        let sentinel = await client.items.create<Article>({
          item_type: type,
          title: "Published original",
        });
        await client.items.publish(sentinel.id);
        sentinel = await client.items.update<Article>(sentinel.id, {
          title: "Unapproved update",
        });
        return { drafts, sentinel };
      },
      task: () =>
        "Publish all currently draft article records. Leave already published articles and articles with unpublished updates alone. Do not change content or schema.",
      assert: async ({ cmaClient, context }) => {
        for (const before of context.drafts) {
          const item = await cmaClient.items.find<Article>(before.id);
          expect(item.meta.status).toBe("published");
          expect(item.title).toBe(before.title);
        }
        const sentinel = await cmaClient.items.find<Article>(
          context.sentinel.id,
        );
        expect(sentinel.meta.current_version).toBe(
          context.sentinel.meta.current_version,
        );
        expect(sentinel.meta.status).toBe("updated");
        expect(
          (
            await cmaClient.items.find<Article>(sentinel.id, {
              version: "published",
            })
          ).title,
        ).toBe("Published original");
      },
    }),
  );
});

test("backfills every locale page while retaining existing translations", async () => {
  check(
    await runE2ETest({
      name: "locale-backfill-pagination",
      maxAttempts: 12,
      timeoutMs: 600000,
      fixtures: async (client) => {
        await client.site.update({ locales: ["en", "it", "es"] });
        const type = await model(client);
        await client.fields.create(type.id, {
          label: "Translation",
          api_key: "translation",
          field_type: "text",
          localized: true,
        });
        return await batches(65, (i) =>
          client.items.create<Article>({
            item_type: type,
            title: `Entry ${i}`,
            translation: {
              en: `English ${i}`,
              it: `Italiano ${i}`,
              es: i % 11 === 0 ? `Español ${i}` : null,
            },
          }),
        );
      },
      task: () =>
        "For every article whose Spanish translation is empty, copy its English translation verbatim as a temporary Spanish value. Preserve existing translations and everything else. Keep all records unpublished.",
      assert: async ({ cmaClient, context }) => {
        for (const before of context) {
          const item = await cmaClient.items.find<Article>(before.id);
          expect(item.translation).toEqual({
            ...before.translation,
            es: before.translation.es?.trim()
              ? before.translation.es
              : before.translation.en,
          });
          expect(item.title).toBe(before.title);
          expect(item.meta.status).toBe("draft");
          if (before.translation.es)
            expect(item.meta.current_version).toBe(before.meta.current_version);
        }
      },
    }),
  );
});

for (const draftMode of [true, false])
  test(`restoration respects publication when draft mode is ${draftMode}`, async () => {
    check(
      await runE2ETest({
        name: `restore-${draftMode ? "draft" : "published"}-model`,
        maxAttempts: 10,
        fixtures: async (client) => {
          const type = await model(client, draftMode);
          const first = await client.items.create<Article>({
            item_type: type,
            title: "Original text",
          });
          await client.items.publish(first.id);
          await client.items.update<Article>(first.id, {
            title: "Currently live",
          });
          await client.items.publish(first.id);
          const current = await client.items.find<Article>(first.id);
          return {
            type,
            current,
            originalVersion: first.meta.current_version,
            versions: (await client.itemVersions.list(first.id)).length,
          };
        },
        task: ({ context }) =>
          `Restore article ${context.current.id} to its historical version ${context.originalVersion} without changing the content currently live on the website. Do not change model settings. If this cannot be done, explain why and leave the record untouched.`,
        assert: async ({ cmaClient, context }) => {
          const current = await cmaClient.items.find<Article>(
            context.current.id,
          );
          const published = await cmaClient.items.find<Article>(
            context.current.id,
            { version: "published" },
          );
          expect(published.title).toBe("Currently live");
          expect(
            (await cmaClient.itemTypes.find(context.type.id)).draft_mode_active,
          ).toBe(draftMode);
          if (draftMode) {
            expect(current.title).toBe("Original text");
            expect(current.meta.status).toBe("updated");
            expect((await cmaClient.itemVersions.list(current.id)).length).toBe(
              context.versions + 1,
            );
          } else {
            expect(current.meta.current_version).toBe(
              context.current.meta.current_version,
            );
            expect(current.title).toBe("Currently live");
          }
        },
      }),
    );
  });

test("prose edits preserve non-text paragraphs, nested content and code whitespace", async () => {
  check(
    await runE2ETest({
      name: "structured-text-preserve-references",
      maxAttempts: 12,
      fixtures: async (client) => {
        const type = await model(client);
        await client.fields.create(type.id, {
          label: "Body",
          api_key: "body",
          field_type: "structured_text",
          validators: {
            structured_text_blocks: { item_types: [] },
            structured_text_links: { item_types: [type.id] },
          },
        });
        const target = await client.items.create<Article>({
          item_type: type,
          title: "Reference",
        });
        const body: NonNullable<ApiTypes.Item<Article>["body"]> = {
          schema: "dast",
          document: {
            type: "root",
            children: [
              {
                type: "paragraph",
                children: [{ type: "span", value: "Old introduction" }],
              },
              {
                type: "paragraph",
                children: [{ type: "inlineItem", item: target.id }],
              },
              {
                type: "paragraph",
                children: [
                  {
                    type: "itemLink",
                    item: target.id,
                    children: [{ type: "span", value: "Linked record" }],
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
                        children: [{ type: "span", value: "Second item" }],
                      },
                    ],
                  },
                ],
              },
              {
                type: "paragraph",
                children: [
                  {
                    type: "span",
                    value: 'const spacing = "a  b";\nnext()',
                    marks: ["code"],
                  },
                ],
              },
              { type: "paragraph", children: [{ type: "span", value: "   " }] },
            ],
          },
        };
        const record = await client.items.create<Article>({
          item_type: type,
          title: "Preservation exercise",
          body,
        });
        return { record, target };
      },
      task: ({ context }) =>
        `In article ${context.record.id}, replace "Old introduction" with "New introduction" and remove empty top-level prose paragraphs. Preserve embedded references, nested lists and quotes, code, and all other content. Do not publish.`,
      assert: async ({ cmaClient, context }) => {
        const saved = await cmaClient.items.find<Article>(context.record.id);
        const expected = structuredClone(context.record.body)!;
        expected.document.children[0] = {
          type: "paragraph",
          children: [{ type: "span", value: "New introduction" }],
        };
        expected.document.children.pop();
        expect(saved.body).toEqual(expected);
        expect(saved.title).toBe(context.record.title);
        expect(saved.meta.status).toBe("draft");
        expect(
          (await cmaClient.items.find(context.target.id)).meta.current_version,
        ).toBe(context.target.meta.current_version);
      },
    }),
  );
});
