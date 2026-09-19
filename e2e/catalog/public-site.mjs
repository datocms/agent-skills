import assert from "node:assert/strict";
import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "node:net";
import { deflateSync } from "node:zlib";
import { spawn, spawnSync } from "node:child_process";
import { chromium } from "./plugin/node_modules/playwright/index.mjs";
import { executeQuery } from "./web/node_modules/@datocms/cda-client/dist/esm/index.js";
import * as cda from "./cda.mjs";
import { replayVisualApplication } from "./replay.mjs";
import {
  configureFramework,
  frameworkNames,
  startArguments,
} from "./frameworks.mjs";

export const transport = "cda";
export const configure = configureFramework;
export const cleanup = cda.cleanup;
export const replay = (options) =>
  replayVisualApplication({ ...options, scenario: "public-site" });

function fixtureImage() {
  const crc = (bytes) => {
    let value = 0xffffffff;
    for (const byte of bytes) {
      value ^= byte;
      for (let bit = 0; bit < 8; bit++)
        value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
    }
    return (value ^ 0xffffffff) >>> 0;
  };
  const chunk = (name, data) => {
    const payload = Buffer.concat([Buffer.from(name), data]);
    const header = Buffer.alloc(4),
      checksum = Buffer.alloc(4);
    header.writeUInt32BE(data.length);
    checksum.writeUInt32BE(crc(payload));
    return Buffer.concat([header, payload, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(640, 0);
  header.writeUInt32BE(360, 4);
  header[8] = 8;
  header[9] = 2;
  const pixels = Buffer.alloc((640 * 3 + 1) * 360);
  for (let y = 0; y < 360; y++)
    for (let x = 0; x < 640; x++) {
      const offset = y * (640 * 3 + 1) + 1 + x * 3;
      pixels.set(x < 320 ? [35, 180, 210] : [245, 180, 35], offset);
    }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export async function prepare(options) {
  const state = await cda.prepare(options);
  const client = options.project.cmaClient;
  state.framework = options.framework ?? "nextjs";
  delete state.environment.DATOCMS_DRAFT_CONTENT_CDA_TOKEN;
  const reservation = createServer();
  await new Promise((r) => reservation.listen(0, "127.0.0.1", r));
  state.port = reservation.address().port;
  await new Promise((r) => reservation.close(r));
  state.origin = `http://localhost:${state.port}`;
  Object.assign(state.environment, {
    SITE_URL: state.origin,
    NEXT_PUBLIC_SITE_URL: state.origin,
    NEXT_TELEMETRY_DISABLED: "1",
  });
  const imagePath = join(options.output, "hero-fixture.png");
  writeFileSync(imagePath, fixtureImage());
  state.upload = await client.uploads.createFromLocalFile({
    localPath: imagePath,
    filename: "catalog-hero.png",
  });
  const model = state.records[0].item_type.id;
  await client.fields.create(model, {
    label: "Hero",
    api_key: "hero",
    field_type: "file",
  });
  await client.fields.create(model, {
    label: "SEO",
    api_key: "seo",
    field_type: "seo",
  });
  const globalSeo = {
    site_name: `Catalog ${state.marker}`,
    title_suffix: "",
    fallback_seo: {
      title: `Catalog fallback ${state.marker}`,
      description: "Public catalog fallback",
      image: state.upload.id,
    },
  };
  await client.site.update({
    favicon: state.upload.id,
    global_seo: { en: globalSeo, it: globalSeo },
  });
  state.alt = `Cyan & amber ${state.marker}`;
  state.seoTitle = `SEO & Guide ${state.marker}`;
  state.description = `A <guide> with "quotes" & useful details ${state.marker}`;
  for (let i = 0; i < state.records.length; i++) {
    await client.items.update(state.records[i].id, {
      ...(i === 0
        ? {
            title: {
              en: `English 0 ${state.marker}`,
              it: `Italiano 0 ${state.marker}`,
            },
          }
        : {}),
      hero:
        i === 2
          ? null
          : {
              upload_id: state.upload.id,
              alt: state.alt,
              title: null,
              custom_data: {},
            },
      seo: {
        title: i === 0 ? state.seoTitle : `SEO ${i} ${state.marker}`,
        description: state.description,
        image: state.upload.id,
        twitter_card: "summary_large_image",
      },
    });
    if (i < 3) await client.items.publish(state.records[i].id);
  }
  await client.items.update(state.records[0].id, {
    title: {
      en: `Private draft ${state.marker}`,
      it: `Bozza privata ${state.marker}`,
    },
  });
  state.before = await client.items.list({ filter: { type: model } });
  let ready = false;
  for (let attempt = 0; attempt < 15; attempt++) {
    const data = await executeQuery(
      "{ allCatalogArticles(orderBy: sortIndex_ASC) { id title hero { id } _updatedAt } }",
      {
        token: state.environment.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN,
        environment: options.project.environment,
      },
    );
    if (
      data.allCatalogArticles.length === 3 &&
      data.allCatalogArticles[0].title === `English 0 ${state.marker}` &&
      data.allCatalogArticles[0].hero?.id === state.upload.id
    ) {
      state.published = data.allCatalogArticles;
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.ok(ready, "Published image fixture did not become ready");
  appendFileSync(
    join(options.workspace, "SCHEMA.md"),
    "catalog_article also has optional hero (file) and seo (SEO) fields. The site has a favicon and global SEO defaults. English and Italian are available, with English fallback for missing titles.\n",
  );
  options.save("public-site-fixture.json", {
    marker: state.marker,
    uploadId: state.upload.id,
    publishedIds: state.published.map((record) => record.id),
  });
  return state;
}

export function prompt({ project, state }) {
  return `Add public DatoCMS article pages, responsive images, SEO, robots and a sitemap to this existing ${frameworkNames[state.framework]} app. Routes are /en/articles/[slug] and /it/articles/[slug], using catalog_article, the requested locale and English fallback. Render the title as h1 and the optional hero through the framework's DatoCMS image component, with its alt text, responsive sources and preserved aspect ratio. Use record SEO metadata and the site favicon; titles, descriptions and canonical URLs must be in server-rendered HTML. SITE_URL is the public origin. Return 404 for unknown or unpublished articles. Generate /sitemap.xml with all published article routes in both locales, absolute URLs and stable CMS last-modified values. Generate /robots.txt so DatoCmsSearchBot can crawl only /en/articles/ and /it/articles/; allow those before a catch-all denial and advertise the sitemap. This is published-only: use DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN and DATOCMS_ENVIRONMENT=${project.environment}, without draft reads, preview setup, CMS changes or deployment. Read SCHEMA.md and inspect the real GraphQL schema as needed. Verify the production build. Do not hardcode returned content or credentials.`;
}

function crawlerRules(text) {
  const groups = [];
  let group;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const match = /^([^:]+):\s*(.*)$/.exec(line);
    if (!match) {
      if (!line) group = undefined;
      continue;
    }
    const key = match[1].toLowerCase(),
      value = match[2].trim();
    if (key === "user-agent") {
      if (!group || group.rules.length) {
        group = { agents: [], rules: [] };
        groups.push(group);
      }
      group.agents.push(value);
    } else if (group && ["allow", "disallow"].includes(key))
      group.rules.push({ allow: key === "allow", path: value });
  }
  const exact = groups.filter((g) => g.agents.includes("DatoCmsSearchBot"));
  assert.equal(exact.length, 1, "Expected one DatoCMS crawler group");
  return (path) => {
    for (const rule of exact[0].rules) {
      if (!rule.path) continue;
      const pattern = rule.path
        .replace(/[.+?^{}()|[\]\\]/g, "\\$&")
        .replaceAll("*", ".*");
      if (new RegExp("^" + pattern).test(path)) return rule.allow;
    }
    return true;
  };
}

export async function check({
  project,
  state,
  workspace,
  output,
  environment,
  save,
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
  assert.equal(built.status, 0, "Public site production build failed");
  const server = spawn(process.execPath, startArguments(state), {
    cwd: workspace,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let logs = "",
    browser;
  server.stdout.on("data", (b) => {
    logs += b;
  });
  server.stderr.on("data", (b) => {
    logs += b;
  });
  const checks = [],
    errors = [];
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        await fetch(state.origin);
        ready = true;
        break;
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    assert.ok(ready, "Public site listener did not start");
    browser = await chromium.launch({
      channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
      headless: true,
    });
    const crawler = await browser.newContext({ javaScriptEnabled: false });
    const crawlPage = await crawler.newPage();
    const articleUrl = `${state.origin}/en/articles/article-0`;
    assert.equal((await crawlPage.goto(articleUrl)).status(), 200);
    assert.equal(
      await crawlPage.locator("h1").innerText(),
      `English 0 ${state.marker}`,
    );
    assert.equal(await crawlPage.title(), state.seoTitle);
    assert.equal(
      await crawlPage
        .locator('meta[name="description"]')
        .getAttribute("content"),
      state.description,
    );
    assert.equal(
      await crawlPage.locator('link[rel="canonical"]').getAttribute("href"),
      articleUrl,
    );
    assert.equal(
      await crawlPage
        .locator('meta[property="og:title"]')
        .getAttribute("content"),
      state.seoTitle,
    );
    assert.ok(
      !(await crawlPage.content()).includes(`Private draft ${state.marker}`),
    );
    const icon = await crawlPage
      .locator('link[rel~="icon"]')
      .first()
      .getAttribute("href");
    assert.ok(icon);
    assert.ok(
      (await fetch(new URL(icon, state.origin))).ok,
      "Favicon URL did not resolve",
    );
    checks.push(
      "published title, escaped SEO, canonical URL and real favicon work without browser JavaScript",
    );
    assert.equal(
      (await crawlPage.goto(`${state.origin}/it/articles/article-1`)).status(),
      200,
    );
    assert.equal(
      await crawlPage.locator("h1").innerText(),
      `English 1 ${state.marker}`,
    );
    assert.equal(
      await crawlPage.locator('link[rel="canonical"]').getAttribute("href"),
      `${state.origin}/it/articles/article-1`,
    );
    for (const slug of ["article-3", "missing-record"])
      assert.equal(
        (await fetch(`${state.origin}/en/articles/${slug}`)).status,
        404,
      );
    checks.push(
      "localized public routes fall back correctly and reject drafts and missing records",
    );
    const page = await browser.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(articleUrl);
    const hero = page.getByAltText(state.alt, { exact: true }).first();
    await hero.waitFor();
    await hero.evaluate((image) => image.decode());
    const image = await hero.evaluate((element) => ({
      source: element.currentSrc,
      srcsets: [
        element.getAttribute("srcset"),
        ...[
          ...(element.closest("picture")?.querySelectorAll("source") ?? []),
        ].map((source) => source.getAttribute("srcset")),
      ].filter(Boolean),
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      naturalWidth: element.naturalWidth,
    }));
    assert.ok(image.naturalWidth > 0 && image.width > 0 && image.height > 0);
    assert.ok(
      Math.abs(image.width / image.height - 640 / 360) < 0.02,
      "Hero aspect ratio changed",
    );
    save("public-site-image.json", image);
    assert.ok(
      image.srcsets.some((srcset) => srcset.includes(",")),
      "Missing responsive image candidates",
    );
    const imageUrl = new URL(image.source),
      sourceUrl = new URL(
        imageUrl.searchParams.get("url") ?? image.source,
        state.origin,
      );
    assert.equal(sourceUrl.pathname, new URL(state.upload.url).pathname);
    assert.ok((await fetch(image.source)).ok);
    await page.goto(`${state.origin}/en/articles/article-2`);
    assert.equal(
      await page.locator("h1").innerText(),
      `English 2 ${state.marker}`,
    );
    assert.equal(
      await page.getByAltText(state.alt, { exact: true }).count(),
      0,
    );
    assert.equal(
      await page
        .locator("img")
        .evaluateAll(
          (images) =>
            images.filter(
              (img) =>
                img.getAttribute("src") === "" ||
                img.getAttribute("src") === "undefined",
            ).length,
        ),
      0,
    );
    checks.push(
      "real responsive image loads with CMS alt text and aspect ratio; missing hero does not emit broken image URLs",
    );
    const robotsResponse = await fetch(`${state.origin}/robots.txt`),
      sitemapResponse = await fetch(`${state.origin}/sitemap.xml`);
    assert.ok(robotsResponse.ok && sitemapResponse.ok);
    const robots = await robotsResponse.text(),
      sitemap = await sitemapResponse.text(),
      allowed = crawlerRules(robots);
    for (const path of ["/en/articles/article-0", "/it/articles/article-1"])
      assert.equal(allowed(path), true);
    for (const path of ["/", "/private/notes", "/api/token", "/admin/"])
      assert.equal(allowed(path), false);
    assert.ok(
      robots
        .split(/\r?\n/)
        .some((line) => line.trim() === `Sitemap: ${state.origin}/sitemap.xml`),
    );
    const parsed = await page.evaluate((xml) => {
      const document = new DOMParser().parseFromString(xml, "application/xml");
      return {
        errors: document.querySelectorAll("parsererror").length,
        root: document.documentElement.localName,
        urls: [...document.querySelectorAll("url")].map((url) => ({
          loc: url.querySelector("loc")?.textContent,
          lastmod: url.querySelector("lastmod")?.textContent,
        })),
      };
    }, sitemap);
    assert.equal(parsed.errors, 0);
    assert.equal(parsed.root, "urlset");
    const expected = ["en", "it"]
      .flatMap((locale) =>
        [0, 1, 2].map((i) => `${state.origin}/${locale}/articles/article-${i}`),
      )
      .sort();
    assert.deepEqual(parsed.urls.map((entry) => entry.loc).sort(), expected);
    for (const entry of parsed.urls) {
      assert.ok(entry.lastmod && Number.isFinite(Date.parse(entry.lastmod)));
      const index = Number(entry.loc.at(-1));
      const record = state.before.find(
        (record) => record.id === state.records[index].id,
      );
      const times = [
        state.published[index]._updatedAt,
        record.meta.updated_at,
        record.meta.published_at,
        record.meta.first_published_at,
      ].filter(Boolean);
      assert.ok(
        times.some((time) =>
          /^\d{4}-\d{2}-\d{2}$/.test(entry.lastmod)
            ? time.startsWith(entry.lastmod)
            : Date.parse(time) === Date.parse(entry.lastmod),
        ),
        "Sitemap lastmod is not derived from CMS metadata",
      );
    }
    assert.equal(
      await (await fetch(`${state.origin}/sitemap.xml`)).text(),
      sitemap,
      "Sitemap changes without CMS edits",
    );
    checks.push(
      "crawler rules allow both public sections before catch-all denial; sitemap has exactly the published localized routes and stable lastmod values",
    );
    assert.deepEqual(
      await project.cmaClient.items.list({
        filter: { type: state.records[0].item_type.id },
      }),
      state.before,
    );
    assert.deepEqual(errors, []);
    save("public-site-browser.json", {
      checks,
      image,
      robots,
      sitemap: parsed,
      errors,
    });
    await page.screenshot({ path: join(output, "public-site.png") });
    return checks;
  } finally {
    save("public-site-checkpoint.json", { checks, errors });
    await browser?.close();
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
    save("server.log", logs);
  }
}
