import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, relative } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

// Preloaded into every Node process. It replaces fetch before Next.js wraps it,
// so the real Next.js Data Cache sits above this Content Delivery API stand-in.
const standIn = `import { appendFileSync, readFileSync } from 'node:fs';
const upstream = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (!/(^|\\.)datocms\\.com$/.test(url.hostname)) return upstream(input, init);
  const { title } = JSON.parse(readFileSync(process.env.CDA_STANDIN_STATE, 'utf8'));
  appendFileSync(process.env.CDA_STANDIN_LOG, JSON.stringify({ at: Date.now(), host: url.hostname, title }) + '\\n');
  if (url.hostname !== 'graphql.datocms.com') return new Response('offline', { status: 503 });
  return Response.json({ data: { homepage: { title } } }, { headers: { 'x-cache-tags': 'hp-title site-a' } });
};
`;

function standInEnvironment(directory, title) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'cda-standin.mjs'), standIn);
  writeFileSync(join(directory, 'cda-state.json'), JSON.stringify({ title }));
  return {
    NODE_OPTIONS: `--import=${pathToFileURL(join(directory, 'cda-standin.mjs')).href}`,
    CDA_STANDIN_STATE: join(directory, 'cda-state.json'),
    CDA_STANDIN_LOG: join(directory, 'cda-requests.jsonl'),
    NEXT_TELEMETRY_DISABLED: '1',
  };
}

function routes(app) {
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

const freePort = () => new Promise((done) => {
  const server = createServer().listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => done(port)); });
});

const executeQueryFor = (requestInitOptions) => `import { executeQuery as libExecuteQuery } from '@datocms/cda-client';

export const cacheTag = 'datocms';

export async function executeQuery<Result, Variables>(
  query: string,
  options?: ExecuteQueryOptions<Variables>,
) {
  const result = await libExecuteQuery<Result, Variables>(query, {
    variables: options?.variables,
    excludeInvalid: true,
    includeDrafts: options?.includeDrafts,
    token: options?.includeDrafts
      ? process.env.DATOCMS_DRAFT_CONTENT_CDA_TOKEN!
      : process.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN!,
    requestInitOptions: ${requestInitOptions},
  });

  return result;
}

type ExecuteQueryOptions<Variables> = {
  variables?: Variables;
  includeDrafts?: boolean;
};
`;
const oldWrapper = executeQueryFor(`{
      cache: 'force-cache',
      next: {
        tags: [cacheTag],
      },
    }`);
const page = `import { executeQuery } from '@/lib/datocms/executeQuery';

export default async function Home() {
  const { homepage } = await executeQuery<{ homepage: { title: string } }, Record<string, never>>('query { homepage { title } }');
  return <h1>{homepage.title}</h1>;
}
`;
const route = (guard) => `import { revalidateTag } from 'next/cache';
import { cacheTag } from '@/lib/datocms/executeQuery';

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (${guard}) return Response.json({ error: 'Invalid token' }, { status: 401 });
  revalidateTag(cacheTag, { expire: 0 });
  return Response.json({ revalidated: true });
}
`;
const coreEnv = 'DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=\nDATOCMS_DRAFT_CONTENT_CDA_TOKEN=\nSECRET_API_TOKEN=\n';

export default [
  {
    id: 'next-published-cache-refresh',
    guards: ['skills/datocms-frontend-integrations/references/nextjs.md'],
    budget: { timeoutMs: 480000, maxCommands: 80 },
    prompt: `This Next.js App Router project (TypeScript, src/app) is going to read its content from DatoCMS. Dependencies are already installed (next, react, @datocms/cda-client, react-datocms); do not install or add packages. There is no live DatoCMS project and no credentials here; Content Delivery API requests made from Node on this machine are answered by a local stand-in.

1. Create src/lib/datocms/executeQuery.ts, a server-side helper for Content Delivery API queries that reads the published-content API token from an environment variable.
2. Update src/app/page.tsx so the home page renders the homepage singleton's title (query { homepage { title } }) in an <h1>, using that helper.
3. Published content must be served from the Next.js cache instead of calling DatoCMS on every visit, but when an editor publishes a change it must show up on the live site right away, without a redeploy. We can configure a DatoCMS webhook for whatever the site needs; any endpoint for it goes under src/app/api/, accepts POST, and must reject requests without the shared secret sent as "Authorization: Bearer <secret>".
4. List every environment variable the site reads in .env.example (placeholders only).

Make sure next build succeeds.`,
    setup(workspace, { root }) {
      const oracle = join(workspace, '..', 'oracle');
      const environment = standInEnvironment(join(oracle, 'session'), 'Homepage title');
      for (const name of ['HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME']) {
        environment[name] = join(oracle, 'actor', name.toLowerCase());
        mkdirSync(environment[name], { recursive: true });
      }
      const fixture = join(root, 'e2e/catalog/web');
      const pkg = JSON.parse(readFileSync(join(fixture, 'package.json'), 'utf8'));
      // Webpack, like e2e/frontend: Turbopack rejects the symlinked shared node_modules.
      pkg.scripts = { dev: 'next dev', build: 'next build --webpack', start: 'next start' };
      const files = {
        'package.json': JSON.stringify(pkg, null, 2),
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            target: 'ES2022', lib: ['dom', 'dom.iterable', 'esnext'], strict: true, noEmit: true, esModuleInterop: true,
            module: 'esnext', moduleResolution: 'bundler', jsx: 'react-jsx', resolveJsonModule: true, isolatedModules: true,
            skipLibCheck: true, plugins: [{ name: 'next' }], paths: { '@/*': ['./src/*'] },
          },
          include: ['next-env.d.ts', 'src/**/*.ts', 'src/**/*.tsx', '.next/types/**/*.ts'],
          exclude: ['node_modules'],
        }, null, 2),
        'src/app/layout.tsx': 'export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return <html lang="en"><body>{children}</body></html>;\n}\n',
        'src/app/page.tsx': 'export default function Home() {\n  return <h1>Coming soon</h1>;\n}\n',
      };
      for (const [path, content] of Object.entries(files)) {
        mkdirSync(join(workspace, path, '..'), { recursive: true });
        writeFileSync(join(workspace, path), content);
      }
      symlinkSync(join(fixture, 'node_modules'), join(workspace, 'node_modules'));
      return { environment };
    },
    async check(workspace, { root }) {
      const run = join(workspace, '..', 'oracle', `check-${Date.now()}`), app = join(run, 'app');
      cpSync(workspace, app, { recursive: true, filter: (p) => !/[\\/](node_modules|\.next|\.git|\.agents)$/.test(p) });
      symlinkSync(join(root, 'e2e/catalog/web/node_modules'), join(app, 'node_modules'));
      const names = [...readFileSync(join(app, '.env.example'), 'utf8').matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm)].map((m) => m[1]);
      assert.ok(names.length, '.env.example lists no variables');
      const secrets = Object.fromEntries(names.map((name) => [name, randomBytes(12).toString('hex')]));
      const [v1, v2] = ['Spring', 'Autumn'].map((s) => `${s}Catalogue${randomBytes(4).toString('hex')}`);
      const env = { ...process.env, ...standInEnvironment(run, v1), ...secrets };
      const next = join(app, 'node_modules/next/dist/bin/next');
      const build = spawnSync(process.execPath, [next, 'build', '--webpack'], { cwd: app, env, encoding: 'utf8', timeout: 300000 });
      writeFileSync(join(run, 'build.log'), `${build.stdout}\n${build.stderr}`);
      assert.equal(build.status, 0, `next build failed: ${`${build.stdout}\n${build.stderr}`.slice(-2500)}`);

      const port = await freePort(), base = `http://127.0.0.1:${port}`;
      const server = spawn(process.execPath, [next, 'start', '--port', String(port), '--hostname', '127.0.0.1'], { cwd: app, env, stdio: ['ignore', 'pipe', 'pipe'] });
      let serverLog = '';
      server.stdout.on('data', (d) => { serverLog += d; });
      server.stderr.on('data', (d) => { serverLog += d; });
      const home = async () => (await fetch(`${base}/`, { cache: 'no-store' })).text();
      const settled = async (title, attempts) => {
        for (let i = 0; i < attempts; i++) { if ((await home()).includes(title)) return true; await sleep(750); }
        return false;
      };
      try {
        for (let i = 0; ; i++) {
          try { if ((await fetch(`${base}/`)).status) break; } catch { assert.ok(i < 120, 'next start did not come up'); await sleep(500); }
        }
        assert.ok((await home()).includes(v1), 'Home page does not render the published title');
        writeFileSync(env.CDA_STANDIN_STATE, JSON.stringify({ title: v2 }));
        for (let i = 0; i < 3; i++) { assert.ok((await home()).includes(v1), 'Published content is not cached: page changed without invalidation'); await sleep(750); }

        const candidates = routes(app);
        const payloads = {
          cacheTags: { entity_type: 'cda_cache_tags', event_type: 'invalidate', entity: { id: 'cda_cache_tags', type: 'cda_cache_tags', attributes: { tags: ['hp-title', 'site-a'] } } },
          publish: { environment: 'main', entity_type: 'item', event_type: 'publish', entity: { id: 'rec-1', type: 'item', attributes: { title: v2 }, relationships: { item_type: { data: { id: 'homepage', type: 'item_type' } } } } },
        };
        const post = (path, body, authorization) => fetch(`${base}${path}`, {
          method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...(authorization && { authorization }) },
        }).then((r) => r.status);
        const rejected = {};
        for (const path of candidates) for (const [kind, body] of Object.entries(payloads))
          rejected[`${path} ${kind}`] = [await post(path, body), await post(path, body, 'Bearer wrong-secret')];
        await sleep(1000);
        for (let i = 0; i < 3; i++) { assert.ok((await home()).includes(v1), `Unauthenticated webhook calls changed the site: ${JSON.stringify(rejected)}`); await sleep(750); }

        for (const path of candidates) for (const [kind, body] of Object.entries(payloads)) for (const [name, secret] of Object.entries(secrets)) {
          const status = await post(path, body, `Bearer ${secret}`);
          if (status < 200 || status > 299 || !(await settled(v2, 10))) continue;
          const unauthenticated = rejected[`${path} ${kind}`];
          assert.ok(unauthenticated.every((s) => s >= 400), `${path} accepted a request without the secret: ${unauthenticated}`);
          return { route: path, payload: kind, secretVariable: name, status, unauthenticated, variables: names };
        }
        assert.fail(`Publishing never reached the live page. Routes: ${JSON.stringify(candidates)}; unauthenticated statuses: ${JSON.stringify(rejected)}`);
      } finally {
        server.kill('SIGKILL');
        writeFileSync(join(run, 'server.log'), serverLog);
      }
    },
    controls: {
      pass: {
        files: {
          'src/lib/datocms/executeQuery.ts': oldWrapper,
          'src/app/page.tsx': page,
          'src/app/api/invalidate-cache/route.ts': route('!process.env.SECRET_API_TOKEN || token !== process.env.SECRET_API_TOKEN'),
          '.env.example': coreEnv,
        },
      },
      fail: [
        { name: 'core-wrapper-without-invalidation-route', files: { 'src/lib/datocms/executeQuery.ts': oldWrapper, 'src/app/page.tsx': page, '.env.example': coreEnv } },
        {
          name: 'uncached-reads',
          files: {
            'src/lib/datocms/executeQuery.ts': executeQueryFor(`{ cache: 'no-store' }`),
            'src/app/page.tsx': page,
            'src/app/api/invalidate-cache/route.ts': route('!process.env.SECRET_API_TOKEN || token !== process.env.SECRET_API_TOKEN'),
            '.env.example': coreEnv,
          },
        },
        {
          name: 'unauthenticated-route',
          files: { 'src/lib/datocms/executeQuery.ts': oldWrapper, 'src/app/page.tsx': page, 'src/app/api/invalidate-cache/route.ts': route('false'), '.env.example': coreEnv },
        },
      ],
    },
  },
];
