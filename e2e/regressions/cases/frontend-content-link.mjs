import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const catalog = (root, path) => join(root, 'e2e/catalog', path);
const write = (base, files) => {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(base, path)), { recursive: true });
    writeFileSync(join(base, path), content);
  }
};
// Fixture dependencies plus an actor HOME/XDG sandbox, so no host login is reachable.
const prepare = (workspace, root, fixture, files) => {
  const manifest = JSON.parse(readFileSync(catalog(root, `${fixture}/package.json`), 'utf8'));
  write(workspace, { 'package.json': JSON.stringify({ ...manifest, name: 'site', scripts: fixture === 'web-astro' ? { dev: 'astro dev', build: 'astro build' } : { dev: 'vite dev', build: 'vite build' } }, null, 2), ...files });
  symlinkSync(catalog(root, `${fixture}/node_modules`), join(workspace, 'node_modules'), 'dir');
  const environment = {};
  for (const [key, dir] of [['HOME', 'home'], ['XDG_CONFIG_HOME', 'config'], ['XDG_DATA_HOME', 'data'], ['XDG_CACHE_HOME', 'cache']]) {
    environment[key] = join(workspace, '..', 'oracle', dir);
    mkdirSync(environment[key], { recursive: true });
  }
  return { environment };
};
const stega = async (root) => (await import(pathToFileURL(catalog(root, 'web/node_modules/@vercel/stega/dist/index.mjs')).href)).vercelStegaCombine;
const EDITOR = 'https://acme.admin.datocms.com/editor/item_types/article/items';
const href = (id, field) => `${EDITOR}/${id}/edit#fieldPath=${field}`;

const svelteStega = `import { stripStega } from '@datocms/svelte';
import { revealStega } from '@datocms/content-link';

export const revealEditingInfo = <T>(value: T): T => revealStega(value);
export const cleanText = <T>(value: T): T => stripStega(value);
`;

// Original layout, or (with a mount) the draft-gated layout from the skill text.
const astroLayout = (imports, mount) => `---
${imports ? `${imports}\nimport { isDraftModeEnabled } from '~/lib/draftMode';\n\n` : ''}interface Props { title: string }
const { title } = Astro.props;
${imports ? 'const draftMode = isDraftModeEnabled(Astro.cookies);\n' : ''}---

<html lang="en">
  <head><meta charset="utf-8" /><title>{title}</title></head>
  <body>
    ${mount ? `${mount}\n    ` : ''}<header><a href="/">Journal</a></header>
    <main><slot /></main>
  </body>
</html>
`;

async function astroNavigation(workspace, ctx) {
  const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', DATOCMS_BASE_EDITING_URL: 'https://acme.admin.datocms.com' };
  execFileSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], { cwd: workspace, env, stdio: 'pipe', timeout: 240000 });
  const free = await new Promise((resolve) => { const s = createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
  const site = `http://127.0.0.1:${free}`;
  const server = spawn(process.execPath, ['dist/server/entry.mjs'], { cwd: workspace, env: { ...env, HOST: '127.0.0.1', PORT: String(free) }, stdio: 'ignore' });
  let host, browser;
  try {
    for (let i = 0; ; i++) {
      try { if ((await fetch(`${site}/articles/first`)).ok) break; } catch {}
      assert.ok(i < 60, 'Built Astro server did not serve /articles/first');
      await new Promise((r) => setTimeout(r, 500));
    }
    // Parent frame speaking the Web Previews plugin side of the penpal protocol.
    const bundle = await build({
      stdin: {
        contents: `import connectToChild from 'penpal/lib/connectToChild';
          window.states=[];window.connected=false;
          const iframe=document.createElement('iframe');iframe.src=${JSON.stringify(`${site}/articles/first`)};iframe.style='width:900px;height:600px';
          const connection=connectToChild({iframe,timeout:60000,methods:{
            onInit:()=>({editUrlRegExp:{source:${JSON.stringify(`^${EDITOR.replace(/[.]/g, '\\.')}/(?<item_id>[\\w-]+)/edit#fieldPath=(?<field_path>[\\w.-]+)$`)},flags:''}}),
            onPing:()=>{},onStateChange:(s)=>{window.states.push(s);},openItem:()=>{}}});
          window.ready=connection.promise.then((w)=>{window.website=w;window.connected=true;});
          document.body.append(iframe);`,
        resolveDir: catalog(ctx.root, 'plugin'), loader: 'js',
      },
      bundle: true, write: false, platform: 'browser', format: 'iife',
    });
    host = createServer((req, res) => {
      res.setHeader('content-type', req.url === '/host.js' ? 'text/javascript' : 'text/html');
      res.end(req.url === '/host.js' ? bundle.outputFiles[0].text : '<!doctype html><html><body><script src="/host.js"></script></body></html>');
    });
    await new Promise((r) => host.listen(0, '127.0.0.1', r));
    const hostUrl = `http://127.0.0.1:${host.address().port}/`;
    const { chromium } = await import(pathToFileURL(catalog(ctx.root, 'plugin/node_modules/playwright/index.mjs')).href);
    browser = await chromium.launch({ headless: true, channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome' });
    const evidence = {};

    const draft = await browser.newContext();
    await draft.addCookies([{ name: 'datocms-draft-mode', value: 'enabled', url: site }]);
    const page = await draft.newPage();
    await page.goto(hostUrl);
    await page.waitForFunction(() => window.connected, null, { timeout: 30000 }).catch(() => assert.fail('Draft preview never connected to the Visual tab host'));
    await page.evaluate(() => window.website.navigateTo({ path: '/articles/second' }));
    const moved = async () => { for (let i = 0; i < 40; i++) { const f = page.frames().find((fr) => fr !== page.mainFrame() && new URL(fr.url()).pathname === '/articles/second'); if (f) return f; await page.waitForTimeout(500); } };
    const frame = await moved();
    assert.ok(frame, `Visual tab navigation request did not move the preview (still at ${page.frames().at(-1).url()})`);
    await page.waitForFunction(() => window.states.some((s) => s.path === '/articles/second' && s.itemIdsPerEnvironment.__PRIMARY__?.includes('second-id')), null, { timeout: 30000 });
    evidence.draft = { navigatedTo: frame.url(), heading: (await frame.locator('h1').innerText()).replace(/[\u200b-\u200d\ufeff]/g, ''), states: await page.evaluate(() => window.states.length) };

    const published = await browser.newContext();
    const visitor = await published.newPage();
    await visitor.goto(hostUrl);
    const heading = await visitor.frameLocator('iframe').locator('h1').innerText({ timeout: 20000 });
    assert.equal(heading, 'First article');
    await visitor.waitForTimeout(6000);
    assert.equal(await visitor.evaluate(() => window.connected), false, 'Content Link controller is mounted without draft mode');
    evidence.published = { heading, connected: false };
    return evidence;
  } finally {
    await browser?.close();
    if (host) await new Promise((r) => host.close(r));
    server.kill();
  }
}

export default [
  {
    id: 'svelte-stega-debug',
    guards: ['skills/datocms-frontend-integrations/references/svelte-content-link.md'],
    prompt: "Our SvelteKit site renders DatoCMS draft content in preview mode. Add `src/lib/datocms/stega.ts` exporting two helpers: `revealEditingInfo(value)`, for debugging, which returns the value with DatoCMS's invisible editing metadata turned into something visible when logged (it must accept a single string or a whole GraphQL response object and keep the same shape), and `cleanText(value)`, which removes that metadata from a string so it can be compared or used in meta tags. Use DatoCMS's own utilities for this rather than reimplementing the encoding. Dependencies are already installed (don't run npm install or change versions); there is no live DatoCMS project or credentials.",
    budget: { timeoutMs: 300000, maxCommands: 50 },
    setup: (workspace, ctx) => prepare(workspace, ctx.root, 'web-sveltekit', {
      'svelte.config.js': "import adapter from '@sveltejs/adapter-node';\n\nexport default { kit: { adapter: adapter() } };\n",
      'vite.config.ts': "import { sveltekit } from '@sveltejs/kit/vite';\nimport { defineConfig } from 'vite';\n\nexport default defineConfig({ plugins: [sveltekit()] });\n",
      'src/app.html': '<!doctype html>\n<html lang="en">\n  <head>%sveltekit.head%</head>\n  <body>%sveltekit.body%</body>\n</html>\n',
      'src/routes/+page.svelte': '<h1>Home</h1>\n',
    }),
    async check(workspace, ctx) {
      // A named import the package does not export is a bundle error, as in Vite/Rollup builds.
      const outfile = join(workspace, '..', 'oracle', `stega-${Date.now()}.mjs`);
      await build({
        entryPoints: [join(workspace, 'src/lib/datocms/stega.ts')], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent',
        alias: { $lib: join(workspace, 'src/lib') },
        define: { 'import.meta.env': '{"DEV":true,"PROD":false,"MODE":"development","SSR":true}', 'process.env.NODE_ENV': '"development"' },
        plugins: [{ name: 'svelte-stubs', setup(b) {
          b.onResolve({ filter: /^\$app\/environment$/ }, () => ({ path: 'app-environment', namespace: 'stub' }));
          b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const dev = true, browser = false, building = false, version = "test";', loader: 'js' }));
          b.onLoad({ filter: /\.svelte$/ }, () => ({ contents: 'export default {};', loader: 'js' }));
        } }],
      }).catch((error) => assert.fail(`Build failed: ${error.errors?.map((e) => e.text).join('; ') ?? error}`));
      const { revealEditingInfo, cleanText } = await import(pathToFileURL(outfile).href);
      const combine = await stega(ctx.root);
      const encode = (text, id, field) => combine(text, { origin: 'datocms.com', href: href(id, field) }, false);
      const title = encode('Summer sale', 'page-1', 'title');
      assert.notEqual(title, 'Summer sale');
      const one = revealEditingInfo(title);
      assert.equal(typeof one, 'string');
      assert.ok(one.includes('Summer sale') && one.includes(href('page-1', 'title')), `revealEditingInfo(string) hid the metadata: ${JSON.stringify(one)}`);
      const response = { data: { page: { title, views: 3, blocks: [{ heading: encode('Free shipping', 'block-9', 'heading') }] } } };
      const revealed = revealEditingInfo(response);
      assert.equal(revealed.data.page.views, 3);
      assert.ok(revealed.data.page.title.includes(href('page-1', 'title')));
      assert.ok(revealed.data.page.blocks[0].heading.includes('Free shipping') && revealed.data.page.blocks[0].heading.includes(href('block-9', 'heading')));
      assert.equal(cleanText(title), 'Summer sale');
      assert.equal(cleanText('Plain'), 'Plain');
      return { revealed: one, cleaned: cleanText(title) };
    },
    controls: {
      pass: { files: { 'src/lib/datocms/stega.ts': svelteStega } },
      fail: [{
        name: 'svelte-reexport',
        files: { 'src/lib/datocms/stega.ts': svelteStega.replace("import { stripStega } from '@datocms/svelte';\nimport { revealStega } from '@datocms/content-link';", "import { stripStega, decodeStega, revealStega } from '@datocms/svelte';") },
      }],
    },
  },
  {
    id: 'astro-content-link-navigation',
    guards: ['skills/datocms-frontend-integrations/references/astro.md', 'skills/datocms-frontend-integrations/references/astro-content-link.md'],
    prompt: "Our Astro site (Node adapter, server output) already has draft mode: `isDraftModeEnabled(Astro.cookies)` in `src/lib/draftMode.ts`, and `src/lib/datocms.ts` returns draft content that already carries DatoCMS Content Link editing metadata (it is a local stand-in for the API; leave it as is). Editors will open these pages inside the DatoCMS Web Previews plugin's Visual tab. Set up DatoCMS click-to-edit there through the shared layout `src/layouts/Layout.astro`, only when draft mode is on (published visitors must not load any of it), and make sure that when an editor picks a different page or record from the Visual tab, the preview actually moves there. Keep `npm run build` working. Dependencies are already installed (don't run npm install or change versions); there is no live DatoCMS project or credentials.",
    budget: { timeoutMs: 420000, maxCommands: 60 },
    async setup(workspace, ctx) {
      const combine = await stega(ctx.root);
      const encode = (text, id, field) => combine(text, { origin: 'datocms.com', href: href(id, field) }, false);
      const articles = { first: ['First article', 'first-id'], second: ['Second article', 'second-id'] };
      const draft = Object.fromEntries(Object.entries(articles).map(([slug, [title, id]]) => [slug, { title: encode(title, id, 'title'), body: encode(`${title} body.`, id, 'body') }]));
      const published = Object.fromEntries(Object.entries(articles).map(([slug, [title]]) => [slug, { title, body: `${title} body.` }]));
      return prepare(workspace, ctx.root, 'web-astro', {
        'astro.config.mjs': "import { defineConfig } from 'astro/config';\nimport node from '@astrojs/node';\n\nexport default defineConfig({\n  output: 'server',\n  adapter: node({ mode: 'standalone' }),\n});\n",
        'tsconfig.json': JSON.stringify({ extends: 'astro/tsconfigs/strict', compilerOptions: { baseUrl: '.', paths: { '~/*': ['src/*'] } } }, null, 2),
        'src/lib/draftMode.ts': "import type { AstroCookies } from 'astro';\n\nexport const DRAFT_MODE_COOKIE_NAME = 'datocms-draft-mode';\n\nexport function isDraftModeEnabled(cookies: AstroCookies) {\n  return cookies.get(DRAFT_MODE_COOKIE_NAME)?.value === 'enabled';\n}\n",
        'src/lib/datocms.ts': `// Local stand-in for the DatoCMS Content Delivery API. Draft reads return the\n// Content Link (stega) metadata the real API adds with contentLink: 'v1'.\nconst published: Record<string, { title: string; body: string }> = ${JSON.stringify(published, null, 2)};\nconst draft: Record<string, { title: string; body: string }> = ${JSON.stringify(draft, null, 2)};\n\nexport async function getArticle(slug: string, { includeDrafts = false } = {}) {\n  return (includeDrafts ? draft : published)[slug] ?? null;\n}\n\nexport async function allSlugs() {\n  return Object.keys(published);\n}\n`,
        'src/layouts/Layout.astro': astroLayout(),
        'src/pages/index.astro': "---\nimport Layout from '~/layouts/Layout.astro';\nimport { allSlugs } from '~/lib/datocms';\n\nconst slugs = await allSlugs();\n---\n\n<Layout title=\"Journal\">\n  <h1>Journal</h1>\n  <ul>{slugs.map((slug) => <li><a href={`/articles/${slug}`}>{slug}</a></li>)}</ul>\n</Layout>\n",
        'src/pages/articles/[slug].astro': "---\nimport Layout from '~/layouts/Layout.astro';\nimport { getArticle } from '~/lib/datocms';\nimport { isDraftModeEnabled } from '~/lib/draftMode';\n\nconst article = await getArticle(Astro.params.slug!, { includeDrafts: isDraftModeEnabled(Astro.cookies) });\nif (!article) return new Response(null, { status: 404 });\n---\n\n<Layout title=\"Article\">\n  <article>\n    <h1>{article.title}</h1>\n    <p>{article.body}</p>\n  </article>\n</Layout>\n",
      });
    },
    check: astroNavigation,
    controls: {
      pass: { files: { 'src/layouts/Layout.astro': astroLayout("import { ContentLink } from '@datocms/astro/ContentLink';", '{draftMode && <ContentLink />}') } },
      fail: [{
        name: 'bare-controller',
        files: {
          'src/components/ContentLink.astro': "<div id=\"content-link-init\"></div>\n\n<script>\n  import { createController } from '@datocms/content-link';\n\n  const controller = createController();\n  controller.enableClickToEdit();\n</script>\n",
          'src/layouts/Layout.astro': astroLayout("import ContentLink from '~/components/ContentLink.astro';", '{draftMode && <ContentLink />}'),
        },
      }, {
        name: 'ungated',
        files: { 'src/layouts/Layout.astro': astroLayout("import { ContentLink } from '@datocms/astro/ContentLink';", '<ContentLink />') },
      }],
    },
  },
];
