import { buildBlockRecord, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

const CTA_ID = "W8tWC91NSiGIixIrDoQs8w" as const;
const TEXT_ID = "AAX1uw2URf-UmWW2bIA9OA" as const;
const DIVIDER_ID = "NfeZnWGQTECB3Z8pHG-2Rg" as const;
const PAGE_ID = "I_XcRUaTTG2hwOUaom8J-A" as const;

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

const newDivider = () =>
	buildBlockRecord({ item_type: { type: "item_type", id: DIVIDER_ID }, style: "dotted" });

test("inserts a new block between the second and third sections", async () => {
	const outcome = await runE2ETest<Context>({
		name: "ho-blocks-insert-between",
		maxAttempts: 10,
		fixtures: async (c) => {
			await c.itemTypes.create({ id: CTA_ID, name: "CTA block", api_key: "cta_block", modular_block: true });
			await c.fields.create(CTA_ID, { label: "Label", api_key: "label", field_type: "string" });
			await c.itemTypes.create({ id: TEXT_ID, name: "Text block", api_key: "text_block", modular_block: true });
			await c.fields.create(TEXT_ID, { label: "Body", api_key: "body", field_type: "text" });
			await c.itemTypes.create({ id: DIVIDER_ID, name: "Divider block", api_key: "divider_block", modular_block: true });
			await c.fields.create(DIVIDER_ID, { label: "Style", api_key: "style", field_type: "string" });
			await c.itemTypes.create({ id: PAGE_ID, name: "Landing page", api_key: "landing_page", draft_mode_active: true });
			await c.fields.create(PAGE_ID, { label: "Title", api_key: "title", field_type: "string" });
			await c.fields.create(PAGE_ID, {
				label: "Sections",
				api_key: "sections",
				field_type: "rich_text",
				validators: { rich_text_blocks: { item_types: [CTA_ID, TEXT_ID, DIVIDER_ID] } },
			});
			const cta = (label: string) => buildBlockRecord({ item_type: { type: "item_type", id: CTA_ID }, label });
			const text = (body: string) => buildBlockRecord({ item_type: { type: "item_type", id: TEXT_ID }, body });
			const divider = (style: string) => buildBlockRecord({ item_type: { type: "item_type", id: DIVIDER_ID }, style });
			const page = (title: string, tag: string) =>
				c.items.create({
					item_type: { type: "item_type", id: PAGE_ID },
					title,
					sections: [
						text(`Hero copy ${tag}`),
						cta(`Get started ${tag}`),
						text(`Features ${tag}`),
						divider("solid"),
						cta(`Contact ${tag}`),
					],
				});
			const record = await page("Home", "home");
			const other = await page("About", "about");
			return { recordId: record.id, otherId: other.id, before: await read(c, record.id), otherBefore: await read(c, other.id) };
		},
		task: ({ context }) =>
			`In the "landing_page" record "${context.recordId}" (title "Home"), add a new divider block (model \`divider_block\`) with its \`style\` set to "dotted" ` +
			`in the "sections" field, so that it sits between the second and the third section. All the existing sections keep their content and order. ` +
			`Leave the other landing page alone and do not publish anything.`,
		solution: async ({ cmaClient: c, context }) => {
			const ids = context.before.map((b) => b.id);
			await c.items.update(context.recordId, {
				sections: [ids[0], ids[1], newDivider(), ...ids.slice(2)],
			});
		},
		traps: {
			"puts the divider at the end": async ({ cmaClient: c, context }) => {
				await c.items.update(context.recordId, { sections: [...context.before.map((b) => b.id), newDivider()] });
			},
			"inserts after the third section": async ({ cmaClient: c, context }) => {
				const ids = context.before.map((b) => b.id);
				await c.items.update(context.recordId, { sections: [...ids.slice(0, 3), newDivider(), ...ids.slice(3)] });
			},
			"recreates every existing block": async ({ cmaClient: c, context }) => {
				const copies = context.before.map((b) =>
					buildBlockRecord({ item_type: { type: "item_type", id: b.type }, ...b.attributes }),
				);
				await c.items.update(context.recordId, { sections: [copies[0], copies[1], newDivider(), ...copies.slice(2)] });
			},
		},
		assert: async ({ cmaClient: c, context }) => {
			const now = await read(c, context.recordId);
			expect(now, "exactly one block more").toHaveLength(context.before.length + 1);
			expect(now[2]?.type, "the third block is a divider").toBe(DIVIDER_ID);
			expect(now[2]?.attributes.style, "the divider is dotted").toBe("dotted");
			expect(
				[...now.slice(0, 2), ...now.slice(3)],
				"the other blocks keep ids, values and order",
			).toEqual(context.before);
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
