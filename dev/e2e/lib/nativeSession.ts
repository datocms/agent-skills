import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// Node tooling lives in dev/; skills and local evidence live at the repo root.
export const DEV_ROOT = resolve(import.meta.dirname, "../..");
export const REPO_ROOT = resolve(DEV_ROOT, "..");

export const MODEL = "gpt-6-luna";
export const COMPARISON_MODEL = "gpt-6-sol";
export const EFFORT = "medium";

// Only inspect runtime errors, never command output: an application API's 429
// is not evidence that the account's model usage allowance was exhausted.
export function isUsageLimitError(event: Record<string, any>): boolean {
  if (!["error", "turn.failed"].includes(event.type) && event.item?.type !== "error")
    return false;
  return /usage_limit_reached|insufficient_quota|(?:weekly|account|codex) usage limit|you(?:'|’)ve hit your usage limit/i.test(JSON.stringify(event));
}

function toml(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(toml).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .map(([k, v]) => `${JSON.stringify(k)}=${toml(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function hostSkills() {
  const files = new Set<string>(),
    visited = new Set<string>();
  function walk(path: string, depth = 0) {
    if (!existsSync(path) || depth > 4) return;
    const canonical = realpathSync(path);
    if (visited.has(canonical)) return;
    visited.add(canonical);
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (!existsSync(child) || !statSync(child).isDirectory()) continue;
      const skill = join(child, "SKILL.md");
      if (existsSync(skill)) {
        files.add(skill);
        files.add(realpathSync(skill));
      } else walk(child, depth + 1);
    }
  }
  [
    join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "skills"),
    join(homedir(), ".agents/skills"),
  ].forEach((p) => walk(p));
  return [...files].sort().map((path) => ({ path, enabled: false }));
}

export function sourceHashes(
  root: string,
  directory = "skills",
): Record<string, string> {
  const hashes: Record<string, string> = {};
  function walk(path: string, relative: string) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (["node_modules", ".git"].includes(entry.name)) continue;
      const name = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(join(path, entry.name), name);
      else if (entry.isFile())
        hashes[name] = createHash("sha256")
          .update(readFileSync(join(path, entry.name)))
          .digest("hex");
    }
  }
  if (existsSync(join(root, directory))) walk(join(root, directory), directory);
  return hashes;
}

// Capture the code loaded by this process, even if repository files change
// during a long suite. Skill hashes below come from the actual workspace copy.
const harnessHashesAtLoad = sourceHashes(DEV_ROOT, "e2e");

export type NativeOptions = {
  model?: typeof MODEL | typeof COMPARISON_MODEL;
  workspace: string;
  output: string;
  prompt: string;
  repoRoot: string;
  environment?: Record<string, string>;
  secrets?: string[];
  instructions?: string;
  timeoutMs?: number;
  maxCommands?: number;
  maxScriptAttempts?: number;
  hostedMcp?: { name: string; url: string };
  maxMcpCalls?: number;
};

export async function nativeSession(options: NativeOptions) {
  const { workspace, output, repoRoot } = options;
  const model = options.model ?? MODEL;
  if (![MODEL, COMPARISON_MODEL].includes(model))
    throw Error(`Unsupported evaluation model: ${model}`);
  mkdirSync(workspace, { recursive: true });
  mkdirSync(output, { recursive: true });
  const transcriptPath = join(output, "native.jsonl");
  if (existsSync(transcriptPath))
    throw Error(`Refusing to replace evidence: ${output}`);
  // A nested repository prevents discovery from walking into the host checkout.
  if (spawnSync("git", ["init", "-q", workspace]).status !== 0)
    throw Error("Cannot isolate workspace discovery");
  cpSync(join(repoRoot, "skills"), join(workspace, ".agents/skills"), {
    recursive: true,
    filter: (path) => !path.split(/[\\/]/).includes("node_modules"),
  });
  const secrets = (options.secrets ?? []).filter(Boolean);
  if (
    secrets.some(
      (secret) =>
        options.prompt.includes(secret) ||
        (options.instructions ?? "").includes(secret),
    )
  )
    throw Error("Credentials must not appear in agent prompts");
  const redact = (value: string) =>
    secrets.reduce(
      (text, secret) => text.replaceAll(secret, "[REDACTED]"),
      value,
    );
  const instructions = `Work only on the user's task in this isolated workspace. Do not read parent directories, evaluation code, assertions, other runs, or host credentials. Do not delegate. Never print environment variables or credentials, or store credential values in files. Use only the skills installed in this workspace; ignore host-installed copies. Do not publish packages, deploy websites, contact people, or change billing. ${options.instructions ?? ""}`;
  const config: Record<string, unknown> = {
    model,
    model_reasoning_effort: EFFORT,
    approval_policy: "never",
    project_doc_max_bytes: 0,
    web_search: "disabled",
    "skills.config": hostSkills(),
    "features.apps": false,
    "features.plugins": false,
    "features.memories": false,
    "memories.use_memories": false,
    "memories.generate_memories": false,
    "features.chronicle": false,
    "features.shell_snapshot": false,
    "features.shell_snapshot_v2": false,
    "features.multi_agent": false,
    "features.skill_search": false,
    "features.skill_mcp_dependency_install": false,
    "features.browser_use": false,
    "features.computer_use": false,
    "features.image_generation": false,
    "features.workspace_dependencies": false,
    "features.tool_suggest": false,
    "features.code_mode": false,
    "features.code_mode_host": true,
    "shell_environment_policy.inherit": "all",
    "shell_environment_policy.ignore_default_excludes": true,
    "shell_environment_policy.experimental_use_profile": false,
    developer_instructions: instructions,
  };
  if (options.hostedMcp) {
    const { name, url } = options.hostedMcp;
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name) || new URL(url).protocol !== "https:")
      throw Error("Hosted MCP requires a simple server name and HTTPS URL");
    config[`mcp_servers.${name}`] = {
      url,
      startup_timeout_sec: 60,
      tool_timeout_sec: 120,
      default_tools_approval_mode: "approve",
    };
  }
  const binary = process.env.CODEX_BIN ?? "codex";
  const version = spawnSync(binary, ["--version"], { encoding: "utf8" });
  if (version.status !== 0)
    throw Error("Selected native agent executable is unavailable");
  const args = [
    "exec",
    "--ignore-user-config",
    "--ignore-rules",
    "--ephemeral",
    "--skip-git-repo-check",
    "--sandbox",
    "danger-full-access",
    "--json",
    "--color",
    "never",
    "--cd",
    workspace,
  ];
  for (const [key, value] of Object.entries(config))
    args.push("-c", `${key}=${toml(value)}`);
  args.push("-");
  const environment: NodeJS.ProcessEnv = Object.fromEntries(
    [
      "HOME",
      "USER",
      "LOGNAME",
      "TMPDIR",
      "LANG",
      "CODEX_HOME",
      "XDG_CONFIG_HOME",
      "PATH",
    ]
      .filter((k) => process.env[k] !== undefined)
      .map((k) => [k, process.env[k]]),
  );
  Object.assign(environment, options.environment ?? {});
  const nativeHome = join(output, "native-home");
  mkdirSync(nativeHome, { recursive: true });
  const authPath = join(
    process.env.CODEX_HOME ?? join(homedir(), ".codex"),
    "auth.json",
  );
  if (existsSync(authPath))
    symlinkSync(authPath, join(nativeHome, "auth.json"));
  environment.CODEX_HOME = nativeHome;
  const provenance = {
    model,
    reasoningEffort: EFFORT,
    binaryVersion: version.stdout.trim(),
    revision: spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).stdout.trim(),
    skillHashes: Object.fromEntries(
      Object.entries(sourceHashes(workspace, ".agents/skills")).map(([path, digest]) => [path.replace(/^\.agents\//, ""), digest]),
    ),
    harnessHashes: harnessHashesAtLoad,
    runtimeFeatures: Object.fromEntries(Object.entries(config).filter(([key]) => key.startsWith("features."))),
    hostedMcp: options.hostedMcp ?? null,
    dependencyLockHash: existsSync(join(DEV_ROOT, "package-lock.json"))
      ? createHash("sha256")
          .update(readFileSync(join(DEV_ROOT, "package-lock.json")))
          .digest("hex")
      : null,
    budgets: {
      timeoutMs: options.timeoutMs ?? 420_000,
      maxCommands: options.maxCommands ?? 100,
      maxScriptAttempts: options.maxScriptAttempts ?? null,
      maxMcpCalls: options.maxMcpCalls ?? null,
    },
    startedAt: new Date().toISOString(),
    prompt: options.prompt,
    instructions,
  };
  writeFileSync(
    join(output, "provenance.json"),
    redact(JSON.stringify(provenance, null, 2)),
    { mode: 0o600 },
  );
  const child = spawn(binary, args, {
    cwd: workspace,
    env: environment,
    detached: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stdin.end(options.prompt);
  const events: Record<string, any>[] = [];
  const mcpCallIds = new Set<string>();
  let buffer = "",
    stderr = "",
    timedOut = false,
    capped = false,
    usageLimitReached = false,
    credentialLeak = false;
  const commands = new Map<
    string,
    {
      id: string;
      command: string;
      exit_code?: number;
      aggregated_output?: string;
    }
  >();
  function stop() {
    if (child.pid) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        /* already exited */
      }
    }
  }
  function line(raw: string) {
    if (secrets.some((secret) => raw.includes(secret))) credentialLeak = true;
    const clean = redact(raw);
    appendFileSync(transcriptPath, clean + "\n", { mode: 0o600 });
    let event;
    try {
      event = JSON.parse(clean);
    } catch {
      return;
    }
    events.push(event);
    if (isUsageLimitError(event)) {
      usageLimitReached = true;
      stop();
    }
    if (event.item?.type === "mcp_tool_call") {
      mcpCallIds.add(event.item.id);
      if (mcpCallIds.size > (options.maxMcpCalls ?? Infinity)) {
        capped = true;
        stop();
      }
    }
    if (event.item?.type === "command_execution") {
      commands.set(event.item.id, event.item);
      if (commands.size > (options.maxCommands ?? 100)) {
        capped = true;
        stop();
      }
      const scripts = [...commands.values()].filter((c) =>
        /\bdatocms\b[^\n]*\bcma:script\b/.test(c.command),
      ).length;
      if (scripts > (options.maxScriptAttempts ?? Infinity)) {
        capped = true;
        stop();
      }
    }
  }
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    let i;
    while ((i = buffer.indexOf("\n")) >= 0) {
      line(buffer.slice(0, i));
      buffer = buffer.slice(i + 1);
    }
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  const timer = setTimeout(() => {
    timedOut = true;
    stop();
  }, options.timeoutMs ?? 420_000);
  let exitCode: number | null;
  try {
    exitCode = await new Promise<number | null>((done, reject) => {
      child.on("error", reject);
      child.on("close", done);
    });
  } finally {
    clearTimeout(timer);
    rmSync(nativeHome, { recursive: true, force: true });
  }
  if (buffer) line(buffer);
  writeFileSync(join(output, "stderr.log"), redact(stderr), { mode: 0o600 });
  if (secrets.some((secret) => stderr.includes(secret))) credentialLeak = true;
  const result = {
    model,
    reasoningEffort: EFFORT,
    exitCode,
    timedOut,
    capped,
    usageLimitReached,
    credentialLeak,
    transcriptPath,
    commands: [...commands.values()],
    mcpCalls: events.filter((e) => e.type === "item.completed" && e.item?.type === "mcp_tool_call").map((e) => e.item),
    usage: events.filter((e) => e.usage).map((e) => e.usage),
    finalText:
      events
        .filter(
          (e) =>
            e.type === "item.completed" && e.item?.type === "agent_message",
        )
        .at(-1)?.item.text ?? "",
    completed: events.some((e) => e.type === "turn.completed"),
    errors: events.filter(
      (e) =>
        e.type === "error" ||
        e.type === "turn.failed" ||
        e.item?.type === "error",
    ),
  };
  writeFileSync(join(output, "session.json"), JSON.stringify(result, null, 2), {
    mode: 0o600,
  });
  return result;
}
