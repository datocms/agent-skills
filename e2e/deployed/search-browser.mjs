import assert from 'node:assert/strict';
import { chromium } from '../catalog/plugin/node_modules/playwright/index.mjs';

export async function checkSearchBrowser({ origin, marker, save }) {
  const browser = await chromium.launch({ headless: true, channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();
  const checks = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function check(name, run) {
    try { checks.push({ name, passed: true, evidence: await run() }); }
    catch (error) { checks.push({ name, passed: false, error: error.message }); }
    save('browser-checks.json', checks);
  }
  try {
    await page.goto(`${origin}/it/search`);
    await page.getByRole('heading', { name: 'Search', exact: true }).waitFor();
    await check('search defaults to the page locale', async () => {
      assert.equal(await page.getByLabel('Language', { exact: true }).inputValue(), 'it');
    });
    await check('real localized results and two-result pagination', async () => {
      await page.getByLabel('Language', { exact: true }).selectOption('it');
      await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(marker);
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await page.getByRole('navigation', { name: 'Search pages' }).waitFor({ timeout: 30000 });
      const links = page.locator('main li a');
      assert.equal(await links.count(), 2);
      const first = await links.evaluateAll(nodes => nodes.map(node => node.href));
      assert.ok(first.every(url => new URL(url).pathname.startsWith('/it/')));
      assert.equal(await page.getByRole('button', { name: 'Previous', exact: true }).isEnabled(), false);
      await Promise.all([
        page.waitForResponse(response => response.url().includes('/search-results') && new URL(response.url()).searchParams.get('page[offset]') === '2' && response.status() === 200),
        page.getByRole('button', { name: 'Next', exact: true }).click(),
      ]);
      await page.getByText('Page 2 of 3', { exact: true }).waitFor();
      await page.waitForFunction(previous => {
        const links = [...document.querySelectorAll('main li a')];
        return links.length === 2 && links.every(link => !previous.includes(link.href));
      }, first);
      const second = await links.evaluateAll(nodes => nodes.map(node => node.href));
      assert.equal(second.length, 2);
      assert.ok(second.every(url => !first.includes(url)));
      return { first, second };
    });
    await check('empty, loading and request-error states', async () => {
      await page.route('**/search-results**', async route => {
        const query = new URL(route.request().url()).searchParams.get('filter[query]');
        if (query === 'e2e-error-state') return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ data: [{ type: 'api_error', id: 'fixture', attributes: { code: 'INVALID_AUTHORIZATION_HEADER', details: {} } }] }) });
        await new Promise(resolve => setTimeout(resolve, 300));
        return route.continue();
      });
      const input = page.getByRole('searchbox', { name: 'Search', exact: true });
      await input.fill(`absent${marker}absent`);
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'Loading results' }).waitFor();
      await page.getByText('No results found.', { exact: true }).waitFor({ timeout: 30000 });
      await input.fill('e2e-error-state');
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'We could not complete' }).waitFor({ timeout: 30000 });
      return 'Real empty query; delayed request and controlled 401 for loading/error behavior';
    });
    await check('no browser runtime exceptions', async () => assert.deepEqual(errors, []));
    return checks;
  } finally { await context.close(); await browser.close(); }
}
