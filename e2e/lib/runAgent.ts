import { join, resolve } from "node:path";

export const E2E_TRANSCRIPTS_ROOT = resolve(
	process.env.E2E_OUTPUT ?? "local/e2e",
	process.env.E2E_RUN_ID ?? "manual",
);
const PROJECT_ROOT = process.cwd();
export const PROJECT_BIN = join(PROJECT_ROOT, "node_modules", ".bin");
// Each adapter installs this checkout's skill tree in its isolated workspace.
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
	environment?: string;
	files?: Record<string, string | Uint8Array>;
	model?: string;
	timeoutMs?: number;
};

export type AgentKind = "codex" | "claude" | "opencode";

export function selectedAgent(): AgentKind {
	const raw = (process.env.E2E_AGENT ?? "codex").toLowerCase();
	if (raw === "codex") return "codex";
	if (raw === "opencode") return "opencode";
	if (raw === "claude") return "claude";
	throw new Error(
		`Unknown E2E_AGENT="${process.env.E2E_AGENT}" (expected "codex", "claude" or "opencode")`,
	);
}

export async function runAgent(
	options: RunAgentOptions,
): Promise<RunAgentResult> {
	const agent = selectedAgent();
	if (agent === "codex") {
		const { runCodex } = await import("./runCodex.js");
		return runCodex(options);
	}
	if (agent === "opencode") {
		const { runOpencode } = await import("./runOpencode.js");
		return runOpencode(options);
	}
	const { runClaude } = await import("./runClaude.js");
	return runClaude(options);
}
