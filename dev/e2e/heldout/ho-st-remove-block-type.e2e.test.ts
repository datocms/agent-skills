import { buildBlockRecord, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

const PROMO_ID = "PYoifaoIQ0mmBYDkg2K0VA" as const;
const QUOTE_ID = "cfa6eCBRQzSxmyt_Z71ngg" as const;
const POST_ID = "apB3kV_uRvucoqNh7RYZHw" as const;

type N = { type: string; children?: N[]; [k: string]: any };
type Sig = { kind: string; text: string; id?: string; attributes?: unknown };
type Context = { recordId: string; otherId: string; before: Sig[] };

const text = (n: N): string => (n.type === "span" ? n.value : (n.children ?? []).map(text).join(""));

async function readBody(c: Client, id: string) {
	return (await c.items.find(id, { nested: true })).body as { document: N };
}

const typeOf = (n: N): string => n.item.relationships.item_type.data.id;

/** One entry per top-level node, in order. Promo blocks are tagged so the check can filter them. */
function signature(body: { document: N }): Sig[] {
	return body.document.children!.map((n) =>
		n.type === "block"
			? { kind: `block:${typeOf(n)}`, text: "", id: n.item.id, attributes: n.item.attributes }
			: { kind: n.type + (n.level ? `:${n.level}` : ""), text: text(n) },
	);
}

async function edit(c: Client, id: string, fn: (doc: N) => N) {
	const body = (await c.items.find(id)).body as { document: N };
	await c.items.update(id, { body: { schema: "dast", document: fn(structuredClone(body.document)) } });
}

/** Non-nested reads give blocks as bare ids, so the promo ids come from the fixture. */
const withoutPromos = (promoIds: string[]) => (doc: N): N => {
	doc.children = doc.children!.filter((n) => !(n.type === "block" && promoIds.includes(n.item)));
	return doc;
};

test("removes every block of one type from a Structured Text body", async () => {
	const outcome = await runE2ETest<Context>({
		name: "ho-st-remove-block-type",
		maxAttempts: 10,
		fixtures: async (c) => {
			await c.itemTypes.create({ id: PROMO_ID, name: "Promo block", api_key: "promo_block", modular_block: true });
			await c.fields.create(PROMO_ID, { label: "Headline", api_key: "headline", field_type: "string" });
			await c.fields.create(PROMO_ID, { label: "Code", api_key: "code", field_type: "string" });
			await c.itemTypes.create({ id: QUOTE_ID, name: "Quote block", api_key: "quote_block", modular_block: true });
			await c.fields.create(QUOTE_ID, { label: "Quote", api_key: "quote", field_type: "text" });
			await c.fields.create(QUOTE_ID, { label: "Author", api_key: "author", field_type: "string" });
			await c.itemTypes.create({ id: POST_ID, name: "Post", api_key: "post", draft_mode_active: true });
			await c.fields.create(POST_ID, { label: "Title", api_key: "title", field_type: "string" });
			await c.fields.create(POST_ID, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				validators: {
					structured_text_blocks: { item_types: [PROMO_ID, QUOTE_ID] },
					structured_text_links: { item_types: [] },
				},
			});
			const span = (value: string, marks?: string[]) => ({ type: "span" as const, value, ...(marks ? { marks } : {}) });
			const para = (...children: ReturnType<typeof span>[]) => ({ type: "paragraph" as const, children });
			const promo = (headline: string, code: string) => ({
				type: "block" as const,
				item: buildBlockRecord({ item_type: { type: "item_type", id: PROMO_ID }, headline, code }),
			});
			const quote = (q: string, author: string) => ({
				type: "block" as const,
				item: buildBlockRecord({ item_type: { type: "item_type", id: QUOTE_ID }, quote: q, author }),
			});
			const body = (suffix: string) => ({
				schema: "dast" as const,
				document: {
					type: "root" as const,
					children: [
						promo(`Welcome offer ${suffix}`, "WELCOME10"),
						{ type: "heading" as const, level: 2 as const, children: [span("Why we built it")] },
						para(span("We wanted a "), span("calmer", ["strong"]), span(" way to plan the week.")),
						quote("Best planner I have used.", "Dana"),
						promo(`Summer deal ${suffix}`, "SUMMER"),
						promo(`Last chance ${suffix}`, "LAST"),
						para(span("More on pricing below.")),
						{
							type: "list" as const,
							style: "bulleted" as const,
							children: [
								{ type: "listItem" as const, children: [para(span("Free for individuals"))] },
								{ type: "listItem" as const, children: [para(span("Paid for teams"))] },
							],
						},
						quote("Worth every cent.", "Marco"),
						para(span("Thanks for reading.")),
					],
				},
			});
			const other = await c.items.create({ item_type: { type: "item_type", id: POST_ID }, title: "Other post", body: body("other") });
			const record = await c.items.create({ item_type: { type: "item_type", id: POST_ID }, title: "Planning the week", body: body("main") });
			return { recordId: record.id, otherId: other.id, before: signature(await readBody(c, record.id)) };
		},
		task: ({ context }) =>
			`In the "post" record "${context.recordId}" (title "Planning the week"), remove every promo block from the body. ` +
			`Keep everything else in the body (the text, the list and the quote blocks) as it is and in the same order. ` +
			`Leave the other post record alone, and do not publish anything.`,
		solution: async ({ cmaClient: c, context }) => {
			const nested = await readBody(c, context.recordId);
			const promoIds = nested.document.children!.filter((n) => n.type === "block" && typeOf(n) === PROMO_ID).map((n) => n.item.id);
			await edit(c, context.recordId, withoutPromos(promoIds));
		},
		traps: {
			"recreates the quote blocks": async ({ cmaClient: c, context }) => {
				const nested = await readBody(c, context.recordId);
				const document = nested.document;
				document.children = document.children!
					.filter((n) => !(n.type === "block" && typeOf(n) === PROMO_ID))
					.map((n) =>
						n.type === "block"
							? { type: "block", item: buildBlockRecord({ item_type: { type: "item_type", id: QUOTE_ID }, ...n.item.attributes }) }
							: n,
					);
				await c.items.update(context.recordId, { body: { schema: "dast", document } });
			},
			"removes every block, quotes included": async ({ cmaClient: c, context }) => {
				await edit(c, context.recordId, (doc) => {
					doc.children = doc.children!.filter((n) => n.type !== "block");
					return doc;
				});
			},
			"removes only the first promo": async ({ cmaClient: c, context }) => {
				const nested = await readBody(c, context.recordId);
				const first = nested.document.children!.find((n) => n.type === "block" && typeOf(n) === PROMO_ID)!;
				await edit(c, context.recordId, withoutPromos([first.item.id]));
			},
		},
		assert: async ({ cmaClient: c, context }) => {
			const now = signature(await readBody(c, context.recordId));
			expect(
				now.filter((s) => s.kind === `block:${PROMO_ID}`),
				"no promo block may remain",
			).toEqual([]);
			expect(
				now,
				"all other nodes stay, in order; quote blocks keep their ids and values",
			).toEqual(context.before.filter((s) => s.kind !== `block:${PROMO_ID}`));
			const other = signature(await readBody(c, context.otherId));
			expect(other.filter((s) => s.kind === `block:${PROMO_ID}`), "the other post still has its promos").toHaveLength(3);
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
