import type { ItemTypeDefinition } from "@datocms/cma-client-node";
import {
    collectNodes,
    isLink,
    isSpan,
} from "datocms-structured-text-utils";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pre-set model IDs. Passed to `itemTypes.create({ id })` to pin the runtime
// ID, and referenced as `typeof X_ID` in the Schema types below so every
// `item_type.id` in typed client calls is statically checked against it.
// echo 'import { generateId } from "@datocms/cma-client"; for (let i=0; i<10; i++) console.log(generateId())' | npx datocms cma:script --api-token XXX
const BLOG_POST_ID = "Pa1dGv9jSme0XcK7uYWqRw" as const;

type Context = { recordId: string };

namespace Schema {
	export type BlogPost = ItemTypeDefinition<
		{ locales: string },
		typeof BLOG_POST_ID,
		{
			title: { type: "string" };
			body: { type: "structured_text" };
		}
	>;
}

const PARAGRAPHS = [
	"We're thrilled to announce that Acme has acquired BetaCo. Reach our team at hello@acme.example for press inquiries.",
	"Acme will continue to operate independently.",
	"Send partnership requests to partners@acme.example or reach out to Acme directly.",
	"Press contacts: media@acme.example. Acme remains committed to innovation.",
] as const;

const EXPECTED_EMAILS = [
	"hello@acme.example",
	"partners@acme.example",
	"media@acme.example",
] as const;

test("bolds every brand mention via span splitting and wraps emails in mailto link nodes", async () => {
	const outcome = await runE2ETest<Context>({
		name: "structured-text-marks-and-links",
		maxAttempts: 10,
		fixtures: async (client) => {
			const model = await client.itemTypes.create({
				id: BLOG_POST_ID,
				name: "Blog Post",
				api_key: "blog_post",
			});
			await client.fields.create(model.id, {
				label: "Title",
				api_key: "title",
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

			const record = await client.items.create<Schema.BlogPost>({
				item_type: { type: "item_type", id: BLOG_POST_ID },
				title: "Acme press release",
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
			`update the "blog_post" record with ID "${context.recordId}". In its "body" structured text field, do BOTH of the following without changing the visible plain text:\n` +
			`1. Bold every literal occurrence of the word "Acme". Do not bold any other characters.\n` +
			`2. Wrap every email address found inside spans in a DAST "link" node whose "url" attribute is "mailto:" followed by the email itself.\n` +
			`The total plain text content of the document must remain identical to the original.`,
		assert: async ({ cmaClient, context }) => {
			const record = await cmaClient.items.find<Schema.BlogPost>(
				context.recordId,
			);
			expect(record.body, "body should not be null").not.toBeNull();
			if (!record.body) return;

			const spans = collectNodes(record.body, isSpan);

			// 1. Plain text content preserved (concat of every span value).
			const reconstructed = spans.map(({ node }) => node.value).join("");
			expect(
				reconstructed,
				"concatenated span values must match original plain text",
			).toBe(PARAGRAPHS.join(""));

			// 2. Acme is always its own span and always strong.
			const acmeSpans = spans.filter(({ node }) => node.value.includes("Acme"));
			expect(
				acmeSpans,
				"4 standalone spans must contain Acme (one per occurrence)",
			).toHaveLength(4);
			for (const { node } of acmeSpans) {
				expect(
					node.value,
					"span containing Acme must contain ONLY the word Acme (split required)",
				).toBe("Acme");
				expect(
					node.marks ?? [],
					"Acme span must carry the strong mark",
				).toContain("strong");
			}

			// 3. Three mailto link nodes, each with one span child = the email.
			const links = collectNodes(record.body, isLink);
			const mailtoLinks = links.filter(({ node }) =>
				node.url.startsWith("mailto:"),
			);
			expect(
				mailtoLinks,
				"there must be exactly 3 mailto link nodes",
			).toHaveLength(3);

			const foundEmails = new Set<string>();
			for (const { node } of mailtoLinks) {
				const childSpans = node.children.filter(isSpan);
				const linkedText = childSpans.map((s) => s.value).join("");
				expect(
					linkedText,
					"link must contain a span with the email address",
				).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
				expect(
					node.url,
					`url must be "mailto:" + the email (got ${node.url})`,
				).toBe(`mailto:${linkedText}`);
				foundEmails.add(linkedText);
			}
			expect(
				foundEmails,
				"the three expected emails must each appear in a mailto link",
			).toEqual(new Set(EXPECTED_EMAILS));
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
