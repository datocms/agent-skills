import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

test("creates a simple BlogPost model with two fields", async () => {
	const outcome = await runE2ETest({
		name: "create-simple-model",
		maxAttempts: 2,
		task: (project) =>
			`In the DatoCMS project with site ID "${project.siteId}", create a new model called "Blog Post" (api_key "blog_post") with two fields: a single-line string field "Title" (api_key "title"), and a multi-line text field "Body" (api_key "body"). The "Title" field should be the model's title field.`,
		assert: async ({ cmaClient }) => {
			const itemType = await cmaClient.itemTypes.find("blog_post");
			expect(itemType.api_key).toBe("blog_post");

			const fields = await cmaClient.fields.list(itemType.id);
			const byApiKey = Object.fromEntries(fields.map((f) => [f.api_key, f]));

			expect(byApiKey.title, "title field").toBeDefined();
			expect(byApiKey.title?.field_type).toBe("string");

			expect(byApiKey.body, "body field").toBeDefined();
			expect(byApiKey.body?.field_type).toBe("text");

			expect(itemType.title_field?.id).toBe(byApiKey.title?.id);
		},
	});

	if (!outcome.passed) {
		throw new Error(
			`E2E failed: ${outcome.reason}\n` +
				`Attempts (upsert_and_execute_*_script): ${outcome.attempts}\n` +
				`Tool calls: ${outcome.toolCallNames.join(", ") || "(none)"}\n` +
				`Transcript: ${outcome.transcriptPath}\n` +
				(outcome.finalText ? `Final text: ${outcome.finalText}\n` : ""),
		);
	}

	console.log(
		`✓ ${outcome.name} passed in ${outcome.attempts} script attempt(s). Transcript: ${outcome.transcriptPath}`,
	);
});
