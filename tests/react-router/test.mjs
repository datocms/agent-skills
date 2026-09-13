import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const root = path.dirname(fileURLToPath(import.meta.url));
process.chdir(root);
const require = createRequire(import.meta.url);
const doc = readFileSync('../../skills/datocms-frontend-integrations/references/remix.md', 'utf8');
const source = doc.match(/```ts\n([\s\S]*?)\n```/)[1];
const dir = path.join(root, 'tmp');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const write = (p, s) => writeFileSync(path.join(dir, p), s);
write('article.server.ts', source);
write('session.server.ts', `import {createCookieSessionStorage} from 'react-router';export const {getSession}=createCookieSessionStorage({cookie:{name:'preview',httpOnly:true,secrets:['fixture-only-secret']}});`);
// Framework-mode and retained Remix route modules use their respective real type surfaces.
for (const [name, module] of [['router', 'react-router'], ['remix', '@remix-run/node']])
    write(name + '.tsx', `import type {LoaderFunctionArgs,MetaFunction} from '${module}';import {loadArticle} from './article.server';import {toRemixMeta} from 'react-datocms';
export async function loader({request,params}:LoaderFunctionArgs){return loadArticle(request,params.slug);}
export const meta:MetaFunction<typeof loader>=({${name === 'router' ? 'loaderData: data' : 'data'}})=>toRemixMeta(data?.article._seoMetaTags??[]);`);
write('tsconfig.json', JSON.stringify({ compilerOptions: { strict: true, noEmit: true, skipLibCheck: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', lib: ['ES2022', 'DOM'], types: ['node', 'react'] }, include: ['*.ts', '*.tsx'] }));
execFileSync('../node_modules/.bin/tsc', ['-p', 'tsconfig.json'], { cwd: dir, stdio: 'inherit' });
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const article = { title: 'Fixture', _seoMetaTags: [{ tag: 'title', content: 'Fixture', attributes: null }, { tag: 'meta', attributes: { name: 'description', content: 'Description' }, content: null }] };
for (const mod of ['react-router', '@remix-run/node']) {
    const { createCookieSessionStorage } = require(mod);
    const storage = createCookieSessionStorage({ cookie: { name: 'preview', httpOnly: true, secrets: ['fixture-only-secret'] } });
    const requests = [];
    let fail = false, missing = false;
    const exports = {};
    const env = { DATOCMS_DRAFT_CONTENT_CDA_TOKEN: 'draft-fixture', DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN: 'published-fixture' };
    vm.runInNewContext(code, { exports, Response, process: { env }, require: name => {
            if (name === './session.server')
                return { getSession: storage.getSession };
            if (name === '@datocms/cda-client')
                return { executeQuery: async (query, options) => { requests.push(options); if (fail)
                        throw Error('Read failed'); return { article: missing ? null : article }; } };
            throw Error('Unexpected import ' + name);
        } });
    const request = cookie => new Request('https://fixture.invalid/article?preview=true', { headers: cookie ? { cookie } : {} });
    let result = await exports.loadArticle(request(), 'fixture');
    assert.equal(result.preview, false);
    assert.equal(requests.at(-1).token, 'published-fixture');
    assert.equal(requests.at(-1).includeDrafts, false);
    assert(!JSON.stringify(result).includes('published-fixture'));
    const session = await storage.getSession();
    session.set('datocmsPreview', true);
    const cookie = (await storage.commitSession(session)).split(';')[0];
    result = await exports.loadArticle(request(cookie), 'fixture');
    assert.equal(result.preview, true);
    assert.equal(requests.at(-1).token, 'draft-fixture');
    assert.equal(requests.at(-1).includeDrafts, true);
    assert.equal(requests.at(-1).requestInitOptions.cache, 'no-store');
    assert(!JSON.stringify(result).includes('draft-fixture'));
    const forged = cookie.slice(0, -1) + (cookie.endsWith('a') ? 'b' : 'a');
    result = await exports.loadArticle(request(forged), 'fixture');
    assert.equal(result.preview, false);
    result = await exports.loadArticle(request('preview=true'), 'fixture');
    assert.equal(result.preview, false);
    missing = true;
    await assert.rejects(exports.loadArticle(request(), 'missing'), e => e.status === 404);
    missing = false;
    fail = true;
    await assert.rejects(exports.loadArticle(request(), 'fixture'), /Read failed/);
    fail = false;
    delete env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN;
    await assert.rejects(exports.loadArticle(request(), 'fixture'), /Missing server-side CDA token/);
    await assert.rejects(exports.loadArticle(request(), undefined), e => e.status === 404);
}
// Execute the actual SEO helper; test optional rendering with a controlled subscription boundary.
const seo = await import('./node_modules/react-datocms/dist/esm/Seo/remixUtils.js');
assert.deepEqual(seo.toRemixMeta(article._seoMetaTags), [{ title: 'Fixture' }, { tagName: 'meta', name: 'description', content: 'Description' }]);
const React = require('react'), { renderToString } = require('react-dom/server');
let subscriptions = 0;
function Subscription({ data }) { subscriptions++; return React.createElement('p', null, data.article.title); }
function Page({ data, realtime = false }) { return data.preview && realtime ? React.createElement(Subscription, { data }) : React.createElement('p', null, data.article.title); }
for (const preview of [false, true])
    for (const realtime of [false, true]) {
        const before = subscriptions;
        assert(renderToString(React.createElement(Page, { data: { article, preview }, realtime })).includes('Fixture'));
        assert.equal(subscriptions - before, preview && realtime ? 1 : 0);
    }
console.log('Framework modules compile against React Router and Remix. Signed-session selection, forged-cookie rejection, server token boundaries, errors, SEO descriptors, and optional preview rendering passed.');
