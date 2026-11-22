import { buildBlockRecord, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Trap: a block id belongs to the field (and locale) it lives in. Moving a block to
// another field means a copy there (new id) and leaving it out of the source field.

type Snapshot = { id: string; type: string; attributes: Record<string, unknown> };

type Context = {
	promoId: string;
	articleId: string;
	main: Snapshot[]; // [Shipping note, Winter sale promo, Spring preview promo]
	sidebar: Snapshot[]; // [Contact note]
};

type Block = {
	id: string;
	relationships: { item_type: { data: { id: string } } };
	attributes: Record<string, unknown>;
};

const snapshot = (b: Block): Snapshot => ({
	id: b.id,
	type: b.relationships.item_type.data.id,
	attributes: b.attributes,
});

async function read(c: Client, id: string) {
	const record = await c.items.find(id, { nested: true });
	const fields = record as unknown as { main: Block[]; sidebar: Block[] };
	return { record, main: fields.main.map(snapshot), sidebar: fields.sidebar.map(snapshot) };
}

const winterCopy = (context: Context) => {
	const winter = context.main[1]!;
	return buildBlockRecord({ item_type: { type: "item_type", id: winter.type }, ...winter.attributes });
};

test("moves a block from one block field to another of the same record", async () => {
	const outcome = await runE2ETest<Context>({
		name: "block-move-between-fields",
		maxAttempts: 12,
		fixtures: async (c) => {
			const block = async (name: string, api_key: string, fields: [string, "string" | "text"][]) => {
				const model = await c.itemTypes.create({ name, api_key, modular_block: true });
				for (const [field, field_type] of fields)
					await c.fields.create(
						model.id,
						field_type === "text"
							? { label: field, api_key: field, field_type: "text" }
							: { label: field, api_key: field, field_type: "string" },
					);
				return model.id;
			};
			const promoId = await block("Promo", "promo", [
				["title", "string"],
				["description", "text"],
				["code", "string"],
			]);
			const noteId = await block("Note", "note", [["text", "text"]]);

			const article = await c.itemTypes.create({ name: "Article", api_key: "article", draft_mode_active: true });
			await c.fields.create(article.id, { label: "Title", api_key: "title", field_type: "string" });
			for (const api_key of ["main", "sidebar"])
				await c.fields.create(article.id, {
					label: api_key,
					api_key,
					field_type: "rich_text",
					validators: { rich_text_blocks: { item_types: [promoId, noteId] } },
				});

			const promo = (title: string, description: string, code: string) =>
				buildBlockRecord({ item_type: { type: "item_type", id: promoId }, title, description, code });
			const note = (text: string) => buildBlockRecord({ item_type: { type: "item_type", id: noteId }, text });
			const record = await c.items.create({
				item_type: { type: "item_type", id: article.id },
				title: "Seasonal offers",
				main: [
					note("Free shipping on orders over 50 euros."),
					promo("Winter sale", "Thirty percent off every coat.\nUntil the end of January.", "WINTER30"),
					promo("Spring preview", "New colours arrive in March.", "SPRING"),
				],
				sidebar: [note("Questions? Write to shop@example.com.")],
			});

			const state = await read(c, record.id);
			return { promoId, articleId: record.id, main: state.main, sidebar: state.sidebar };
		},
		task: ({ context }) =>
			`In the article "${context.articleId}" (model \`article\`), move the promo block titled "Winter sale" from the \`main\` field to the top of the \`sidebar\` field, keeping its content. Everything else stays where it is.`,
		solution: async ({ cmaClient: c, context }) => {
			await c.items.update(context.articleId, {
				main: [context.main[0]!.id, context.main[2]!.id],
				sidebar: [winterCopy(context), context.sidebar[0]!.id],
			});
		},
		traps: {
			"reuses the block id in the sidebar": async ({ cmaClient: c, context }) => {
				await c.items.update(context.articleId, {
					main: [context.main[0]!.id, context.main[2]!.id],
					sidebar: [context.main[1]!.id, context.sidebar[0]!.id],
				});
			},
			"copies to the sidebar but leaves the original in main": async ({ cmaClient: c, context }) => {
				await c.items.update(context.articleId, {
					sidebar: [winterCopy(context), context.sidebar[0]!.id],
				});
			},
		},
		assert: async ({ cmaClient: c, context }) => {
			const now = await read(c, context.articleId);
			const [shipping, winter, spring] = context.main;

			expect(now.main, "main keeps the other two blocks, same ids, order and content").toEqual([
				shipping,
				spring,
			]);
			expect(now.sidebar, "sidebar has the promo then the original note").toHaveLength(2);
			const [moved, contact] = now.sidebar;
			expect(moved?.type, "the first sidebar block is a promo").toBe(context.promoId);
			expect(moved?.attributes, "the promo content is unchanged").toEqual(winter?.attributes);
			expect(contact, "the original sidebar note keeps its id and content").toEqual(context.sidebar[0]);

			const winters = [...now.main, ...now.sidebar].filter((b) => b.attributes.title === "Winter sale");
			expect(winters, "exactly one Winter sale promo left").toHaveLength(1);
			expect(now.record.meta.status, "the article is not published").toBe("draft");
		},
	});

	if (!outcome.passed) {
		throw new Error(
			`E2E failed: ${outcome.reason}\n` +
				`Attempts: ${outcome.attempts}\n` +
				`Tool calls: ${outcome.toolCallNames.join(", ") || "(none)"}\n` +
				`Transcript: ${outcome.transcriptPath}\n` +
				(outcome.finalText ? `Final text: ${outcome.finalText}\n` : ""),
		);
	}

	console.log(
		`✓ ${outcome.name} passed in ${outcome.attempts} script attempt(s). Transcript: ${outcome.transcriptPath}`,
	);
});
