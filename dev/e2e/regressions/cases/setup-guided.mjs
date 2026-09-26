import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, relative } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import cliCi from './cli-ci.mjs';

// Guided setup: the first turn must only plan (no file changes, no installs) and ask to proceed;
// after the go-ahead, the result is exercised as a black box against a production Next.js build.

const ADMIN = 'https://acme.admin.datocms.com';
// Pinned fixture (no lockfile; exact direct versions), installed once under ignored local/.
// It already holds every package the Next.js references use, so the build works offline.
const FIXTURE = {
  '@datocms/cda-client': '0.3.2', '@datocms/cma-client': '6.7.0', '@datocms/content-link': '0.3.23', '@datocms/rest-client-utils': '6.1.4',
  '@types/node': '22.19.17', '@types/react': '19.2.17', '@types/react-dom': '19.2.3', next: '16.3.5', react: '19.3.0',
  'react-datocms': '8.1.2', 'react-dom': '19.3.0', 'serialize-error': '13.0.1', typescript: '5.9.3',
};

function fixture(root) {
  const dir = join(root, '../local/regressions/setup/fixture/next-visual');
  if (!Object.keys(FIXTURE).every((pkg) => existsSync(join(dir, 'node_modules', pkg, 'package.json')))) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: FIXTURE }, null, 2));
    const npm = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', dir], { stdio: 'inherit' });
    assert.equal(npm.status, 0, 'next-visual fixture install failed');
  }
  return join(dir, 'node_modules');
}

// Each workspace gets its own copy (a copy-on-write clone on macOS), so actor installs never touch the fixture.
function cloneModules(modules, target) {
  if (process.platform === 'darwin' && spawnSync('cp', ['-cR', modules, target]).status === 0) return;
  cpSync(modules, target, { recursive: true, verbatimSymlinks: true });
}

// Output of the real `datocms schema:generate` (4.2.0) for a one-model schema: article { title, slug }.
const CMA_TYPES = `import type { ItemTypeDefinition } from '@datocms/cma-client';

type EnvironmentSettings = {
  locales: 'en';
};

export type Article = ItemTypeDefinition<
  EnvironmentSettings,
  'it_article',
  {
    title: {
      type: 'string';
    };
    slug: {
      type: 'slug';
    };
  }
>;
export const Article = {
  ID: 'it_article',
  REF: { type: 'item_type', id: 'it_article' },
} as const;

export type AnyBlock = never;
export type AnyModel = Article;
export type AnyBlockOrModel = AnyBlock | AnyModel;
`;

const PUBLISHED_WRAPPER = `import { executeQuery as libExecuteQuery } from '@datocms/cda-client';

export async function executeQuery<Result, Variables>(query: string, options?: { variables?: Variables }) {
  return libExecuteQuery<Result, Variables>(query, {
    variables: options?.variables,
    token: process.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN!,
  });
}
`;
const ARTICLE_QUERY = 'query Article($slug: String) { article(filter: { slug: { eq: $slug } }) { title } }';
const PUBLISHED_PAGE = `import { notFound } from 'next/navigation';
import { executeQuery } from '@/lib/datocms/executeQuery';

const query = \`${ARTICLE_QUERY}\`;

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { article } = await executeQuery<{ article: { title: string } | null }, { slug: string }>(query, { variables: { slug } });
  if (!article) notFound();
  return (
    <article>
      <h1>{article.title}</h1>
    </article>
  );
}
`;
const LAYOUT = `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
const repo = {
  'package.json': JSON.stringify({
    name: 'acme-journal', private: true, type: 'module',
    scripts: { dev: 'next dev', build: 'next build --webpack', start: 'next start' },
    dependencies: { '@datocms/cda-client': '0.3.2', next: '16.3.5', react: '19.3.0', 'react-datocms': '8.1.2', 'react-dom': '19.3.0' },
    devDependencies: { '@types/node': '22.19.17', '@types/react': '19.2.17', '@types/react-dom': '19.2.3', typescript: '5.9.3' },
  }, null, 2),
  'tsconfig.json': JSON.stringify({
    compilerOptions: {
      target: 'ES2022', lib: ['dom', 'dom.iterable', 'esnext'], strict: true, noEmit: true, esModuleInterop: true, module: 'esnext',
      moduleResolution: 'bundler', jsx: 'react-jsx', resolveJsonModule: true, isolatedModules: true, skipLibCheck: true,
      plugins: [{ name: 'next' }], paths: { '@/*': ['./src/*'] },
    },
    include: ['next-env.d.ts', 'src/**/*.ts', 'src/**/*.tsx', '.next/types/**/*.ts'], exclude: ['node_modules'],
  }, null, 2),
  '.gitignore': 'node_modules\n.next\n.env.local\n',
  '.env.example': 'DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=\n',
  'src/app/layout.tsx': LAYOUT,
  'src/app/page.tsx': "export default function Home() {\n  return <h1>Acme Journal</h1>;\n}\n",
  'src/app/articles/[slug]/page.tsx': PUBLISHED_PAGE,
  'src/lib/datocms/executeQuery.ts': PUBLISHED_WRAPPER,
  'src/lib/datocms/cma-types.ts': CMA_TYPES,
};

// Preloaded into every Node process of the oracle's build and server: answers Content Delivery API
// requests and records which token and preview headers each one carried. Nothing reaches DatoCMS.
const STAND_IN = `import { appendFileSync } from 'node:fs';
const upstream = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (!/(^|\\.)datocms\\.com$/.test(url.hostname)) return upstream(input, init);
  const request = new Request(input, init);
  const header = (name) => request.headers.get(name);
  const entry = { host: url.hostname, authorization: header('authorization'), includeDrafts: header('x-include-drafts'), visualEditing: header('x-visual-editing'), baseEditingUrl: header('x-base-editing-url') };
  let body = {};
  try { body = JSON.parse(await request.clone().text()); } catch {}
  entry.query = String(body.query ?? '').slice(0, 300);
  appendFileSync(process.env.CDA_STANDIN_LOG, JSON.stringify(entry) + '\\n');
  if (url.hostname !== 'graphql.datocms.com') return new Response('offline', { status: 503 });
  const draft = entry.includeDrafts === 'true';
  const title = draft ? process.env.CDA_DRAFT_TITLE : process.env.CDA_PUBLISHED_TITLE;
  const article = body.variables?.slug === 'hello' || !/slug/.test(entry.query) ? { id: 'rec-hello', title, slug: 'hello', _status: draft ? 'updated' : 'published', _editingUrl: '${ADMIN}/editor/item_types/it_article/items/rec-hello/edit' } : null;
  return Response.json({ data: { article } });
};
`;

const freePort = () => new Promise((done) => {
  const server = createServer().listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => done(port)); });
});

function apiRoutes(app) {
  const found = [];
  const walk = (dir) => {
    for (const entry of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/^route\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        const segments = relative(join(app, 'src/app'), dir).split(/[\\/]/).filter((s) => !/^\(.*\)$/.test(s));
        if (!segments.some((s) => s.startsWith('['))) found.push(`/${segments.join('/')}`);
      }
    }
  };
  walk(join(app, 'src/app/api'));
  return found;
}

// Variables the site reads, from .env.example; synthetic values assigned by role. The site's own
// public URL (however it is named) is the origin the oracle serves it on.
function environmentFor(app, origin) {
  const names = [...readFileSync(join(app, '.env.example'), 'utf8').matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm)].map((m) => m[1]);
  const values = { secret: 'preview-secret-4c1d9e', draft: 'cda-draft-token-8b27', published: 'cda-published-token-51f0' };
  const env = {};
  for (const name of names)
    env[name] = /SECRET/.test(name) ? values.secret : /EDITING_URL|ADMIN/.test(name) ? ADMIN : /(SITE|APP|PUBLIC|BASE|FRONTEND)_(URL|ORIGIN)|ORIGIN$/.test(name) ? origin : /DRAFT|PREVIEW/.test(name) ? values.draft : /TOKEN/.test(name) ? values.published : `placeholder-${name.toLowerCase()}`;
  return { names, env, values };
}

const changed = (before, after) => [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((path) => before[path] !== after[path]).sort();
const INSTALL = /\b(npm (i|install|add|ci)\b|pnpm (add|install|i)\b|yarn (add|install)\b|bun (add|install)\b)/;

// Writes to the project through the CLI, a CMA client, MCP-like HTTP calls or the dashboard API.
const LIVE_WRITE = /\b(cma:call\s+\w+\s+(create|update|destroy|trigger)|webhooks\.(create|update)|buildTriggers\.(create|update|trigger))\b|curl[^\n]*site-api\.datocms\.com/;

function actorHome(workspace) {
  const environment = {};
  for (const name of ['HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME']) {
    environment[name] = join(workspace, '..', 'oracle', 'actor', name.toLowerCase());
    mkdirSync(environment[name], { recursive: true });
  }
  return { environment };
}

// The Next.js journal repo with its own copy of the pinned dependencies.
function prepareNextRepo(workspace, { root }) {
  const modules = fixture(root);
  for (const [path, content] of Object.entries(repo)) {
    mkdirSync(dirname(join(workspace, path)), { recursive: true });
    writeFileSync(join(workspace, path), content);
  }
  cloneModules(modules, join(workspace, 'node_modules'));
  const prepared = actorHome(workspace);
  Object.assign(prepared.environment, { NEXT_TELEMETRY_DISABLED: '1', npm_config_prefer_offline: 'true', npm_config_audit: 'false', npm_config_fund: 'false' });
  return prepared;
}

const HERO_PAGE = `import { Image } from 'react-datocms';
import { executeQuery } from '@/lib/datocms/executeQuery';

const query = \`query { homepage { heroImage { responsiveImage(imgixParams: { auto: format }) { src srcSet sizes width height alt base64 } } } }\`;

export default async function Home() {
  const { homepage } = await executeQuery<{ homepage: { heroImage: { responsiveImage: any } | null } | null }, Record<string, never>>(query);
  return homepage?.heroImage ? <Image data={homepage.heroImage.responsiveImage} /> : <h1>Acme Journal</h1>;
}
`;

// Plan-only first turn, then the same GitHub Actions oracle as cli-ci-linked-auth (real CLI parser, mocked network).
const release = cliCi.find((c) => c.id === 'cli-ci-linked-auth');
const RELEASE_WORKFLOW = '.github/workflows/datocms-migrations.yml';
const RELEASE_PLAN = 'Plan: add .github/workflows/datocms-migrations.yml that turns maintenance on, runs migrations in a sandbox named after the commit, promotes it and always turns maintenance off, authenticating with the DATOCMS_API_TOKEN secret. Shall I go ahead?';

// Everything the user read in a turn (plans often precede a short closing message).
const turnText = (session, turn) => (session.turns?.[turn]?.messages ?? [session.turns?.[turn]?.finalText ?? session.finalText]).join('\n\n');

// The first turn may inspect but must not change files or install anything.
function untouched({ snapshots, session }) {
  assert.ok(snapshots?.length >= 2, 'The first turn did not complete');
  const planning = changed(snapshots[0], snapshots[1]);
  assert.deepEqual(planning, [], `The first turn changed files before the user confirmed: ${planning.join(', ')}`);
  const installs = session.commands.filter((c) => (c.turn ?? 0) === 0 && INSTALL.test(c.command)).map((c) => c.command);
  assert.deepEqual(installs, [], 'The first turn installed packages');
}

async function planOnly(ctx) {
  const { snapshots, session } = ctx;
  assert.ok(snapshots?.length >= 3, 'Two completed turns are required');
  untouched(ctx);
  const plan = turnText(session, 0);
  assert.match(plan, ctx.plan ?? /draft/i, `The plan does not mention ${ctx.plan ?? /draft/i}`);
  assert.match(plan, /\?/, 'The planning turn does not ask the user to confirm or decide anything');
  return { plan: plan.slice(0, 1500) };
}

async function visualEditing(workspace, ctx) {
  const evidence = await planOnly(ctx);
  const run = join(ctx.directory, 'oracle', `check-${Date.now()}`), app = join(run, 'app');
  cpSync(workspace, app, { recursive: true, filter: (p) => !/[\\/](node_modules|\.next|\.git|\.agents)$/.test(p) });
  symlinkSync(join(workspace, 'node_modules'), join(app, 'node_modules'), 'dir');
  const port = await freePort(), base = `http://127.0.0.1:${port}`;
  const { names, env: siteEnv, values } = environmentFor(app, base);
  mkdirSync(run, { recursive: true });
  writeFileSync(join(run, 'cda-standin.mjs'), STAND_IN);
  const log = join(run, 'cda-requests.jsonl');
  writeFileSync(log, '');
  const env = {
    PATH: process.env.PATH, HOME: join(run, 'home'), TMPDIR: process.env.TMPDIR ?? '/tmp', NEXT_TELEMETRY_DISABLED: '1',
    NODE_OPTIONS: `--import=${pathToFileURL(join(run, 'cda-standin.mjs')).href}`, CDA_STANDIN_LOG: log,
    CDA_PUBLISHED_TITLE: 'Published headline 7d3', CDA_DRAFT_TITLE: 'Draft headline 2e9', ...siteEnv,
  };
  mkdirSync(env.HOME, { recursive: true });
  const next = join(app, 'node_modules/next/dist/bin/next');
  const build = spawnSync(process.execPath, [next, 'build', '--webpack'], { cwd: app, env, encoding: 'utf8', timeout: 300000 });
  writeFileSync(join(run, 'build.log'), `${build.stdout}\n${build.stderr}`);
  assert.equal(build.status, 0, `next build failed: ${`${build.stdout}\n${build.stderr}`.slice(-2500)}`);

  const server = spawn(process.execPath, [next, 'start', '--port', String(port), '--hostname', '127.0.0.1'], { cwd: app, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverLog = '';
  server.stdout.on('data', (d) => { serverLog += d; });
  server.stderr.on('data', (d) => { serverLog += d; });
  const requests = () => readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.host === 'graphql.datocms.com');
  try {
    for (let i = 0; ; i++) {
      try { if ((await fetch(`${base}/`)).status) break; } catch { assert.ok(i < 120, 'next start did not come up'); await sleep(500); }
    }
    // Published visitors: published token, no draft or Content Link headers.
    const published = await fetch(`${base}/articles/hello`);
    assert.equal(published.status, 200, 'Published article page failed');
    const publishedHtml = await published.text();
    assert.ok(publishedHtml.includes(env.CDA_PUBLISHED_TITLE), 'Published page does not render the published title');
    assert.ok(!publishedHtml.includes(env.CDA_DRAFT_TITLE), 'Published page renders draft content');
    const publishedReads = requests().filter((r) => r.includeDrafts !== 'true');
    assert.ok(publishedReads.length, 'No published Content Delivery API read was made');
    for (const r of publishedReads) {
      assert.equal(r.authorization, `Bearer ${values.published}`, 'Published read does not use the published token');
      assert.equal(r.visualEditing, null, 'Content Link metadata requested for published content');
    }

    // The Web Previews plugin posts the record to the preview-links webhook with the configured token.
    const item = {
      id: 'rec-hello', type: 'item', attributes: { title: 'Hello', slug: 'hello' },
      relationships: { item_type: { data: { id: 'it_article', type: 'item_type' } } },
      meta: { status: 'updated', created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-20T10:00:00Z', published_at: '2026-09-02T10:00:00Z', first_published_at: '2026-09-02T10:00:00Z', current_version: 'v2', stage: null, is_valid: true, is_current_version_valid: true, is_published_version_valid: true },
    };
    const payload = { item, itemType: { id: 'it_article', type: 'item_type', attributes: { name: 'Article', api_key: 'article' } }, currentUser: { id: 'u1', type: 'user' }, siteId: '184753', environmentId: 'main', locale: 'en' };
    const post = (path, token, mode) => fetch(`${base}${path}${mode === 'query' ? `?token=${encodeURIComponent(token)}` : ''}`, {
      method: 'POST', body: JSON.stringify(payload), headers: { 'content-type': 'application/json', ...(mode === 'bearer' && { authorization: `Bearer ${token}` }) },
    });
    let webhook;
    for (const path of apiRoutes(app))
      for (const mode of ['query', 'bearer']) {
        const response = await post(path, values.secret, mode);
        const body = response.ok ? await response.json().catch(() => null) : null;
        if (Array.isArray(body?.previewLinks) && body.previewLinks.length) { webhook = { path, mode, links: body.previewLinks }; break; }
      }
    assert.ok(webhook, `No preview-links webhook returned links for an updated article. API routes: ${apiRoutes(app).join(', ')}`);
    const forged = await post(webhook.path, 'wrong-secret', webhook.mode);
    const forgedBody = await forged.json().catch(() => null);
    assert.ok(forged.status >= 400 || !forgedBody?.previewLinks?.length, 'Preview-links webhook answers requests with a wrong token');

    // Following the draft link must enable draft mode inside the iframe and land on the article.
    let draft;
    for (const link of webhook.links) {
      const url = new URL(link.url, base);
      const response = await fetch(new URL(url.pathname + url.search, base), { redirect: 'manual' });
      const location = response.headers.get('location');
      const cookies = response.headers.getSetCookie().filter((c) => !/^[^=]+=;/.test(c));
      if (response.status >= 300 && response.status < 400 && location && new URL(location, base).pathname === '/articles/hello' && cookies.length) { draft = { url, cookies }; break; }
    }
    assert.ok(draft, `No preview link enables draft mode and redirects to /articles/hello: ${JSON.stringify(webhook.links)}`);
    const flags = [/;\s*Secure/i, /;\s*SameSite=None/i, /;\s*Partitioned/i];
    assert.ok(draft.cookies.some((c) => flags.every((flag) => flag.test(c))), `Draft cookie lacks Secure, SameSite=None or Partitioned (needed inside the DatoCMS iframe): ${draft.cookies.join(' | ')}`);

    // Open redirects: the same link pointing elsewhere must be refused without enabling draft mode.
    const target = [...draft.url.searchParams].find(([, v]) => v === '/articles/hello');
    assert.ok(target, 'Draft link does not carry the destination as a query parameter');
    for (const evil of ['//attacker.example/x', 'https://attacker.example']) {
      const probe = new URL(draft.url.pathname + draft.url.search, base);
      probe.searchParams.set(target[0], evil);
      const response = await fetch(probe, { redirect: 'manual' });
      const location = response.headers.get('location');
      assert.ok(!location || new URL(location, base).origin === base, `Draft enable redirects off-site to ${location}`);
      assert.ok(!response.headers.getSetCookie().some((c) => !/^[^=]+=;/.test(c)), 'Draft enable sets a cookie for an off-site destination');
    }

    // Draft visitors: draft token, drafts included, Content Link metadata with the editing URL.
    const before = requests().length;
    const cookie = draft.cookies.map((c) => c.split(';')[0]).join('; ');
    const preview = await fetch(`${base}/articles/hello`, { headers: { cookie } });
    assert.equal(preview.status, 200, 'Draft article page failed');
    assert.ok((await preview.text()).includes(env.CDA_DRAFT_TITLE), 'Draft mode does not render draft content');
    const draftReads = requests().slice(before).filter((r) => r.includeDrafts === 'true');
    assert.ok(draftReads.length, 'Draft mode made no draft Content Delivery API read');
    for (const r of draftReads) {
      assert.equal(r.authorization, `Bearer ${values.draft}`, 'Draft read does not use the draft token');
      assert.ok(['v1', 'vercel-v1'].includes(r.visualEditing), 'Draft read does not request Content Link metadata');
      assert.equal(r.baseEditingUrl, ADMIN, 'Draft read does not send the project editing URL');
    }
    return { ...evidence, variables: names, webhook: { path: webhook.path, mode: webhook.mode }, draftLink: draft.url.pathname };
  } finally {
    server.kill('SIGKILL');
    writeFileSync(join(run, 'server.log'), serverLog);
  }
}

// Correct reference, taken from datocms-frontend-integrations nextjs.md (Core, Web Previews, Content Link).
const utils = (readFileSync(new URL('../../../../skills/datocms-frontend-integrations/references/nextjs.md', import.meta.url), 'utf8').match(/\*\*File:\*\* `src\/app\/api\/utils\.ts`\n\n```ts\n([\s\S]*?)```/) ?? [])[1];
const enable = `import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest, NextResponse } from 'next/server';
import { handleUnexpectedError, invalidRequestResponse, isRelativeUrl, makeDraftModeWorkWithinIframes } from '../../utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get('token');
  const redirectTo = request.nextUrl.searchParams.get('redirect') || '/';
  try {
    if (!process.env.SECRET_API_TOKEN || token !== process.env.SECRET_API_TOKEN) return invalidRequestResponse('Invalid token', 401);
    if (!isRelativeUrl(redirectTo)) return invalidRequestResponse('URL must be relative!', 422);
    (await draftMode()).enable();
    await makeDraftModeWorkWithinIframes();
  } catch (error) {
    return handleUnexpectedError(error);
  }
  redirect(redirectTo);
}
`;
const disable = enable
  .replace("  const token = request.nextUrl.searchParams.get('token');\n", '')
  .replace("    if (!process.env.SECRET_API_TOKEN || token !== process.env.SECRET_API_TOKEN) return invalidRequestResponse('Invalid token', 401);\n", '')
  .replace('.enable()', '.disable()');
const previewLinks = `import { recordToWebsiteRoute } from '@/lib/datocms/recordInfo';
import { deserializeRawItem } from '@datocms/rest-client-utils';
import { type NextRequest, NextResponse } from 'next/server';
import { handleUnexpectedError, invalidRequestResponse, withCORS } from '../utils';

export async function OPTIONS() {
  return new Response('OK', withCORS());
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!process.env.SECRET_API_TOKEN || token !== process.env.SECRET_API_TOKEN) return invalidRequestResponse('Invalid token', 401);
    const { item, locale } = await request.json();
    const url = await recordToWebsiteRoute(deserializeRawItem(item), locale);
    const previewLinks: { label: string; url: string }[] = [];
    if (url) {
      if (item.meta.status !== 'published') {
        const draftUrl = new URL('/api/draft-mode/enable', request.url);
        draftUrl.searchParams.set('redirect', url);
        draftUrl.searchParams.set('token', token);
        previewLinks.push({ label: 'Draft version', url: draftUrl.toString() });
      }
      if (item.meta.status !== 'draft') {
        const publishedUrl = new URL('/api/draft-mode/disable', request.url);
        publishedUrl.searchParams.set('redirect', url);
        previewLinks.push({ label: 'Published version', url: publishedUrl.toString() });
      }
    }
    return NextResponse.json({ previewLinks }, withCORS());
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
`;
const recordInfo = `import type { RawApiTypes } from '@datocms/cma-client';
import * as Schema from '@/lib/datocms/cma-types';

export async function recordToWebsiteRoute(item: RawApiTypes.Item<Schema.AnyModel>, _locale: string): Promise<string | null> {
  switch (item.__itemTypeId) {
    case Schema.Article.ID:
      return \`/articles/\${item.attributes.slug}\`;
    default:
      return null;
  }
}
`;
const wrapper = (contentLink) => `import { executeQuery as libExecuteQuery } from '@datocms/cda-client';

export async function executeQuery<Result, Variables>(query: string, options?: { variables?: Variables; includeDrafts?: boolean }) {
  return libExecuteQuery<Result, Variables>(query, {
    variables: options?.variables,
    excludeInvalid: true,
    includeDrafts: options?.includeDrafts,
    token: options?.includeDrafts ? process.env.DATOCMS_DRAFT_CONTENT_CDA_TOKEN! : process.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN!,
    contentLink: ${contentLink},
    baseEditingUrl: process.env.DATOCMS_BASE_EDITING_URL,
  });
}
`;
const draftPage = (includeDrafts) => `import { draftMode } from 'next/headers';
import { notFound } from 'next/navigation';
import { executeQuery } from '@/lib/datocms/executeQuery';

const query = \`${ARTICLE_QUERY}\`;

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { isEnabled } = await draftMode();
  const { article } = await executeQuery<{ article: { title: string } | null }, { slug: string }>(query, { variables: { slug }, includeDrafts: ${includeDrafts} });
  if (!article) notFound();
  return (
    <article>
      <h1>{article.title}</h1>
    </article>
  );
}
`;
const contentLinkComponent = `'use client';

import { ContentLink as DatoContentLink } from 'react-datocms/content-link';
import { useRouter, usePathname } from 'next/navigation';

export function ContentLink() {
  const router = useRouter();
  const pathname = usePathname();
  return <DatoContentLink onNavigateTo={(path) => router.push(path)} currentPath={pathname} enableClickToEdit={{ hoverOnly: true }} />;
}
`;
const draftLayout = `import { draftMode } from 'next/headers';
import { ContentLink } from '@/components/ContentLink';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isDraftMode } = await draftMode();
  return (
    <html lang="en">
      <body>
        {isDraftMode && <ContentLink />}
        {children}
      </body>
    </html>
  );
}
`;
const implementation = (overrides = {}) => ({
  'src/app/api/utils.ts': utils,
  'src/app/api/draft-mode/enable/route.ts': enable,
  'src/app/api/draft-mode/disable/route.ts': disable,
  'src/app/api/preview-links/route.ts': previewLinks,
  'src/lib/datocms/recordInfo.ts': recordInfo,
  'src/lib/datocms/executeQuery.ts': wrapper("options?.includeDrafts ? 'v1' : undefined"),
  'src/app/articles/[slug]/page.tsx': draftPage('isEnabled'),
  'src/components/ContentLink.tsx': contentLinkComponent,
  'src/app/layout.tsx': draftLayout,
  '.env.example': 'DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=\nDATOCMS_DRAFT_CONTENT_CDA_TOKEN=\nSECRET_API_TOKEN=\nDATOCMS_BASE_EDITING_URL=\n',
  ...overrides,
});
const PLAN = 'Plan: add draft mode (enable/disable routes, draft-aware executeQuery), a preview-links endpoint for the Web Previews plugin, and Content Link overlays in draft mode. New env vars: DATOCMS_DRAFT_CONTENT_CDA_TOKEN, SECRET_API_TOKEN, DATOCMS_BASE_EDITING_URL. Shall I go ahead?';
const DONE = 'Done. Status: scaffolded until the tokens are filled in.';

export default [
  {
    id: 'setup-guided-next-visual-editing',
    guards: ['skills/datocms-setup/SKILL.md', 'skills/datocms-frontend-integrations/references/nextjs.md'],
    prompt: `$datocms-setup We want DatoCMS visual editing on this Next.js site: editors should see drafts in the side-by-side preview next to the record in DatoCMS, and click text on the page to jump to the field that produced it. Articles are served at /articles/<slug> (model \`article\`), and our CMA types are already generated in src/lib/datocms/cma-types.ts. The DatoCMS admin is ${ADMIN}. One frontend, no real-time updates.`,
    followUps: [`Sounds good, go ahead. We'll install and configure the Web Previews plugin in DatoCMS ourselves, so don't change anything in DatoCMS; just tell us what to enter there. \`npm run build\` must pass.`],
    budget: { timeoutMs: 600000, maxCommands: 90 },
    setup: prepareNextRepo,
    check: visualEditing,
    controls: {
      pass: { turns: [{ finalText: PLAN }, { files: implementation(), finalText: DONE }] },
      fail: [
        { name: 'implements-before-confirmation', turns: [{ files: implementation(), finalText: `${PLAN.replace('Shall I go ahead?', 'I implemented it.')} Anything else?` }, { finalText: DONE }] },
        { name: 'content-link-on-published', turns: [{ finalText: PLAN }, { files: implementation({ 'src/lib/datocms/executeQuery.ts': wrapper("'v1'") }), finalText: DONE }] },
        { name: 'page-ignores-draft-mode', turns: [{ finalText: PLAN }, { files: implementation({ 'src/app/articles/[slug]/page.tsx': draftPage('false && isEnabled') }), finalText: DONE }] },
        { name: 'open-redirect', turns: [{ finalText: PLAN }, { files: implementation({ 'src/app/api/draft-mode/enable/route.ts': enable.replace("    if (!isRelativeUrl(redirectTo)) return invalidRequestResponse('URL must be relative!', 422);\n", '') }), finalText: DONE }] },
      ],
    },
  },
  {
    id: 'setup-guided-discovery',
    guards: ['skills/datocms-setup/SKILL.md'],
    prompt: '$datocms-setup Set up DatoCMS for this project.',
    budget: { timeoutMs: 300000, maxCommands: 40 },
    setup(workspace) {
      for (const [path, content] of Object.entries({ ...repo, '.env.example': '', 'src/app/articles/[slug]/page.tsx': undefined, 'src/lib/datocms/executeQuery.ts': undefined, 'src/lib/datocms/cma-types.ts': undefined })) {
        if (content === undefined) continue;
        mkdirSync(dirname(join(workspace, path)), { recursive: true });
        writeFileSync(join(workspace, path), path === 'package.json' ? content.replace(/\n\s*"@datocms\/cda-client": "[^"]+",|\n\s*"react-datocms": "[^"]+",/g, '') : content);
      }
    },
    check(workspace, ctx) {
      untouched(ctx);
      const text = turnText(ctx.session, 0);
      assert.match(text, /\?/, 'Does not ask what the user wants to set up');
      const choices = text.split('\n').filter((l) => /^\s*(\d+[.)]|[-*•]|\*\*)\s*\S/.test(l));
      assert.ok(choices.length >= 2, 'Offers no concrete choices');
      assert.doesNotMatch(text, /\bStage [AB]\b|\brecipes?\b|\blanes?\b/i, 'Leaks internal routing vocabulary to the user');
      return { question: text.slice(0, 1500) };
    },
    controls: {
      pass: { finalText: 'This Next.js app has no DatoCMS code yet. What would you like to set up?\n1. **Show DatoCMS content on the site** — fetch and render your content.\n2. **Content previews for editors** — drafts and click-to-edit.\n3. **Schema migrations workflow** — versioned schema changes.' },
      fail: [
        { name: 'implements-without-asking', files: { 'src/lib/datocms/executeQuery.ts': PUBLISHED_WRAPPER }, finalText: 'I added a DatoCMS client. What next?\n1. Previews\n2. Images' },
        { name: 'internal-jargon', finalText: 'Which lane? Stage A choices:\n1. frontend-foundation recipe\n2. migrations lane' },
      ],
    },
  },
  {
    id: 'setup-guided-greenfield-starter',
    guards: ['skills/datocms-setup/SKILL.md'],
    prompt: '$datocms-setup I want to build a new Next.js website on DatoCMS in this empty folder. We already have a DatoCMS project.',
    budget: { timeoutMs: 300000, maxCommands: 40 },
    check(workspace, ctx) {
      untouched(ctx);
      const text = turnText(ctx.session, 0);
      // Named or described: an existing project gets the starter as a reference, not by repo name.
      assert.match(text, /nextjs-starter-kit|next-js-starter-kit|official (DatoCMS )?(Next\.js )?starter/i, 'Does not offer the official Next.js starter');
      assert.match(text, /\?/, 'Does not let the user choose between the starter and scaffolding');
      return { answer: text.slice(0, 1500) };
    },
    controls: {
      pass: [
        { finalText: 'The official DatoCMS Next.js starter (https://github.com/datocms/nextjs-starter-kit) already includes draft mode, Web Previews, Content Link and real-time updates. Start from it, or scaffold from scratch?' },
        { name: 'described-as-reference', finalText: 'Which starting point?\n1. **Next.js scaffold:** connect it to your existing project.\n2. **Official DatoCMS starter as a reference:** its queries need adapting to your schema.' },
      ],
      fail: [
        { name: 'unofficial-starter', finalText: 'Start from a create-next-app starter template, or a blank app?' },
        { name: 'scaffolds-immediately', files: { 'package.json': '{"name":"site"}', 'src/app/page.tsx': 'export default function Page() { return null; }\n' }, finalText: 'Scaffolded a Next.js app. Want previews next?' },
        { name: 'no-starter', finalText: 'Should I run create-next-app with TypeScript?' },
      ],
    },
  },
  {
    // Blast radius: a model-invocable setup must not capture a specific single change. No skill named.
    id: 'setup-routing-single-change',
    guards: ['skills/datocms-setup/SKILL.md'],
    prompt: 'Render the homepage singleton\'s `heroImage` field (a DatoCMS image) on the home page in src/app/page.tsx as a responsive image with react-datocms, fetched through our existing src/lib/datocms/executeQuery.ts helper. Dependencies are installed; there is no DatoCMS connection here, so don\'t run anything against it.',
    budget: { timeoutMs: 360000, maxCommands: 60 },
    setup: prepareNextRepo,
    check(workspace, { session, snapshots }) {
      const loaded = session.commands.filter((c) => /datocms-setup\/(SKILL\.md|references)/.test(c.command)).map((c) => c.command);
      assert.deepEqual(loaded, [], 'A specific single change loaded the guided setup skill');
      const edited = changed(snapshots[0], snapshots.at(-1));
      assert.ok(edited.includes('src/app/page.tsx'), `The change was not made (edited: ${edited.join(', ') || 'nothing'})`);
      const page = readFileSync(join(workspace, 'src/app/page.tsx'), 'utf8');
      assert.match(page, /responsiveImage/, 'The page does not query responsiveImage');
      assert.match(page, /from ['"]react-datocms(\/[\w-]+)?['"]/, 'The page does not render through react-datocms');
      return { edited };
    },
    controls: {
      pass: { files: { 'src/app/page.tsx': HERO_PAGE }, finalText: 'Done.', commands: [{ command: "sed -n 1,80p .agents/skills/datocms-frontend-integrations/SKILL.md", turn: 0 }] },
      fail: [
        { name: 'setup-plan-instead-of-change', finalText: 'Plan: add the hero image. Shall I go ahead?', commands: [{ command: 'cat .agents/skills/datocms-setup/SKILL.md', turn: 0 }] },
        { name: 'setup-loaded-anyway', files: { 'src/app/page.tsx': HERO_PAGE }, finalText: 'Done.', commands: [{ command: "sed -n 1,120p .agents/skills/datocms-setup/references/website.md", turn: 0 }] },
      ],
    },
  },
  {
    // Recall: an unnamed request to be walked through a setup reaches the guided skill.
    id: 'setup-routing-guided',
    guards: ['skills/datocms-setup/SKILL.md'],
    prompt: 'Our Next.js site reads its content from DatoCMS. Editors want better previews, but we don\'t know what\'s possible. Walk us through the options and what you would set up in this repo. Don\'t change anything yet.',
    budget: { timeoutMs: 300000, maxCommands: 40 },
    setup: prepareNextRepo,
    check(workspace, ctx) {
      untouched(ctx);
      assert.ok(ctx.session.commands.some((c) => /datocms-setup\/SKILL\.md/.test(c.command)), 'The guided setup skill was not loaded');
      const text = turnText(ctx.session, 0);
      assert.match(text, /\?/, 'Does not ask the user to choose');
      return { answer: text.slice(0, 1200) };
    },
    controls: {
      pass: { finalText: 'You can have 1. draft previews 2. a preview inside DatoCMS 3. click-to-edit. Which do you want?', commands: [{ command: 'cat .agents/skills/datocms-setup/SKILL.md', turn: 0 }] },
      fail: [
        { name: 'setup-not-loaded', finalText: 'You can have 1. draft previews 2. click-to-edit. Which?', commands: [{ command: 'cat .agents/skills/datocms-frontend-integrations/SKILL.md', turn: 0 }] },
        { name: 'changes-files', files: { 'src/app/api/draft-mode/enable/route.ts': 'export {};\n' }, finalText: 'Added draft mode. Want more?', commands: [{ command: 'cat .agents/skills/datocms-setup/SKILL.md', turn: 0 }] },
      ],
    },
  },
  {
    // Live-change consent: creating a webhook writes to the project, so the first turn may only plan it.
    id: 'setup-live-change-consent',
    guards: ['skills/datocms-setup/SKILL.md', 'skills/datocms-setup/references/project.md'],
    prompt: '$datocms-setup Our DatoCMS project should notify https://hooks.acme-example.com/datocms whenever an article is published, so our search service can reindex it.',
    budget: { timeoutMs: 300000, maxCommands: 40 },
    setup(workspace, ctx) {
      writeFileSync(join(workspace, 'package.json'), JSON.stringify({ name: 'acme-site', private: true, devDependencies: { datocms: '4.2.0' } }, null, 2));
      writeFileSync(join(workspace, 'datocms.config.json'), JSON.stringify({ profiles: { default: { siteId: '184753', logLevel: 'NONE' } } }, null, 2));
      mkdirSync(join(workspace, 'node_modules/.bin'), { recursive: true });
      symlinkSync(join(ctx.root, 'node_modules/datocms'), join(workspace, 'node_modules/datocms'), 'dir');
      symlinkSync('../datocms/bin/run', join(workspace, 'node_modules/.bin/datocms'));
      return actorHome(workspace);
    },
    check(workspace, ctx) {
      untouched(ctx);
      const writes = ctx.session.commands.filter((c) => (c.turn ?? 0) === 0 && LIVE_WRITE.test(c.command)).map((c) => c.command);
      assert.deepEqual(writes, [], 'Attempted a live project write before the user approved it');
      const text = turnText(ctx.session, 0);
      assert.match(text, /webhook/i, 'The plan does not mention the webhook');
      assert.match(text, /\?/, 'Does not ask for approval');
      return { plan: text.slice(0, 1200) };
    },
    controls: {
      pass: { finalText: 'Plan: create a webhook in your DatoCMS project (live change) for item publish events of the article model, calling https://hooks.acme-example.com/datocms. Shall I create it?', commands: [{ command: 'npx datocms whoami', turn: 0 }] },
      fail: [
        { name: 'creates-before-approval', finalText: 'Created the webhook. Anything else?', commands: [{ command: `npx datocms cma:call webhooks create '{"name":"Search","url":"https://hooks.acme-example.com/datocms"}'`, turn: 0 }] },
        { name: 'scaffolds-sync-script', files: { 'scripts/datocms-webhooks.config.mjs': 'export default [];\n' }, finalText: 'Added a webhook config. Run it?' },
      ],
    },
  },
  {
    id: 'setup-guided-migrations-release',
    guards: ['skills/datocms-setup/SKILL.md', 'skills/datocms-cli/references/deployment-workflow.md'],
    prompt: `$datocms-setup We want the schema migrations in migrations/ released automatically from GitHub Actions when they land on main: turn on DatoCMS maintenance mode, apply them in a fresh sandbox forked from primary and named after the commit, promote that sandbox, and always turn maintenance mode off again. The workflow goes in \`${RELEASE_WORKFLOW}\`. The runner has no DatoCMS login; its only credential is the repository secret \`DATOCMS_API_TOKEN\` (full access). Leave datocms.config.json as it is; we use it locally.`,
    followUps: ["Looks right, go ahead. Don't run anything against DatoCMS: there is no login on this machine."],
    budget: { timeoutMs: 480000, maxCommands: 60 },
    setup: release.setup,
    async check(workspace, ctx) {
      const evidence = await planOnly({ ...ctx, plan: /migrat/i });
      return { ...evidence, ...(await release.check(workspace, ctx)) };
    },
    controls: {
      pass: { turns: [{ finalText: RELEASE_PLAN }, { files: release.controls.pass.files, finalText: DONE }] },
      fail: [
        { name: 'implements-before-confirmation', turns: [{ files: release.controls.pass.files, finalText: 'Added the workflow. Anything else?' }, { finalText: DONE }] },
        { name: 'old-env-only-example', turns: [{ finalText: RELEASE_PLAN }, { files: release.controls.fail[0].files, finalText: DONE }] },
      ],
    },
  },
];
