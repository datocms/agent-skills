import { buildBlockRecord, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

const PRICE_ID = "LdoLVemJRMakP34W0UQakg" as const;
const NOTE_ID = "WND6Kf2qQUOTmJEEOHUEtg" as const;
const MENU_ID = "HfnDf8afSgOoVvMR5dbUbg" as const;

type N = { type: string; children?: N[]; [k: string]: any };
type Inline = { id: string; attributes: Record<string, unknown> };
type Context = { recordId: string; otherId: string; texts: string[]; inlines: Inline[]; otherInlines: Inline[]; blockId: string };

const text = (n: N): string => (n.type === "span" ? n.value : (n.children ?? []).map(text).join(""));
const walk = (n: N, f: (n: N) => void) => {
	f(n);
	n.children?.forEach((c) => walk(c, f));
};

async function readBody(c: Client, id: string) {
	return (await c.items.find(id, { nested: true })).body as { document: N };
}

const inlinesOf = (body: { document: N }): Inline[] => {
	const out: Inline[] = [];
	walk(body.document, (n) => {
		if (n.type === "inlineBlock") out.push({ id: n.item.id, attributes: n.item.attributes });
	});
	return out;
};
const textsOf = (body: { document: N }) => body.document.children!.map((n) => (n.type === "block" ? `block:${n.item.id}` : text(n)));

/** Rewrites each inline price tag, keeping its id; `bump` decides whether a given tag changes. */
async function rewrite(c: Client, id: string, keepId: boolean, bump: (index: number) => boolean) {
	const body = await readBody(c, id);
	let i = 0;
	walk(body.document, (n) => {
		if (n.type !== "inlineBlock") return;
		const amount = Number(n.item.attributes.amount) + (bump(i++) ? 10 : 0);
		n.item = buildBlockRecord({
			...(keepId ? { id: n.item.id } : {}),
			item_type: { type: "item_type", id: PRICE_ID },
			...n.item.attributes,
			amount,
		});
	});
	body.document.children = body.document.children!.map((n) => (n.type === "block" ? { type: "block", item: n.item.id } : n));
	await c.items.update(id, { body: { schema: "dast", document: body.document } });
}

test("raises the amount of every inline price tag in a Structured Text body", async () => {
	const outcome = await runE2ETest<Context>({
		name: "ho-st-inline-block-bump",
		maxAttempts: 10,
		fixtures: async (c) => {
			await c.itemTypes.create({ id: PRICE_ID, name: "Price tag", api_key: "price_tag", modular_block: true });
			await c.fields.create(PRICE_ID, { label: "Amount", api_key: "amount", field_type: "integer" });
			await c.fields.create(PRICE_ID, { label: "Currency", api_key: "currency", field_type: "string" });
			await c.itemTypes.create({ id: NOTE_ID, name: "Note", api_key: "note", modular_block: true });
			await c.fields.create(NOTE_ID, { label: "Text", api_key: "text", field_type: "string" });
			await c.itemTypes.create({ id: MENU_ID, name: "Menu", api_key: "menu", draft_mode_active: true });
			await c.fields.create(MENU_ID, { label: "Title", api_key: "title", field_type: "string" });
			await c.fields.create(MENU_ID, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				validators: {
					structured_text_blocks: { item_types: [NOTE_ID] },
					structured_text_inline_blocks: { item_types: [PRICE_ID] },
					structured_text_links: { item_types: [] },
				},
			});
			const span = (value: string, marks?: string[]) => ({ type: "span" as const, value, ...(marks ? { marks } : {}) });
			const price = (amount: number, currency = "EUR") => ({
				type: "inlineBlock" as const,
				item: buildBlockRecord({ item_type: { type: "item_type", id: PRICE_ID }, amount, currency }),
			});
			const body = {
				schema: "dast" as const,
				document: {
					type: "root" as const,
					children: [
						{ type: "heading" as const, level: 2 as const, children: [span("Lunch menu")] },
						{ type: "paragraph" as const, children: [span("Soup of the day: "), price(8), span(" with bread, "), span("or", ["emphasis"]), span(" a salad for "), price(12), span(".")] },
						{ type: "block" as const, item: buildBlockRecord({ item_type: { type: "item_type", id: NOTE_ID }, text: "Prices include VAT." }) },
						{
							type: "list" as const,
							style: "bulleted" as const,
							children: [
								{ type: "listItem" as const, children: [{ type: "paragraph" as const, children: [span("Espresso "), price(2), span(" / double "), price(3)] }] },
								{ type: "listItem" as const, children: [{ type: "paragraph" as const, children: [span("Cheesecake "), price(7, "USD")] }] },
							],
						},
						{ type: "paragraph" as const, children: [span("Open "), span("every day", ["strong"]), span(" from noon.")] },
					],
				},
			};
			const other = await c.items.create({ item_type: { type: "item_type", id: MENU_ID }, title: "Dinner menu", body });
			const record = await c.items.create({ item_type: { type: "item_type", id: MENU_ID }, title: "Lunch menu", body });
			const before = await readBody(c, record.id);
			return {
				recordId: record.id,
				otherId: other.id,
				texts: textsOf(before),
				inlines: inlinesOf(before),
				otherInlines: inlinesOf(await readBody(c, other.id)),
				blockId: before.document.children!.find((n) => n.type === "block")!.item.id,
			};
		},
		task: ({ context }) =>
			`The "menu" record "${context.recordId}" (title "Lunch menu") has price tags (model \`price_tag\`) placed inside the sentences of its body, each with an integer \`amount\`. ` +
			`Raise every amount by 10; the currencies and the text around the tags stay as they are. Leave the other menu record alone and do not publish anything.`,
		solution: async ({ cmaClient: c, context }) => {
			await rewrite(c, context.recordId, true, () => true);
		},
		traps: {
			"recreates the price tags with new ids": async ({ cmaClient: c, context }) => {
				await rewrite(c, context.recordId, false, () => true);
			},
			"raises only the first price tag": async ({ cmaClient: c, context }) => {
				await rewrite(c, context.recordId, true, (i) => i === 0);
			},
			"raises the amounts of the other menu too": async ({ cmaClient: c, context }) => {
				await rewrite(c, context.recordId, true, () => true);
				await rewrite(c, context.otherId, true, () => true);
			},
		},
		assert: async ({ cmaClient: c, context }) => {
			const now = await readBody(c, context.recordId);
			expect(
				inlinesOf(now),
				"same inline blocks (ids), each amount +10, currency untouched",
			).toEqual(
				context.inlines.map((b) => ({ id: b.id, attributes: { ...b.attributes, amount: Number(b.attributes.amount) + 10 } })),
			);
			expect(textsOf(now), "text around the tags and the note block are unchanged").toEqual(context.texts);
			expect(inlinesOf(await readBody(c, context.otherId)), "the other menu is untouched").toEqual(context.otherInlines);
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
