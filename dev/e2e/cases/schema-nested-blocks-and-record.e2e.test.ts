import { buildBlockRecord, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Empty sandbox: the agent builds the whole schema, so ids are read back by API key.

type Block = {
	id: string;
	relationships: { item_type: { data: { id: string } } };
	attributes: Record<string, unknown>;
};
type Node = { type: string; value?: string; item?: unknown; children?: Node[] };

const typeOf = (block: unknown) => (block as Block).relationships.item_type.data.id;
const attrs = (block: unknown) => (block as Block).attributes;
const spanText = (node: Node | undefined) =>
	(node?.children ?? []).filter((c) => c.type === "span").map((c) => c.value ?? "").join("");
const sorted = (ids: string[] | undefined) => [...(ids ?? [])].sort();
const allow = (field: { validators: Record<string, unknown> }, key: string) =>
	sorted((field.validators[key] as { item_types?: string[] } | undefined)?.item_types);

async function schemaIds(client: Client) {
	const models = await client.itemTypes.list();
	const id = (apiKey: string) => {
		const model = models.find((m) => m.api_key === apiKey);
		if (!model) throw new Error(`model "${apiKey}" not found`);
		return model.id;
	};
	return { button: id("button"), hero: id("hero"), quote: id("quote"), page: id("landing_page") };
}

async function solve(c: Client) {
	const block = (name: string, api_key: string) =>
		c.itemTypes.create({ name, api_key, modular_block: true });
	const text = (model: string, api_key: string) =>
		c.fields.create(model, { label: api_key, api_key, field_type: "string" });

	const button = await block("Button", "button");
	await text(button.id, "label");
	await text(button.id, "url");
	const hero = await block("Hero", "hero");
	await text(hero.id, "headline");
	await c.fields.create(hero.id, {
		label: "Buttons",
		api_key: "buttons",
		field_type: "rich_text",
		validators: { rich_text_blocks: { item_types: [button.id] }, size: { max: 2 } },
	});
	const quote = await block("Quote", "quote");
	await text(quote.id, "text");
	await text(quote.id, "attribution");

	const page = await c.itemTypes.create({ name: "Landing page", api_key: "landing_page" });
	await text(page.id, "title");
	await c.fields.create(page.id, {
		label: "Sections",
		api_key: "sections",
		field_type: "rich_text",
		validators: { rich_text_blocks: { item_types: [hero.id, quote.id] }, size: { min: 1 } },
	});
	await c.fields.create(page.id, {
		label: "Highlight",
		api_key: "highlight",
		field_type: "single_block",
		validators: { single_block_blocks: { item_types: [quote.id] } },
		appearance: { editor: "frameless_single_block", parameters: {}, addons: [] },
	});
	await c.fields.create(page.id, {
		label: "Body",
		api_key: "body",
		field_type: "structured_text",
		validators: {
			structured_text_blocks: { item_types: [quote.id] },
			structured_text_inline_blocks: { item_types: [button.id] },
			structured_text_links: { item_types: [page.id] },
		},
	});

	const btn = (label: string, url: string) =>
		buildBlockRecord({ item_type: { type: "item_type", id: button.id }, label, url });
	const q = (t: string, attribution: string) =>
		buildBlockRecord({ item_type: { type: "item_type", id: quote.id }, text: t, attribution });
	await c.items.create({
		item_type: { type: "item_type", id: page.id },
		title: "Launch",
		sections: [
			buildBlockRecord({
				item_type: { type: "item_type", id: hero.id },
				headline: "Ship it",
				buttons: [btn("Start", "/start"), btn("Docs", "/docs")],
			}),
			q("Fast and calm.", "Ada"),
		],
		highlight: q("Best release yet.", "Lin"),
		body: {
			schema: "dast",
			document: {
				type: "root",
				children: [
					{ type: "paragraph", children: [{ type: "span", value: "Read on" }] },
					{ type: "block", item: q("Worth it.", "Sam") },
					{
						type: "paragraph",
						children: [
							{ type: "span", value: "Get started: " },
							{ type: "inlineBlock", item: btn("Start", "/start") },
						],
					},
				],
			},
		},
	});
}

async function dropSize(c: Client, modelKey: string, fieldKey: string) {
	const field = await c.fields.find(`${modelKey}::${fieldKey}`);
	const { size: _size, ...rest } = field.validators as Record<string, unknown>;
	await c.fields.update(field.id, { validators: rest });
}

const task = () =>
	"Build a page builder for the marketing team, then fill in the first page.\n\n" +
	"Block models (API keys in parentheses):\n" +
	"- Button (`button`): text fields `label` and `url`.\n" +
	"- Hero (`hero`): a text field `headline`, and a field `buttons` holding up to two Button blocks (editors cannot add a third).\n" +
	"- Quote (`quote`): text fields `text` and `attribution`.\n\n" +
	"Model Landing page (`landing_page`) with these fields:\n" +
	"- `title`: single-line text.\n" +
	"- `sections`: a list of blocks where editors can add Hero and Quote blocks and nothing else; a page must have at least one section.\n" +
	"- `highlight`: exactly one Quote block, optional. Editors fill its fields directly in the record form, without the collapsible box around the block.\n" +
	"- `body`: Structured Text where editors can insert Quote blocks between paragraphs, Button blocks inside a sentence, and links to other landing pages. No other block or record may be embedded or linked.\n\n" +
	"Then create one landing page:\n" +
	'- title "Launch";\n' +
	'- sections: first a hero with headline "Ship it" and two buttons, "Start" (url "/start") then "Docs" (url "/docs"); then a quote with text "Fast and calm." and attribution "Ada";\n' +
	'- highlight: a quote with text "Best release yet." and attribution "Lin";\n' +
	'- body, exactly three parts in this order: a paragraph "Read on"; a quote block with text "Worth it." and attribution "Sam"; a paragraph "Get started: " followed by an inline Start button (url "/start").';

test("builds a page builder schema with nested blocks and fills a record three levels deep", async () => {
	const outcome = await runE2ETest<undefined>({
		name: "schema-nested-blocks-and-record",
		maxAttempts: 12,
		task,
		solution: async ({ cmaClient: c }) => solve(c),
		traps: {
			"no two-button limit on hero buttons": async ({ cmaClient: c }) => {
				await solve(c);
				await dropSize(c, "hero", "buttons");
			},
			"sections may be left empty": async ({ cmaClient: c }) => {
				await solve(c);
				await dropSize(c, "landing_page", "sections");
			},
		},
		assert: async ({ cmaClient: c }) => {
			const ids = await schemaIds(c);
			const fieldsOf = async (model: string) => {
				const list = await c.fields.list(model);
				return (apiKey: string) => {
					const field = list.find((f) => f.api_key === apiKey);
					if (!field) throw new Error(`field "${apiKey}" not found`);
					return field;
				};
			};
			const page = await fieldsOf(ids.page);
			const hero = await fieldsOf(ids.hero);
			const button = await fieldsOf(ids.button);
			const quote = await fieldsOf(ids.quote);

			// Schema: field types and allow-lists.
			for (const field of [button("label"), button("url"), hero("headline"), quote("text"), quote("attribution")])
				expect(["string", "text"], `${field.api_key} is a text field`).toContain(field.field_type);
			expect(page("title").field_type, "title").toBe("string");
			expect(hero("buttons").field_type, "hero.buttons is a list of blocks").toBe("rich_text");
			expect(allow(hero("buttons"), "rich_text_blocks"), "hero.buttons accepts buttons").toEqual([ids.button]);
			expect(page("sections").field_type, "sections is a list of blocks").toBe("rich_text");
			expect(allow(page("sections"), "rich_text_blocks"), "sections accepts heroes and quotes").toEqual(
				sorted([ids.hero, ids.quote]),
			);
			const highlight = page("highlight");
			expect(highlight.field_type, "highlight is a single block").toBe("single_block");
			expect(allow(highlight, "single_block_blocks"), "highlight accepts quotes").toEqual([ids.quote]);
			expect(highlight.appearance.editor, "highlight shows without the frame").toBe("frameless_single_block");
			const body = page("body");
			expect(body.field_type, "body is Structured Text").toBe("structured_text");
			expect(allow(body, "structured_text_blocks"), "body blocks").toEqual([ids.quote]);
			expect(allow(body, "structured_text_inline_blocks"), "body inline blocks").toEqual([ids.button]);
			expect(allow(body, "structured_text_links"), "body links").toEqual([ids.page]);

			// The record, read back three levels deep.
			const pages = await c.items.list({ filter: { type: ids.page }, nested: true });
			expect(pages, "exactly one landing page").toHaveLength(1);
			const record = pages[0] as unknown as Record<string, unknown>;
			expect(record.title).toBe("Launch");
			const sections = record.sections as unknown[];
			expect(sections, "two sections").toHaveLength(2);
			expect(typeOf(sections[0]), "first section is a hero").toBe(ids.hero);
			expect(attrs(sections[0]).headline).toBe("Ship it");
			const buttons = attrs(sections[0]).buttons as unknown[];
			expect(
				buttons.map((b) => [typeOf(b), attrs(b).label, attrs(b).url]),
				"hero buttons",
			).toEqual([
				[ids.button, "Start", "/start"],
				[ids.button, "Docs", "/docs"],
			]);
			const quoteOf = (b: unknown) => [typeOf(b), attrs(b).text, attrs(b).attribution];
			expect(quoteOf(sections[1]), "second section").toEqual([ids.quote, "Fast and calm.", "Ada"]);
			expect(quoteOf(record.highlight), "highlight").toEqual([ids.quote, "Best release yet.", "Lin"]);

			const children = (record.body as { document: { children: Node[] } } | null)?.document.children ?? [];
			expect(children.map((n) => n.type), "body parts").toEqual(["paragraph", "block", "paragraph"]);
			expect(spanText(children[0]).trim()).toBe("Read on");
			expect(quoteOf(children[1]?.item), "body quote").toEqual([ids.quote, "Worth it.", "Sam"]);
			expect(spanText(children[2]).trim()).toBe("Get started:");
			const inline = (children[2]?.children ?? []).filter((n) => n.type === "inlineBlock");
			expect(
				inline.map((n) => [typeOf(n.item), attrs(n.item).label, attrs(n.item).url]),
				"inline button",
			).toEqual([[ids.button, "Start", "/start"]]);

			// Behaviour: at least one section, at most two buttons per hero, highlight optional.
			const accepts = async (title: string, sections: unknown[]) => {
				try {
					const probe = await c.items.create({
						item_type: { type: "item_type", id: ids.page },
						title,
						sections: sections as never,
						body: {
							schema: "dast",
							document: { type: "root", children: [{ type: "paragraph", children: [{ type: "span", value: "x" }] }] },
						},
					});
					await c.items.destroy(probe.id);
					return true;
				} catch {
					return false;
				}
			};
			const heroWith = (n: number) =>
				buildBlockRecord({
					item_type: { type: "item_type", id: ids.hero },
					headline: "Probe",
					buttons: Array.from({ length: n }, (_, i) =>
						buildBlockRecord({ item_type: { type: "item_type", id: ids.button }, label: `B${i}`, url: "/b" }),
					),
				});
			expect(await accepts("Probe one", [heroWith(2)]), "a page with one hero of two buttons and no highlight is valid").toBe(true);
			expect(await accepts("Probe two", []), "a page without sections is rejected").toBe(false);
			expect(await accepts("Probe three", [heroWith(3)]), "a hero with three buttons is rejected").toBe(false);
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
