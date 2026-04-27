import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

loadEnv({ path: ".env.local" });

export default defineConfig({
	test: {
		include: ["e2e/cases/**/*.e2e.test.ts"],
		globalSetup: ["./e2e/globalSetup.ts"],
		testTimeout: 15 * 60 * 1000,
		hookTimeout: 5 * 60 * 1000,
		maxWorkers: 4,
		minWorkers: 1,
		reporters: ["default"],
	},
});
