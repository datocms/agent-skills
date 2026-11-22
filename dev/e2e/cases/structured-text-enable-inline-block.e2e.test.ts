import {
	buildBlockRecord,
	type Client,
	type ItemTypeDefinition,
	type StructuredTextFieldValidators,
} from "@datocms/cma-client-node";
import {
	collectNodes,
	isBlock,
	isInlineBlock,
	isItemLink,
	isParagraph,
	isSpan,
	type Node,
	reduceNodes,
} from "datocms-structured-text-utils";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pinned model IDs (generateId()), so typed guards narrow on literal ids.
const CALLOUT_ID = "fHGioLPsTgGB7GN9aUqXDw" as const;
const PRODUCT_MENTION_ID = "EZf_bKjDT9aBTa4XTOC3fQ" as const;
const GUIDE_ID = "O8ZLvbA9R8ikGUSh-OqKOw" as const;

const SENTENCE_PARAGRAPH =
	"Once you have an account, pick a template. Try the Starter kit today.";

type Context = {
	recordId: string;
	linkedGuideId: string;
	bodyFieldId: string;
	calloutBlockId: string;
};

namespace Schema {
	export type Callout = ItemTypeDefinition<
		{ locales: string },
		typeof CALLOUT_ID,
		{ message: { type: "string" } }
	>;
	export type ProductMention = ItemTypeDefinition<
		{ locales: string },
		typeof PRODUCT_MENTION_ID,
		{ name: { type: "string" }; url: { type: "string" } }
	>;
	export type Guide = ItemTypeDefinition<
		{ locales: string },
		typeof GUIDE_ID,
		{
			title: { type: "string" };
			body: {
				type: "structured_text";
				blocks: Callout;
				inline_blocks: ProductMention;
			};
		}
	>;
}

const textOf = <B, I>(node: Node<B, I>): string =>
	reduceNodes(node, (acc: string, n) => acc + (isSpan(n) ? n.value : ""), "");

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** The guide body with every block kept by id: what a write that keeps the content sends. */
async function bodyKeepingBlocks(client: Client, context: Context) {
	const guide = await client.items.find<Schema.Guide>(context.recordId);
	if (!guide.body) throw new Error("fixture body missing");
	return guide.body;
}

/** The body with the sentence turned into text + inline product mention + text. */
async function bodyWithMention(client: Client, context: Context) {
	const body = await bodyKeepingBlocks(client, context);
	return {
		schema: "dast" as const,
		document: {
			type: "root" as const,
			children: body.document.children.map((child) => {
				if (!isParagraph(child) || textOf(child) !== SENTENCE_PARAGRAPH)
					return child;
				return {
					type: "paragraph" as const,
					children: [
						{
							type: "span" as const,
							value: "Once you have an account, pick a template. Try the ",
						},
						{
							type: "inlineBlock" as const,
							item: buildBlockRecord<Schema.ProductMention>({
								item_type: { type: "item_type", id: PRODUCT_MENTION_ID },
								name: "Starter kit",
								url: "/kits/starter",
							}),
						},
						{ type: "span" as const, value: " today." },
					],
				};
			}),
		},
	};
}

test("allows an inline block on a Structured Text field without losing its other allow-lists", async () => {
	const outcome = await runE2ETest<Context>({
		name: "structured-text-enable-inline-block",
		maxAttempts: 12,
		fixtures: async (client) => {
			await client.itemTypes.create({
				id: CALLOUT_ID,
				name: "Callout",
				api_key: "callout",
				modular_block: true,
			});
			await client.fields.create(CALLOUT_ID, {
				label: "Message",
				api_key: "message",
				field_type: "string",
			});
			await client.itemTypes.create({
				id: PRODUCT_MENTION_ID,
				name: "Product mention",
				api_key: "product_mention",
				modular_block: true,
			});
			await client.fields.create(PRODUCT_MENTION_ID, {
				label: "Name",
				api_key: "name",
				field_type: "string",
			});
			await client.fields.create(PRODUCT_MENTION_ID, {
				label: "URL",
				api_key: "url",
				field_type: "string",
			});
			await client.itemTypes.create({
				id: GUIDE_ID,
				name: "Guide",
				api_key: "guide",
				draft_mode_active: true,
			});
			await client.fields.create(GUIDE_ID, {
				label: "Title",
				api_key: "title",
				field_type: "string",
			});
			const body = await client.fields.create(GUIDE_ID, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				validators: {
					structured_text_blocks: { item_types: [CALLOUT_ID] },
					structured_text_links: { item_types: [GUIDE_ID] },
				},
			});

			const linked = await client.items.create<Schema.Guide>({
				item_type: { type: "item_type", id: GUIDE_ID },
				title: "Advanced setup",
				body: null,
			});
			const record = await client.items.create<Schema.Guide>({
				item_type: { type: "item_type", id: GUIDE_ID },
				title: "Getting started",
				body: {
					schema: "dast",
					document: {
						type: "root",
						children: [
							{
								type: "paragraph",
								children: [
									{
										type: "span",
										value:
											"This guide walks you through your first project. For more, read ",
									},
									{
										type: "itemLink",
										item: linked.id,
										children: [{ type: "span", value: "Advanced setup" }],
									},
									{ type: "span", value: "." },
								],
							},
							{
								type: "block",
								item: buildBlockRecord<Schema.Callout>({
									item_type: { type: "item_type", id: CALLOUT_ID },
									message: "Back up your data before you start.",
								}),
							},
							{
								type: "paragraph",
								children: [{ type: "span", value: SENTENCE_PARAGRAPH }],
							},
							{
								type: "paragraph",
								children: [{ type: "span", value: "Happy building!" }],
							},
						],
					},
				},
			});
			const saved = await client.items.find<Schema.Guide>(record.id);
			const callout = saved.body?.document.children.find(isBlock);
			if (!callout) throw new Error("fixture callout missing");
			return {
				recordId: record.id,
				linkedGuideId: linked.id,
				bodyFieldId: body.id,
				calloutBlockId: callout.item,
			};
		},
		task: () =>
			`In the guide "Getting started", the sentence "Try the Starter kit today." should show the Starter kit as an inline product mention (name "Starter kit", url "/kits/starter") instead of plain text. ` +
			`Editors must be able to insert product mentions inline in guide bodies from now on. Keep everything else in the body as it is, and do not publish the guide.`,
		solution: async ({ cmaClient, context }) => {
			const field = await cmaClient.fields.find(context.bodyFieldId);
			await cmaClient.fields.update(field.id, {
				validators: {
					...(field.validators as StructuredTextFieldValidators),
					structured_text_inline_blocks: { item_types: [PRODUCT_MENTION_ID] },
				},
			});
			await cmaClient.items.update<Schema.Guide>(context.recordId, {
				body: await bodyWithMention(cmaClient, context),
			});
		},
		traps: {
			"writes the inline block without allowing it on the field": async ({
				cmaClient,
				context,
			}) => {
				await cmaClient.items.update<Schema.Guide>(context.recordId, {
					body: await bodyWithMention(cmaClient, context),
				});
			},
			"sends only the inline-block allow-list as the field's validators": async ({
				cmaClient,
				context,
			}) => {
				// The typed client refuses this payload: cast it, as an untyped script would send it.
				await cmaClient.fields.update(context.bodyFieldId, {
					validators: {
						structured_text_inline_blocks: { item_types: [PRODUCT_MENTION_ID] },
					} as unknown as StructuredTextFieldValidators,
				});
				await cmaClient.items.update<Schema.Guide>(context.recordId, {
					body: await bodyWithMention(cmaClient, context),
				});
			},
			"fills the other two allow-lists with empty lists": async ({
				cmaClient,
				context,
			}) => {
				await cmaClient.fields.update(context.bodyFieldId, {
					validators: {
						structured_text_blocks: { item_types: [] },
						structured_text_links: { item_types: [] },
						structured_text_inline_blocks: { item_types: [PRODUCT_MENTION_ID] },
					},
				});
				await cmaClient.items.update<Schema.Guide>(context.recordId, {
					body: await bodyWithMention(cmaClient, context),
				});
			},
			// Narrowing an allow-list rewrites existing records: the callout block is
			// deleted and the link to the other guide is unwrapped into plain text.
			// Putting the allow-lists back afterwards does not bring them back.
			"empties the other allow-lists, then restores them": async ({
				cmaClient,
				context,
			}) => {
				await cmaClient.fields.update(context.bodyFieldId, {
					validators: {
						structured_text_blocks: { item_types: [] },
						structured_text_links: { item_types: [] },
						structured_text_inline_blocks: { item_types: [PRODUCT_MENTION_ID] },
					},
				});
				await cmaClient.fields.update(context.bodyFieldId, {
					validators: {
						structured_text_blocks: { item_types: [CALLOUT_ID] },
						structured_text_links: { item_types: [GUIDE_ID] },
						structured_text_inline_blocks: { item_types: [PRODUCT_MENTION_ID] },
					},
				});
				await cmaClient.items.update<Schema.Guide>(context.recordId, {
					body: await bodyWithMention(cmaClient, context),
				});
			},
		},
		assert: async ({ cmaClient, context }) => {
			// 1. The three allow-lists.
			const field = await cmaClient.fields.find(context.bodyFieldId);
			const validators =
				field.validators as Partial<StructuredTextFieldValidators>;
			expect(
				validators.structured_text_blocks?.item_types ?? [],
				"callout must still be allowed as a block",
			).toContain(CALLOUT_ID);
			expect(
				validators.structured_text_links?.item_types ?? [],
				"links to guide records must still be allowed",
			).toContain(GUIDE_ID);
			expect(
				validators.structured_text_inline_blocks?.item_types ?? [],
				"product_mention must be allowed inline",
			).toContain(PRODUCT_MENTION_ID);

			const guide = await cmaClient.items.find<Schema.Guide>(context.recordId, {
				nested: true,
			});
			const body = guide.body;
			if (!body) throw new Error("body was emptied");
			const children = body.document.children;

			// 2. Same top-level shape: paragraph, callout, paragraph, paragraph.
			expect(
				children.map((c) => c.type),
				"top-level nodes must be unchanged",
			).toEqual(["paragraph", "block", "paragraph", "paragraph"]);

			// 3. The callout is the same block (same id, same message).
			const callout = children[1];
			if (!callout || !isBlock(callout)) throw new Error("callout block missing");
			expect(callout.item.id, "callout must keep its id").toBe(
				context.calloutBlockId,
			);
			expect(callout.item.attributes.message).toBe(
				"Back up your data before you start.",
			);

			// 4. The link to the other guide is intact.
			const links = collectNodes(body, isItemLink).map(({ node }) => node);
			expect(links, "exactly one record link").toHaveLength(1);
			expect(links[0]?.item).toBe(context.linkedGuideId);
			expect(links[0] && textOf(links[0])).toBe("Advanced setup");
			const first = children[0];
			expect(first && squash(textOf(first))).toBe(
				"This guide walks you through your first project. For more, read Advanced setup.",
			);
			const last = children[3];
			expect(last && squash(textOf(last))).toBe("Happy building!");

			// 5. The sentence: text + inline product mention + text.
			const paragraph = children[2];
			if (!paragraph || !isParagraph(paragraph))
				throw new Error("third node must be a paragraph");
			const inlineIndex = paragraph.children.findIndex(isInlineBlock);
			const inline = paragraph.children[inlineIndex];
			if (!inline || !isInlineBlock(inline))
				throw new Error("the sentence has no inline block");
			expect(
				paragraph.children.filter(isInlineBlock),
				"exactly one inline block",
			).toHaveLength(1);
			expect(inline.item.__itemTypeId, "inline block model").toBe(
				PRODUCT_MENTION_ID,
			);
			const attributes = inline.item.attributes as Record<string, unknown>;
			expect(attributes.name).toBe("Starter kit");
			expect(attributes.url).toBe("/kits/starter");
			const before = paragraph.children.slice(0, inlineIndex);
			const after = paragraph.children.slice(inlineIndex + 1);
			const beforeText = before.map((n) => (isSpan(n) ? n.value : "?")).join("");
			const afterText = after.map((n) => (isSpan(n) ? n.value : "?")).join("");
			expect(
				squash(beforeText),
				"text before the mention",
			).toBe("Once you have an account, pick a template. Try the");
			expect(squash(afterText), "text after the mention").toBe("today.");

			// 6. Not published.
			expect(guide.meta.status, "record must stay unpublished").toBe("draft");
			expect(guide.meta.published_at).toBeNull();
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
