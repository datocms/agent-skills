// Source of the `datocms` command put first on the actor's PATH. It binds the commands that
// reach a project to the evaluation environment: `--environment` / `-e` is added when missing and
// rejected when it names another one.
//
// With `skillsRoot`, `datocms agents:reference <skill> <name>` prints that reference from the
// skill tree under test. The real command downloads it from the default branch of the skills
// repository, so an actor sent there by a `cma:script` error would read the published version
// of the file instead of the one being evaluated.
export function cliLauncherSource(cliBinary: string, skillsRoot?: string): string {
  return `#!${process.execPath}
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
const args = process.argv.slice(2);
const skillsRoot = ${JSON.stringify(skillsRoot ?? null)};
const name = /^[a-z0-9-]+$/;
if (skillsRoot && args[0] === "agents:reference" && name.test(args[1] ?? "") && name.test(args[2] ?? "")) {
  let body;
  try {
    body = readFileSync(skillsRoot + "/" + args[1] + "/references/" + args[2] + ".md", "utf8");
  } catch {
    console.error('Reference "' + args[2] + '" not found in skill "' + args[1] + '"');
    process.exit(2);
  }
  process.stdout.write(body.endsWith("\\n") ? body : body + "\\n");
  process.exit(0);
}
if (["cma:call", "cma:script", "schema:inspect", "schema:generate"].includes(args[0])) {
  const expected = process.env.DATOCMS_ENVIRONMENT;
  let named = false;
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    let value;
    if (arg === "--environment" || arg === "-e") value = args[i + 1];
    else if (arg.startsWith("--environment=")) value = arg.slice("--environment=".length);
    else if (/^-e./.test(arg)) value = arg.slice(2).replace(/^=/, "");
    else continue;
    named = true;
    if (value !== expected) throw Error("Wrong evaluation environment");
  }
  if (!named) args.push("--environment", expected);
}
const result = spawnSync(${JSON.stringify(process.execPath)}, [${JSON.stringify(cliBinary)}, ...args], { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
`;
}
