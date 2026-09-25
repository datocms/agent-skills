import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Load `.env` / `.env.local` from dev/, whatever the caller's cwd.
const root = import.meta.dirname;
loadEnv({ path: [resolve(root, ".env.local"), resolve(root, ".env")] });
process.env.E2E_RUN_ID ??= new Date().toISOString().replace(/[:.]/g, "-");

export default defineConfig({
	root,
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
