import { buildBlockRecord, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Trap: the list of block models a field accepts is replaced as a whole, and a model
// left out of it has its existing blocks deleted from every record.

type Snapshot = { id: string; type: string; attributes: Record<string, unknown> };

type Context = {
	heroId: string;
	quoteId: string;
	ctaId: string;
	sectionsFieldId: string;
	homeId: string;
	aboutId: string;
	homeBlocks: Snapshot[];
	aboutBlocks: Snapshot[];
	aboutVersion: string;
};

type Block = {
	id: string;
	relationships: { item_type: { data: { id: string } } };
	attributes: Record<string, unknown>;
};

async function readSections(c: Client, recordId: string) {
	const record = await c.items.find(recordId, { nested: true });
	const blocks = (record as unknown as { sections: Block[] }).sections;
	return {
		record,
		blocks: blocks.map(
			(b): Snapshot => ({ id: b.id, type: b.relationships.item_type.data.id, attributes: b.attributes }),
		),
	};
}

async function addSubscribe(c: Client, context: Context) {
	const current = await c.items.find(context.homeId);
	const ids = (current as unknown as { sections: string[] }).sections;
	await c.items.update(context.homeId, {
		sections: [
			...ids,
			buildBlockRecord({ item_type: { type: "item_type", id: context.ctaId }, label: "Subscribe" }),
		],
	});
}

test("allows one more block model in a field without deleting existing blocks", async () => {
	const outcome = await runE2ETest<Context>({
		name: "schema-extend-allowed-blocks",
		maxAttempts: 12,
		fixtures: async (c) => {
			const block = async (name: string, api_key: string, fields: string[]) => {
				const model = await c.itemTypes.create({ name, api_key, modular_block: true });
				for (const field of fields)
					await c.fields.create(model.id, { label: field, api_key: field, field_type: "string" });
				return model.id;
			};
			const heroId = await block("Hero", "hero", ["headline"]);
			const quoteId = await block("Quote", "quote", ["text", "author"]);
			const ctaId = await block("Call to action", "cta", ["label"]);

			const page = await c.itemTypes.create({ name: "Page", api_key: "page", draft_mode_active: true });
			await c.fields.create(page.id, { label: "Title", api_key: "title", field_type: "string" });
			const sections = await c.fields.create(page.id, {
				label: "Sections",
				api_key: "sections",
				field_type: "rich_text",
				validators: { rich_text_blocks: { item_types: [heroId, quoteId] } },
			});

			const hero = (headline: string) =>
				buildBlockRecord({ item_type: { type: "item_type", id: heroId }, headline });
			const quote = (text: string, author: string) =>
				buildBlockRecord({ item_type: { type: "item_type", id: quoteId }, text, author });
			const create = (title: string, blocks: ReturnType<typeof hero>[]) =>
				c.items.create({ item_type: { type: "item_type", id: page.id }, title, sections: blocks });

			const home = await create("Home", [
				hero("Welcome"),
				quote("They shipped in a week.", "Dana"),
				hero("What we do"),
				quote("Support answers in minutes.", "Lee"),
			]);
			const about = await create("About", [
				quote("Founded in a garage.", "Sam"),
				hero("Our team"),
				quote("Still small, on purpose.", "Ari"),
			]);
			await c.items.publish(about.id);

			const homeRead = await readSections(c, home.id);
			const aboutRead = await readSections(c, about.id);
			return {
				heroId,
				quoteId,
				ctaId,
				sectionsFieldId: sections.id,
				homeId: home.id,
				aboutId: about.id,
				homeBlocks: homeRead.blocks,
				aboutBlocks: aboutRead.blocks,
				aboutVersion: aboutRead.record.meta.current_version,
			};
		},
		task: () =>
			'Editors also need call-to-action blocks (block model `cta`) in the `sections` field of the `page` model. Allow them, and add one with the label "Subscribe" at the end of the page titled "Home".',
		solution: async ({ cmaClient: c, context }) => {
			await c.fields.update(context.sectionsFieldId, {
				validators: {
					rich_text_blocks: { item_types: [context.heroId, context.quoteId, context.ctaId] },
				},
			});
			await addSubscribe(c, context);
		},
		traps: {
			"sends only cta as the allowed block model": async ({ cmaClient: c, context }) => {
				await c.fields.update(context.sectionsFieldId, {
					validators: { rich_text_blocks: { item_types: [context.ctaId] } },
				});
				await addSubscribe(c, context);
			},
		},
		assert: async ({ cmaClient: c, context }) => {
			const home = await readSections(c, context.homeId);
			expect(home.blocks.slice(0, context.homeBlocks.length), "Home keeps every block, same id, order and content").toEqual(
				context.homeBlocks,
			);
			expect(home.blocks, "Home has exactly one block more").toHaveLength(context.homeBlocks.length + 1);
			const added = home.blocks.at(-1);
			expect(added?.type, "the last Home block is a cta").toBe(context.ctaId);
			expect(added?.attributes.label, "the cta label").toBe("Subscribe");
			expect(home.record.meta.status, "Home was never published").toBe("draft");

			const about = await readSections(c, context.aboutId);
			expect(about.blocks, "About keeps every block, same id, order and content").toEqual(context.aboutBlocks);
			expect(about.record.meta.status, "About stays published with no pending changes").toBe("published");
			expect(about.record.meta.current_version, "About was not edited").toBe(context.aboutVersion);

			const field = await c.fields.find(context.sectionsFieldId);
			const allowed = ((field.validators as Record<string, unknown>).rich_text_blocks as { item_types: string[] } | undefined)?.item_types ?? [];
			expect([...allowed].sort(), "sections accepts hero, quote and cta").toEqual(
				[context.heroId, context.quoteId, context.ctaId].sort(),
			);
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
