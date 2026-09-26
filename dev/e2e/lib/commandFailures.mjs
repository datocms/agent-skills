export function classifyCommandFailure(command, exitCode, output = "") {
  if (!Number.isInteger(exitCode)) return "failure";
  if (
    exitCode === 1 &&
    /(^|&&|;|\|\||\(|lc ["'])\s*(rg|grep)\b/.test(command) &&
    !/error|ERR_|Exception/i.test(output)
  ) return "search-no-match";
  if (/\bdatocms (whoami|projects:list)\b/.test(command) && /Not logged in/.test(output))
    return "auth-probe";
  return "failure";
}

function executesDeliverable(command) {
  // Recognize executable command tokens, not mentions in file-inspection
  // commands. Inline evaluation and version/help probes are not proof that
  // the actor ran its deliverable. This remains a diagnostic, not a grade.
  const candidates = command.matchAll(/(?:^|&&|;|\|\||\(|lc ["'])\s*((?:npm|pnpm|yarn|bun|npx|tsc|node|tsx)\b[^;&|\n]*)/g);
  for (const match of candidates) {
    const words = match[1].trim().split(/\s+/).map((word) => word.replace(/^["']|["']$/g, ""));
    let executable = words.shift();
    if (executable === "npx") {
      while (["--yes", "-y", "--no-install", "--"].includes(words[0])) words.shift();
      executable = words.shift();
    }
    if (words.some((word) => ["--version", "-v", "--help", "-h"].includes(word))) continue;
    if (["npm", "pnpm", "yarn", "bun"].includes(executable)) {
      while (["--prefix", "--dir", "-C"].includes(words[0])) words.splice(0, 2);
      if (words[0] === "run") words.shift();
      if (/^(?:build|test|start|dev|typecheck|check)(?::[\w-]+)*$/.test(words[0] ?? "")) return true;
    }
    if (executable === "tsc" && !words.some((word) => /^--(?:showConfig|listFilesOnly)(?:=|$)/i.test(word))) return true;
    if (["node", "tsx"].includes(executable)) {
      if (words[0] === "--test") return true;
      if (words[0] === "--check") words.shift();
      if (/^[^-].*\.(?:[cm]?[jt]sx?)$/.test(words[0] ?? "")) return true;
    }
  }
  return false;
}

export function summarizeCommandExecution(commands) {
  const commandFailures = commands
    .filter((command) => command.exit_code !== 0)
    .map((command) => ({
      id: command.id ?? null,
      exit_code: command.exit_code ?? null,
      kind: classifyCommandFailure(command.command, command.exit_code, command.aggregated_output ?? ""),
      excerpt: String(command.aggregated_output ?? "").slice(0, 500),
    }));
  return {
    commandFailures,
    executedDeliverable: commands.some((command) => executesDeliverable(command.command)),
    commandsPassExcludingProbes: commandFailures.every((failure) => failure.kind !== "failure"),
  };
}
