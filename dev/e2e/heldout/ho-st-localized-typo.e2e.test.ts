import { buildBlockRecord, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

const NOTE_ID = "DBUwnA7NSwOwbbw99yI7_w" as const;
const ARTICLE_ID = "e3l7BdMtQxSaYnzjsW57ow" as const;

type N = { type: string; children?: N[]; [k: string]: any };
type Locale = "en" | "it";
type Context = { recordId: string; before: Record<Locale, { document: N }> };

const text = (n: N): string => (n.type === "span" ? n.value : (n.children ?? []).map(text).join(""));
const walk = (n: N, f: (n: N) => void) => {
	f(n);
	n.children?.forEach((c) => walk(c, f));
};

async function readBodies(c: Client, id: string) {
	return (await c.items.find(id, { nested: true })).body as Record<Locale, { document: N }>;
}

/** Per top-level node: its plain text, or the block's id and values. */
const signature = (body: { document: N }) =>
	body.document.children!.map((n) =>
		n.type === "block" ? { id: n.item.id, attributes: n.item.attributes } : { type: n.type, text: text(n) },
	);

const fixSpans = (doc: N, replace: (s: string) => string): N => {
	walk(doc, (n) => {
		if (n.type === "span") n.value = replace(n.value);
	});
	return doc;
};

/** Reads both locales (blocks by id), edits the one given, writes both back. */
async function editLocale(c: Client, id: string, locale: Locale, replace: (s: string) => string) {
	const body = (await c.items.find(id)).body as Record<Locale, { document: N }>;
	const next = structuredClone(body);
	fixSpans(next[locale].document, replace);
	await c.items.update(id, {
		body: {
			en: { schema: "dast", document: next.en.document },
			it: { schema: "dast", document: next.it.document },
		},
	});
}

test("fixes a misspelling in one locale of a localized Structured Text field", async () => {
	const outcome = await runE2ETest<Context>({
		name: "ho-st-localized-typo",
		maxAttempts: 10,
		fixtures: async (c) => {
			await c.site.update({ locales: ["en", "it"] });
			await c.itemTypes.create({ id: NOTE_ID, name: "Note", api_key: "note", modular_block: true });
			await c.fields.create(NOTE_ID, { label: "Text", api_key: "text", field_type: "string" });
			await c.itemTypes.create({ id: ARTICLE_ID, name: "Article", api_key: "article", draft_mode_active: true });
			await c.fields.create(ARTICLE_ID, { label: "Title", api_key: "title", field_type: "string", localized: true });
			await c.fields.create(ARTICLE_ID, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				localized: true,
				validators: {
					structured_text_blocks: { item_types: [NOTE_ID] },
					structured_text_links: { item_types: [] },
				},
			});
			const span = (value: string, marks?: string[]) => ({ type: "span" as const, value, ...(marks ? { marks } : {}) });
			const note = (t: string) => ({
				type: "block" as const,
				item: buildBlockRecord({ item_type: { type: "item_type", id: NOTE_ID }, text: t }),
			});
			const record = await c.items.create({
				item_type: { type: "item_type", id: ARTICLE_ID },
				title: { en: "Your order", it: "Il tuo ordine" },
				body: {
					en: {
						schema: "dast",
						document: {
							type: "root",
							children: [
								{ type: "heading", level: 2, children: [span("What happens next")] },
								{
									type: "paragraph",
									children: [span("You will "), span("recieve", ["strong"]), span(" a confirmation email within minutes. "), span("Keep it safe.", ["emphasis"])],
								},
								note("Tracking numbers appear after dispatch."),
								{
									type: "list",
									style: "bulleted",
									children: [
										{ type: "listItem", children: [{ type: "paragraph", children: [span("Please recieve the parcel in person.")] }] },
										{ type: "listItem", children: [{ type: "paragraph", children: [span("Check the contents on delivery.")] }] },
									],
								},
							],
						},
					},
					it: {
						schema: "dast",
						document: {
							type: "root",
							children: [
								{ type: "heading", level: 2, children: [span("Cosa succede dopo")] },
								{
									type: "paragraph",
									children: [span("Riceverai "), span("una email", ["strong"]), span(" di conferma entro pochi minuti. "), span("Conservala.", ["emphasis"])],
								},
								note("I numeri di tracciamento compaiono dopo la spedizione."),
								{
									type: "list",
									style: "bulleted",
									children: [
										{ type: "listItem", children: [{ type: "paragraph", children: [span("Ritira il pacco di persona.")] }] },
										{ type: "listItem", children: [{ type: "paragraph", children: [span("Controlla il contenuto alla consegna.")] }] },
									],
								},
							],
						},
					},
				},
			});
			return { recordId: record.id, before: await readBodies(c, record.id) };
		},
		task: ({ context }) =>
			`The "article" record "${context.recordId}" (title "Your order") has a localized "body" in English and Italian. ` +
			`The English text contains the misspelling "recieve" twice; correct it to "receive" in the English version. ` +
			`The Italian version and everything else in the record stays exactly as it is. Do not publish anything.`,
		solution: async ({ cmaClient: c, context }) => {
			await editLocale(c, context.recordId, "en", (s) => s.replaceAll("recieve", "receive"));
		},
		traps: {
			"fixes only the first occurrence": async ({ cmaClient: c, context }) => {
				let fixed = false;
				await editLocale(c, context.recordId, "en", (s) => {
					if (fixed || !s.includes("recieve")) return s;
					fixed = true;
					return s.replace("recieve", "receive");
				});
			},
			"also edits the Italian text": async ({ cmaClient: c, context }) => {
				const body = (await c.items.find(context.recordId)).body as Record<Locale, { document: N }>;
				const next = structuredClone(body);
				fixSpans(next.en.document, (s) => s.replaceAll("recieve", "receive"));
				fixSpans(next.it.document, (s) => s.replace("email", "e-mail"));
				await c.items.update(context.recordId, {
					body: {
						en: { schema: "dast", document: next.en.document },
						it: { schema: "dast", document: next.it.document },
					},
				});
			},
			"recreates the English note block": async ({ cmaClient: c, context }) => {
				const nested = await readBodies(c, context.recordId);
				const en = fixSpans(structuredClone(nested.en.document), (s) => s.replaceAll("recieve", "receive"));
				en.children = en.children!.map((n) =>
					n.type === "block"
						? { type: "block", item: buildBlockRecord({ item_type: { type: "item_type", id: NOTE_ID }, ...n.item.attributes }) }
						: n,
				);
				const plain = (await c.items.find(context.recordId)).body as Record<Locale, { document: N }>;
				await c.items.update(context.recordId, {
					body: { en: { schema: "dast", document: en }, it: { schema: "dast", document: plain.it.document } },
				});
			},
		},
		assert: async ({ cmaClient: c, context }) => {
			const now = await readBodies(c, context.recordId);
			const joined = (locale: Locale) => now[locale].document.children!.map(text).join("\n");
			expect(joined("en"), "no misspelling left in English").not.toContain("recieve");
			expect(joined("en").match(/receive/g), "both occurrences are corrected").toHaveLength(2);
			expect(
				signature(now.en),
				"English is the original with only the word fixed; the note block keeps its id and value",
			).toEqual(
				signature(context.before.en).map((s: any) =>
					s.text !== undefined ? { ...s, text: s.text.replaceAll("recieve", "receive") } : s,
				),
			);
			expect(now.it, "Italian is deep-equal to before").toEqual(context.before.it);
			const strong: string[] = [];
			walk(now.en.document, (n) => {
				if (n.type === "span" && n.marks?.includes("strong")) strong.push(n.value);
			});
			expect(strong.join(""), "the bold word stays bold").toBe("receive");
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
