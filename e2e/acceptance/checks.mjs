import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { validate } from 'datocms-structured-text-utils';
import { chromium } from '../catalog/plugin/node_modules/playwright/index.mjs';
import { vercelStegaCombine } from '../catalog/web/node_modules/@vercel/stega/dist/index.js';

const require = createRequire(import.meta.url);
const { Parser } = require('@oclif/core');
const Call = require('datocms/lib/commands/cma/call').default;

// Parse a deliberately small, literal shell subset without executing output.
// Unsupported substitutions/operators are review failures, never evaluated.
export function words(line) {
  const result = []; let word = '', quote = null, active = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"') word += line[++i] ?? '';
      else word += ch;
    } else if (ch === "'" || ch === '"') { quote = ch; active = true; }
    else if (ch === '\\') { word += line[++i] ?? ''; active = true; }
    else if (/\s/.test(ch)) { if (active) { result.push(word); word = ''; active = false; } }
    else { assert.ok(!/[`$;|&<>]/.test(ch), 'Nonliteral shell syntax needs manual review'); word += ch; active = true; }
  }
  assert.equal(quote, null, 'Unclosed shell quote');
  if (active) result.push(word);
  return result;
}

export async function checkCli(text, variant = 'uploads') {
  // These fixtures have no conflicting package script; pnpm's exec is optional.
  const lines = text.replace(/\\\r?\n/g, ' ').split('\n').filter(line => /^\s*pnpm(?: exec)? datocms cma:/.test(line));
  assert.equal(lines.length, variant === 'uploads' ? 3 : 2, 'All requested CMA commands must be present');
  const observations = [];
  const call = new Call([], {});
  const resources = call.loadResources();
  for (const line of lines) {
    const tokens = words(line.trim()), commandIndex = tokens[1] === 'exec' ? 3 : 2;
    const id = tokens[commandIndex], argv = tokens.slice(commandIndex + 1);
    assert.ok(['cma:docs', 'cma:call'].includes(id));
    const Command = require(`datocms/lib/commands/${id.replace(':', '/')}`).default;
    const parsed = await Parser.parse(argv, { ...Command, args: Command.args, flags: { ...Command.baseFlags, ...Command.flags } });
    if (id === 'cma:docs') {
      const resource = call.findResource(resources, parsed.args.resource);
      assert.ok(resource.endpoints.some(endpoint => endpoint.rel === parsed.args.action), 'Documentation action must exist');
    } else {
      assert.equal(parsed.flags.profile, variant === 'uploads' ? 'studio' : 'client_b');
      assert.equal(parsed.flags.environment, variant === 'uploads' ? 'photo-review' : 'editorial-qa');
    }
    if (id === 'cma:call') {
      const resource = call.findResource(resources, parsed.args.resource);
      const { endpoint } = call.findEndpoint(resource, parsed.args.method);
      assert.equal(endpoint.method, 'GET');
      assert.equal(endpoint.rel, 'self');
      assert.equal(parsed.args.resource, variant === 'uploads' ? 'uploads' : 'items');
      const values = call.parseUrlPlaceholders(endpoint, parsed.argv.slice(2), parsed.args);
      assert.deepEqual(Object.values(values), [variant === 'uploads' ? 'asset_47' : 'abc123']);
    }
    observations.push({ command: id, args: parsed.args, flags: parsed.flags });
  }
  const docs = observations.filter(o => o.command === 'cma:docs');
  if (variant === 'uploads') {
    assert.deepEqual(docs.map(o => `${o.args.resource}/${o.args.action}`).sort(), ['uploads/create', 'uploads/self']);
    assert.deepEqual(docs.find(o => o.args.action === 'create').flags['expand-types'], ['*']);
  } else {
    assert.equal(docs[0].args.action, 'self');
  }
  return { passed: true, observations, cliVersion: require('datocms/package.json').version, network: 'none; parser and local resource metadata only' };
}

async function browserCode(workspace, contents, callback) {
  const optionalPeer = '@mux/mux-player-react/lazy';
  const bundle = await build({ stdin: { contents, resolveDir: workspace, loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', external: [optionalPeer], loader: { '.css': 'empty', '.png': 'dataurl', '.svg': 'dataurl' }, define: { 'process.env.NODE_ENV': '"production"' } });
  assert.ok(!bundle.outputFiles[0].text.includes(optionalPeer));
  const browser = await chromium.launch({ headless: true, channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome' });
  const context = await browser.newContext();
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [], collisions = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'warning' && /collision|Multiple stega-encoded payloads resolved to the same DOM element/i.test(m.text())) collisions.push(m.text());
  });
  try {
    await page.setContent('<html><body><div id="app"></div></body></html>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const evidence = await callback(page);
    assert.deepEqual(errors, []);
    assert.deepEqual(collisions, []);
    return { passed: true, evidence };
  } finally { await context.close(); await browser.close(); }
}

export async function checkLinks(workspace) {
  return browserCode(workspace, `import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {createController} from '@datocms/content-link';import Collection from './src/components/Collection.tsx';
  const root=createRoot(document.getElementById('app'));let controller;window.show=(entries)=>{controller?.dispose();flushSync(()=>root.render(<Collection entries={entries}/>));controller=createController();};`, async page => {
    const evidence = [];
    for (const ids of [['iris', 'elm'], ['elm', 'iris']]) {
      const entries = ids.map((id, i) => {
        const encode = (text, field) => vercelStegaCombine(text, { origin: 'datocms', href: `https://editor.example/${id}/${field}` }, false);
        return { id, heading: encode(`Collection ${id}`, 'heading'), badge: encode(i ? 'Limited Run' : 'ARCHIVE', 'badge'), image: { url: 'about:blank', alt: encode(`Cover ${id}`, 'image') }, curator: encode(`Curator ${id}`, 'curator'), count: i + 4, _editingUrl: `https://editor.example/${id}/record` };
      });
      await page.evaluate(entries => window.show(entries), entries);
      await page.waitForFunction(() => [...document.querySelectorAll('[data-entry]')].every(el => el.hasAttribute('data-datocms-auto-content-link-url')));
      const rows = await page.evaluate(() => [...document.querySelectorAll('[data-entry]')].map(row => {
        const target = el => { const owner = el?.closest('[data-datocms-content-link-url],[data-datocms-auto-content-link-url]'); return owner?.getAttribute('data-datocms-content-link-url') ?? owner?.getAttribute('data-datocms-auto-content-link-url'); };
        return { id: row.getAttribute('data-entry'), row: target(row), image: target(row.querySelector('img')), curator: target(row.querySelector('.curator')), count: target(row.querySelector('.count')), filter: row.getAttribute('data-badge'), badge: row.querySelector('.badge')?.textContent, text: row.textContent };
      }));
      assert.deepEqual(rows.map(row => row.id), ids);
      rows.forEach((row, i) => {
        const base = `https://editor.example/${row.id}/`;
        for (const [key, field] of [['row', 'heading'], ['image', 'image'], ['curator', 'curator'], ['count', 'record']]) assert.equal(row[key], base + field);
        const badge = i ? 'Limited Run' : 'ARCHIVE';
        assert.equal(row.badge, badge);
        assert.equal(row.filter, badge.toLowerCase());
        for (const text of [`Collection ${row.id}`, `Curator ${row.id}`, String(i + 4)]) assert.ok(row.text.includes(text));
        evidence.push({ ...row, text: 'Visible content retained; metadata omitted' });
      });
    }
    return evidence;
  });
}

export async function checkCounter(workspace) {
  return browserCode(workspace, `import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import App from './src/App.tsx';flushSync(()=>createRoot(document.getElementById('app')).render(<App/>));`, async page => {
    const counter = page.getByRole('button', { name: /Count is/ });
    const observed = [await counter.textContent()];
    await counter.click(); observed.push(await counter.textContent());
    await counter.click(); observed.push(await counter.textContent());
    await page.getByRole('button', { name: 'Reset', exact: true }).click(); observed.push(await counter.textContent());
    assert.deepEqual(observed.map(s => Number(s.match(/\d+/)[0])), [0, 2, 4, 0]);
    for (const text of ['Get started', 'Documentation', 'Connect with us']) assert.equal(await page.getByText(text, { exact: true }).count(), 1);
    return observed;
  });
}

export async function checkNotice(workspace) {
  return browserCode(workspace, `import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {createController} from '@datocms/content-link';import NoticeBanner from './src/components/NoticeBanner.tsx';
  const root=createRoot(document.getElementById('app'));let controller;window.show=(notice)=>{controller?.dispose();flushSync(()=>root.render(<NoticeBanner notice={notice}/>));controller=createController();};`, async page => {
    const evidence = [];
    for (const preview of [true, false]) {
      const encode = (text, field) => preview ? vercelStegaCombine(text, { origin: 'datocms', href: `https://editor.example/notice/${field}` }, false) : text;
      const href = '/exhibits?audience=all%20ages#opening';
      await page.evaluate(notice => window.show(notice), { heading: encode('New exhibit', 'heading'), audience: encode('ALL VISITORS', 'audience'), body: encode('Explore the collection', 'body'), href: encode(href, 'href') });
      if (preview) await page.waitForFunction(() => document.querySelector('.notice')?.hasAttribute('data-datocms-auto-content-link-url'));
      const observed = await page.evaluate(() => {
        const target = el => { const owner = el?.closest('[data-datocms-content-link-url],[data-datocms-auto-content-link-url]'); return owner?.getAttribute('data-datocms-content-link-url') ?? owner?.getAttribute('data-datocms-auto-content-link-url') ?? null; };
        return { banner: target(document.querySelector('.notice')), body: target(document.querySelector('.body')), audience: document.querySelector('.audience')?.textContent, href: document.querySelector('h2 a')?.getAttribute('href'), text: document.querySelector('.notice')?.textContent };
      });
      assert.equal(observed.banner, preview ? 'https://editor.example/notice/heading' : null);
      assert.equal(observed.body, preview ? 'https://editor.example/notice/body' : null);
      assert.equal(observed.audience, 'ALL VISITORS');
      assert.equal(observed.href, href);
      for (const text of ['New exhibit', 'Explore the collection']) assert.ok(observed.text.includes(text));
      evidence.push({ preview, ...observed, text: 'Visible content retained; metadata omitted' });
    }
    return evidence;
  });
}

export async function checkDocument(workspace, directory) {
  const output = join(directory, 'replaceBrand.bundle.mjs');
  await build({ entryPoints: [join(workspace, 'src/content/replaceBrand.ts')], bundle: true, platform: 'node', format: 'esm', outfile: output });
  const { replaceBrand } = await import(pathToFileURL(output).href);
  const input = { schema: 'dast', document: { type: 'root', children: [
    { type: 'heading', level: 2, children: [{ type: 'span', value: 'Northstar meets Northstar', marks: ['strong'] }] },
    { type: 'paragraph', style: 'intro', children: [
      { type: 'link', url: 'https://example.test/Northstar', meta: [{ id: 'title', value: 'Northstar reference' }], children: [{ type: 'span', value: 'Visit Northstar', marks: ['emphasis'] }] },
      { type: 'itemLink', item: 'Northstar-record', children: [{ type: 'span', value: 'Northstar exhibit' }] },
      { type: 'inlineItem', item: 'Northstar-inline' },
    ] },
    { type: 'list', style: 'bulleted', children: [{ type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'span', value: 'Northstar nested; northstar stays lowercase' }] }] }] },
    { type: 'block', item: 'Northstar-block' },
    { type: 'code', language: 'js', code: 'const Northstar = 1;' },
  ] } };
  const before = structuredClone(input), expected = structuredClone(input);
  expected.document.children[0].children[0].value = 'Harbor meets Harbor';
  expected.document.children[1].children[0].children[0].value = 'Visit Harbor';
  expected.document.children[1].children[1].children[0].value = 'Harbor exhibit';
  expected.document.children[2].children[0].children[0].children[0].value = 'Harbor nested; northstar stays lowercase';
  assert.equal(validate(input).valid, true, 'Oracle input must be valid DAST');
  const actual = replaceBrand(input, 'Northstar', 'Harbor');
  assert.deepEqual(actual, expected);
  assert.equal(validate(actual).valid, true);
  assert.notEqual(actual, input);
  assert.deepEqual(input, before);
  assert.deepEqual(replaceBrand(input, '', 'x'), before);
  assert.deepEqual(replaceBrand(input, 'Missing', 'x'), before);
  return { passed: true, checks: ['exact prose edit', 'valid DAST', 'reference/code/metadata/style/mark preservation', 'input immutability', 'empty and absent searches'] };
}

export function productionBuild(workspace, directory) {
  try {
    writeFileSync(join(directory, 'build.log'), execFileSync('npm', ['run', 'build'], { cwd: workspace, encoding: 'utf8', timeout: 180000, maxBuffer: 20e6 }));
  } catch (error) {
    writeFileSync(join(directory, 'build.log'), `${error.stdout ?? ''}${error.stderr ?? ''}`);
    throw Error('Production build failed; see build.log');
  }
}
