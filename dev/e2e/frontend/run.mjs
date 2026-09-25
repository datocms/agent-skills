import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { parseArgs } from "node:util";
import assert from "node:assert/strict";
import { nativeSession, MODEL, EFFORT, REPO_ROOT } from "../lib/nativeSession.ts";
import { specifications } from "./specifications.mjs";

const root = resolve(import.meta.dirname, "../..");
const { values } = parseArgs({
  options: {
    frameworks: { type: "string", default: "nextjs,nuxt,astro,sveltekit" },
    output: { type: "string" },
    repetitions: { type: "string", default: "1" },
    recheck: { type: "string" },
    "skills-root": { type: "string" },
    skill: { type: "string" },
  },
});
const repetitions = Number(values.repetitions);
if (!Number.isInteger(repetitions) || repetitions < 1)
  throw Error("repetitions must be a positive integer");
const output = resolve(
  values.output ??
    join(
      root,
      "local/frontend",
      new Date().toISOString().replace(/[:.]/g, "-"),
    ),
);
if (existsSync(join(output, "results.json")))
  throw Error("Output already contains results");
mkdirSync(output, { recursive: true });
const frameworks = values.frameworks.split(",");

const previewSecret = "preview +/&?= secret";
const environment = {
  ...process.env,
  SECRET_API_TOKEN: previewSecret,
  PRIVATE_SECRET_API_TOKEN: previewSecret,
  NUXT_SECRET_API_TOKEN: previewSecret,
  SIGNED_COOKIE_JWT_SECRET: "synthetic-signing-key-for-e2e-only-123456789",
  PRIVATE_SIGNED_COOKIE_JWT_SECRET:
    "synthetic-signing-key-for-e2e-only-123456789",
  NUXT_SIGNED_COOKIE_JWT_SECRET: "synthetic-signing-key-for-e2e-only-123456789",
  DATOCMS_DRAFT_CONTENT_CDA_TOKEN: "synthetic-draft-token",
  PRIVATE_DATOCMS_DRAFT_CONTENT_CDA_TOKEN: "synthetic-draft-token",
  NUXT_DATOCMS_DRAFT_CONTENT_CDA_TOKEN: "synthetic-draft-token",
  DRAFT_MODE_COOKIE_NAME: "datocms_preview",
  PUBLIC_DRAFT_MODE_COOKIE_NAME: "datocms_preview",
  NEXT_TELEMETRY_DISABLED: "1",
  NUXT_TELEMETRY_DISABLED: "1",
};
// Live CMA credentials never enter framework fixtures or generated applications.
delete environment.E2E_DATOCMS_API_TOKEN;
delete environment.DATOCMS_API_TOKEN;
const save = (path, value) => {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(
    path,
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
};
function command(args, cwd, log, env = environment, timeout = 240000) {
  const r = spawnSync(args[0], args.slice(1), {
    cwd,
    env,
    encoding: "utf8",
    timeout,
    maxBuffer: 20 * 1024 * 1024,
  });
  save(log, (r.stdout ?? "") + (r.stderr ?? ""));
  assert.equal(r.status, 0, `${args.join(" ")} failed; ${log}`);
}
async function freePort() {
  const s = createServer();
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const port = s.address().port;
  await new Promise((r) => s.close(r));
  return port;
}
async function start(workspace, spec, env, log) {
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, spec.start(port), {
    cwd: workspace,
    env: {
      ...env,
      PORT: String(port),
      HOST: "127.0.0.1",
      HOSTNAME: "127.0.0.1",
      ORIGIN: origin,
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let text = "";
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (chunk) => {
      text += chunk;
      save(log, text);
    });
  const stop = () => {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {}
  };
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(origin);
      return { origin, stop };
    } catch {}
    if (child.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  stop();
  const error = Error(`Application did not start; ${log}`);
  error.startupOutput = text;
  error.startupExitCode = child.exitCode;
  throw error;
}
async function assertApplication(workspace, framework, spec, directory) {
  const observations = [];
  const enabledCookieNames = new Set();
  async function exercise(env, label) {
    const server = await start(
      workspace,
      spec,
      env,
      join(directory, `server-${label}.log`),
    );
    const param = framework === "nuxt" ? "url" : "redirect";
    async function request(path, token, target) {
      const url = new URL(path, server.origin);
      if (token !== null) url.searchParams.set("token", token);
      if (target !== undefined) url.searchParams.set(param, target);
      const response = await fetch(url, { redirect: "manual" });
      observations.push({
        label,
        path,
        target,
        token:
          token === null
            ? "absent"
            : token === previewSecret
              ? "valid"
              : "invalid",
        status: response.status,
        location: response.headers.get("location"),
        cookie: response.headers.get("set-cookie"),
      });
      return response;
    }
    try {
      if (label === "missing-secret") {
        for (const token of [null, "", "wrong", previewSecret]) {
          const r = await request("/api/draft-mode/enable", token, "/article");
          assert.equal(r.headers.has("set-cookie"), false);
          assert.equal(r.headers.has("location"), false);
          if (framework === "astro" && r.status === 500) {
            const log = readFileSync(
              join(directory, `server-${label}.log`),
              "utf8",
            );
            assert.match(log, /EnvInvalidVariables/);
            assert.match(log, /SECRET_API_TOKEN is missing/);
          } else assert.equal(r.status, 401);
        }
        return;
      }
      for (const token of [null, "", "wrong"]) {
        const r = await request("/api/draft-mode/enable", token, "/article");
        assert.equal(r.status, 401);
        assert.equal(r.headers.has("set-cookie"), false);
      }
      for (const target of [
        "//attacker.example/path",
        "https://attacker.example",
        "/\\attacker.example",
        " /article",
        "/\n/attacker.example",
      ]) {
        for (const path of [
          "/api/draft-mode/enable",
          "/api/draft-mode/disable",
        ]) {
          const r = await request(path, previewSecret, target);
          assert.ok(
            r.status >= 400 && r.status < 500,
            `Unsafe destination accepted: ${JSON.stringify(target)}`,
          );
          assert.equal(r.headers.has("set-cookie"), false);
        }
      }
      for (const target of ["/", "/article?x=a%20b&next=%2Fpath#section"]) {
        const r = await request(
          "/api/draft-mode/enable",
          previewSecret,
          target,
        );
        assert.ok([302, 303, 307, 308].includes(r.status));
        assert.equal(
          new URL(r.headers.get("location"), server.origin).href,
          new URL(target, server.origin).href,
        );
        const cookie = r.headers.get("set-cookie");
        assert.ok(cookie, "Enable must set a cookie");
        for (const header of r.headers.getSetCookie())
          enabledCookieNames.add(header.slice(0, header.indexOf("=")));
        for (const flag of [
          /;\s*Secure/i,
          /;\s*SameSite=None/i,
          /;\s*Partitioned/i,
        ])
          assert.match(cookie, flag, "Embedded preview cookie flag missing");
      }
      const disabled = await request("/api/draft-mode/disable", null, "/");
      assert.ok([302, 303, 307, 308].includes(disabled.status));
      assert.ok(
        disabled.headers.get("set-cookie"),
        "Disable must clear cookie",
      );
      for (const name of enabledCookieNames) {
        const cleared = disabled.headers
          .getSetCookie()
          .find((header) => header.startsWith(`${name}=`));
        assert.ok(cleared, `Disable must clear ${name}`);
        const age = /;\s*Max-Age=(-?\d+)/i.exec(cleared);
        const expires = /;\s*Expires=([^;]+)/i.exec(cleared);
        const value = cleared.slice(name.length + 1).split(";")[0];
        assert.ok(
          value === "" ||
            (age
              ? Number(age[1]) <= 0
              : expires && Date.parse(expires[1]) < Date.now()),
          `Disable must empty or expire ${name}`,
        );
      }
    } finally {
      server.stop();
      save(join(directory, "http-observations.json"), observations);
    }
  }
  await exercise(environment, "configured");
  const missing = { ...environment };
  for (const key of [
    "SECRET_API_TOKEN",
    "PRIVATE_SECRET_API_TOKEN",
    "NUXT_SECRET_API_TOKEN",
  ])
    delete missing[key];
  try {
    await exercise(missing, "missing-secret");
  } catch (error) {
    // A schema-validated server may refuse startup. An unrelated crash is not a pass.
    if (
      framework !== "astro" ||
      !error.startupExitCode ||
      !/SECRET_API_TOKEN/.test(error.startupOutput ?? "") ||
      !/missing|invalid|required/i.test(error.startupOutput ?? "")
    )
      throw error;
    observations.push({ label: "missing-secret", startupRejected: true });
    save(join(directory, "http-observations.json"), observations);
  }
  return observations.length;
}
if (frameworks.some((name) => !specifications[name]))
  throw Error("Unknown framework selection");
const results = [];
suite: for (let repetition = 1; repetition <= repetitions; repetition++)
  for (const framework of frameworks) {
    const spec = specifications[framework];
    if (!spec) throw Error(`Unknown framework ${framework}`);
    const directory = join(output, `${framework}-${repetition}`),
      workspace = values.recheck
        ? join(
            resolve(values.recheck),
            `${framework}-${repetition}`,
            "workspace",
          )
        : join(directory, "workspace");
    mkdirSync(directory, { recursive: true });
    mkdirSync(workspace, { recursive: true });
    const result = {
      case: `preview-${framework}`,
      repetition,
      model: MODEL,
      reasoningEffort: EFFORT,
      passed: false,
    };
    try {
      if (!values.recheck) {
        for (const [path, content] of Object.entries(spec.files))
          save(join(workspace, path), content);
        save(join(workspace, "package.json"), {
          name: `preview-${framework}`,
          private: true,
          type: "module",
          scripts: spec.scripts,
          dependencies: spec.dependencies,
          devDependencies: {
            typescript: "5.9.3",
            "@types/node": "24.10.1",
            "@types/react": "19.2.2",
          },
        });
        command(
          ["npm", "install", "--no-audit", "--no-fund"],
          workspace,
          join(directory, "install.log"),
        );
        const secretName =
          framework === "nuxt"
            ? "NUXT_SECRET_API_TOKEN"
            : framework === "sveltekit"
              ? "PRIVATE_SECRET_API_TOKEN"
              : "SECRET_API_TOKEN";
        const prefix =
          framework === "sveltekit"
            ? "PRIVATE_"
            : framework === "nuxt"
              ? "NUXT_"
              : "";
        const param = framework === "nuxt" ? "url" : "redirect";
        const prompt = `${values.skill ? `$${values.skill} ` : ""}Add working DatoCMS draft-mode enable and disable routes to this existing ${framework} app at /api/draft-mode/enable and /api/draft-mode/disable. The enable link uses query parameters token and ${param}. Enable preview with a valid secret and redirect back to the requested local page; disabling preview needs no secret. Keep complete query strings and fragments intact. Use this framework's standard server-side draft/session mechanism, and make preview cookies work in an embedded editor. Runtime supplies ${secretName}, ${prefix}SIGNED_COOKIE_JWT_SECRET, and ${prefix}DATOCMS_DRAFT_CONTENT_CDA_TOKEN. Use datocms_preview as the cookie name where a custom cookie is needed. Do not fetch CMS content or add visual editing or realtime features. Install any required dependencies and confirm the application builds. This is a local application; no deployment or CMS connection is needed.`;
        const started = Date.now();
        const session = await nativeSession({
          repoRoot: values["skills-root"] ? resolve(values["skills-root"]) : REPO_ROOT,
          workspace,
          output: directory,
          prompt,
          timeoutMs: 600000,
        });
        result.elapsedMs = Date.now() - started;
        result.usage = session.usage;
        result.commandCount = session.commands.length;
        result.usageLimitReached = session.usageLimitReached;
        result.agentCompleted =
          session.completed &&
          session.exitCode === 0 &&
          !session.errors.length &&
          !session.timedOut;
        assert.ok(result.agentCompleted, "Agent did not complete");
      } else {
        const original = JSON.parse(
          readFileSync(
            join(
              resolve(values.recheck),
              `${framework}-${repetition}`,
              "session.json",
            ),
            "utf8",
          ),
        );
        assert.ok(
          original.completed &&
            original.exitCode === 0 &&
            !original.errors.length &&
            !original.timedOut &&
            !original.capped,
          "Original native session did not complete",
        );
        assert.equal(original.model, MODEL);
        assert.equal(original.reasoningEffort, EFFORT);
        result.recheckedFrom = resolve(values.recheck);
      }
      command(["npm", "run", "build"], workspace, join(directory, "build.log"));
      result.assertions = await assertApplication(
        workspace,
        framework,
        spec,
        directory,
      );
      result.passed = true;
    } catch (error) {
      result.error = String(error);
    }
    results.push(result);
    save(join(directory, "result.json"), result);
    save(join(output, "results.json"), results);
    console.log(
      `${result.passed ? "PASS" : "FAIL"} ${result.case}/${repetition}${result.error ? ": " + result.error : ""}`,
    );
    if (result.usageLimitReached) break suite;
  }
if (results.some((r) => r.usageLimitReached)) process.exitCode = 2;
else if (results.some((r) => !r.passed)) process.exitCode = 1;
