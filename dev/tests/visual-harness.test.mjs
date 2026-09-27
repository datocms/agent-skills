import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import * as previewHost from "../e2e/catalog/preview-host.mjs";

const moduleUrl = new URL("../e2e/catalog/visual-transport.mjs", import.meta.url);
const transport = existsSync(moduleUrl) ? await import(moduleUrl.href) : {};
function helper(name) {
  assert.equal(typeof transport[name], "function", `${name} must be exported`);
  return transport[name];
}

test("visual transport defaults to a random local port", () => {
  assert.deepEqual(helper("resolveVisualTransport")({}), { port: 0, publicOrigin: undefined });
});

test("visual public transport requires paired variables and a valid integer port", () => {
  const resolve = helper("resolveVisualTransport");
  for (const env of [{ E2E_VISUAL_SERVER_PORT: "43001" }, { E2E_VISUAL_PUBLIC_ORIGIN: "https://a.example" }]) assert.throws(() => resolve(env), /together/);
  for (const port of ["0", "65536", "43001x", " 43001"]) assert.throws(() => resolve({ E2E_VISUAL_SERVER_PORT: port, E2E_VISUAL_PUBLIC_ORIGIN: "https://a.example" }), /1 to 65535/);
});

test("visual public origins must be HTTPS origins without credentials or URL suffixes", () => {
  const resolve = helper("resolveVisualTransport");
  for (const origin of ["http://a.example", "https://u:p@a.example", "https://a.example/x", "https://a.example/?q=1", "https://a.example/#h", "not a url"]) assert.throws(() => resolve({ E2E_VISUAL_SERVER_PORT: "43001", E2E_VISUAL_PUBLIC_ORIGIN: origin }), /HTTPS origin/);
  assert.deepEqual(resolve({ E2E_VISUAL_SERVER_PORT: "43001", E2E_VISUAL_PUBLIC_ORIGIN: "https://a.example/" }), { port: 43001, publicOrigin: "https://a.example" });
});

test("embedded preview enters draft mode within the iframe cookie partition", () => {
  assert.equal(typeof previewHost.embeddedDraftEntry, "function");
  assert.equal(previewHost.embeddedDraftEntry("https://x.example", "s3cret"), "https://x.example/api/draft-mode/enable?redirect=%2Farticles%2Farticle-0&token=s3cret");
  const escaped = new URL(previewHost.embeddedDraftEntry("https://x.example", "a&b ?=#"));
  assert.equal(escaped.searchParams.get("token"), "a&b ?=#");
  assert.equal(escaped.searchParams.get("redirect"), "/articles/article-0");
  const source = readFileSync(new URL("../e2e/catalog/preview-host.mjs", import.meta.url), "utf8");
  assert.match(source, /embeddedDraftEntry\(\s*state\.origin,\s*state\.environment\.SECRET_API_TOKEN/);
  assert.doesNotMatch(source, /state\.origin \+ "\/articles\/article-0"/);
});

test("draft handoffs accept relative redirects and reject a proxy's bind-host origin", () => {
  const check = helper("assertSameOriginRedirect");
  assert.doesNotThrow(() => check("307", "/articles/a", "https://x.example/api/draft-mode/enable?x", "https://x.example"));
  assert.doesNotThrow(() => check(303, "https://x.example/articles/a?locale=en", "https://x.example/api/draft-mode/enable", "https://x.example"));
  assert.throws(() => check(307, "https://localhost:43011/articles/a?token=hidden", "https://x.example/api/draft-mode/enable", "https://x.example"), error => {
    assert.match(error.message, /off-origin: https:\/\/localhost:43011/);
    assert.doesNotMatch(error.message, /hidden/);
    return true;
  });
  assert.throws(() => check(200, undefined, "https://x.example/api/draft-mode/enable", "https://x.example"));
  assert.throws(() => check(307, "http://[", "https://x.example/api/draft-mode/enable", "https://x.example"));
});

test("draft handoff diagnostic uses the cookie-free helper before browser navigation", () => {
  const source = readFileSync(new URL("../e2e/catalog/visual-editing.mjs", import.meta.url), "utf8");
  assert.match(source, /await requestDraftHandoff\(draftUrl\)/);
  assert.doesNotMatch(source, /context\.request\.get\(draftUrl/);
  assert.ok(source.indexOf("await requestDraftHandoff(draftUrl)") < source.indexOf("await page.goto(draftUrl)"));
});

const browserRuntime = new URL("../e2e/catalog/plugin/node_modules/playwright/index.mjs", import.meta.url);
test("draft handoff diagnostic preserves partitioned-cookie disable behavior", { skip: !existsSync(browserRuntime) && "Playwright fixture is absent" }, async t => {
  const probe = helper("requestDraftHandoff");
  const { chromium } = await import(browserRuntime.href);
  const name = "synthetic_visual_draft";
  const attributes = "Path=/; HttpOnly; Secure; SameSite=None; Partitioned";
  const requests = [], blocked = [];
  const server = createServer((request, response) => {
    requests.push(request.url);
    if (request.url === "/enable" || request.url === "/disable") {
      response.setHeader("set-cookie", request.url === "/enable"
        ? `${name}=enabled; ${attributes}`
        : `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ${attributes}`);
      response.writeHead(307, { location: "/article" });
      response.end();
      return;
    }
    const draft = (request.headers.cookie ?? "").split(";").some(cookie => cookie.trim() === `${name}=enabled`);
    response.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" });
    response.end(`<!doctype html><html><head><link rel="icon" href="data:,"></head><body><h1>${draft ? "Draft" : "Published"}</h1></body></html>`);
  });
  let browser, context;
  try {
    await new Promise((done, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", done); });
    const origin = `http://localhost:${server.address().port}`;
    try { browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome", headless: true, timeout: 30000 }); }
    catch (error) {
      if (/executable.*doesn.t exist|distribution.*not found|executablePath.*doesn.t exist/i.test(error.message)) { t.skip("Chrome is not installed"); return; }
      throw error;
    }
    context = await browser.newContext();
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin === origin) return route.continue();
      blocked.push(url.origin);
      return route.abort();
    });
    assert.deepEqual(await probe(origin + "/enable"), { status: 307, locationHeader: "/article" });
    assert.deepEqual(requests, ["/enable"], "the diagnostic must not follow the redirect");
    assert.deepEqual(await context.cookies(), [], "the diagnostic must leave the browser cookie jar untouched");
    const page = await context.newPage();
    await page.goto(origin + "/enable", { timeout: 10000 });
    assert.equal(await page.locator("h1").innerText(), "Draft");
    const enabled = await context.cookies();
    assert.equal(enabled.length, 1);
    assert.equal(enabled[0].partitionKey, "http://localhost", "the browser must establish the real cookie partition");
    await page.goto(origin + "/disable", { timeout: 10000 });
    assert.equal(await page.locator("h1").innerText(), "Published");
    assert.deepEqual(await context.cookies(), []);
    assert.deepEqual(blocked, []);
  } finally {
    try { await context?.close(); }
    finally {
      try { await browser?.close(); }
      finally { server.closeAllConnections(); await new Promise(done => server.close(done)); }
    }
  }
});

test("public tunnel readiness retries gateway errors and accepts a forwarding root 404", async () => {
  const waitFor = helper("waitForPublicTunnel");
  const statuses = [502, 530, 404], requests = [], waits = [];
  const status = await waitFor("https://x.example", {
    fetch: async url => { requests.push(url); return { status: statuses.shift() }; },
    wait: async ms => { waits.push(ms); },
  });
  assert.equal(status, 404);
  assert.equal(requests.length, 3);
  assert.ok(requests.every(url => String(url) === "https://x.example/"));
  assert.deepEqual(waits, [1000, 1000]);
});

test("dead public tunnels fail after bounded retries without network calls in the test", async () => {
  const waitFor = helper("waitForPublicTunnel");
  let calls = 0, waits = 0;
  await assert.rejects(waitFor("https://x.example", {
    fetch: async () => { calls++; if (calls % 2) throw Error("fixture connection error"); return { status: 502 }; },
    wait: async ms => { assert.equal(ms, 1000); waits++; },
  }), /Public tunnel is not forwarding to the local server/);
  assert.equal(calls, 30);
  assert.equal(waits, 29);
});
