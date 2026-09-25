import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type ApiTypes,
	type ItemTypeDefinition,
	buildBlockRecord,
} from "@datocms/cma-client-node";
import {
	collectNodes,
	isBlock,
	isBlockWithItemOfType,
	isHeading,
	isLink,
	isSpan,
	validate,
} from "datocms-structured-text-utils";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

const IMPORT_ARTICLE_ID = "EngxF6y8TsKzQUq6vJV54w" as const;
const IMAGE_BLOCK_ID = "61xCrAHwRbuHX96CCaHrOw" as const;
const IMAGE_ALT = "Synthetic import fixture";
const GUIDE_URL = "https://example.com/guide?source=html";
// One synthetic 1x1 PNG, created locally and uploaded only to the disposable test project.
const PNG =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOQS7nzHwAEYAJeiHDUBAAAAABJRU5ErkJggg==";

namespace Schema {
	export type ImageBlock = ItemTypeDefinition<
		{ locales: "en" | "it" },
		typeof IMAGE_BLOCK_ID,
		{ image: { type: "file" }; caption: { type: "string" } }
	>;
	export type ImportArticle = ItemTypeDefinition<
		{ locales: "en" | "it" },
		typeof IMPORT_ARTICLE_ID,
		{
			title: { type: "string" };
			summary: { type: "text" };
			body: { type: "structured_text"; localized: true; blocks: ImageBlock };
		}
	>;
}

type Context = {
	original: ApiTypes.ItemInNestedResponse<Schema.ImportArticle>;
	italianBody: ApiTypes.Item<Schema.ImportArticle>["body"]["it"];
	uploadId: string;
	imageUrl: string;
};

test("imports HTML with an image mapping without changing another locale or unrelated fields", async () => {
	const outcome = await runE2ETest<Context>({
		name: "structured-text-import-html",
		maxAttempts: 10,
		fixtures: async (client) => {
			await client.site.update({ locales: ["en", "it"] });
			const imageModel = await client.itemTypes.create({
				id: IMAGE_BLOCK_ID,
				name: "Image Block",
				api_key: "image_block",
				modular_block: true,
			});
			await client.fields.create(imageModel.id, {
				label: "Image",
				api_key: "image",
				field_type: "file",
			});
			await client.fields.create(imageModel.id, {
				label: "Caption",
				api_key: "caption",
				field_type: "string",
			});
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
					structured_text_blocks: { item_types: [imageModel.id] },
					structured_text_inline_blocks: { item_types: [] },
					structured_text_links: { item_types: [] },
				},
			});

			const directory = await mkdtemp(
				join(tmpdir(), "structured-text-import-"),
			);
			const localPath = join(directory, "synthetic-import.png");
			const upload = await (async () => {
				try {
					await writeFile(localPath, Buffer.from(PNG, "base64"));
					return await client.uploads.createFromLocalFile({ localPath });
				} finally {
					await rm(directory, { recursive: true, force: true });
				}
			})();
			const record = await client.items.create<Schema.ImportArticle>({
				item_type: { type: "item_type", id: IMPORT_ARTICLE_ID },
				title: "Keep this title",
				summary: "Keep this summary too.",
				body: {
					en: {
						schema: "dast",
						document: {
							type: "root",
							children: [
								{
									type: "paragraph",
									children: [
										{ type: "span", value: "Replace this English content." },
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
										{ type: "span", value: "Mantieni questo testo italiano." },
									],
								},
								{
									type: "block",
									item: buildBlockRecord<Schema.ImageBlock>({
										item_type: { type: "item_type", id: IMAGE_BLOCK_ID },
										image: { upload_id: upload.id },
										caption: "Didascalia italiana da conservare.",
									}),
								},
							],
						},
					},
				},
			});
			return {
				original: await client.items.find<Schema.ImportArticle>(record.id, {
					nested: true,
				}),
				italianBody: record.body.it,
				uploadId: upload.id,
				imageUrl: upload.url,
			};
		},
		task: ({ context }) => {
			const html =
				`<h2>HTML field guide</h2>\n` +
				`<p>Keep <strong>bold wording</strong> &amp; <em>careful wording</em>. Read the <a href="${GUIDE_URL}">guide</a>.</p>\n` +
				`<img src="${context.imageUrl}" alt="${IMAGE_ALT}">\n` +
				`<p>After the image.</p>`;
			return (
				`Replace only the English ("en") locale of the "body" Structured Text field on "import_article" record "${context.original.id}" with the following HTML. ` +
				`Preserve its text, heading level, formatting, link, image position, and image alt text. ` +
				`Map the image to a new "image_block" in the English body: use the existing upload "${context.uploadId}" in the block's "image" file field and set "caption" to "English import image". ` +
				`The upload already exists; reuse it. Leave the complete Italian ("it") body, including its image block, and every other field unchanged. ` +
				`Keep the record as a draft and leave the schema unchanged.\n\n\`\`\`html\n${html}\n\`\`\``
			);
		},
		assert: async ({ cmaClient, context }) => {
			const record = await cmaClient.items.find<Schema.ImportArticle>(
				context.original.id,
				{ nested: true },
			);
			expect(record.title).toBe(context.original.title);
			expect(record.summary).toBe(context.original.summary);
			expect(record.meta.status).toBe("draft");
			const body = record.body.en;
			if (!body) throw new Error("missing imported English body");
			expect(body.document.children.map((node) => node.type)).toEqual([
				"heading",
				"paragraph",
				"block",
				"paragraph",
			]);
			const headings = collectNodes(body, isHeading).map(({ node }) => node);
			expect(headings).toHaveLength(1);
			expect(headings[0]?.level).toBe(2);
			expect(
				headings[0]?.children
					.filter(isSpan)
					.map((node) => node.value)
					.join(""),
				"HTML heading text must remain in the heading",
			).toBe("HTML field guide");
			for (const [index, expectedText] of [
				[1, "Keep bold wording & careful wording. Read the guide."],
				[3, "After the image."],
			] as const) {
				const paragraph = body.document.children[index];
				if (!paragraph)
					throw new Error(`missing paragraph at position ${index}`);
				expect(
					collectNodes(paragraph, isSpan)
						.map(({ node }) => node.value)
						.join(""),
					"paragraph text must retain its position relative to the image",
				).toBe(expectedText);
			}
			const spans = collectNodes(body, isSpan).map(({ node }) => node);
			expect(spans.map((node) => node.value).join("")).toBe(
				"HTML field guideKeep bold wording & careful wording. Read the guide.After the image.",
			);
			expect(
				spans
					.filter((node) => node.marks?.includes("strong"))
					.map((node) => node.value)
					.join(""),
			).toBe("bold wording");
			expect(
				spans
					.filter((node) => node.marks?.includes("emphasis"))
					.map((node) => node.value)
					.join(""),
			).toBe("careful wording");
			const links = collectNodes(body, isLink).map(({ node }) => node);
			expect(links).toHaveLength(1);
			expect(links[0]?.url).toBe(GUIDE_URL);
			expect(links[0]?.children.map((node) => node.value).join("")).toBe(
				"guide",
			);

			const blocks = collectNodes(body, isBlock).map(({ node }) => node);
			expect(blocks).toHaveLength(1);
			const image = blocks.find(isBlockWithItemOfType(IMAGE_BLOCK_ID));
			if (!image) throw new Error("missing mapped image block");
			expect(
				image.item.id,
				"image block must have a persisted ID",
			).toBeTruthy();
			expect(image.item.attributes.image?.upload_id).toBe(context.uploadId);
			expect(image.item.attributes.image?.alt).toBe(IMAGE_ALT);
			expect(image.item.attributes.caption).toBe("English import image");
			const italianBody = context.original.body.it;
			if (!italianBody) throw new Error("missing Italian fixture");
			const italianBlocks = collectNodes(italianBody, isBlock).map(
				({ node }) => node,
			);
			expect(italianBlocks).toHaveLength(1);
			if (!record.body.it) throw new Error("missing saved Italian body");
			const savedItalianBlocks = collectNodes(record.body.it, isBlock).map(
				({ node }) => node,
			);
			expect(savedItalianBlocks, "Italian block must survive").toHaveLength(1);
			expect(
				savedItalianBlocks[0]?.item.attributes,
				"Italian image and caption must stay unchanged",
			).toEqual(italianBlocks[0]?.item.attributes);
			expect(
				image.item.id,
				"new English block must not reuse an Italian block ID",
			).not.toBe(italianBlocks[0]?.item.id);
			const plain = await cmaClient.items.find<Schema.ImportArticle>(record.id);
			expect(
				plain.body.it,
				"Italian tree and block references must stay unchanged",
			).toEqual(context.italianBody);
			const plainBody = plain.body.en;
			if (!plainBody)
				throw new Error("missing English body in default response");
			expect(
				validate(plainBody).valid,
				"saved DAST must be structurally valid",
			).toBe(true);
			const persistedBlocks = collectNodes(plainBody, isBlock).map(
				({ node }) => node.item,
			);
			expect(
				persistedBlocks,
				"default CMA response must contain the saved block reference",
			).toEqual([image.item.id]);
			expect(
				await cmaClient.uploads.list(),
				"reuse the fixture upload without creating duplicates",
			).toHaveLength(1);
			expect(
				await cmaClient.items.list<Schema.ImportArticle>({
					filter: { type: IMPORT_ARTICLE_ID },
				}),
				"update must not create another article",
			).toHaveLength(1);
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
