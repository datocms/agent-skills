import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { assertPublicationLookups, assertStableQueryMappings, checkDeployedCache } from '../e2e/deployed/cache.mjs';

const opaqueIds = ['query:8f09b63a', 'query:761cc42d', 'query:31eaa080'];
const mappings = [
  { query_id: opaqueIds[0], tag: 'record:alpha' },
  { query_id: opaqueIds[0], tag: 'locale:en' },
  { query_id: opaqueIds[1], tag: 'record:alpha' },
  { query_id: opaqueIds[1], tag: 'locale:it' },
  { query_id: opaqueIds[2], tag: 'record:beta' },
];
const lookup = (tags, queryIds) => ({ operation: 'lookup', tags, queryIds });

test('stable mapping identity tolerates row order and duplicate associations', () => {
  const result = assertStableQueryMappings(mappings, [...mappings].reverse().concat(mappings[0]));
  assert.deepEqual(result.queryIds, [...opaqueIds].sort());
  assert.equal(result.stableAcrossRepeatedReads, true);
});

for (const [name, before, after, error] of [
  ['unstable query IDs', mappings, mappings.map(row => row.query_id === opaqueIds[0] ? { ...row, query_id: 'query:changed' } : row), /changed query identities or mappings/],
  ['changed query-tag associations', mappings, mappings.map((row, index) => index === 0 ? { ...row, tag: 'record:beta' } : row), /changed query identities or mappings/],
  ['insufficient distinct query IDs', mappings.slice(0, 4), mappings.slice(0, 4), /distinct query identities/],
]) test(`stable mapping checks reject ${name}`, () => {
  assert.throws(() => assertStableQueryMappings(before, after), error);
});

test('publication lookup accepts a batched opaque-ID result', () => {
  const tags = ['record:alpha', 'record:beta', 'unmapped'];
  const result = assertPublicationLookups(mappings, [lookup(tags, [...opaqueIds].reverse())], tags);
  assert.deepEqual(result, { queryIds: [...opaqueIds].sort(), matchingLookups: 1 });
});

test('publication lookups accept empty per-tag results when the full union resolves matching opaque IDs', () => {
  const events = [lookup(['record:alpha'], opaqueIds.slice(0, 2)), lookup(['unmapped'], []), lookup(['record:beta'], [opaqueIds[2]])];
  const result = assertPublicationLookups(mappings, events, ['record:alpha', 'unmapped', 'record:beta']);
  assert.deepEqual(result, { queryIds: [...opaqueIds].sort(), matchingLookups: 3 });
});

for (const [name, events, tags, error] of [
  ['missing relevant lookup', [lookup(['unrelated'], [])], ['record:alpha'], /No mapping lookup observed/],
  ['empty aggregate match', [lookup(['unmapped'], [])], ['unmapped'], /did not match a registered query/],
  ['incomplete aggregate lookup coverage', [lookup(['record:alpha'], opaqueIds.slice(0, 2))], ['record:alpha', 'record:beta'], /did not resolve all matching query identities/],
  ['unrelated query IDs', [lookup(['record:alpha'], [opaqueIds[2]])], ['record:alpha'], /does not match the registered CDA tag mappings/],
]) test(`publication lookup checks reject ${name}`, () => {
  assert.throws(() => assertPublicationLookups(mappings, events, tags), error);
});

test('deployed cache checks accept stable opaque query IDs correlated with mappings and webhook lookups', { timeout: 10000 }, async () => {
  const origin = 'https://cache-fixture.invalid';
  const recordId = 'fixture-alpha', slug = 'opaque-alpha-article', otherSlug = 'opaque-beta-article';
  const secret = 'fixture-webhook-secret', draftSecret = 'fixture-draft-secret';
  const webhookId = 'fixture-cache-hook', legacyWebhookId = 'fixture-global-hook';
  const serviceDirectory = mkdtempSync(join(tmpdir(), 'deployed-cache-mappings-'));
  const rowsFile = join(serviceDirectory, 'rows.json');
  const eventsFile = join(serviceDirectory, 'events.jsonl');
  const controlFile = join(serviceDirectory, 'control.json');
  writeFileSync(rowsFile, '[]'); writeFileSync(eventsFile, ''); writeFileSync(controlFile, JSON.stringify({ unavailable: false }));
  const saved = new Map();
  const hooks = new Map([[webhookId, false], [legacyWebhookId, true]]);
  const original = { id: recordId, title: { en: 'Original alpha', it: 'Alfa originale' } };
  let draft = structuredClone(original), published = structuredClone(original), delivery;
  let draftReads = 0, publishCalls = 0, unavailableRequests = 0;
  const publicPaths = [`/en/posts/${slug}`, `/it/posts/${slug}`, `/en/posts/${otherSlug}`];
  const identities = new Map(publicPaths.map(pathname => [pathname, createHash('sha256').update(`Post:${pathname}`).digest('hex')]));
  assert.ok([...identities.values()].every(id => !id.includes(slug) && !id.includes(otherSlug)));
  const readRows = () => JSON.parse(readFileSync(rowsFile, 'utf8'));
  const observe = event => appendFileSync(eventsFile, JSON.stringify({ ...event, time: new Date().toISOString() }) + '\n');
  const tagsFor = pathname => [pathname.endsWith('/' + slug) ? 'record:alpha' : 'record:beta', `locale:${pathname.split('/')[1]}`];
  function store(pathname) {
    const queryId = identities.get(pathname), tags = tagsFor(pathname);
    const rows = [...readRows().filter(row => row.query_id !== queryId), ...tags.map(tag => ({ query_id: queryId, tag }))];
    rows.sort((a, b) => a.query_id.localeCompare(b.query_id) || a.tag.localeCompare(b.tag));
    writeFileSync(rowsFile, JSON.stringify(rows));
    observe({ operation: 'store', queryId, tags });
  }
  function webhook(body, authorization) {
    if (authorization !== `Bearer ${secret}`) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    let data;
    try { data = JSON.parse(body); } catch { return Response.json({ error: 'Malformed JSON' }, { status: 400 }); }
    const tags = data?.entity?.attributes?.tags;
    if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string' || !tag)) return Response.json({ error: 'Invalid tags' }, { status: 400 });
    if (!tags.length) return Response.json({ revalidated: false, affectedQueryIds: [] });
    if (JSON.parse(readFileSync(controlFile, 'utf8')).unavailable) {
      unavailableRequests++; observe({ operation: 'unavailable', path: '/lookup' });
      return Response.json({ error: 'Mapping dependency unavailable' }, { status: 502 });
    }
    const queryIds = [...new Set(readRows().filter(row => tags.includes(row.tag)).map(row => row.query_id))];
    observe({ operation: 'lookup', tags, queryIds });
    return Response.json({ revalidated: true, affectedQueryIds: queryIds });
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (value, options = {}) => {
    const url = new URL(value);
    assert.equal(url.origin, origin, 'Unexpected request: the fake must never fall through to the network');
    const headers = new Headers(options.headers);
    if (url.pathname === '/api/revalidateCache') {
      assert.equal(options.method, 'POST');
      return webhook(options.body, headers.get('authorization'));
    }
    if (url.pathname === '/api/draft/enable') {
      assert.equal(url.searchParams.get('token'), draftSecret);
      assert.equal(url.searchParams.get('redirect'), `/en/posts/${slug}`);
      return new Response(null, { status: 307, headers: { Location: `/en/posts/${slug}`, 'Set-Cookie': 'fixture_draft=1; Path=/; HttpOnly; Secure' } });
    }
    assert.ok(identities.has(url.pathname), `Unexpected fixture path: ${url.pathname}`);
    const isDraft = headers.get('cookie')?.includes('fixture_draft=1');
    if (isDraft) draftReads++; else store(url.pathname);
    const locale = url.pathname.split('/')[1];
    const title = url.pathname.endsWith('/' + otherSlug) ? 'Original beta' : (isDraft ? draft : published).title[locale];
    return new Response(`<html lang="${locale}"><h1>${title}</h1></html>`);
  };
  const client = {
    items: {
      find: async id => { assert.equal(id, recordId); return structuredClone(draft); },
      update: async (id, update) => { assert.equal(id, recordId); draft = { ...draft, ...structuredClone(update) }; return structuredClone(draft); },
      publish: async id => {
        assert.equal(id, recordId); assert.equal(hooks.get(webhookId), true); publishCalls++;
        published = structuredClone(draft);
        const payload = { entity: { type: 'cda_cache_tags', attributes: { tags: ['record:alpha'] } } };
        const response = webhook(JSON.stringify(payload), `Bearer ${secret}`);
        delivery = { id: 'fixture-delivery', status: 'success', response_status: response.status, request_payload: JSON.stringify(payload), response_payload: await response.text() };
      },
    },
    webhooks: { update: async (id, value) => { assert.ok(hooks.has(id)); hooks.set(id, value.enabled); return { id, ...value }; } },
    webhookCalls: { list: async options => { assert.equal(options.filter.fields.webhook_id.eq, webhookId); assert.ok(delivery); return [structuredClone(delivery)]; } },
  };
  try {
    const checks = await checkDeployedCache({ client, origin, recordId, slug, otherSlug, secret, draftSecret, webhookId, legacyWebhookId, serviceDirectory, save: (name, data) => saved.set(name, structuredClone(data)) });
    assert.equal(checks.length, 6);
    const mapping = checks.find(check => check.name === 'published post mappings use real CDA tags and distinct query identities');
    assert.ok(mapping);
    assert.ok(checks.filter(check => check !== mapping).every(check => check.passed), JSON.stringify(checks));
    assert.equal(draftReads, 1); assert.equal(publishCalls, 1); assert.equal(unavailableRequests, 1);
    assert.equal(hooks.get(webhookId), false);
    assert.deepEqual(saved.get('cache-checks.json'), checks);
    const rows = readRows();
    assert.deepEqual([...new Set(rows.map(row => row.query_id))].sort(), [...identities.values()].sort());
    const events = readFileSync(eventsFile, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    const lookups = events.filter(event => event.operation === 'lookup' && event.tags.includes('record:alpha'));
    assert.ok(lookups.length >= 4, 'Publish, repeated deliveries and recovery must perform correlated lookups');
    for (const event of lookups) assert.deepEqual([...event.queryIds].sort(), [identities.get(publicPaths[0]), identities.get(publicPaths[1])].sort());
    assert.equal(mapping.passed, true, `Stable opaque IDs should pass the actual mapping oracle: ${mapping.error ?? ''}`);
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(serviceDirectory, { recursive: true, force: true });
  }
});
