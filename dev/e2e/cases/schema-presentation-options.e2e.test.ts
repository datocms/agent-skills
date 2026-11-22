import type { Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

type Context = {
	modelId: string;
	recordId: string;
	/** The record's field values right after seeding. */
	values: Record<string, unknown>;
	/** Each field's validators right after seeding, by API key. */
	validators: Record<string, unknown>;
};

type Field = Awaited<ReturnType<Client["fields"]["list"]>>[number];
const params = (f: Field) => f.appearance.parameters as Record<string, unknown>;
const FIELD_KEYS = ["name", "tags", "accent", "notes", "body", "starts_at"] as const;

type Variant = {
	/** Which model setting receives `name`. */
	titleSetting?: "presentation_title_field" | "title_field";
	tagsEditor?: "string_checkbox_group" | "string_multi_select";
	startCollapsed?: boolean;
};

async function applyPresentation(client: Client, context: Context, variant: Variant = {}) {
	const {
		titleSetting = "presentation_title_field",
		tagsEditor = "string_checkbox_group",
		startCollapsed = true,
	} = variant;
	const fields = await client.fields.list(context.modelId);
	const id = (apiKey: string) => fields.find((f) => f.api_key === apiKey)!.id;

	await client.fields.update(id("tags"), {
		appearance: {
			editor: tagsEditor,
			parameters: {
				options: [
					{ label: "Music", value: "music" },
					{ label: "Talks", value: "talks" },
					{ label: "Food", value: "food" },
				],
			},
			addons: [],
		},
	});
	await client.fields.update(id("accent"), {
		appearance: {
			editor: "color_picker",
			parameters: { enable_alpha: false, preset_colors: ["#FF5A5F", "#00A699"] },
			addons: [],
		},
	});
	await client.fields.update(id("notes"), {
		appearance: { editor: "wysiwyg", parameters: { toolbar: ["bold", "italic", "link"] }, addons: [] },
	});
	await client.fields.update(id("name"), {
		hint: "Shown on tickets",
		appearance: {
			editor: "single_line",
			parameters: { heading: false, placeholder: "e.g. Summer festival" },
			addons: [],
		},
	});
	const fieldset = await client.fieldsets.create(context.modelId, {
		title: "Logistics",
		collapsible: true,
		start_collapsed: startCollapsed,
	});
	for (const key of ["starts_at", "notes"]) {
		await client.fields.update(id(key), { fieldset: { type: "fieldset", id: fieldset.id } });
	}
	await client.itemTypes.update(context.modelId, { [titleSetting]: { type: "field", id: id("name") } });
}

test("changes editors, hints, fieldsets and the preview title without touching data or validators", async () => {
	const outcome = await runE2ETest<Context>({
		name: "schema-presentation-options",
		maxAttempts: 12,
		fixtures: async (client) => {
			const model = await client.itemTypes.create({ name: "Event", api_key: "event" });
			await client.fields.create(model.id, {
				label: "Name",
				api_key: "name",
				field_type: "string",
				validators: { required: {}, length: { max: 100 } },
			});
			await client.fields.create(model.id, { label: "Tags", api_key: "tags", field_type: "json" });
			await client.fields.create(model.id, { label: "Accent", api_key: "accent", field_type: "color" });
			await client.fields.create(model.id, {
				label: "Notes",
				api_key: "notes",
				field_type: "text",
				validators: { length: { max: 2000 } },
				appearance: { editor: "textarea", parameters: {}, addons: [] },
			});
			const body = await client.fields.create(model.id, {
				label: "Body",
				api_key: "body",
				field_type: "text",
			});
			await client.fields.create(model.id, {
				label: "Starts at",
				api_key: "starts_at",
				field_type: "date_time",
				validators: { required: {} },
			});
			// The record list currently identifies events by their body text.
			await client.itemTypes.update(model.id, { presentation_title_field: { type: "field", id: body.id } });

			const record = await client.items.create({
				item_type: { type: "item_type", id: model.id },
				name: "Harbour Lights",
				tags: JSON.stringify(["music", "food"]),
				accent: { red: 255, green: 90, blue: 95, alpha: 255 },
				notes: "Gates open at 18:00.\nBring a jacket.",
				body: "Three stages on the old pier.",
				starts_at: "2027-06-21T18:00:00+00:00",
			} as never);
			const stored = await client.items.find(record.id);
			const values = Object.fromEntries(FIELD_KEYS.map((key) => [key, stored[key]]));
			const fields = await client.fields.list(model.id);
			const validators = Object.fromEntries(fields.map((f) => [f.api_key, f.validators]));
			return { modelId: model.id, recordId: record.id, values, validators };
		},
		task: ({ context }) =>
			`On the "event" model, change only how editors see and edit the fields; stored content and validation rules must stay exactly as they are (there is one existing record, ID "${context.recordId}").\n` +
			`- \`tags\`: editors pick from a set of checkboxes offering exactly "Music" (value \`music\`), "Talks" (value \`talks\`) and "Food" (value \`food\`).\n` +
			`- \`accent\`: a color picker without transparency, offering the preset colors #FF5A5F and #00A699.\n` +
			`- \`notes\`: a formatted-text (rich text) editor whose toolbar offers only bold, italic and links.\n` +
			`- \`name\`: placeholder "e.g. Summer festival" and help text "Shown on tickets" under the field.\n` +
			`- Group \`starts_at\` and \`notes\` in a collapsible section titled "Logistics" that starts collapsed.\n` +
			`- In record lists and references, events should be identified by their \`name\`.\n` +
			`In your final message, say which editor and toolbar you chose for \`notes\`.`,
		solution: async ({ cmaClient, context }) => applyPresentation(cmaClient, context),
		traps: {
			"name set as the SEO title field instead of the preview title": async ({ cmaClient, context }) =>
				applyPresentation(cmaClient, context, { titleSetting: "title_field" }),
			"tags as a multi-select dropdown instead of checkboxes": async ({ cmaClient, context }) =>
				applyPresentation(cmaClient, context, { tagsEditor: "string_multi_select" }),
			"fieldset collapsible but open by default": async ({ cmaClient, context }) =>
				applyPresentation(cmaClient, context, { startCollapsed: false }),
		},
		assert: async ({ cmaClient, context }) => {
			const fields = await cmaClient.fields.list(context.modelId);
			const field = (apiKey: string): Field => {
				const found = fields.find((f) => f.api_key === apiKey);
				if (!found) throw new Error(`field "${apiKey}" missing`);
				return found;
			};

			// Nothing that is stored or enforced changed.
			for (const key of FIELD_KEYS) {
				expect(field(key).validators, `${key} validators unchanged`).toEqual(context.validators[key]);
			}
			expect(field("tags").field_type, "tags stays a JSON field").toBe("json");
			expect(field("notes").field_type, "notes stays a text field").toBe("text");
			const record = await cmaClient.items.find(context.recordId);
			for (const key of FIELD_KEYS) {
				expect(record[key], `record ${key} unchanged`).toEqual(context.values[key]);
			}

			// tags: checkboxes with exactly the three options.
			const tags = field("tags");
			expect(tags.appearance.editor, "tags editor").toBe("string_checkbox_group");
			const options = (params(tags).options as { label: string; value: string }[]) ?? [];
			expect(
				options.map(({ label, value }) => ({ label, value })),
				"tags options",
			).toEqual([
				{ label: "Music", value: "music" },
				{ label: "Talks", value: "talks" },
				{ label: "Food", value: "food" },
			]);

			// accent: no transparency, the two presets.
			const accent = field("accent");
			expect(accent.appearance.editor, "accent editor").toBe("color_picker");
			expect(params(accent).enable_alpha, "accent without transparency").toBe(false);
			const presets = ((params(accent).preset_colors as string[]) ?? []).map((c) => c.toUpperCase()).sort();
			expect(presets, "accent presets").toEqual(["#00A699", "#FF5A5F"]);

			// notes: a formatted-text editor offering exactly bold, italic and links.
			const notes = field("notes");
			expect(["wysiwyg", "markdown"], "notes uses a formatted-text editor").toContain(notes.appearance.editor);
			const toolbar = [...((params(notes).toolbar as string[]) ?? [])].sort();
			expect(toolbar, "notes toolbar").toEqual(["bold", "italic", "link"]);

			// name: placeholder and help text.
			const name = field("name");
			expect(name.appearance.editor, "name editor").toBe("single_line");
			expect(params(name).placeholder, "name placeholder").toBe("e.g. Summer festival");
			expect(name.hint, "name help text").toBe("Shown on tickets");

			// Logistics fieldset: collapsible, starts collapsed, holds starts_at and notes only.
			const fieldsets = (await cmaClient.fieldsets.list(context.modelId)).filter((f) => f.title === "Logistics");
			expect(fieldsets, 'one "Logistics" fieldset').toHaveLength(1);
			const logistics = fieldsets[0]!;
			expect(logistics.collapsible, "Logistics collapsible").toBe(true);
			expect(logistics.start_collapsed, "Logistics starts collapsed").toBe(true);
			for (const key of FIELD_KEYS) {
				const inside = field(key).fieldset?.id === logistics.id;
				expect(inside, `${key} inside Logistics`).toBe(
					key === "starts_at" || key === "notes",
				);
			}

			// The record list identifies events by name.
			const model = await cmaClient.itemTypes.find(context.modelId);
			expect(model.presentation_title_field?.id, "preview title is name").toBe(name.id);
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
