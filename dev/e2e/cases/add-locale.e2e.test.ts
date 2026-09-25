import type { ItemTypeDefinition } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pre-set model IDs. Passed to `itemTypes.create({ id })` to pin the runtime
// ID, and referenced as `typeof X_ID` in the Schema types below so every
// `item_type.id` in typed client calls is statically checked against it.
// echo 'import { generateId } from "@datocms/cma-client"; for (let i=0; i<10; i++) console.log(generateId())' | npx datocms cma:script --api-token XXX

const FAQ_ENTRY_ID = "Eo-sbK86TAKn8dgj_lx8rA" as const;

type Context = {
	recordIds: string[];
};

namespace Schema {
	export type FaqEntry = ItemTypeDefinition<
		{ locales: "en" | "it" | "es" },
		typeof FAQ_ENTRY_ID,
		{
			category: { type: "string" };
			question: { type: "string"; localized: true };
			answer: { type: "text"; localized: true };
		}
	>;
}

test("adds a new locale to the site and backfills localized content on existing records", async () => {
	const outcome = await runE2ETest<Context>({
		name: "add-locale",
		maxAttempts: 10,
		fixtures: async (client) => {
			await client.site.update({ locales: ["en", "it"] });

			const faqModel = await client.itemTypes.create({
				id: FAQ_ENTRY_ID,
				name: "FAQ Entry",
				api_key: "faq_entry",
			});

			await client.fields.create(faqModel.id, {
				label: "Category",
				api_key: "category",
				field_type: "string",
			});
			await client.fields.create(faqModel.id, {
				label: "Question",
				api_key: "question",
				field_type: "string",
				localized: true,
			});
			await client.fields.create(faqModel.id, {
				label: "Answer",
				api_key: "answer",
				field_type: "text",
				localized: true,
			});

			const records = await Promise.all([
				client.items.create<Schema.FaqEntry>({
					item_type: { type: "item_type", id: FAQ_ENTRY_ID },
					category: "account",
					question: {
						en: "How do I reset my password?",
						it: "Come posso reimpostare la password?",
					},
					answer: {
						en: "Open the login page and click 'Forgot password'.",
						it: "Apri la pagina di login e clicca 'Password dimenticata'.",
					},
				}),
				client.items.create<Schema.FaqEntry>({
					item_type: { type: "item_type", id: FAQ_ENTRY_ID },
					category: "billing",
					question: {
						en: "What is your refund policy?",
						it: "Qual è la vostra politica di rimborso?",
					},
					answer: {
						en: "Refunds are available within 30 days of purchase.",
						it: "I rimborsi sono disponibili entro 30 giorni dall'acquisto.",
					},
				}),
				client.items.create<Schema.FaqEntry>({
					item_type: { type: "item_type", id: FAQ_ENTRY_ID },
					category: "product",
					question: {
						en: "Do you support dark mode?",
						it: "Supportate il tema scuro?",
					},
					answer: {
						en: "Yes, dark mode can be enabled from the settings menu.",
						it: "Sì, il tema scuro può essere attivato dal menu impostazioni.",
					},
				}),
			]);

			return { recordIds: records.map((r) => r.id) };
		},
		task: ({ context }) =>
			`The project currently has two locales: "en" and "it". ` +
			`Add a third locale, "es" (Spanish), to the project. Then for every existing "faq_entry" record (there are ${context.recordIds.length} of them — you can list them yourself), populate the Spanish ("es") version of the localized fields ("question" and "answer") with a reasonable Spanish translation of the English content. ` +
			`Every record must end up with non-empty "es" values for both "question" and "answer". The existing "en" and "it" values and the non-localized "category" field must be left unchanged.`,
		assert: async ({ cmaClient, context }) => {
			const site = await cmaClient.site.find();
			expect(site.locales, "site locales must now include es").toEqual(
				expect.arrayContaining(["en", "it", "es"]),
			);

			for (const recordId of context.recordIds) {
				const record = await cmaClient.items.find<Schema.FaqEntry>(recordId);
				const question = record.question;
				const answer = record.answer;

				expect(
					typeof question.en,
					`question.en on ${recordId} must remain`,
				).toBe("string");
				expect(
					question.en?.length,
					`question.en on ${recordId}`,
				).toBeGreaterThan(0);
				expect(
					typeof question.it,
					`question.it on ${recordId} must remain`,
				).toBe("string");
				expect(
					question.it?.length,
					`question.it on ${recordId}`,
				).toBeGreaterThan(0);
				expect(
					typeof question.es,
					`question.es on ${recordId} must be populated`,
				).toBe("string");
				expect(
					question.es?.trim().length,
					`question.es on ${recordId}`,
				).toBeGreaterThan(0);

				expect(typeof answer.en, `answer.en on ${recordId}`).toBe("string");
				expect(answer.en?.length).toBeGreaterThan(0);
				expect(typeof answer.it, `answer.it on ${recordId}`).toBe("string");
				expect(answer.it?.length).toBeGreaterThan(0);
				expect(typeof answer.es, `answer.es on ${recordId}`).toBe("string");
				expect(answer.es?.trim().length).toBeGreaterThan(0);

				expect(
					typeof record.category,
					`category on ${recordId} must remain non-localized string`,
				).toBe("string");
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
