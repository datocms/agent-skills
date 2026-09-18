import assert from "node:assert/strict";
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  symlinkSync,
  cpSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { buildClient } from "@datocms/dashboard-client";
import { buildClient as buildCmaClient } from "@datocms/cma-client-node";
import { readCredentials } from "@datocms/cli-utils";
import {
  createTestProject,
  destroyTestProject,
} from "../lib/createTestProject.ts";
import { nativeSession, sourceHashes } from "../lib/nativeSession.ts";
import { cliLauncherSource } from "../lib/cliLauncher.ts";
import { replayVisualApplication } from "./replay.mjs";

const root = resolve(import.meta.dirname, "../..");
const { values } = parseArgs({
  options: {
    site: { type: "string" },
    organization: { type: "string" },
    case: { type: "string" },
    variant: { type: "string" },
    recheck: { type: "string" },
    output: { type: "string" },
  },
});
assert.match(
  values.site ?? "",
  /^\d+$/,
  "Pass the explicitly authorized throwaway site ID",
);
assert.ok(
  ["cda", "migration", "import", "visual-editing"].includes(values.case),
  "Choose one catalog workflow",
);
assert.ok(
  !values.recheck || values.case === "visual-editing",
  "Live recheck currently supports visual-editing only",
);
const output = resolve(
  values.output ??
    join(
      root,
      "local/catalog-live",
      new Date().toISOString().replace(/[:.]/g, "-"),
    ),
);
assert.ok(!existsSync(output), "Use a fresh evidence directory");
mkdirSync(output, { recursive: true, mode: 0o700 });
const workspace = join(output, "workspace");
mkdirSync(workspace, { recursive: true });
let project, token, scenario, rootClient, baseline;
const secrets = [];
const save = (name, value) =>
  writeFileSync(
    join(output, name),
    secrets.reduce(
      (s, secret) => s.replaceAll(secret, "[REDACTED]"),
      typeof value === "string" ? value : JSON.stringify(value, null, 2),
    ),
    { mode: 0o600 },
  );
const result = {
  scenario: values.case,
  status: "pending",
  siteId: values.site,
  cleanup: "not-needed",
};
result.phase = "authentication";
async function primarySnapshot(client) {
  const [site, models, uploads, environments, tokens] = await Promise.all([
    client.site.find(),
    client.itemTypes.list(),
    client.uploads.list({ page: { limit: 100 } }),
    client.environments.list(),
    client.accessTokens.list(),
  ]);
  return {
    siteId: site.id,
    locales: site.locales,
    models: models.map((m) => m.id).sort(),
    uploads: uploads.map((u) => u.id).sort(),
    environments: environments
      .map((e) => ({ id: e.id, primary: e.meta.primary }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    tokens: tokens.map((t) => t.id).sort(),
  };
}
try {
  token = process.env.E2E_DATOCMS_API_TOKEN;
  if (!token) {
    const credentials = await readCredentials();
    assert.ok(
      credentials,
      "DatoCMS CLI login required; no model session started",
    );
    secrets.push(credentials.apiToken);
    const site = await buildClient({
      apiToken: credentials.apiToken,
      ...(values.organization ? { organization: values.organization } : {}),
      ...(credentials.dashboardBaseUrl
        ? { baseUrl: credentials.dashboardBaseUrl }
        : {}),
    }).sites.find(values.site);
    token = site.access_token;
  }
  assert.ok(token, "Authorized project token unavailable");
  secrets.push(token);
  rootClient = buildCmaClient({ apiToken: token });
  baseline = await primarySnapshot(rootClient);
  assert.equal(baseline.siteId, values.site);
  assert.equal(
    baseline.models.length,
    0,
    "Use an empty disposable primary schema",
  );
  assert.equal(
    baseline.uploads.length,
    0,
    "Use an empty disposable primary upload collection",
  );
  save("primary-before.json", baseline);
  process.env.E2E_DATOCMS_API_TOKEN = token;
  process.env.E2E_DATOCMS_SITE_ID = values.site;
  scenario = await import(`./${values.case}.mjs`);
  result.phase = "fixture";
  project = await createTestProject();
  result.environment = project.environment;
  result.cleanup = "pending";
  save("checkpoint.json", result);
  const state = await scenario.prepare({
    variant: values.variant,
    project,
    workspace,
    output,
    save,
    secrets,
  });
  save("checkpoint.json", {
    ...result,
    ownedTokenIds: project.catalogTokenIds ?? [],
  });
  const environment = {
    DATOCMS_API_TOKEN: token,
    DATOCMS_ENVIRONMENT: project.environment,
  };
  if (scenario.transport === "cda") {
    // Only the separately minted read-only delivery token enters the web actor.
    delete environment.DATOCMS_API_TOKEN;
    Object.assign(environment, state.environment);
    cpSync(
      join(import.meta.dirname, "web/package.json"),
      join(workspace, "package.json"),
    );
    cpSync(
      join(import.meta.dirname, "web/package-lock.json"),
      join(workspace, "package-lock.json"),
    );
    symlinkSync(
      join(import.meta.dirname, "web/node_modules"),
      join(workspace, "node_modules"),
    );
  } else {
    const pkg = JSON.parse(readFileSync(join(root, "package.json")));
    writeFileSync(
      join(workspace, "package.json"),
      JSON.stringify({
        name: "catalog-workflow",
        private: true,
        type: "module",
        devDependencies: {
          datocms: pkg.devDependencies.datocms,
          "@datocms/cma-client-node":
            pkg.devDependencies["@datocms/cma-client-node"],
        },
      }),
    );
    symlinkSync(join(root, "node_modules"), join(workspace, "node_modules"));
    writeFileSync(
      join(workspace, "datocms.config.json"),
      JSON.stringify({
        profiles: { default: { migrations: { directory: "migrations" } } },
      }),
    );
    mkdirSync(join(workspace, "bin"));
    writeFileSync(
      join(workspace, "bin/datocms"),
      cliLauncherSource(join(root, "node_modules/datocms/bin/run")),
      { mode: 0o700 },
    );
    environment.PATH = `${join(workspace, "bin")}:${process.env.PATH}`;
  }
  await scenario.configure?.({ workspace, state });
  if (values.recheck) {
    replayVisualApplication({
      previous: values.recheck,
      workspace,
      project,
      state,
      save,
    });
    result.replayedFrom = resolve(values.recheck);
    result.phase = "independent-check";
    result.checks = await scenario.check({
      project,
      state,
      workspace,
      output,
      save,
      environment,
    });
    result.status = "passed";
  } else {
    result.phase = "actor";
    const session = await nativeSession({
      repoRoot: root,
      workspace,
      output: join(output, "native"),
      environment,
      secrets,
      timeoutMs: 600000,
      maxCommands: 65,
      instructions: `The only authorized project is ${values.site}, disposable sandbox ${project.environment}. Never write to primary or other environments, change account permissions, promote environments, or create/delete environments. Authentication is already provided.`,
      prompt: scenario.prompt({ project, state }),
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
      process.exitCode = 2;
    } else {
      assert.ok(
        session.completed &&
          !session.credentialLeak &&
          !session.timedOut &&
          !session.capped,
        "Actor did not complete safely",
      );
      result.phase = "independent-check";
      result.checks = await scenario.check({
        project,
        state,
        workspace,
        output,
        save,
        environment,
      });
      result.status = "passed";
    }
  }
} catch (error) {
  result.status = "failed";
  result.error = String(error.stack ?? error);
  process.exitCode = 1;
} finally {
  if (project) {
    try {
      try {
        await scenario?.cleanup?.({ project });
      } finally {
        await destroyTestProject(project);
      }
      const after = await primarySnapshot(rootClient);
      save("primary-after.json", after);
      assert.deepEqual(
        after,
        baseline,
        "Primary state or owned resource cleanup changed",
      );
      result.cleanup = "verified";
    } catch (error) {
      result.cleanup = "failed";
      result.cleanupError = String(error);
      process.exitCode = 1;
    }
  }
  result.harnessHashes = sourceHashes(root, "e2e/catalog");
  save("result.json", result);
  console.log(
    JSON.stringify({ output, status: result.status, cleanup: result.cleanup }),
  );
}
