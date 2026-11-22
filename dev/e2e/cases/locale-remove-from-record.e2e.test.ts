import {
	buildBlockRecord,
	type Client,
	type ItemTypeDefinition,
} from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

// Pinned model IDs (see modular-content-blocks.e2e.test.ts for how they are generated).
const LINK_BLOCK_ID = "IPvZyXhSQBODT4KYTxpVTA" as const;
const FAQ_ID = "Y3kEMBaLSGKrNWbSM331rg" as const;

type Locale = "en" | "it" | "de";
const LOCALES: Locale[] = ["en", "it", "de"];

namespace Schema {
	export type FaqLink = ItemTypeDefinition<
		{ locales: Locale },
		typeof LINK_BLOCK_ID,
		{ label: { type: "string" }; url: { type: "string" } }
	>;

	export type Faq = ItemTypeDefinition<
		{ locales: Locale },
		typeof FAQ_ID,
		{
			question: { type: "string"; localized: true };
			answer: { type: "text"; localized: true };
			links: { type: "rich_text"; blocks: FaqLink; localized: true };
		}
	>;
}

type Translation = { question: string; answer: string; links: { label: string; url: string }[] };

const FAQS: Record<string, Record<Locale, Translation>> = {
	"Shipping times": {
		en: { question: "Shipping times", answer: "Orders ship within two business days.", links: [{ label: "Shipping policy", url: "https://shop.example.com/en/shipping" }] },
		it: { question: "Tempi di spedizione", answer: "Gli ordini partono entro due giorni lavorativi.", links: [{ label: "Politica di spedizione", url: "https://shop.example.com/it/spedizioni" }] },
		de: { question: "Versandkosten", answer: "Bestellungen werden innerhalb von zwei Wochen versendet.", links: [{ label: "Versand", url: "https://shop.example.com/de/versand" }, { label: "Kontakt", url: "https://shop.example.com/de/kontakt" }] },
	},
	Returns: {
		en: { question: "Returns", answer: "You can return any item within 30 days.", links: [{ label: "Start a return", url: "https://shop.example.com/en/returns" }] },
		it: { question: "Resi", answer: "Puoi restituire qualsiasi articolo entro 30 giorni.", links: [{ label: "Avvia un reso", url: "https://shop.example.com/it/resi" }] },
		de: { question: "Rücksendungen", answer: "Sie können jeden Artikel innerhalb von 30 Tagen zurücksenden.", links: [{ label: "Rücksendung starten", url: "https://shop.example.com/de/ruecksendung" }] },
	},
	"Payment methods": {
		en: { question: "Payment methods", answer: "We accept cards and bank transfers.", links: [] },
		it: { question: "Metodi di pagamento", answer: "Accettiamo carte e bonifici.", links: [] },
		de: { question: "Zahlungsmethoden", answer: "Wir akzeptieren Karten und Überweisungen.", links: [] },
	},
};

type Snapshot = Record<string, { question: unknown; answer: unknown; links: Record<string, { id: string; label: unknown; url: unknown }[]> }>;

type Context = {
	recordIds: Record<string, string>;
	targetId: string;
	publishedAt: string;
	snapshots: Snapshot;
};

async function snapshot(client: Client, id: string, version: "current" | "published" = "current") {
	const record = await client.items.find<Schema.Faq>(id, { nested: true, version });
	const links = Object.fromEntries(
		Object.entries(record.links).map(([locale, blocks]) => [
			locale,
			(blocks ?? []).map((block) => ({ id: block.id, label: block.attributes.label, url: block.attributes.url })),
		]),
	);
	return { question: record.question, answer: record.answer, links };
}

const perLocale = (target: Record<Locale, Translation>, pick: (t: Translation) => string) =>
	Object.fromEntries(LOCALES.map((locale) => [locale, pick(target[locale])])) as Record<Locale, string>;

test("removes one locale from a single record without touching the others", async () => {
	const outcome = await runE2ETest<Context>({
		name: "locale-remove-from-record",
		maxAttempts: 12,
		fixtures: async (client) => {
			await client.site.update({ locales: ["en", "it", "de"] });

			await client.itemTypes.create({ id: LINK_BLOCK_ID, name: "FAQ link", api_key: "faq_link", modular_block: true });
			await client.fields.create(LINK_BLOCK_ID, { label: "Label", api_key: "label", field_type: "string" });
			await client.fields.create(LINK_BLOCK_ID, { label: "URL", api_key: "url", field_type: "string" });

			await client.itemTypes.create({ id: FAQ_ID, name: "FAQ", api_key: "faq", draft_mode_active: true });
			await client.fields.create(FAQ_ID, { label: "Question", api_key: "question", field_type: "string", localized: true });
			await client.fields.create(FAQ_ID, { label: "Answer", api_key: "answer", field_type: "text", localized: true });
			await client.fields.create(FAQ_ID, {
				label: "Links",
				api_key: "links",
				field_type: "rich_text",
				localized: true,
				validators: { rich_text_blocks: { item_types: [LINK_BLOCK_ID] } },
			});

			const recordIds: Record<string, string> = {};
			for (const [title, translations] of Object.entries(FAQS)) {
				const record = await client.items.create<Schema.Faq>({
					item_type: { type: "item_type", id: FAQ_ID },
					question: perLocale(translations, (t) => t.question),
					answer: perLocale(translations, (t) => t.answer),
					links: Object.fromEntries(
						LOCALES.map((locale) => [
							locale,
							translations[locale].links.map((link) =>
								buildBlockRecord<Schema.FaqLink>({ item_type: { type: "item_type", id: LINK_BLOCK_ID }, ...link }),
							),
						]),
					) as Record<Locale, ReturnType<typeof buildBlockRecord<Schema.FaqLink>>[]>,
				});
				recordIds[title] = record.id;
			}
			const targetId = recordIds["Shipping times"]!;
			await client.items.publish(targetId);

			const snapshots: Snapshot = {};
			for (const id of Object.values(recordIds)) snapshots[id] = await snapshot(client, id);
			const publishedAt = (await client.items.find(targetId)).meta.published_at ?? "";
			return { recordIds, targetId, publishedAt, snapshots };
		},
		task: ({ context }) =>
			`The German translation of the "faq" record "Shipping times" (record ID "${context.targetId}") was wrong and must be removed entirely: ` +
			`that record should no longer have a German version at all. Keep its English and Italian content exactly as it is, and leave every other FAQ ` +
			`record and the project's locales as they are. Do not publish the change: the live version stays as it is until an editor reviews and publishes it.`,
		solution: async ({ cmaClient, context }) => {
			const current = await cmaClient.items.find<Schema.Faq>(context.targetId);
			const { de: _q, ...question } = current.question;
			const { de: _a, ...answer } = current.answer;
			const { de: _l, ...links } = current.links;
			await cmaClient.items.update<Schema.Faq>(context.targetId, { question, answer, links });
		},
		traps: {
			"German values blanked instead of removed": async ({ cmaClient, context }) => {
				const current = await cmaClient.items.find<Schema.Faq>(context.targetId);
				await cmaClient.items.update<Schema.Faq>(context.targetId, {
					question: { ...current.question, de: "" },
					answer: { ...current.answer, de: "" },
					links: { ...current.links, de: [] },
				});
			},
			"German removed from one field only": async ({ cmaClient, context }) => {
				const current = await cmaClient.items.find<Schema.Faq>(context.targetId);
				await cmaClient.items.update<Schema.Faq>(context.targetId, {
					question: { en: current.question.en, it: current.question.it },
				});
			},
			"German removed and the record published": async ({ cmaClient, context }) => {
				const current = await cmaClient.items.find<Schema.Faq>(context.targetId);
				const { de: _q, ...question } = current.question;
				const { de: _a, ...answer } = current.answer;
				const { de: _l, ...links } = current.links;
				await cmaClient.items.update<Schema.Faq>(context.targetId, { question, answer, links });
				await cmaClient.items.publish(context.targetId);
			},
		},
		assert: async ({ cmaClient, context }) => {
			const original = context.snapshots[context.targetId]!;
			const now = await snapshot(cmaClient, context.targetId);
			for (const field of ["question", "answer", "links"] as const) {
				const value = now[field] as Record<string, unknown>;
				expect(Object.keys(value).sort(), `"${field}" must have exactly en and it`).toEqual(["en", "it"]);
				const before = original[field] as Record<string, unknown>;
				expect(value.en, `"${field}" en must be unchanged`).toEqual(before.en);
				expect(value.it, `"${field}" it must be unchanged`).toEqual(before.it);
			}

			const record = await cmaClient.items.find(context.targetId);
			expect(record.meta.published_at, "the change must not be published").toBe(context.publishedAt);
			expect(
				await snapshot(cmaClient, context.targetId, "published"),
				"the live version must be unchanged",
			).toEqual(original);

			for (const [title, id] of Object.entries(context.recordIds)) {
				if (id === context.targetId) continue;
				expect(await snapshot(cmaClient, id), `"${title}" must be unchanged`).toEqual(context.snapshots[id]);
			}

			expect((await cmaClient.site.find()).locales, "project locales must be unchanged").toEqual(LOCALES);
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
