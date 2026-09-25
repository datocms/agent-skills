import assert from 'node:assert/strict';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function checkDeployedSearch({ client, searchClient, indexId, origin, marker, records, locales, save, timeoutMs = 900000 }) {
  const checks = [];
  async function check(name, run) {
    try { checks.push({ name, passed: true, evidence: await run() }); }
    catch (error) { checks.push({ name, passed: false, error: error.message }); }
    save('search-checks.json', checks);
  }
  await check('published, unlisted and draft route boundaries', async () => {
    const observations = [];
    for (const locale of locales) for (const record of records) {
      const response = await fetch(`${origin}/${locale}/posts/${record.slug}`);
      const html = await response.text();
      assert.equal(response.status, record.kind === 'draft' ? 404 : 200, `${locale}/${record.kind}`);
      if (record.kind !== 'draft') {
        assert.ok(html.includes(record.title[locale]));
        assert.match(html, new RegExp(`<html[^>]*lang="${locale}"`));
      }
      observations.push({ locale, kind: record.kind, status: response.status });
    }
    return observations;
  });
  await check('public sitemap exposes published localized fixture URLs only', async () => {
    const response = await fetch(`${origin}/sitemap.xml`);
    assert.equal(response.status, 200);
    const xml = await response.text();
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
    assert.ok(urls.length);
    assert.ok(urls.every(url => new URL(url).origin === origin));
    for (const locale of locales) for (const record of records) {
      const expected = ['alpha', 'beta'].includes(record.kind);
      assert.equal(urls.includes(`${origin}/${locale}/posts/${record.slug}`), expected, `${locale}/${record.kind}`);
    }
    return { count: urls.length, fixtureUrls: urls.filter(url => url.includes(marker)) };
  });
  await check('real indexing completes and search respects locale and URL exclusions', async () => {
    const before = await client.searchIndexes.find(indexId);
    assert.equal(new URL(before.frontend_url).origin, origin);
    const startedAt = new Date().toISOString();
    await client.searchIndexes.trigger(indexId);
    const states = [];
    let finished = false;
    for (const deadline = Date.now() + timeoutMs; Date.now() < deadline;) {
      const index = await client.searchIndexes.find(indexId);
      if (states.at(-1) !== index.meta.indexing_status) {
        states.push(index.meta.indexing_status);
        save('crawl-checkpoint.json', { startedAt, states, meta: index.meta });
      }
      if (index.meta.last_indexing_completed_at && index.meta.last_indexing_completed_at !== before.meta.last_indexing_completed_at && index.meta.indexing_status !== 'pending') {
        assert.equal(index.meta.indexing_status, 'success');
        finished = true;
        break;
      }
      await pause(10000);
    }
    const events = await client.searchIndexEvents.list({ filter: { fields: { search_index_id: { eq: indexId }, created_at: { gt: startedAt } } } });
    save('crawl-events.json', events);
    assert.ok(finished, 'Indexing did not complete before the deadline');
    const observations = [];
    for (const locale of locales) {
      const result = await searchClient.searchResults.rawList({ filter: { query: marker, search_index_id: indexId, locale }, page: { limit: 100, offset: 0 } });
      const urls = result.data.map(item => item.attributes.url);
      for (const record of records) {
        assert.equal(urls.includes(`${origin}/${locale}/posts/${record.slug}`), ['alpha', 'beta'].includes(record.kind), `${locale}/${record.kind}`);
      }
      assert.ok(urls.every(url => new URL(url).origin === origin && new URL(url).pathname.startsWith(`/${locale}/`)));
      observations.push({ locale, total: result.meta.total_count, urls });
    }
    save('indexed-fixtures.json', observations);
    return { states, observations };
  });
  return checks;
}
