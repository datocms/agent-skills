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
