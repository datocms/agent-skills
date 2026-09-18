import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, delimiter, resolve, dirname } from "node:path";
import { nativeSession, MODEL } from "./nativeSession.js";
import { cliLauncherSource } from "./cliLauncher.js";
import {
  E2E_TRANSCRIPTS_ROOT,
  PROJECT_BIN,
  type RunAgentOptions,
  type RunAgentResult,
} from "./runAgent.js";

export async function runCodex(
  options: RunAgentOptions,
): Promise<RunAgentResult> {
  if (options.model && options.model !== MODEL)
    throw Error(`This evaluation track requires ${MODEL}`);
  const output = join(E2E_TRANSCRIPTS_ROOT, options.name);
  const workspace = mkdtempSync(join(tmpdir(), "dato-live-e2e-"));
  mkdirSync(join(workspace, "bin"));
  for (const [path, content] of Object.entries(options.files ?? {})) {
    const target = resolve(workspace, path);
    if (!target.startsWith(workspace + "/"))
      throw Error("Fixture path escapes workspace");
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  writeFileSync(
    join(workspace, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      devDependencies: { datocms: JSON.parse(requirePackage()).version },
    }),
  );
  symlinkSync(
    join(process.cwd(), "node_modules"),
    join(workspace, "node_modules"),
  );
  // The launcher fixes the sandbox scope without storing the credential value.
  writeFileSync(
    join(workspace, "bin/datocms"),
    cliLauncherSource(join(PROJECT_BIN, "datocms")),
    { mode: 0o700 },
  );
  try {
    const result = await nativeSession({
      repoRoot: process.cwd(),
      workspace,
      output,
      prompt: options.prompt,
      environment: {
        DATOCMS_API_TOKEN: options.apiToken,
        DATOCMS_ENVIRONMENT: options.environment ?? "main",
        PATH: `${join(workspace, "bin")}${delimiter}${PROJECT_BIN}${delimiter}${process.env.PATH ?? ""}`,
      },
      secrets: [options.apiToken],
      timeoutMs: options.timeoutMs ?? 420000,
      maxScriptAttempts: options.maxAttempts,
      instructions: `Only the confirmed disposable DatoCMS environment ${options.environment ?? "main"} may be changed. Use the installed datocms command for CMS access; it already supplies authentication and the environment. Do not inspect the launcher. Do not modify API tokens, roles, billing, environments, or other projects. Schema/content/settings changes requested in the task are authorized in this sandbox.`,
    });
    const toolCalls = result.commands.map((command) => ({
      name: "command_execution",
      id: command.id,
      input: { command: command.command },
    }));
    const attempts = result.commands.filter((command) =>
      /\bdatocms\b[^\n]*\bcma:script\b/.test(command.command),
    ).length;
    return {
      attempts,
      toolCalls,
      finalText: result.finalText,
      exitCode:
        result.exitCode === 0 &&
        result.completed &&
        !result.errors.length &&
        !result.credentialLeak
          ? 0
          : 1,
      terminatedByCap: result.timedOut || result.capped,
      transcriptPath: result.transcriptPath,
    };
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

import { readFileSync } from "node:fs";
function requirePackage() {
  return readFileSync(
    join(process.cwd(), "node_modules/datocms/package.json"),
    "utf8",
  );
}
