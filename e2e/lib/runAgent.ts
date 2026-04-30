import { join, resolve } from "node:path";

export const E2E_TRANSCRIPTS_ROOT = resolve(process.cwd(), "tmp", "e2e");
const PROJECT_ROOT = process.cwd();
export const PROJECT_BIN = join(PROJECT_ROOT, "node_modules", ".bin");
// The repo ships skills under `skills/`. Both the Claude harness and the
// opencode harness mirror this into the spawned agent's workDir as
// `.claude/skills/` (opencode reads that path natively in addition to its
// own `.opencode/skills/`).
export const SKILLS_SOURCE = join(PROJECT_ROOT, "skills");

export type ToolCallRecord = {
	name: string;
	input: unknown;
	id: string;
};

export type RunAgentResult = {
	attempts: number;
	toolCalls: ToolCallRecord[];
	finalText: string | undefined;
	exitCode: number | null;
	terminatedByCap: boolean;
	transcriptPath: string;
};

export type RunAgentOptions = {
	name: string;
	prompt: string;
	maxAttempts: number;
	apiToken: string;
	model?: string;
	timeoutMs?: number;
};

export type AgentKind = "claude" | "opencode";

export function selectedAgent(): AgentKind {
	const raw = (process.env.E2E_AGENT ?? "claude").toLowerCase();
	if (raw === "opencode") return "opencode";
	if (raw === "claude") return "claude";
	throw new Error(
		`Unknown E2E_AGENT="${process.env.E2E_AGENT}" (expected "claude" or "opencode")`,
	);
}

export async function runAgent(
	options: RunAgentOptions,
): Promise<RunAgentResult> {
	const agent = selectedAgent();
	if (agent === "opencode") {
		const { runOpencode } = await import("./runOpencode.js");
		return runOpencode(options);
	}
	const { runClaude } = await import("./runClaude.js");
	return runClaude(options);
}
