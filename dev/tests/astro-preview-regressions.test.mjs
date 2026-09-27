import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import vm from 'node:vm';
import ts from 'typescript';

const dev = fileURLToPath(new URL('../', import.meta.url));
const repo = process.env.REFERENCE_REPO_ROOT ? resolve(process.env.REFERENCE_REPO_ROOT) : resolve(dev, '..');
const reference = readFileSync(join(repo, 'skills/datocms-frontend-integrations/references/astro.md'), 'utf8');
const beforeContentLink = reference.split('## Content Link (Optional)')[0];
const realtime = reference.split('## Real-Time Updates (Optional)')[1].split('## Cache Tags (Optional)')[0];
const blocks = (text, language) => [...text.matchAll(new RegExp('^```' + language + '\\s*\\n([\\s\\S]*?)^```', 'gm'))].map(match => match[1]);
const configs = blocks(beforeContentLink, '(?:js|ts)').filter(source => source.includes('export default defineConfig('));
assert.ok(configs.length, 'The fixture must include the documented Astro configuration');

function select(sources, declaration) {
  const matches = sources.filter(source => source.includes(declaration));
  assert.equal(matches.length, 1, `Expected one documented example containing ${declaration}`);
  return matches[0];
}

test('documented Astro preview configuration preserves origin protection', () => {
  // Evaluate configuration objects rather than requiring particular prose or formatting.
  let security = { checkOrigin: true };
  for (const source of configs) {
    const exports = {};
    const defineConfig = value => value;
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    vm.runInNewContext(code, {
      exports, defineConfig,
      require: name => {
        assert.equal(name, 'astro/config');
        return { defineConfig, envField: { string: value => value } };
      },
    });
    security = { ...security, ...exports.default.security };
  }
  assert.equal(security.checkOrigin, true, 'Installing Web Previews must retain Astro origin protection');
});

// Uses the existing, separately locked Astro fixture. Install it with:
// npm ci --prefix dev/tests/astro-cache
// The config invariant above remains part of the standard suite without this fixture.
const runtimeModules = join(dev, 'tests/astro-cache/node_modules');
const astroPackage = join(runtimeModules, 'astro/package.json');
const astroBin = existsSync(astroPackage)
  ? join(dirname(astroPackage), JSON.parse(readFileSync(astroPackage, 'utf8')).bin.astro)
  : undefined;
const runtimeAvailable = Boolean(astroBin && existsSync(astroBin) && existsSync(join(runtimeModules, '@astrojs/node/package.json')));

test('documented Astro previews render content and accept normal authenticated JSON with origin protection', {
  skip: !runtimeAvailable && 'Install locked runtime: npm ci --prefix dev/tests/astro-cache',
  timeout: 90000,
}, async t => {
  const directory = mkdtempSync(join(tmpdir(), 'astro-preview-regressions-'));
  let server;
  let serverLog = '';
  t.after(async () => {
    if (server && server.exitCode === null && server.signalCode === null) {
      const closed = once(server, 'close');
      server.kill('SIGTERM');
      const force = setTimeout(() => server.kill('SIGKILL'), 2000);
      await closed;
      clearTimeout(force);
    }
    rmSync(directory, { recursive: true, force: true });
  });
  const write = (name, content) => {
    const path = join(directory, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  };
  symlinkSync(runtimeModules, join(directory, 'node_modules'), 'dir');
  write('package.json', JSON.stringify({ private: true, type: 'module' }));
  for (const [index, source] of configs.entries()) {
    write(`documented-config-${index}.mjs`, source.includes('import ') ? source : `import { defineConfig } from 'astro/config';\n${source}`);
  }
  write('astro.config.mjs', `
import { defineConfig, mergeConfig } from 'astro/config';
import node from '@astrojs/node';
import { writeFileSync } from 'node:fs';
${configs.map((_, index) => `import config${index} from './documented-config-${index}.mjs';`).join('\n')}
const documented = [${configs.map((_, index) => `config${index}`).join(',')}].reduce((previous, next) => mergeConfig(previous, next), {});
export default defineConfig(mergeConfig(documented, {
  adapter: node({ mode: 'middleware' }),
  integrations: [{ name: 'observe-preview-config', hooks: { 'astro:config:done': ({config}) => {
    writeFileSync(new URL('./resolved-config.json', import.meta.url), JSON.stringify({ checkOrigin: config.security.checkOrigin }));
  } } }],
  vite: { resolve: { alias: {
    '~': new URL('./src', import.meta.url).pathname,
    '@datocms/astro/QueryListener': new URL('./src/listener.ts', import.meta.url).pathname,
    '@datocms/rest-client-utils': ${JSON.stringify(join(dev, 'node_modules/@datocms/rest-client-utils/dist/esm/index.js'))},
    'serialize-error': ${JSON.stringify(join(dev, 'node_modules/serialize-error/index.js'))},
  } } },
}));
`);
  // External data and session state are synthetic; Astro compiles and renders the
  // shipped wrapper and page. The listener remains a side-effect-only component.
  write('src/lib/draftMode.ts', `export function isDraftModeEnabled(cookies) { return cookies.get('verified-preview')?.value === 'synthetic-session'; }`);
  write('src/lib/datocms/executeQuery.ts', `export async function executeQuery(query, options) {
    if (query !== 'fixture-query') throw new Error('Unexpected fixture query');
    return { title: options.includeDrafts ? 'Draft fixture article' : 'Published fixture article' };
  }`);
  write('src/listener.ts', `export { default as QueryListener } from './Listener.astro';`);
  write('src/Listener.astro', `---\nconst { initialData, includeDrafts, excludeInvalid } = Astro.props;\nif (!includeDrafts || !excludeInvalid) throw new Error('Expected a draft subscription');\n---\n<aside id="fixture-query-listener" data-title={initialData.title}></aside>`);
  write('src/components/DraftModeQueryListener/Component.astro', select(blocks(realtime, 'astro'), 'const draftModeEnabled ='));
  const usage = select(blocks(realtime, 'astro'), 'import DraftModeQueryListener')
    .replace('const data = await', "const myQuery = 'fixture-query';\nconst data = await")
    .replace(/<!--[\s\S]*?-->/, '<article id="fixture-article"><h1>{data.title}</h1><p>Article body remains visible.</p></article>');
  write('src/pages/index.astro', usage);
  write('src/pages/api/preview-links/index.ts', select(blocks(beforeContentLink, 'ts'), 'export const POST: APIRoute'));
  write('src/pages/api/utils.ts', select(blocks(beforeContentLink, 'ts'), 'export function withCORS'));
  write('src/lib/datocms/recordInfo.ts', `export async function recordToWebsiteRoute(item, locale) {
    if (item.__itemTypeId !== 'fixture-model' || locale !== 'en') throw new Error('Unexpected preview record');
    return '/articles/' + item.attributes.slug;
  }`);
  write('deny-network.mjs', `import http from 'node:http'; import https from 'node:https'; import net from 'node:net'; import tls from 'node:tls';
const deny = () => { throw new Error('External requests are not allowed in the preview fixture'); };
http.request = http.get = https.request = https.get = net.connect = net.createConnection = tls.connect = globalThis.fetch = deny;`);
  write('serve.mjs', `import { createServer } from 'node:http'; import { handler } from './dist/server/entry.mjs';
const server = createServer(handler); server.listen(0, '127.0.0.1', () => console.log('PREVIEW_FIXTURE_PORT=' + server.address().port));`);
  const env = {
    PATH: process.env.PATH, NO_COLOR: '1', ASTRO_TELEMETRY_DISABLED: '1',
    DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN: 'published-fixture',
    DATOCMS_DRAFT_CONTENT_CDA_TOKEN: 'draft-fixture', SECRET_API_TOKEN: 'preview-fixture',
    SIGNED_COOKIE_JWT_SECRET: 'signing-fixture', DRAFT_MODE_COOKIE_NAME: 'verified-preview',
  };
  try {
    await promisify(execFile)(process.execPath, [astroBin, 'build'], { cwd: directory, env, timeout: 60000, maxBuffer: 3 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`Astro fixture build failed:\n${error.stdout ?? ''}\n${error.stderr ?? ''}`, { cause: error });
  }
  server = spawn(process.execPath, ['--import', './deny-network.mjs', 'serve.mjs'], { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', chunk => { serverLog += chunk; });
  server.stderr.on('data', chunk => { serverLog += chunk; });
  const port = await new Promise((resolvePort, reject) => {
    const timer = setTimeout(() => reject(new Error(`Preview fixture did not start:\n${serverLog}`)), 10000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', () => { clearTimeout(timer); reject(new Error(serverLog)); });
    server.stdout.on('data', () => {
      const match = serverLog.match(/PREVIEW_FIXTURE_PORT=(\d+)/);
      if (match) { clearTimeout(timer); resolvePort(Number(match[1])); }
    });
  });
  const origin = `http://127.0.0.1:${port}`;
  await t.test('the resolved production configuration keeps the framework protection enabled', () => {
    const config = JSON.parse(readFileSync(join(directory, 'resolved-config.json'), 'utf8'));
    assert.equal(config.checkOrigin, true);
  });
  for (const draft of [false, true]) {
    await t.test(`${draft ? 'draft' : 'published'} rendering retains the article`, async () => {
      const response = await fetch(origin, { headers: draft ? { cookie: 'verified-preview=synthetic-session' } : {} });
      const html = await response.text();
      assert.equal(response.status, 200, serverLog);
      assert.match(html, /<article id="fixture-article">/);
      assert.ok(html.includes(`${draft ? 'Draft' : 'Published'} fixture article`), html);
      assert.ok(html.includes('Article body remains visible.'), html);
      assert.equal(html.includes('id="fixture-query-listener"'), draft, html);
    });
  }
  await t.test('an authorized cross-origin JSON preview request returns the record link', async () => {
    const response = await fetch(`${origin}/api/preview-links?token=preview-fixture`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://plugins-cdn.datocms.com' },
      body: JSON.stringify({
        item: { id: 'fixture-record', type: 'item', attributes: { slug: 'example' }, meta: { status: 'published' }, relationships: { item_type: { data: { id: 'fixture-model', type: 'item_type' } } } },
        locale: 'en',
      }),
    });
    assert.equal(response.status, 200, serverLog);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    const { previewLinks } = await response.json();
    assert.equal(previewLinks.length, 1);
    assert.equal(previewLinks[0].label, 'Published version');
    const link = new URL(previewLinks[0].url);
    assert.equal(link.origin, origin);
    assert.equal(link.pathname, '/api/draft-mode/disable');
    assert.equal(link.searchParams.get('redirect'), '/articles/example');
  });
});
