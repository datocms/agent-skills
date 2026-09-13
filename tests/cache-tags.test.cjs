const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const blocks = s => [...s.matchAll(/```(?:ts|tsx)\n([\s\S]*?)\n```/g)].map(m => m[1]);
const plain = value => JSON.parse(JSON.stringify(value));
function run(code, imports = {}, globals = {}) {
    const exports = {};
    const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(js, { exports, require: name => { assert(name in imports, `Unexpected import ${name}`); return imports[name]; }, Response, Request, Headers, URL, setTimeout, process: { env: { CACHE_INVALIDATION_WEBHOOK_SECRET: 'secret', DATOCMS_DRAFT_CONTENT_CDA_TOKEN: 'draft', DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN: 'published' } }, ...globals });
    return exports;
}
const common = blocks(read('skills/datocms-cda/references/draft-caching-environments.md')).find(s => s.includes('export function createPageCacheTags'));
const { createPageCacheTags, purgeInBatches } = run(common);
const fixtures = Object.fromEntries(['nextjs', 'nuxt', 'sveltekit', 'astro'].map(name => [name, blocks(read(`skills/datocms-frontend-integrations/references/${name}.md`).split('\n## Cache Tags (Optional)')[1])]));
const response = (status, headers = {}) => new Response(null, { status, headers });
const request = (tags, auth = 'secret') => new Request('https://fixture.invalid/api/invalidate', { method: 'POST', headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/json' }, body: JSON.stringify({ entity: { attributes: { tags } } }) });
(async () => {
    const collector = createPageCacheTags();
    assert.deepEqual(plain(collector.headers('cloudflare')), {});
    collector.add(' a b a ');
    collector.add('b\tc\n');
    collector.add(null);
    for (const [provider, header, delimiter] of [['netlify', 'Netlify-Cache-Tag', ','], ['cloudflare', 'Cache-Tag', ','], ['fastly', 'Surrogate-Key', ' ']])
        assert.equal(collector.headers(provider)[header], ['a', 'b', 'c'].join(delimiter));
    assert.throws(() => collector.headers('bunny'), /Configure Bunny/);
    collector.add('draft', true);
    collector.add('later');
    assert.deepEqual(plain(collector.headers('cloudflare')), { 'Cache-Control': 'private, no-store' });
    assert.deepEqual(plain(createPageCacheTags().headers('fastly')), {});
    for (const size of [1, 2, 100])
        for (const count of [0, size - 1, size, size + 1, 2 * size + 1]) {
            const tags = Array.from({ length: count }, (_, i) => `t${i}`), sent = [];
            await purgeInBatches([...tags, ...tags, ''], size, async (batch) => { sent.push([...batch]); return response(200); });
            assert.deepEqual(sent.flat(), tags);
            assert(sent.every(b => b.length <= size));
        }
    for (const size of [0, -1, 1.1, Infinity, NaN])
        await assert.rejects(purgeInBatches(['a'], size, async () => response(200)));
    let calls = 0, pauses = [];
    await purgeInBatches(['a'], 1, async () => ++calls < 3 ? response(503) : response(200), async (ms) => pauses.push(ms));
    assert.equal(calls, 3);
    assert.deepEqual(pauses, [250, 500]);
    for (const status of [400, 401, 403, 429, 500]) {
        calls = 0;
        await assert.rejects(purgeInBatches(['a'], 1, async () => { calls++; return response(status); }, async () => { }));
        assert.equal(calls, status === 429 || status >= 500 ? 3 : 1);
    }
    calls = 0;
    await assert.rejects(purgeInBatches(['a'], 1, async () => { calls++; throw Error('Network failure'); }, async () => { }));
    assert.equal(calls, 3);
    calls = 0;
    await assert.rejects(purgeInBatches(['a'], 1, async () => { calls++; return response(429, { 'Retry-After': '120' }); }, async () => assert.fail('must defer long retry')));
    assert.equal(calls, 1);
    calls = 0;
    pauses = [];
    await purgeInBatches(['a'], 1, async () => ++calls === 1 ? response(429, { 'Retry-After': '1' }) : response(200), async (ms) => pauses.push(ms));
    assert.deepEqual(pauses, [1000]);
    let sent = [];
    await assert.rejects(purgeInBatches(['a', 'b', 'c'], 1, async (batch) => { sent.push(...batch); return response(batch[0] === 'b' ? 400 : 200); }, async () => { }));
    assert.deepEqual(sent, ['a', 'b']);
    for (const framework of ['nuxt', 'sveltekit', 'astro']) {
        let failures = false, batches = [];
        const code = fixtures[framework].find(s => s.includes('purgeInBatches') && s.includes('authorization'));
        const imports = {};
        for (const match of code.matchAll(/from '([^']+)'/g)) {
            const name = match[1];
            if (name.endsWith('/cache-tags'))
                imports[name] = { purgeInBatches: (tags, size, send) => purgeInBatches(tags, size, send, async () => { }) };
            else if (name.endsWith('/purge-adapter'))
                imports[name] = { purgeBatchSize: 2, purgeBatch: async (tags) => { batches.push([...tags]); return response(failures ? 503 : 200); } };
            else if (name === '$env/dynamic/private')
                imports[name] = { env: { PRIVATE_CACHE_INVALIDATION_WEBHOOK_SECRET: 'secret' } };
            else if (name === 'astro:env/server')
                imports[name] = { CACHE_INVALIDATION_WEBHOOK_SECRET: 'secret' };
            else if (name === '@sveltejs/kit' || name.endsWith('/api/utils') || name.endsWith('/utils'))
                imports[name] = { json: Response.json.bind(Response), ensureHttpMethods: () => { } };
        }
        const globals = { eventHandler: fn => fn, useRuntimeConfig: () => ({ cacheInvalidationWebhookSecret: 'secret' }), getHeader: (e, k) => e.request.headers.get(k), readBody: e => e.request.json(), createError: ({ statusCode, message }) => Object.assign(new Error(message), { status: statusCode }) };
        const mod = run(code, imports, globals), handler = mod.POST ?? mod.default;
        async function invoke(tags, auth = 'secret') {
            try {
                const result = await handler({ request: request(tags, auth) });
                return result instanceof Response ? result.status : 200;
            }
            catch (error) {
                return error.status ?? 500;
            }
        }
        assert.equal(await invoke(['a'], 'wrong'), 401, framework);
        assert.equal(batches.length, 0);
        assert.equal(await invoke([null]), 400, framework);
        assert.equal(await invoke([]), 200);
        assert.equal(batches.length, 0);
        assert.equal(await invoke(['a', 'b', 'c']), 200);
        assert.deepEqual(batches, [['a', 'b'], ['c']]);
        failures = true;
        assert.equal(await invoke(['a']), 502, framework);
    }
    // Execute the shipped Next.js query wrapper; draft reads cannot alter published mappings.
    let draft = false, options = [], mapped = [];
    const wrapper = fixtures.nextjs.find(s => s.includes('async function executeQueryFn'));
    const queryApi = run(wrapper, { '@datocms/cda-client': { rawExecuteQuery: async (q, o) => { options.push(o); return [{ ok: true }, response(200, { 'x-cache-tags': 'a b' })]; } }, 'next/headers': { draftMode: async () => ({ isEnabled: draft }) }, react: { cache: fn => fn }, './cache-tags-db': { cacheTagsDb: { storeTags: async (id, tags) => mapped.push([id, plain(tags)]) } } });
    await queryApi.executeQuery('query', { queryId: 'published' });
    assert.equal(options[0].requestInitOptions.cache, 'force-cache');
    assert.deepEqual(mapped, [['published', ['a', 'b']]]);
    draft = true;
    await queryApi.executeQuery('query', { queryId: 'published' });
    assert.equal(options[1].token, 'draft');
    assert.equal(options[1].requestInitOptions.cache, 'no-store');
    assert.equal(options[1].returnCacheTags, false);
    assert.equal(mapped.length, 1);
    const nextCode = fixtures.nextjs.find(s => s.includes('export async function POST'));
    let invalidated = [], dbFail = false;
    const next = run(nextCode, { '@/lib/datocms/cache-tags-db': { cacheTagsDb: { findQueryIdsForTags: async () => { if (dbFail)
                    throw Error('DB unavailable'); return ['page', 'layout']; } } }, '@/lib/datocms/executeQuery': { cacheTag: 'datocms' }, 'next/cache': { revalidateTag: tag => invalidated.push(tag) }, 'next/server': { NextResponse: { json: Response.json.bind(Response) } } });
    assert.equal((await next.POST(request(['a'], 'wrong'))).status, 401);
    assert.equal(invalidated.length, 0);
    assert.equal((await next.POST(request(['a']))).status, 200);
    assert.deepEqual(invalidated, ['datocms', 'page', 'layout']);
    dbFail = true;
    await assert.rejects(next.POST(request(['a'])));
    console.log('Cache-tag examples passed: delimiters, empty/duplicate tags, query union, draft isolation, batch boundaries, bounded retries, partial failures, authentication, and Next.js mapping failures.');
})().catch(error => { console.error(error); process.exitCode = 1; });
