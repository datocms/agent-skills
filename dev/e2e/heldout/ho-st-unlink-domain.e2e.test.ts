import { buildBlockRecord, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

const NOTE_ID = "Q_I-JVeHTkq_RB6JogN4bA" as const;
const ARTICLE_ID = "GmNdE_G1QjSwPqY3gzsUUg" as const;
const OLD_HOST = "old.example.com";

type Context = { recordId: string; otherId: string; blockId: string; before: Snapshot };
type N = { type: string; children?: N[]; [k: string]: any };
type Snapshot = {
	texts: string[]; // one entry per top-level node ("block:<id>" for blocks)
	links: { url: string; meta: unknown; text: string }[]; // links that must survive
	strongText: string[];
};

const text = (n: N): string =>
	n.type === "span" ? n.value : (n.children ?? []).map(text).join("");
const walk = (n: N, f: (n: N) => void) => {
	f(n);
	n.children?.forEach((c) => walk(c, f));
};
const hostOf = (url: string) => {
	try {
		return new URL(url).hostname;
	} catch {
		return "";
	}
};

async function readBody(c: Client, id: string) {
	const record = await c.items.find(id, { nested: true });
	return record.body as { document: N };
}

function snapshot(body: { document: N }): Snapshot {
	const links: Snapshot["links"] = [];
	const strongText: string[] = [];
	walk(body.document, (n) => {
		if (n.type === "link" && hostOf(n.url) !== OLD_HOST)
			links.push({ url: n.url, meta: n.meta ?? null, text: text(n) });
		if (n.type === "span" && n.marks?.includes("strong")) strongText.push(n.value);
	});
	return {
		texts: body.document.children!.map((n) => (n.type === "block" ? `block:${n.item.id}` : text(n))),
		links,
		strongText: [strongText.join("")],
	};
}

/** Reads the body (blocks by id), lets `edit` change the document, writes it back. */
async function edit(c: Client, id: string, fn: (doc: N) => N) {
	const record = await c.items.find(id);
	const body = record.body as { schema: "dast"; document: N };
	await c.items.update(id, { body: { schema: "dast", document: fn(structuredClone(body.document)) } });
}

/** Replaces every old-host link by its children (the words stay). */
const unlinkChildren = (n: N): N => {
	if (!n.children) return n;
	const out: N[] = [];
	for (const child of n.children) {
		const mapped = unlinkChildren(child);
		if (mapped.type === "link" && hostOf(mapped.url) === OLD_HOST) out.push(...(mapped.children ?? []));
		else out.push(mapped);
	}
	return { ...n, children: out };
};

test("removes links to one host from a Structured Text body and keeps their words", async () => {
	const outcome = await runE2ETest<Context>({
		name: "ho-st-unlink-domain",
		maxAttempts: 10,
		fixtures: async (c) => {
			await c.itemTypes.create({ id: NOTE_ID, name: "Note", api_key: "note", modular_block: true });
			await c.fields.create(NOTE_ID, { label: "Text", api_key: "text", field_type: "string" });
			await c.itemTypes.create({ id: ARTICLE_ID, name: "Article", api_key: "article", draft_mode_active: true });
			await c.fields.create(ARTICLE_ID, { label: "Title", api_key: "title", field_type: "string" });
			await c.fields.create(ARTICLE_ID, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				validators: {
					structured_text_blocks: { item_types: [NOTE_ID] },
					structured_text_links: { item_types: [] },
				},
			});
			const span = (value: string, marks?: string[]) => ({ type: "span" as const, value, ...(marks ? { marks } : {}) });
			const body = {
				schema: "dast" as const,
				document: {
					type: "root" as const,
					children: [
						{
							type: "heading" as const,
							level: 2 as const,
							children: [span("Migration notes")],
						},
						{
							type: "paragraph" as const,
							children: [
								span("Start with the "),
								{ type: "link" as const, url: "https://old.example.com/setup", children: [span("legacy setup guide")] },
								span(" and then read the "),
								{
									type: "link" as const,
									url: "https://docs.example.com/migrate",
									meta: [{ id: "target", value: "_blank" }, { id: "rel", value: "noopener" }],
									children: [span("migration docs")],
								},
								span("."),
							],
						},
						{
							type: "block" as const,
							item: buildBlockRecord({ item_type: { type: "item_type", id: NOTE_ID }, text: "Back up first." }),
						},
						{
							type: "paragraph" as const,
							children: [
								span("Important: ", ["strong"]),
								{
									type: "link" as const,
									url: "https://old.example.com/pricing?plan=pro",
									meta: [{ id: "target", value: "_blank" }],
									children: [span("see the old pricing", ["emphasis"]), span(" page")],
								},
								span(" is still online, unlike "),
								{ type: "link" as const, url: "https://example.com/old.example.com", children: [span("this unrelated page")] },
								span("."),
							],
						},
						{
							type: "list" as const,
							style: "bulleted" as const,
							children: [
								{
									type: "listItem" as const,
									children: [
										{
											type: "paragraph" as const,
											children: [
												{ type: "link" as const, url: "http://old.example.com/", children: [span("Home (old)")] },
											],
										},
									],
								},
								{
									type: "listItem" as const,
									children: [
										{
											type: "paragraph" as const,
											children: [
												{ type: "link" as const, url: "https://blog.example.com/news", children: [span("News")] },
											],
										},
									],
								},
							],
						},
					],
				},
			};
			const other = await c.items.create({ item_type: { type: "item_type", id: ARTICLE_ID }, title: "Other", body });
			const record = await c.items.create({ item_type: { type: "item_type", id: ARTICLE_ID }, title: "Migration guide", body });
			const before = await readBody(c, record.id);
			const block = before.document.children!.find((n) => n.type === "block")!;
			return { recordId: record.id, otherId: other.id, blockId: block.item.id, before: snapshot(before) };
		},
		task: ({ context }) =>
			`In the "article" record "${context.recordId}" (title "Migration guide"), the body has several links that point to old.example.com. ` +
			`Remove those links, but keep the words they were wrapped around as ordinary text in the same place. ` +
			`Links to any other address must stay exactly as they are. Do not change the other article record, and do not publish anything.`,
		solution: async ({ cmaClient: c, context }) => {
			await edit(c, context.recordId, unlinkChildren);
		},
		traps: {
			"deletes the linked words along with the link": async ({ cmaClient: c, context }) => {
				const strip = (n: N): N =>
					n.children
						? { ...n, children: n.children.filter((k) => !(k.type === "link" && hostOf(k.url) === OLD_HOST)).map(strip) }
						: n;
				await edit(c, context.recordId, strip);
			},
			"removes every link, including the other hosts": async ({ cmaClient: c, context }) => {
				const flat = (n: N): N =>
					n.children
						? { ...n, children: n.children.flatMap((k) => (k.type === "link" ? (k.children ?? []).map(flat) : [flat(k)])) }
						: n;
				await edit(c, context.recordId, flat);
			},
			"drops meta from the links it keeps": async ({ cmaClient: c, context }) => {
				const drop = (n: N): N => {
					const mapped = unlinkChildren(n);
					walk(mapped, (k) => {
						if (k.type === "link") delete k.meta;
					});
					return mapped;
				};
				await edit(c, context.recordId, drop);
			},
			"recreates the block instead of keeping it": async ({ cmaClient: c, context }) => {
				const nested = await readBody(c, context.recordId);
				const document = unlinkChildren(nested.document);
				document.children = document.children!.map((n) =>
					n.type === "block"
						? {
								type: "block",
								item: buildBlockRecord({
									item_type: { type: "item_type", id: NOTE_ID },
									...n.item.attributes,
								}),
							}
						: n,
				);
				await c.items.update(context.recordId, { body: { schema: "dast", document } });
			},
		},
		assert: async ({ cmaClient: c, context }) => {
			const now = await readBody(c, context.recordId);
			const after = snapshot(now);

			const remaining: string[] = [];
			walk(now.document, (n) => {
				if (n.type === "link" && hostOf(n.url) === OLD_HOST) remaining.push(n.url);
			});
			expect(remaining, "no link to old.example.com may remain").toEqual([]);

			expect(after.texts, "every top-level node keeps its plain text; the block keeps its id").toEqual(context.before.texts);
			expect(after.links, "the other links keep url, meta and text").toEqual(context.before.links);
			expect(after.strongText, "bold text is preserved").toEqual(context.before.strongText);
			const block = now.document.children!.find((n) => n.type === "block")!;
			expect(block.item.attributes.text, "the block keeps its value").toBe("Back up first.");

			const other = await readBody(c, context.otherId);
			expect(
				(function () {
					const urls: string[] = [];
					walk(other.document, (n) => {
						if (n.type === "link") urls.push(n.url);
					});
					return urls.length;
				})(),
				"the other record's links are untouched",
			).toBe(6);
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
