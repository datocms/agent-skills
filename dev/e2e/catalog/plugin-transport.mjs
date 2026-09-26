import assert from "node:assert/strict";

export function resolvePluginTransport(env = process.env) {
  const portValue = env.E2E_PLUGIN_SERVER_PORT;
  const originValue = env.E2E_PLUGIN_PUBLIC_ORIGIN;
  assert.equal(
    Boolean(portValue),
    Boolean(originValue),
    "Set E2E_PLUGIN_SERVER_PORT and E2E_PLUGIN_PUBLIC_ORIGIN together",
  );
  const port = portValue ? Number(portValue) : 0;
  assert.ok(
    !portValue ||
      (/^\d+$/.test(portValue) &&
        Number.isInteger(port) &&
        port >= 1 &&
        port <= 65535),
    "E2E_PLUGIN_SERVER_PORT must be an integer from 1 to 65535",
  );
  let publicOrigin;
  if (originValue) {
    let url;
    try {
      url = new URL(originValue);
    } catch {
      throw new Error("E2E_PLUGIN_PUBLIC_ORIGIN must be a valid HTTPS origin");
    }
    assert.ok(
      url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash,
      "E2E_PLUGIN_PUBLIC_ORIGIN must be an HTTPS origin without credentials, a path, query or fragment",
    );
    publicOrigin = url.origin;
  }
  return { port, publicOrigin };
}

export function pluginOrigin(boundPort, publicOrigin) {
  assert.ok(
    Number.isInteger(boundPort) && boundPort >= 1 && boundPort <= 65535,
    "The bound plugin port must be an integer from 1 to 65535",
  );
  return publicOrigin ?? `http://127.0.0.1:${boundPort}`;
}
