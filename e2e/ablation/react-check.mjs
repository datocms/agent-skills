import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import { chromium } from '../catalog/plugin/node_modules/playwright/index.mjs';
import { vercelStegaCombine } from '../catalog/web/node_modules/@vercel/stega/dist/index.js';

export async function checkCard(workspace, directory) {
  const types = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit'], { cwd: workspace, encoding: 'utf8', timeout: 60000 });
  writeFileSync(join(directory, 'typecheck.log'), types.stdout + types.stderr);
  assert.equal(types.status, 0, 'Generated component must typecheck');
  const browserEntry = `import React from 'react'; import {createRoot} from 'react-dom/client'; import {flushSync} from 'react-dom'; import {createController} from '@datocms/content-link'; import ProductCard from './ProductCard.tsx';
    let root,controller; window.renderCard=(product)=>{controller?.dispose(); root?.unmount(); document.body.innerHTML='<div id="app"></div>'; root=createRoot(document.getElementById('app')); flushSync(()=>root.render(React.createElement(ProductCard,{product}))); controller=createController();};`;
  // The SDK barrel re-exports an optional player. Allow tree-shaking unused
  // player code, but fail if the resulting bundle actually needs that peer.
  const optionalPeer = '@mux/mux-player-react/lazy';
  const bundle = await build({ stdin: { contents: browserEntry, resolveDir: workspace, loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', external: [optionalPeer], define: { 'process.env.NODE_ENV': '"production"' } });
  assert.ok(!bundle.outputFiles[0].text.includes(optionalPeer), 'Generated code needs the optional player dependency');
  const browser = await chromium.launch({ headless: true, channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome' });
  const context = await browser.newContext();
  // Isolated local DOM exercise, never a request to a real editor or CMS.
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();
  const errors = [], warnings = [], evidence = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
  try {
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    for (const category of ['SUMMER', 'Spring Collection']) {
      const urls = Object.fromEntries(['title', 'category', 'video', 'author', 'record'].map(key => [key, `https://editor.example/items/${key}`]));
      const encode = (text, key) => vercelStegaCombine(text, { origin: 'datocms', href: urls[key] }, false);
      const product = { title: encode('Sample title', 'title'), category: encode(category, 'category'), price: 27, _editingUrl: urls.record, video: { url: 'about:blank', alt: encode('Sample video', 'video') }, author: { name: encode('Sample author', 'author') } };
      await page.evaluate(product => window.renderCard(product), product);
      await page.waitForFunction(() => document.querySelector('article')?.hasAttribute('data-datocms-auto-content-link-url'));
      const observed = await page.evaluate(() => {
        const auto = 'data-datocms-auto-content-link-url', explicit = 'data-datocms-content-link-url';
        const target = element => { const owner = element?.closest(`[${explicit}],[${auto}]`); return owner?.getAttribute(explicit) ?? owner?.getAttribute(auto); };
        const leaves = [...document.querySelectorAll('article *')].filter(el => !el.children.length);
        const author = leaves.find(el => el.textContent.startsWith('Sample author'));
        const price = leaves.find(el => /^\D*27\D*$/.test(el.textContent));
        return { card: target(document.querySelector('article')), author: target(author), video: target(document.querySelector('video')), price: target(price), category: document.querySelector('[data-category]')?.getAttribute('data-category'), text: document.querySelector('article').textContent };
      });
      assert.equal(observed.card, urls.title);
      assert.equal(observed.author, urls.author);
      assert.equal(observed.video, urls.video);
      assert.equal(observed.price, urls.record);
      assert.equal(observed.category, category.toLowerCase());
      for (const visible of ['Sample title', 'Sample author', category, '27']) assert.ok(observed.text.includes(visible));
      evidence.push({ ...observed, text: 'Visible content retained; encoded values omitted from report' });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings.filter(message => /collision/i.test(message)), []);
    return { passed: true, evidence, checks: ['TypeScript', 'real controller target resolution for two inputs', 'no group collisions', 'clean filter values', 'visible content retained'] };
  } finally { await context.close(); await browser.close(); }
}
