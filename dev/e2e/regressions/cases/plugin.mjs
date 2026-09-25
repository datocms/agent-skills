import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const fixture = resolve(import.meta.dirname, '../../catalog/plugin');
const modules = join(fixture, 'node_modules');
const WORDS = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda';

// Documented scaffold strictness, applied to src regardless of the actor's tsconfig (lib widened so newer ES APIs are not a false reject).
const strictTsconfig = (workspace) => ({
  compilerOptions: {
    target: 'ES2022', lib: ['ES2023', 'DOM', 'DOM.Iterable'], module: 'ESNext', skipLibCheck: true,
    moduleResolution: 'bundler', allowImportingTsExtensions: true, isolatedModules: true, moduleDetection: 'force',
    noEmit: true, jsx: 'react-jsx', strict: true, noUnusedLocals: true, noUnusedParameters: true,
    noFallthroughCasesInSwitch: true, types: ['vite/client'],
  },
  include: [join(workspace, 'src')],
});

// Speaks the installed SDK's penpal protocol; every host method call is recorded.
const HOST = `
import connectToChild from 'penpal/lib/connectToChild';
const q = new URLSearchParams(location.search);
window.calls = [];
const log = (name, result) => (...args) => { window.calls.push({ name, args: JSON.parse(JSON.stringify(args)) }); return result; };
const base = {
  plugin: { id: 'plugin-1', type: 'plugin', attributes: { name: 'Word count', parameters: {} } },
  currentRole: { id: 'role-1', type: 'role', attributes: { name: 'Admin' }, meta: { final_permissions: { can_edit_schema: true } } },
  currentUser: { id: 'user-1', type: 'user', attributes: { email: 'editor@example.com' } },
  site: { id: 'site-1', type: 'site', attributes: { locales: ['en'] } }, environment: 'main', isEnvironmentPrimary: true,
  itemTypes: {}, fields: {}, fieldsets: {}, users: {}, ssoUsers: {}, ui: { locale: 'en' }, theme: {},
  cssDesignTokens: { '--color--surface': 'rgb(255, 255, 255)', '--color--ink': 'rgb(20, 20, 20)', '--color--border': 'rgb(210, 210, 210)' },
  colorScheme: 'light', bodyPadding: [0, 0, 0, 0],
};
window.settings = q.get('mode') === 'renderFieldExtension' ? {
  ...base, mode: 'renderFieldExtension', fieldExtensionId: q.get('id'), parameters: {}, fieldPath: 'body', locale: 'en',
  disabled: false, formValues: { body: ${JSON.stringify(WORDS)} }, item: null, itemStatus: 'new', isSubmitting: false, isFormDirty: false,
  itemType: { id: 'model-1', type: 'item_type', attributes: { api_key: 'article' } },
  field: { id: 'field-body', type: 'field', attributes: { api_key: 'body', label: 'Body', field_type: 'text', localized: false, validators: {}, appearance: { editor: 'textarea', parameters: {}, addons: [] } } },
  blocksAnalysis: { usage: { total: 0, nested: 0 }, maximumBlocksPerRecord: 500 },
} : { ...base, mode: 'renderConfigScreen' };
const methods = { getSettings: () => window.settings, setHeight: () => {} };
for (const name of ['notice', 'alert', 'navigateTo', 'scrollToField', 'toggleField', 'disableField', 'saveCurrentItem', 'updateFieldAppearance']) methods[name] = log(name);
for (const name of ['customToast', 'openModal', 'openConfirm', 'editItem', 'createNewItem', 'selectItem', 'selectUpload']) methods[name] = log(name, null);
for (const name of ['loadItemTypeFields', 'loadItemTypeFieldsets', 'loadFieldsUsingPlugin', 'loadUsers', 'loadSsoUsers']) methods[name] = log(name, []);
methods.updatePluginParameters = async (params) => {
  log('updatePluginParameters')(params);
  window.settings = { ...window.settings, plugin: { ...window.settings.plugin, attributes: { ...window.settings.plugin.attributes, parameters: params } } };
  await window.plugin.onChange(window.settings);
};
methods.setFieldValue = async (path, value) => { log('setFieldValue')(path, value); window.settings.formValues[path] = value; await window.plugin.onChange(window.settings); };
window.ready = connectToChild({ iframe: document.querySelector('iframe'), timeout: 10000, methods }).promise.then((child) => { window.plugin = child; });
window.update = async (patch) => { window.settings = { ...window.settings, ...patch }; await window.plugin.onChange(window.settings); };
`;

// Independent requirements are all evaluated; failures are collected so one run shows every broken fact.
async function runInHost(workspace, out, problems) {
  const soft = (fn) => fn().catch((e) => problems.push(e.message.split('\n')[0]));
  const { chromium } = await import(pathToFileURL(join(modules, 'playwright/index.mjs')).href);
  const hostJs = (await build({ stdin: { contents: HOST, resolveDir: fixture, loader: 'js' }, bundle: true, write: false, platform: 'browser', format: 'iife' })).outputFiles[0].text;
  const dist = resolve(workspace, 'dist');
  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/host') return res.end('<!doctype html><html><body><iframe title="Plugin" src="/index.html" style="width:600px;height:400px"></iframe><script src="/host.js"></script></body></html>');
    if (path === '/host.js') return res.setHeader('content-type', 'text/javascript'), res.end(hostJs);
    const file = resolve(dist, '.' + path);
    if (!file.startsWith(dist + '/') || !existsSync(file)) return res.writeHead(404).end();
    res.setHeader('content-type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[extname(file)] ?? 'application/octet-stream');
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome', headless: true });
  const errors = [], evidence = {};
  const open = async (query) => {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route((url) => url.hostname !== '127.0.0.1', (route) => route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/host?${query}`);
    await page.evaluate(() => window.ready);
    return page;
  };
  try {
    const config = await open('mode=renderConfigScreen');
    const declarations = await config.evaluate(() => window.plugin.manualFieldExtensions(window.settings));
    const extension = declarations?.find?.((d) => /word count/i.test(d.name));
    assert.ok(extension, 'No manual field extension named "Word count"');
    evidence.declaration = extension;
    await soft(async () => {
      const sdkTypes = readFileSync(join(modules, 'datocms-plugin-sdk/dist/types/hooks/manualFieldExtensions.d.ts'), 'utf8');
      const fieldTypes = [...sdkTypes.match(/export type FieldType =([^;]+);/)[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
      assert.ok(Array.isArray(extension.fieldTypes), 'fieldTypes must list the requested field types');
      const unsupported = extension.fieldTypes.filter((t) => !fieldTypes.includes(t));
      assert.deepEqual(unsupported, [], `fieldTypes not accepted by the installed SDK: ${unsupported}`);
      for (const t of ['string', 'text', 'rich_text']) assert.ok(extension.fieldTypes.includes(t), `Word count unavailable on ${t} fields`);
    });

    await soft(async () => {
      const frame = config.frameLocator('iframe');
      await frame.getByLabel(/target word count/i).fill('300');
      await frame.getByRole('button', { name: /save/i }).click();
      const toast = (c) => c.name === 'notice' || (c.name === 'customToast' && c.args[0]?.type !== 'alert');
      await config.waitForFunction((src) => window.calls.some(eval(src)), toast.toString(), { timeout: 8000 })
        .catch(() => assert.fail('Save did not trigger a host toast (ctx.notice/customToast)'));
      const calls = evidence.configCalls = await config.evaluate(() => window.calls);
      const saved = calls.findIndex((c) => c.name === 'updatePluginParameters' && /\b300\b/.test(JSON.stringify(c.args)));
      assert.ok(saved >= 0, 'Save did not store the target word count in plugin parameters');
      assert.ok(calls.findIndex(toast) > saved, 'Success toast shown before parameters were saved');
    });

    await soft(async () => {
      const field = await open(`mode=renderFieldExtension&id=${encodeURIComponent(extension.id)}`);
      const body = field.frameLocator('iframe').locator('body');
      await body.filter({ hasText: /\b11\b/ }).waitFor().catch(() => assert.fail('Word count 11 not rendered'));
      await field.evaluate(() => window.update({ formValues: { body: 'one two three' } }));
      await body.filter({ hasText: /\b3\b/ }).waitFor().catch(() => assert.fail('Word count did not refresh to 3'));
      assert.doesNotMatch(await body.innerText(), /\b11\b/);
      await field.screenshot({ path: join(out, 'field.png') });
    });
    if (errors.length) problems.push(`Browser runtime errors: ${errors[0]}`);
    return evidence;
  } finally {
    writeFileSync(join(out, 'browser.json'), JSON.stringify({ evidence, problems, errors }, null, 2));
    await browser.close();
    await new Promise((r) => server.close(r));
  }
}

const files = {
  'package.json': JSON.stringify({
    name: 'datocms-plugin-word-count', version: '0.1.0', private: true, type: 'module', keywords: ['datocms-plugin'],
    datoCmsPlugin: { title: 'Word count', entryPoint: 'dist/index.html', permissions: [] }, files: ['dist'],
    scripts: { dev: 'vite', build: 'tsc -b && vite build' },
    ...JSON.parse(readFileSync(join(fixture, 'package.json'), 'utf8')), name: 'datocms-plugin-word-count', private: undefined,
  }, null, 2),
  'tsconfig.json': JSON.stringify({ files: [], references: [{ path: './tsconfig.app.json' }, { path: './tsconfig.node.json' }] }),
  'tsconfig.app.json': JSON.stringify({ ...strictTsconfig('.'), include: ['src'] }),
  'tsconfig.node.json': JSON.stringify({ compilerOptions: { ...strictTsconfig('.').compilerOptions, lib: ['ES2023'], types: [] }, include: ['vite.config.ts'] }),
  'vite.config.ts': "import { defineConfig } from 'vite';\nexport default defineConfig({ base: './' });\n",
  'index.html': '<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>Word count</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
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
  'src/entrypoints/WordCount.tsx': `import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { Canvas } from 'datocms-react-ui';
import { get } from 'lodash-es';
const count = (value: unknown): number =>
  typeof value === 'string' ? value.split(/\\s+/).filter(Boolean).length
  : value && typeof value === 'object' ? Object.values(value).reduce((sum: number, v) => sum + count(v), 0) : 0;
export default function WordCount({ ctx }: { ctx: RenderFieldExtensionCtx }) {
  return <Canvas ctx={ctx}><span>{count(get(ctx.formValues, ctx.fieldPath))} words</span></Canvas>;
}
`,
  'src/entrypoints/ConfigScreen.tsx': `import type { RenderConfigScreenCtx } from 'datocms-plugin-sdk';
import { Button, Canvas, Form, TextField } from 'datocms-react-ui';
import { useState } from 'react';
export default function ConfigScreen({ ctx }: { ctx: RenderConfigScreenCtx }) {
  const saved = ctx.plugin.attributes.parameters as { targetWordCount?: number };
  const [target, setTarget] = useState(String(saved.targetWordCount ?? ''));
  const save = async () => {
    await ctx.updatePluginParameters({ targetWordCount: Number(target) });
    await ctx.notice('Settings saved');
  };
  return (
    <Canvas ctx={ctx}>
      <Form onSubmit={save}>
        <TextField id="target" name="target" label="Target word count" value={target} onChange={setTarget} textInputProps={{ type: 'number' }} />
        <Button type="submit" buttonType="primary">Save</Button>
      </Form>
    </Canvas>
  );
}
`,
};
const main = ({ fieldTypes = "['string', 'text', 'rich_text']", render = `switch (fieldExtensionId) {
      case 'word-count':
        render(<WordCount ctx={ctx} />);
        break;
    }`, params = 'fieldExtensionId, ctx', head = '' } = {}) => `import { connect } from 'datocms-plugin-sdk';
${head}import { render } from './utils/render';
import WordCount from './entrypoints/WordCount';
import ConfigScreen from './entrypoints/ConfigScreen';
import 'datocms-react-ui/styles.css';
connect({
  manualFieldExtensions() {
    return [{ id: 'word-count', name: 'Word count', type: 'addon', fieldTypes: ${fieldTypes} }];
  },
  renderFieldExtension(${params}) {
    ${render}
  },
  renderConfigScreen(ctx) {
    render(<ConfigScreen ctx={ctx} />);
  },
});
`;

export default [
  {
    id: 'plugin-new-scaffold-strict',
    guards: [
      'skills/datocms-plugin/references/project-scaffold.md',
      'skills/datocms-plugin/references/field-extensions.md',
      'skills/datocms-plugin/references/modals.md',
      'skills/datocms-plugin/references/dropdown-actions.md',
      'skills/datocms-plugin/references/sdk-connect-and-frames.md',
      'skills/datocms-plugin/references/sdk-context-and-cma.md',
      'skills/datocms-plugin/references/design-datocms-react-ui-bridge.md',
    ],
    budget: { timeoutMs: 480000, maxCommands: 70 },
    prompt: `Create a new private DatoCMS plugin in this directory using the standard DatoCMS plugin project setup (Vite + React + TypeScript, entry point src/main.tsx, index.html at the root, and \`npm run build\` producing dist/). package.json and node_modules are already here: use only the dependencies already installed and do not install or add packages. There is no DatoCMS project and there are no credentials, so do not try to install, publish or deploy the plugin.

The plugin needs:
- A manual field extension named "Word count" that shows the live word count of the field's current value below the field. Editors should be able to add it to single-line text, multi-paragraph text and modular content (\`rich_text\`) fields (not to unrelated field types), and to single block fields too if DatoCMS supports that.
- A plugin configuration screen styled like the rest of the DatoCMS dashboard, with a number input labelled "Target word count" and a "Save" button. Saving stores the value in the plugin settings and then shows a toast notification confirming it was saved.

Make sure the production build passes before you finish.`,
    setup(workspace) {
      assert.ok(existsSync(modules), 'Install e2e/catalog/plugin dependencies first');
      const { dependencies, devDependencies, overrides } = JSON.parse(readFileSync(join(fixture, 'package.json'), 'utf8'));
      delete devDependencies.playwright;
      writeFileSync(join(workspace, 'package.json'), JSON.stringify({ name: 'datocms-plugin-word-count', version: '0.1.0', private: true, type: 'module', dependencies, devDependencies, overrides }, null, 2));
      symlinkSync(modules, join(workspace, 'node_modules'));
      const home = join(workspace, '..', 'oracle', 'home');
      const environment = { HOME: home, XDG_CONFIG_HOME: join(home, '.config'), XDG_DATA_HOME: join(home, '.local/share'), XDG_CACHE_HOME: join(home, '.cache') };
      Object.values(environment).forEach((dir) => mkdirSync(dir, { recursive: true }));
      return { environment };
    },
    async check(workspace, { directory }) {
      const out = join(directory, 'check');
      mkdirSync(out, { recursive: true });
      assert.ok(existsSync(join(workspace, 'src/main.tsx')), 'src/main.tsx missing');
      if (!existsSync(join(out, 'node_modules'))) symlinkSync(modules, join(out, 'node_modules'));
      writeFileSync(join(out, 'tsconfig.json'), JSON.stringify(strictTsconfig(workspace), null, 2));
      const tsc = spawnSync(process.execPath, [join(modules, 'typescript/bin/tsc'), '-p', join(out, 'tsconfig.json')], { encoding: 'utf8' });
      writeFileSync(join(out, 'tsc.log'), tsc.stdout + tsc.stderr);
      const problems = tsc.status === 0 ? [] : [`Scaffold strict typecheck failed: ${tsc.stdout.trim().split('\n')[0]}`];
      const built = spawnSync('npm', ['run', 'build'], { cwd: workspace, encoding: 'utf8', timeout: 180000 });
      writeFileSync(join(out, 'build.log'), (built.stdout ?? '') + (built.stderr ?? ''));
      assert.equal(built.status, 0, ['npm run build failed', ...problems].join(' | '));
      assert.ok(existsSync(join(workspace, 'dist/index.html')), 'dist/index.html missing');
      const evidence = await runInHost(workspace, out, problems);
      assert.deepEqual(problems, [], problems.join(' | '));
      return evidence;
    },
    controls: {
      pass: { files: { ...files, 'src/main.tsx': main() } },
      fail: [
        { name: 'old-template-unused-id', files: { ...files, 'src/main.tsx': main({ params: 'id, ctx', render: 'render(<WordCount ctx={ctx} />);' }) } },
        {
          name: 'old-template-loosened-tsconfig',
          files: {
            ...files, 'src/main.tsx': main({ params: 'id, ctx', render: 'render(<WordCount ctx={ctx} />);' }),
            'tsconfig.app.json': files['tsconfig.app.json'].replace('"noUnusedParameters":true', '"noUnusedParameters":false'),
          },
        },
        { name: 'single-block-field-type', files: { ...files, 'src/main.tsx': main({ fieldTypes: "['string', 'text', 'rich_text', 'single_block']" }) } },
        { name: 'single-block-asserted', files: { ...files, 'src/main.tsx': main({ head: "import type { FieldType } from 'datocms-plugin-sdk';\n", fieldTypes: "['string', 'text', 'rich_text', 'single_block'] as FieldType[]" }) } },
        {
          name: 'in-iframe-toast',
          files: {
            ...files,
            'src/main.tsx': main(),
            'src/entrypoints/ConfigScreen.tsx': files['src/entrypoints/ConfigScreen.tsx']
              .replace("await ctx.notice('Settings saved');", 'setToast(true);')
              .replace("const save = async", 'const [toast, setToast] = useState(false);\n  const save = async')
              .replace('</Form>', '</Form>\n      {toast && <div role="status" style={{ position: \'fixed\', bottom: 16, right: 16, background: \'var(--color--success-soft--surface)\', color: \'var(--color--success-soft--ink)\' }}>Settings saved</div>}'),
          },
        },
      ],
    },
  },
];
