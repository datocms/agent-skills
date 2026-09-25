import {
    buildBlockRecord,
    type ItemTypeDefinition,
} from "@datocms/cma-client-node";
import {
    collectNodes,
    isBlock,
    isHeading,
    isList,
    isListItem,
    isParagraph,
    isSpan,
} from "datocms-structured-text-utils";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pre-set model IDs. Passed to `itemTypes.create({ id })` to pin the runtime
// ID, and referenced as `typeof X_ID` in the Schema types below so every
// `item_type.id` in typed client calls is statically checked against it.
// echo 'import { generateId } from "@datocms/cma-client"; for (let i=0; i<10; i++) console.log(generateId())' | npx datocms cma:script --api-token XXX
const STEP_BLOCK_ID = "OuSB60LgSWGOUuX4OCyCTw" as const;
const TUTORIAL_ID = "ORF_rS_9SOu0qciuwFQp4A" as const;

type Context = { recordId: string };

namespace Schema {
	export type StepBlock = ItemTypeDefinition<
		{ locales: string },
		typeof STEP_BLOCK_ID,
		{
			description: { type: "text" };
			order: { type: "integer" };
		}
	>;

	export type Tutorial = ItemTypeDefinition<
		{ locales: string },
		typeof TUTORIAL_ID,
		{
			title: { type: "string" };
			body: { type: "structured_text"; blocks: StepBlock };
		}
	>;
}

const STEPS = [
	{ order: 1, description: "Install Node.js 20 or later." },
	{ order: 2, description: "Run `pnpm install` from the project root." },
	{
		order: 3,
		description: "Copy `.env.example` to `.env` and fill in the secrets.",
	},
	{ order: 4, description: "Start the dev server with `pnpm dev`." },
] as const;

const HEADING_TEXT = "Setting up the project";
const INTRO_TEXT = "Follow these steps to get started:";
const OUTRO_TEXT = "If anything fails, ping the platform team.";

test("converts a run of custom step blocks into a native DAST numbered list", async () => {
	const outcome = await runE2ETest<Context>({
		name: "structured-text-blocks-to-list",
		maxAttempts: 10,
		fixtures: async (client) => {
			const stepBlock = await client.itemTypes.create({
				id: STEP_BLOCK_ID,
				name: "Step Block",
				api_key: "step_block",
				modular_block: true,
			});
			await client.fields.create(stepBlock.id, {
				label: "Description",
				api_key: "description",
				field_type: "text",
			});
			await client.fields.create(stepBlock.id, {
				label: "Order",
				api_key: "order",
				field_type: "integer",
			});

			const tutorialModel = await client.itemTypes.create({
				id: TUTORIAL_ID,
				name: "Tutorial",
				api_key: "tutorial",
			});
			await client.fields.create(tutorialModel.id, {
				label: "Title",
				api_key: "title",
				field_type: "string",
			});
			await client.fields.create(tutorialModel.id, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				validators: {
					structured_text_blocks: { item_types: [stepBlock.id] },
					structured_text_links: { item_types: [] },
				},
			});

			const record = await client.items.create<Schema.Tutorial>({
				item_type: { type: "item_type", id: TUTORIAL_ID },
				title: "Onboarding tutorial",
				body: {
					schema: "dast",
					document: {
						type: "root",
						children: [
							{
								type: "heading",
								level: 2,
								children: [{ type: "span", value: HEADING_TEXT }],
							},
							{
								type: "paragraph",
								children: [{ type: "span", value: INTRO_TEXT }],
							},
							...STEPS.map((step) => ({
								type: "block" as const,
								item: buildBlockRecord<Schema.StepBlock>({
									item_type: { type: "item_type", id: STEP_BLOCK_ID },
									description: step.description,
									order: step.order,
								}),
							})),
							{
								type: "paragraph",
								children: [{ type: "span", value: OUTRO_TEXT }],
							},
						],
					},
				},
			});

			return { recordId: record.id };
		},
		task: ({ context }) =>
			`update the "tutorial" record with ID "${context.recordId}". In its "body" structured text field, replace the consecutive run of "step_block" items with a single native DAST list:\n` +
			`1. The list must have style "numbered".\n` +
			`2. The list must have one "listItem" per existing step_block, ordered by ascending "order" attribute.\n` +
			`3. Each listItem must contain a single "paragraph" node, and that paragraph must have a single "span" child whose "value" is exactly the matching step's "description" (no extra whitespace, no rewording).\n` +
			`4. After the change, NO "step_block" block must remain anywhere in the document — the conversion replaces them.\n` +
			`5. The surrounding heading ("${HEADING_TEXT}") and the two surrounding paragraphs ("${INTRO_TEXT}" and "${OUTRO_TEXT}") must be preserved unchanged, and the list must occupy the position where the step blocks used to be (between the intro paragraph and the outro paragraph).`,
		assert: async ({ cmaClient, context }) => {
			const record = await cmaClient.items.find<Schema.Tutorial>(
				context.recordId,
				{ nested: true },
			);
			expect(record.body, "body should not be null").not.toBeNull();
			if (!record.body) return;

			const topLevel = record.body.document.children;
			expect(
				topLevel,
				"top-level should be heading + intro paragraph + list + outro paragraph",
			).toHaveLength(4);

			// 1. Heading preserved.
			const heading = topLevel[0];
			if (!heading || !isHeading(heading)) {
				throw new Error("first top-level node must be a heading");
			}
			const headingText = heading.children
				.filter(isSpan)
				.map((s) => s.value)
				.join("");
			expect(headingText).toBe(HEADING_TEXT);

			// 2. Intro paragraph preserved.
			const intro = topLevel[1];
			if (!intro || !isParagraph(intro)) {
				throw new Error("second top-level node must be a paragraph");
			}
			expect(intro.children.filter(isSpan).map((s) => s.value).join("")).toBe(
				INTRO_TEXT,
			);

			// 3. List replaces the steps.
			const list = topLevel[2];
			if (!list || !isList(list)) {
				throw new Error("third top-level node must be a list");
			}
			expect(list.style, "list must be numbered").toBe("numbered");
			expect(
				list.children,
				"list must have one item per step",
			).toHaveLength(STEPS.length);

			for (let i = 0; i < STEPS.length; i++) {
				const li = list.children[i];
				if (!li || !isListItem(li)) {
					throw new Error(`list child ${i} must be a listItem`);
				}
				expect(
					li.children,
					`listItem ${i} must contain exactly one paragraph`,
				).toHaveLength(1);
				const para = li.children[0];
				if (!para || !isParagraph(para)) {
					throw new Error(`listItem ${i} child must be a paragraph`);
				}
				const text = para.children
					.filter(isSpan)
					.map((s) => s.value)
					.join("");
				expect(
					text,
					`listItem ${i} text must match step ${i + 1} description`,
				).toBe(STEPS[i]?.description);
			}

			// 4. Outro paragraph preserved.
			const outro = topLevel[3];
			if (!outro || !isParagraph(outro)) {
				throw new Error("fourth top-level node must be a paragraph");
			}
			expect(outro.children.filter(isSpan).map((s) => s.value).join("")).toBe(
				OUTRO_TEXT,
			);

			// 5. No step_block survivors anywhere.
			const blockNodes = collectNodes(record.body, isBlock);
			expect(
				blockNodes,
				"no DAST block nodes (and therefore no step_block) must remain",
			).toHaveLength(0);
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
