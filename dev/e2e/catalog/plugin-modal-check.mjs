import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { build } from "esbuild";
import { chromium } from "./plugin/node_modules/playwright/index.mjs";

export async function checkPlugin(workspace, output) {
  const bundled = await build({
    stdin: {
      contents: `import connectToChild from 'penpal/lib/connectToChild';
      window.writes=[];window.heights=[];window.saveCalls=0;window.modalRequests=[];
      window.settings={
        mode:'renderItemFormSidebarPanel',sidebarPaneId:'title-tools',locale:'it',isSubmitting:false,
        formValues:{title:{en:'English sentinel',it:'Ciao'}},itemStatus:'draft',isFormDirty:false,
        item:null,itemType:{id:'article-model',type:'item_type',attributes:{api_key:'article'}},
        plugin:{id:'plugin-1',type:'plugin',attributes:{parameters:{}}},parameters:{},
        fields:{},itemTypes:{},fieldsets:{},users:{},blocksAnalysis:{},
        site:{id:'fixture',type:'site',attributes:{locales:['en','it']}},
        theme:{},cssDesignTokens:{'--color--surface':'rgb(255,255,255)','--color--ink':'rgb(20,20,20)'},
        colorScheme:'light',bodyPadding:[16,16,16,16],ui:{locale:'en'},environment:'fixture',isEnvironmentPrimary:false
      };
      const connection=connectToChild({iframe:document.querySelector('#sidebar'),timeout:10000,methods:{
        getSettings:()=>window.settings,setHeight:h=>window.heights.push({kind:'sidebar',height:h}),
        notice:()=>{},saveCurrentItem:()=>{window.saveCalls++;},
        setFieldValue:async(path,value)=>{
          window.writes.push({path,value});const keys=path.split('.');let target=window.settings.formValues;
          for(const key of keys.slice(0,-1))target=target[key];target[keys.at(-1)]=value;
          await window.sidebar.onChange(window.settings);
        },
        openModal:request=>new Promise(resolveResult=>{
          window.modalRequests.push(request);const frame=document.createElement('iframe');frame.id='modal';frame.title='Title dialog';frame.src='/index.html';
          let modalConnection;
          const finish=value=>{resolveResult(value);setTimeout(()=>{modalConnection.destroy();frame.remove();},50);};
          window.cancelModal=()=>finish(null);
          modalConnection=connectToChild({iframe:frame,timeout:10000,methods:{
            getSettings:()=>({...window.settings,mode:'renderModal',modalId:request.id,parameters:request.parameters}),
            setHeight:h=>window.heights.push({kind:'modal',height:h}),resolve:finish
          }});
          document.body.append(frame);
        })
      }});
      window.ready=connection.promise.then(child=>{window.sidebar=child;});
      window.update=async patch=>{window.settings={...window.settings,...patch};await window.sidebar.onChange(window.settings);};`,
      resolveDir: join(import.meta.dirname, "plugin"),
      loader: "js",
    },
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
  });
  const dist = resolve(workspace, "dist");
  const server = createServer((request, response) => {
    try {
      const path = new URL(request.url, "http://localhost").pathname;
      if (path === "/host") {
        response.setHeader("content-type", "text/html");
        response.end(
          '<!doctype html><html><body><iframe id="sidebar" title="Sidebar" src="/index.html"></iframe><script src="/host.js"></script></body></html>',
        );
        return;
      }
      if (path === "/host.js") {
        response.setHeader("content-type", "text/javascript");
        response.end(bundled.outputFiles[0].text);
        return;
      }
      const file = resolve(dist, "." + path);
      assert.ok(file.startsWith(dist + "/"));
      response.setHeader(
        "content-type",
        { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" }[
          extname(file)
        ] ?? "application/octet-stream",
      );
      response.end(readFileSync(file));
    } catch {
      response.writeHead(404).end();
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
    page.setDefaultTimeout(10000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://use.typekit.net/**", (route) => route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/host`);
    await page.evaluate(() => window.ready);
    const declarations = await page.evaluate(() =>
      window.sidebar.itemFormSidebarPanels(window.settings.itemType, {}),
    );
    assert.ok(declarations.some((x) => x.id === "title-tools"));
    assert.deepEqual(
      await page.evaluate(() =>
        window.sidebar.itemFormSidebarPanels(
          {
            id: "other",
            type: "item_type",
            attributes: { api_key: "product" },
          },
          {},
        ),
      ),
      [],
    );
    checks.push(
      "real SDK sidebar declaration is scoped to the requested model",
    );
    const sidebar = page.frameLocator("#sidebar"),
      modal = page.frameLocator("#modal");
    const open = () =>
      sidebar.getByRole("button", { name: "Edit title", exact: true }).click();
    await open();
    assert.equal(
      await modal
        .getByRole("textbox", { name: "Title", exact: true })
        .inputValue(),
      "Ciao",
    );
    await modal
      .getByRole("textbox", { name: "Title", exact: true })
      .fill("Titolo approvato");
    await modal.getByRole("button", { name: "Apply", exact: true }).click();
    await page.waitForFunction(
      () => window.writes.at(-1)?.value === "Titolo approvato",
    );
    assert.deepEqual(await page.evaluate(() => window.writes.at(-1)), {
      path: "title.it",
      value: "Titolo approvato",
    });
    assert.equal(
      await page.evaluate(() => window.settings.formValues.title.en),
      "English sentinel",
    );
    await page.locator("#modal").waitFor({ state: "detached" });
    checks.push(
      "custom modal result updates only the requested locale through the real host protocol",
    );
    await open();
    await modal
      .getByRole("textbox", { name: "Title", exact: true })
      .fill("Discard this");
    await modal.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.locator("#modal").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => window.writes.length), 1);
    await open();
    await modal.getByRole("textbox", { name: "Title", exact: true }).waitFor();
    await page.evaluate(() => window.cancelModal());
    await page.locator("#modal").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => window.writes.length), 1);
    checks.push(
      "modal cancellation and host dismissal leave form values unchanged",
    );
    await page.evaluate(() =>
      window.update({
        formValues: { title: { en: "English sentinel", it: "Host refreshed" } },
      }),
    );
    await open();
    assert.equal(
      await modal
        .getByRole("textbox", { name: "Title", exact: true })
        .inputValue(),
      "Host refreshed",
    );
    await modal.getByRole("textbox", { name: "Title", exact: true }).fill("");
    await modal.getByRole("button", { name: "Apply", exact: true }).click();
    await page.waitForFunction(() => window.writes.at(-1)?.value === "");
    await page.locator("#modal").waitFor({ state: "detached" });
    assert.deepEqual(await page.evaluate(() => window.writes.at(-1)), {
      path: "title.it",
      value: "",
    });
    checks.push(
      "latest host values are used and an empty confirmed title is not mistaken for cancellation",
    );
    await page.evaluate(() => window.update({ isSubmitting: true }));
    await page.waitForFunction(
      () =>
        document
          .querySelector("#sidebar")
          .contentDocument.querySelector("button")?.disabled === true,
    );
    assert.equal(await page.evaluate(() => window.saveCalls), 0);
    const heights = await page.evaluate(() => window.heights);
    for (const kind of ["sidebar", "modal"])
      assert.ok(
        heights.some(
          (x) => x.kind === kind && Number.isFinite(x.height) && x.height > 0,
        ),
      );
    assert.deepEqual(errors, []);
    checks.push(
      "submission disables actions, both frames resize, and no automatic save occurs",
    );
    await page.screenshot({ path: join(output, "sidebar-modal.png") });
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
