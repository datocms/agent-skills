import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Reuses the plugin fixture: datocms-plugin-sdk 2.4.2 (first line with the >=2.4 upload metadata shape), react-ui, vite, playwright.
const fixture = resolve(import.meta.dirname, '../../catalog/plugin');
const modules = join(fixture, 'node_modules');
const sdk = () => createRequire(join(fixture, 'package.json'))('datocms-plugin-sdk');
const sdkFieldTypes = () => [...readFileSync(join(modules, 'datocms-plugin-sdk/dist/types/hooks/manualFieldExtensions.d.ts'), 'utf8')
  .match(/export type FieldType =([^;]+);/)[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);

const COMPILER = {
  target: 'ES2022', lib: ['ES2023', 'DOM', 'DOM.Iterable'], module: 'ESNext', skipLibCheck: true, moduleResolution: 'bundler',
  allowImportingTsExtensions: true, isolatedModules: true, moduleDetection: 'force', noEmit: true, jsx: 'react-jsx', strict: true,
  noFallthroughCasesInSwitch: true, types: ['vite/client'],
};
// Existing private plugin the actor patches (scaffold per project-scaffold.md, fixture-pinned dependencies).
const seed = () => {
  const { dependencies, devDependencies, overrides } = JSON.parse(readFileSync(join(fixture, 'package.json'), 'utf8'));
  delete devDependencies.playwright;
  return {
    'package.json': JSON.stringify({
      name: 'datocms-plugin-studio-tools', version: '0.1.0', private: true, type: 'module', keywords: ['datocms-plugin'],
      datoCmsPlugin: { title: 'Studio tools', entryPoint: 'dist/index.html', permissions: [] }, files: ['dist'],
      scripts: { dev: 'vite', build: 'tsc -b && vite build' }, dependencies, devDependencies, overrides,
    }, null, 2),
    'tsconfig.json': JSON.stringify({ files: [], references: [{ path: './tsconfig.app.json' }, { path: './tsconfig.node.json' }] }, null, 2),
    'tsconfig.app.json': JSON.stringify({ compilerOptions: { ...COMPILER, noUnusedLocals: true, noUnusedParameters: true }, include: ['src'] }, null, 2),
    'tsconfig.node.json': JSON.stringify({ compilerOptions: { ...COMPILER, lib: ['ES2023'], types: [] }, include: ['vite.config.ts'] }, null, 2),
    'vite.config.ts': "import { defineConfig } from 'vite';\n\nexport default defineConfig({ base: './' });\n",
    'index.html': '<!doctype html>\n<html lang="en">\n  <head><meta charset="UTF-8" /><title>Studio tools</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n',
    'src/utils/render.tsx': `import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');
const root = createRoot(container);

export function render(component: ReactNode) {
  root.render(<StrictMode>{component}</StrictMode>);
}
`,
    'src/entrypoints/ConfigScreen.tsx': `import type { RenderConfigScreenCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';

export default function ConfigScreen({ ctx }: { ctx: RenderConfigScreenCtx }) {
  return <Canvas ctx={ctx}><p>No settings yet.</p></Canvas>;
}
`,
    'src/main.tsx': mainSource(),
  };
};
function mainSource({ imports = '', hooks = '' } = {}) {
  return `import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import ConfigScreen from './entrypoints/ConfigScreen';
${imports}import 'datocms-react-ui/styles.css';

connect({
  renderConfigScreen(ctx) {
    render(<ConfigScreen ctx={ctx} />);
  },${hooks}
});
`;
}

const OPENERS = ['open', 'xdg-open', 'start', 'osascript'];
function setupWorkspace(workspace, extra = {}) {
  assert.ok(existsSync(modules), 'Install e2e/catalog/plugin dependencies first');
  for (const [path, content] of Object.entries({ ...seed(), ...extra })) {
    mkdirSync(dirname(join(workspace, path)), { recursive: true });
    writeFileSync(join(workspace, path), content);
  }
  symlinkSync(modules, join(workspace, 'node_modules'));
  // Actor HOME/XDG sandbox; browser openers are no-op shims (vite --open or similar never reaches a real browser).
  const oracle = join(workspace, '..', 'oracle'), bin = join(oracle, 'bin'), home = join(oracle, 'home');
  const environment = { HOME: home, XDG_CONFIG_HOME: join(home, '.config'), XDG_DATA_HOME: join(home, '.local/share'), XDG_CACHE_HOME: join(home, '.cache'), PATH: `${bin}:${process.env.PATH}`, BROWSER: join(bin, 'open') };
  for (const dir of [bin, home, environment.XDG_CONFIG_HOME, environment.XDG_DATA_HOME, environment.XDG_CACHE_HOME]) mkdirSync(dir, { recursive: true });
  for (const tool of OPENERS) writeFileSync(join(bin, tool), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  for (const rc of ['.zprofile', '.bash_profile']) writeFileSync(join(home, rc), `export PATH=${JSON.stringify(bin)}:"$PATH"\n`);
  return { environment };
}

const tsc = (project) => spawnSync(process.execPath, [join(modules, 'typescript/bin/tsc'), '-p', project], { encoding: 'utf8' });
// Oracle-owned typecheck (the actor cannot loosen it) plus the plugin's own production build.
function typecheckAndBuild(workspace, out) {
  assert.ok(existsSync(join(workspace, 'src/main.tsx')), 'src/main.tsx missing');
  mkdirSync(out, { recursive: true });
  if (!existsSync(join(out, 'node_modules'))) symlinkSync(modules, join(out, 'node_modules'));
  writeFileSync(join(out, 'tsconfig.json'), JSON.stringify({ compilerOptions: COMPILER, include: [join(workspace, 'src')] }, null, 2));
  const checked = tsc(join(out, 'tsconfig.json'));
  writeFileSync(join(out, 'tsc.log'), checked.stdout + checked.stderr);
  assert.equal(checked.status, 0, `Typecheck against the installed SDK failed: ${checked.stdout.trim().split('\n')[0]}`);
  const built = spawnSync('npm', ['run', 'build'], { cwd: workspace, encoding: 'utf8', timeout: 180000 });
  writeFileSync(join(out, 'build.log'), (built.stdout ?? '') + (built.stderr ?? ''));
  assert.equal(built.status, 0, 'npm run build failed');
  assert.ok(existsSync(join(workspace, 'dist/index.html')), 'dist/index.html missing');
}

// Controlled host speaking the installed SDK's penpal protocol; every host method call is recorded.
const HOST = `
import connectToChild from 'penpal/lib/connectToChild';
window.calls = [];
const log = (name, result) => (...args) => { window.calls.push({ name, args: JSON.parse(JSON.stringify(args)) }); return result; };
const methods = { getSettings: () => window.settings, setHeight: () => {} };
for (const name of ['notice', 'alert', 'navigateTo', 'select', 'scrollToField', 'toggleField', 'disableField', 'setFieldValue', 'saveCurrentItem', 'updateFieldAppearance', 'updatePluginParameters', 'setParameters']) methods[name] = log(name);
for (const name of ['customToast', 'openModal', 'openConfirm', 'editItem', 'createNewItem', 'selectItem', 'selectUpload', 'editUpload', 'editUploadMetadata']) methods[name] = log(name, null);
for (const name of ['loadItemTypeFields', 'loadItemTypeFieldsets', 'loadFieldsUsingPlugin', 'loadUsers', 'loadSsoUsers']) methods[name] = log(name, []);
window.ready = connectToChild({ iframe: document.querySelector('iframe'), timeout: 10000, methods }).promise.then((child) => { window.plugin = child; });
`;
const ITEM_TYPE = { id: 'model-1', type: 'item_type', attributes: { api_key: 'landing_page', name: 'Landing page' }, relationships: {} };
const settings = (patch) => ({
  plugin: { id: 'plugin-1', type: 'plugin', attributes: { name: 'Studio tools', parameters: {} } },
  currentRole: { id: 'role-1', type: 'role', attributes: { name: 'Admin' }, meta: { final_permissions: { can_edit_schema: true } } },
  currentUser: { id: 'user-1', type: 'user', attributes: { email: 'editor@example.com' } },
  site: { id: 'site-1', type: 'site', attributes: { locales: ['en', 'it'] } }, environment: 'main', isEnvironmentPrimary: true,
  itemTypes: { 'model-1': ITEM_TYPE }, fields: {}, fieldsets: {}, users: {}, ssoUsers: {}, ui: { locale: 'en' }, theme: {},
  cssDesignTokens: { '--color--surface': 'rgb(255, 255, 255)', '--color--ink': 'rgb(20, 20, 20)', '--color--border': 'rgb(210, 210, 210)' },
  colorScheme: 'light', bodyPadding: [0, 0, 0, 0], mode: 'renderConfigScreen', ...patch,
});

async function withHost(workspace, out, fn) {
  const { chromium } = await import(pathToFileURL(join(modules, 'playwright/index.mjs')).href);
  const hostJs = (await build({ stdin: { contents: HOST, resolveDir: fixture, loader: 'js' }, bundle: true, write: false, platform: 'browser', format: 'iife' })).outputFiles[0].text;
  const dist = resolve(workspace, 'dist');
  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/host') return res.end('<!doctype html><html><body><iframe title="Plugin" src="/index.html" style="width:900px;height:600px"></iframe><script src="/host.js"></script></body></html>');
    if (path === '/host.js') return res.setHeader('content-type', 'text/javascript'), res.end(hostJs);
    const file = resolve(dist, '.' + path);
    if (!file.startsWith(dist + '/') || !existsSync(file)) return res.writeHead(404).end();
    res.setHeader('content-type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[extname(file)] ?? 'application/octet-stream');
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome', headless: true });
  const errors = [], evidence = {};
  const open = async (value) => {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route((url) => url.hostname !== '127.0.0.1', (route) => route.abort());
    await page.addInitScript((s) => { window.settings = s; }, value);
    await page.goto(`http://127.0.0.1:${server.address().port}/host`);
    await page.evaluate(() => window.ready);
    return page;
  };
  const waitForCall = (page, name, message) => page.waitForFunction((n) => window.calls.some((c) => c.name === n), name, { timeout: 8000 })
    .catch(() => assert.fail(message)).then(() => page.evaluate((n) => window.calls.filter((c) => c.name === n), name));
  try {
    const result = await fn({ open, waitForCall, evidence });
    assert.deepEqual(errors, [], `Browser runtime errors: ${errors[0]}`);
    return result ?? evidence;
  } finally {
    writeFileSync(join(out, 'browser.json'), JSON.stringify({ evidence, errors }, null, 2));
    await browser.close();
    await new Promise((r) => server.close(r));
  }
}

// ---------- plugin-2: asset source default_field_metadata (SDK >=2.4 shape) ----------
const PHOTOS = [
  { id: 'p1', url: 'https://images.example.com/p1.jpg', caption: 'Harbour at dawn', photographer: 'Ana Ruiz' },
  { id: 'p2', url: 'https://images.example.com/p2.jpg', caption: 'Market street at noon', photographer: 'Luca Bini' },
];
const photosFile = `export type Photo = { id: string; url: string; caption: string; photographer: string };

export const photos: Photo[] = ${JSON.stringify(PHOTOS, null, 2)};
`;
const assetSourceFiles = (metadata) => ({
  'src/main.tsx': mainSource({
    imports: "import StudioPhotos from './entrypoints/StudioPhotos';\n",
    hooks: `
  assetSources() {
    return [{ id: 'studio-photos', name: 'Studio photos', icon: 'camera', modal: { width: 'l' } }];
  },
  renderAssetSource(assetSourceId, ctx) {
    switch (assetSourceId) {
      case 'studio-photos':
        render(<StudioPhotos ctx={ctx} />);
        break;
    }
  },`,
  }),
  'src/entrypoints/StudioPhotos.tsx': `import type { RenderAssetSourceCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';
import { photos, type Photo } from '../photos';

export default function StudioPhotos({ ctx }: { ctx: RenderAssetSourceCtx }) {
  const pick = (photo: Photo) => {
    const locales = ctx.site.attributes.locales;
    ctx.select({
      resource: { url: photo.url, filename: \`\${photo.id}.jpg\` },
      author: photo.photographer,
      default_field_metadata: ${metadata},
    });
  };
  return (
    <Canvas ctx={ctx}>
      {photos.map((photo) => (
        <button key={photo.id} type="button" onClick={() => pick(photo)}>
          <img src={photo.url} alt={photo.caption} width={120} />
          <span>{photo.caption}</span>
        </button>
      ))}
    </Canvas>
  );
}
`,
});

// ---------- plugin-7: navigateTo path prefix follows the declaring hook ----------
// Mirrors datocms/cms routes: src/routes/(authenticated)/index.tsx mounts `${baseUrl}/p/:pluginId/pages/:pageId`
// (top navigation), and configuration/index.tsx and editor/index.tsx mount the same pattern under /configuration and /editor.
const route = (path) => {
  const m = /^(?:\/environments\/main)?(\/configuration|\/editor)?\/p\/([^/?#]+)\/pages\/([^/?#]+)\/?(\?[^#]*)?(#.*)?$/.exec(path);
  return m && { area: m[1] ? m[1].slice(1) : 'topNavigation', pluginId: decodeURIComponent(m[2]), pageId: decodeURIComponent(m[3]), query: Object.fromEntries(new URLSearchParams(m[4] ?? '')) };
};
// The link starts on the config screen, which has no ctx.location to derive a page path from.
const navigationFiles = (path) => ({
  'src/main.tsx': mainSource({
    imports: "import ReportsPage from './entrypoints/ReportsPage';\n",
    hooks: `
  mainNavigationTabs() {
    return [{ label: 'Reports', icon: 'chart-bar', pointsTo: { pageId: 'reports' } }];
  },
  renderPage(pageId, ctx) {
    switch (pageId) {
      case 'reports':
        render(<ReportsPage ctx={ctx} />);
        break;
    }
  },`,
  }),
  'src/entrypoints/ConfigScreen.tsx': `import type { RenderConfigScreenCtx } from 'datocms-plugin-sdk';
import { Button, Canvas } from 'datocms-react-ui';

export default function ConfigScreen({ ctx }: { ctx: RenderConfigScreenCtx }) {
  const environmentPrefix = ctx.isEnvironmentPrimary ? '' : \`/environments/\${ctx.environment}\`;
  return (
    <Canvas ctx={ctx}>
      <Button onClick={() => ctx.navigateTo(\`\${environmentPrefix}${path}?year=2025\`)}>Open 2025 reports</Button>
    </Canvas>
  );
}
`,
  'src/entrypoints/ReportsPage.tsx': `import type { RenderPageCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';

export default function ReportsPage({ ctx }: { ctx: RenderPageCtx }) {
  const year = new URLSearchParams(ctx.location.search).get('year');
  return <Canvas ctx={ctx} noAutoResizer><h1>{year ? \`Reports for \${year}\` : 'Reports'}</h1></Canvas>;
}
`,
});

// ---------- leftover-2: addon on single block fields (no single_block FieldType) ----------
const HERO = {
  id: 'field-hero', type: 'field', relationships: { item_type: { data: { id: 'model-1', type: 'item_type' } } },
  attributes: { api_key: 'hero', label: 'Hero', field_type: 'single_block', localized: false, validators: { single_block_blocks: { item_types: ['block-1'] } }, appearance: { editor: 'framed_single_block', parameters: {}, addons: [] } },
};
const TITLE = { ...HERO, id: 'field-title', attributes: { ...HERO.attributes, api_key: 'title', label: 'Title', field_type: 'string', validators: {}, appearance: { editor: 'single_line', parameters: {}, addons: [] } } };
const HINT = 'Keep this block under 200 words.';
const singleBlockFiles = (hooks) => ({
  'src/main.tsx': mainSource({ imports: "import BlockHint from './entrypoints/BlockHint';\n", hooks }),
  'src/entrypoints/BlockHint.tsx': `import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';

export default function BlockHint({ ctx }: { ctx: RenderFieldExtensionCtx }) {
  return <Canvas ctx={ctx}><p style={{ color: 'var(--color--ink-subtle)' }}>${HINT}</p></Canvas>;
}
`,
});
const renderHint = `
  renderFieldExtension(fieldExtensionId, ctx) {
    switch (fieldExtensionId) {
      case 'block-hint':
        render(<BlockHint ctx={ctx} />);
        break;
    }
  },`;
const manualHint = (fieldTypes) => `
  manualFieldExtensions() {
    return [{ id: 'block-hint', name: 'Block length hint', type: 'addon', fieldTypes: ${fieldTypes} }];
  },${renderHint}`;

// Forcing the string past the SDK types (runtime-only; FieldType has no single_block).
const castFiles = () => {
  const files = singleBlockFiles(manualHint("['single_block'] as unknown as FieldType[]"));
  files['src/main.tsx'] = files['src/main.tsx'].replace("import { connect } from 'datocms-plugin-sdk';", "import { connect, type FieldType } from 'datocms-plugin-sdk';");
  return files;
};

const PROMPT_TAIL = `There is no DatoCMS project and there are no credentials, so do not try to install, publish or deploy the plugin. Its dependencies are already installed: do not install or add packages. Make sure \`npm run build\` passes before you finish.`;

export default [
  {
    id: 'plugin-asset-source-default-metadata',
    guards: ['skills/datocms-plugin/references/asset-sources.md'],
    budget: { timeoutMs: 480000, maxCommands: 70 },
    prompt: `This directory is an existing private DatoCMS plugin (Vite + React + TypeScript). Add a Media Area asset source called "Studio photos" that lets editors import one of the photos listed in \`src/photos.ts\`. Show each photo as a thumbnail with its caption; clicking a photo imports it straight away. The imported asset should get the photographer as its author, and the photo's caption as its default alt text in every locale of the project.

${PROMPT_TAIL}`,
    setup: (workspace) => setupWorkspace(workspace, { 'src/photos.ts': photosFile }),
    async check(workspace, { directory }) {
      const out = join(directory, 'check');
      typecheckAndBuild(workspace, out);
      const { isReturnTypeOfAssetSourcesHook } = sdk();
      return withHost(workspace, out, async ({ open, waitForCall, evidence }) => {
        const boot = await open(settings());
        const sources = evidence.assetSources = await boot.evaluate(() => window.plugin.assetSources?.(window.settings));
        assert.ok(isReturnTypeOfAssetSourcesHook(sources) && sources.length, 'assetSources() returned no valid asset source (SDK guard)');
        const source = sources.find((s) => /studio photos/i.test(s.name)) ?? sources[0];
        const page = await open(settings({ mode: 'renderAssetSource', assetSourceId: source.id }));
        const frame = page.frameLocator('iframe'), photo = PHOTOS[1], name = new RegExp(photo.caption, 'i');
        await frame.getByRole('button', { name }).or(frame.getByAltText(name)).or(frame.getByText(name)).first().click();
        const [call] = evidence.select = await waitForCall(page, 'select', 'Clicking a photo did not call ctx.select()');
        const upload = call.args[0];
        assert.equal(upload?.resource?.url, photo.url, 'Selected upload does not point at the photo URL');
        assert.equal(upload.author, photo.photographer, 'Author is not the photographer');
        const metadata = upload.default_field_metadata;
        assert.ok(metadata && typeof metadata === 'object', 'No default_field_metadata sent');
        // SDK >=2.4 NewUploadDefaultFieldMetadata; the locale-keyed form is NewUploadLocaleKeyedDefaultFieldMetadata (@deprecated).
        const probe = join(out, 'metadata');
        mkdirSync(probe, { recursive: true });
        if (!existsSync(join(probe, 'node_modules'))) symlinkSync(modules, join(probe, 'node_modules'));
        writeFileSync(join(probe, 'metadata.ts'), `import type { NewUploadDefaultFieldMetadata } from 'datocms-plugin-sdk';\nexport const metadata: NewUploadDefaultFieldMetadata = ${JSON.stringify(metadata, null, 2)};\n`);
        writeFileSync(join(probe, 'tsconfig.json'), JSON.stringify({ compilerOptions: { ...COMPILER, types: [] }, files: ['metadata.ts'] }));
        const typed = tsc(join(probe, 'tsconfig.json'));
        writeFileSync(join(probe, 'tsc.log'), typed.stdout + typed.stderr);
        assert.equal(typed.status, 0, `default_field_metadata is not the current NewUploadDefaultFieldMetadata shape: ${typed.stdout.trim().split('\n')[0]}`);
        assert.deepEqual(metadata.alt, { en: photo.caption, it: photo.caption }, 'Alt text is not the caption in every project locale');
      });
    },
    controls: {
      pass: { files: assetSourceFiles('{ alt: Object.fromEntries(locales.map((locale) => [locale, photo.caption])) }') },
      fail: [
        { name: 'locale-keyed-metadata', files: assetSourceFiles('Object.fromEntries(locales.map((locale) => [locale, { alt: photo.caption, title: null, custom_data: {} }]))') },
      ],
    },
  },
  {
    id: 'plugin-top-nav-page-path',
    guards: ['skills/datocms-plugin/references/custom-pages.md'],
    budget: { timeoutMs: 480000, maxCommands: 70 },
    prompt: `This directory is an existing private DatoCMS plugin (Vite + React + TypeScript). Add a "Reports" page to the DatoCMS top navigation bar that shows "Reports for <year>" using the \`year\` URL query-string parameter, or just "Reports" when no year is given. In the plugin's configuration screen, add a button labelled "Open 2025 reports" that takes the user to that page with \`year=2025\` in the URL query string.

${PROMPT_TAIL}`,
    setup: (workspace) => setupWorkspace(workspace),
    async check(workspace, { directory }) {
      const out = join(directory, 'check');
      typecheckAndBuild(workspace, out);
      const { isReturnTypeOfMainNavigationTabsHook } = sdk();
      return withHost(workspace, out, async ({ open, waitForCall, evidence }) => {
        const config = await open(settings());
        const tabs = evidence.tabs = await config.evaluate(() => window.plugin.mainNavigationTabs?.(window.settings));
        assert.ok(isReturnTypeOfMainNavigationTabsHook(tabs), 'mainNavigationTabs() result rejected by the SDK guard');
        const reports = tabs.find((t) => /^reports$/i.test(t.label.trim()))?.pointsTo?.pageId;
        assert.ok(reports, 'Top navigation needs a "Reports" tab pointing to a page');
        const frame = config.frameLocator('iframe'), name = /open 2025 reports/i;
        await frame.getByRole('button', { name }).or(frame.getByRole('link', { name })).first().click();
        const [call] = evidence.navigateTo = await waitForCall(config, 'navigateTo', 'The config screen button did not call ctx.navigateTo()');
        const target = evidence.route = route(String(call.args[0]));
        assert.ok(target, `navigateTo path matches no DatoCMS plugin page route: ${call.args[0]}`);
        assert.deepEqual({ area: target.area, pluginId: target.pluginId, pageId: target.pageId }, { area: 'topNavigation', pluginId: 'plugin-1', pageId: reports },
          `navigateTo(${call.args[0]}) does not open the top-navigation Reports page`);
        assert.equal(target.query.year, '2025', 'year=2025 missing from the query string');
      });
    },
    controls: {
      pass: { files: navigationFiles('/p/${ctx.plugin.id}/pages/reports') },
      fail: [{ name: 'settings-area-path', files: navigationFiles('/configuration/p/${ctx.plugin.id}/pages/reports') }],
    },
  },
  {
    id: 'plugin-single-block-addon',
    guards: ['skills/datocms-plugin/SKILL.md', 'skills/datocms-plugin/references/sdk-context-and-cma.md', 'skills/datocms-plugin/references/field-extensions.md'],
    budget: { timeoutMs: 480000, maxCommands: 70 },
    prompt: `This directory is an existing private DatoCMS plugin (Vite + React + TypeScript). Add a field addon that shows the hint "${HINT}" underneath single block fields in the record editor. Don't change how those fields themselves are edited.

${PROMPT_TAIL}`,
    setup: (workspace) => setupWorkspace(workspace),
    async check(workspace, { directory }) {
      const out = join(directory, 'check');
      typecheckAndBuild(workspace, out);
      const { isReturnTypeOfManualFieldExtensionsHook, isFieldExtensionOverride } = sdk();
      const fieldTypes = sdkFieldTypes();
      return withHost(workspace, out, async ({ open, evidence }) => {
        const boot = await open(settings());
        const manual = evidence.manual = await boot.evaluate(() => window.plugin.manualFieldExtensions?.(window.settings) ?? []);
        assert.ok(isReturnTypeOfManualFieldExtensionsHook(manual), 'manualFieldExtensions() result rejected by the SDK guard');
        const unsupported = manual.flatMap((e) => (Array.isArray(e.fieldTypes) ? e.fieldTypes : [])).filter((t) => !fieldTypes.includes(t));
        assert.deepEqual(unsupported, [], `fieldTypes outside the installed SDK FieldType union: ${unsupported}`);
        const overrides = evidence.overrides = await boot.evaluate(([fields, ctx]) => window.plugin.overrideFieldExtensions?.(fields, ctx), [[HERO, TITLE], settings()]);
        const forced = overrides?.[HERO.id];
        assert.ok(isFieldExtensionOverride(forced), 'overrideFieldExtensions() result rejected by the SDK guard');
        assert.ok(!forced?.editor, 'The plugin replaces the single block editor');
        assert.ok(!overrides?.[TITLE.id]?.editor && !overrides?.[TITLE.id]?.addons?.length, 'The plugin forces extensions on a string field too');
        // DatoCMS offers a manual extension on a field when fieldTypes === 'all' or includes the field type
        // (datocms/cms internalFieldExtensionUtils.tsx) and renders override addons under single block fields (SingleBlock.tsx).
        const candidates = [
          ...manual.filter((e) => e.type === 'addon' && (e.fieldTypes === 'all' || e.fieldTypes.includes('single_block'))).map((e) => ({ id: e.id, parameters: {} })),
          ...(forced?.addons ?? []).map((a) => ({ id: a.id, parameters: a.parameters ?? {} })),
        ];
        evidence.candidates = candidates;
        assert.ok(candidates.length, 'No addon reaches single block fields');
        for (const candidate of candidates) {
          const page = await open(settings({
            mode: 'renderFieldExtension', fieldExtensionId: candidate.id, parameters: candidate.parameters, field: HERO, fieldPath: 'hero', locale: 'en',
            disabled: false, formValues: { title: 'Spring launch', hero: null }, item: null, itemStatus: 'new', isSubmitting: false, isFormDirty: false,
            itemType: ITEM_TYPE, blocksAnalysis: { usage: { total: 0, nested: 0 }, maximumBlocksPerRecord: 500 },
          }));
          const shown = await page.frameLocator('iframe').getByText(HINT).first().waitFor().then(() => true, () => false);
          if (shown) return { ...evidence, rendered: candidate.id };
        }
        assert.fail(`No single block addon rendered "${HINT}"`);
      });
    },
    controls: {
      pass: {
        files: singleBlockFiles(`
  overrideFieldExtensions(field) {
    if (field.attributes.field_type === 'single_block') return { addons: [{ id: 'block-hint' }] };
  },${renderHint}`),
      },
      fail: [
        { name: 'single-block-field-type', files: singleBlockFiles(manualHint("['single_block']")) },
        { name: 'single-block-cast', files: castFiles() },
        { name: 'modular-content-only', files: singleBlockFiles(manualHint("['rich_text']")) },
        {
          name: 'override-every-field',
          files: singleBlockFiles(`
  overrideFieldExtensions() {
    return { addons: [{ id: 'block-hint' }] };
  },${renderHint}`),
        },
      ],
    },
  },
];
