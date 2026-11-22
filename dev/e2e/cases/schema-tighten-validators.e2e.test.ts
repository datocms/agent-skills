import { ApiError, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

type Context = {
	modelId: string;
	nameFieldId: string;
	priceFieldId: string;
	records: { id: string; name: string; price: number }[];
	/** The `name` field's appearance right after seeding. */
	nameAppearance: unknown;
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

const RECORDS = [
	{ name: "Walnut desk", price: 420 },
	{ name: "Linen lampshade", price: 35.5 },
];

test("raises a field's limits without dropping its other validators or presentation", async () => {
	const outcome = await runE2ETest<Context>({
		name: "schema-tighten-validators",
		maxAttempts: 12,
		fixtures: async (client: Client) => {
			const model = await client.itemTypes.create({ name: "Product", api_key: "product" });
			const name = await client.fields.create(model.id, {
				label: "Name",
				api_key: "name",
				field_type: "string",
				validators: { required: {}, unique: {}, length: { max: 60 } },
				appearance: {
					editor: "single_line",
					parameters: { heading: true, placeholder: "Product name as shown in the shop" },
					addons: [],
				},
			});
			const price = await client.fields.create(model.id, {
				label: "Price",
				api_key: "price",
				field_type: "float",
				validators: { number_range: { min: 0 } },
			});
			const records = [];
			for (const values of RECORDS) {
				const record = await client.items.create({
					item_type: { type: "item_type", id: model.id },
					...values,
				} as never);
				records.push({ id: record.id, ...values });
			}
			const stored = await client.fields.find(name.id);
			return {
				modelId: model.id,
				nameFieldId: name.id,
				priceFieldId: price.id,
				records,
				nameAppearance: stored.appearance,
			};
		},
		task: () =>
			`On the "product" model, raise the maximum length of product names (\`name\`) to 120 characters, ` +
			`and make sure prices (\`price\`) cannot exceed 10000. Keep every other rule and setting of these fields as it is.`,
		solution: async ({ cmaClient, context }) => {
			await cmaClient.fields.update(context.nameFieldId, {
				validators: { required: {}, unique: {}, length: { max: 120 } },
			});
			await cmaClient.fields.update(context.priceFieldId, {
				validators: { number_range: { min: 0, max: 10000 } },
			});
		},
		traps: {
			"only the changed validators sent": async ({ cmaClient, context }) => {
				await cmaClient.fields.update(context.nameFieldId, { validators: { length: { max: 120 } } });
				await cmaClient.fields.update(context.priceFieldId, { validators: { number_range: { max: 10000 } } });
			},
			"name rules kept, price minimum dropped": async ({ cmaClient, context }) => {
				await cmaClient.fields.update(context.nameFieldId, {
					validators: { required: {}, unique: {}, length: { max: 120 } },
				});
				await cmaClient.fields.update(context.priceFieldId, { validators: { number_range: { max: 10000 } } });
			},
			"name appearance rebuilt from scratch": async ({ cmaClient, context }) => {
				await cmaClient.fields.update(context.nameFieldId, {
					validators: { required: {}, unique: {}, length: { max: 120 } },
					appearance: { editor: "single_line", parameters: { heading: false }, addons: [] },
				});
				await cmaClient.fields.update(context.priceFieldId, {
					validators: { number_range: { min: 0, max: 10000 } },
				});
			},
		},
		assert: async ({ cmaClient, context }) => {
			const item_type = { type: "item_type" as const, id: context.modelId };
			const probe = (values: Record<string, unknown>) => () =>
				cmaClient.items.validateNew({ item_type, name: "Oak shelf", price: 80, ...values } as never);

			expect(await refusal(probe({})), "a valid product must be accepted").toBeNull();
			expect(await refusal(probe({ name: "n".repeat(100) })), "a 100-character name must be accepted").toBeNull();
			expect(await refusal(probe({ name: "n".repeat(120) })), "a 120-character name must be accepted").toBeNull();
			expect(await refusal(probe({ price: 10000 })), "a price of 10000 must be accepted").toBeNull();
			expect(await refusal(probe({ price: 0 })), "a price of 0 must be accepted").toBeNull();

			expect(await refusal(probe({ name: "n".repeat(130) })), "a 130-character name must be rejected").not.toBeNull();
			expect(await refusal(probe({ name: "" })), "an empty name must be rejected").not.toBeNull();
			expect(await refusal(probe({ price: -1 })), "a negative price must be rejected").not.toBeNull();
			expect(await refusal(probe({ price: 20000 })), "a price of 20000 must be rejected").not.toBeNull();
			expect(
				await refusal(() =>
					cmaClient.items.create({ item_type, name: context.records[0]!.name, price: 10 } as never),
				),
				"a duplicate name must be rejected",
			).not.toBeNull();

			const name = await cmaClient.fields.find(context.nameFieldId);
			expect(name.appearance, "name presentation unchanged").toEqual(context.nameAppearance);

			for (const record of context.records) {
				const stored = await cmaClient.items.find(record.id);
				expect(stored.name, `record ${record.id} name unchanged`).toBe(record.name);
				expect(stored.price, `record ${record.id} price unchanged`).toBe(record.price);
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
