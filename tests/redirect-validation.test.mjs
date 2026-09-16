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

function loadNuxtEndpoint(marker, secretApiToken, token) {
  const path = resolve(repoRoot, 'skills/datocms-frontend-integrations/references/nuxt.md');
  const snippets = [...readFileSync(path, 'utf8').matchAll(/^```ts\s*\n([\s\S]*?)^```/gm)]
    .map((match) => match[1])
    .filter((source) => source.includes('export default eventHandler(') && source.includes(marker));
  assert.equal(snippets.length, 1, marker + ': expected one shipped endpoint');
  const { outputText, diagnostics } = ts.transpileModule(snippets[0], {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(diagnostics?.length ?? 0, 0, marker + ': endpoint must transpile');

  const effects = [];
  const exports = {};
  const imports = {
    '~/lib/api/draftMode': { enableDraftMode: () => effects.push('enableDraftMode') },
    '~/lib/api/utils': {
      ensureHttpMethods: () => {},
      isRelativeUrl: loadShippedHelper('nuxt'),
      handleUnexpectedError: (error) => { throw error; },
    },
    '@datocms/rest-client-utils': { deserializeRawItem: (item) => item },
    '~/lib/datocms/recordInfo': {
      recordToWebsiteRoute: async () => { effects.push('recordToWebsiteRoute'); return '/article'; },
    },
  };
  runInNewContext(outputText, {
    exports,
    require: (name) => { assert(name in imports, 'Unexpected import: ' + name); return imports[name]; },
    URL,
    eventHandler: (handler) => handler,
    useRuntimeConfig: () => secretApiToken === undefined ? {} : { secretApiToken },
    getQuery: () => token === undefined ? {} : { token },
    createError: ({ message }) => new Error(message),
    sendRedirect: async (_event, url) => effects.push('redirect:' + url),
    readBody: async () => { effects.push('readBody'); return { item: { meta: { status: 'draft' } }, locale: 'en' }; },
    getRequestURL: () => new URL('https://app.example.test/api/preview-links'),
  }, { timeout: 1000 });
  return { handler: exports.default, effects };
}

for (const [name, marker, method, expectedEffects] of [
  ['draft enable', 'enableDraftMode(event)', 'GET', ['enableDraftMode', 'redirect:/']],
  ['preview links', 'WebPreviewsRequestBody', 'POST', ['readBody', 'recordToWebsiteRoute']],
]) {
  test('Nuxt ' + name + ': rejects missing secrets and invalid tokens before performing work', async () => {
    for (const secret of [undefined, '', 'preview-secret']) {
      for (const token of [undefined, '', 'wrong-token', 'preview-secret']) {
        const { handler, effects } = loadNuxtEndpoint(marker, secret, token);
        const label = JSON.stringify({ secret, token });
        if (secret === 'preview-secret' && token === secret) {
          const result = await handler({ method });
          assert.deepEqual(effects, expectedEffects, label);
          if (name === 'preview links') assert.equal(result.previewLinks.length, 1);
        } else {
          await assert.rejects(handler({ method }), /Invalid token/, label);
          assert.deepEqual(effects, [], label + ': authorization must precede draft access and body reads');
        }
      }
    }
    if (name === 'preview links') {
      const { handler, effects } = loadNuxtEndpoint(marker);
      const result = await handler({ method: 'OPTIONS' });
      assert.equal(Object.keys(result).length, 0, 'preflight remains available without authentication');
      assert.deepEqual(effects, []);
    }
  });
}
