import { ApiError, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

type Context = {
	modelId: string;
	summaryFieldId: string;
	minutesFieldId: string;
	records: { id: string; title: string; summary: string; reading_minutes: number; status: string }[];
	/** The `reading_minutes` field right after seeding. */
	minutesField: { field_type: string; validators: unknown; appearance: unknown };
};

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

const PAGES = [
	{ title: "About us", summary: "Who we are and why we started the studio.", reading_minutes: 3, publish: true },
	{ title: "Careers", summary: "Open roles, how we hire, and what working here is like.", reading_minutes: 5, publish: true },
	{ title: "Press kit", summary: "Logos, photos and the boilerplate for journalists.", reading_minutes: 2, publish: false },
];

const RULES = { required: {}, length: { max: 500 } };

test("converts a single-line field to multi-paragraph text keeping its content and rules", async () => {
	const outcome = await runE2ETest<Context>({
		name: "schema-field-type-change",
		maxAttempts: 12,
		fixtures: async (client: Client) => {
			const model = await client.itemTypes.create({ name: "Page", api_key: "page", draft_mode_active: true });
			await client.fields.create(model.id, { label: "Title", api_key: "title", field_type: "string" });
			const summary = await client.fields.create(model.id, {
				label: "Summary",
				api_key: "summary",
				field_type: "string",
				validators: RULES,
				appearance: {
					editor: "single_line",
					parameters: { heading: true, placeholder: "Shown under the title in listings" },
					addons: [],
				},
			});
			const minutes = await client.fields.create(model.id, {
				label: "Reading minutes",
				api_key: "reading_minutes",
				field_type: "integer",
				validators: { number_range: { min: 1 } },
				appearance: { editor: "integer", parameters: { placeholder: "Minutes" }, addons: [] },
			});
			const records: Context["records"] = [];
			for (const { publish, ...values } of PAGES) {
				const record = await client.items.create({ item_type: { type: "item_type", id: model.id }, ...values } as never);
				if (publish) await client.items.publish(record.id);
				const stored = await client.items.find(record.id);
				records.push({ id: record.id, ...values, status: stored.meta.status ?? "" });
			}
			const storedMinutes = await client.fields.find(minutes.id);
			return {
				modelId: model.id,
				summaryFieldId: summary.id,
				minutesFieldId: minutes.id,
				records,
				minutesField: {
					field_type: storedMinutes.field_type,
					validators: storedMinutes.validators,
					appearance: storedMinutes.appearance,
				},
			};
		},
		task: () =>
			`On the "page" model, editors need to write several paragraphs in the summary (\`summary\`): ` +
			`make it a multi-paragraph plain text field, keep what is already written, keep it mandatory and limited to 500 characters.`,
		solution: async ({ cmaClient, context }) => {
			await cmaClient.fields.update(context.summaryFieldId, { field_type: "text" });
			await cmaClient.fields.update(context.summaryFieldId, {
				validators: RULES,
				appearance: { editor: "textarea", parameters: { placeholder: "Shown under the title in listings" }, addons: [] },
			});
		},
		traps: {
			"type and rules sent in one request": async ({ cmaClient, context }) => {
				await cmaClient.fields.update(context.summaryFieldId, {
					field_type: "text",
					validators: RULES,
					appearance: { editor: "textarea", parameters: { placeholder: null }, addons: [] },
				});
			},
			"field deleted and recreated as text": async ({ cmaClient, context }) => {
				await cmaClient.fields.destroy(context.summaryFieldId);
				await cmaClient.fields.create(context.modelId, {
					label: "Summary",
					api_key: "summary",
					field_type: "text",
					validators: RULES,
					appearance: { editor: "textarea", parameters: { placeholder: null }, addons: [] },
				});
			},
		},
		assert: async ({ cmaClient, context }) => {
			const fields = await cmaClient.fields.list(context.modelId);
			const summary = fields.find((f) => f.api_key === "summary");
			expect(summary?.field_type, "summary is a multi-paragraph text field").toBe("text");
			expect(summary?.appearance.editor, "summary uses the plain-text editor").toBe("textarea");

			for (const record of context.records) {
				const stored = await cmaClient.items.find(record.id);
				expect(stored.summary, `summary of "${record.title}" kept`).toBe(record.summary);
				expect(stored.title, `title of "${record.title}" kept`).toBe(record.title);
				expect(stored.reading_minutes, `reading minutes of "${record.title}" kept`).toBe(record.reading_minutes);
				expect(stored.meta.status, `publication state of "${record.title}" kept`).toBe(record.status);
			}

			const item_type = { type: "item_type" as const, id: context.modelId };
			const probe = (text: string) => () =>
				cmaClient.items.validateNew({ item_type, title: "Probe", reading_minutes: 4, summary: text } as never);
			const paragraphs = (length: number) => {
				const head = "First paragraph.\n\nSecond paragraph.\n\n";
				return head + "x".repeat(length - head.length);
			};
			expect(await refusal(probe(paragraphs(500))), "a 500-character, three-paragraph summary must be accepted").toBeNull();
			expect(await refusal(probe(paragraphs(501))), "a 501-character summary must be rejected").not.toBeNull();
			expect(await refusal(probe("")), "an empty summary must be rejected").not.toBeNull();

			const minutes = await cmaClient.fields.find(context.minutesFieldId);
			expect(
				{ field_type: minutes.field_type, validators: minutes.validators, appearance: minutes.appearance },
				"reading_minutes field unchanged",
			).toEqual(context.minutesField);
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
