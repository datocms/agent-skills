import type { ApiTypes, ItemTypeDefinition } from "@datocms/cma-client-node";
import {
	collectNodes,
	isHeading,
	isLink,
	isList,
	isParagraph,
	isSpan,
	validate,
} from "datocms-structured-text-utils";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

const IMPORT_ARTICLE_ID = "pecGQ6rVTKyeBuj0zsZ3tA" as const;
const TITLE = "Markdown field guide";
const SUMMARY = "A synthetic import example.";
const GUIDE_URL = "https://example.com/guide?source=markdown";

namespace Schema {
	export type ImportArticle = ItemTypeDefinition<
		{ locales: "en" | "it" },
		typeof IMPORT_ARTICLE_ID,
		{
			title: { type: "string" };
			summary: { type: "text" };
			body: { type: "structured_text"; localized: true };
		}
	>;
}

type Context = {
	existingRecord: ApiTypes.Item<Schema.ImportArticle>;
};

// These CommonMark forms are deliberately outside Dastdown's surface syntax.
const MARKDOWN = [
	"Markdown field guide",
	"====================",
	"",
	"Read _carefully_ and **keep the wording**. Open the [guide][docs].",
	"",
	"+ First step",
	"+ Second step",
	"",
	`[docs]: ${GUIDE_URL}`,
].join("\n");

test("creates a localized record from Markdown while preserving existing records", async () => {
	const outcome = await runE2ETest<Context>({
		name: "structured-text-import-markdown",
		maxAttempts: 10,
		fixtures: async (client) => {
			await client.site.update({ locales: ["en", "it"] });
			const model = await client.itemTypes.create({
				id: IMPORT_ARTICLE_ID,
				name: "Import Article",
				api_key: "import_article",
				draft_mode_active: true,
			});
			await client.fields.create(model.id, {
				label: "Title",
				api_key: "title",
				field_type: "string",
			});
			await client.fields.create(model.id, {
				label: "Summary",
				api_key: "summary",
				field_type: "text",
			});
			await client.fields.create(model.id, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				localized: true,
				validators: {
					structured_text_blocks: { item_types: [] },
					structured_text_inline_blocks: { item_types: [] },
					structured_text_links: { item_types: [] },
				},
			});
			const existingRecord = await client.items.create<Schema.ImportArticle>({
				item_type: { type: "item_type", id: IMPORT_ARTICLE_ID },
				title: "Keep this article",
				summary: "This existing summary must survive the import.",
				body: {
					en: {
						schema: "dast",
						document: {
							type: "root",
							children: [
								{
									type: "paragraph",
									children: [
										{ type: "span", value: "Existing English content." },
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
								{
									type: "paragraph",
									children: [
										{ type: "span", value: "Contenuto italiano esistente." },
									],
								},
							],
						},
					},
				},
			});
			return { existingRecord };
		},
		task: () =>
			`Create exactly one new "import_article" record titled "${TITLE}" with summary "${SUMMARY}". ` +
			`Import the following Markdown into the English ("en") locale of its "body" Structured Text field, preserving the wording, heading, emphasis, bold text, list, and link. ` +
			`Leave the Italian ("it") body empty, keep the record as a draft, and leave all existing records and schema unchanged.\n\n` +
			`\`\`\`markdown\n${MARKDOWN}\n\`\`\``,
		assert: async ({ cmaClient, context }) => {
			const records = await cmaClient.items.list<Schema.ImportArticle>({
				filter: { type: IMPORT_ARTICLE_ID },
			});
			expect(records, "exactly one article must be added").toHaveLength(2);
			const record = records.find(
				(item) => item.id !== context.existingRecord.id,
			);
			if (!record) throw new Error("missing imported article");
			expect(record.title).toBe(TITLE);
			expect(record.summary).toBe(SUMMARY);
			expect(record.meta.status).toBe("draft");
			expect(record.body.it, "Italian must remain empty").toBeNull();
			const body = record.body.en;
			if (!body) throw new Error("missing English Structured Text");
			expect(
				validate(body).valid,
				"saved DAST must be structurally valid",
			).toBe(true);
			expect(body.document.children.map((node) => node.type)).toEqual([
				"heading",
				"paragraph",
				"list",
			]);

			const headings = collectNodes(body, isHeading).map(({ node }) => node);
			expect(headings).toHaveLength(1);
			expect(headings[0]?.level, "Setext heading must become h1").toBe(1);
			expect(
				headings[0]?.children
					.filter(isSpan)
					.map((node) => node.value)
					.join(""),
				"Markdown title must remain in the heading",
			).toBe("Markdown field guide");
			const introductoryParagraph = body.document.children[1];
			if (!introductoryParagraph || !isParagraph(introductoryParagraph)) {
				throw new Error("missing imported introductory paragraph");
			}
			expect(
				collectNodes(introductoryParagraph, isSpan)
					.map(({ node }) => node.value)
					.join(""),
				"Markdown paragraph must retain its text separately from the heading and list",
			).toBe("Read carefully and keep the wording. Open the guide.");
			const spans = collectNodes(body, isSpan).map(({ node }) => node);
			expect(
				spans
					.filter((node) => node.marks?.includes("emphasis"))
					.map((node) => node.value)
					.join(""),
			).toBe("carefully");
			expect(
				spans
					.filter((node) => node.marks?.includes("strong"))
					.map((node) => node.value)
					.join(""),
			).toBe("keep the wording");
			expect(spans.map((node) => node.value).join("")).toBe(
				"Markdown field guideRead carefully and keep the wording. Open the guide.First stepSecond step",
			);
			const links = collectNodes(body, isLink).map(({ node }) => node);
			expect(links).toHaveLength(1);
			expect(links[0]?.url, "reference-style Markdown link must resolve").toBe(
				GUIDE_URL,
			);
			expect(links[0]?.children.map((node) => node.value).join("")).toBe(
				"guide",
			);
			const lists = collectNodes(body, isList).map(({ node }) => node);
			expect(lists).toHaveLength(1);
			expect(lists[0]?.style, "plus markers must become a bulleted list").toBe(
				"bulleted",
			);
			expect(
				lists[0]?.children.map((item) =>
					item.children
						.filter(isParagraph)
						.map((paragraph) =>
							paragraph.children
								.filter(isSpan)
								.map((span) => span.value)
								.join(""),
						)
						.join(""),
				),
			).toEqual(["First step", "Second step"]);

			const existing = await cmaClient.items.find<Schema.ImportArticle>(
				context.existingRecord.id,
			);
			expect(existing.title).toBe(context.existingRecord.title);
			expect(existing.summary).toBe(context.existingRecord.summary);
			expect(existing.body, "both existing locales must be untouched").toEqual(
				context.existingRecord.body,
			);
			expect(
				existing.meta.current_version,
				"existing record must not be written",
			).toBe(context.existingRecord.meta.current_version);
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
