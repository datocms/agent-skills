import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const repoRoot = process.env.REFERENCE_REPO_ROOT
  ? resolve(process.env.REFERENCE_REPO_ROOT)
  : fileURLToPath(new URL('../', import.meta.url));
const referenceNames = [
  'draft-mode-concepts',
  'nextjs',
  'nuxt',
  'sveltekit',
  'astro',
];

function loadShippedHelper(name) {
  const path = resolve(
    repoRoot,
    'skills/datocms-frontend-integrations/references',
    name + '.md',
  );
  const markdown = readFileSync(path, 'utf8');
  const helpers = [];
  for (const match of markdown.matchAll(/^```(?:ts|typescript|tsx)\s*\n([\s\S]*?)^```/gm)) {
    const source = ts.createSourceFile(
      path + '.ts',
      match[1],
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    for (const statement of source.statements) {
      if (
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === 'isRelativeUrl'
      ) {
        helpers.push(statement.getText(source).replace(/^export\s+/, ''));
      }
    }
  }
  assert.equal(helpers.length, 1, name + ' must ship exactly one helper');
  const { outputText, diagnostics } = ts.transpileModule(
    helpers[0] + '\nisRelativeUrl;',
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
      reportDiagnostics: true,
    },
  );
  assert.equal(diagnostics?.length ?? 0, 0, name + ' must transpile');
  return runInNewContext(outputText, { URL }, { timeout: 1000 });
}

const valid = [
  '',
  '/',
  '/articles/example',
  '/articles/example?preview=true#details',
  'articles/example',
  './articles/example',
  '../articles/example',
  '?preview=true',
  '#details',
  '/caffè/日本語',
  '/a b',
  '/https://example.org',
  '/search?q=https%3A%2F%2Fexample.org',
  '/search?q=//example.org',
  '/%2Fexample.org',
];

const invalid = [
  'https://example.org/path',
  'http://example.org',
  'HTTPS://example.org',
  'https://preview.invalid/same-origin-is-still-absolute',
  'https:example.org',
  'https:/example.org',
  'javascript:alert(1)',
  'data:text/html,test',
  'mailto:someone@example.org',
  '//example.org',
  '///example.org',
  '//preview.invalid/path',
  '//user:pass@example.org',
  '/\\example.org',
  '\\\\example.org',
  '\\example.org',
  ' /articles',
  '/articles ',
  '\u00a0//example.org',
  '//[invalid',
  'http://[invalid',
];

for (const name of referenceNames) {
  test(name + ': shipped redirect helper preserves relative URLs and rejects escapes', () => {
    const isRelativeUrl = loadShippedHelper(name);
    for (const value of valid) {
      assert.equal(isRelativeUrl(value), true, 'rejected ' + JSON.stringify(value));
      const base = new URL('https://app.example.test/nested/page');
      assert.equal(new URL(value, base).origin, base.origin);
    }
    for (const value of invalid) {
      assert.equal(isRelativeUrl(value), false, 'accepted ' + JSON.stringify(value));
    }
    for (const code of [...Array(32).keys(), 127]) {
      const control = String.fromCharCode(code);
      for (const value of [control + '/page', '/' + control + '/example.org', '/page' + control]) {
        assert.equal(isRelativeUrl(value), false, 'accepted control in ' + JSON.stringify(value));
      }
    }
    // Validate the value the endpoint receives after URLSearchParams decoding.
    for (const encoded of ['%2F%2Fexample.org', '%2F%5Cexample.org', '%09%2F%2Fexample.org']) {
      const value = new URLSearchParams('redirect=' + encoded).get('redirect');
      assert.equal(isRelativeUrl(value), false, 'accepted decoded ' + encoded);
    }
  });
}

function loadPreviewEndpoint(framework, kind, secretApiToken, token) {
  const path = resolve(repoRoot, 'skills/datocms-frontend-integrations/references', framework + '.md');
  const marker = kind === 'draft enable'
    ? /enableDraftMode\(event\)|draft\.enable\(\)/
    : /WebPreviewsResponse/;
  const snippets = [...readFileSync(path, 'utf8').matchAll(/^```ts\s*\n([\s\S]*?)^```/gm)]
    .map((match) => match[1])
    .filter((source) => marker.test(source));
  assert.equal(snippets.length, 1, framework + ' ' + kind + ': expected one shipped endpoint');
  const { outputText, diagnostics } = ts.transpileModule(snippets[0], {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(diagnostics?.length ?? 0, 0, framework + ' ' + kind + ': endpoint must transpile');

  const effects = [];
  const exports = {};
  const url = new URL('https://app.example.test/api/preview');
  if (token !== undefined) url.searchParams.set('token', token);
  const enableDraftMode = () => effects.push('enableDraftMode');
  const redirect = (location) => {
    effects.push('redirect:' + location);
    return new Response(null, { status: 307, headers: { location } });
  };
  const readBody = async () => {
    effects.push('readBody');
    return { item: { meta: { status: 'draft' } }, locale: 'en' };
  };
  const utils = {
    ensureHttpMethods: () => {},
    isRelativeUrl: loadShippedHelper(framework),
    handleUnexpectedError: (error) => { throw error; },
    invalidRequestResponse: (message, status) => new Response(message, { status }),
    makeDraftModeWorkWithinIframes: async () => {},
    withCORS: () => ({}),
    json: Response.json.bind(Response),
  };
  const recordInfo = {
    recordToWebsiteRoute: async () => { effects.push('recordToWebsiteRoute'); return '/article'; },
  };
  const imports = {
    '~/lib/api/draftMode': { enableDraftMode },
    '~/lib/draftMode': { enableDraftMode },
    '$lib/draftMode.server': { enableDraftMode },
    'next/headers': { draftMode: async () => ({ enable: enableDraftMode }) },
    'next/navigation': { redirect },
    'next/server': { NextResponse: { json: Response.json.bind(Response) } },
    '@sveltejs/kit': { json: Response.json.bind(Response), redirect: (_status, location) => redirect(location) },
    '$env/dynamic/private': { env: { PRIVATE_SECRET_API_TOKEN: secretApiToken } },
    'astro:env/server': { SECRET_API_TOKEN: secretApiToken },
    '~/lib/api/utils': utils,
    '~/lib/utils': utils,
    '../utils': utils,
    '../../utils': utils,
    '@datocms/rest-client-utils': { deserializeRawItem: (item) => item },
    '~/lib/datocms/recordInfo': recordInfo,
    '@/lib/datocms/recordInfo': recordInfo,
    '$lib/datocms/recordInfo': recordInfo,
  };
  runInNewContext(outputText, {
    exports,
    require: (name) => { assert(name in imports, 'Unexpected import: ' + name); return imports[name]; },
    URL, Response,
    process: { env: { SECRET_API_TOKEN: secretApiToken } },
    eventHandler: (handler) => handler,
    useRuntimeConfig: () => secretApiToken === undefined ? {} : { secretApiToken },
    getQuery: () => token === undefined ? {} : { token },
    createError: ({ message, status, statusCode }) => Object.assign(new Error(message), { status: status ?? statusCode }),
    sendRedirect: async (_event, location) => redirect(location),
    readBody,
    getRequestURL: () => url,
  }, { timeout: 1000 });
  return {
    effects,
    async invoke(method) {
      const request = { url: url.toString(), nextUrl: url, json: readBody };
      const event = { method, url, request, redirect };
      const handler = exports.default ?? exports[method];
      try {
        const result = await handler(framework === 'nextjs' ? request : event);
        return result instanceof Response ? result : Response.json(result ?? {});
      } catch (error) {
        if (framework === 'nuxt' && error.status === 401) {
          return new Response(error.message, { status: 401 });
        }
        throw error;
      }
    },
  };
}

for (const framework of ['nuxt', 'nextjs', 'sveltekit', 'astro']) {
  for (const [name, method, expectedEffects] of [
    ['draft enable', 'GET', ['enableDraftMode', 'redirect:/']],
    ['preview links', 'POST', ['readBody', 'recordToWebsiteRoute']],
  ]) {
    test(framework + ' ' + name + ': rejects missing or empty secrets and invalid tokens before performing work', async () => {
      for (const secret of [undefined, '', 'preview-secret']) {
        for (const token of [undefined, '', 'wrong-token', 'preview-secret']) {
          const { invoke, effects } = loadPreviewEndpoint(framework, name, secret, token);
          const label = JSON.stringify({ secret, token });
          const result = await invoke(method);
          if (secret === 'preview-secret' && token === secret) {
            assert.notEqual(result.status, 401, label);
            assert.deepEqual(effects, expectedEffects, label);
            if (name === 'preview links') assert.equal((await result.json()).previewLinks.length, 1);
          } else {
            assert.equal(result.status, 401, label);
            assert.deepEqual(effects, [], label + ': authorization must precede draft access and body reads');
          }
        }
      }
      if (name === 'preview links') {
        const { invoke, effects } = loadPreviewEndpoint(framework, name);
        const result = await invoke('OPTIONS');
        assert.equal(result.status, 200, 'preflight remains available without authentication');
        assert.deepEqual(effects, []);
      }
    });
  }
}
