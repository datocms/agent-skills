import {
	buildBlockRecord,
	isBlockOfType,
	type ItemTypeDefinition,
} from "@datocms/cma-client-node";
import { collectNodes, isSpan } from "datocms-structured-text-utils";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pre-set model IDs. Passed to `itemTypes.create({ id })` to pin the runtime
// ID, and referenced as `typeof X_ID` in the Schema types below so every
// `item_type.id` in typed client calls is statically checked against it.
// echo 'import { generateId } from "@datocms/cma-client"; for (let i=0; i<10; i++) console.log(generateId())' | npx datocms cma:script --api-token XXX

const BUTTON_BLOCK_ID = "Y0gackCiQceeCWoqDwu7xg" as const;
const HERO_BLOCK_ID = "XOOvNcJbTJCUL-A0bUfViw" as const;
const FEATURE_GRID_BLOCK_ID = "FdiXVhRdTMu02pVYHEAclA" as const;
const LANDING_PAGE_ID = "eX-IQVtBSS-pmIBv-TFzfA" as const;

const ORIGINAL_HERO_PROSE =
	"Acme helps teams ship faster than ever before. Our platform automates repetitive workflows and removes the boring parts of building software.";

const GET_STARTED_ORIGINAL_URL = "https://acme.example.com/signup";
const GET_STARTED_NEW_URL = "https://acme.example.com/start-free-trial";
const READ_DOCS_URL = "https://acme.example.com/docs";

type Context = { recordId: string };

namespace Schema {
	export type ButtonBlock = ItemTypeDefinition<
		{ locales: string },
		typeof BUTTON_BLOCK_ID,
		{
			label: { type: "string" };
			url: { type: "string" };
		}
	>;

	export type HeroBlock = ItemTypeDefinition<
		{ locales: string },
		typeof HERO_BLOCK_ID,
		{
			title: { type: "string" };
			content: { type: "structured_text" };
			ctas: { type: "rich_text"; blocks: ButtonBlock };
		}
	>;

	export type FeatureGridBlock = ItemTypeDefinition<
		{ locales: string },
		typeof FEATURE_GRID_BLOCK_ID,
		{
			heading: { type: "string" };
			features: { type: "text" };
		}
	>;

	export type LandingPage = ItemTypeDefinition<
		{ locales: string },
		typeof LANDING_PAGE_ID,
		{
			title: { type: "string" };
			sections: {
				type: "rich_text";
				blocks: HeroBlock | FeatureGridBlock;
			};
		}
	>;
}

test("rewrites the hero's structured-text prose and updates a button url inside nested modular content", async () => {
	const outcome = await runE2ETest<Context>({
		name: "structured-text-nested-block-edit",
		maxAttempts: 10,
		fixtures: async (client) => {
			const buttonBlock = await client.itemTypes.create({
				id: BUTTON_BLOCK_ID,
				name: "Button Block",
				api_key: "button_block",
				modular_block: true,
			});
			await client.fields.create(buttonBlock.id, {
				label: "Label",
				api_key: "label",
				field_type: "string",
			});
			await client.fields.create(buttonBlock.id, {
				label: "URL",
				api_key: "url",
				field_type: "string",
			});

			const heroBlock = await client.itemTypes.create({
				id: HERO_BLOCK_ID,
				name: "Hero Block",
				api_key: "hero_block",
				modular_block: true,
			});
			await client.fields.create(heroBlock.id, {
				label: "Title",
				api_key: "title",
				field_type: "string",
			});
			await client.fields.create(heroBlock.id, {
				label: "Content",
				api_key: "content",
				field_type: "structured_text",
				validators: {
					structured_text_blocks: { item_types: [] },
					structured_text_links: { item_types: [] },
				},
			});
			await client.fields.create(heroBlock.id, {
				label: "CTAs",
				api_key: "ctas",
				field_type: "rich_text",
				validators: {
					rich_text_blocks: { item_types: [buttonBlock.id] },
				},
			});

			const featureGridBlock = await client.itemTypes.create({
				id: FEATURE_GRID_BLOCK_ID,
				name: "Feature Grid Block",
				api_key: "feature_grid_block",
				modular_block: true,
			});
			await client.fields.create(featureGridBlock.id, {
				label: "Heading",
				api_key: "heading",
				field_type: "string",
			});
			await client.fields.create(featureGridBlock.id, {
				label: "Features",
				api_key: "features",
				field_type: "text",
			});

			const pageModel = await client.itemTypes.create({
				id: LANDING_PAGE_ID,
				name: "Landing Page",
				api_key: "landing_page",
			});
			await client.fields.create(pageModel.id, {
				label: "Title",
				api_key: "title",
				field_type: "string",
			});
			await client.fields.create(pageModel.id, {
				label: "Sections",
				api_key: "sections",
				field_type: "rich_text",
				validators: {
					rich_text_blocks: {
						item_types: [heroBlock.id, featureGridBlock.id],
					},
				},
			});

			const record = await client.items.create<Schema.LandingPage>({
				item_type: { type: "item_type", id: LANDING_PAGE_ID },
				title: "Acme launch landing page",
				sections: [
					buildBlockRecord<Schema.HeroBlock>({
						item_type: { type: "item_type", id: HERO_BLOCK_ID },
						title: "Welcome to Acme",
						content: {
							schema: "dast",
							document: {
								type: "root",
								children: [
									{
										type: "paragraph",
										children: [
											{ type: "span", value: ORIGINAL_HERO_PROSE },
										],
									},
								],
							},
						},
						ctas: [
							buildBlockRecord<Schema.ButtonBlock>({
								item_type: { type: "item_type", id: BUTTON_BLOCK_ID },
								label: "Get started",
								url: GET_STARTED_ORIGINAL_URL,
							}),
							buildBlockRecord<Schema.ButtonBlock>({
								item_type: { type: "item_type", id: BUTTON_BLOCK_ID },
								label: "Read the docs",
								url: READ_DOCS_URL,
							}),
						],
					}),
					buildBlockRecord<Schema.FeatureGridBlock>({
						item_type: { type: "item_type", id: FEATURE_GRID_BLOCK_ID },
						heading: "Why teams pick Acme",
						features: "Speed, reliability, and a delightful API.",
					}),
				],
			});

			return { recordId: record.id };
		},
		task: ({ context }) =>
			`update the "landing_page" record with ID "${context.recordId}". Inside its "sections" modular content do BOTH of the following on the hero block:\n` +
			`1. Rewrite the prose inside the hero's "content" structured-text field. The new prose must read naturally and must explicitly mention "developer experience" AND "AI" (case-insensitive). The wording "ship faster" must NOT appear anywhere in the new prose.\n` +
			`2. Inside the hero's "ctas", update the "Get started" button URL to exactly "${GET_STARTED_NEW_URL}". Leave other buttons untouched.\n` +
			`Do not change anything else.`,
		assert: async ({ cmaClient, context }) => {
			const record = await cmaClient.items.find<Schema.LandingPage>(
				context.recordId,
				{ nested: true },
			);

			const sections = record.sections;
			expect(Array.isArray(sections), "sections must be an array").toBe(true);
			expect(sections, "sections length must be unchanged").toHaveLength(2);

			const hero = sections.find(isBlockOfType(HERO_BLOCK_ID));
			if (!hero) throw new Error("hero block must still be present");

			// Hero title untouched.
			expect(hero.attributes.title).toBe("Welcome to Acme");

			// Hero content prose rewritten.
			const content = hero.attributes.content;
			expect(content, "hero content must not be null").not.toBeNull();
			if (!content) return;

			const proseText = collectNodes(content, isSpan)
				.map(({ node }) => node.value)
				.join(" ")
				.toLowerCase();

			expect(
				proseText.includes("ship faster"),
				`original phrasing "ship faster" must be gone (got: ${proseText})`,
			).toBe(false);
			expect(
				proseText.includes("developer experience"),
				`new prose must mention "developer experience" (got: ${proseText})`,
			).toBe(true);
			expect(
				/\bai\b/.test(proseText),
				`new prose must mention "AI" as a standalone word (got: ${proseText})`,
			).toBe(true);

			// Hero ctas: 2 buttons; Get started has new URL, Read the docs unchanged.
			const ctas = hero.attributes.ctas;
			expect(Array.isArray(ctas), "hero.ctas must be an array").toBe(true);
			expect(ctas, "ctas should still have 2 buttons").toHaveLength(2);

			const buttons = ctas.filter(isBlockOfType(BUTTON_BLOCK_ID));
			expect(buttons, "all ctas must be button blocks").toHaveLength(2);

			const getStarted = buttons.find(
				(b) => b.attributes.label === "Get started",
			);
			const readDocs = buttons.find(
				(b) => b.attributes.label === "Read the docs",
			);

			expect(getStarted, '"Get started" button must still exist').toBeDefined();
			expect(readDocs, '"Read the docs" button must still exist').toBeDefined();

			expect(getStarted?.attributes.url).toBe(GET_STARTED_NEW_URL);
			expect(readDocs?.attributes.url).toBe(READ_DOCS_URL);

			// Second section (feature grid) untouched.
			const featureGrid = sections.find(isBlockOfType(FEATURE_GRID_BLOCK_ID));
			if (!featureGrid) throw new Error("feature_grid_block must remain");
			expect(featureGrid.attributes.heading).toBe("Why teams pick Acme");
			expect(featureGrid.attributes.features).toBe(
				"Speed, reliability, and a delightful API.",
			);

			// Landing page title untouched.
			expect(record.title).toBe("Acme launch landing page");
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
