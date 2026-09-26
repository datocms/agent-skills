import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
