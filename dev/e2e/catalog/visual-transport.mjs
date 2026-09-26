import assert from "node:assert/strict";

export function resolveVisualTransport(env = process.env) {
  const portValue = env.E2E_VISUAL_SERVER_PORT;
  const originValue = env.E2E_VISUAL_PUBLIC_ORIGIN;
  assert.equal(
    Boolean(portValue),
    Boolean(originValue),
    "Set E2E_VISUAL_SERVER_PORT and E2E_VISUAL_PUBLIC_ORIGIN together",
  );
  const port = portValue ? Number(portValue) : 0;
  assert.ok(
    !portValue ||
      (/^\d+$/.test(portValue) &&
        Number.isInteger(port) &&
        port >= 1 &&
        port <= 65535),
    "E2E_VISUAL_SERVER_PORT must be an integer from 1 to 65535",
  );
  let publicOrigin;
  if (originValue) {
    let url;
    try {
      url = new URL(originValue);
    } catch {
      throw new Error("E2E_VISUAL_PUBLIC_ORIGIN must be a valid HTTPS origin");
    }
    assert.ok(
      url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash,
      "E2E_VISUAL_PUBLIC_ORIGIN must be an HTTPS origin without credentials, a path, query or fragment",
    );
    publicOrigin = url.origin;
  }
  return { port, publicOrigin };
}

export function assertSameOriginRedirect(status, locationHeader, requestUrl, origin) {
  const code = Number(status);
  assert.ok(
    [301, 302, 303, 307, 308].includes(code),
    `Draft handoff did not redirect: HTTP ${code}`,
  );
  assert.ok(typeof locationHeader === "string" && locationHeader.length > 0, "Draft handoff redirect has no Location");
  let location;
  try {
    location = new URL(locationHeader, requestUrl);
  } catch {
    throw new Error("Draft handoff redirect has an invalid Location");
  }
  assert.equal(
    location.origin,
    new URL(origin).origin,
    `Draft handoff redirects off-origin: ${location.origin}`,
  );
  return { status: code, locationOrigin: location.origin, locationPath: location.pathname };
}

export async function waitForPublicTunnel(origin, {
  fetch: request = globalThis.fetch,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await request(new URL("/", origin).href, {
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });
      if (![502, 530].includes(response.status)) return response.status;
    } catch {}
    if (attempt < 29) await wait(1000);
  }
  throw new Error("Public tunnel is not forwarding to the local server");
}
