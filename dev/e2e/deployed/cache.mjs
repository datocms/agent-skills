import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function checkDeployedCache({ client, origin, recordId, slug, otherSlug, secret, draftSecret, webhookId, legacyWebhookId, serviceDirectory, save }) {
  const checks = [];
  const endpoint = `${origin}/api/revalidateCache`;
  const post = (body, authorization = secret) => fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authorization}` }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const payload = tags => ({ entity: { type: 'cda_cache_tags', attributes: { tags } } });
  const rows = () => JSON.parse(readFileSync(`${serviceDirectory}/rows.json`, 'utf8'));
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
    for (const path of [pathname, `/it/posts/${slug}`, `/en/posts/${otherSlug}`]) {
      const response = await fetch(origin + path); assert.equal(response.status, 200);
      await response.text();
    }
    const actual = rows();
    assert.ok(new Set(actual.map(row => row.query_id)).size >= 3);
    assert.ok(actual.every(row => !/\s/.test(row.tag)), 'CDA header was stored as one unsplit tag');
    assert.ok(actual.some(row => row.query_id.includes(slug)));
    return { queryIds: [...new Set(actual.map(row => row.query_id))], tags: actual.length };
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
    const response = await fetch(origin + pathname); const html = await response.text();
    assert.equal(response.status, 200); assert.ok(html.includes(nextTitle), 'First post-webhook read was stale');
    return { deliveryId: call.id, status: call.response_status, title: nextTitle };
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
