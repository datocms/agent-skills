import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { build } from "esbuild";
import { chromium } from "./plugin/node_modules/playwright/index.mjs";

// The host speaks the installed SDK's actual iframe protocol. No SDK or UI
// import is mocked: production assets, React, Canvas and Penpal all run in Chrome.
// This verifies plugin behavior against a controlled host, not a hosted CMS UI.
export async function checkPlugin(workspace, output) {
  const bundled = await build({
    stdin: {
      contents: `
    import connectToChild from 'penpal/lib/connectToChild';
    const iframe = document.querySelector('iframe');
    window.writes = []; window.heights = [];
    window.settings = {
      mode: 'renderFieldExtension', fieldExtensionId: 'title-editor',
      fieldPath: 'title.it', locale: 'it', disabled: false,
      formValues: {title: {en: 'English sentinel', it: 'Ciao'}},
      field: {id:'field-1',type:'field',attributes:{api_key:'title',label:'Title',field_type:'string',localized:true,validators:{}}},
      item: null, itemType: {id:'model-1',type:'item_type',attributes:{api_key:'article'}},
      plugin: {id:'plugin-1',type:'plugin',attributes:{parameters:{}}},
      parameters: {}, theme: {}, cssDesignTokens: {'--color--surface':'rgb(255, 255, 255)','--color--ink':'rgb(20, 20, 20)','--color--ink-subtle':'rgb(100, 100, 100)','--color--border':'rgb(210, 210, 210)'},
      colorScheme: 'light', bodyPadding: [16,16,16,16], ui: {locale:'en'},
      fields: {}, itemTypes: {}, fieldsets: {}, users: {}, site: {id:'fixture',type:'site',attributes:{locales:['en','it']}},
      environment:'fixture', isEnvironmentPrimary:false
    };
    const connection = connectToChild({iframe, timeout:10000, methods:{
      getSettings: () => window.settings,
      setHeight: height => {window.heights.push(height);},
      setFieldValue: async (path,value) => {
        window.writes.push({path,value});
        const keys=path.split('.'); let cursor=window.settings.formValues;
        for (const key of keys.slice(0,-1)) cursor=cursor[key];
        cursor[keys.at(-1)]=value;
        await window.plugin.onChange(window.settings);
      }
    }});
    window.ready = connection.promise.then(child => {window.plugin=child;});
    window.update = async patch => {
      window.settings={...window.settings,...patch};
      await window.plugin.onChange(window.settings);
    };
  `,
      resolveDir: join(import.meta.dirname, "plugin"),
      loader: "js",
    },
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
  });
  const parentJs = bundled.outputFiles[0].text;
  const dist = resolve(workspace, "dist");
  const server = createServer((req, res) => {
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      if (path === "/host") {
        res.setHeader("content-type", "text/html");
        res.end(
          '<!doctype html><html><body><iframe title="Plugin" src="/index.html" style="width:600px;height:400px"></iframe><script src="/host.js"></script></body></html>',
        );
      } else if (path === "/host.js") {
        res.setHeader("content-type", "text/javascript");
        res.end(parentJs);
      } else {
        const file = resolve(dist, "." + path);
        assert.ok(file.startsWith(dist + "/"));
        res.setHeader(
          "content-type",
          {
            ".html": "text/html",
            ".js": "text/javascript",
            ".css": "text/css",
          }[extname(file)] ?? "application/octet-stream",
        );
        res.end(readFileSync(file));
      }
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let browser;
  const checks = [],
    errors = [];
  try {
    browser = await chromium.launch({
      channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
      headless: true,
    });
    const page = await browser.newPage();
    // Use the UI library's fallback font instead of a third-party font CDN.
    await page.route("https://use.typekit.net/**", (route) => route.abort());
    page.setDefaultTimeout(10000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/host`);
    await page.evaluate(() => window.ready);
    const declarations = await page.evaluate(() =>
      window.plugin.manualFieldExtensions(),
    );
    assert.ok(
      declarations.some(
        (d) =>
          d.id === "title-editor" &&
          d.type === "editor" &&
          d.fieldTypes.includes("string"),
      ),
    );
    checks.push("manual declaration reaches the real SDK");
    const frame = page.frameLocator("iframe");
    const input = frame.getByRole("textbox");
    await input.waitFor();
    assert.equal(await input.inputValue(), "Ciao");
    await input.fill("Titolo nuovo");
    await page.waitForFunction(
      () => window.writes.at(-1)?.value === "Titolo nuovo",
    );
    assert.deepEqual(await page.evaluate(() => window.writes.at(-1)), {
      path: "title.it",
      value: "Titolo nuovo",
    });
    assert.equal(
      await page.evaluate(() => window.settings.formValues.title.en),
      "English sentinel",
    );
    assert.match(await frame.locator("body").innerText(), /\b12\b/);
    checks.push("localized edit and character count; other locale preserved");
    await page.evaluate(() =>
      window.update({
        fieldPath: "sections.0.title.it",
        formValues: {
          sections: [{ title: { en: "Nested sentinel", it: "Blocco" } }],
        },
      }),
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector("iframe")
          .contentDocument.querySelector("input,textarea")?.value === "Blocco",
    );
    await input.fill("Aggiornato");
    await page.waitForFunction(
      () => window.writes.at(-1)?.value === "Aggiornato",
    );
    assert.equal(
      await page.evaluate(() => window.writes.at(-1).path),
      "sections.0.title.it",
    );
    assert.equal(
      await page.evaluate(
        () => window.settings.formValues.sections[0].title.en,
      ),
      "Nested sentinel",
    );
    checks.push("nested field path and host-driven rerender");
    await page.evaluate(() =>
      window.update({
        fieldPath: "title",
        formValues: {},
        disabled: true,
        colorScheme: "dark",
        cssDesignTokens: {
          "--color--surface": "rgb(30, 30, 30)",
          "--color--ink": "rgb(240, 240, 240)",
          "--color--ink-subtle": "rgb(200, 200, 200)",
          "--color--border": "rgb(100, 100, 100)",
        },
      }),
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector("iframe")
          .contentDocument.querySelector("input,textarea")?.disabled === true,
    );
    assert.equal(await input.inputValue(), "");
    assert.equal(
      await frame.locator("html").getAttribute("data-color-scheme"),
      "dark",
    );
    assert.ok(
      (await page.evaluate(() => window.heights)).some(
        (height) => Number.isFinite(height) && height > 0,
      ),
    );
    checks.push("missing value, disabled state, dark theme and iframe sizing");
    await page.evaluate(() =>
      window.update({
        fieldPath: "name",
        formValues: { name: "Plain title" },
        disabled: false,
      }),
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector("iframe")
          .contentDocument.querySelector("input,textarea")?.value ===
        "Plain title",
    );
    await input.fill("");
    await page.waitForFunction(
      () =>
        window.writes.at(-1)?.path === "name" &&
        window.writes.at(-1)?.value === "",
    );
    assert.match(await frame.locator("body").innerText(), /\b0\b/);
    checks.push("unlocalized field and clearing a value after re-enabling");
    assert.equal(
      await frame
        .locator("label")
        .evaluate((element) => getComputedStyle(element).color),
      "rgb(200, 200, 200)",
    );
    await page.screenshot({ path: join(output, "plugin-browser.png") });
    assert.deepEqual(errors, [], "Browser runtime errors");
    return checks;
  } finally {
    writeFileSync(
      join(output, "browser.json"),
      JSON.stringify({ checks, errors }, null, 2),
    );
    await browser?.close();
    await new Promise((r) => server.close(r));
  }
}
