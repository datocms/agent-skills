import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { delimiter, join } from "node:path";
import {
	E2E_TRANSCRIPTS_ROOT,
	PROJECT_BIN,
	type RunAgentOptions,
	type RunAgentResult,
	SKILLS_SOURCE,
	type ToolCallRecord,
} from "./runAgent.js";
import { simplifyTranscript } from "./simplifyTranscript.js";

export {
	E2E_TRANSCRIPTS_ROOT,
	type RunAgentOptions as RunClaudeOptions,
	type RunAgentResult as RunClaudeResult,
	type ToolCallRecord,
};

const DEFAULT_TIMEOUT_MS = 250 * 1000;

function isCmaScriptInvocation(toolCall: ToolCallRecord): boolean {
	if (toolCall.name !== "Bash") return false;
	const input = toolCall.input as { command?: unknown } | null;
	const command = typeof input?.command === "string" ? input.command : "";
	return /\bdatocms\b[^\n]*\bcma:script\b/.test(command);
}

export async function runClaude(
	options: RunAgentOptions,
): Promise<RunAgentResult> {
	const slug = options.name.replace(/[^a-z0-9-]+/gi, "-");
	const workDir = join(E2E_TRANSCRIPTS_ROOT, slug);
	await mkdir(workDir, { recursive: true });
	const transcriptPath = join(workDir, "raw.jsonl");

	// Mirror the repo's `skills/` tree into the isolated workDir under
	// `.claude/skills/` so every local skill is discoverable by the spawned
	// agent. Adding a new skill at the project level requires no change here.
	const skillsDest = join(workDir, ".claude", "skills");
	await mkdir(skillsDest, { recursive: true });
	await cp(SKILLS_SOURCE, skillsDest, { recursive: true });

	// Tool whitelist: Bash to invoke `datocms cma:script`, Read/Glob/Grep so the
	// agent can open the SKILL.md and inspect anything else in workDir. No
	// Edit/Write — scripts are passed through stdin, not committed to disk.
	const args = [
		"-p",
		options.prompt,
		"--strict-mcp-config",
		"--mcp-config",
		// No MCP servers; passing an empty config + --strict makes that explicit.
		JSON.stringify({ mcpServers: {} }),
		"--tools",
		"Bash,Read,Glob,Grep,Skill",
		"--permission-mode",
		"bypassPermissions",
		"--output-format",
		"stream-json",
		"--verbose",
		"--no-session-persistence",
		"--model",
		options.model ?? process.env.E2E_MODEL ?? "claude-opus-4-6",
	];

	const child = spawn("claude", args, {
		cwd: workDir,
		stdio: ["ignore", "pipe", "pipe"],
		env: {
			...process.env,
			DATOCMS_API_TOKEN: options.apiToken,
			// Prepend the project's node_modules/.bin so plain `datocms` (and
			// `npx datocms`) resolves the locally-installed CLI even though
			// workDir lives several levels below it.
			PATH: `${PROJECT_BIN}${delimiter}${process.env.PATH ?? ""}`,
		},
	});

	const toolCalls: ToolCallRecord[] = [];
	const seenToolUseIds = new Set<string>();
	let finalText: string | undefined;
	let terminatedByCap = false;
	let stdoutBuffer = "";
	let stderrBuffer = "";

	const timeout = setTimeout(() => {
		terminatedByCap = true;
		child.kill("SIGKILL");
	}, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

	function handleLine(line: string): void {
		if (!line) return;
		appendFileSync(transcriptPath, `${line}\n`);

		let parsed: unknown;
		try {
			parsed = JSON.parse(line);
		} catch {
			return;
		}
		if (!parsed || typeof parsed !== "object") return;
		const event = parsed as Record<string, unknown>;

		if (event.type === "assistant") {
			const message = event.message as
				| { content?: Array<Record<string, unknown>> }
				| undefined;
			for (const block of message?.content ?? []) {
				if (block.type !== "tool_use") continue;
				const id = String(block.id);
				if (seenToolUseIds.has(id)) continue;
				seenToolUseIds.add(id);
				const name = String(block.name);
				const record: ToolCallRecord = { id, name, input: block.input };
				toolCalls.push(record);

				if (isCmaScriptInvocation(record)) {
					const scriptAttempts = toolCalls.filter(isCmaScriptInvocation).length;
					if (scriptAttempts > options.maxAttempts) {
						terminatedByCap = true;
						child.kill("SIGKILL");
					}
				}
			}
		} else if (event.type === "result") {
			const result = event.result;
			if (typeof result === "string") finalText = result;
		}
	}

	child.stdout.on("data", (chunk: Buffer) => {
		stdoutBuffer += chunk.toString("utf8");
		let newlineIndex = stdoutBuffer.indexOf("\n");
		while (newlineIndex !== -1) {
			const line = stdoutBuffer.slice(0, newlineIndex);
			stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
			handleLine(line);
			newlineIndex = stdoutBuffer.indexOf("\n");
		}
	});

	child.stderr.on("data", (chunk: Buffer) => {
		stderrBuffer += chunk.toString("utf8");
	});

	const exitCode = await new Promise<number | null>((resolve) => {
		child.on("exit", (code) => resolve(code));
	});
	clearTimeout(timeout);

	if (stdoutBuffer) handleLine(stdoutBuffer);
	if (stderrBuffer) {
		appendFileSync(transcriptPath, `\n--- stderr ---\n${stderrBuffer}\n`);
	}

	const simplifiedPath = join(workDir, "transcript.simplified.log");
	await simplifyTranscript(transcriptPath, simplifiedPath).catch((err) => {
		// Non-fatal: the raw transcript is still on disk for inspection.
		console.warn(`[simplifyTranscript] failed: ${(err as Error).message}`);
	});

	// The copied `.claude/skills/` tree was only there to make skills
	// discoverable to the spawned agent — drop it now so the workDir only
	// contains test artifacts (raw + simplified transcripts).
	await rm(join(workDir, ".claude"), { recursive: true, force: true });

	const attempts = toolCalls.filter(isCmaScriptInvocation).length;

	return {
		attempts,
		toolCalls,
		finalText,
		exitCode,
		terminatedByCap,
		transcriptPath,
	};
}
