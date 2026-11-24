import { buildBlockRecord, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

const CALLOUT_ID = "AM5Dv83ZQYyPfjw0RAFhPA" as const;
const FAQ_PAGE_ID = "feKeZnzISuGC67Hx49ozAQ" as const;
const TITLE = "Shipping questions";
const HEADING = "How long does shipping take?";
const FIRST = "Most orders arrive within three days.";
const CALLOUT_TEXT = "Delivery times exclude public holidays.";
const LAST = "Still unsure? Contact support.";

type N = { type: string; children?: N[]; [k: string]: any };
type Context = { existingId: string };

const text = (n: N): string => (n.type === "span" ? n.value : (n.children ?? []).map(text).join(""));
const span = (value: string, marks?: string[]) => ({ type: "span" as const, value, ...(marks ? { marks } : {}) });

const document = (opts: { calloutAt?: number; boldWhole?: boolean } = {}) => {
	const nodes: any[] = [
		{ type: "heading", level: 2, children: [span(HEADING)] },
		{
			type: "paragraph",
			children: opts.boldWhole
				? [span(FIRST, ["strong"])]
				: [span("Most orders arrive within "), span("three", ["strong"]), span(" days.")],
		},
		{
			type: "block",
			item: buildBlockRecord({ item_type: { type: "item_type", id: CALLOUT_ID }, text: CALLOUT_TEXT }),
		},
		{ type: "paragraph", children: [span(LAST)] },
	];
	if (opts.calloutAt !== undefined) {
		const [callout] = nodes.splice(2, 1);
		nodes.splice(opts.calloutAt, 0, callout);
	}
	return { schema: "dast" as const, document: { type: "root" as const, children: nodes } };
};

const faqPages = async (c: Client) => c.items.list({ filter: { type: FAQ_PAGE_ID }, nested: true });

const create = (c: Client, body: ReturnType<typeof document>) =>
	c.items.create({ item_type: { type: "item_type", id: FAQ_PAGE_ID }, title: TITLE, body });

test("creates a new draft record whose Structured Text body is described in words", async () => {
	const outcome = await runE2ETest<Context>({
		name: "ho-st-create-record-with-document",
		maxAttempts: 10,
		fixtures: async (c) => {
			await c.itemTypes.create({ id: CALLOUT_ID, name: "Callout block", api_key: "callout_block", modular_block: true });
			await c.fields.create(CALLOUT_ID, { label: "Text", api_key: "text", field_type: "text" });
			await c.itemTypes.create({ id: FAQ_PAGE_ID, name: "FAQ page", api_key: "faq_page", draft_mode_active: true });
			await c.fields.create(FAQ_PAGE_ID, { label: "Title", api_key: "title", field_type: "string" });
			await c.fields.create(FAQ_PAGE_ID, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				validators: {
					structured_text_blocks: { item_types: [CALLOUT_ID] },
					structured_text_links: { item_types: [] },
				},
			});
			const existing = await c.items.create({
				item_type: { type: "item_type", id: FAQ_PAGE_ID },
				title: "Returns questions",
				body: {
					schema: "dast",
					document: { type: "root", children: [{ type: "paragraph", children: [span("Returns are free within 30 days.")] }] },
				},
			});
			return { existingId: existing.id };
		},
		task: () =>
			`Create a new "faq_page" record titled "${TITLE}" and leave it as a draft (not published). Its body should be, in this order: ` +
			`a second-level heading "${HEADING}"; a paragraph "${FIRST}" with the word "three" in bold; ` +
			`a callout block (model \`callout_block\`) whose text is "${CALLOUT_TEXT}"; and a closing paragraph "${LAST}". ` +
			`Leave the existing FAQ page as it is.`,
		solution: async ({ cmaClient: c }) => {
			await create(c, document());
		},
		traps: {
			"publishes the new record": async ({ cmaClient: c }) => {
				const record = await create(c, document());
				await c.items.publish(record.id);
			},
			"bolds the whole sentence": async ({ cmaClient: c }) => {
				await create(c, document({ boldWhole: true }));
			},
			"puts the callout at the end": async ({ cmaClient: c }) => {
				await create(c, document({ calloutAt: 3 }));
			},
			"creates the record twice": async ({ cmaClient: c }) => {
				await create(c, document());
				await create(c, document());
			},
		},
		assert: async ({ cmaClient: c, context }) => {
			const all = await faqPages(c);
			const fresh = all.filter((r) => r.id !== context.existingId);
			expect(fresh, "exactly one new faq_page record").toHaveLength(1);
			const record = fresh[0]!;
			expect(record.title).toBe(TITLE);
			expect(record.meta.status, "the new record is not published").toBe("draft");

			const children = (record.body as { document: N }).document.children!;
			expect(children.map((n) => n.type), "heading, paragraph, block, paragraph").toEqual(["heading", "paragraph", "block", "paragraph"]);
			expect(children[0]!.level, "second-level heading").toBe(2);
			expect(text(children[0]!).trim()).toBe(HEADING);
			expect(text(children[1]!).trim()).toBe(FIRST);
			const bold = children[1]!.children!.filter((n) => n.type === "span" && n.marks?.includes("strong"));
			expect(bold.map((n) => n.value).join(""), "only the word three is bold").toBe("three");
			expect(children[2]!.item.relationships.item_type.data.id, "a callout block").toBe(CALLOUT_ID);
			expect(String(children[2]!.item.attributes.text).trim(), "the callout text").toBe(CALLOUT_TEXT);
			expect(text(children[3]!).trim()).toBe(LAST);

			const existing = all.find((r) => r.id === context.existingId)!;
			expect(existing.title, "the existing page is untouched").toBe("Returns questions");
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
