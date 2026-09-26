import assert from 'node:assert/strict';
import { chromium } from '../catalog/plugin/node_modules/playwright/index.mjs';

export async function checkSearchBrowser({ origin, marker, save, locales = ['it'], crawlLimit, context: suppliedContext }) {
  const browser = suppliedContext ? undefined : await chromium.launch({ headless: true, channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome' });
  const context = suppliedContext ?? await browser.newContext();
  const page = await context.newPage();
  const main = page.locator('main');
  const input = main.getByRole('searchbox').or(main.getByRole('textbox')).first();
  const links = page.locator('main li a');
  const checks = [], errors = [];
  const pendingResponses = new Set();
  page.on('pageerror', error => errors.push(error.message));
  async function check(name, run, locale) {
    try { checks.push({ name, locale, passed: true, evidence: await run() }); }
    catch (error) { checks.push({ name, locale, passed: false, error: error.message }); }
    save('browser-checks.json', checks);
  }
  function matchesSearch(value, query) {
    const url = new URL(value);
    return url.pathname.endsWith('/search-results') && url.searchParams.get('filter[query]') === query;
  }
  function responseFor(query) {
    const response = page.waitForResponse(value => matchesSearch(value.url(), query))
      .then(async value => { await value.finished(); return value; });
    // A separate assertion may fail before this response is awaited.
    response.catch(() => {});
    pendingResponses.add(response);
    response.finally(() => pendingResponses.delete(response)).catch(() => {});
    return response;
  }
  async function submit(query) {
    await input.fill(query);
    const request = page.waitForRequest(value => matchesSearch(value.url(), query), { timeout: 30000 });
    request.catch(() => {});
    const response = responseFor(query);
    await input.press('Enter');
    return { request: await request, response };
  }
  function assertRequest(request, locale, offset) {
    const params = new URL(request.url()).searchParams;
    assert.equal(params.get('filter[locale]'), locale, 'Search request locale must match the page locale');
    assert.equal(params.get('page[limit]'), '2', 'Search requests must ask for two results');
    if (offset !== undefined) assert.equal(params.get('page[offset]'), String(offset));
  }
  async function renderedResults(pending, previous) {
    const response = await pending;
    assert.equal(response.status(), 200, 'Search request must succeed');
    const payload = await response.json();
    assert.ok(Array.isArray(payload.data), 'Search response must contain results');
    await page.waitForFunction(({ count, previous }) => {
      const links = [...document.querySelectorAll('main li a')];
      return links.length === count && (!previous || links.every(link => !previous.includes(link.href)));
    }, { count: payload.data.length, previous }, { timeout: 30000 });
    return { urls: await links.evaluateAll(nodes => nodes.map(node => node.href)), count: payload.data.length };
  }
  try {
    for (const locale of locales) {
      let ready = false, first = [], second = [];
      await check('search page declares its route locale', async () => {
        await page.goto(origin + '/' + locale + '/search');
        await input.waitFor();
        ready = true;
        assert.equal(await page.locator('html').getAttribute('lang'), locale);
        return { locale };
      }, locale);
      if (!ready) continue;

      await check('Enter submits the page locale and a two-result limit', async () => {
        const query = await submit(marker);
        assertRequest(query.request, locale);
        const result = await renderedResults(query.response);
        assert.equal(result.count, 2);
        first = result.urls;
        return { first };
      }, locale);

      await check('enabled pagination requests offset two and changes the result links', async () => {
        // Start each behavioral check from a known first page. Controls may
        // use arbitrary localized labels or numbered buttons.
        const initial = await submit(marker);
        assertRequest(initial.request, locale);
        const initialResults = await renderedResults(initial.response);
        assert.equal(initialResults.count, 2);
        first = initialResults.urls;
        const navigation = main.locator('nav').getByRole('button');
        const buttons = await navigation.count() ? navigation : main.getByRole('button');
        for (let index = 0, count = await buttons.count(); index < count; index++) {
          const button = buttons.nth(index);
          if (!await button.isEnabled()) continue;
          const pending = responseFor(marker);
          await button.click();
          let response;
          try { response = await pending; }
          catch (error) {
            if (error.name === 'TimeoutError') continue;
            throw error;
          }
          assertRequest(response.request(), locale);
          assert.equal(response.status(), 200, 'Pagination request must succeed');
          if (new URL(response.url()).searchParams.get('page[offset]') !== '2') {
            const reset = await submit(marker);
            assertRequest(reset.request, locale);
            await renderedResults(reset.response);
            continue;
          }
          assertRequest(response.request(), locale, 2);
          const result = await renderedResults(Promise.resolve(response), first);
          assert.ok(result.count > 0 && result.count <= 2, 'The next page must contain one or two results');
          second = result.urls;
          return { first, second };
        }
        assert.fail('No enabled pagination button requested page[offset]=2');
      }, locale);

      if (crawlLimit?.limited) {
        checks.push({ name: 'result URLs match the page locale', locale, passed: false, environmentLimit: 'crawl-quota', sitemapUrls: crawlLimit.sitemapUrls, maxIndexablePages: crawlLimit.maxIndexablePages });
        save('browser-checks.json', checks);
      } else {
        await check('result URLs match the page locale', async () => {
          assert.ok(first.length > 0, 'No result URLs were observed');
          const urls = [...first, ...second];
          assert.ok(urls.every(url => new URL(url).pathname.startsWith('/' + locale + '/')), 'Result URLs must use the ' + locale + ' locale prefix');
          return { urls };
        }, locale);
      }

      await check('loading, empty results and unauthorized errors use semantic states', async () => {
        const emptyQuery = 'absent' + marker + 'absent', errorQuery = 'e2e-error-state';
        let release;
        const delayed = new Promise(resolve => { release = resolve; });
        const routeTasks = new Set(), routeErrors = [];
        const handler = route => {
          const task = (async () => {
            const query = new URL(route.request().url()).searchParams.get('filter[query]');
            if (query === errorQuery) return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ data: [{ type: 'api_error', id: 'fixture', attributes: { code: 'INVALID_AUTHORIZATION_HEADER', details: {} } }] }) });
            if (query === emptyQuery) await delayed;
            // Preserve any caller-owned fixture routes; without one, fallback
            // reaches the real API just like an unintercepted request.
            return route.fallback();
          })().catch(error => { routeErrors.push(error.message); });
          routeTasks.add(task);
          task.finally(() => routeTasks.delete(task));
          return task;
        };
        await page.route('**/search-results**', handler);
        try {
          const empty = await submit(emptyQuery);
          assertRequest(empty.request, locale);
          await main.getByRole('status').waitFor({ state: 'visible', timeout: 30000 });
          release();
          const emptyResults = await renderedResults(empty.response);
          assert.equal(emptyResults.count, 0);
          assert.equal(await main.getByRole('alert').count(), 0, 'Empty results must not show an alert');
          const unauthorized = await submit(errorQuery);
          assertRequest(unauthorized.request, locale);
          assert.equal((await unauthorized.response).status(), 401);
          await main.getByRole('alert').waitFor({ state: 'visible', timeout: 30000 });
          return { loading: true, empty: true, unauthorized: true };
        } finally {
          release();
          await Promise.allSettled([...pendingResponses]);
          await Promise.allSettled([...routeTasks]);
          await page.unroute('**/search-results**', handler);
          assert.deepEqual(routeErrors, [], 'Search interception failed');
        }
      }, locale);
    }
    await check('no browser runtime exceptions', async () => assert.deepEqual(errors, []));
    return checks;
  } finally {
    await Promise.allSettled([...pendingResponses]);
    await page.close();
    if (!suppliedContext) await context.close();
    await browser?.close();
  }
}
