import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../e2e/cases/structured-text-import-html.e2e.test.ts', import.meta.url), 'utf8');
const file = ts.createSourceFile('html-import.ts', source, ts.ScriptTarget.Latest, true);
function find(node, predicate) {
  if (predicate(node)) return node;
  let found;
  ts.forEachChild(node, child => { found ??= find(child, predicate); return found; });
  return found;
}
function property(node, name) {
  return find(node, child => ts.isPropertyAssignment(child) && child.name.getText(file) === name);
}
function compile(parameters, body) {
  const code = ts.transpileModule(`async function verify(${parameters.join(',')}) { ${body} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return new Function(`${code}; return verify;`)();
}
function versionGuard() {
  const oracle = property(file, 'assert');
  assert.ok(oracle && ts.isArrowFunction(oracle.initializer));
  const statement = oracle.initializer.body.statements.find(statement => find(statement, child => ts.isCallExpression(child) && child.expression.getText(file) === 'cmaClient.itemVersions.list'));
  assert.ok(statement, 'the actual live oracle must check the parent version count');
  return compile(['cmaClient', 'context', 'expect'], statement.getText(file));
}
function client(versions, calls) {
  return { itemVersions: { list: async id => { assert.equal(id, 'parent-record'); calls.push(id); return Array.from({ length: versions }, (_, index) => ({ id: `version-${index}` })); } } };
}
const expect = (actual, message) => ({
  toBe: expected => assert.equal(actual, expected, message),
  toHaveLength: expected => assert.equal(actual.length, expected, message),
});

test('HTML import seeding records the actual parent version count', async () => {
  const fixtures = property(file, 'fixtures');
  const baseline = property(fixtures.initializer, 'versionCount');
  assert.ok(baseline, 'record versionCount after fixture seeding');
  const seedCount = compile(['client', 'record'], `return (${baseline.initializer.getText(file)});`);
  const calls = [];
  assert.equal(await seedCount(client(3, calls), { id: 'parent-record' }), 3);
  assert.deepEqual(calls, ['parent-record']);
});

test('HTML import oracle accepts one write and rejects an intermediate destructive write', async () => {
  const guard = versionGuard(), context = { original: { id: 'parent-record' }, versionCount: 3 };
  const calls = [];
  await guard(client(4, calls), context, expect);
  await assert.rejects(guard(client(5, calls), context, expect), /Exactly one new parent version/);
  await assert.rejects(guard(client(3, calls), context, expect), /Exactly one new parent version/);
  assert.equal(calls.length, 3);
});
