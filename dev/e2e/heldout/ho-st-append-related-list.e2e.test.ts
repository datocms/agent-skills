import { buildBlockRecord, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

const NOTE_ID = "PAMSWDdKSXieHER_JoeBtw" as const;
const GLOSSARY_ID = "ac-oCcMbQeSdULGIHzQp6Q" as const;
const DOC_ID = "B90uOcWNTnK3hhj29uym3w" as const;

type N = { type: string; children?: N[]; [k: string]: any };
type Context = {
	recordId: string;
	terms: { id: string; title: string }[]; // the three to list, in the order of the request
	decoyId: string;
	before: string[];
};

const text = (n: N): string => (n.type === "span" ? n.value : (n.children ?? []).map(text).join(""));
const walk = (n: N, f: (n: N) => void) => {
	f(n);
	n.children?.forEach((c) => walk(c, f));
};

async function readBody(c: Client, id: string) {
	return (await c.items.find(id, { nested: true })).body as { document: N };
}

/** One string per top-level node: text, heading level, record links and block ids. */
function signature(nodes: N[]): string[] {
	return nodes.map((n) => {
		if (n.type === "block") return `block:${n.item.id}:${JSON.stringify(n.item.attributes)}`;
		const links: string[] = [];
		walk(n, (k) => {
			if (k.type === "itemLink") links.push(k.item);
		});
		return JSON.stringify({ type: n.type, level: n.level ?? null, style: n.style ?? null, text: text(n), links });
	});
}

const listFor = (terms: Context["terms"]) => ({
	type: "list",
	style: "bulleted",
	children: terms.map((t) => ({
		type: "listItem",
		children: [{ type: "paragraph", children: [{ type: "itemLink", item: t.id, children: [{ type: "span", value: t.title }] }] }],
	})),
});

async function edit(c: Client, id: string, fn: (doc: N) => N) {
	const body = (await c.items.find(id)).body as { document: N };
	await c.items.update(id, { body: { schema: "dast", document: fn(structuredClone(body.document)) } });
}

test("appends a bulleted list of record links at the end of a Structured Text body", async () => {
	const outcome = await runE2ETest<Context>({
		name: "ho-st-append-related-list",
		maxAttempts: 10,
		fixtures: async (c) => {
			await c.itemTypes.create({ id: NOTE_ID, name: "Note", api_key: "note", modular_block: true });
			await c.fields.create(NOTE_ID, { label: "Text", api_key: "text", field_type: "string" });
			await c.itemTypes.create({ id: GLOSSARY_ID, name: "Glossary term", api_key: "glossary_term", draft_mode_active: true });
			await c.fields.create(GLOSSARY_ID, { label: "Title", api_key: "title", field_type: "string" });
			await c.fields.create(GLOSSARY_ID, { label: "Definition", api_key: "definition", field_type: "text" });
			await c.itemTypes.create({ id: DOC_ID, name: "Doc", api_key: "doc", draft_mode_active: true });
			await c.fields.create(DOC_ID, { label: "Title", api_key: "title", field_type: "string" });
			await c.fields.create(DOC_ID, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				validators: {
					structured_text_blocks: { item_types: [NOTE_ID] },
					structured_text_links: { item_types: [GLOSSARY_ID] },
				},
			});
			const term = async (title: string, definition: string) =>
				(await c.items.create({ item_type: { type: "item_type", id: GLOSSARY_ID }, title, definition })).id;
			const terms = [
				{ id: await term("Webhook", "A call made to your server when something happens."), title: "Webhook" },
				{ id: await term("Environment", "An isolated copy of the project's content and schema."), title: "Environment" },
				{ id: await term("Locale", "A language and region variant of the content."), title: "Locale" },
			];
			const decoyId = await term("Taxonomy", "A way of classifying things.");
			const span = (value: string, marks?: string[]) => ({ type: "span" as const, value, ...(marks ? { marks } : {}) });
			const record = await c.items.create({
				item_type: { type: "item_type", id: DOC_ID },
				title: "Deploying safely",
				body: {
					schema: "dast",
					document: {
						type: "root",
						children: [
							{ type: "heading", level: 2, children: [span("Before you deploy")] },
							{
								type: "paragraph",
								children: [
									span("Test in a sandbox "),
									span("environment", ["strong"]),
									span(" first; see "),
									{ type: "itemLink", item: decoyId, children: [span("Taxonomy")] },
									span(" for background."),
								],
							},
							{ type: "block", item: buildBlockRecord({ item_type: { type: "item_type", id: NOTE_ID }, text: "Never deploy on Fridays." }) },
							{
								type: "list",
								style: "numbered",
								children: [
									{ type: "listItem", children: [{ type: "paragraph", children: [span("Fork the environment")] }] },
									{ type: "listItem", children: [{ type: "paragraph", children: [span("Run the checks")] }] },
								],
							},
							{ type: "paragraph", children: [span("That is all.")] },
						],
					},
				},
			});
			const before = signature((await readBody(c, record.id)).document.children!);
			return { recordId: record.id, terms, decoyId, before };
		},
		task: ({ context }) =>
			`At the end of the body of the "doc" record "${context.recordId}" (title "Deploying safely"), add a bulleted list with one item for each of these three "glossary_term" records, in this order: ` +
			context.terms.map((t) => `"${t.title}" (record ID "${t.id}")`).join(", ") +
			`. Each item must be a link to that record whose visible text is the record's title. Leave the rest of the body as it is and do not publish anything.`,
		solution: async ({ cmaClient: c, context }) => {
			await edit(c, context.recordId, (doc) => {
				doc.children!.push(listFor(context.terms));
				return doc;
			});
		},
		traps: {
			"puts the list at the start of the body": async ({ cmaClient: c, context }) => {
				await edit(c, context.recordId, (doc) => {
					doc.children!.unshift(listFor(context.terms));
					return doc;
				});
			},
			"items are web hyperlinks, not record links": async ({ cmaClient: c, context }) => {
				await edit(c, context.recordId, (doc) => {
					doc.children!.push({
						type: "list",
						style: "bulleted",
						children: context.terms.map((t) => ({
							type: "listItem",
							children: [{ type: "paragraph", children: [{ type: "link", url: `https://example.com/glossary/${t.id}`, children: [{ type: "span", value: t.title }] }] }],
						})),
					});
					return doc;
				});
			},
			"links the wrong record in the last item": async ({ cmaClient: c, context }) => {
				const wrong = [context.terms[0]!, context.terms[1]!, { id: context.decoyId, title: "Locale" }];
				await edit(c, context.recordId, (doc) => {
					doc.children!.push(listFor(wrong));
					return doc;
				});
			},
		},
		assert: async ({ cmaClient: c, context }) => {
			const children = (await readBody(c, context.recordId)).document.children!;
			expect(signature(children.slice(0, -1)), "the existing content is unchanged").toEqual(context.before);
			const last = children[children.length - 1]!;
			expect(last.type, "the last node is a list").toBe("list");
			expect(last.style, "the list is bulleted").toBe("bulleted");
			expect(last.children, "the list has three items").toHaveLength(3);
			last.children!.forEach((item, i) => {
				const term = context.terms[i]!;
				const links: N[] = [];
				walk(item, (n) => {
					if (n.type === "itemLink" || n.type === "link" || n.type === "inlineItem") links.push(n);
				});
				expect(links, `item ${i + 1} holds exactly one link`).toHaveLength(1);
				expect(links[0]!.type, `item ${i + 1} is a record link`).toBe("itemLink");
				expect(links[0]!.item, `item ${i + 1} points at "${term.title}"`).toBe(term.id);
				expect(text(item).trim(), `item ${i + 1} shows the record's title`).toBe(term.title);
			});
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
