import { buildBlockRecord, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

const QUOTE_ID = "e5nEAn82Siy_d44sTwm3uw" as const;
const GUIDE_ID = "Yifcv3q3Q3-eko7y25fT_A" as const;

type N = { type: string; children?: N[]; [k: string]: any };
type Snapshot = {
	headings: { level: number; text: string }[];
	paragraphs: string[];
	blocks: { id: string; attributes: unknown }[];
	marked: Record<string, string>;
};
type Context = { recordId: string; before: Snapshot };

const text = (n: N): string => (n.type === "span" ? n.value : (n.children ?? []).map(text).join(""));
const walk = (n: N, f: (n: N) => void) => {
	f(n);
	n.children?.forEach((c) => walk(c, f));
};

async function readBody(c: Client, id: string) {
	return (await c.items.find(id, { nested: true })).body as { document: N };
}

function snapshot(body: { document: N }): Snapshot {
	const s: Snapshot = { headings: [], paragraphs: [], blocks: [], marked: {} };
	for (const n of body.document.children!) {
		if (n.type === "heading") s.headings.push({ level: n.level, text: text(n) });
		if (n.type === "paragraph") s.paragraphs.push(text(n));
		if (n.type === "block") s.blocks.push({ id: n.item.id, attributes: n.item.attributes });
	}
	walk(body.document, (n) => {
		if (n.type === "span") for (const m of n.marks ?? []) s.marked[m] = (s.marked[m] ?? "") + n.value;
	});
	return s;
}

async function edit(c: Client, id: string, fn: (doc: N) => N) {
	const body = (await c.items.find(id)).body as { document: N };
	await c.items.update(id, { body: { schema: "dast", document: fn(structuredClone(body.document)) } });
}

const demote = (doc: N): N => {
	for (const n of doc.children!) if (n.type === "heading") n.level += 1;
	return doc;
};

test("makes every heading of a Structured Text body one level deeper", async () => {
	const outcome = await runE2ETest<Context>({
		name: "ho-st-demote-headings",
		maxAttempts: 10,
		fixtures: async (c) => {
			await c.itemTypes.create({ id: QUOTE_ID, name: "Quote block", api_key: "quote_block", modular_block: true });
			await c.fields.create(QUOTE_ID, { label: "Quote", api_key: "quote", field_type: "text" });
			await c.fields.create(QUOTE_ID, { label: "Author", api_key: "author", field_type: "string" });
			await c.itemTypes.create({ id: GUIDE_ID, name: "Guide", api_key: "guide", draft_mode_active: true });
			await c.fields.create(GUIDE_ID, { label: "Title", api_key: "title", field_type: "string" });
			await c.fields.create(GUIDE_ID, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				validators: {
					structured_text_blocks: { item_types: [QUOTE_ID] },
					structured_text_links: { item_types: [] },
				},
			});
			const span = (value: string, marks?: string[]) => ({ type: "span" as const, value, ...(marks ? { marks } : {}) });
			const quote = (q: string, author: string) => ({
				type: "block" as const,
				item: buildBlockRecord({ item_type: { type: "item_type", id: QUOTE_ID }, quote: q, author }),
			});
			const record = await c.items.create({
				item_type: { type: "item_type", id: GUIDE_ID },
				title: "Brand handbook",
				body: {
					schema: "dast",
					document: {
						type: "root",
						children: [
							{ type: "heading", level: 1, children: [span("Brand "), span("handbook", ["strong"])] },
							{ type: "paragraph", children: [span("Welcome to the "), span("team", ["emphasis"]), span(". This is how we talk.")] },
							quote("Make it simple.", "A. Designer"),
							{ type: "heading", level: 2, children: [span("Voice and ", ["emphasis"]), span("tone")] },
							{ type: "paragraph", children: [span("Friendly, "), span("never", ["strong"]), span(" pushy.")] },
							{ type: "heading", level: 1, children: [span("Visuals")] },
							quote("Whitespace is a feature.", "B. Painter"),
							{ type: "heading", level: 2, children: [span("Logo usage")] },
							{ type: "paragraph", children: [span("Keep clear space around the logo.")] },
						],
					},
				},
			});
			return { recordId: record.id, before: snapshot(await readBody(c, record.id)) };
		},
		task: ({ context }) =>
			`In the "guide" record "${context.recordId}" (title "Brand handbook"), make every heading of the body one level deeper: ` +
			`the top-level headings become second-level headings and the second-level ones become third-level. ` +
			`Everything else in the body, including its quotes, stays as it is. Do not publish anything.`,
		solution: async ({ cmaClient: c, context }) => {
			await edit(c, context.recordId, demote);
		},
		traps: {
			"recreates the quote blocks": async ({ cmaClient: c, context }) => {
				const nested = await readBody(c, context.recordId);
				const document = demote(nested.document);
				document.children = document.children!.map((n) =>
					n.type === "block"
						? { type: "block", item: buildBlockRecord({ item_type: { type: "item_type", id: QUOTE_ID }, ...n.item.attributes }) }
						: n,
				);
				await c.items.update(context.recordId, { body: { schema: "dast", document } });
			},
			"only the top-level headings are demoted": async ({ cmaClient: c, context }) => {
				await edit(c, context.recordId, (doc) => {
					for (const n of doc.children!) if (n.type === "heading" && n.level === 1) n.level = 2;
					return doc;
				});
			},
			"headings are rebuilt as plain text, losing bold and italics": async ({ cmaClient: c, context }) => {
				await edit(c, context.recordId, (doc) => {
					for (const n of doc.children!)
						if (n.type === "heading") {
							const level = n.level + 1;
							n.level = level;
							n.children = [{ type: "span", value: text(n) }];
						}
					return doc;
				});
			},
		},
		assert: async ({ cmaClient: c, context }) => {
			const now = snapshot(await readBody(c, context.recordId));
			const before = context.before;
			expect(
				now.headings,
				"each heading is one level deeper and keeps its text",
			).toEqual(before.headings.map((h) => ({ level: h.level + 1, text: h.text })));
			expect(now.paragraphs, "paragraph text is unchanged").toEqual(before.paragraphs);
			expect(now.blocks, "the same blocks (ids and values) are still in the body").toEqual(before.blocks);
			expect(now.marked, "bold and italic text is preserved").toEqual(before.marked);
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
