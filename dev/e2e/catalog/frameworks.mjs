import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { specifications } from "../frontend/specifications.mjs";

export const frameworkNames = {
  nextjs: "Next.js App Router",
  nuxt: "Nuxt",
  sveltekit: "SvelteKit",
  astro: "Astro",
};

export function configureFramework({ workspace, state }) {
  const spec = specifications[state.framework];
  const path = join(workspace, "package.json");
  const pkg = JSON.parse(readFileSync(path));
  pkg.scripts = spec.scripts;
  writeFileSync(path, JSON.stringify(pkg, null, 2));
  for (const [name, content] of Object.entries(spec.files)) {
    const target = join(workspace, name);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

export function configureEnvironment(state, secrets) {
  const env = state.environment;
  env.SIGNED_COOKIE_JWT_SECRET = crypto.randomUUID();
  secrets.push(env.SIGNED_COOKIE_JWT_SECRET);
  env.DRAFT_MODE_COOKIE_NAME = "datocms_preview";
  env.SITE_URL = state.origin;
  if (state.framework === "nuxt") {
    for (const key of [
      "SECRET_API_TOKEN",
      "SIGNED_COOKIE_JWT_SECRET",
      "DATOCMS_DRAFT_CONTENT_CDA_TOKEN",
    ])
      env[`NUXT_${key}`] = env[key];
    for (const key of [
      "DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN",
      "DATOCMS_BASE_EDITING_URL",
      "DATOCMS_ENVIRONMENT",
      "DRAFT_MODE_COOKIE_NAME",
      "SITE_URL",
    ])
      env[`NUXT_PUBLIC_${key}`] = env[key];
    env.NUXT_TELEMETRY_DISABLED = "1";
  }
  if (state.framework === "sveltekit") {
    for (const key of [
      "DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN",
      "DATOCMS_DRAFT_CONTENT_CDA_TOKEN",
      "SECRET_API_TOKEN",
      "SIGNED_COOKIE_JWT_SECRET",
      "DATOCMS_BASE_EDITING_URL",
      "DATOCMS_ENVIRONMENT",
    ])
      env[`PRIVATE_${key}`] = env[key];
    env.PUBLIC_DRAFT_MODE_COOKIE_NAME = env.DRAFT_MODE_COOKIE_NAME;
    env.PUBLIC_SITE_URL = state.origin;
  }
  return Object.keys(env).sort().join(", ");
}

export function startArguments(state) {
  const args = specifications[state.framework].start(state.port);
  return state.framework === "nextjs"
    ? [...args, "--hostname", "127.0.0.1"]
    : args;
}
