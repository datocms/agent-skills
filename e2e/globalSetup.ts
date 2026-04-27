import { mkdir, rm } from "node:fs/promises";
import { cleanupOldProjects } from "./lib/cleanupOldProjects.js";
import { E2E_TRANSCRIPTS_ROOT } from "./lib/runClaude.js";

export default async function setup() {
	const maxAgeMs = Number(process.env.E2E_CLEANUP_MAX_AGE_MS) || undefined;
	const force = process.env.E2E_CLEANUP_FORCE === "1";

	await cleanupOldProjects({
		maxAgeMs,
		force,
		log: (msg) => console.log(`[e2e-cleanup] ${msg}`),
	});

	await rm(E2E_TRANSCRIPTS_ROOT, { recursive: true, force: true });
	await mkdir(E2E_TRANSCRIPTS_ROOT, { recursive: true });
	console.log(`[e2e-cleanup] Transcripts dir reset: ${E2E_TRANSCRIPTS_ROOT}`);
}
