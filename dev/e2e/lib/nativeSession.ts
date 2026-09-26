import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

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

// Only an instruction keeps the actor away from evaluation state, so flag
// commands and edited paths that name it: the checkout (evaluation code,
// oracles, other runs), the run directory holding the workspace and evidence,
// files beside the workspace, or its parent (`cd ..`). Paths in the workspace,
// the actor's own HOME/XDG directories (regression cases keep them under
// oracle/, and npm prints logs there) and installed package files
// (node_modules may be a symlink into the checkout) are legitimate and removed
// first, unless a path climbs out with `/..`. Relative paths assume the
// workspace root: the tool-chosen working directory is not recorded.
// Heuristic, not a sandbox.
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Skill files the actor's commands name. Empty means no skill was consulted, so a failure says nothing about
// skill content: the agent never read it.
export function skillReads(commands: { command: string }[]): string[] {
  return [...new Set(commands.flatMap((c) => [...c.command.matchAll(/skills\/(datocms-[\w-]+(?:\/[\w./-]+)?)/g)].map((m) => m[1] as string)))].sort();
}

export function oracleAccess(
  commands: { command: string; turn?: number }[],
  { workspace, output, repoRoot, homes = [] }: { workspace: string; output: string; repoRoot: string; homes?: string[] },
) {
  const paths = (...list: string[]) =>
    new RegExp(
      [...new Set(list.flatMap((p) => [resolve(p), existsSync(p) ? realpathSync(p) : resolve(p)]))]
        .sort((a, b) => b.length - a.length)
        .map((p) => escape(p) + "(?![\\w.-]|/\\.\\.)")
        .join("|"),
      "g",
    );
  // The run directory holds the workspace and its evidence; catalog runs keep
  // session files in <run>/native. Homes containing either would hide them.
  const run = [output, dirname(output)].find((p) => resolve(p) === resolve(dirname(workspace)));
  const evidence = run ?? output;
  const own = homes.filter((home) => ![repoRoot, evidence].some((p) => `${resolve(p)}/`.startsWith(`${resolve(home)}/`)));
  const inside = paths(workspace, ...own), outside = paths(repoRoot, evidence);
  const files = "oracle|native-home|session\\.json|native\\.jsonl|provenance\\.json|result\\.json|snapshots\\.json";
  const beside = run && existsSync(run) ? readdirSync(run).filter((name) => name !== basename(workspace)).map(escape) : [];
  const harness = new RegExp(
    `(?:\\.\\./)+(?:${[files, ...beside].join("|")})(?![\\w.-])|\\.\\./(?:\\.\\./)+(?:[\\w.-]+/)+(?:${files})(?![\\w.-])` +
      `|(?:^|[\\s=(;&|])\\.\\./?(?=$|[\\s'"\`;&|)])|\\b(?:dev/e2e|dev/evals|evals/fixtures|evals/results)/|node_modules/\\.\\.(?![\\w.-])`,
  );
  return commands
    .filter(({ command }) => {
      const text = command
        .replace(inside, "")
        .replace(/[\w@.+~/-]*\/node_modules\/[\w@.+~/-]*/g, (path) => (path.includes("/..") ? path : ""));
      return text.search(outside) >= 0 || harness.test(text);
    })
    .map(({ turn, command }) => ({ turn: turn ?? 0, command }));
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
  // Later user messages, each sent by resuming the same native session after
  // the previous turn completes. onTurnComplete runs between turns (and after
  // the last), e.g. to snapshot the workspace a turn left behind.
  followUps?: string[];
  onTurnComplete?: (turn: number) => void | Promise<void>;
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
  const prompts = [options.prompt, ...(options.followUps ?? [])];
  if (
    secrets.some(
      (secret) =>
        prompts.some((prompt) => prompt.includes(secret)) ||
        (options.instructions ?? "").includes(secret),
    )
  )
    throw Error("Credentials must not appear in agent prompts");
  const redact = (value: string) =>
    secrets.reduce(
      (text, secret) => text.replaceAll(secret, "[REDACTED]"),
      value,
    );
  const instructions = `Work only on the user's task in this isolated workspace. Do not read parent directories, evaluation code, assertions, other runs, or host credentials. Project instructions such as AGENTS.md, if any, are inside this workspace; never search parent directories for them. Do not delegate. Never print environment variables or credentials, or store credential values in files. Use only the skills installed in this workspace; ignore host-installed copies. Do not publish packages, deploy websites, contact people, or change billing. ${options.instructions ?? ""}`;
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
  // Multi-turn sessions must persist (in the throwaway CODEX_HOME) so they can
  // be resumed; `exec resume` takes the sandbox as config and keeps the cwd.
  const multiTurn = prompts.length > 1;
  const overrides = Object.entries(config).flatMap(([key, value]) => [
    "-c",
    `${key}=${toml(value)}`,
  ]);
  const args = [
    "exec",
    "--ignore-user-config",
    "--ignore-rules",
    ...(multiTurn ? [] : ["--ephemeral"]),
    "--skip-git-repo-check",
    "--sandbox",
    "danger-full-access",
    "--json",
    "--color",
    "never",
    "--cd",
    workspace,
    ...overrides,
    "-",
  ];
  const resumeArgs = (thread: string) => [
    "exec",
    "resume",
    "--ignore-user-config",
    "--ignore-rules",
    "--skip-git-repo-check",
    "--json",
    ...overrides,
    "-c",
    'sandbox_mode="danger-full-access"',
    thread,
    "-",
  ];
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
  // The actor never gets the host HOME, where CLI logins live (DatoCMS, npm, git), unless the caller passes one.
  // Its login shells put a stub `open` first, so `datocms login` cannot pop up the operator's browser.
  const scratch = mkdtempSync(join(tmpdir(), "dato-native-"));
  const actorHome = join(scratch, "home");
  const nativeHome = join(scratch, "codex-home");
  const cleanupErrors: string[] = [];
  function recordCleanup(error: unknown, operation = "") {
    const code = (error as NodeJS.ErrnoException)?.code ?? "failed";
    const message = `cleanup: ${code}${operation ? ` (${operation})` : ""}`;
    if (!cleanupErrors.includes(message)) cleanupErrors.push(message);
  }
  function cleanupScratch() {
    // Remove the credential link even if another scratch entry cannot be removed.
    try {
      rmSync(join(nativeHome, "auth.json"), { force: true });
    } catch (error) {
      recordCleanup(error);
    }
    try {
      rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch (error) {
      recordCleanup(error);
    }
  }
  try {
    if (!options.environment?.HOME) {
      const stubs = join(actorHome, ".stub-bin");
      mkdirSync(stubs, { recursive: true });
      for (const dir of [".config", ".cache", ".local/share"]) mkdirSync(join(actorHome, dir), { recursive: true });
      for (const name of ["open", "xdg-open"])
        writeFileSync(join(stubs, name), "#!/bin/sh\necho 'Opening apps or browsers is disabled in this evaluation.' >&2\nexit 1\n", { mode: 0o755 });
      for (const rc of [".zprofile", ".bash_profile", ".profile"]) writeFileSync(join(actorHome, rc), `export PATH="${stubs}:$PATH"\n`);
      Object.assign(environment, {
        HOME: actorHome,
        XDG_CONFIG_HOME: join(actorHome, ".config"),
        XDG_CACHE_HOME: join(actorHome, ".cache"),
        XDG_DATA_HOME: join(actorHome, ".local/share"),
        PATH: `${stubs}:${environment.PATH ?? ""}`,
      });
    }
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
      followUps: options.followUps ?? [],
      instructions,
    };
    writeFileSync(
      join(output, "provenance.json"),
      redact(JSON.stringify(provenance, null, 2)),
      { mode: 0o600 },
    );
  } catch (error) {
    cleanupScratch();
    throw error;
  }
  const events: Record<string, any>[] = [];
  const mcpCallIds = new Set<string>();
  let stderr = "",
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
      turn: number;
    }
  >();
  // Paths the actor's edit tool touched, checked with the commands for oracle access.
  const edits = new Map<string, { command: string; turn: number }>();
  const turns: { finalText: string; messages: string[]; completed: boolean; exitCode: number | null }[] = [];
  const exitCodes: (number | null)[] = [];
  async function runTurn(turnArgs: string[], prompt: string) {
    const turnStart = events.length;
    const child = spawn(binary, turnArgs, {
      cwd: workspace,
      env: environment,
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.stdin.end(prompt);
    let buffer = "";
    let childExited = false;
    child.once("exit", () => {
      childExited = true;
      // Descendants can keep stdout/stderr open after the actor exits, so do
      // not wait for the streams' close event before terminating them.
      stop();
    });
    type ProcessInfo = { pid: number; ppid: number; pgid: number; started: string };
    const tracked = new Map<number, ProcessInfo>();
    let ownGroup: number | undefined;
    function snapshot() {
      // Remember identities before detached command shells are reparented. The
      // start time also prevents an old PID from identifying a later process.
      const listed = spawnSync("ps", ["-A", "-o", "pid=,ppid=,pgid=,lstart="], {
        encoding: "utf8",
        timeout: 2000,
      });
      if (listed.error || listed.status !== 0) {
        recordCleanup(listed.error, "process scan");
        return null;
      }
      const table = new Map<number, ProcessInfo>();
      for (const line of listed.stdout.split("\n")) {
        const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
        if (!match) continue;
        const info = { pid: Number(match[1]), ppid: Number(match[2]), pgid: Number(match[3]), started: match[4]! };
        table.set(info.pid, info);
      }
      ownGroup = table.get(process.pid)?.pgid;
      const roots = new Set<number>();
      for (const [pid, previous] of tracked) {
        const current = table.get(pid);
        if (current?.started === previous.started) roots.add(pid);
        else tracked.delete(pid);
      }
      if (!childExited && child.pid && table.has(child.pid)) roots.add(child.pid);
      let added = true;
      while (added) {
        added = false;
        for (const info of table.values()) {
          if (info.pid <= 1 || info.pid === process.pid || roots.has(info.pid)) continue;
          if (roots.has(info.ppid)) {
            roots.add(info.pid);
            added = true;
          }
        }
      }
      for (const pid of roots) tracked.set(pid, table.get(pid)!);
      return table;
    }
    function signal(pid: number) {
      if (Math.abs(pid) <= 1 || pid === process.pid || (pid < 0 && (ownGroup === undefined || -pid === ownGroup))) return;
      try {
        process.kill(pid, "SIGKILL");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") recordCleanup(error, "process signal");
      }
    }
    function stop() {
      const table = snapshot();
      if (table) {
        // Only signal a group while a recorded live member still belongs to it.
        // A historical pgid on its own may have been reused after its exit.
        const members = [...tracked.values()].filter((entry) => table.get(entry.pid)?.started === entry.started);
        const groups = new Set(members.map((entry) => entry.pgid));
        for (const pgid of groups) if (pgid !== child.pid) signal(-pgid);
        for (const entry of members) if (entry.pid !== child.pid) signal(entry.pid);
        if (child.pid && groups.has(child.pid)) signal(-child.pid);
      }
      // This direct child remains ours until its exit notification, including
      // when ps failed. Do not signal a stale child PID after normal completion.
      if (!childExited && child.pid) signal(child.pid);
      return table !== null;
    }
    function line(raw: string) {
      snapshot();
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
      if (event.item?.type === "file_change")
        for (const change of event.item.changes ?? [])
          edits.set(`${turns.length}:${event.item.id}:${change.path}`, { command: `${change.kind ?? "edit"} ${change.path}`, turn: turns.length });
      if (event.item?.type === "command_execution") {
        commands.set(`${turns.length}:${event.item.id}`, { ...event.item, turn: turns.length });
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
    snapshot();
    const processTimer = setInterval(snapshot, 250);
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
      clearInterval(processTimer);
      stop();
      // Finish reaping before the caller checks CMS state or starts another
      // turn. SIGKILL delivery itself does not wait for process termination.
      const deadline = Date.now() + 1000;
      while (tracked.size && Date.now() < deadline) {
        await new Promise((done) => setTimeout(done, 20));
        if (!stop()) break;
      }
      if (tracked.size) recordCleanup({ code: "PROCESS_REMAINS" }, "process reap");
    }
    if (buffer) line(buffer);
    const turnEvents = events.slice(turnStart);
    // Every message the user sees in this turn; plans often precede a short closing message.
    const messages = turnEvents
      .filter((e) => e.type === "item.completed" && e.item?.type === "agent_message")
      .map((e) => String(e.item.text ?? ""));
    turns.push({
      finalText: messages.at(-1) ?? "",
      messages,
      completed: turnEvents.some((e) => e.type === "turn.completed"),
      exitCode,
    });
    exitCodes.push(exitCode);
  }
  let thread: string | undefined;
  try {
    for (const [index, prompt] of prompts.entries()) {
      if (index > 0) {
        thread ??= events.find((e) => e.type === "thread.started")?.thread_id;
        if (!thread) throw Error("Cannot resume: the native session reported no thread id");
      }
      await runTurn(index === 0 ? args : resumeArgs(thread!), prompt);
      const turn = turns.at(-1)!;
      await options.onTurnComplete?.(index);
      if (timedOut || capped || usageLimitReached || credentialLeak || !turn.completed || turn.exitCode !== 0) break;
    }
  } finally {
    cleanupScratch();
  }
  const exitCode = exitCodes.find((code) => code !== 0) ?? exitCodes.at(-1) ?? null;
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
    // REPO_ROOT, not options.repoRoot (a skills tree): evaluation code and evidence live here.
    oracleAccess: oracleAccess([...commands.values(), ...edits.values()], {
      workspace,
      output,
      repoRoot: REPO_ROOT,
      homes: ["HOME", "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME", "NPM_CONFIG_PREFIX"].flatMap((key) => environment[key] ?? []),
    }),
    transcriptPath,
    skillReads: skillReads([...commands.values()]),
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
    turns,
    threadId: thread ?? events.find((e) => e.type === "thread.started")?.thread_id ?? null,
    completed: turns.length === prompts.length && turns.every((t) => t.completed),
    errors: [...events.filter(
      (e) =>
        e.type === "error" ||
        e.type === "turn.failed" ||
        e.item?.type === "error",
    ), ...cleanupErrors.map((message) => ({ type: "error", message }))],
  };
  writeFileSync(join(output, "session.json"), JSON.stringify(result, null, 2), {
    mode: 0o600,
  });
  return result;
}
