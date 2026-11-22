import {
	buildBlockRecord,
	type Client,
	type ItemTypeDefinition,
} from "@datocms/cma-client-node";
import {
	isBlock,
	isLink,
	isSpan,
	type Node,
} from "datocms-structured-text-utils";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pinned model IDs (generateId()).
const FIGURE_ID = "XcgMtRsuSZyAp1BryKSETw" as const;
const STORY_ID = "Zw61R4_sQievsRCIo-q6uw" as const;

const FRENCH_CAPTIONS = ["Vendanges", "Pressoir"];

type Context = {
	recordId: string;
	/** Node-by-node signature of the English body, as the API stores it. */
	signature: string[];
	englishBlockIds: string[];
	captions: string[];
	credits: string[];
};

namespace Schema {
	export type Figure = ItemTypeDefinition<
		{ locales: "en" | "fr" },
		typeof FIGURE_ID,
		{ caption: { type: "string" }; credit: { type: "string" } }
	>;
	export type Story = ItemTypeDefinition<
		{ locales: "en" | "fr" },
		typeof STORY_ID,
		{
			title: { type: "string"; localized: true };
			body: { type: "structured_text"; localized: true; blocks: Figure };
		}
	>;
}

/** Depth-first list of nodes: type, text and marks of spans, url of links, model of blocks. */
function signature(node: Node<unknown, unknown>): string[] {
	const own = isSpan(node)
		? `span:${JSON.stringify(node.value)}:${[...(node.marks ?? [])].sort().join(",")}`
		: isLink(node)
			? `link:${node.url}`
			: isBlock(node)
				? "block"
				: node.type;
	const children = "children" in node ? (node.children as Node<unknown, unknown>[]) : [];
	return [own, ...children.flatMap(signature)];
}

type Figures = { id: string; caption: string | null; credit: string | null }[];

async function readStory(client: Client, recordId: string) {
	const story = await client.items.find<Schema.Story>(recordId, { nested: true });
	const english = story.body.en;
	if (!english) throw new Error("English body missing");
	const figures: Figures = english.document.children.filter(isBlock).map((b) => ({
		id: b.item.id,
		caption: b.item.attributes.caption,
		credit: b.item.attributes.credit,
	}));
	return { story, english, figures };
}

/** The French document: the English one with each figure as a new block, French caption. */
async function frenchBody(client: Client, recordId: string, reuseIds = false) {
	const { english, figures } = await readStory(client, recordId);
	let index = 0;
	return {
		schema: "dast" as const,
		document: {
			type: "root" as const,
			children: english.document.children.map((child) => {
				if (!isBlock(child)) return child;
				const figure = figures[index];
				const caption = FRENCH_CAPTIONS[index++];
				if (!figure) throw new Error("unexpected block");
				return {
					type: "block" as const,
					item: reuseIds
						? buildBlockRecord<Schema.Figure>({ id: figure.id, caption })
						: buildBlockRecord<Schema.Figure>({
								item_type: { type: "item_type", id: FIGURE_ID },
								caption,
								credit: figure.credit,
							}),
				};
			}),
		},
	};
}

const paragraph = (...parts: (string | [string, "strong"])[]) => ({
	type: "paragraph" as const,
	children: parts.map((p) =>
		typeof p === "string"
			? { type: "span" as const, value: p }
			: { type: "span" as const, value: p[0], marks: [p[1]] },
	),
});

test("creates a French Structured Text body with new block copies, keeping English intact", async () => {
	const outcome = await runE2ETest<Context>({
		name: "structured-text-copy-to-locale",
		maxAttempts: 12,
		fixtures: async (client) => {
			await client.site.update({ locales: ["en", "fr"] });
			await client.itemTypes.create({
				id: FIGURE_ID,
				name: "Figure",
				api_key: "figure",
				modular_block: true,
			});
			for (const api_key of ["caption", "credit"])
				await client.fields.create(FIGURE_ID, {
					label: api_key[0]!.toUpperCase() + api_key.slice(1),
					api_key,
					field_type: "string",
				});
			await client.itemTypes.create({
				id: STORY_ID,
				name: "Story",
				api_key: "story",
				draft_mode_active: true,
			});
			await client.fields.create(STORY_ID, {
				label: "Title",
				api_key: "title",
				field_type: "string",
				localized: true,
			});
			await client.fields.create(STORY_ID, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				localized: true,
				validators: {
					structured_text_blocks: { item_types: [FIGURE_ID] },
					structured_text_links: { item_types: [] },
				},
			});
			const figure = (caption: string, credit: string) => ({
				type: "block" as const,
				item: buildBlockRecord<Schema.Figure>({
					item_type: { type: "item_type", id: FIGURE_ID },
					caption,
					credit,
				}),
			});
			const record = await client.items.create<Schema.Story>({
				item_type: { type: "item_type", id: STORY_ID },
				title: { en: "Harvest" },
				body: {
					en: {
						schema: "dast",
						document: {
							type: "root",
							children: [
								paragraph("The ", ["harvest", "strong"], " began at dawn on the hillside."),
								figure("Grapes at dawn", "Photo: Ana Ruiz"),
								{
									type: "paragraph",
									children: [
										{ type: "span", value: "Pickers filled crates until noon. Read more on " },
										{
											type: "link",
											url: "https://example.com/vineyard",
											children: [{ type: "span", value: "our vineyard page" }],
										},
										{ type: "span", value: "." },
									],
								},
								figure("The old press", "Photo: Luc Martin"),
								paragraph("By evening the ", ["first juice", "strong"], " was in the vats."),
							],
						},
					},
				},
			});
			const { english, figures } = await readStory(client, record.id);
			return {
				recordId: record.id,
				signature: signature(english.document),
				englishBlockIds: figures.map((f) => f.id),
				captions: figures.map((f) => f.caption ?? ""),
				credits: figures.map((f) => f.credit ?? ""),
			};
		},
		task: () =>
			`Create the French version of the story "Harvest": title "Récolte", and a body with the same structure as the English one where the two figures keep their credit but get the captions "Vendanges" and "Pressoir" (in that order). ` +
			`The French paragraphs can stay in English for now. Do not change the English version, and do not publish.`,
		solution: async ({ cmaClient, context }) => {
			const story = await cmaClient.items.find<Schema.Story>(context.recordId);
			await cmaClient.items.update<Schema.Story>(context.recordId, {
				title: { ...story.title, fr: "Récolte" },
				body: { ...story.body, fr: await frenchBody(cmaClient, context.recordId) },
			});
		},
		traps: {
			"sends only the fr key of each field": async ({ cmaClient, context }) => {
				await cmaClient.items.update<Schema.Story>(context.recordId, {
					title: { fr: "Récolte" },
					body: { fr: await frenchBody(cmaClient, context.recordId) },
				});
			},
			"sends only the fr key of the body": async ({ cmaClient, context }) => {
				const story = await cmaClient.items.find<Schema.Story>(context.recordId);
				await cmaClient.items.update<Schema.Story>(context.recordId, {
					title: { ...story.title, fr: "Récolte" },
					body: { fr: await frenchBody(cmaClient, context.recordId) },
				});
			},
			"reuses the English block ids in French": async ({ cmaClient, context }) => {
				const story = await cmaClient.items.find<Schema.Story>(context.recordId);
				await cmaClient.items.update<Schema.Story>(context.recordId, {
					title: { ...story.title, fr: "Récolte" },
					body: { ...story.body, fr: await frenchBody(cmaClient, context.recordId, true) },
				});
			},
			"adds the French title without the body": async ({ cmaClient, context }) => {
				const story = await cmaClient.items.find<Schema.Story>(context.recordId);
				await cmaClient.items.update<Schema.Story>(context.recordId, {
					title: { ...story.title, fr: "Récolte" },
				});
			},
		},
		assert: async ({ cmaClient, context }) => {
			const story = await cmaClient.items.find<Schema.Story>(context.recordId, {
				nested: true,
			});
			expect(story.title.en, "English title").toBe("Harvest");
			expect(story.title.fr, "French title").toBe("Récolte");

			// English: same content, same blocks.
			const english = story.body.en;
			if (!english) throw new Error("the English body is gone");
			expect(signature(english.document), "English body content").toEqual(context.signature);
			const enFigures = english.document.children.filter(isBlock);
			expect(enFigures.map((b) => b.item.id), "English figure ids").toEqual(
				context.englishBlockIds,
			);
			expect(enFigures.map((b) => b.item.attributes.caption)).toEqual(context.captions);
			expect(enFigures.map((b) => b.item.attributes.credit)).toEqual(context.credits);

			// French: same structure and text, two new figures with new captions.
			const french = story.body.fr;
			if (!french) throw new Error("no French body");
			expect(signature(french.document), "French body structure and text").toEqual(
				context.signature,
			);
			const frFigures = french.document.children.filter(isBlock);
			expect(frFigures, "French figures").toHaveLength(2);
			for (const b of frFigures) {
				expect(context.englishBlockIds, "French figures must be new blocks").not.toContain(
					b.item.id,
				);
				expect(b.item.__itemTypeId).toBe(FIGURE_ID);
			}
			expect(frFigures.map((b) => b.item.attributes.caption), "French captions").toEqual(
				FRENCH_CAPTIONS,
			);
			expect(frFigures.map((b) => b.item.attributes.credit), "French credits").toEqual(
				context.credits,
			);

			expect(story.meta.status, "record must stay unpublished").toBe("draft");
			expect(story.meta.published_at).toBeNull();
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
