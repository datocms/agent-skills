import { ApiError, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

type Context = undefined;

type Field = Awaited<ReturnType<Client["fields"]["list"]>>[number];
const params = (f: Field) => f.appearance.parameters as Record<string, unknown>;
const validators = (f: Field) => f.validators as Record<string, Record<string, unknown> | undefined>;

/** Resolves to the API error codes when the call is refused, or null when it succeeds. */
async function refusal(call: () => Promise<unknown>): Promise<string | null> {
	try {
		await call();
		return null;
	} catch (error) {
		if (!(error instanceof ApiError)) throw error;
		return error.errors.map((e) => e.attributes.code).join(",") || "refused";
	}
}

type Variant = {
	/** Editor of `excerpt`; `null` leaves the type's default editor. */
	excerptEditor?: "textarea" | null;
	/** Whether the `sku` pattern is anchored to the whole value. */
	anchoredSku?: boolean;
	/** Editor of `featured`. */
	featuredEditor?: "boolean_radio_group" | "boolean";
};

async function buildArticle(client: Client, variant: Variant = {}) {
	const { excerptEditor = "textarea", anchoredSku = true, featuredEditor = "boolean_radio_group" } = variant;
	const model = await client.itemTypes.create({ name: "Article", api_key: "article", draft_mode_active: true });
	const title = await client.fields.create(model.id, {
		label: "Title",
		api_key: "title",
		field_type: "string",
		validators: { required: {}, length: { max: 80 } },
		appearance: { editor: "single_line", parameters: { heading: true }, addons: [] },
	});
	await client.fields.create(model.id, {
		label: "Slug",
		api_key: "slug",
		field_type: "slug",
		validators: { required: {}, slug_title_field: { title_field_id: title.id } },
		appearance: { editor: "slug", parameters: { url_prefix: "https://example.com/blog/" }, addons: [] },
	});
	await client.fields.create(model.id, {
		label: "Excerpt",
		api_key: "excerpt",
		field_type: "text",
		validators: { length: { max: 300 } },
		...(excerptEditor ? { appearance: { editor: excerptEditor, parameters: {}, addons: [] } } : {}),
	});
	await client.fields.create(model.id, {
		label: "Category",
		api_key: "category",
		field_type: "string",
		validators: { enum: { values: ["news", "guide", "opinion"] } },
		appearance: {
			editor: "string_select",
			parameters: {
				options: [
					{ label: "News", value: "news" },
					{ label: "Guide", value: "guide" },
					{ label: "Opinion", value: "opinion" },
				],
			},
			addons: [],
		},
	});
	await client.fields.create(model.id, {
		label: "Reading minutes",
		api_key: "reading_minutes",
		field_type: "integer",
		validators: { number_range: { min: 1, max: 60 } },
	});
	await client.fields.create(model.id, {
		label: "Contact email",
		api_key: "contact_email",
		field_type: "string",
		validators: { format: { predefined_pattern: "email" } },
	});
	await client.fields.create(model.id, {
		label: "SKU",
		api_key: "sku",
		field_type: "string",
		validators: {
			unique: {},
			format: { custom_pattern: anchoredSku ? "^[A-Z0-9]{6}$" : "[A-Z0-9]{6}" },
		},
	});
	await client.fields.create(model.id, {
		label: "Featured",
		api_key: "featured",
		field_type: "boolean",
		...(featuredEditor === "boolean_radio_group"
			? {
					appearance: {
						editor: "boolean_radio_group",
						parameters: { positive_radio: { label: "Featured" }, negative_radio: { label: "Standard" } },
						addons: [],
					},
				}
			: {}),
	});
}

const VALID = {
	title: "How we test schema changes",
	slug: "how-we-test-schema-changes",
	excerpt: "A short summary.",
	category: "guide",
	reading_minutes: 5,
	contact_email: "editor@example.com",
	sku: "AB12CD",
	featured: true,
};

test("builds a model whose validations and editors match a product description", async () => {
	const outcome = await runE2ETest<Context>({
		name: "schema-editorial-fields",
		maxAttempts: 12,
		fixtures: async () => undefined,
		task: () =>
			`Create an "Article" model (API key \`article\`) with draft/published versions enabled, and these fields:\n` +
			`- \`title\`: a single line of text. Mandatory, at most 80 characters, and shown to editors as the big heading of the record.\n` +
			`- \`slug\`: a URL slug generated from the title. Mandatory. Editors should see it with the prefix \`https://example.com/blog/\` in front.\n` +
			`- \`excerpt\`: plain multi-paragraph text, edited in a simple text box with no formatting toolbar. At most 300 characters.\n` +
			`- \`category\`: one of \`news\`, \`guide\` or \`opinion\` (nothing else allowed), picked from a dropdown that shows "News", "Guide" and "Opinion".\n` +
			`- \`reading_minutes\`: a whole number from 1 to 60.\n` +
			`- \`contact_email\`: must be an e-mail address.\n` +
			`- \`sku\`: must be unique across articles and must be exactly six characters, each an uppercase letter or a digit (for example \`AB12CD\`).\n` +
			`- \`featured\`: yes/no, shown to editors as two radio buttons labelled "Featured" (yes) and "Standard" (no).\n` +
			`The rules must actually be enforced when records are saved, not just described.`,
		solution: async ({ cmaClient }) => buildArticle(cmaClient),
		traps: {
			"excerpt left on the default editor (a formatting toolbar)": async ({ cmaClient }) =>
				buildArticle(cmaClient, { excerptEditor: null }),
			"sku pattern not anchored, so longer values pass": async ({ cmaClient }) =>
				buildArticle(cmaClient, { anchoredSku: false }),
			"featured left as a plain switch": async ({ cmaClient }) =>
				buildArticle(cmaClient, { featuredEditor: "boolean" }),
		},
		assert: async ({ cmaClient }) => {
			const model = (await cmaClient.itemTypes.list()).find((m) => m.api_key === "article");
			if (!model) throw new Error('no model with API key "article"');
			expect(model.draft_mode_active, "draft mode on").toBe(true);

			const fields = await cmaClient.fields.list(model.id);
			const field = (apiKey: string, type: string): Field => {
				const found = fields.find((f) => f.api_key === apiKey);
				if (!found) throw new Error(`field "${apiKey}" missing`);
				expect(found.field_type, `${apiKey} type`).toBe(type);
				return found;
			};
			const title = field("title", "string");
			const slug = field("slug", "slug");
			const excerpt = field("excerpt", "text");
			const category = field("category", "string");
			field("reading_minutes", "integer");
			field("contact_email", "string");
			field("sku", "string");
			const featured = field("featured", "boolean");

			// Presentation: editors and the parameters the task fixes.
			expect(title.appearance.editor, "title editor").toBe("single_line");
			expect(params(title).heading, "title shown as heading").toBe(true);
			expect(slug.appearance.editor, "slug editor").toBe("slug");
			expect(params(slug).url_prefix, "slug prefix").toBe("https://example.com/blog/");
			expect(
				validators(slug).slug_title_field?.title_field_id,
				"slug generated from title",
			).toBe(title.id);
			expect(excerpt.appearance.editor, "excerpt: plain text box, no toolbar").toBe("textarea");
			expect(category.appearance.editor, "category dropdown").toBe("string_select");
			const options = (params(category).options as { label: string; value: string }[]) ?? [];
			expect(
				options.map(({ label, value }) => ({ label, value })),
				"category options",
			).toEqual([
				{ label: "News", value: "news" },
				{ label: "Guide", value: "guide" },
				{ label: "Opinion", value: "opinion" },
			]);
			expect(featured.appearance.editor, "featured radios").toBe("boolean_radio_group");
			const radios = params(featured) as {
				positive_radio?: { label?: string };
				negative_radio?: { label?: string };
			};
			expect(radios.positive_radio?.label, "yes label").toBe("Featured");
			expect(radios.negative_radio?.label, "no label").toBe("Standard");

			// Behaviour: the rules are enforced.
			const item_type = { type: "item_type" as const, id: model.id };
			const check = (values: Record<string, unknown>) => () =>
				cmaClient.items.validateNew({ item_type, ...VALID, ...values } as never);
			const accepted: [string, Record<string, unknown>][] = [
				["the valid article", {}],
				["an 80-character title", { title: "t".repeat(80) }],
				["a 300-character excerpt", { excerpt: "e".repeat(300) }],
				["reading_minutes 1", { reading_minutes: 1 }],
				["reading_minutes 60", { reading_minutes: 60 }],
				["sku 9Z9Z9Z", { sku: "9Z9Z9Z" }],
			];
			for (const [label, values] of accepted) {
				expect(await refusal(check(values)), `${label} must be accepted`).toBeNull();
			}
			const rejected: [string, Record<string, unknown>][] = [
				["a missing title", { title: null }],
				["an 81-character title", { title: "t".repeat(81) }],
				["a missing slug", { slug: null }],
				["a 301-character excerpt", { excerpt: "e".repeat(301) }],
				["category review", { category: "review" }],
				["reading_minutes 0", { reading_minutes: 0 }],
				["reading_minutes 61", { reading_minutes: 61 }],
				["contact_email not-an-email", { contact_email: "not-an-email" }],
				["sku ab12cd (lowercase)", { sku: "ab12cd" }],
				["sku AB12C (five characters)", { sku: "AB12C" }],
				["sku AB12CDE (seven characters)", { sku: "AB12CDE" }],
				["sku AB-2CD", { sku: "AB-2CD" }],
			];
			for (const [label, values] of rejected) {
				expect(await refusal(check(values)), `${label} must be rejected`).not.toBeNull();
			}

			// Uniqueness needs a stored record to collide with.
			await cmaClient.items.create({ item_type, ...VALID } as never);
			expect(
				await refusal(() =>
					cmaClient.items.create({ item_type, ...VALID, slug: "another-article" } as never),
				),
				"a second article with the same sku must be rejected",
			).not.toBeNull();
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
