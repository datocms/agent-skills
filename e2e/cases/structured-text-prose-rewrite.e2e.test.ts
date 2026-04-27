import type { ItemTypeDefinition } from "@datocms/cma-client-node";
import {
    collectNodes,
    isHeading,
    isList,
    isListItem,
    isSpan,
    type Span,
} from "datocms-structured-text-utils";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pre-set model IDs. Passed to `itemTypes.create({ id })` to pin the runtime
// ID, and referenced as `typeof X_ID` in the Schema types below so every
// `item_type.id` in typed client calls is statically checked against it.
// echo 'import { generateId } from "@datocms/cma-client"; for (let i=0; i<10; i++) console.log(generateId())' | npx datocms cma:script --api-token XXX
const CHANGELOG_ID = "Fo3l6rjORaWNmKND7-Ibtw" as const;

type Context = { recordId: string };

namespace Schema {
	export type Changelog = ItemTypeDefinition<
		{ locales: string },
		typeof CHANGELOG_ID,
		{
			title: { type: "string" };
			body: { type: "structured_text" };
		}
	>;
}

// Free-form prose that mixes "added", "changed/removed/deprecated", and
// "fixed" items. Some items are buried inside a single run-on paragraph,
// which is why a uniform AST rule cannot do the job — splitting + grouping
// the items requires reading the text. The thank-you sentence at the end
// must be dropped, not categorized.
const PARAGRAPHS = [
	"This is a quick rundown of what shipped last quarter across the platform.",
	"We added single sign-on with Google, a brand new export-to-CSV button on the records list, and a long-awaited dark theme.",
	"The legacy XML import was deprecated and will be removed in Q3.",
	"We fixed a long-standing bug where webhook deliveries could be retried twice.",
	"We also shipped a redesigned navigation that puts saved views one click away.",
	'The "Beta" label was removed from the AI assistant.',
	"We patched a security issue in the file upload endpoint that allowed oversized files past the limit.",
	"Thanks to everyone who reported these issues — keep the feedback coming!",
] as const;

const SECTION_TITLES = ["Added", "Changed", "Fixed"] as const;

// Per-section keyword groups. Each inner array is the set of keywords that
// must ALL appear (case-insensitive) in the combined text of a single bullet
// in that section. The order of bullets within a section is not asserted.
const REQUIRED_BULLETS: Record<(typeof SECTION_TITLES)[number], string[][]> = {
	Added: [
		["single sign-on", "google"],
		["csv"],
		["dark theme"],
	],
	Changed: [["xml"], ["navigation"], ["beta"]],
	Fixed: [["webhook"], ["upload"]],
};

const FORBIDDEN_SUBSTRINGS = ["thanks", "rundown"] as const;

function plainText(node: unknown): string {
	const spans = collectNodes(node, (n): n is Span => {
		return (
			typeof n === "object" &&
			n !== null &&
			(n as { type?: unknown }).type === "span"
		);
	});
	return spans.map(({ node: span }) => span.value).join("");
}

test("regroups free-form changelog prose into Added / Changed / Fixed sections with bulleted lists", async () => {
	const outcome = await runE2ETest<Context>({
		name: "structured-text-prose-rewrite",
		maxAttempts: 10,
		fixtures: async (client) => {
			const model = await client.itemTypes.create({
				id: CHANGELOG_ID,
				name: "Changelog",
				api_key: "changelog",
			});
			await client.fields.create(model.id, {
				label: "Title",
				api_key: "title",
				field_type: "string",
			});
			await client.fields.create(model.id, {
				label: "Body",
				api_key: "body",
				field_type: "structured_text",
				validators: {
					structured_text_blocks: { item_types: [] },
					structured_text_links: { item_types: [] },
				},
			});

			const record = await client.items.create<Schema.Changelog>({
				item_type: { type: "item_type", id: CHANGELOG_ID },
				title: "Q2 changelog",
				body: {
					schema: "dast",
					document: {
						type: "root",
						children: PARAGRAPHS.map((value) => ({
							type: "paragraph",
							children: [{ type: "span", value }],
						})),
					},
				},
			});

			return { recordId: record.id };
		},
		task: ({ context }) =>
			`update the "changelog" record with ID "${context.recordId}". The "body" structured text is a flat list of free-form paragraphs that summarise last quarter's product work. Rewrite the body so it follows a "Keep a Changelog" structure:\n` +
			`1. The body must contain EXACTLY three sections, in this order: an h2 "Added", an h2 "Changed", and an h2 "Fixed". Use the literal English titles, no emoji, no extra punctuation.\n` +
			`2. Each h2 must be immediately followed by a single bulleted list (DAST list with style "bulleted"). No paragraphs between an h2 and its list, no extra headings.\n` +
			`3. Each bullet must be a short rewritten sentence describing ONE change. If a single source paragraph mentions several distinct items, split them into separate bullets. If a source paragraph is a recap or a thank-you note (i.e. not an actual change), DROP it — do not invent a category for it.\n` +
			`4. Categorize: brand-new capabilities go under "Added"; modifications, removals, label changes, redesigns, and deprecations go under "Changed"; bug fixes and security patches go under "Fixed".\n` +
			`5. The body must contain only those three h2 headings and three lists — no leftover paragraphs at the top or bottom.`,
		assert: async ({ cmaClient, context }) => {
			const record = await cmaClient.items.find<Schema.Changelog>(
				context.recordId,
			);
			expect(record.body, "body should not be null").not.toBeNull();
			if (!record.body) return;

			const topLevel = record.body.document.children;
			expect(
				topLevel,
				"top-level must be exactly 3 h2 + 3 list nodes (6 children)",
			).toHaveLength(6);

			for (let s = 0; s < SECTION_TITLES.length; s++) {
				const title = SECTION_TITLES[s];
				if (!title) throw new Error(`missing section title ${s}`);

				const heading = topLevel[s * 2];
				const list = topLevel[s * 2 + 1];

				if (!heading || !isHeading(heading) || heading.level !== 2) {
					throw new Error(`section ${s}: expected an h2 heading`);
				}
				expect(
					plainText(heading).trim(),
					`section ${s}: h2 text must be "${title}"`,
				).toBe(title);

				if (!list || !isList(list)) {
					throw new Error(`section ${s}: expected a list after the h2`);
				}
				expect(list.style, `section "${title}" list must be bulleted`).toBe(
					"bulleted",
				);

				const bulletTexts = list.children.map((li) => {
					if (!isListItem(li)) {
						throw new Error(`section "${title}": list child must be a listItem`);
					}
					return plainText(li).toLowerCase();
				});

				const required = REQUIRED_BULLETS[title];
				expect(
					bulletTexts.length,
					`section "${title}" must have at least ${required.length} bullet(s)`,
				).toBeGreaterThanOrEqual(required.length);

				for (const keywords of required) {
					const match = bulletTexts.find((text) =>
						keywords.every((kw) => text.includes(kw.toLowerCase())),
					);
					expect(
						match,
						`section "${title}" must contain a bullet matching all of: ${JSON.stringify(keywords)}. Bullets seen: ${JSON.stringify(bulletTexts)}`,
					).toBeDefined();
				}
			}

			const allText = collectNodes(record.body, isSpan)
				.map(({ node }) => node.value)
				.join(" ")
				.toLowerCase();
			for (const forbidden of FORBIDDEN_SUBSTRINGS) {
				expect(
					allText.includes(forbidden),
					`document must not still contain "${forbidden}" (recap/thank-you content should have been dropped)`,
				).toBe(false);
			}
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
