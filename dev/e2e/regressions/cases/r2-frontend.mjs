import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, relative } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

// Pinned fixtures (no lockfile; exact direct versions), installed once under ignored local/.
const FIXTURES = {
  // React Router framework mode (successor of Remix): `@react-router/dev` + `react-router` 8.
  'react-router': {
    '@datocms/cda-client': '0.3.2', '@react-router/dev': '8.4.0', '@react-router/node': '8.4.0', '@types/node': '22.19.17',
    '@types/react': '19.2.17', '@types/react-dom': '19.2.3', graphql: '16.14.2', isbot: '5.2.2', react: '19.3.0',
    'react-datocms': '8.1.2', 'react-dom': '19.3.0', 'react-router': '8.4.0', typescript: '5.9.3', vite: '8.3.1',
  },
  // Next.js 15 (current `backport` dist-tag): revalidate.d.ts declares `revalidateTag(tag: string)`.
  next15: {
    '@datocms/cda-client': '0.3.2', '@types/node': '22.19.17', '@types/react': '19.2.17', '@types/react-dom': '19.2.3',
    next: '15.5.26', react: '19.3.0', 'react-datocms': '8.1.2', 'react-dom': '19.3.0', typescript: '5.9.3',
  },
};

function fixture(root, name) {
  const dir = join(root, '../local/regressions/round2/frontend/fixture', name);
  if (!Object.keys(FIXTURES[name]).every((pkg) => existsSync(join(dir, 'node_modules', pkg, 'package.json')))) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: FIXTURES[name] }, null, 2));
    const npm = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', dir], { stdio: 'inherit' });
    assert.equal(npm.status, 0, `${name} fixture install failed`);
  }
  return join(dir, 'node_modules');
}

// Writes the project, links the fixture and gives the actor a HOME/XDG sandbox outside the workspace.
function prepare(workspace, modules, files, environment = {}) {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(workspace, path, '..'), { recursive: true });
    writeFileSync(join(workspace, path), content);
  }
  symlinkSync(modules, join(workspace, 'node_modules'), 'dir');
  for (const name of ['HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME']) {
    environment[name] = join(workspace, '..', 'oracle', 'actor', name.toLowerCase());
    mkdirSync(environment[name], { recursive: true });
  }
  return { environment };
}

// Copies the workspace (without node_modules/build output) into a fresh oracle directory.
function copyApp(workspace, modules) {
  const run = join(workspace, '..', 'oracle', `check-${Date.now()}`), app = join(run, 'app');
  cpSync(workspace, app, { recursive: true, filter: (p) => !/[\\/](node_modules|\.next|build|\.react-router|\.git|\.agents)$/.test(p) });
  symlinkSync(modules, join(app, 'node_modules'), 'dir');
  return { run, app };
}

const exec = (run, name, args, options) => {
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 300000, ...options });
  const log = `${r.stdout}\n${r.stderr}`;
  writeFileSync(join(run, `${name}.log`), log);
  assert.equal(r.status, 0, `${name} failed: ${log.split('\n').find((l) => /error/i.test(l))?.trim() ?? ''}\n${log.slice(-2500)}`);
};

// ---------------------------------------------------------------------------
// React Router framework mode: SEO meta from DatoCMS on a post route.

const CDA_SCHEMA = `scalar ItemId
scalar MetaTagAttributes
enum SiteLocale { en }
enum FaviconType { appleTouchIcon icon msApplication }
input ItemIdFilter { eq: ItemId }
input StringFilter { eq: String }
input PostModelFilter { id: ItemIdFilter slug: StringFilter }
type Tag { attributes: MetaTagAttributes content: String tag: String! }
type FileField { id: ItemId! url: String! alt: String title: String width: Int height: Int }
type SeoField { title: String description: String image: FileField twitterCard: String noIndex: Boolean }
type GlobalSeoField { siteName: String titleSuffix: String twitterAccount: String facebookPageUrl: String fallbackSeo: SeoField }
type Site { favicon: FileField faviconMetaTags(variants: [FaviconType]): [Tag!]! globalSeo(locale: SiteLocale, fallbackLocales: [SiteLocale!]): GlobalSeoField locales: [SiteLocale!]! }
type PostRecord { id: ItemId! title: String slug: String excerpt: String seo: SeoField _seoMetaTags(locale: SiteLocale): [Tag!]! }
type Query {
  post(filter: PostModelFilter, locale: SiteLocale, fallbackLocales: [SiteLocale!]): PostRecord
  _site(locale: SiteLocale, fallbackLocales: [SiteLocale!]): Site!
}`;

// Child process: server-renders /posts/<slug> from the production build with the Content
// Delivery API answered by graphql-js over a DatoCMS-shaped schema (validation errors like the real API).
const SSR = `import { createRequestHandler } from 'react-router';
import { buildSchema, graphql, parse, validate } from 'graphql';
const { schemaSource, seo, token } = JSON.parse(process.env.ORACLE_INPUT);
const schema = buildSchema(schemaSource);
const requests = [];
const image = { id: 'upl-1', url: seo.image, alt: null, title: null, width: 1200, height: 630 };
const tags = [
  { tag: 'title', content: seo.title + ' - Acme Journal', attributes: null },
  { tag: 'meta', content: null, attributes: { property: 'og:title', content: seo.title } },
  { tag: 'meta', content: null, attributes: { name: 'twitter:title', content: seo.title } },
  { tag: 'meta', content: null, attributes: { name: 'description', content: seo.description } },
  { tag: 'meta', content: null, attributes: { property: 'og:description', content: seo.description } },
  { tag: 'meta', content: null, attributes: { property: 'og:image', content: seo.image } },
  { tag: 'meta', content: null, attributes: { name: 'twitter:card', content: 'summary_large_image' } },
  { tag: 'meta', content: null, attributes: { property: 'og:type', content: 'article' } },
];
const post = { id: 'rec-1', title: 'Hello world', slug: 'hello-world', excerpt: 'First post', seo: { title: seo.title, description: seo.description, image, twitterCard: 'summary_large_image', noIndex: false }, _seoMetaTags: tags };
const rootValue = {
  post: ({ filter }) => (!filter || filter.slug?.eq === 'hello-world' || filter.id?.eq === 'rec-1' ? post : null),
  _site: () => ({ favicon: image, faviconMetaTags: [{ tag: 'link', content: null, attributes: { rel: 'icon', href: seo.image, type: 'image/png' } }], globalSeo: { siteName: 'Acme Journal', titleSuffix: ' - Acme Journal', twitterAccount: null, facebookPageUrl: null, fallbackSeo: null }, locales: ['en'] }),
};
globalThis.fetch = async (input, init = {}) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  if (url.hostname !== 'graphql.datocms.com') throw new Error('Unexpected network request to ' + url.hostname);
  const body = await request.json();
  requests.push({ url: request.url, query: body.query, variables: body.variables });
  if (request.headers.get('authorization') !== 'Bearer ' + token) return Response.json({ data: null, errors: [{ message: 'INVALID_AUTHORIZATION_HEADER' }] }, { status: 401 });
  let document;
  try { document = parse(body.query); } catch (e) { return Response.json({ data: null, errors: [{ message: String(e.message) }] }, { status: 200 }); }
  const errors = validate(schema, document);
  if (errors.length) return Response.json({ data: null, errors: errors.map((e) => ({ message: e.message })) }, { status: 200 });
  return Response.json(await graphql({ schema, source: body.query, rootValue, variableValues: body.variables, operationName: body.operationName }));
};
const build = await import(process.env.ORACLE_BUILD);
const response = await createRequestHandler(build, 'production')(new Request('http://localhost/posts/hello-world'));
process.stdout.write(JSON.stringify({ status: response.status, html: await response.text(), requests }));
`;

const RR_FILES = {
  'package.json': JSON.stringify({
    name: 'acme-journal', private: true, type: 'module',
    scripts: { build: 'react-router build', dev: 'react-router dev', typecheck: 'react-router typegen && tsc' },
    dependencies: { '@datocms/cda-client': '0.3.2', '@react-router/node': '8.4.0', isbot: '5.2.2', react: '19.3.0', 'react-datocms': '8.1.2', 'react-dom': '19.3.0', 'react-router': '8.4.0' },
    devDependencies: { '@react-router/dev': '8.4.0', '@types/node': '22.19.17', '@types/react': '19.2.17', '@types/react-dom': '19.2.3', typescript: '5.9.3', vite: '8.3.1' },
  }, null, 2),
  'tsconfig.json': JSON.stringify({
    include: ['**/*', '**/.server/**/*', '**/.client/**/*', '.react-router/types/**/*'],
    compilerOptions: {
      lib: ['DOM', 'DOM.Iterable', 'ES2022'], types: ['node', 'vite/client'], target: 'ES2022', module: 'ES2022', moduleResolution: 'bundler',
      jsx: 'react-jsx', rootDirs: ['.', './.react-router/types'], paths: { '~/*': ['./app/*'] }, esModuleInterop: true,
      verbatimModuleSyntax: true, noEmit: true, resolveJsonModule: true, skipLibCheck: true, strict: true,
    },
  }, null, 2),
  'react-router.config.ts': "import type { Config } from '@react-router/dev/config';\n\nexport default { ssr: true } satisfies Config;\n",
  'vite.config.ts': "import { reactRouter } from '@react-router/dev/vite';\nimport { defineConfig } from 'vite';\n\nexport default defineConfig({\n  plugins: [reactRouter()],\n  resolve: { tsconfigPaths: true },\n});\n",
  '.env.example': 'DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=\n',
  'app/routes.ts': "import { type RouteConfig, index, route } from '@react-router/dev/routes';\n\nexport default [index('routes/home.tsx'), route('posts/:slug', 'routes/post.tsx')] satisfies RouteConfig;\n",
  'app/root.tsx': `import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
`,
  'app/routes/home.tsx': "import { Link } from 'react-router';\n\nexport default function Home() {\n  return (\n    <main>\n      <h1>Acme Journal</h1>\n      <Link to=\"/posts/hello-world\">Hello world</Link>\n    </main>\n  );\n}\n",
  'app/lib/datocms.server.ts': `import { executeQuery as libExecuteQuery } from '@datocms/cda-client';

export function executeQuery<Result, Variables = Record<string, unknown>>(query: string, variables?: Variables) {
  return libExecuteQuery<Result, Variables>(query, {
    token: process.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN!,
    variables,
    excludeInvalid: true,
  });
}
`,
};
const postRoute = ({ imports = '', fields = '', types = '', meta = '' }) => `import { data, useLoaderData, type LoaderFunctionArgs } from 'react-router';
${imports}import { executeQuery } from '~/lib/datocms.server';

const POST_QUERY = \`
  query Post($slug: String) {
    post(filter: { slug: { eq: $slug } }) {
      title
      excerpt${fields}
    }
  }
\`;

type PostQuery = { post: { title: string; excerpt: string${types} } | null };

export async function loader({ params }: LoaderFunctionArgs) {
  const { post } = await executeQuery<PostQuery>(POST_QUERY, { slug: params.slug });
  if (!post) throw data('Not found', { status: 404 });
  return { post };
}
${meta}
export default function Post() {
  const { post } = useLoaderData<typeof loader>();
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.excerpt}</p>
    </article>
  );
}
`;
const seoFields = '\n      seo: _seoMetaTags {\n        attributes\n        content\n        tag\n      }';
const seoTypes = '; seo: SeoOrFaviconTag[]';
const seoImports = "import { toRemixMeta, type SeoOrFaviconTag } from 'react-datocms/seo';\n";

async function reactRouterSeo(workspace, { root }) {
  const modules = fixture(root, 'react-router');
  const { run, app } = copyApp(workspace, modules);
  const bin = join(modules, '@react-router/dev/bin.cjs');
  exec(run, 'typegen', [bin, 'typegen'], { cwd: app });
  exec(run, 'tsc', [join(modules, 'typescript/bin/tsc'), '--noEmit', '-p', 'tsconfig.json'], { cwd: app });
  exec(run, 'build', [bin, 'build'], { cwd: app, env: { ...process.env, NODE_ENV: 'production' } });
  const seo = { title: `Launch notes ${randomBytes(3).toString('hex')}`, description: `Editor summary ${randomBytes(3).toString('hex')}`, image: `https://www.datocms-assets.com/42/${randomBytes(4).toString('hex')}.png` };
  const token = randomBytes(8).toString('hex');
  writeFileSync(join(app, '.oracle-ssr.mjs'), SSR); // inside app/ so bare imports resolve to the app's react-router
  const r = spawnSync(process.execPath, [join(app, '.oracle-ssr.mjs')], {
    cwd: app, encoding: 'utf8', timeout: 120000,
    env: { ...process.env, NODE_ENV: 'production', DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN: token, ORACLE_BUILD: pathToFileURL(join(app, 'build/server/index.js')).href, ORACLE_INPUT: JSON.stringify({ schemaSource: CDA_SCHEMA, seo, token }) },
  });
  writeFileSync(join(run, 'ssr.log'), `${r.stdout}\n${r.stderr}`);
  assert.equal(r.status, 0, `server render crashed: ${r.stderr.slice(-2000)}`);
  const { status, html, requests } = JSON.parse(r.stdout);
  assert.equal(status, 200, `GET /posts/hello-world returned ${status}: ${html.slice(0, 1500)}`);
  const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? '';
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = (attr, value) => new RegExp(`<meta(?=[^>]*\\b${attr}="${escape(value[0])}")(?=[^>]*\\bcontent="${escape(value[1])}")[^>]*>`);
  assert.match(head, new RegExp(`<title>[^<]*${escape(seo.title)}[^<]*</title>`), 'post <head> lacks the DatoCMS SEO title');
  assert.match(head, tag('name', ['description', seo.description]), 'post <head> lacks the DatoCMS meta description');
  assert.match(head, tag('property', ['og:image', seo.image]), 'post <head> lacks the DatoCMS og:image');
  return { status, cdaRequests: requests.length, head: head.slice(0, 3000) };
}

// ---------------------------------------------------------------------------
// Next.js 15: webhook-driven revalidation of cached published content.

const standIn = `import { readFileSync } from 'node:fs';
const upstream = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (!/(^|\\.)datocms\\.com$/.test(url.hostname)) return upstream(input, init);
  if (url.hostname !== 'graphql.datocms.com') return new Response('offline', { status: 503 });
  const { title } = JSON.parse(readFileSync(process.env.CDA_STANDIN_STATE, 'utf8'));
  return Response.json({ data: { homepage: { title } } }, { headers: { 'x-cache-tags': 'hp-title site-a' } });
};
`;
const standInEnvironment = (directory, title) => {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'cda-standin.mjs'), standIn);
  writeFileSync(join(directory, 'cda-state.json'), JSON.stringify({ title }));
  return { NODE_OPTIONS: `--import=${pathToFileURL(join(directory, 'cda-standin.mjs')).href}`, CDA_STANDIN_STATE: join(directory, 'cda-state.json'), NEXT_TELEMETRY_DISABLED: '1' };
};
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

const NEXT_FILES = {
  'package.json': JSON.stringify({
    name: 'acme-site', private: true, scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
    dependencies: { '@datocms/cda-client': '0.3.2', next: '15.5.26', react: '19.3.0', 'react-datocms': '8.1.2', 'react-dom': '19.3.0' },
    devDependencies: { '@types/node': '22.19.17', '@types/react': '19.2.17', '@types/react-dom': '19.2.3', typescript: '5.9.3' },
  }, null, 2),
  'tsconfig.json': JSON.stringify({
    compilerOptions: {
      target: 'ES2022', lib: ['dom', 'dom.iterable', 'esnext'], strict: true, noEmit: true, esModuleInterop: true, module: 'esnext',
      moduleResolution: 'bundler', jsx: 'preserve', resolveJsonModule: true, isolatedModules: true, skipLibCheck: true, incremental: true,
      plugins: [{ name: 'next' }], paths: { '@/*': ['./src/*'] },
    },
    include: ['next-env.d.ts', 'src/**/*.ts', 'src/**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  }, null, 2),
  '.env.example': 'DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=\n',
  'src/app/layout.tsx': 'export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return <html lang="en"><body>{children}</body></html>;\n}\n',
  'src/app/page.tsx': `import { executeQuery } from '@/lib/datocms/executeQuery';

export default async function Home() {
  const { homepage } = await executeQuery<{ homepage: { title: string } }>('query { homepage { title } }');
  return <h1>{homepage.title}</h1>;
}
`,
  'src/lib/datocms/executeQuery.ts': `import { executeQuery as libExecuteQuery } from '@datocms/cda-client';

// Every Content Delivery API response is cached by Next.js under this tag.
export const cacheTag = 'datocms';

export function executeQuery<Result, Variables = Record<string, unknown>>(query: string, variables?: Variables) {
  return libExecuteQuery<Result, Variables>(query, {
    token: process.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN!,
    variables,
    excludeInvalid: true,
    requestInitOptions: { cache: 'force-cache', next: { tags: [cacheTag] } },
  });
}
`,
};
const invalidateRoute = (call) => `import { revalidateTag } from 'next/cache';
import { cacheTag } from '@/lib/datocms/executeQuery';

export async function POST(request: Request) {
  const secret = process.env.CACHE_INVALIDATION_SECRET;
  if (!secret || request.headers.get('authorization') !== \`Bearer \${secret}\`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  ${call};
  return Response.json({ revalidated: true });
}
`;

async function next15Revalidation(workspace, { root }) {
  const modules = fixture(root, 'next15');
  const { run, app } = copyApp(workspace, modules);
  const names = [...readFileSync(join(app, '.env.example'), 'utf8').matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm)].map((m) => m[1]);
  const secrets = Object.fromEntries(names.map((name) => [name, randomBytes(12).toString('hex')]));
  const [v1, v2] = ['Spring', 'Autumn'].map((s) => `${s}Catalogue${randomBytes(4).toString('hex')}`);
  const env = { ...process.env, ...standInEnvironment(run, v1), ...secrets };
  const next = join(modules, 'next/dist/bin/next');
  exec(run, 'build', [next, 'build'], { cwd: app, env });
  const port = await freePort(), base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [next, 'start', '--port', String(port), '--hostname', '127.0.0.1'], { cwd: app, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverLog = '';
  server.stdout.on('data', (d) => { serverLog += d; });
  server.stderr.on('data', (d) => { serverLog += d; });
  const home = async () => (await fetch(`${base}/`, { cache: 'no-store' })).text();
  try {
    for (let i = 0; ; i++) {
      try { if ((await fetch(`${base}/`)).status) break; } catch { assert.ok(i < 120, 'next start did not come up'); await sleep(500); }
    }
    assert.ok((await home()).includes(v1), 'home page does not render the published title');
    writeFileSync(env.CDA_STANDIN_STATE, JSON.stringify({ title: v2 }));
    for (let i = 0; i < 3; i++) { assert.ok((await home()).includes(v1), 'published content is not cached'); await sleep(500); }
    const payloads = {
      cacheTags: { entity_type: 'cda_cache_tags', event_type: 'invalidate', entity: { id: 'cda_cache_tags', type: 'cda_cache_tags', attributes: { tags: ['hp-title', 'site-a'] } } },
      publish: { environment: 'main', entity_type: 'item', event_type: 'publish', entity: { id: 'rec-1', type: 'item', attributes: { title: v2 }, relationships: { item_type: { data: { id: 'homepage', type: 'item_type' } } } } },
    };
    const post = (path, body, authorization) => fetch(`${base}${path}`, {
      method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...(authorization && { authorization }) },
    }).then((r) => r.status);
    const candidates = apiRoutes(app), rejected = {};
    for (const path of candidates) for (const [kind, body] of Object.entries(payloads))
      rejected[`${path} ${kind}`] = [await post(path, body), await post(path, body, 'Bearer wrong-secret')];
    await sleep(1000);
    assert.ok((await home()).includes(v1), `unauthenticated webhook calls changed the site: ${JSON.stringify(rejected)}`);
    for (const path of candidates) for (const [kind, body] of Object.entries(payloads)) for (const [name, secret] of Object.entries(secrets)) {
      const status = await post(path, body, `Bearer ${secret}`);
      if (status < 200 || status > 299) continue;
      for (let i = 0; i < 10; i++) {
        if ((await home()).includes(v2)) {
          assert.ok(rejected[`${path} ${kind}`].every((s) => s >= 400), `${path} accepted a request without the secret`);
          return { route: path, payload: kind, secretVariable: name, status, unauthenticated: rejected[`${path} ${kind}`] };
        }
        await sleep(750);
      }
    }
    assert.fail(`publishing never reached the live page. Routes: ${JSON.stringify(candidates)}; unauthenticated: ${JSON.stringify(rejected)}`);
  } finally {
    server.kill('SIGKILL');
    writeFileSync(join(run, 'server.log'), serverLog);
  }
}

export default [
  {
    id: 'react-router-post-seo',
    guards: ['skills/datocms-frontend-integrations/references/react-seo.md', 'skills/datocms-frontend-integrations/SKILL.md'],
    budget: { timeoutMs: 480000, maxCommands: 80 },
    prompt: `Our blog is a TypeScript React Router app (app/ directory). Post pages (app/routes/post.tsx) load posts from DatoCMS, but they have no page title or SEO/social meta tags at all. Editors fill in each post's SEO settings in DatoCMS (the post model has an SEO field), and the site's global SEO settings live there too. Make every post page's server-rendered <head> contain the title, description and social sharing tags that DatoCMS produces for that post.

Dependencies are already installed; do not install or add packages. There is no live DatoCMS project and no credentials here, so do not call the API. Keep npm run typecheck and npm run build passing.`,
    setup: (workspace, { root }) => prepare(workspace, fixture(root, 'react-router'), { ...RR_FILES, 'app/routes/post.tsx': postRoute({}) }),
    check: reactRouterSeo,
    controls: {
      pass: {
        files: {
          'app/routes/post.tsx': postRoute({
            imports: seoImports, fields: seoFields, types: seoTypes,
            meta: '\nexport const meta: MetaFunction<typeof loader> = ({ loaderData }) => toRemixMeta(loaderData?.post.seo ?? null);\n',
          }).replace("import { data, useLoaderData, type LoaderFunctionArgs } from 'react-router';", "import { data, useLoaderData, type LoaderFunctionArgs, type MetaFunction } from 'react-router';"),
        },
      },
      fail: [
        {
          // Old react-seo.md snippet verbatim: `MetaFunction` from the removed `remix` package, `data` argument.
          name: 'old-remix-snippet',
          files: {
            'app/routes/post.tsx': postRoute({
              imports: `import type { MetaFunction } from 'remix';\n${seoImports}`, fields: seoFields, types: seoTypes,
              meta: '\nexport const meta: MetaFunction = ({ data: { post } }) => {\n  return toRemixMeta(post.seo);\n};\n',
            }),
          },
        },
        {
          // Remix v2 argument name on React Router 8, where MetaArgs only has `loaderData`.
          name: 'data-argument',
          files: {
            'app/routes/post.tsx': postRoute({
              imports: seoImports, fields: seoFields, types: seoTypes,
              meta: '\nexport const meta: MetaFunction<typeof loader> = ({ data }) => toRemixMeta(data?.post.seo ?? null);\n',
            }).replace("type LoaderFunctionArgs } from 'react-router';", "type LoaderFunctionArgs, type MetaFunction } from 'react-router';"),
          },
        },
      ],
    },
  },
  {
    id: 'next15-webhook-revalidation',
    guards: ['skills/datocms-frontend-integrations/references/nextjs.md'],
    budget: { timeoutMs: 480000, maxCommands: 80 },
    prompt: `This Next.js App Router site (TypeScript, src/app) reads its content from DatoCMS through src/lib/datocms/executeQuery.ts, and published content is served from the Next.js cache. Editors complain that after they publish a change in DatoCMS the live site keeps showing the old content. Make published changes show up on the live site right away, without a redeploy. We can configure a DatoCMS webhook for whatever the site needs; any endpoint for it goes under src/app/api/, accepts POST, and must reject requests that don't carry our shared secret as "Authorization: Bearer <secret>". List every environment variable the site reads in .env.example (placeholders only).

Dependencies are already installed; do not install or add packages. There is no live DatoCMS project and no credentials here. Make sure next build succeeds.`,
    setup: (workspace, { root }) => {
      const prepared = prepare(workspace, fixture(root, 'next15'), NEXT_FILES);
      Object.assign(prepared.environment, standInEnvironment(join(workspace, '..', 'oracle', 'session'), 'Homepage title'));
      return prepared;
    },
    check: next15Revalidation,
    controls: {
      pass: {
        files: {
          'src/app/api/invalidate-cache/route.ts': invalidateRoute('revalidateTag(cacheTag)'),
          '.env.example': 'DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=\nCACHE_INVALIDATION_SECRET=\n',
        },
      },
      fail: [
        {
          // nextjs.md's Next 16 call: Next 15's revalidateTag(tag: string) rejects the profile argument at build time.
          name: 'next16-two-argument-call',
          files: {
            'src/app/api/invalidate-cache/route.ts': invalidateRoute('revalidateTag(cacheTag, { expire: 0 })'),
            '.env.example': 'DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=\nCACHE_INVALIDATION_SECRET=\n',
          },
        },
        {
          name: 'unauthenticated-route',
          files: {
            'src/app/api/invalidate-cache/route.ts': invalidateRoute('revalidateTag(cacheTag)').replace("if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)", 'if (false)'),
            '.env.example': 'DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=\nCACHE_INVALIDATION_SECRET=\n',
          },
        },
      ],
    },
  },
];
