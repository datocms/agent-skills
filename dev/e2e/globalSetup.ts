import { mkdir } from "node:fs/promises";
import { E2E_TRANSCRIPTS_ROOT } from "./lib/runAgent.js";

export default async function setup() {
	await mkdir(E2E_TRANSCRIPTS_ROOT, { recursive: true });
	console.log(`[e2e] Evidence: ${E2E_TRANSCRIPTS_ROOT}`);
}
