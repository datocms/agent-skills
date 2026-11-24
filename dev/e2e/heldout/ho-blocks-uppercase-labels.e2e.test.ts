import { buildBlockRecord, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

const CTA_ID = "UIjY4Uq0T6mn4XL_RvzfOw" as const;
const TEXT_ID = "U5gLH1KqSNSwAB0J2lCtGQ" as const;
const PAGE_ID = "bZNjGTejQ-W_fn7_FnDp_w" as const;

type Block = { id: string; type: string; attributes: Record<string, unknown> };
type Context = { recordId: string; otherId: string; before: Block[]; otherBefore: Block[] };

async function read(c: Client, id: string): Promise<Block[]> {
	const record = await c.items.find(id, { nested: true });
	return (record as unknown as { sections: any[] }).sections.map((b) => ({
		id: b.id,
		type: b.relationships.item_type.data.id,
		attributes: b.attributes,
	}));
}

/** The sections as an update payload: existing blocks keep their id, CTAs get `fn` applied to their label. */
const rewritten = (blocks: Block[], fn: (label: string) => string) =>
	blocks.map((b) =>
		buildBlockRecord({
			id: b.id,
			item_type: { type: "item_type", id: b.type },
			...b.attributes,
			...(b.type === CTA_ID ? { label: fn(String(b.attributes.label)) } : {}),
		}),
	);

test("uppercases the label of every CTA block in a Modular Content field", async () => {
	const outcome = await runE2ETest<Context>({
		name: "ho-blocks-uppercase-labels",
		maxAttempts: 10,
		fixtures: async (c) => {
			await c.itemTypes.create({ id: CTA_ID, name: "CTA block", api_key: "cta_block", modular_block: true });
			await c.fields.create(CTA_ID, { label: "Label", api_key: "label", field_type: "string" });
			await c.fields.create(CTA_ID, { label: "URL", api_key: "url", field_type: "string" });
			await c.itemTypes.create({ id: TEXT_ID, name: "Text block", api_key: "text_block", modular_block: true });
			await c.fields.create(TEXT_ID, { label: "Label", api_key: "label", field_type: "string" });
			await c.fields.create(TEXT_ID, { label: "Body", api_key: "body", field_type: "text" });
			await c.itemTypes.create({ id: PAGE_ID, name: "Landing page", api_key: "landing_page", draft_mode_active: true });
			await c.fields.create(PAGE_ID, { label: "Title", api_key: "title", field_type: "string" });
			await c.fields.create(PAGE_ID, {
				label: "Sections",
				api_key: "sections",
				field_type: "rich_text",
				validators: { rich_text_blocks: { item_types: [CTA_ID, TEXT_ID] } },
			});
			const cta = (label: string, url: string) =>
				buildBlockRecord({ item_type: { type: "item_type", id: CTA_ID }, label, url });
			const text = (label: string, body: string) =>
				buildBlockRecord({ item_type: { type: "item_type", id: TEXT_ID }, label, body });
			const page = (title: string, tag: string) =>
				c.items.create({
					item_type: { type: "item_type", id: PAGE_ID },
					title,
					sections: [
						text("Why Teams Love It", `Intro ${tag}.\nSecond line.`),
						cta("Start your free trial", "https://example.com/trial"),
						text("Pricing", "Simple plans."),
						cta("Talk to Sales", "https://example.com/sales"),
						cta("see the docs", "https://example.com/docs"),
						text("FAQ", "Questions answered."),
					],
				});
			const record = await page("Home", "home");
			const other = await page("Pricing page", "pricing");
			return { recordId: record.id, otherId: other.id, before: await read(c, record.id), otherBefore: await read(c, other.id) };
		},
		task: ({ context }) =>
			`The "landing_page" record "${context.recordId}" (title "Home") has a Modular Content field "sections" that mixes CTA blocks and text blocks. ` +
			`Make the label of every CTA block uppercase. Leave the text blocks, the order of the sections and the other landing page record as they are. Do not publish anything.`,
		solution: async ({ cmaClient: c, context }) => {
			await c.items.update(context.recordId, { sections: rewritten(context.before, (l) => l.toUpperCase()) });
		},
		traps: {
			"recreates the blocks without their ids": async ({ cmaClient: c, context }) => {
				await c.items.update(context.recordId, {
					sections: context.before.map((b) =>
						buildBlockRecord({
							item_type: { type: "item_type", id: b.type },
							...b.attributes,
							...(b.type === CTA_ID ? { label: String(b.attributes.label).toUpperCase() } : {}),
						}),
					),
				});
			},
			"uppercases the text block labels too": async ({ cmaClient: c, context }) => {
				await c.items.update(context.recordId, {
					sections: context.before.map((b) =>
						buildBlockRecord({
							id: b.id,
							item_type: { type: "item_type", id: b.type },
							...b.attributes,
							label: String(b.attributes.label).toUpperCase(),
						}),
					),
				});
			},
			"uppercases the other landing page as well": async ({ cmaClient: c, context }) => {
				await c.items.update(context.recordId, { sections: rewritten(context.before, (l) => l.toUpperCase()) });
				await c.items.update(context.otherId, { sections: rewritten(context.otherBefore, (l) => l.toUpperCase()) });
			},
		},
		assert: async ({ cmaClient: c, context }) => {
			const now = await read(c, context.recordId);
			expect(
				now.map((b) => b.id),
				"same blocks, same order",
			).toEqual(context.before.map((b) => b.id));
			expect(
				now,
				"CTA labels are uppercase, everything else (urls, text blocks) is untouched",
			).toEqual(
				context.before.map((b) =>
					b.type === CTA_ID ? { ...b, attributes: { ...b.attributes, label: String(b.attributes.label).toUpperCase() } } : b,
				),
			);
			expect(await read(c, context.otherId), "the other landing page is untouched").toEqual(context.otherBefore);
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
	console.log(`✓ ${outcome.name} passed in ${outcome.attempts} script attempt(s). Transcript: ${outcome.transcriptPath}`);
});
