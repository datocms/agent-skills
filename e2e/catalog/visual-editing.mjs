import assert from "node:assert/strict";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { serializeRawItem } from "@datocms/rest-client-utils";
import { chromium } from "./plugin/node_modules/playwright/index.mjs";
import * as cda from "./cda.mjs";
import { checkEmbeddedPreview } from "./preview-host.mjs";
import { checkHostedVisual } from "./hosted-visual.mjs";
import {
  configureFramework,
  configureEnvironment,
  frameworkNames,
  startArguments,
} from "./frameworks.mjs";

export const transport = "cda";
export async function cleanup({ project }) {
  try {
    for (const id of project.catalogPluginIds ?? [])
      await project.cmaClient.plugins.destroy(id);
  } finally {
    await cda.cleanup({ project });
  }
}
export async function prepare(options) {
  const editingBase = process.env.E2E_DATOCMS_EDITING_BASE;
  assert.ok(
    editingBase && new URL(editingBase).hostname.endsWith(".admin.datocms.com"),
    "Set E2E_DATOCMS_EDITING_BASE to the authorized project admin URL",
  );
  const state = await cda.prepare(options);
  state.framework = options.framework ?? "nextjs";
  state.hostedEditor = options.hostedEditor ?? false;
  const reservation = createServer();
  await new Promise((r) => reservation.listen(0, "127.0.0.1", r));
  state.port = reservation.address().port;
  await new Promise((r) => reservation.close(r));
  // NextURL canonicalizes loopback IPs to localhost. Keep cookie hosts stable
  // when an implementation constructs an absolute redirect from request.url.
  state.origin = `http://localhost:${state.port}`;
  state.environment.SECRET_API_TOKEN = randomUUID();
  options.secrets.push(state.environment.SECRET_API_TOKEN);
  state.environment.DATOCMS_BASE_EDITING_URL = new URL(editingBase).origin;
  state.environment.NEXT_PUBLIC_SITE_URL = state.origin;
  state.environment.NEXT_TELEMETRY_DISABLED = "1";
  state.environmentKeys = configureEnvironment(state, options.secrets);
  return state;
}
export const configure = configureFramework;
export function prompt({ project, state }) {
  return `Set up full DatoCMS visual editing in this existing ${frameworkNames[state.framework]} app: website click-to-edit, embedded Web Previews navigation, and real-time draft updates are all wanted, for one frontend. Add /articles/[slug] using catalog_article and render its English title as h1; schema is described in SCHEMA.md. Published visitors must see published content, while authorized draft mode uses drafts and Content Link metadata. Implement /api/draft-mode/enable (token and redirect query parameters), /api/draft-mode/disable (redirect), and /api/preview-links (standard Web Previews POST with item and locale, token query parameter). Map the catalog_article model ${state.records[0].item_type.id} to /articles/<slug>. Environment ${project.environment}, published/draft read-only CDA tokens, SECRET_API_TOKEN, DATOCMS_BASE_EDITING_URL and the site URL are already provided through environment variables (available names: ${state.environmentKeys}). Use the configured environment for all queries and subscriptions. Enable click-to-edit in preview, synchronize iframe navigation, and ${state.framework === "astro" ? "automatically refresh draft content when the CMS changes using the framework-supported approach" : "update draft content without a page reload when the CMS changes"}. Verify the production build. Scope is application setup and the handoff URLs; no CMS plugin installation, deployment, primary writes or package publishing is requested.`;
}
export async function check({
  project,
  state,
  workspace,
  output,
  save,
  environment,
}) {
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    ...environment,
    PORT: String(state.port),
    HOST: "127.0.0.1",
    HOSTNAME: "127.0.0.1",
    ORIGIN: state.origin,
  };
  const built = spawnSync("npm", ["run", "build"], {
    cwd: workspace,
    env,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 5 * 1024 * 1024,
  });
  save("build.log", (built.stdout ?? "") + (built.stderr ?? ""));
  assert.equal(built.status, 0, "Visual-editing production build failed");
  const server = spawn(process.execPath, startArguments(state), {
    cwd: workspace,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let serverLog = "";
  server.stdout.on("data", (b) => {
    serverLog += b;
  });
  server.stderr.on("data", (b) => {
    serverLog += b;
  });
  let browser, page;
  const checks = [],
    errors = [];
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        // Only /articles/[slug] is required by the task. A root-page 404
        // still proves the listener is ready; actual routes are checked below.
        await fetch(state.origin);
        ready = true;
        break;
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    assert.ok(ready, "Production server did not start");
    browser = await chromium.launch({
      channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
      headless: true,
    });
    const context = await browser.newContext();
    page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    // Capture the real click-to-edit destination without navigating to the CMS.
    await page.addInitScript(() => {
      window.editDestinations = [];
      window.open = (url) => {
        window.editDestinations.push(String(url));
        return null;
      };
      window.originalDocument = crypto.randomUUID();
      window.subscriptionUpdates = 0;
      const OriginalEventSource = window.EventSource;
      window.EventSource = class extends OriginalEventSource {
        constructor(url, options) {
          super(url, options);
          this.addEventListener("update", () => window.subscriptionUpdates++);
        }
      };
    });
    await page.goto(`${state.origin}/articles/article-0`);
    assert.equal(
      await page.locator("h1").innerText(),
      `English 0 ${state.marker}`,
    );
    assert.ok(
      !(await page.content()).includes(
        state.environment.DATOCMS_DRAFT_CONTENT_CDA_TOKEN,
      ),
      "Draft token exposed on public page",
    );
    const denied = await context.request.get(
      `${state.origin}/api/draft-mode/enable?token=invalid&redirect=/articles/article-0`,
      { maxRedirects: 0 },
    );
    assert.ok([400, 401, 403].includes(denied.status()));
    const unsafe = await context.request.get(
      `${state.origin}/api/draft-mode/enable?token=${state.environment.SECRET_API_TOKEN}&redirect=https://example.invalid`,
      { maxRedirects: 0 },
    );
    assert.ok(
      unsafe.status() >= 400 && unsafe.status() < 500,
      `Unsafe redirect was not rejected: HTTP ${unsafe.status()}`,
    );
    checks.push("public content and authentication/redirect boundaries");
    const [rawItem, rawModel] = await Promise.all([
      project.cmaClient.items.rawFind(state.records[0].id),
      project.cmaClient.itemTypes.rawFind(state.records[0].item_type.id),
    ]);
    const previewRequest = {
      // The SDK adds __itemTypeId locally; the editor's wire item lacks it.
      item: serializeRawItem(rawItem.data),
      itemType: rawModel.data,
      siteId: project.siteId,
      environmentId: project.environment,
      locale: "en",
    };
    assert.ok(!Object.hasOwn(previewRequest.item, "__itemTypeId"));
    save("preview-request.json", previewRequest);
    const previews = await context.request.post(
      `${state.origin}/api/preview-links?token=${state.environment.SECRET_API_TOKEN}`,
      { data: previewRequest },
    );
    assert.equal(previews.status(), 200);
    const links = (await previews.json()).previewLinks;
    assert.ok(
      links.some(
        (link) => new URL(link.url).pathname === "/api/draft-mode/enable",
      ),
      "Missing draft preview handoff",
    );
    const draftUrl = links.find(
      (link) => new URL(link.url).pathname === "/api/draft-mode/enable",
    ).url;
    await page.goto(draftUrl);
    // Content Link may retain invisible stega metadata in the text node.
    await page
      .getByRole("heading", { level: 1 })
      .filter({ hasText: `Draft English ${state.marker}` })
      .waitFor();
    checks.push("real preview handoff opens draft content in browser");
    await page.waitForFunction(
      () =>
        document
          .querySelector("h1")
          ?.closest(
            "[data-datocms-auto-content-link-url],[data-datocms-content-link-url]",
          ),
      {},
      { timeout: 15000 },
    );
    await page.locator("h1").hover();
    await page.locator("h1").click();
    await page.waitForFunction(
      () => window.editDestinations.length > 0,
      {},
      { timeout: 15000 },
    );
    const destination = await page.evaluate(() =>
      window.editDestinations.at(-1),
    );
    const editUrl = new URL(destination);
    assert.equal(editUrl.origin, state.environment.DATOCMS_BASE_EDITING_URL);
    assert.equal(
      editUrl.pathname,
      `/environments/${project.environment}/editor/item_types/${state.records[0].item_type.id}/items/${state.records[0].id}/edit`,
    );
    assert.equal(
      new URLSearchParams(editUrl.hash.slice(1)).get("fieldPath"),
      "title.en",
    );
    checks.push(
      "browser click-to-edit resolves the exact environment, record and localized title field",
    );
    const openedCount = await page.evaluate(
      () => window.editDestinations.length,
    );
    await page.keyboard.down("Alt");
    await page.locator("h1").click();
    assert.equal(
      await page.evaluate(() => window.editDestinations.length),
      openedCount,
      "Alt should temporarily disable persistent click-to-edit",
    );
    await page.keyboard.up("Alt");
    await page.locator("h1").click();
    await page.waitForFunction(
      (count) => window.editDestinations.length === count + 1,
      openedCount,
    );
    checks.push(
      "Alt temporarily disables persistent editing and release restores it",
    );
    const documentId = await page.evaluate(() => window.originalDocument);
    // Astro's QueryListener uses the first event as its baseline. Mutating
    // before that event races subscription startup and can hide a real update.
    await page.waitForFunction(
      () => window.subscriptionUpdates > 0,
      {},
      { timeout: 45000 },
    );
    const liveTitle = `Live edit ${state.marker}`;
    await project.cmaClient.items.update(state.records[0].id, {
      title: { en: liveTitle, it: `Bozza ${state.marker}` },
    });
    await page
      .getByRole("heading", { level: 1 })
      .filter({ hasText: liveTitle })
      .waitFor({ timeout: 90000 });
    if (state.framework !== "astro") {
      assert.equal(
        await page.evaluate(() => window.originalDocument),
        documentId,
        "Live update reloaded the document",
      );
    }
    checks.push(
      state.framework === "astro"
        ? "real CMS edit automatically refreshes the Astro preview"
        : "real CMS edit reaches the browser without reload",
    );
    await page.screenshot({ path: join(output, "visual-editing.png") });
    checks.push(
      await checkEmbeddedPreview({ context, state, destination, save }),
    );
    await page.goto(
      `${state.origin}/api/draft-mode/disable?redirect=/articles/article-0`,
    );
    assert.equal(
      await page.locator("h1").innerText(),
      `English 0 ${state.marker}`,
    );
    checks.push("leaving preview restores unchanged published content");
    assert.deepEqual(errors, [], "Browser runtime errors");
    if (state.hostedEditor)
      checks.push(
        ...(await checkHostedVisual({ project, state, save, output })),
      );
    save("browser.json", {
      checks,
      errors,
      destination,
      hostedEditorVisited: state.hostedEditor,
    });
    return checks;
  } finally {
    if (page)
      save("browser-checkpoint.json", {
        checks,
        errors,
        url: page.url(),
        visibleText: await page
          .locator("body")
          .innerText()
          .catch(() => ""),
        heading: await page
          .locator("h1")
          .evaluateAll((elements) =>
            elements.map((element) => element.outerHTML),
          )
          .catch(() => []),
        editDestinations: await page
          .evaluate(() => window.editDestinations ?? [])
          .catch(() => []),
        subscriptionUpdates: await page
          .evaluate(() => window.subscriptionUpdates)
          .catch(() => null),
      });
    await browser?.close();
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
    save("server.log", serverLog);
  }
}
