import { type ItemTypeDefinition } from "@datocms/cma-client-node";
import {
	collectNodes,
	isBlock,
	isBlockWithItemOfType,
	isParagraph,
	isSpan,
} from "datocms-structured-text-utils";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pre-set model IDs. Passed to `itemTypes.create({ id })` to pin the runtime
// ID, and referenced as `typeof X_ID` in the Schema types below so every
// `item_type.id` in typed client calls is statically checked against it.
// echo 'import { generateId } from "@datocms/cma-client"; for (let i=0; i<10; i++) console.log(generateId())' | npx datocms cma:script --api-token XXX
const CALLOUT_BLOCK_ID = "MtLV0pREStqQ9774JW1rCQ" as const;
const CODE_EXAMPLE_BLOCK_ID = "Dr2vCP24R9WwlnvlcgJQkw" as const;
const DOC_PAGE_ID = "Qc6fr9nvTyu6BUSYgOb0Dg" as const;

type Context = { recordId: string };

namespace Schema {
	export type CalloutBlock = ItemTypeDefinition<
		{ locales: string },
		typeof CALLOUT_BLOCK_ID,
		{
			kind: { type: "string" };
			message: { type: "text" };
		}
	>;

	export type CodeExampleBlock = ItemTypeDefinition<
		{ locales: string },
		typeof CODE_EXAMPLE_BLOCK_ID,
		{
			language: { type: "string" };
			snippet: { type: "text" };
		}
	>;

	export type DocPage = ItemTypeDefinition<
		{ locales: string },
		typeof DOC_PAGE_ID,
		{
			title: { type: "string" };
			body: {
				type: "structured_text";
				blocks: CalloutBlock | CodeExampleBlock;
			};
		}
	>;
}

// Five free-form paragraphs about distinct API topics. Two of them — the
// rate-limit one and the webhook one — are the anchors for the agent's
// content-aware block insertions. The other three exist as decoys: the agent
// must NOT insert anything next to them.
const PARAGRAPHS = [
	"Authentication uses bearer tokens passed in the Authorization header on every request.",
	"Rate limits cap each API key at 1000 requests per hour, counted in a rolling window.",
	"Webhooks deliver events to your endpoint with automatic retries on failure for up to 24 hours.",
	"Pagination uses opaque cursor markers for stable iteration over large result sets.",
	"All responses are encoded as JSON unless an Accept header explicitly requests another media type.",
] as const;

test("inserts blocks at content-anchored positions in a structured text body", async () => {
	const outcome = await runE2ETest<Context>({
		name: "structured-text-content-aware-insert",
		maxAttempts: 10,
		fixtures: async (client) => {
			const callout = await client.itemTypes.create({
				id: CALLOUT_BLOCK_ID,
				name: "Callout Block",
				api_key: "callout_block",
				modular_block: true,
			});
			await client.fields.create(callout.id, {
				label: "Kind",
				api_key: "kind",
				field_type: "string",
			});
			await client.fields.create(callout.id, {
				label: "Message",
				api_key: "message",
				field_type: "text",
			});

			const codeExample = await client.itemTypes.create({
				id: CODE_EXAMPLE_BLOCK_ID,
				name: "Code Example Block",
				api_key: "code_example_block",
				modular_block: true,
			});
			await client.fields.create(codeExample.id, {
				label: "Language",
				api_key: "language",
				field_type: "string",
			});
			await client.fields.create(codeExample.id, {
				label: "Snippet",
				api_key: "snippet",
				field_type: "text",
			});

			const docModel = await client.itemTypes.create({
				id: DOC_PAGE_ID,
				name: "Doc Page",
				api_key: "doc_page",
			});
			await client.fields.create(docModel.id, {
				label: "Title",
				api_key: "title",
				field_type: "string",
			});
			await client.fields.create(docModel.id, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				validators: {
					structured_text_blocks: {
						item_types: [callout.id, codeExample.id],
					},
					structured_text_links: { item_types: [] },
				},
			});

			const record = await client.items.create<Schema.DocPage>({
				item_type: { type: "item_type", id: DOC_PAGE_ID },
				title: "API guide",
				body: {
					schema: "dast",
					document: {
						type: "root",
						children: PARAGRAPHS.map((value) => ({
							type: "paragraph",
							children: [{ type: "span", value }],
						})),
					},
				},
			});

			return { recordId: record.id };
		},
		task: ({ context }) =>
			`update the "doc_page" record with ID "${context.recordId}". In its "body" structured text field, do BOTH of the following without modifying the existing paragraphs and without reordering them:\n` +
			`1. Find the paragraph that talks about rate limiting and insert a NEW "callout_block" immediately after it (as the next top-level node). The new block must have "kind" = "warning" and a "message" that mentions HTTP status code 429.\n` +
			`2. Find the paragraph that talks about webhooks and insert a NEW "code_example_block" immediately after it (as the next top-level node). The new block must have "language" = "javascript" and a "snippet" that shows a minimal Express-style webhook handler returning HTTP 200.\n` +
			`The other three paragraphs (about authentication, pagination, JSON responses) must be left exactly as they are, with no blocks inserted next to them. Total top-level node count must be exactly 7 (5 original paragraphs + 2 new blocks).`,
		assert: async ({ cmaClient, context }) => {
			const record = await cmaClient.items.find<Schema.DocPage>(
				context.recordId,
				{ nested: true },
			);
			expect(record.body, "body should not be null").not.toBeNull();
			if (!record.body) return;

			const topLevel = record.body.document.children;
			expect(
				topLevel.length,
				"top-level must be 7 nodes (5 paragraphs + 2 inserted blocks)",
			).toBe(7);

			// Original paragraphs preserved verbatim and in order.
			const paragraphTexts = topLevel.filter(isParagraph).map((p) =>
				p.children
					.filter(isSpan)
					.map((s) => s.value)
					.join(""),
			);
			expect(
				paragraphTexts,
				"all 5 original paragraphs must be preserved unchanged and in order",
			).toEqual(PARAGRAPHS);

			const blocks = collectNodes(record.body, isBlock).map(({ node }) => node);
			expect(blocks, "exactly 2 blocks total").toHaveLength(2);

			const callouts = blocks.filter(isBlockWithItemOfType(CALLOUT_BLOCK_ID));
			expect(callouts, "exactly 1 callout_block").toHaveLength(1);
			const callout = callouts[0];
			if (!callout) throw new Error("missing callout");
			expect(callout.item.attributes.kind, "callout kind must be 'warning'").toBe(
				"warning",
			);
			expect(
				callout.item.attributes.message ?? "",
				"callout message must mention 429",
			).toMatch(/429/);

			const codeExamples = blocks.filter(
				isBlockWithItemOfType(CODE_EXAMPLE_BLOCK_ID),
			);
			expect(codeExamples, "exactly 1 code_example_block").toHaveLength(1);
			const codeExample = codeExamples[0];
			if (!codeExample) throw new Error("missing code example");
			expect(
				codeExample.item.attributes.language,
				"code example language must be 'javascript'",
			).toBe("javascript");
			const snippet = codeExample.item.attributes.snippet ?? "";
			expect(snippet.length, "code example snippet must be non-empty").toBeGreaterThan(
				0,
			);

			// Position checks: each inserted block must sit immediately AFTER the
			// paragraph it anchors to (rate-limit / webhook), and NOT next to the
			// other three paragraphs.
			const indexOfTopic = (needle: RegExp): number =>
				topLevel.findIndex(
					(n) =>
						isParagraph(n) &&
						n.children
							.filter(isSpan)
							.map((s) => s.value)
							.join("")
							.match(needle) !== null,
				);

			const rateLimitIdx = indexOfTopic(/rate limit/i);
			const webhookIdx = indexOfTopic(/webhook/i);
			expect(rateLimitIdx, "rate-limit paragraph must be present").toBeGreaterThanOrEqual(
				0,
			);
			expect(webhookIdx, "webhook paragraph must be present").toBeGreaterThanOrEqual(0);

			const afterRateLimit = topLevel[rateLimitIdx + 1];
			expect(
				afterRateLimit !== undefined &&
					isBlock(afterRateLimit) &&
					isBlockWithItemOfType(CALLOUT_BLOCK_ID, afterRateLimit),
				"the node immediately after the rate-limit paragraph must be the callout_block",
			).toBe(true);

			const afterWebhook = topLevel[webhookIdx + 1];
			expect(
				afterWebhook !== undefined &&
					isBlock(afterWebhook) &&
					isBlockWithItemOfType(CODE_EXAMPLE_BLOCK_ID, afterWebhook),
				"the node immediately after the webhook paragraph must be the code_example_block",
			).toBe(true);
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
