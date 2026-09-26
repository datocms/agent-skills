import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const runtime = new URL('../e2e/catalog/plugin/node_modules/playwright/index.mjs', import.meta.url);
const available = existsSync(runtime);
const origin = 'https://search-fixture.invalid';
function italianPage(wrongLocale, noopPageButton) {
  return `<!doctype html><html lang="it"><body><main><h1>Cerca</h1>
  <form id="form"><label for="query">Ricerca nel sito</label><input id="query" type="text"><button>Trova</button></form>
  <div id="loading" role="status" hidden>Attendere</div><div id="error" role="alert" hidden>Ricerca non disponibile</div>
  <ul id="results"></ul><p id="empty" hidden>Nessun risultato</p>
  <nav aria-label="Pagine"><button id="previous" disabled>Indietro</button>${noopPageButton ? '<button type="button">1</button>' : ''}<span id="count">1 / 1</span><button id="next" disabled>Avanti</button></nav>
  </main><script>
  const form=document.getElementById('form'), query=document.getElementById('query'), loading=document.getElementById('loading'), error=document.getElementById('error'), results=document.getElementById('results'), previous=document.getElementById('previous'), next=document.getElementById('next'), empty=document.getElementById('empty');
  let offset=0,total=0;
  async function load(){
    loading.hidden=false;error.hidden=true;empty.hidden=true;previous.disabled=true;next.disabled=true;
    try {
      const url=new URL('/search-results',location.origin);
      url.searchParams.set('filter[query]',query.value);url.searchParams.set('filter[locale]',${JSON.stringify(wrongLocale ? 'en' : 'it')});url.searchParams.set('page[limit]','2');url.searchParams.set('page[offset]',String(offset));
      const response=await fetch(url);if(!response.ok)throw Error('request failed');const data=await response.json();
      results.replaceChildren();for(const item of data.data){const li=document.createElement('li'),a=document.createElement('a');a.href=item.attributes.url;a.textContent=item.attributes.title;li.append(a);results.append(li);}
      total=data.meta.total_count;empty.hidden=total!==0;document.getElementById('count').textContent=(offset/2+1)+' / '+Math.max(1,Math.ceil(total/2));
    }catch(e){error.hidden=false;results.replaceChildren();total=0;}
    finally{loading.hidden=true;previous.disabled=offset===0;next.disabled=offset+2>=total;}
  }
  form.addEventListener('submit',event=>{event.preventDefault();offset=0;load();});
  next.addEventListener('click',()=>{offset+=2;load();});previous.addEventListener('click',()=>{offset=Math.max(0,offset-2);load();});
  </script></body></html>`;
}
async function fixture(t, options, verify) {
  const { chromium } = await import(runtime.href);
  const originalLaunch = chromium.launch;
  let browser;
  try { browser = await originalLaunch.call(chromium, { channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome', headless: true }); }
  catch (error) {
    if (/executable.*doesn.t exist|distribution.*not found|executablePath.*doesn.t exist/i.test(error.message)) { t.skip('Chrome is not installed'); return; }
    throw error;
  }
  const context = await browser.newContext();
  context.setDefaultTimeout(1500);
  const requests = [], saved = new Map();
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    assert.equal(url.origin, origin, 'all requests stay in the intercepted fixture');
    if (url.pathname === '/it/search') return route.fulfill({ status: 200, contentType: 'text/html', body: italianPage(options.wrongLocale, options.noopPageButton) });
    if (url.pathname === '/search-results') {
      requests.push(url.href);
      const absent = url.searchParams.get('filter[query]')?.startsWith('absent');
      const prefix = options.englishUrls ? 'en' : 'it';
      const all = absent ? [] : [1, 2, 3].map(id => ({ id: String(id), type: 'search_result', attributes: { url: `${origin}/${prefix}/result-${id}`, title: `Risultato ${id}` } }));
      const offset = Number(url.searchParams.get('page[offset]') ?? 0);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: all.slice(offset, offset + 2), meta: { total_count: all.length } }) });
    }
    return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Fixture route missing' });
  });
  let legacyLaunchAttempted = false;
  // The pre-fix oracle ignores an injected context. Intercept that launch too,
  // so its red test cannot reach an actual website or bypass the fixture.
  chromium.launch = async () => { legacyLaunchAttempted = true; return { newContext: async () => context, close: async () => {} }; };
  try {
    const { checkSearchBrowser } = await import('../e2e/deployed/search-browser.mjs');
    const checks = await checkSearchBrowser({ origin, marker: 'fixture-search', locales: ['it'], context, crawlLimit: options.crawlLimit, save: (name, data) => saved.set(name, structuredClone(data)) });
    assert.equal(legacyLaunchAttempted, false, 'the caller-supplied context must be used');
    await verify({ checks, requests, saved });
    const remaining = await context.newPage();
    await remaining.close();
  } finally {
    chromium.launch = originalLaunch;
    await context.close();
    await browser.close();
  }
}

test('deployed browser oracle accepts Italian copy, a textbox, and a one-result second page', { skip: !available && 'Playwright fixture is absent' }, async t => {
  await fixture(t, {}, async ({ checks, requests, saved }) => {
    assert.ok(checks.length >= 4);
    assert.ok(checks.every(check => check.passed), JSON.stringify(checks));
    assert.ok(requests.some(value => new URL(value).searchParams.get('page[offset]') === '2'));
    assert.ok(requests.every(value => new URL(value).searchParams.get('filter[locale]') === 'it'));
    assert.deepEqual(saved.get('browser-checks.json'), checks);
  });
});

test('deployed browser oracle rejects an Italian page sending an English locale filter', { skip: !available && 'Playwright fixture is absent' }, async t => {
  await fixture(t, { wrongLocale: true }, async ({ checks }) => {
    assert.ok(checks.some(check => !check.passed && /locale|\bit\b|\ben\b/i.test(check.error ?? '')), JSON.stringify(checks));
  });
});

test('pagination discovery continues past an enabled current-page button that makes no request', { skip: !available && 'Playwright fixture is absent' }, async t => {
  await fixture(t, { noopPageButton: true }, async ({ checks, requests }) => {
    assert.ok(checks.every(check => check.passed), JSON.stringify(checks));
    assert.ok(requests.some(value => new URL(value).searchParams.get('page[offset]') === '2'));
  });
});

test('crawl quota blocks only result-locale assertions and never turns them into passes', { skip: !available && 'Playwright fixture is absent' }, async t => {
  await fixture(t, { englishUrls: true, crawlLimit: { maxIndexablePages: 200, sitemapUrls: 265, limited: true } }, async ({ checks }) => {
    const blocked = checks.filter(check => check.environmentLimit === 'crawl-quota');
    assert.ok(blocked.length > 0);
    assert.ok(blocked.every(check => !check.passed && check.sitemapUrls === 265 && check.maxIndexablePages === 200));
    const verified = checks.filter(check => !check.environmentLimit);
    assert.ok(verified.length >= 4, 'quota must not skip request and UI behavior checks');
    assert.ok(verified.every(check => check.passed), JSON.stringify(checks));
  });
});
