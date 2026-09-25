import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyAuthoring } from './authoring.mjs';

const row = {
  failures: [], calls: [],
  referenceReads: [{ path: 'src/cms.ts' }, { path: 'src/generated/project.ts' }],
  finalText: '```ts\nimport { cms } from "./cms";\nimport type { Article } from "./generated/project";\nexport async function getArticleTitle(id:string):Promise<string|null>{return (await cms.items.find<Article>(id)).title;}\n```',
};

test('local authoring fixture compiles and executes code using the existing client and model', async () => {
  const result = await verifyAuthoring(row);
  assert.equal(result.passed, true, result.failures.join('\n'));
});

test('local authoring fixture rejects unnecessary type generation and fabricated return values', async () => {
  const result = await verifyAuthoring({ ...row,
    calls: [{ name: 'exec_command', args: { cmd: 'npx datocms schema:generate another.ts' } }],
    finalText: row.finalText.replace('return (await cms.items.find<Article>(id)).title;', 'return "Hardcoded";'),
  });
  assert.equal(result.passed, false);
  assert.ok(result.failures.some((message) => message.includes('Introduced setup, type generation')));
  assert.ok(result.failures.some((message) => message.includes('Wrong helper result')));
  assert.ok(result.failures.some((message) => message.includes('exactly the requested records')));
});
