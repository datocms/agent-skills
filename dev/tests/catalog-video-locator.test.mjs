import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const playerRuntime = new URL('../e2e/catalog/plugin/node_modules/playwright/index.mjs', import.meta.url);
const cdaRuntime = new URL('../e2e/catalog/web/node_modules/@datocms/cda-client/dist/esm/index.js', import.meta.url);
const dependenciesPresent = existsSync(playerRuntime) && existsSync(cdaRuntime);

test('video checks wait for the hydrated player that replaces the lazy placeholder', { skip: !dependenciesPresent && 'catalog browser fixture dependencies are absent' }, async t => {
  const { locatePlayer } = await import('../e2e/catalog/video-playback.mjs');
  assert.equal(typeof locatePlayer, 'function');
  const { chromium } = await import(playerRuntime.href);
  let browser;
  try {
    browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome', headless: true });
  } catch (error) {
    if (/executable.*doesn.t exist|distribution.*not found|executablePath.*doesn.t exist/i.test(error.message)) {
      t.skip('Chrome is not installed');
      return;
    }
    throw error;
  }
  try {
    const page = await browser.newPage();
    // A local DOM fixture only: no CMS, media service, or other network calls.
    await page.route('**/*', route => route.abort());
    await page.setContent(`<div style="height:1800px"></div><mux-player id="placeholder" data-mux-player-react-lazy-placeholder style="display:block;height:150px;width:320px"></mux-player><script>
      setTimeout(() => {
        const placeholder = document.querySelector('mux-player');
        const real = document.createElement('mux-player');
        real.id = 'hydrated-player'; real.style.cssText = placeholder.style.cssText;
        placeholder.replaceWith(real);
      }, 500);
    </script>`);
    const player = await locatePlayer(page);
    assert.equal(await player.getAttribute('id'), 'hydrated-player');
    assert.equal(await player.getAttribute('data-mux-player-react-lazy-placeholder'), null);
    assert.equal(await page.locator('[data-mux-player-react-lazy-placeholder]').count(), 0);
  } finally {
    await browser.close();
  }
});
