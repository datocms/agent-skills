import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scopedVercel } from '../e2e/deployed/vercel.mjs';
import * as search from '../e2e/deployed/search.mjs';

const quotaLog = 'Max indexable pages: 200\nFound a total of 265 URLs in sitemaps\n[https://fixture.test/en/post] Reached maximum number of pages (200), stopping crawler';
const cleanLog = 'Max indexable pages: 200\nFound a total of 100 URLs in sitemaps';
const indexing = (created_at, crawler_log) => ({ event_type: 'indexing_success', created_at, data: { crawler_log } });

test('crawl quota detection parses the actual indexing-event log shape', () => {
  assert.equal(typeof search.crawlLimit, 'function');
  assert.deepEqual(search.crawlLimit([indexing('2026-09-26T14:00:00Z', quotaLog)]), { maxIndexablePages: 200, sitemapUrls: 265, limited: true });
  assert.deepEqual(search.crawlLimit([indexing('2026-09-26T14:00:00Z', cleanLog)]), { maxIndexablePages: 200, sitemapUrls: 100, limited: false });
});

test('crawl quota detection uses the latest indexing event and never inherits stale limits', () => {
  assert.equal(typeof search.crawlLimit, 'function');
  const events = [indexing('2026-09-26T14:00:00Z', quotaLog), indexing('2026-09-26T15:00:00Z', cleanLog), { event_type: 'build_success', created_at: '2026-09-26T16:00:00Z', data: { crawler_log: quotaLog } }];
  assert.deepEqual(search.crawlLimit(events), { maxIndexablePages: 200, sitemapUrls: 100, limited: false });
  events.push({ event_type: 'indexing_started', created_at: '2026-09-26T17:00:00Z', data: null });
  assert.deepEqual(search.crawlLimit(events), { maxIndexablePages: null, sitemapUrls: null, limited: false });
  assert.deepEqual(search.crawlLimit([]), { maxIndexablePages: null, sitemapUrls: null, limited: false });
});

test('deployed search records a quota-blocked locale check after counting the sitemap before trigger', async () => {
  assert.equal(typeof search.crawlLimit, 'function');
  const origin = 'https://fixture.test', marker = 'fixture';
  const records = ['alpha', 'beta', 'unlisted', 'draft'].map(kind => ({ kind, slug: `${marker}-${kind}`, title: { it: `Italian ${kind}` } }));
  const urls = [origin + '/it/posts/fixture-alpha', origin + '/it/posts/fixture-beta', ...Array.from({ length: 263 }, (_, i) => `${origin}/other/${i}`)];
  const saved = new Map();
  let sitemapRead = false, triggered = false, finds = 0, searchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async value => {
    const url = new URL(value);
    assert.equal(url.origin, origin);
    if (url.pathname === '/sitemap.xml') { sitemapRead = true; return new Response(`<urlset>${urls.map(url => `<url><loc>${url}</loc></url>`).join('')}</urlset>`); }
    const record = records.find(record => url.pathname.endsWith('/' + record.slug));
    assert.ok(record);
    return new Response(`<html lang="it">${record.title.it}</html>`, { status: record.kind === 'draft' ? 404 : 200 });
  };
  try {
    const checks = await search.checkDeployedSearch({
      origin, marker, records, locales: ['it'], indexId: 'owned-index',
      client: {
        searchIndexes: {
          find: async () => ({ frontend_url: origin, meta: { indexing_status: 'success', last_indexing_completed_at: ++finds === 1 ? 'before' : 'after' } }),
          trigger: async () => { assert.equal(sitemapRead, true); triggered = true; },
        },
        searchIndexEvents: { list: async () => [indexing('2026-09-26T18:00:00Z', quotaLog)] },
      },
      searchClient: { searchResults: { rawList: async () => { searchCalls++; throw Error('quota-limited locale assertions must not query an incomplete index'); } } },
      save: (name, data) => saved.set(name, structuredClone(data)), timeoutMs: 1000,
    });
    assert.equal(triggered, true);
    assert.equal(searchCalls, 0);
    const blocked = checks.find(check => check.environmentLimit === 'crawl-quota');
    assert.ok(blocked);
    assert.equal(blocked.passed, false);
    assert.equal(blocked.sitemapUrls, 265);
    assert.equal(blocked.maxIndexablePages, 200);
    assert.ok(checks.filter(check => check !== blocked).every(check => check.passed));
    assert.deepEqual(saved.get('search-checks.json'), checks);
  } finally { globalThis.fetch = originalFetch; }
});

const identity = { projectId: 'prj_fixture', teamId: 'team_fixture', projectName: 'throwaway', repository: 'owner/throwaway', token: 'private-fixture-token' };
const project = { id: identity.projectId, accountId: identity.teamId, name: identity.projectName, link: { org: 'owner', repo: 'throwaway' } };

for (const [field, value] of [['id', 'prj_other'], ['accountId', 'team_other'], ['name', 'other'], ['link', { org: 'owner', repo: 'other' }]]) {
  test(`rejects ${field} mismatch before provider mutation`, async () => {
    const calls = [];
    const client = scopedVercel({ ...identity, fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return Response.json({ ...project, [field]: value });
    } });
    await assert.rejects(client.setBuildCommand('npm run build'));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.method, 'GET');
    assert.equal(calls[0].url.searchParams.get('teamId'), identity.teamId);
    assert.equal(calls[0].options.redirect, 'error');
  });
}

test('refuses to replace an existing environment variable', async () => {
  const calls = [];
  const client = scopedVercel({ ...identity, fetchImpl: async (url, options) => {
    calls.push(options.method);
    return Response.json(url.pathname.endsWith('/env') ? { envs: [{ id: 'existing', key: 'PUBLIC_SEARCH_TOKEN' }] } : project);
  } });
  await assert.rejects(client.createEnvironment('PUBLIC_SEARCH_TOKEN', 'new-value'), /already exists/);
  assert.deepEqual(calls, ['GET', 'GET']);
});

test('refuses cleanup when a recorded environment ID has a different key', async () => {
  const methods = [];
  const client = scopedVercel({ ...identity, fetchImpl: async (url, options) => {
    methods.push(options.method);
    return Response.json(url.pathname.endsWith('/env') ? { envs: [{ id: 'owned', key: 'UNRELATED_SECRET' }] } : project);
  } });
  await assert.rejects(client.deleteEnvironment('owned', 'PUBLIC_SEARCH_TOKEN'));
  assert.deepEqual(methods, ['GET', 'GET']);
});

test('provider error responses cannot expose credentials', async () => {
  const client = scopedVercel({ ...identity, fetchImpl: async () => Response.json({ error: identity.token }, { status: 403 }) });
  await assert.rejects(client.project(), error => error.message.includes('HTTP 403') && !error.message.includes(identity.token));
});
