import { readFile, writeFile } from "node:fs/promises";

/**
 * Render a stream-json transcript (`raw.jsonl`) as a plain-text,
 * human-friendly log of what the agent did: skills loaded, scripts run,
 * tool results. ANSI-free so it stays readable in editors and pagers.
 *
 * The harness calls this once per test, after the Claude subprocess exits,
 * to produce `transcript.simplified.log` next to the raw JSONL.
 */
export async function simplifyTranscript(
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

function clip(s: string, max: number): string {
	const flat = s.replace(/\s+/g, " ").trim();
	return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function extractCmaScript(
	command: string,
): { kind: "stdin" | "file"; body: string } | null {
	if (!/\bdatocms\b[^\n]*\bcma:script\b/.test(command)) return null;

	const heredoc = command.match(
		/cma:script[^\n]*<<-?\s*['"]?(\w+)['"]?[^\n]*\n([\s\S]*?)\n\1\b/m,
	);
	if (heredoc?.[2] !== undefined) return { kind: "stdin", body: heredoc[2] };

	const echo = command.match(
		/echo\s+(['"])([\s\S]*?)\1\s*\|\s*[^\n]*datocms[^\n]*cma:script/,
	);
	if (echo?.[2] !== undefined) return { kind: "stdin", body: echo[2] };

	const filePath = command.match(
		/datocms[^\n]*cma:script\s+(?:--file[= ])?([^\s<>|&;]+\.tsx?)/,
	);
	if (filePath?.[1]) return { kind: "file", body: filePath[1] };

	return null;
}

function bashLabel(command: string): { icon: string; label: string } {
	const cmd = command.trim();
	if (/\bdatocms\b[^\n]*\bcma:script\b/.test(cmd))
		return { icon: "⚡", label: "cma:script" };
	if (/\bdatocms\b[^\n]*\bschema:inspect\b/.test(cmd)) {
		const args = cmd.replace(/^.*?schema:inspect/, "schema:inspect").trim();
		return { icon: "🔍", label: clip(args, 80) };
	}
	if (/\bdatocms\b/.test(cmd)) return { icon: "🛠", label: clip(cmd, 80) };
	return { icon: "$", label: clip(cmd, 80) };
}

function summarizeInput(name: string, input: unknown): string {
	if (!input || typeof input !== "object") return "";
	const i = input as Record<string, unknown>;

	if (name === "Skill") return `(${String(i.skill ?? "")})`;
	if (name === "Read") return `(${String(i.file_path ?? "")})`;
	if (name === "Glob") return `(${String(i.pattern ?? "")})`;
	if (name === "Grep") {
		const extras: string[] = [];
		if (i.path) extras.push(String(i.path));
		if (i.glob) extras.push(`glob=${i.glob}`);
		return `(${[String(i.pattern ?? ""), ...extras].filter(Boolean).join(" ")})`;
	}

	const keys = Object.keys(i).slice(0, 2).join(",");
	return keys ? `(${keys})` : "";
}

function inputBodyLines(name: string, input: unknown): string[] {
	if (name !== "Bash") return [];
	const command = (input as { command?: unknown })?.command;
	if (typeof command !== "string") return [];

	const script = extractCmaScript(command);
	if (script?.kind === "stdin") {
		const body = script.body.replace(/\n+$/, "");
		const out: string[] = ["  ┌─ stdin script"];
		for (const line of body.split("\n")) out.push(`  │ ${line}`);
		out.push("  └─");
		return out;
	}
	if (script?.kind === "file") return [`  └─ file: ${script.body}`];
	if (command.includes("\n"))
		return command.split("\n").map((line) => `  │ ${line}`);
	return [];
}

type ToolResultContent =
	| string
	| Array<{ type: string; text?: string } | unknown>;

function extractResultText(content: ToolResultContent): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	const parts: string[] = [];
	for (const item of content) {
		if (!item || typeof item !== "object") continue;
		const obj = item as { type: string; text?: string };
		if (obj.type === "text" && obj.text) parts.push(obj.text);
	}
	return parts.join("\n");
}

function summarizeResult(
	content: ToolResultContent,
	isError: boolean | null,
): { kind: "ok" | "error" | "info"; detail: string } {
	const text = extractResultText(content);
	const trimmed = text.trim();
	const sizeKb = `${(text.length / 1024).toFixed(1)}KB`;

	if (isError || /\bError\b|TypeError|SyntaxError/.test(trimmed)) {
		const lines = trimmed.split("\n").slice(0, 8);
		return { kind: "error", detail: lines.join("\n") || `error (${sizeKb})` };
	}

	if (!trimmed) return { kind: "info", detail: "(empty)" };

	const lines = trimmed.split("\n");
	const head = lines.slice(0, 4).join("\n");
	const more = lines.length > 4 ? ` … +${lines.length - 4} lines` : "";
	return { kind: "ok", detail: `${head}${more} (${sizeKb})` };
}

type Entry = {
	type: string;
	subtype?: string;
	model?: string;
	message?: {
		role?: string;
		content?: Array<{
			type: string;
			text?: string;
			thinking?: string;
			name?: string;
			input?: unknown;
			tool_use_id?: string;
			content?: ToolResultContent;
			is_error?: boolean | null;
		}>;
	};
	result?: string;
};

function renderEntry(entry: Entry): string[] {
	const out: string[] = [];

	if (entry.type === "system" && entry.subtype === "init") {
		out.push(`─ init · model=${entry.model ?? "?"}`);
		return out;
	}
	if (entry.type === "result") {
		const r = (entry.result ?? "").trim();
		if (r) out.push(`✓ final: ${clip(r, 200)}`);
		return out;
	}

	const content = entry.message?.content ?? [];

	if (entry.type === "assistant") {
		for (const c of content) {
			if (c.type === "thinking") {
				const t = (c.thinking ?? "").trim();
				if (!t) continue;
				for (const line of t.split("\n")) out.push(`🧠 ${line}`);
				continue;
			}
			if (c.type === "text" && c.text) {
				out.push(`💬 ${clip(c.text, 200)}`);
				continue;
			}
			if (c.type === "tool_use") {
				const name = c.name ?? "";
				if (name === "Bash") {
					const cmd = (c.input as { command?: unknown })?.command;
					const command = typeof cmd === "string" ? cmd : "";
					const { icon, label } = bashLabel(command);
					out.push(`${icon} Bash ${label}`);
				} else {
					out.push(`→ ${name}${summarizeInput(name, c.input)}`);
				}
				for (const line of inputBodyLines(name, c.input)) out.push(line);
			}
		}
		return out;
	}

	if (entry.type === "user") {
		for (const c of content) {
			if (c.type !== "tool_result") continue;
			const { kind, detail } = summarizeResult(
				c.content ?? "",
				c.is_error ?? null,
			);
			const arrow = kind === "error" ? "← ✗" : kind === "info" ? "←" : "← ✓";
			const lines = detail.split("\n");
			out.push(`${arrow} ${lines[0] ?? ""}`);
			for (const line of lines.slice(1)) out.push(`  ${line}`);
		}
		return out;
	}

	return out;
}
