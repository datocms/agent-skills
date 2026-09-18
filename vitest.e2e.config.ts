import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

// Load `.env` / `.env.local` from the repo root.
loadEnv({ path: [".env.local", ".env"] });
process.env.E2E_RUN_ID ??= new Date().toISOString().replace(/[:.]/g, "-");

export default defineConfig({
	test: {
		include: ["e2e/cases/**/*.e2e.test.ts"],
		globalSetup: ["./e2e/globalSetup.ts"],
		testTimeout: 15 * 60 * 1000,
		hookTimeout: 5 * 60 * 1000,
		maxWorkers: process.env.E2E_DATOCMS_API_TOKEN ? 1 : 4,
		minWorkers: 1,
		reporters: ["default"],
	},
});
