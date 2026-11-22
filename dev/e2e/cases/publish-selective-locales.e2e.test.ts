import { type Client, type ItemTypeDefinition } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pinned model ID (see modular-content-blocks.e2e.test.ts for how it is generated).
const NEWS_ID = "JIP4ZrR-TpC4KqtKoBZ6sw" as const;

namespace Schema {
	export type News = ItemTypeDefinition<
		{ locales: "en" | "it" },
		typeof NEWS_ID,
		{
			title: { type: "string"; localized: true };
			body: { type: "text"; localized: true };
			reference_code: { type: "string" };
		}
	>;
}

const OPENING_DAY = {
	title: { en: "Opening day", it: "Giorno di apertura" },
	body: {
		en: "Our new store opens its doors on Saturday at 9 am.",
		it: "Il nostro nuovo negozio apre le porte sabato alle 9.",
	},
	reference_code: "NEWS-2026-041",
};

type Snapshot = { title: unknown; body: unknown; reference_code: unknown };

type Context = {
	openingDayId: string;
	otherId: string;
	otherPublishedAt: string;
	otherPublished: Snapshot;
};

async function read(client: Client, id: string, version: "current" | "published"): Promise<Snapshot> {
	const record = await client.items.find<Schema.News>(id, { version });
	return { title: record.title, body: record.body, reference_code: record.reference_code };
}

test("publishes one locale of a record and leaves the other locale and other records unpublished", async () => {
	const outcome = await runE2ETest<Context>({
		name: "publish-selective-locales",
		maxAttempts: 12,
		fixtures: async (client) => {
			await client.site.update({ locales: ["en", "it"] });
			await client.itemTypes.create({
				id: NEWS_ID,
				name: "News",
				api_key: "news",
				draft_mode_active: true,
				all_locales_required: false,
			});
			await client.fields.create(NEWS_ID, { label: "Title", api_key: "title", field_type: "string", localized: true });
			await client.fields.create(NEWS_ID, { label: "Body", api_key: "body", field_type: "text", localized: true });
			await client.fields.create(NEWS_ID, { label: "Reference code", api_key: "reference_code", field_type: "string" });

			const openingDay = await client.items.create<Schema.News>({
				item_type: { type: "item_type", id: NEWS_ID },
				...OPENING_DAY,
			});

			const other = await client.items.create<Schema.News>({
				item_type: { type: "item_type", id: NEWS_ID },
				title: { en: "Summer hours", it: "Orari estivi" },
				body: { en: "From June we close at 8 pm.", it: "Da giugno chiudiamo alle 20." },
				reference_code: "NEWS-2026-030",
			});
			await client.items.publish(other.id);
			const otherPublished = await read(client, other.id, "published");
			const otherPublishedAt = (await client.items.find(other.id)).meta.published_at ?? "";
			await client.items.update<Schema.News>(other.id, {
				title: { en: "Summer opening hours", it: "Orari di apertura estivi" },
				body: { en: "From June we close at 9 pm.", it: "Da giugno chiudiamo alle 21." },
			});

			return { openingDayId: openingDay.id, otherId: other.id, otherPublishedAt, otherPublished };
		},
		task: ({ context }) =>
			`Publish only the English version of the news item "Opening day" (a "news" record, ID "${context.openingDayId}"). ` +
			`The Italian version is still being reviewed and must stay unpublished. Do not change any content, and do not publish anything else.`,
		solution: async ({ cmaClient, context }) => {
			await cmaClient.items.publish(context.openingDayId, {
				content_in_locales: ["en"],
				non_localized_content: true,
			});
		},
		traps: {
			"whole record published": async ({ cmaClient, context }) => {
				await cmaClient.items.publish(context.openingDayId);
			},
		},
		assert: async ({ cmaClient, context }) => {
			const current = await read(cmaClient, context.openingDayId, "current");
			expect(current, "the content of Opening day must be unchanged").toEqual(OPENING_DAY);

			const meta = (await cmaClient.items.find(context.openingDayId)).meta;
			expect(meta.published_at, "Opening day must have a published version").not.toBeNull();
			const published = await read(cmaClient, context.openingDayId, "published");
			const title = published.title as Record<string, unknown>;
			const body = published.body as Record<string, unknown>;
			expect(title.en, "English title must be live").toBe(OPENING_DAY.title.en);
			expect(body.en, "English body must be live").toBe(OPENING_DAY.body.en);
			expect(title.it ?? null, "Italian title must not be live").toBeNull();
			expect(body.it ?? null, "Italian body must not be live").toBeNull();

			const other = await cmaClient.items.find(context.otherId);
			expect(other.meta.published_at, "the other news item must not be republished").toBe(context.otherPublishedAt);
			expect(await read(cmaClient, context.otherId, "published"), "the other news item's live version").toEqual(
				context.otherPublished,
			);
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
