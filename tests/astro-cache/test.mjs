import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
process.chdir(root);
const doc = readFileSync('../../skills/datocms-frontend-integrations/references/astro.md', 'utf8').split('## Cache Tags (Optional)')[1];
const blocks = [...doc.matchAll(/```ts\n([\s\S]*?)\n```/g)].map(m => m[1]);
assert.equal(blocks.length, 4);
const dir = path.join(root, 'tmp');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const write = (name, text) => { mkdirSync(path.dirname(path.join(dir, name)), { recursive: true }); writeFileSync(path.join(dir, name), text); };
['native.config.ts', 'src/lib/datocms/executeQueryWithCacheTags.ts', 'src/middleware.ts', 'src/pages/api/invalidate-cache.ts'].forEach((p, i) => write(p, blocks[i]));
// Stand-in for an existing authenticated session, never an enable-preview endpoint.
write('src/lib/draftMode.ts', `import type {AstroCookies} from 'astro'; export function isDraftModeEnabled(cookies:AstroCookies){return cookies.get('verified-preview')?.value==='synthetic-session';}`);
write('src/env.d.ts', `declare module 'astro:env/server' {export const DATOCMS_DRAFT_CONTENT_CDA_TOKEN:string;export const DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN:string;export const CACHE_INVALIDATION_WEBHOOK_SECRET:string;}`);
write('tsconfig.json', JSON.stringify({ compilerOptions: { strict: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', skipLibCheck: true, noEmit: true, lib: ['ES2022', 'DOM'], types: ['node', 'astro/client'] }, include: ['src/**/*.ts', 'native.config.ts'] }));
execFileSync('../node_modules/.bin/tsc', ['-p', 'tsconfig.json'], { cwd: dir, stdio: 'inherit' });
write('astro.config.mjs', `import native from './native.config';import {defineConfig,envField} from 'astro/config';import node from '@astrojs/node';
export default defineConfig({...native,output:'server',adapter:node({mode:'standalone'}),
env:{schema:Object.fromEntries(['DATOCMS_DRAFT_CONTENT_CDA_TOKEN','DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN','CACHE_INVALIDATION_WEBHOOK_SECRET'].map(k=>[k,envField.string({context:'server',access:'secret'})]))},
vite:{resolve:{alias:{'@datocms/cda-client':new URL('./mock-cda.ts',import.meta.url).pathname,'@netlify/functions':new URL('./mock-purge.ts',import.meta.url).pathname}},ssr:{noExternal:['@astrojs/netlify','@netlify/functions']}}});`);
write('mock-cda.ts', `export async function rawExecuteQuery(query:string,o:any){
if(o.includeDrafts&&(o.returnCacheTags||o.requestInitOptions.cache!=='no-store'||o.token!=='draft-fixture'))throw Error('Draft contract');
if(!o.includeDrafts&&(!o.returnCacheTags||o.token!=='published-fixture'))throw Error('Published contract');
if(query==='nested')await new Promise(r=>setTimeout(r,50));return [{message:(o.includeDrafts?'draft':'published')+'-'+query},new Response(null,{headers:{'x-cache-tags':query+' shared'}})];}`);
write('mock-purge.ts', `export async function purgeCache({tags}:{tags:string[]}){if(tags.includes('fail'))throw Error('Provider failure');if(!tags.includes('page'))throw Error('Unexpected tags');}`);
write('src/components/Nested.astro', `---\nimport {executeQueryWithCacheTags} from '../lib/datocms/executeQueryWithCacheTags';const value=await executeQueryWithCacheTags<{message:string}>(Astro,'nested');\n---\n<p>{value.message}</p>`);
write('src/pages/index.astro', `---\nimport Nested from '../components/Nested.astro';import {executeQueryWithCacheTags} from '../lib/datocms/executeQueryWithCacheTags';const value=await executeQueryWithCacheTags<{message:string}>(Astro,'page');\n---\n<html><body><h1>{value.message}</h1><Nested /></body></html>`);
write('deny-network.mjs', `import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';const denied=()=>{throw Error('External network forbidden')};http.request=denied;https.request=denied;http.get=denied;https.get=denied;net.connect=denied;net.createConnection=denied;tls.connect=denied;globalThis.fetch=denied;`);
const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', DATOCMS_DRAFT_CONTENT_CDA_TOKEN: 'draft-fixture', DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN: 'published-fixture', CACHE_INVALIDATION_WEBHOOK_SECRET: 'hook-fixture' };
execFileSync('../node_modules/.bin/astro', ['build'], { cwd: dir, env, stdio: 'inherit' });
const port = 19387, url = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--import', './deny-network.mjs', 'dist/server/entry.mjs'], { cwd: dir, env: { ...env, HOST: '127.0.0.1', PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
server.stdout.on('data', d => log += d);
server.stderr.on('data', d => log += d);
try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
        if (server.exitCode !== null)
            throw Error(log);
        try {
            await fetch(url);
            ready = true;
            break;
        }
        catch {
            await new Promise(r => setTimeout(r, 100));
        }
    }
    assert(ready, log);
    const published = await fetch(url), html = await published.text();
    assert(html.includes('published-page') && html.includes('published-nested'), html);
    const tags = published.headers.get('netlify-cache-tag')?.split(',') ?? [];
    for (const tag of ['page', 'nested', 'shared'])
        assert(tags.includes(tag), tags.join(','));
    assert.equal(tags.filter(t => t === 'shared').length, 1);
    assert(published.headers.get('netlify-cdn-cache-control')?.includes('max-age=3600'));
    const draft = await fetch(url, { headers: { cookie: 'verified-preview=synthetic-session' } }), draftHtml = await draft.text();
    assert(draftHtml.includes('draft-page') && draftHtml.includes('draft-nested'), draftHtml);
    assert.equal(draft.headers.get('netlify-cache-tag'), null);
    assert.equal(draft.headers.get('netlify-cdn-cache-control'), null);
    assert.equal(draft.headers.get('cache-control'), 'private, no-store');
    const post = (tags, auth = 'hook-fixture') => fetch(url + '/api/invalidate-cache', { method: 'POST', headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/json' }, body: JSON.stringify({ entity: { attributes: { tags } } }) });
    assert.equal((await post(['page'], 'wrong')).status, 401);
    assert.equal((await post([null])).status, 400);
    assert.equal((await post(['fail'])).status, 502);
    assert.equal((await post(['page', 'page'])).status, 200);
    assert.equal((await fetch(url + '/api/invalidate-cache', { method: 'POST', headers: { authorization: 'Bearer hook-fixture', 'content-type': 'application/json' }, body: '{' })).status, 400);
    console.log('Astro production fixture passed: compiled shipped config/flow, delayed nested tags, published/draft isolation, authentication, invalid input, provider failure. Host lookup rules require deployment verification.');
}
finally {
    server.kill('SIGTERM');
    await new Promise(r => server.once('close', r));
}
