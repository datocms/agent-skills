import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { delimiter, join } from "node:path";
import {
	E2E_TRANSCRIPTS_ROOT,
	PROJECT_BIN,
	SKILLS_SOURCE,
	type RunAgentOptions,
	type RunAgentResult,
	type ToolCallRecord,
} from "./runAgent.js";
import { simplifyOpencodeTranscript } from "./simplifyOpencodeTranscript.js";

const DEFAULT_TIMEOUT_MS = 250 * 1000;

function isCmaScriptInvocation(toolCall: ToolCallRecord): boolean {
	if (toolCall.name !== "bash") return false;
	const input = toolCall.input as { command?: unknown } | null;
	const command = typeof input?.command === "string" ? input.command : "";
	return /\bdatocms\b[^\n]*\bcma:script\b/.test(command);
}

export async function runOpencode(
	options: RunAgentOptions,
): Promise<RunAgentResult> {
	const slug = options.name.replace(/[^a-z0-9-]+/gi, "-");
	const workDir = join(E2E_TRANSCRIPTS_ROOT, slug);
	await mkdir(workDir, { recursive: true });
	const transcriptPath = join(workDir, "raw.jsonl");

	// opencode reads `.claude/skills/` natively (Claude-compatible discovery
	// path), so the same mirror as the Claude harness makes every local skill
	// available without further config.
	const skillsDest = join(workDir, ".claude", "skills");
	await mkdir(skillsDest, { recursive: true });
	await cp(SKILLS_SOURCE, skillsDest, { recursive: true });

	const args = [
		"run",
		"--format",
		"json",
		"--dangerously-skip-permissions",
		"--pure", // disable external plugins / MCP for hermetic runs
	];
	const model = options.model ?? process.env.E2E_OPENCODE_MODEL;
	if (model) args.push("--model", model);
	args.push(options.prompt);

	const child = spawn("opencode", args, {
		cwd: workDir,
		stdio: ["ignore", "pipe", "pipe"],
		env: {
			...process.env,
			DATOCMS_API_TOKEN: options.apiToken,
			PATH: `${PROJECT_BIN}${delimiter}${process.env.PATH ?? ""}`,
		},
	});

	const toolCalls: ToolCallRecord[] = [];
	const seenCallIds = new Set<string>();
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
		const part = event.part as Record<string, unknown> | undefined;
		if (!part) return;

		if (event.type === "tool_use") {
			const id = String(part.callID ?? part.id ?? "");
			if (!id || seenCallIds.has(id)) return;
			seenCallIds.add(id);
			const name = String(part.tool ?? "");
			const state = part.state as { input?: unknown } | undefined;
			const record: ToolCallRecord = { id, name, input: state?.input ?? {} };
			toolCalls.push(record);

			if (isCmaScriptInvocation(record)) {
				const scriptAttempts = toolCalls.filter(isCmaScriptInvocation).length;
				if (scriptAttempts > options.maxAttempts) {
					terminatedByCap = true;
					child.kill("SIGKILL");
				}
			}
		} else if (event.type === "text") {
			const text = part.text;
			if (typeof text === "string") finalText = text;
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
	await simplifyOpencodeTranscript(transcriptPath, simplifiedPath).catch(
		(err) => {
			// Non-fatal: the raw transcript is still on disk for inspection.
			console.warn(
				`[simplifyOpencodeTranscript] failed: ${(err as Error).message}`,
			);
		},
	);

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
