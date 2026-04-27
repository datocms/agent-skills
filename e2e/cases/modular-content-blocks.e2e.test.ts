import {
    buildBlockRecord,
    isBlockOfType,
    type ItemTypeDefinition,
    SchemaRepository,
    someBlocksInNonLocalizedFieldValue,
} from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pre-set model IDs. Passed to `itemTypes.create({ id })` to pin the runtime
// ID, and referenced as `typeof X_ID` in the Schema types below so every
// `item_type.id` in typed client calls is statically checked against it.
// echo 'import { generateId } from "@datocms/cma-client"; for (let i=0; i<10; i++) console.log(generateId())' | npx datocms cma:script --api-token XXX

const SESSION_BLOCK_ID = "dbp6HuqmRLCbOFMq3N4Wxw" as const;
const BREAK_BLOCK_ID = "CCziE0oNSLSAZypvG_NWLQ" as const;
const KEYNOTE_BLOCK_ID = "CI2cnCcsQ9CuNdyLIo_Mig" as const;
const CONFERENCE_DAY_ID = "JICN3X3fSmOxDiUp7IqCng" as const;

type Context = {
	recordId: string;
};

namespace Schema {
	export type SessionBlock = ItemTypeDefinition<
		{ locales: string },
		typeof SESSION_BLOCK_ID,
		{
			title: { type: "string" };
			speaker: { type: "string" };
			signup_url: { type: "string" };
		}
	>;

	export type BreakBlock = ItemTypeDefinition<
		{ locales: string },
		typeof BREAK_BLOCK_ID,
		{
			label: { type: "string" };
			duration_minutes: { type: "integer" };
		}
	>;

	export type KeynoteBlock = ItemTypeDefinition<
		{ locales: string },
		typeof KEYNOTE_BLOCK_ID,
		{
			title: { type: "string" };
			speaker: { type: "string" };
		}
	>;

	export type ConferenceDay = ItemTypeDefinition<
		{ locales: string },
		typeof CONFERENCE_DAY_ID,
		{
			name: { type: "string" };
			agenda: {
				type: "rich_text";
				blocks: SessionBlock | BreakBlock | KeynoteBlock;
			};
		}
	>;
}

test("adds, duplicates, mutates and removes modular content blocks in a single update", async () => {
	const outcome = await runE2ETest<Context>({
		name: "modular-content-blocks",
		maxAttempts: 10,
		fixtures: async (client) => {
			const sessionBlock = await client.itemTypes.create({
				id: SESSION_BLOCK_ID,
				name: "Session Block",
				api_key: "session_block",
				modular_block: true,
			});
			await client.fields.create(sessionBlock.id, {
				label: "Title",
				api_key: "title",
				field_type: "string",
			});
			await client.fields.create(sessionBlock.id, {
				label: "Speaker",
				api_key: "speaker",
				field_type: "string",
			});
			await client.fields.create(sessionBlock.id, {
				label: "Signup URL",
				api_key: "signup_url",
				field_type: "string",
			});

			const breakBlock = await client.itemTypes.create({
				id: BREAK_BLOCK_ID,
				name: "Break Block",
				api_key: "break_block",
				modular_block: true,
			});
			await client.fields.create(breakBlock.id, {
				label: "Label",
				api_key: "label",
				field_type: "string",
			});
			await client.fields.create(breakBlock.id, {
				label: "Duration (minutes)",
				api_key: "duration_minutes",
				field_type: "integer",
			});

			const keynoteBlock = await client.itemTypes.create({
				id: KEYNOTE_BLOCK_ID,
				name: "Keynote Block",
				api_key: "keynote_block",
				modular_block: true,
			});
			await client.fields.create(keynoteBlock.id, {
				label: "Title",
				api_key: "title",
				field_type: "string",
			});
			await client.fields.create(keynoteBlock.id, {
				label: "Speaker",
				api_key: "speaker",
				field_type: "string",
			});

			const dayModel = await client.itemTypes.create({
				id: CONFERENCE_DAY_ID,
				name: "Conference Day",
				api_key: "conference_day",
			});
			await client.fields.create(dayModel.id, {
				label: "Name",
				api_key: "name",
				field_type: "string",
			});
			await client.fields.create(dayModel.id, {
				label: "Agenda",
				api_key: "agenda",
				field_type: "rich_text",
				validators: {
					rich_text_blocks: {
						item_types: [sessionBlock.id, breakBlock.id, keynoteBlock.id],
					},
				},
			});

			const record = await client.items.create<Schema.ConferenceDay>({
				item_type: { type: "item_type", id: CONFERENCE_DAY_ID },
				name: "Day 1",
				agenda: [
					buildBlockRecord<Schema.SessionBlock>({
						item_type: { type: "item_type", id: SESSION_BLOCK_ID },
						title: "Building scalable APIs",
						speaker: "Maya Liu",
						signup_url: "https://conf.example.com/sessions/1?track=backend",
					}),
					buildBlockRecord<Schema.SessionBlock>({
						item_type: { type: "item_type", id: SESSION_BLOCK_ID },
						title: "State management in 2026",
						speaker: "Omar Hassan",
						signup_url: "https://conf.example.com/sessions/2",
					}),
					buildBlockRecord<Schema.BreakBlock>({
						item_type: { type: "item_type", id: BREAK_BLOCK_ID },
						label: "Coffee break",
						duration_minutes: 15,
					}),
					buildBlockRecord<Schema.SessionBlock>({
						item_type: { type: "item_type", id: SESSION_BLOCK_ID },
						title: "Testing strategies that scale",
						speaker: "Riley Park",
						signup_url: "https://conf.example.com/sessions/3",
					}),
					buildBlockRecord<Schema.BreakBlock>({
						item_type: { type: "item_type", id: BREAK_BLOCK_ID },
						label: "Lunch",
						duration_minutes: 60,
					}),
				],
			});

			return { recordId: record.id };
		},
		task: ({ context }) =>
			`update the "conference_day" record with ID "${context.recordId}". In its "agenda" modular content field, do ALL of the following in a single update:\n` +
			`1. Insert a new "keynote_block" at the very top (index 0) with title "Welcome: The year ahead" and speaker "Jordan Mercer".\n` +
			`2. Duplicate the existing "Building scalable APIs" session block and place the duplicate right after the original (so the same session appears twice in a row).\n` +
			`3. For every "session_block" (including the duplicate), append the query parameters "utm_source=agenda" and "utm_campaign=day1" to its "signup_url", preserving any existing query parameters already on that URL.\n` +
			`4. Remove every "break_block" from the agenda.\n` +
			`The existing session order, titles and speakers should otherwise be preserved.`,
		assert: async ({ cmaClient, context }) => {
			const record = await cmaClient.items.find<Schema.ConferenceDay>(
				context.recordId,
				{ nested: true },
			);
			const agenda = record.agenda;
			expect(Array.isArray(agenda), "agenda should be an array").toBe(true);

			const schemaRepo = new SchemaRepository(cmaClient);

			// 1. First agenda block must be the welcome keynote.
			const firstBlock = agenda[0];
			expect(firstBlock, "agenda must have a first block").toBeDefined();
			if (!firstBlock || !isBlockOfType(KEYNOTE_BLOCK_ID)(firstBlock)) {
				throw new Error("first agenda block should be a keynote");
			}
			expect(firstBlock.attributes.title).toBe("Welcome: The year ahead");
			expect(firstBlock.attributes.speaker).toBe("Jordan Mercer");

			// 2. No break blocks anywhere in the agenda (recursive helper covers
			//    the case where a block-bearing field is added to a child block
			//    in a future test variation).
			expect(
				await someBlocksInNonLocalizedFieldValue(
					agenda,
					"rich_text",
					schemaRepo,
					isBlockOfType(BREAK_BLOCK_ID),
				),
				"no break blocks must remain",
			).toBe(false);

			// 3. Four sessions total (3 originals + the duplicate).
			const sessions = agenda.filter(isBlockOfType(SESSION_BLOCK_ID));
			expect(
				sessions,
				"should have 4 sessions (3 original + 1 duplicate)",
			).toHaveLength(4);

			// 4. Every session URL has the utm tags appended.
			for (const session of sessions) {
				expect(
					session.attributes.signup_url,
					"signup_url must be set",
				).toBeTruthy();
				const url = new URL(session.attributes.signup_url ?? "");
				expect(url.searchParams.get("utm_source"), `utm_source on ${url}`).toBe(
					"agenda",
				);
				expect(
					url.searchParams.get("utm_campaign"),
					`utm_campaign on ${url}`,
				).toBe("day1");
			}

			// 5. The original "Building scalable APIs" still carries track=backend.
			const backendSession = sessions.find(
				(s) => s.attributes.title === "Building scalable APIs",
			);
			expect(backendSession, "original scalable APIs session").toBeDefined();
			expect(
				backendSession?.attributes.signup_url
					? new URL(backendSession.attributes.signup_url).searchParams.get(
							"track",
						)
					: null,
				"existing track=backend must be preserved",
			).toBe("backend");

			// 6. The "Building scalable APIs" session appears twice, back-to-back,
			//    with distinct ids on the duplicate.
			const scalableIndices = agenda
				.map((b, i) =>
					isBlockOfType(SESSION_BLOCK_ID)(b) &&
					b.attributes.title === "Building scalable APIs"
						? i
						: -1,
				)
				.filter((i) => i >= 0);
			expect(
				scalableIndices,
				"scalable APIs session should appear exactly twice",
			).toHaveLength(2);
			expect(
				scalableIndices[1]! - scalableIndices[0]!,
				"duplicate should be immediately after the original",
			).toBe(1);
			expect(
				new Set(scalableIndices.map((i) => agenda[i]?.id)).size,
				"duplicate block must have a new id",
			).toBe(2);
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
