import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function mappingSnapshot(rows) {
  const grouped = new Map();
  for (const row of rows) {
    assert.ok(typeof row.query_id === 'string' && row.query_id.length > 0, 'Mapping query identity is missing');
    assert.ok(typeof row.tag === 'string' && row.tag.length > 0 && !/\s/.test(row.tag), 'CDA header was stored as one unsplit tag');
    if (!grouped.has(row.query_id)) grouped.set(row.query_id, new Set());
    grouped.get(row.query_id).add(row.tag);
  }
  return [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([queryId, tags]) => ({ queryId, tags: [...tags].sort() }));
}

export function assertStableQueryMappings(before, after) {
  const expected = mappingSnapshot(before), actual = mappingSnapshot(after);
  assert.ok(expected.length >= 3, 'Published requests need distinct query identities');
  assert.deepEqual(actual, expected, 'Unchanged published requests changed query identities or mappings');
  return { queryIds: expected.map(entry => entry.queryId), tags: before.length, stableAcrossRepeatedReads: true };
}

export function assertPublicationLookups(mappings, events, deliveredTags) {
  const snapshot = mappingSnapshot(mappings);
  assert.ok(Array.isArray(deliveredTags) && deliveredTags.every(tag => typeof tag === 'string'), 'Invalid delivered cache tags');
  const delivered = new Set(deliveredTags);
  const matchingIds = tags => snapshot.filter(entry => entry.tags.some(tag => tags.has(tag))).map(entry => entry.queryId).sort();
  const expected = matchingIds(delivered);
  assert.ok(expected.length > 0, 'Published record invalidation did not match a registered query');
  const observed = new Set();
  let matchingLookups = 0;
  for (const event of events) {
    if (event.operation !== 'lookup' || !Array.isArray(event.tags) || !event.tags.some(tag => delivered.has(tag))) continue;
    matchingLookups++;
    assert.ok(Array.isArray(event.queryIds) && event.queryIds.every(id => typeof id === 'string'), 'Invalid mapping lookup observation');
    const actual = [...new Set(event.queryIds)].sort();
    const relevantTags = new Set(event.tags.filter(tag => delivered.has(tag)));
    assert.deepEqual(actual, matchingIds(relevantTags), 'Webhook lookup does not match the registered CDA tag mappings');
    for (const id of actual) observed.add(id);
  }
  assert.ok(matchingLookups > 0, 'No mapping lookup observed for the delivered cache tags');
  assert.deepEqual([...observed].sort(), expected, 'Webhook lookups did not resolve all matching query identities');
  return { queryIds: expected, matchingLookups };
}

export async function checkDeployedCache({ client, origin, recordId, slug, otherSlug, secret, draftSecret, webhookId, legacyWebhookId, serviceDirectory, save }) {
  const checks = [];
  const endpoint = `${origin}/api/revalidateCache`;
  const post = (body, authorization = secret) => fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authorization}` }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const payload = tags => ({ entity: { type: 'cda_cache_tags', attributes: { tags } } });
  const rows = () => JSON.parse(readFileSync(`${serviceDirectory}/rows.json`, 'utf8'));
  const events = () => existsSync(`${serviceDirectory}/events.jsonl`)
    ? readFileSync(`${serviceDirectory}/events.jsonl`, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line))
    : [];
  const control = unavailable => writeFileSync(`${serviceDirectory}/control.json`, JSON.stringify({ unavailable }));
  async function check(name, run) {
    try { checks.push({ name, passed: true, evidence: await run() }); }
    catch (error) { checks.push({ name, passed: false, error: error.message }); }
    save('cache-checks.json', checks);
  }
  const source = await client.items.find(recordId);
  const publishedTitle = source.title.en;
  const nextTitle = `${publishedTitle} revised`;
  const pathname = `/en/posts/${slug}`;
  let cookie;
  await client.webhooks.update(legacyWebhookId, { enabled: false });
  await client.webhooks.update(webhookId, { enabled: false });
  await check('webhook authentication and payload validation', async () => {
    const result = {};
    for (const [name, body, auth, expected] of [
      ['unauthorized', payload(['probe']), 'incorrect', 401],
      ['malformed', '{', secret, 400],
      ['wrongType', payload([3]), secret, 400],
      ['empty', payload([]), secret, 200],
    ]) { const response = await post(body, auth); result[name] = response.status; assert.equal(response.status, expected, name); }
    return result;
  });
  await check('published post mappings use real CDA tags and distinct query identities', async () => {
    async function readPublishedPaths() {
      for (const path of [pathname, `/it/posts/${slug}`, `/en/posts/${otherSlug}`]) {
        const response = await fetch(origin + path); assert.equal(response.status, 200);
        await response.text();
      }
    }
    await readPublishedPaths(); const before = rows();
    await readPublishedPaths();
    return assertStableQueryMappings(before, rows());
  });
  await check('draft reads bypass published data and mappings', async () => {
    await client.items.update(recordId, { title: { ...source.title, en: nextTitle } });
    const before = rows();
    const published = await (await fetch(origin + pathname)).text();
    assert.ok(published.includes(publishedTitle) && !published.includes(nextTitle));
    const url = new URL('/api/draft/enable', origin); url.searchParams.set('token', draftSecret); url.searchParams.set('redirect', pathname);
    const enabled = await fetch(url, { redirect: 'manual' });
    assert.ok([302, 307].includes(enabled.status));
    cookie = enabled.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    assert.ok(cookie);
    const response = await fetch(origin + pathname, { headers: { Cookie: cookie } });
    const html = await response.text();
    assert.equal(response.status, 200); assert.ok(html.includes(nextTitle), 'Draft title was not returned');
    assert.deepEqual(rows(), before, 'Draft reads replaced published mappings');
    return { publishedTitle, draftTitle: nextTitle, mappingPreserved: true };
  });
  let deliveredPayload;
  await check('real publish webhook immediately refreshes the published post', async () => {
    await client.webhooks.update(webhookId, { enabled: true });
    const mappingsBeforePublish = rows(), eventOffset = events().length;
    const startedAt = new Date().toISOString();
    await client.items.publish(recordId);
    let call;
    for (const deadline = Date.now() + 120000; Date.now() < deadline;) {
      const calls = await client.webhookCalls.list({ filter: { fields: { webhook_id: { eq: webhookId }, created_at: { gt: startedAt } } }, order_by: 'created_at_desc' });
      call = calls.find(call => call.status !== 'pending');
      if (call) break;
      await pause(3000);
    }
    assert.ok(call, 'No completed cache-tag delivery');
    deliveredPayload = JSON.parse(call.request_payload);
    save('cache-delivery.json', { id: call.id, status: call.status, responseStatus: call.response_status, payload: deliveredPayload, response: call.response_payload });
    assert.equal(call.status, 'success'); assert.equal(call.response_status, 200);
    const lookup = assertPublicationLookups(mappingsBeforePublish, events().slice(eventOffset), deliveredPayload.entity?.attributes?.tags);
    const response = await fetch(origin + pathname); const html = await response.text();
    assert.equal(response.status, 200); assert.ok(html.includes(nextTitle), 'First post-webhook read was stale');
    return { deliveryId: call.id, status: call.response_status, title: nextTitle, lookup };
  });
  await check('repeated delivery remains successful', async () => {
    assert.ok(deliveredPayload);
    const a = await post(deliveredPayload), b = await post(deliveredPayload);
    assert.equal(a.status, 200); assert.equal(b.status, 200);
    return { first: a.status, repeated: b.status };
  });
  await check('mapping dependency failure is surfaced and recovers', async () => {
    control(true); await pause(900);
    try { const response = await post(deliveredPayload ?? payload(['probe'])); assert.ok(response.status >= 500, `Unexpected success ${response.status}`); }
    finally { control(false); await pause(900); }
    const response = await post(deliveredPayload ?? payload(['probe'])); assert.equal(response.status, 200);
    return 'Unavailable persistent mapping service produces 5xx; restored service succeeds';
  });
  await client.webhooks.update(webhookId, { enabled: false });
  return checks;
}
