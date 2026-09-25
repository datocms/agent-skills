import { readFile, writeFile } from "node:fs/promises";
import {
	bashLabel,
	clip,
	inputBodyLines,
	summarizeInput,
	summarizeResult,
} from "./simplifyTranscript.js";

/**
 * Render an opencode JSON event transcript (`raw.jsonl`) as a plain-text,
 * human-friendly log. opencode's `tool_use` events are self-contained: each
 * carries both the tool input and the completed output, so there are no
 * separate tool_result events to correlate.
 */
export async function simplifyOpencodeTranscript(
	transcriptPath: string,
	outputPath: string,
): Promise<void> {
	const raw = await readFile(transcriptPath, "utf8");
	const out: string[] = [];

	for (const line of raw.split("\n")) {
		if (!line) continue;
		let entry: Entry | null = null;
		try {
			entry = JSON.parse(line) as Entry;
		} catch {
			out.push(`[unparseable] ${line}`);
			continue;
		}
		for (const rendered of renderEntry(entry)) out.push(rendered);
	}

	await writeFile(outputPath, `${out.join("\n")}\n`);
}

type ToolState = {
	status?: string;
	input?: unknown;
	output?: unknown;
	metadata?: { exit?: number; output?: string };
};

type Entry = {
	type?: string;
	part?: {
		type?: string;
		tool?: string;
		state?: ToolState;
		text?: string;
		reason?: string;
	};
};

function renderEntry(entry: Entry): string[] {
	const out: string[] = [];
	const part = entry.part;
	if (!part) return out;

	if (entry.type === "tool_use") {
		const name = String(part.tool ?? "");
		const state = part.state ?? {};
		const input = state.input;

		if (name === "bash") {
			const cmd = (input as { command?: unknown })?.command;
			const command = typeof cmd === "string" ? cmd : "";
			const { icon, label } = bashLabel(command);
			out.push(`${icon} bash ${label}`);
		} else {
			out.push(`→ ${name}${summarizeInput(name, input)}`);
		}
		for (const line of inputBodyLines(name, input)) out.push(line);

		const output = typeof state.output === "string" ? state.output : "";
		const exit = state.metadata?.exit;
		const isError = typeof exit === "number" ? exit !== 0 : null;
		const { kind, detail } = summarizeResult(output, isError);
		const arrow = kind === "error" ? "← ✗" : kind === "info" ? "←" : "← ✓";
		const lines = detail.split("\n");
		out.push(`${arrow} ${lines[0] ?? ""}`);
		for (const line of lines.slice(1)) out.push(`  ${line}`);
		return out;
	}

	if (entry.type === "text") {
		const text = (part.text ?? "").trim();
		if (text) out.push(`💬 ${clip(text, 200)}`);
		return out;
	}

	if (entry.type === "step_finish" && part.reason === "stop") {
		out.push("─ stop");
	}

	return out;
}
