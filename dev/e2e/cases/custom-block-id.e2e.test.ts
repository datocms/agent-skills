import {
  buildBlockRecord,
  generateId,
  type ItemTypeDefinition,
} from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";
type Card = ItemTypeDefinition<
  { locales: string },
  string,
  { title: { type: "string" } }
>;
type Page = ItemTypeDefinition<
  { locales: string },
  string,
  { content: { type: "rich_text"; blocks: Card } }
>;
test("creates a nested block with a chosen unused ID while retaining existing blocks", async () => {
  const outcome = await runE2ETest({
    name: "custom-block-id",
    maxAttempts: 10,
    fixtures: async (client) => {
      const block = await client.itemTypes.create({
        name: "Card",
        api_key: "card",
        modular_block: true,
      });
      await client.fields.create(block.id, {
        label: "Title",
        api_key: "title",
        field_type: "string",
      });
      const page = await client.itemTypes.create({
        name: "Page",
        api_key: "page",
        draft_mode_active: true,
      });
      await client.fields.create(page.id, {
        label: "Content",
        api_key: "content",
        field_type: "rich_text",
        validators: { rich_text_blocks: { item_types: [block.id] } },
      });
      const record = await client.items.create<Page>({
        item_type: page,
        content: [
          buildBlockRecord<Card>({ item_type: block, title: "Existing card" }),
        ],
      });
      return {
        record: await client.items.find<Page>(record.id, { nested: true }),
        newId: generateId(),
      };
    },
    task: ({ context }) =>
      `Append a new Card block titled "Chosen identity" to page ${context.record.id}, using the unused block ID ${context.newId}. Preserve the existing blocks and their IDs. Do not publish or change schema.`,
    assert: async ({ cmaClient, context }) => {
      const saved = await cmaClient.items.find<Page>(context.record.id, {
        nested: true,
      });
      expect(saved.content).toHaveLength(2);
      expect(saved.content[0]).toEqual(context.record.content[0]);
      expect(saved.content[1]?.id).toBe(context.newId);
      expect(saved.content[1]?.attributes.title).toBe("Chosen identity");
      expect(saved.meta.status).toBe("draft");
    },
  });
  if (!outcome.passed)
    throw Error(`${outcome.reason}\n${outcome.transcriptPath}`);
});
