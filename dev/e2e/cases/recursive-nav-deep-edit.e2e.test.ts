import {
    type BlockInNestedResponse,
    buildBlockRecord,
    type ItemTypeDefinition,
} from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pre-set model IDs. Passed to `itemTypes.create({ id })` to pin the runtime
// ID, and referenced as `typeof X_ID` in the Schema types below so every
// `item_type.id` in typed client calls is statically checked against it.
// echo 'import { generateId } from "@datocms/cma-client"; for (let i=0; i<10; i++) console.log(generateId())' | npx datocms cma:script --api-token XXX
const NAV_ITEM_ID = "eA4q5AzmTBqyaLmbaY1gng" as const;
const NAV_MENU_ID = "E4kM180HSter_o7s6pAVpQ" as const;

type Context = {
	recordId: string;
};

namespace Schema {
	// Recursive: a NavItem's `submenu` is a rich_text field whose only
	// allowed block is NavItem itself (navigation_item -> submenu ->
	// navigation_item -> ...). The api_key cannot be `children` because
	// DatoCMS reserves that name.
	export type NavItem = ItemTypeDefinition<
		{ locales: string },
		typeof NAV_ITEM_ID,
		{
			label: { type: "string" };
			url: { type: "string" };
			submenu: { type: "rich_text"; blocks: NavItem };
		}
	>;

	export type NavMenu = ItemTypeDefinition<
		{ locales: string },
		typeof NAV_MENU_ID,
		{
			name: { type: "string" };
			items: { type: "rich_text"; blocks: NavItem };
		}
	>;
}

type NavItemNode = BlockInNestedResponse<Schema.NavItem>;

type NavSnapshot = {
	url: string;
	childrenLabels: string[];
};

// Original tree, mirrored in the fixtures below. Used both to seed and
// (with one targeted url change) to assert the post-update state.
const ORIGINAL_TREE: ReadonlyArray<{
	label: string;
	url: string;
	children: ReadonlyArray<unknown>;
}> = [
	{
		label: "Products",
		url: "/products",
		children: [
			{
				label: "Hardware",
				url: "/products/hardware",
				children: [
					{
						label: "Laptops",
						url: "/products/hardware/laptops",
						children: [
							{
								label: "Pro 14",
								url: "/products/hardware/laptops/pro-14",
								children: [],
							},
							{
								label: "Pro 16",
								url: "/products/hardware/laptops/pro-16",
								children: [],
							},
						],
					},
					{
						label: "Phones",
						url: "/products/hardware/phones",
						children: [],
					},
				],
			},
			{
				label: "Software",
				url: "/products/software",
				children: [
					{
						label: "Editor",
						url: "/products/software/editor",
						children: [],
					},
				],
			},
		],
	},
	{
		label: "Company",
		url: "/company",
		children: [
			{ label: "About", url: "/company/about", children: [] },
			{ label: "Careers", url: "/company/careers", children: [] },
		],
	},
] as const;

const TARGET_LABEL = "Laptops";
const NEW_LAPTOPS_URL = "/products/hardware/computers";

type TreeNode = {
	label: string;
	url: string;
	children: ReadonlyArray<TreeNode>;
};

function buildFixtureTree(
	nodes: ReadonlyArray<TreeNode>,
): ReturnType<typeof buildBlockRecord<Schema.NavItem>>[] {
	return nodes.map((node) =>
		buildBlockRecord<Schema.NavItem>({
			item_type: { type: "item_type", id: NAV_ITEM_ID },
			label: node.label,
			url: node.url,
			submenu: buildFixtureTree(node.children),
		}),
	);
}

function flattenSnapshot(
	nodes: ReadonlyArray<TreeNode>,
	out: Map<string, NavSnapshot> = new Map(),
): Map<string, NavSnapshot> {
	for (const node of nodes) {
		out.set(node.label, {
			url: node.url,
			childrenLabels: node.children.map((c) => c.label),
		});
		flattenSnapshot(node.children, out);
	}
	return out;
}

function flattenResponse(
	items: ReadonlyArray<NavItemNode>,
	out: Map<string, NavSnapshot> = new Map(),
): Map<string, NavSnapshot> {
	for (const item of items) {
		const label = item.attributes.label ?? "";
		const url = item.attributes.url ?? "";
		const submenu = (item.attributes.submenu ?? []) as NavItemNode[];
		out.set(label, {
			url,
			childrenLabels: submenu.map((c) => c.attributes.label ?? ""),
		});
		flattenResponse(submenu, out);
	}
	return out;
}

test("reads a deeply nested recursive block tree and surgically edits exactly one node 3 levels deep", async () => {
	const outcome = await runE2ETest<Context>({
		name: "recursive-nav-deep-edit",
		maxAttempts: 10,
		fixtures: async (client) => {
			const navItem = await client.itemTypes.create({
				id: NAV_ITEM_ID,
				name: "Navigation Item",
				api_key: "navigation_item",
				modular_block: true,
			});
			await client.fields.create(navItem.id, {
				label: "Label",
				api_key: "label",
				field_type: "string",
			});
			await client.fields.create(navItem.id, {
				label: "URL",
				api_key: "url",
				field_type: "string",
			});
			// Self-referential: navigation_item.submenu may contain
			// navigation_item blocks. (`children` is a reserved api_key in
			// DatoCMS, hence `submenu`.)
			await client.fields.create(navItem.id, {
				label: "Submenu",
				api_key: "submenu",
				field_type: "rich_text",
				validators: {
					rich_text_blocks: { item_types: [navItem.id] },
				},
			});

			const navMenu = await client.itemTypes.create({
				id: NAV_MENU_ID,
				name: "Navigation Menu",
				api_key: "navigation_menu",
			});
			await client.fields.create(navMenu.id, {
				label: "Name",
				api_key: "name",
				field_type: "string",
			});
			await client.fields.create(navMenu.id, {
				label: "Items",
				api_key: "items",
				field_type: "rich_text",
				validators: {
					rich_text_blocks: { item_types: [navItem.id] },
				},
			});

			const record = await client.items.create<Schema.NavMenu>({
				item_type: { type: "item_type", id: NAV_MENU_ID },
				name: "Main menu",
				items: buildFixtureTree(ORIGINAL_TREE as ReadonlyArray<TreeNode>),
			});

			return { recordId: record.id };
		},
		task: ({ context }) =>
			`update the "navigation_menu" record with ID "${context.recordId}". Its "items" modular content field holds a recursive tree of "navigation_item" blocks (every navigation_item has a "submenu" rich_text field that may itself contain more navigation_item blocks).\n\n` +
			`First read the record (with nested blocks) to discover the tree, then perform a SURGICAL edit:\n` +
			`- Locate the navigation_item whose "label" is exactly "${TARGET_LABEL}". This block sits 3 levels deep — it is reached by descending: top-level "Products" → its submenu's "Hardware" → its submenu's "${TARGET_LABEL}".\n` +
			`- Change ONLY that block's "url" attribute to "${NEW_LAPTOPS_URL}".\n` +
			`- Every other navigation_item in the entire tree (parents, siblings, descendants of "${TARGET_LABEL}", and unrelated subtrees) must keep its existing label, url, submenu list and block id unchanged.\n` +
			`- The "${TARGET_LABEL}" block must keep its label, its block id, and its existing submenu items with their existing urls.`,
		assert: async ({ cmaClient, context }) => {
			const record = await cmaClient.items.find<Schema.NavMenu>(
				context.recordId,
				{ nested: true },
			);

			const items = (record.items ?? []) as NavItemNode[];
			const actual = flattenResponse(items);
			const expected = flattenSnapshot(ORIGINAL_TREE as ReadonlyArray<TreeNode>);
			// Apply the one expected mutation.
			expected.set(TARGET_LABEL, {
				url: NEW_LAPTOPS_URL,
				childrenLabels: ["Pro 14", "Pro 16"],
			});

			expect(
				actual.size,
				"the tree must contain the same number of nav items",
			).toBe(expected.size);

			for (const [label, exp] of expected) {
				const got = actual.get(label);
				expect(got, `nav item "${label}" must still exist`).toBeDefined();
				expect(got?.url, `url of "${label}"`).toBe(exp.url);
				expect(
					got?.childrenLabels,
					`children of "${label}" (in original order)`,
				).toEqual(exp.childrenLabels);
			}

			// Top-level order is preserved.
			expect(
				items.map((i) => i.attributes.label),
				"top-level nav items must keep their original order",
			).toEqual(["Products", "Company"]);
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
