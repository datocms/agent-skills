import {
    buildBlockRecord,
    isBlockOfType,
    type ItemTypeDefinition,
} from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pre-set model IDs. Passed to `itemTypes.create({ id })` to pin the runtime
// ID, and referenced as `typeof X_ID` in the Schema types below so every
// `item_type.id` in typed client calls is statically checked against it.
// echo 'import { generateId } from "@datocms/cma-client"; for (let i=0; i<10; i++) console.log(generateId())' | npx datocms cma:script --api-token XXX
const TASK_BLOCK_ID = "Qx7tFm2qSnK4cD9LpVBhTw" as const;
const WEEKLY_PLANNER_ID = "Ny8wZb5kRoeHfJ3MvX2cAg" as const;

type Context = {
	recordId: string;
};

namespace Schema {
	export type TaskBlock = ItemTypeDefinition<
		{ locales: string },
		typeof TASK_BLOCK_ID,
		{
			title: { type: "string" };
			priority: { type: "string" };
			due_date: { type: "string" };
			done: { type: "boolean" };
		}
	>;

	export type WeeklyPlanner = ItemTypeDefinition<
		{ locales: string },
		typeof WEEKLY_PLANNER_ID,
		{
			name: { type: "string" };
			tasks: { type: "rich_text"; blocks: TaskBlock };
		}
	>;
}

test("reorders modular content blocks by attribute, partitioning done tasks to the end", async () => {
	const outcome = await runE2ETest<Context>({
		name: "modular-content-reorder",
		maxAttempts: 10,
		fixtures: async (client) => {
			const taskBlock = await client.itemTypes.create({
				id: TASK_BLOCK_ID,
				name: "Task Block",
				api_key: "task_block",
				modular_block: true,
			});
			await client.fields.create(taskBlock.id, {
				label: "Title",
				api_key: "title",
				field_type: "string",
			});
			await client.fields.create(taskBlock.id, {
				label: "Priority",
				api_key: "priority",
				field_type: "string",
			});
			await client.fields.create(taskBlock.id, {
				label: "Due Date",
				api_key: "due_date",
				field_type: "string",
			});
			await client.fields.create(taskBlock.id, {
				label: "Done",
				api_key: "done",
				field_type: "boolean",
			});

			const plannerModel = await client.itemTypes.create({
				id: WEEKLY_PLANNER_ID,
				name: "Weekly Planner",
				api_key: "weekly_planner",
			});
			await client.fields.create(plannerModel.id, {
				label: "Name",
				api_key: "name",
				field_type: "string",
			});
			await client.fields.create(plannerModel.id, {
				label: "Tasks",
				api_key: "tasks",
				field_type: "rich_text",
				validators: {
					rich_text_blocks: { item_types: [taskBlock.id] },
				},
			});

			const record = await client.items.create<Schema.WeeklyPlanner>({
				item_type: { type: "item_type", id: WEEKLY_PLANNER_ID },
				name: "Week of April 27",
				tasks: [
					buildBlockRecord<Schema.TaskBlock>({
						item_type: { type: "item_type", id: TASK_BLOCK_ID },
						title: "Submit Q1 report",
						priority: "high",
						due_date: "2026-04-30",
						done: false,
					}),
					buildBlockRecord<Schema.TaskBlock>({
						item_type: { type: "item_type", id: TASK_BLOCK_ID },
						title: "Update onboarding docs",
						priority: "medium",
						due_date: "2026-04-22",
						done: true,
					}),
					buildBlockRecord<Schema.TaskBlock>({
						item_type: { type: "item_type", id: TASK_BLOCK_ID },
						title: "Fix login bug",
						priority: "high",
						due_date: "2026-04-25",
						done: false,
					}),
					buildBlockRecord<Schema.TaskBlock>({
						item_type: { type: "item_type", id: TASK_BLOCK_ID },
						title: "Pair with new hire",
						priority: "low",
						due_date: "2026-04-28",
						done: false,
					}),
					buildBlockRecord<Schema.TaskBlock>({
						item_type: { type: "item_type", id: TASK_BLOCK_ID },
						title: "Review PR #142",
						priority: "medium",
						due_date: "2026-04-23",
						done: true,
					}),
					buildBlockRecord<Schema.TaskBlock>({
						item_type: { type: "item_type", id: TASK_BLOCK_ID },
						title: "Schedule retro",
						priority: "low",
						due_date: "2026-04-26",
						done: false,
					}),
				],
			});

			return { recordId: record.id };
		},
		task: ({ context }) =>
			`update the "weekly_planner" record with ID "${context.recordId}". In its "tasks" modular content field, reorder ALL existing "task_block" entries (do not add, remove, duplicate or modify any of them) so that:\n` +
			`1. Tasks whose "done" attribute is false come first, sorted by "due_date" ascending (ISO YYYY-MM-DD lexicographic order is fine).\n` +
			`2. Tasks whose "done" attribute is true come AFTER all the not-done ones, also sorted among themselves by "due_date" ascending.\n` +
			`Every block must keep its original id, title, priority, due_date and done values — the only thing that changes is their order in the array.`,
		assert: async ({ cmaClient, context }) => {
			const record = await cmaClient.items.find<Schema.WeeklyPlanner>(
				context.recordId,
				{ nested: true },
			);

			const tasks = record.tasks ?? [];
			expect(Array.isArray(tasks), "tasks must be an array").toBe(true);

			const blocks = tasks.filter(isBlockOfType(TASK_BLOCK_ID));
			expect(blocks, "all 6 task blocks must remain").toHaveLength(6);

			const titles = blocks.map((b) => b.attributes.title);
			const expectedTitles = [
				"Fix login bug",
				"Schedule retro",
				"Pair with new hire",
				"Submit Q1 report",
				"Update onboarding docs",
				"Review PR #142",
			];
			expect(titles, "tasks must be in the expected order").toEqual(
				expectedTitles,
			);

			// Done partition is contiguous and at the end.
			const doneFlags = blocks.map((b) => b.attributes.done);
			const firstDoneIdx = doneFlags.findIndex((d) => d === true);
			expect(firstDoneIdx, "there must be at least one done task").toBe(4);
			for (let i = firstDoneIdx; i < doneFlags.length; i++) {
				expect(
					doneFlags[i],
					`task at index ${i} must be done (done partition contiguous at end)`,
				).toBe(true);
			}
			for (let i = 0; i < firstDoneIdx; i++) {
				expect(
					doneFlags[i],
					`task at index ${i} must be not-done`,
				).toBe(false);
			}

			// Per-partition due_date is non-decreasing.
			const dueDates = blocks.map((b) => b.attributes.due_date ?? "");
			const notDoneDates = dueDates.slice(0, firstDoneIdx);
			const doneDates = dueDates.slice(firstDoneIdx);
			expect(
				notDoneDates,
				"not-done partition must be sorted by due_date asc",
			).toEqual([...notDoneDates].sort());
			expect(
				doneDates,
				"done partition must be sorted by due_date asc",
			).toEqual([...doneDates].sort());

			// Existing block ids must be preserved (no recreation).
			const ids = blocks.map((b) => b.id);
			expect(
				new Set(ids).size,
				"every block id must be unique (no duplicates created)",
			).toBe(6);
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
