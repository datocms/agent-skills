import {
    type BlockInNestedResponse,
    buildBlockRecord,
    type ItemTypeDefinition,
} from "@datocms/cma-client-node";
import {
    type Block,
    collectNodes,
    isBlock,
    isInlineBlock,
    isParagraph,
    isSpan,
} from "datocms-structured-text-utils";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pre-set model IDs. Passed to `itemTypes.create({ id })` to pin the runtime
// ID, and referenced as `typeof X_ID` in the Schema types below so every
// `item_type.id` in typed client calls is statically checked against it.
// echo 'import { generateId } from "@datocms/cma-client"; for (let i=0; i<10; i++) console.log(generateId())' | npx datocms cma:script --api-token XXX

const CODE_EXAMPLE_ID = "J60U3ECrQi-8zgxUWkyCxg" as const;
const WARNING_ID = "Hh3vSyvnQE2nViJ3jq7CBQ" as const;
const API_MENTION_INLINE_ID = "MwfBOTOiQPSf9uio2h1J_g" as const;
const API_DOC_ID = "ABlH6QwPSeSR8TmjMv1MNQ" as const;

type Context = {
	recordId: string;
};

namespace Schema {
	export type CodeExample = ItemTypeDefinition<
		{ locales: string },
		typeof CODE_EXAMPLE_ID,
		{
			language: { type: "string" };
			snippet: { type: "text" };
		}
	>;

	export type Warning = ItemTypeDefinition<
		{ locales: string },
		typeof WARNING_ID,
		{
			severity: { type: "string" };
			message: { type: "text" };
		}
	>;

	export type ApiMentionInline = ItemTypeDefinition<
		{ locales: string },
		typeof API_MENTION_INLINE_ID,
		{
			endpoint: { type: "string" };
			version: { type: "string" };
		}
	>;

	export type ApiDoc = ItemTypeDefinition<
		{ locales: string },
		typeof API_DOC_ID,
		{
			title: { type: "string" };
			body: {
				type: "structured_text";
				blocks: CodeExample | Warning;
				inline_blocks: ApiMentionInline;
			};
		}
	>;
}

test("mutates inline blocks, duplicates a regular block, appends a paragraph in structured text", async () => {
	const outcome = await runE2ETest<Context>({
		name: "structured-text-nested-blocks",
		maxAttempts: 10,
		fixtures: async (client) => {
			const codeExample = await client.itemTypes.create({
				id: CODE_EXAMPLE_ID,
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

			const warning = await client.itemTypes.create({
				id: WARNING_ID,
				name: "Warning Block",
				api_key: "warning_block",
				modular_block: true,
			});
			await client.fields.create(warning.id, {
				label: "Severity",
				api_key: "severity",
				field_type: "string",
			});
			await client.fields.create(warning.id, {
				label: "Message",
				api_key: "message",
				field_type: "text",
			});

			const apiMention = await client.itemTypes.create({
				id: API_MENTION_INLINE_ID,
				name: "API Mention Inline",
				api_key: "api_mention_inline",
				modular_block: true,
			});
			await client.fields.create(apiMention.id, {
				label: "Endpoint",
				api_key: "endpoint",
				field_type: "string",
			});
			await client.fields.create(apiMention.id, {
				label: "Version",
				api_key: "version",
				field_type: "string",
			});

			const docModel = await client.itemTypes.create({
				id: API_DOC_ID,
				name: "API Doc",
				api_key: "api_doc",
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
						item_types: [codeExample.id, warning.id],
					},
					structured_text_links: { item_types: [] },
					structured_text_inline_blocks: { item_types: [apiMention.id] },
				},
			});

			const record = await client.items.create<Schema.ApiDoc>({
				item_type: { type: "item_type", id: API_DOC_ID },
				title: "Upgrading client integrations",
				body: {
					schema: "dast",
					document: {
						type: "root",
						children: [
							{
								type: "paragraph",
								children: [
									{ type: "span", value: "Calls to " },
									{
										type: "inlineBlock",
										item: buildBlockRecord<Schema.ApiMentionInline>({
											item_type: {
												type: "item_type",
												id: API_MENTION_INLINE_ID,
											},
											endpoint: "/users",
											version: "v2",
										}),
									},
									{ type: "span", value: " and " },
									{
										type: "inlineBlock",
										item: buildBlockRecord<Schema.ApiMentionInline>({
											item_type: {
												type: "item_type",
												id: API_MENTION_INLINE_ID,
											},
											endpoint: "/orders",
											version: "v2",
										}),
									},
									{ type: "span", value: " will change." },
								],
							},
							{
								type: "block",
								item: buildBlockRecord<Schema.Warning>({
									item_type: { type: "item_type", id: WARNING_ID },
									severity: "warning",
									message:
										"Deprecated endpoints will be removed in the next quarter.",
								}),
							},
							{
								type: "block",
								item: buildBlockRecord<Schema.CodeExample>({
									item_type: { type: "item_type", id: CODE_EXAMPLE_ID },
									language: "typescript",
									snippet: "await client.users.list();",
								}),
							},
							{
								type: "paragraph",
								children: [
									{ type: "span", value: "The legacy endpoint " },
									{
										type: "inlineBlock",
										item: buildBlockRecord<Schema.ApiMentionInline>({
											item_type: {
												type: "item_type",
												id: API_MENTION_INLINE_ID,
											},
											endpoint: "/legacy",
											version: "v1",
										}),
									},
									{ type: "span", value: " is unaffected." },
								],
							},
						],
					},
				},
			});

			return { recordId: record.id };
		},
		task: ({ context }) =>
			`update the "api_doc" record with ID "${context.recordId}". In its "body" structured text field, do ALL of the following in a single update:\n` +
			`1. Find every inline block of type "api_mention_inline" whose "version" attribute equals "v2" and change it to "v3". Leave inline mentions with version "v1" untouched.\n` +
			`2. Take the first "warning_block" in the body and append a duplicate of it at the very end of the document (as the last top-level node). The duplicate must preserve severity and message.\n` +
			`3. After the duplicated warning, append one more paragraph whose only span value is exactly "Updated: 2026-04-24".\n` +
			`Do not modify the existing code_example_block or the text content of paragraphs (except for the new appended paragraph).`,
		assert: async ({ cmaClient, context }) => {
			const record = await cmaClient.items.find<Schema.ApiDoc>(
				context.recordId,
				{ nested: true },
			);
			expect(record.body, "body should not be null").not.toBeNull();
			if (!record.body) return;

			// 1. Inline `api_mention_inline` blocks: count by version.
			const versions = collectNodes(record.body, isInlineBlock).map(
				({ node }) => node.item.attributes.version,
			);
			expect(
				versions.filter((v) => v === "v2"),
				"v2 api mentions must be gone",
			).toHaveLength(0);
			expect(
				versions.filter((v) => v === "v3"),
				"v3 api mentions (from the 2 v2 originals)",
			).toHaveLength(2);
			expect(
				versions.filter((v) => v === "v1"),
				"v1 api mentions must be preserved",
			).toHaveLength(1);

			// 2. Top-level warning blocks: original + duplicate, distinct ids,
			//    same severity & message.
			//
			// `BlockInNestedResponse<Schema.CodeExample | Schema.Warning>`
			// distributes into a union; this user-defined guard narrows to the
			// Warning member so we can read `attributes.severity` / `.message`
			// without casts.
			type WarningBlockNode = {
				type: "block";
				item: Extract<
					Block<
						BlockInNestedResponse<Schema.CodeExample | Schema.Warning>
					>["item"],
					{ relationships: { item_type: { data: { id: typeof WARNING_ID } } } }
				>;
			};
			const isWarningBlock = (
				node: Block<BlockInNestedResponse<Schema.CodeExample | Schema.Warning>>,
			): node is WarningBlockNode =>
				node.item.relationships.item_type.data.id === WARNING_ID;

			const warnings = record.body.document.children
				.filter(isBlock)
				.filter(isWarningBlock);
			expect(
				warnings,
				"there should be 2 warning blocks (1 original + 1 duplicate)",
			).toHaveLength(2);

			const [firstWarning, secondWarning] = warnings;
			expect(
				new Set([firstWarning?.item.id, secondWarning?.item.id]).size,
				"duplicated warning must have a new id",
			).toBe(2);
			expect(secondWarning?.item.attributes.severity).toBe(
				firstWarning?.item.attributes.severity,
			);
			expect(secondWarning?.item.attributes.message).toBe(
				firstWarning?.item.attributes.message,
			);

			// 3. Last top-level node is a paragraph with the appended timestamp.
			const lastTopLevel = record.body.document.children.at(-1);
			expect(
				lastTopLevel && isParagraph(lastTopLevel),
				"last top-level node should be a paragraph",
			).toBe(true);
			const lastText =
				lastTopLevel && isParagraph(lastTopLevel)
					? lastTopLevel.children
							.filter(isSpan)
							.map((s) => s.value)
							.join("")
					: "";
			expect(lastText.trim()).toBe("Updated: 2026-04-24");
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
