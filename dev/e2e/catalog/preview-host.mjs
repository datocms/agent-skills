import assert from "node:assert/strict";
import { createServer } from "node:http";
import { join } from "node:path";
import { build } from "esbuild";

export function embeddedDraftEntry(origin, token) {
  const entry = new URL("/api/draft-mode/enable", origin);
  entry.searchParams.set("redirect", "/articles/article-0");
  entry.searchParams.set("token", token);
  return entry.href;
}

// Exercise the public Web Previews iframe protocol with the actual Content
// Link controller. This does not claim a run inside the hosted CMS editor.
export async function checkEmbeddedPreview({
  context,
  state,
  destination,
  save,
}) {
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fieldPath = new URLSearchParams(new URL(destination).hash.slice(1)).get(
    "fieldPath",
  );
  assert.equal(fieldPath, "title.en");
  let source = escape(destination);
  for (const [value, name] of [
    [state.environment.DATOCMS_ENVIRONMENT, "environment"],
    [state.records[0].item_type.id, "item_type_id"],
    [state.records[0].id, "item_id"],
    [fieldPath, "field_path"],
  ])
    source = source.replace(
      escape(value),
      `(?<${name}>${name === "field_path" ? "[A-Za-z0-9_.-]+" : "[A-Za-z0-9_-]+"})`,
    );
  assert.ok(new RegExp(source).exec(destination)?.groups?.item_id);
  // Authenticate inside the iframe so partitioned draft cookies belong to
  // the host's top-level site. Keep this secret-bearing URL only in memory.
  const draftEntry = embeddedDraftEntry(state.origin, state.environment.SECRET_API_TOKEN);
  const bundle = await build({
    stdin: {
      contents: `import connectToChild from 'penpal/lib/connectToChild';
        window.states=[];window.opened=[];
        const iframe=document.createElement('iframe');
        iframe.title='Website preview';iframe.style='width:900px;height:600px';
        iframe.src=${JSON.stringify(draftEntry)};
        const connection=connectToChild({iframe,timeout:20000,methods:{
          onInit:()=>({editUrlRegExp:{source:${JSON.stringify(source)},flags:''}}),
          onPing:()=>{},
          onStateChange:state=>{window.states.push(state);},
          openItem:item=>{window.opened.push(item);}
        }});
        window.ready=connection.promise.then(website=>{window.website=website;});
        document.body.append(iframe);`,
      resolveDir: join(import.meta.dirname, "plugin"),
      loader: "js",
    },
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
  });
  const host = createServer((request, response) => {
    response.setHeader(
      "content-type",
      request.url === "/host.js" ? "text/javascript" : "text/html",
    );
    response.end(
      request.url === "/host.js"
        ? bundle.outputFiles[0].text
        : '<!doctype html><html><body><script src="/host.js"></script></body></html>',
    );
  });
  await new Promise((resolve) => host.listen(0, "127.0.0.1", resolve));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.subscriptionLifecycle = {
      document: crypto.randomUUID?.() ?? String(Math.random()),
      sources: [],
      updates: 0,
      initial: [],
    };
    const OriginalEventSource = window.EventSource;
    window.EventSource = class extends OriginalEventSource {
      constructor(url, options) {
        super(url, options);
        window.subscriptionLifecycle.sources.push(this);
        this.addEventListener("update", () => {
          window.subscriptionLifecycle.updates++;
        });
      }
    };
  });
  let websiteFrame;
  try {
    await page.goto(`http://localhost:${host.address().port}`);
    await page.evaluate(() => window.ready);
    websiteFrame = page
      .frames()
      .find((frame) => frame.url().startsWith(state.origin));
    assert.ok(websiteFrame, "Website iframe did not load");
    await websiteFrame.waitForFunction(
      () => window.subscriptionLifecycle.updates > 0,
      {},
      { timeout: 45000 },
    );
    const originalDocument = await websiteFrame.evaluate(() => {
      const trace = window.subscriptionLifecycle;
      trace.initial = [...trace.sources];
      return trace.document;
    });
    await page.evaluate(() =>
      window.website.navigateTo({ path: "/articles/article-1" }),
    );
    const frame = page.frameLocator("iframe");
    await frame
      .getByRole("heading", { level: 1 })
      .filter({ hasText: `English 1 ${state.marker}` })
      .waitFor({ timeout: 20000 });
    await page.waitForFunction(
      ({ environment, id }) =>
        window.states.some(
          (state) =>
            state.path === "/articles/article-1" &&
            state.itemIdsPerEnvironment[environment]?.includes(id),
        ),
      {
        environment: state.environment.DATOCMS_ENVIRONMENT,
        id: state.records[1].id,
      },
      { timeout: 20000 },
    );
    await page.evaluate(() =>
      window.website.setClickToEditEnabled({
        enabled: true,
        flash: { scrollToNearestTarget: false },
      }),
    );
    await frame.locator("h1").click();
    await page.waitForFunction(
      () => window.opened.length > 0,
      {},
      { timeout: 10000 },
    );
    const observation = await page.evaluate(() => ({
      states: window.states,
      opened: window.opened,
    }));
    const opened = observation.opened.at(-1);
    assert.equal(opened.itemId, state.records[1].id);
    assert.equal(opened.environment, state.environment.DATOCMS_ENVIRONMENT);
    assert.equal(opened.fieldPath, "title.en");
    // A changed title alone can hide orphaned subscriptions from the old page.
    // Full document navigation releases its sources; reused documents must
    // explicitly close the previous subscription and establish the new one.
    await websiteFrame.waitForFunction(
      (document) => {
        const trace = window.subscriptionLifecycle;
        return trace.document !== document
          ? trace.updates > 0
          : trace.initial.every((source) => source.readyState === 2) &&
              trace.sources.some(
                (source) =>
                  !trace.initial.includes(source) && source.readyState === 1,
              );
      },
      originalDocument,
      { timeout: 20000 },
    );
    observation.subscriptionLifecycle = await websiteFrame.evaluate(() => ({
      opened: window.subscriptionLifecycle.sources.length,
      closed: window.subscriptionLifecycle.sources.filter(
        (source) => source.readyState === 2,
      ).length,
      active: window.subscriptionLifecycle.sources.filter(
        (source) => source.readyState === 1,
      ).length,
    }));
    assert.deepEqual(errors, [], "Embedded preview runtime errors");
    save("embedded-preview.json", observation);
    return "embedded navigation selects the correct record and field and releases the previous subscription";
  } finally {
    save("embedded-preview-checkpoint.json", {
      errors,
      subscriptionLifecycle: await websiteFrame
        ?.evaluate(() => ({
          opened: window.subscriptionLifecycle?.sources.length,
          initialStates: window.subscriptionLifecycle?.initial.map(
            (source) => source.readyState,
          ),
          currentStates: window.subscriptionLifecycle?.sources.map(
            (source) => source.readyState,
          ),
        }))
        .catch(() => null),
      observation: await page
        .evaluate(() => ({ states: window.states, opened: window.opened }))
        .catch(() => null),
      headings: await page
        .frameLocator("iframe")
        .locator("h1")
        .evaluateAll((elements) => elements.map((element) => element.outerHTML))
        .catch(() => []),
    });
    await page.close();
    await new Promise((resolve) => host.close(resolve));
  }
}
