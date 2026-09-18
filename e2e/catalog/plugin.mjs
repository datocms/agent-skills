import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { nativeSession, sourceHashes } from "../lib/nativeSession.ts";

const root = resolve(import.meta.dirname, "../..");
const { values } = parseArgs({
  options: { output: { type: "string" }, recheck: { type: "string" } },
});
const output = resolve(
  values.output ??
    join(
      root,
      "local/catalog-plugin",
      new Date().toISOString().replace(/[:.]/g, "-"),
    ),
);
assert.ok(!existsSync(output), "Use a fresh evidence directory");
mkdirSync(output, { recursive: true });
const workspace = values.recheck
  ? resolve(values.recheck)
  : join(output, "workspace");
const fixture = join(import.meta.dirname, "plugin");
const save = (name, data) =>
  writeFileSync(
    join(output, name),
    typeof data === "string" ? data : JSON.stringify(data, null, 2),
  );
let result = {
  scenario: "plugin-localized-field-editor",
  status: "pending",
  browserHost: "local SDK protocol fixture",
  workspace,
};
try {
  if (!values.recheck) {
    mkdirSync(join(workspace, "src"), { recursive: true });
    const pkg = JSON.parse(readFileSync(join(fixture, "package.json")));
    pkg.name = "datocms-plugin-title-editor";
    pkg.scripts = { build: "tsc --noEmit && vite build" };
    pkg.datoCmsPlugin = {
      title: "Title editor",
      entryPoint: "dist/index.html",
      permissions: [],
    };
    writeFileSync(
      join(workspace, "package.json"),
      JSON.stringify(pkg, null, 2),
    );
    cpSync(
      join(fixture, "package-lock.json"),
      join(workspace, "package-lock.json"),
    );
    symlinkSync(join(fixture, "node_modules"), join(workspace, "node_modules"));
    writeFileSync(
      join(workspace, "index.html"),
      '<!doctype html><html><head><title>Title editor</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
    );
    writeFileSync(
      join(workspace, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ["src"],
      }),
    );
    writeFileSync(
      join(workspace, "vite.config.ts"),
      "import {defineConfig} from 'vite';export default defineConfig({base:'./'});\n",
    );
    const session = await nativeSession({
      repoRoot: root,
      workspace,
      output: join(output, "native"),
      timeoutMs: 420000,
      maxCommands: 45,
      prompt:
        'Finish this private DatoCMS title-editor plugin. Add an opt-in manual editor named "Title editor", ID "title-editor", for string fields. Use the installed SDK and DatoCMS UI. It should show a labelled text input for the current field and a live character count; edits must update the current field through the host. It must work for localized fields and fields inside nested blocks, refresh when the host sends new values, treat a missing value as an empty string, and prevent editing when the host marks the field disabled. Keep the host theme and automatic iframe sizing working. Complete the existing scaffold and verify the production build. No CMS installation or publishing is requested.',
    });
    result.session = {
      completed: session.completed,
      usageLimitReached: session.usageLimitReached,
      timedOut: session.timedOut,
      capped: session.capped,
      errors: session.errors,
    };
    result.strictPass =
      session.completed &&
      session.exitCode === 0 &&
      !session.errors.length &&
      session.commands.every((c) => c.exit_code === 0);
    if (session.usageLimitReached) {
      result.status = "paused-usage-limit";
      save("result.json", result);
      process.exitCode = 2;
    } else {
      assert.ok(
        session.completed &&
          !session.credentialLeak &&
          !session.timedOut &&
          !session.capped,
        "Actor did not complete safely",
      );
    }
  }
  if (result.status !== "paused-usage-limit") {
    const built = spawnSync("npm", ["run", "build"], {
      cwd: workspace,
      encoding: "utf8",
      timeout: 120000,
    });
    save("build.log", (built.stdout ?? "") + (built.stderr ?? ""));
    assert.equal(built.status, 0, "Production build failed");
    const { checkPlugin } = await import("./plugin-check.mjs");
    result.checks = await checkPlugin(workspace, output);
    result.status = "passed";
  }
} catch (error) {
  result.status = "failed";
  result.error = String(error.stack ?? error);
  process.exitCode = 1;
} finally {
  result.oracleHashes = sourceHashes(root, "e2e/catalog");
  save("result.json", result);
  console.log(
    JSON.stringify({ output, status: result.status, error: result.error }),
  );
}
