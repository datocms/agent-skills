import { spawn } from "node:child_process";
import {
	appendFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { cp } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { cliLauncherSource } from "./cliLauncher.js";
import {
	DEV_ROOT,
	REPO_ROOT,
	oracleAccess,
	skillReads,
} from "./nativeSession.js";
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

/**
 * Hosts a case may reach: the DatoCMS APIs, its asset CDN and the storage that receives uploads. Everything else is
 * refused by the sandbox proxy, so an actor cannot fetch another CLI or send what it reads anywhere else.
 */
const ALLOWED_HOSTS = (
	process.env.E2E_ALLOWED_HOSTS ??
	"site-api.datocms.com,graphql.datocms.com,www.datocms-assets.com,*.datocms-assets.com,*.amazonaws.com,*.r2.cloudflarestorage.com"
)
	.split(",")
	.map((host) => host.trim())
	.filter(Boolean);

/**
 * Settings passed to the actor's session with --settings (a settings file in its folder would be the actor's to
 * edit, and Claude Code ignores the allow rules of a folder nobody trusted). An actor with a shell and free rein reads whatever it finds: in a probe
 * with a failing CLI, actors listed the operator's home directory and printed a credentials file from it. So Bash
 * runs in Claude Code's sandbox, the home directory is unreadable and unwritable apart from this checkout's
 * `node_modules` (the CLI lives there), the node installation and the CLI's own data folder (`cma:script` keeps its
 * lock and its script workspace there, and waits two minutes for the lock before failing when it cannot write it;
 * credentials live elsewhere), and nothing may leave the sandbox to retry. The write tools are allowed in the
 * temporary folder only: a deny rule on the home directory would also take the data folder away from the shell.
 * One Unix socket folder is open: `cma:script` runs its script through tsx, which listens on a pipe under the
 * temporary folder, and with sockets blocked every script that passes type-checking dies on `listen EPERM`.
 * `dev/e2e/routing/claude-tasks.mjs` carries the same settings for its own actors: change the two together.
 */
export function cliDataDir(home = homedir()): string {
	if (process.platform === "darwin") return join(home, "Library/Application Support/datocms-cli");
	return join(process.env.XDG_DATA_HOME ?? join(home, ".local/share"), "datocms-cli");
}

export function actorSettings(home = homedir()): Record<string, unknown> {
	const nodeRoot = resolve(dirname(process.execPath), "..");
	const dataDir = cliDataDir(home);
	const temporary = [...new Set([tmpdir(), realpathSync(tmpdir())])];
	// tsx names its pipe `<tmpdir>/tsx-<uid>/<pid>.pipe`; inside the sandbox the temporary folder is /tmp/claude-<uid>.
	const uid = process.getuid?.() ?? 0;
	const tsxPipes = [...new Set([tmpdir(), `/tmp/claude-${uid}`, `/private/tmp/claude-${uid}`])].map((folder) => join(folder, `tsx-${uid}`));
	return {
		sandbox: {
			enabled: true,
			failIfUnavailable: true,
			allowUnsandboxedCommands: false,
			autoAllowBashIfSandboxed: true,
			filesystem: {
				denyRead: ["~"],
				allowRead: [".", join(DEV_ROOT, "node_modules"), dataDir, ...(nodeRoot.startsWith(`${home}/`) ? [nodeRoot] : [])],
				// The shell writes in its own folder and here, nowhere else.
				allowWrite: [dataDir],
				// Its own settings and skills: an actor must not be able to loosen what confines it.
				denyWrite: ["./.claude"],
			},
			network: { allowedDomains: ALLOWED_HOSTS, allowUnixSockets: tsxPipes },
		},
		permissions: {
			defaultMode: "dontAsk",
			allow: ["Bash", "Glob", "Grep", "Skill", ...temporary.map((folder) => `Edit(/${folder}/**)`)],
			deny: ["Read(~/**)", "Edit(/.claude/**)", "Write(/.claude/**)"],
		},
	};
}

// Same budget as the Codex adapter, so the two tracks stop a run at the same point.
const DEFAULT_TIMEOUT_MS = 420 * 1000;
export const CLAUDE_MODEL = "claude-sonnet-5-5";
const REDACTED = "[REDACTED_SECRET]";

type CommandRecord = {
	id: string;
	type: string;
	command: string;
	aggregated_output: string;
	exit_code: number | null;
};

/** The text a tool call names: what `skillReads` and `oracleAccess` search for paths. */
function commandText(call: ToolCallRecord): string {
	const input = (call.input ?? {}) as Record<string, unknown>;
	const text = (key: string) => (typeof input[key] === "string" ? (input[key] as string) : "");
	if (call.name === "Bash") return text("command");
	if (call.name === "Skill") return `skills/${text("skill").replace(/^.*:/, "")}/SKILL.md`;
	if (call.name === "Read" || call.name === "Write" || call.name === "Edit") return text("file_path");
	return [text("path"), text("pattern"), text("glob")].filter(Boolean).join(" ");
}

function isCmaScriptInvocation(call: ToolCallRecord): boolean {
	return call.name === "Bash" && /\bdatocms\b[^\n]*\bcma:script\b/.test(commandText(call));
}

function resultText(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.map((part) => (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? (part as { text: string }).text : ""))
		.join("");
}

/**
 * Runs one case with Claude Code (`claude -p`) as the actor. `E2E_MODEL` picks
 * the model (`claude-sonnet-5-5`, `claude-haiku-5-5`, or an alias).
 *
 * The session runs in a temporary workspace outside the checkout that holds
 * only this checkout's skills (as project skills), the case's files and a
 * `datocms` launcher bound to the evaluation environment. User settings are
 * not loaded (`--setting-sources project`), so plugins and skills installed
 * for the operator do not reach the actor. Authentication is the operator's
 * own `claude` login.
 */
export async function runClaude(
	options: RunAgentOptions,
): Promise<RunAgentResult> {
	const slug = options.name.replace(/[^a-z0-9-]+/gi, "-");
	const output = join(E2E_TRANSCRIPTS_ROOT, slug);
	mkdirSync(output, { recursive: true });
	const transcriptPath = join(output, "raw.jsonl");
	rmSync(transcriptPath, { force: true });

	const workspace = mkdtempSync(join(tmpdir(), "dato-live-e2e-"));
	mkdirSync(join(workspace, "bin"));
	for (const [path, content] of Object.entries(options.files ?? {})) {
		const target = resolve(workspace, path);
		if (!target.startsWith(`${workspace}/`)) throw Error("Fixture path escapes workspace");
		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, content);
	}
	const cliVersion = JSON.parse(readFileSync(join(DEV_ROOT, "node_modules/datocms/package.json"), "utf8")).version;
	writeFileSync(
		join(workspace, "package.json"),
		JSON.stringify({ private: true, type: "module", devDependencies: { datocms: cliVersion } }),
	);
	symlinkSync(join(DEV_ROOT, "node_modules"), join(workspace, "node_modules"));
	// The launcher fixes the sandbox scope without storing the credential value.
	writeFileSync(
		join(workspace, "bin/datocms"),
		cliLauncherSource(join(PROJECT_BIN, "datocms"), join(workspace, ".claude/skills")),
		{ mode: 0o700 },
	);
	await cp(SKILLS_SOURCE, join(workspace, ".claude/skills"), { recursive: true });
	if (workspace.startsWith(`${homedir()}/`)) throw Error("The temporary folder is under the home directory: the sandbox could not tell them apart");
	// The sandbox grants a folder that exists; the CLI would create it on first use anyway.
	mkdirSync(cliDataDir(), { recursive: true });

	const environment = options.environment ?? "main";
	const model = options.model ?? process.env.E2E_MODEL ?? CLAUDE_MODEL;
	const instructions = `Only the confirmed disposable DatoCMS environment ${environment} may be changed. Use the installed datocms command for CMS access; it already supplies authentication and the environment. Do not inspect the launcher. Do not modify API tokens, roles, billing, environments, or other projects. Schema/content/settings changes requested in the task are authorized in this sandbox.`;
	const args = [
		"-p",
		options.prompt,
		"--append-system-prompt",
		instructions,
		// Only the workspace's own configuration: no operator plugins, skills or memory.
		"--setting-sources",
		"project",
		"--strict-mcp-config",
		"--mcp-config",
		JSON.stringify({ mcpServers: {} }),
		"--tools",
		"Bash,Read,Glob,Grep,Skill,Write,Edit",
		"--permission-mode",
		"dontAsk",
		"--settings",
		JSON.stringify(actorSettings()),
		"--output-format",
		"stream-json",
		"--verbose",
		"--no-session-persistence",
		"--model",
		model,
	];

	// The actor's environment is a short allow-list: the harness's credentials and whatever tokens the operator's
	// shell exports stay out of it.
	const inherited = Object.fromEntries(
		Object.entries(process.env).filter(([key]) => /^(HOME|USER|LOGNAME|SHELL|TERM|TMPDIR|LANG|LC_[A-Z_]+|TZ)$/.test(key)),
	);
	const child = spawn("claude", args, {
		cwd: workspace,
		stdio: ["ignore", "pipe", "pipe"],
		env: {
			...inherited,
			DATOCMS_API_TOKEN: options.apiToken,
			DATOCMS_ENVIRONMENT: environment,
			// The datocms CLI keeps the operator's linked plugins in its data directory: give the actor an empty one.
			XDG_DATA_HOME: join(workspace, ".data"),
			npm_config_cache: join(workspace, ".npm"),
			// Node ignores the sandbox proxy unless told to use it; without this every CLI request fails.
			NODE_USE_ENV_PROXY: "1",
			PATH: `${join(workspace, "bin")}${delimiter}${PROJECT_BIN}${delimiter}${process.env.PATH ?? ""}`,
		},
	});

	const toolCalls: ToolCallRecord[] = [];
	const commands = new Map<string, CommandRecord>();
	const usage: Record<string, unknown>[] = [];
	const errors: string[] = [];
	let finalText: string | undefined;
	let completed = false;
	let terminatedByCap = false;
	let timedOut = false;
	let credentialLeak = false;
	let stdoutBuffer = "";
	let stderrBuffer = "";

	const timeout = setTimeout(() => {
		terminatedByCap = true;
		timedOut = true;
		child.kill("SIGKILL");
	}, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

	function handleLine(rawLine: string): void {
		if (!rawLine) return;
		if (rawLine.includes(options.apiToken)) credentialLeak = true;
		const line = rawLine.split(options.apiToken).join(REDACTED);
		appendFileSync(transcriptPath, `${line}\n`);

		let event: Record<string, any>;
		try {
			event = JSON.parse(line);
		} catch {
			return;
		}
		if (!event || typeof event !== "object") return;

		if (event.type === "assistant") {
			for (const block of event.message?.content ?? []) {
				if (block.type !== "tool_use") continue;
				const id = String(block.id);
				if (commands.has(id)) continue;
				const record: ToolCallRecord = { id, name: String(block.name), input: block.input };
				toolCalls.push(record);
				commands.set(id, { id, type: record.name, command: commandText(record), aggregated_output: "", exit_code: null });
				if (isCmaScriptInvocation(record) && toolCalls.filter(isCmaScriptInvocation).length > options.maxAttempts) {
					terminatedByCap = true;
					child.kill("SIGKILL");
				}
			}
		} else if (event.type === "user") {
			for (const block of Array.isArray(event.message?.content) ? event.message.content : []) {
				if (block.type !== "tool_result") continue;
				const command = commands.get(String(block.tool_use_id));
				if (!command) continue;
				command.aggregated_output = resultText(block.content);
				command.exit_code = block.is_error ? 1 : 0;
			}
		} else if (event.type === "result") {
			if (typeof event.result === "string") finalText = event.result;
			completed = event.subtype === "success" && !event.is_error;
			if (!completed) errors.push(String(event.subtype ?? "error"));
			const u = event.usage ?? {};
			const cached = Number(u.cache_read_input_tokens ?? 0);
			usage.push({
				// The Codex record's shape: input_tokens counts every prompt token, cached ones included.
				input_tokens: Number(u.input_tokens ?? 0) + Number(u.cache_creation_input_tokens ?? 0) + cached,
				cached_input_tokens: cached,
				output_tokens: Number(u.output_tokens ?? 0),
				total_cost_usd: event.total_cost_usd,
				num_turns: event.num_turns,
				duration_ms: event.duration_ms,
			});
		}
	}

	child.stdout.on("data", (chunk: Buffer) => {
		stdoutBuffer += chunk.toString("utf8");
		let newlineIndex = stdoutBuffer.indexOf("\n");
		while (newlineIndex !== -1) {
			handleLine(stdoutBuffer.slice(0, newlineIndex));
			stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
			newlineIndex = stdoutBuffer.indexOf("\n");
		}
	});
	child.stderr.on("data", (chunk: Buffer) => {
		stderrBuffer += chunk.toString("utf8");
	});

	let exitCode: number | null;
	try {
		exitCode = await new Promise<number | null>((done, fail) => {
			child.on("error", fail);
			child.on("exit", (code) => done(code));
		});
	} finally {
		clearTimeout(timeout);
	}
	if (stdoutBuffer) handleLine(stdoutBuffer);
	const stderr = stderrBuffer.split(options.apiToken).join(REDACTED);
	if (stderr) writeFileSync(join(output, "stderr.log"), stderr);

	await simplifyTranscript(transcriptPath, join(output, "transcript.simplified.log")).catch((err) => {
		// Non-fatal: the raw transcript is still on disk for inspection.
		console.warn(`[simplifyTranscript] failed: ${(err as Error).message}`);
	});

	const commandList = [...commands.values()];
	const flagged = oracleAccess(commandList, { workspace, output, repoRoot: REPO_ROOT });
	writeFileSync(
		join(output, "session.json"),
		`${JSON.stringify(
			{
				agent: "claude",
				model,
				exitCode,
				stderr: stderr.slice(-2000),
				timedOut,
				capped: terminatedByCap && !timedOut,
				credentialLeak,
				oracleAccess: flagged,
				transcriptPath,
				skillReads: skillReads(commandList),
				commands: commandList,
				usage,
				finalText,
				completed,
				errors,
			},
			null,
			2,
		)}\n`,
	);
	rmSync(workspace, { recursive: true, force: true });

	return {
		attempts: toolCalls.filter(isCmaScriptInvocation).length,
		toolCalls,
		finalText,
		exitCode: exitCode === 0 && completed && !credentialLeak ? 0 : 1,
		oracleAccess: flagged.map((access) => access.command),
		terminatedByCap,
		transcriptPath,
	};
}
