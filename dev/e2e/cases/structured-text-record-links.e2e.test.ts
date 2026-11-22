import {
	type Client,
	type ItemTypeDefinition,
	type StructuredTextFieldValidators,
} from "@datocms/cma-client-node";
import {
	type Document,
	type InlineNode,
	isInlineItem,
	isItemLink,
	isList,
	isParagraph,
	isSpan,
	type List,
	type Node,
	type Paragraph,
	reduceNodes,
	type Root,
} from "datocms-structured-text-utils";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pinned model IDs (generateId()).
const GLOSSARY_TERM_ID = "VovTQzHpQMmRo-Bd5U9uGw" as const;
const ARTICLE_ID = "cYi61BrRS5KS2_rpBsA48g" as const;

type Terms = { api: string; webhook: string; sandbox: string };
type Context = {
	articleId: string;
	gettingStartedId: string;
	bodyFieldId: string;
	terms: Terms;
};

namespace Schema {
	export type GlossaryTerm = ItemTypeDefinition<
		{ locales: string },
		typeof GLOSSARY_TERM_ID,
		{ term: { type: "string" }; definition: { type: "text" } }
	>;
	export type Article = ItemTypeDefinition<
		{ locales: string },
		typeof ARTICLE_ID,
		{ title: { type: "string" }; body: { type: "structured_text" } }
	>;
}

const PATTERNS: [keyof Terms, RegExp][] = [
	["api", /\bAPI\b/],
	["webhook", /\bwebhook\b/i],
	["sandbox", /\bsandbox\b/i],
];

// Text of each top-level node of the original body, in order.
const ORIGINAL_TEXTS = [
	"Our API lets you connect any tool. Every API request is logged.",
	"A webhook tells your server when content changes. Read Getting started before you configure a webhook.",
	"Try every change in a sandbox first.Delete the sandbox when you are done; the API keeps no copy.",
];

const textOf = (node: Node): string =>
	reduceNodes(node, (acc: string, n) => acc + (isSpan(n) ? n.value : ""), "");

/** Wraps the first plain-text mention of each term in a link to its glossary record. */
function linkFirstMentions(doc: Document, terms: Terms, all = false): Document {
	const done = new Set<keyof Terms>();
	const inline = (children: InlineNode[]): InlineNode[] =>
		children.flatMap((child): InlineNode[] => {
			if (!isSpan(child)) return [child];
			const out: InlineNode[] = [];
			let rest = child.value;
			for (;;) {
				const hits = PATTERNS.filter(([k]) => all || !done.has(k))
					.map(([k, re]) => ({ k, m: re.exec(rest) }))
					.filter((h) => h.m)
					.sort((a, b) => (a.m?.index ?? 0) - (b.m?.index ?? 0));
				const hit = hits[0];
				if (!hit?.m) break;
				const { index } = hit.m;
				const word = hit.m[0];
				if (index > 0) out.push({ ...child, value: rest.slice(0, index) });
				out.push({
					type: "itemLink",
					item: terms[hit.k],
					children: [{ ...child, value: word }],
				});
				done.add(hit.k);
				rest = rest.slice(index + word.length);
			}
			if (rest) out.push({ ...child, value: rest });
			return out;
		});
	const paragraph = (p: Paragraph): Paragraph => ({ ...p, children: inline(p.children) });
	const list = (l: List): List => ({
		...l,
		children: l.children.map((li) => ({
			...li,
			children: li.children.map((c) => (isList(c) ? list(c) : paragraph(c))),
		})),
	});
	const children: Root["children"] = doc.document.children.map((c) =>
		isParagraph(c) ? paragraph(c) : isList(c) ? list(c) : c,
	);
	return { schema: "dast", document: { type: "root", children } };
}

async function linkedBody(client: Client, context: Context, all = false) {
	const article = await client.items.find<Schema.Article>(context.articleId);
	if (!article.body) throw new Error("fixture body missing");
	const body = linkFirstMentions(article.body, context.terms, all);
	body.document.children.push({
		type: "paragraph",
		children: [
			{ type: "span", value: "See also: " },
			{ type: "inlineItem", item: context.terms.api },
		],
	});
	return body;
}

async function allowGlossaryLinks(client: Client, context: Context) {
	const field = await client.fields.find(context.bodyFieldId);
	const validators = field.validators as StructuredTextFieldValidators;
	await client.fields.update(field.id, {
		validators: {
			...validators,
			structured_text_links: {
				...validators.structured_text_links,
				item_types: [...validators.structured_text_links.item_types, GLOSSARY_TERM_ID],
			},
		},
	});
}

test("links the first mention of glossary terms and adds an inline record reference", async () => {
	const outcome = await runE2ETest<Context>({
		name: "structured-text-record-links",
		maxAttempts: 12,
		fixtures: async (client) => {
			await client.itemTypes.create({
				id: GLOSSARY_TERM_ID,
				name: "Glossary term",
				api_key: "glossary_term",
			});
			await client.fields.create(GLOSSARY_TERM_ID, {
				label: "Term",
				api_key: "term",
				field_type: "string",
			});
			await client.fields.create(GLOSSARY_TERM_ID, {
				label: "Definition",
				api_key: "definition",
				field_type: "text",
			});
			await client.itemTypes.create({ id: ARTICLE_ID, name: "Article", api_key: "article" });
			await client.fields.create(ARTICLE_ID, {
				label: "Title",
				api_key: "title",
				field_type: "string",
			});
			const body = await client.fields.create(ARTICLE_ID, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				validators: {
					structured_text_blocks: { item_types: [] },
					structured_text_links: { item_types: [ARTICLE_ID] },
				},
			});

			const term = (t: string, definition: string) =>
				client.items.create<Schema.GlossaryTerm>({
					item_type: { type: "item_type", id: GLOSSARY_TERM_ID },
					term: t,
					definition,
				});
			const api = await term("API", "The programmable interface to the platform.");
			const webhook = await term("Webhook", "An HTTP callback sent when something changes.");
			const sandbox = await term("Sandbox", "An isolated copy of the project for testing.");

			const gettingStarted = await client.items.create<Schema.Article>({
				item_type: { type: "item_type", id: ARTICLE_ID },
				title: "Getting started",
				body: null,
			});
			const paragraph = (value: string): Paragraph => ({
				type: "paragraph",
				children: [{ type: "span", value }],
			});
			const article = await client.items.create<Schema.Article>({
				item_type: { type: "item_type", id: ARTICLE_ID },
				title: "Integrations",
				body: {
					schema: "dast",
					document: {
						type: "root",
						children: [
							paragraph("Our API lets you connect any tool. Every API request is logged."),
							{
								type: "paragraph",
								children: [
									{
										type: "span",
										value: "A webhook tells your server when content changes. Read ",
									},
									{
										type: "itemLink",
										item: gettingStarted.id,
										children: [{ type: "span", value: "Getting started" }],
									},
									{ type: "span", value: " before you configure a webhook." },
								],
							},
							{
								type: "list",
								style: "bulleted",
								children: [
									{
										type: "listItem",
										children: [paragraph("Try every change in a sandbox first.")],
									},
									{
										type: "listItem",
										children: [
											paragraph("Delete the sandbox when you are done; the API keeps no copy."),
										],
									},
								],
							},
						],
					},
				},
			});
			return {
				articleId: article.id,
				gettingStartedId: gettingStarted.id,
				bodyFieldId: body.id,
				terms: { api: api.id, webhook: webhook.id, sandbox: sandbox.id },
			};
		},
		task: () =>
			`In the article "Integrations", turn the first mention of each glossary term (API, webhook, sandbox) into a link to its glossary entry, keeping the words as they are. ` +
			`Then add a last paragraph at the end of the body that reads "See also: " followed by the "API" glossary entry embedded inline as a record card (not as linked text). Leave the rest of the body as it is.`,
		solution: async ({ cmaClient, context }) => {
			await allowGlossaryLinks(cmaClient, context);
			await cmaClient.items.update<Schema.Article>(context.articleId, {
				body: await linkedBody(cmaClient, context),
			});
		},
		traps: {
			"writes the links without allowing glossary terms": async ({ cmaClient, context }) => {
				await cmaClient.items.update<Schema.Article>(context.articleId, {
					body: await linkedBody(cmaClient, context),
				});
			},
			"replaces the allowed models with glossary_term only": async ({
				cmaClient,
				context,
			}) => {
				await cmaClient.fields.update(context.bodyFieldId, {
					validators: {
						structured_text_blocks: { item_types: [] },
						structured_text_links: { item_types: [GLOSSARY_TERM_ID] },
					},
				});
				await cmaClient.items.update<Schema.Article>(context.articleId, {
					body: await linkedBody(cmaClient, context),
				});
			},
			"links every mention, not only the first": async ({ cmaClient, context }) => {
				await allowGlossaryLinks(cmaClient, context);
				await cmaClient.items.update<Schema.Article>(context.articleId, {
					body: await linkedBody(cmaClient, context, true),
				});
			},
		},
		assert: async ({ cmaClient, context }) => {
			const field = await cmaClient.fields.find(context.bodyFieldId);
			const validators = field.validators as Partial<StructuredTextFieldValidators>;
			const allowed = validators.structured_text_links?.item_types ?? [];
			expect(allowed, "links to articles must stay allowed").toContain(ARTICLE_ID);
			expect(allowed, "links to glossary terms must be allowed").toContain(GLOSSARY_TERM_ID);

			const article = await cmaClient.items.find<Schema.Article>(context.articleId);
			const body = article.body;
			if (!body) throw new Error("body was emptied");
			const children = body.document.children;

			// Same structure and text, plus one final paragraph.
			expect(children.map((c) => c.type), "top-level nodes").toEqual([
				"paragraph",
				"paragraph",
				"list",
				"paragraph",
			]);
			const list = children[2];
			if (!list || !isList(list)) throw new Error("the list is gone");
			expect(list.style).toBe("bulleted");
			expect(list.children, "list items").toHaveLength(2);
			expect(
				children.slice(0, 3).map((c) => textOf(c)),
				"text of the existing body",
			).toEqual(ORIGINAL_TEXTS);

			// Text segments in document order, each with the record it links to.
			type Segment = { text: string; link: string | null; node: Node | null };
			const segments: Segment[] = [];
			const walk = (node: Node, link: string | null, linkNode: Node | null) => {
				if (isSpan(node)) segments.push({ text: node.value, link, node: linkNode });
				else if (isItemLink(node)) for (const c of node.children) walk(c, node.item, node);
				else if ("children" in node) for (const c of node.children) walk(c, link, linkNode);
			};
			for (const c of children.slice(0, 3)) walk(c, null, null);
			const full = segments.map((s) => s.text).join("");
			const ownerAt = (offset: number) => {
				let at = 0;
				for (const s of segments) {
					if (offset < at + s.text.length) return { segment: s, start: at };
					at += s.text.length;
				}
				throw new Error(`offset ${offset} out of range`);
			};
			const glossaryIds = Object.values(context.terms);
			for (const [key, re] of PATTERNS) {
				const global = new RegExp(re.source, `${re.flags}g`);
				const matches = [...full.matchAll(global)];
				expect(matches.length, `mentions of ${key}`).toBeGreaterThan(1);
				matches.forEach((m, i) => {
					const { segment } = ownerAt(m.index ?? 0);
					if (i === 0) {
						expect(segment.link, `first "${m[0]}" must link to its glossary entry`).toBe(
							context.terms[key],
						);
						const linkText = segments
							.filter((s) => s.node === segment.node)
							.map((s) => s.text)
							.join("");
						expect(linkText, `link text of "${m[0]}"`).toBe(m[0]);
					} else {
						expect(
							glossaryIds.includes(segment.link ?? ""),
							`later "${m[0]}" (#${i + 1}) must stay plain`,
						).toBe(false);
					}
				});
			}
			const articleLinks = segments.filter((s) => s.link === context.gettingStartedId);
			expect(
				articleLinks.map((s) => s.text).join(""),
				"the link to Getting started must stay",
			).toBe("Getting started");

			// Final paragraph: "See also: " then the API record inline.
			const last = children[3];
			if (!last || !isParagraph(last)) throw new Error("no final paragraph");
			const itemIndex = last.children.findIndex(isInlineItem);
			const inlineItem = last.children[itemIndex];
			if (!inlineItem || !isInlineItem(inlineItem))
				throw new Error("the final paragraph has no inline record");
			expect(inlineItem.item, "inline record").toBe(context.terms.api);
			expect(last.children.filter(isInlineItem)).toHaveLength(1);
			expect(last.children.some(isItemLink), "no linked text in the final paragraph").toBe(
				false,
			);
			const before = last.children
				.slice(0, itemIndex)
				.map((n) => (isSpan(n) ? n.value : ""))
				.join("");
			expect(before.trim(), "text before the inline record").toBe("See also:");
			expect(textOf(last).trim(), "final paragraph text").toMatch(/^See also:\s*\.?$/);
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

	console.log(
		`✓ ${outcome.name} passed in ${outcome.attempts} script attempt(s). Transcript: ${outcome.transcriptPath}`,
	);
});
