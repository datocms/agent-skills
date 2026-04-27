import type { ItemTypeDefinition } from "@datocms/cma-client-node";
import {
	collectNodes,
	isHeading,
	isParagraph,
	isSpan,
	reduceNodes,
} from "datocms-structured-text-utils";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pre-set model IDs. Passed to `itemTypes.create({ id })` to pin the runtime
// ID, and referenced as `typeof X_ID` in the Schema types below so every
// `item_type.id` in typed client calls is statically checked against it.
// echo 'import { generateId } from "@datocms/cma-client"; for (let i=0; i<10; i++) console.log(generateId())' | npx datocms cma:script --api-token XXX

const SESSION_NOTE_ID = "JTw8s_K5Q9q_7wFmbEgx0A" as const;
     
type Context = { recordId: string };

namespace Schema {
	export type SessionNote = ItemTypeDefinition<
		{ locales: string },
		typeof SESSION_NOTE_ID,
		{
			title: { type: "string" };
			speaker: { type: "string" };
			body: { type: "structured_text" };
		}
	>;
}

test("rewrites brand name, demotes headings and prunes empty paragraphs in structured text", async () => {
	const outcome = await runE2ETest<Context>({
		name: "structured-text-transform",
		maxAttempts: 10,
		fixtures: async (client) => {
			const model = await client.itemTypes.create({
				id: SESSION_NOTE_ID,
				name: "Session Note",
				api_key: "session_note",
			});
			await client.fields.create(model.id, {
				label: "Title",
				api_key: "title",
				field_type: "string",
			});
			await client.fields.create(model.id, {
				label: "Speaker",
				api_key: "speaker",
				field_type: "string",
			});
			await client.fields.create(model.id, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				validators: {
					structured_text_blocks: { item_types: [] },
					structured_text_links: { item_types: [] },
				},
			});

			const record = await client.items.create<Schema.SessionNote>({
				item_type: { type: "item_type", id: SESSION_NOTE_ID },
				title: "Modern Web Tooling",
				speaker: "Dana Kim",
				body: {
					schema: "dast",
					document: {
						type: "root",
						children: [
							{
								type: "heading",
								level: 1,
								children: [{ type: "span", value: "Bundlers in 2026" }],
							},
							{
								type: "paragraph",
								children: [
									{
										type: "span",
										value:
											"For years webpack has been the default. Teams reach for webpack by reflex.",
									},
								],
							},
							{
								type: "paragraph",
								children: [
									{
										type: "span",
										value:
											"When we measured build times on a mid-size app, webpack was 3x slower than newer bundlers.",
									},
								],
							},
							{
								type: "paragraph",
								children: [{ type: "span", value: "   " }],
							},
							{
								type: "heading",
								level: 1,
								children: [{ type: "span", value: "Takeaway" }],
							},
							{
								type: "paragraph",
								children: [
									{
										type: "span",
										value:
											"Consider migrating off webpack for greenfield work.",
									},
								],
							},
						],
					},
				},
			});

			return { recordId: record.id };
		},
		task: ({ context }) =>
			`update the "session_note" record with ID "${context.recordId}". In its "body" structured text field: (1) rename every occurrence of the word "webpack" to "rspack" (preserve surrounding punctuation and letter casing of the rest of the sentence — just the word itself changes), (2) demote every top-level heading from h1 to h2, (3) remove any paragraph whose only text content is whitespace.`,
		assert: async ({ cmaClient, context }) => {
			const record = await cmaClient.items.find<Schema.SessionNote>(
				context.recordId,
			);
			expect(record.body, "body should not be null").not.toBeNull();
			if (!record.body) return;

			const spans = collectNodes(record.body, isSpan);
			const headings = collectNodes(record.body, isHeading);
			const emptyParagraphs = collectNodes(
				record.body,
				(node) =>
					isParagraph(node) &&
					reduceNodes(
						node,
						(acc, n) => (isSpan(n) ? acc + n.value : acc),
						"",
					).trim() === "",
			);

			const webpackCount = spans.filter(({ node }) =>
				/\bwebpack\b/i.test(node.value),
			).length;
			const rspackCount = spans.filter(({ node }) =>
				/\brspack\b/i.test(node.value),
			).length;
			const h1Count = headings.filter(({ node }) => node.level === 1).length;
			const h2Count = headings.filter(({ node }) => node.level === 2).length;

			expect(webpackCount, '"webpack" mentions remaining').toBe(0);
			expect(rspackCount, '"rspack" mentions').toBeGreaterThanOrEqual(3);
			expect(h1Count, "h1 headings remaining").toBe(0);
			expect(h2Count, "h2 headings").toBeGreaterThanOrEqual(2);
			expect(emptyParagraphs, "empty paragraphs remaining").toHaveLength(0);
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
