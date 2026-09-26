import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import ts from 'typescript';

const helperUrl = new URL('../e2e/catalog/plugin-transport.mjs', import.meta.url);
const helpers = existsSync(helperUrl) ? await import(helperUrl.href) : {};
const source = readFileSync(new URL('../e2e/catalog/hosted-editor.mjs', import.meta.url), 'utf8');
const file = ts.createSourceFile('hosted-editor.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
function find(node, predicate) {
  if (predicate(node)) return node;
  let found;
  ts.forEachChild(node, child => { found ??= find(child, predicate); return found; });
  return found;
}
function helper(name) { assert.equal(typeof helpers[name], 'function'); return helpers[name]; }

test('hosted plugin transport requires paired settings and validates HTTPS origins', () => {
  const resolve = helper('resolvePluginTransport');
  assert.deepEqual(resolve({}), { port: 0, publicOrigin: undefined });
  assert.deepEqual(resolve({ E2E_VISUAL_SERVER_PORT: '43001', E2E_VISUAL_PUBLIC_ORIGIN: 'https://ignored.example' }), { port: 0, publicOrigin: undefined });
  for (const env of [{ E2E_PLUGIN_SERVER_PORT: '43021' }, { E2E_PLUGIN_PUBLIC_ORIGIN: 'https://plugin.example' }]) assert.throws(() => resolve(env), /E2E_PLUGIN_.*together/);
  for (const port of ['0', '65536', '43021x', ' 43021']) assert.throws(() => resolve({ E2E_PLUGIN_SERVER_PORT: port, E2E_PLUGIN_PUBLIC_ORIGIN: 'https://plugin.example' }), /E2E_PLUGIN_SERVER_PORT.*1 to 65535/);
  for (const origin of ['http://plugin.example', 'https://u:p@plugin.example', 'https://plugin.example/x', 'https://plugin.example/?q=1', 'https://plugin.example/#h', 'invalid']) assert.throws(() => resolve({ E2E_PLUGIN_SERVER_PORT: '43021', E2E_PLUGIN_PUBLIC_ORIGIN: origin }), /E2E_PLUGIN_PUBLIC_ORIGIN.*HTTPS origin/);
  assert.deepEqual(resolve({ E2E_PLUGIN_SERVER_PORT: '43021', E2E_PLUGIN_PUBLIC_ORIGIN: 'https://plugin.example/' }), { port: 43021, publicOrigin: 'https://plugin.example' });
});

test('the actual hosted runner advertises its bound loopback host or the explicit public origin', () => {
  const declaration = find(file, node => ts.isVariableDeclaration(node) && node.name.getText(file) === 'origin');
  assert.ok(declaration?.initializer);
  const origin = new Function('server', 'transport', 'pluginOrigin', `return (${declaration.initializer.getText(file)});`);
  const server = { address: () => ({ port: 43021 }) };
  assert.equal(origin(server, { port: 0 }, helpers.pluginOrigin), 'http://127.0.0.1:43021');
  assert.equal(origin(server, { port: 43021, publicOrigin: 'https://plugin.example' }, helpers.pluginOrigin), 'https://plugin.example');
  const listen = find(file, node => ts.isCallExpression(node) && node.expression.getText(file) === 'server.listen');
  assert.ok(listen);
  const listenPort = new Function('transport', `return (${listen.arguments[0].getText(file)});`);
  assert.equal(listenPort({ port: 43021 }), 43021);
  assert.equal(new Function(`return (${listen.arguments[1].getText(file)});`)(), '127.0.0.1');
});

test('browser tasks request local-load diagnostics without changing edit and save instructions', () => {
  const save = find(file, node => ts.isCallExpression(node) && node.expression.getText(file) === 'save' && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'browser-task.json');
  assert.ok(save && ts.isObjectLiteralExpression(save.arguments[1]));
  const makeTask = new Function('editorUrl', 'origin', 'plugin', 'record', 'field', 'values', `return (${save.arguments[1].getText(file)});`);
  for (const variant of ['field', 'sidebar-modal']) {
    const task = makeTask('https://editor.example', 'http://127.0.0.1:43021', { id: 'plugin' }, { id: 'record' }, { id: 'field' }, { variant });
    assert.equal(task.expectedTitle, 'Hosted title proof');
    assert.match(task.instructions, /save.*reload/i);
    assert.match(task.instructions, /Italian.*Untouched note/);
    if (variant === 'sidebar-modal') assert.match(task.instructions, /modalApplied/);
    const diagnostics = JSON.stringify(task.localFailureDiagnostics);
    assert.match(diagnostics, /Chrome.*version|chromeVersion/i);
    assert.match(diagnostics, /permission.*prompt|permissionPrompt/i);
    assert.match(diagnostics, /iframe.*console.*error|iframeConsoleErrors/i);
  }
});
