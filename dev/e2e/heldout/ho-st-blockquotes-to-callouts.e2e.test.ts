import { buildBlockRecord, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

const CALLOUT_ID = "CBcNdrj_QtqCaqLt_brepw" as const;
const POST_ID = "UGZ55S7qTfSRjL333KA_9A" as const;

type N = { type: string; children?: N[]; [k: string]: any };
type Sig = Record<string, unknown>;
type Context = { recordId: string; otherId: string; existingCalloutId: string; before: Sig[]; otherBefore: Sig[] };

const text = (n: N): string => (n.type === "span" ? n.value : (n.children ?? []).map(text).join(""));

async function readBody(c: Client, id: string) {
	return (await c.items.find(id, { nested: true })).body as { document: N };
}

/** One entry per top-level node. `existing` lists the callout ids that were already in the body. */
function signature(body: { document: N }, existing: string[], forBefore: boolean): Sig[] {
	return body.document.children!.map((n) => {
		if (n.type === "block" && existing.includes(n.item.id))
			return { kind: "callout", id: n.item.id, attributes: n.item.attributes };
		// The callout's `text` field has a Markdown editor: keeping the quote's bold as `**word**` is a correct answer too.
		if (n.type === "block")
			return { kind: "callout", text: String(n.item.attributes.text).replace(/\*\*|__/g, "").trim(), model: n.item.relationships.item_type.data.id };
		if (n.type === "blockquote" && forBefore)
			return { kind: "callout", text: text(n).trim(), model: CALLOUT_ID };
		return { kind: n.type, level: n.level ?? null, text: text(n) };
	});
}

const newCallout = (value: string) => ({
	type: "block",
	item: buildBlockRecord({ item_type: { type: "item_type", id: CALLOUT_ID }, text: value }),
});

async function edit(c: Client, id: string, fn: (doc: N) => N) {
	const body = (await c.items.find(id)).body as { document: N };
	await c.items.update(id, { body: { schema: "dast", document: fn(structuredClone(body.document)) } });
}

test("turns every blockquote of a Structured Text body into a callout block", async () => {
	const outcome = await runE2ETest<Context>({
		name: "ho-st-blockquotes-to-callouts",
		maxAttempts: 10,
		fixtures: async (c) => {
			await c.itemTypes.create({ id: CALLOUT_ID, name: "Callout block", api_key: "callout_block", modular_block: true });
			await c.fields.create(CALLOUT_ID, { label: "Text", api_key: "text", field_type: "text" });
			await c.fields.create(CALLOUT_ID, { label: "Tone", api_key: "tone", field_type: "string" });
			await c.itemTypes.create({ id: POST_ID, name: "Post", api_key: "post", draft_mode_active: true });
			await c.fields.create(POST_ID, { label: "Title", api_key: "title", field_type: "string" });
			await c.fields.create(POST_ID, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				validators: {
					structured_text_blocks: { item_types: [CALLOUT_ID] },
					structured_text_links: { item_types: [] },
				},
			});
			const span = (value: string, marks?: string[]) => ({ type: "span" as const, value, ...(marks ? { marks } : {}) });
			const para = (...children: ReturnType<typeof span>[]) => ({ type: "paragraph" as const, children });
			const quote = (...children: ReturnType<typeof span>[]) => ({ type: "blockquote" as const, children: [para(...children)] });
			const body = (tag: string) => ({
				schema: "dast" as const,
				document: {
					type: "root" as const,
					children: [
						{ type: "heading" as const, level: 2 as const, children: [span(`Reader feedback ${tag}`)] },
						para(span("Here is what people told us.")),
						quote(span("It "), span("finally", ["strong"]), span(" made onboarding painless.")),
						para(span("And on support:")),
						{
							type: "block" as const,
							item: buildBlockRecord({ item_type: { type: "item_type", id: CALLOUT_ID }, text: "Quotes are shared with permission.", tone: "info" }),
						},
						quote(span("Replies within the hour, every time.")),
						quote(span("I would recommend it to anyone.")),
						para(span("Thanks to everyone who wrote in.")),
					],
				},
			});
			const other = await c.items.create({ item_type: { type: "item_type", id: POST_ID }, title: "Other post", body: body("other") });
			const record = await c.items.create({ item_type: { type: "item_type", id: POST_ID }, title: "What readers say", body: body("main") });
			const before = await readBody(c, record.id);
			const existingCalloutId = before.document.children!.find((n) => n.type === "block")!.item.id;
			const otherBody = await readBody(c, other.id);
			return {
				recordId: record.id,
				otherId: other.id,
				existingCalloutId,
				before: signature(before, [existingCalloutId], true),
				otherBefore: signature(otherBody, [otherBody.document.children!.find((n) => n.type === "block")!.item.id], false),
			};
		},
		task: ({ context }) =>
			`In the "post" record "${context.recordId}" (title "What readers say"), turn every blockquote of the body into a callout block (model \`callout_block\`), ` +
			`putting the quote's words in the callout's \`text\` field, at the same place in the body. Everything else in the body, including the callout that is already there, stays as it is and in the same order. ` +
			`Leave the other post alone and do not publish anything.`,
		solution: async ({ cmaClient: c, context }) => {
			await edit(c, context.recordId, (doc) => {
				doc.children = doc.children!.map((n) => (n.type === "blockquote" ? newCallout(text(n)) : n));
				return doc;
			});
		},
		traps: {
			"turns the quotes into plain paragraphs": async ({ cmaClient: c, context }) => {
				await edit(c, context.recordId, (doc) => {
					doc.children = doc.children!.map((n) => (n.type === "blockquote" ? { type: "paragraph", children: n.children![0]!.children } : n));
					return doc;
				});
			},
			"appends the callouts at the end": async ({ cmaClient: c, context }) => {
				await edit(c, context.recordId, (doc) => {
					const quotes = doc.children!.filter((n) => n.type === "blockquote");
					doc.children = [...doc.children!.filter((n) => n.type !== "blockquote"), ...quotes.map((q) => newCallout(text(q)))];
					return doc;
				});
			},
			"recreates the callout that was already there": async ({ cmaClient: c, context }) => {
				const nested = await readBody(c, context.recordId);
				const document = nested.document;
				document.children = document.children!.map((n) =>
					n.type === "blockquote"
						? newCallout(text(n))
						: n.type === "block"
							? { type: "block", item: buildBlockRecord({ item_type: { type: "item_type", id: CALLOUT_ID }, ...n.item.attributes }) }
							: n,
				);
				await c.items.update(context.recordId, { body: { schema: "dast", document } });
			},
		},
		assert: async ({ cmaClient: c, context }) => {
			const body = await readBody(c, context.recordId);
			expect(
				body.document.children!.filter((n) => n.type === "blockquote"),
				"no blockquote may remain",
			).toEqual([]);
			expect(
				signature(body, [context.existingCalloutId], false),
				"a callout with the quote's text at each former position; the other nodes (and the old callout's id and values) unchanged, in order",
			).toEqual(context.before);
			const other = await readBody(c, context.otherId);
			expect(other.document.children!.filter((n) => n.type === "blockquote"), "the other post keeps its quotes").toHaveLength(3);
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
