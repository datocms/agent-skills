import {
	buildBlockRecord,
	type ItemTypeDefinition,
} from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pinned model IDs (see modular-content-blocks.e2e.test.ts for how they are generated).
const FEATURE_BLOCK_ID = "N6oQ74fFT2OL-I6Q42x36A" as const;
const PRODUCT_ID = "IUBOY04mRdSYcamwXCO0Og" as const;

const ENGLISH_FEATURES = [
	{ title: "Adjustable arm", description: "Three joints let you point the light exactly where you need it." },
	{ title: "Warm LED light", description: "A 2700 K LED that is easy on the eyes during long evenings." },
	{ title: "USB-C charging port", description: "Charge your phone from the base while you work." },
];
const ITALIAN_TITLES = ["Braccio regolabile", "Luce LED calda", "Porta di ricarica USB-C"];

type Context = {
	recordId: string;
	englishBlockIds: string[];
};

namespace Schema {
	export type Feature = ItemTypeDefinition<
		{ locales: "en" | "it" },
		typeof FEATURE_BLOCK_ID,
		{
			title: { type: "string" };
			description: { type: "text" };
		}
	>;

	export type Product = ItemTypeDefinition<
		{ locales: "en" | "it" },
		typeof PRODUCT_ID,
		{
			name: { type: "string"; localized: true };
			tagline: { type: "string"; localized: true };
			features: { type: "rich_text"; blocks: Feature; localized: true };
		}
	>;
}

const italianBlocks = () =>
	ENGLISH_FEATURES.map((feature, index) =>
		buildBlockRecord<Schema.Feature>({
			item_type: { type: "item_type", id: FEATURE_BLOCK_ID },
			title: ITALIAN_TITLES[index]!,
			description: feature.description,
		}),
	);

test("adds an Italian version of a record, copying its blocks into the new locale", async () => {
	const outcome = await runE2ETest<Context>({
		name: "blocks-copy-to-new-locale",
		maxAttempts: 12,
		fixtures: async (client) => {
			await client.site.update({ locales: ["en", "it"] });

			await client.itemTypes.create({
				id: FEATURE_BLOCK_ID,
				name: "Feature",
				api_key: "feature",
				modular_block: true,
			});
			await client.fields.create(FEATURE_BLOCK_ID, { label: "Title", api_key: "title", field_type: "string" });
			await client.fields.create(FEATURE_BLOCK_ID, {
				label: "Description",
				api_key: "description",
				field_type: "text",
			});

			await client.itemTypes.create({
				id: PRODUCT_ID,
				name: "Product",
				api_key: "product",
				draft_mode_active: true,
				all_locales_required: false,
			});
			await client.fields.create(PRODUCT_ID, {
				label: "Name",
				api_key: "name",
				field_type: "string",
				localized: true,
			});
			await client.fields.create(PRODUCT_ID, {
				label: "Tagline",
				api_key: "tagline",
				field_type: "string",
				localized: true,
			});
			await client.fields.create(PRODUCT_ID, {
				label: "Features",
				api_key: "features",
				field_type: "rich_text",
				localized: true,
				validators: { rich_text_blocks: { item_types: [FEATURE_BLOCK_ID] } },
			});

			const record = await client.items.create<Schema.Product>({
				item_type: { type: "item_type", id: PRODUCT_ID },
				name: { en: "Desk lamp" },
				tagline: { en: "Light for focused work" },
				features: {
					en: ENGLISH_FEATURES.map((feature) =>
						buildBlockRecord<Schema.Feature>({
							item_type: { type: "item_type", id: FEATURE_BLOCK_ID },
							...feature,
						}),
					),
				},
			});
			const saved = await client.items.find<Schema.Product>(record.id);
			return { recordId: record.id, englishBlockIds: [...(saved.features.en ?? [])] };
		},
		task: ({ context }) =>
			`Add an Italian version of the "product" record "Desk lamp" (record ID "${context.recordId}"). ` +
			`Its Italian name is "Lampada da scrivania" and its Italian tagline is "Luce per lavorare". ` +
			`In Italian the "features" field must have the same three features, in the same order, with these Italian titles: ` +
			ITALIAN_TITLES.map((title, index) => `${index + 1}. "${title}"`).join(", ") +
			`. Keep each feature's description exactly as it is in English. ` +
			`Do not touch the English version, and do not publish the record: leave it as a draft.`,
		solution: async ({ cmaClient, context }) => {
			const current = await cmaClient.items.find<Schema.Product>(context.recordId);
			await cmaClient.items.update<Schema.Product>(context.recordId, {
				name: { ...current.name, it: "Lampada da scrivania" },
				tagline: { ...current.tagline, it: "Luce per lavorare" },
				features: { en: current.features.en ?? [], it: italianBlocks() },
			});
		},
		traps: {
			"Italian sent on the features field alone": async ({ cmaClient, context }) => {
				const current = await cmaClient.items.find<Schema.Product>(context.recordId);
				await cmaClient.items.update<Schema.Product>(context.recordId, {
					features: { ...current.features, it: italianBlocks() },
				});
			},
			"English block ids reused under it": async ({ cmaClient, context }) => {
				const current = await cmaClient.items.find<Schema.Product>(context.recordId, { nested: true });
				const english = current.features.en ?? [];
				await cmaClient.items.update<Schema.Product>(context.recordId, {
					name: { ...current.name, it: "Lampada da scrivania" },
					tagline: { ...current.tagline, it: "Luce per lavorare" },
					features: {
						en: english.map((block) => block.id),
						it: english.map((block, index) =>
							buildBlockRecord<Schema.Feature>({ id: block.id, title: ITALIAN_TITLES[index]! }),
						),
					},
				});
			},
			"features sent with the it key only": async ({ cmaClient, context }) => {
				const current = await cmaClient.items.find<Schema.Product>(context.recordId);
				await cmaClient.items.update<Schema.Product>(context.recordId, {
					name: { ...current.name, it: "Lampada da scrivania" },
					tagline: { ...current.tagline, it: "Luce per lavorare" },
					features: { it: italianBlocks() },
				});
			},
			"every field sent with the it key only": async ({ cmaClient, context }) => {
				await cmaClient.items.update<Schema.Product>(context.recordId, {
					name: { it: "Lampada da scrivania" },
					tagline: { it: "Luce per lavorare" },
					features: { it: italianBlocks() },
				});
			},
		},
		assert: async ({ cmaClient, context }) => {
			const record = await cmaClient.items.find<Schema.Product>(context.recordId, { nested: true });

			expect(record.name.it, "Italian name").toBe("Lampada da scrivania");
			expect(record.tagline.it, "Italian tagline").toBe("Luce per lavorare");
			expect(record.name.en, "English name must be unchanged").toBe("Desk lamp");
			expect(record.tagline.en, "English tagline must be unchanged").toBe("Light for focused work");

			const english = record.features.en ?? [];
			expect(
				english.map((block) => block.id),
				"English feature blocks must keep their ids and order",
			).toEqual(context.englishBlockIds);
			expect(
				english.map((block) => ({ title: block.attributes.title, description: block.attributes.description })),
				"English feature blocks must keep their content",
			).toEqual(ENGLISH_FEATURES);

			const italian = record.features.it ?? [];
			expect(italian, "three Italian features").toHaveLength(3);
			expect(
				italian.map((block) => ({ title: block.attributes.title, description: block.attributes.description })),
				"Italian features: the given titles with the English descriptions, in order",
			).toEqual(ENGLISH_FEATURES.map((feature, index) => ({ title: ITALIAN_TITLES[index], description: feature.description })));
			for (const block of italian) {
				expect(context.englishBlockIds, `Italian block ${block.id} must be a new block`).not.toContain(block.id);
				expect(block.relationships.item_type.data.id, "Italian blocks are feature blocks").toBe(FEATURE_BLOCK_ID);
			}

			expect(record.meta.published_at, "the record must not be published").toBeNull();
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
