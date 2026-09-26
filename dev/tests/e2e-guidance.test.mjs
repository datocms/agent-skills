import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
test('live-suite guidance prevents OAuth refresh during a run and preserves interrupted evidence', () => {
  const section = read('../e2e/README.md').split('## Live CMS cases\n')[1].split('\n## ')[0];
  const warning = section.split('\n').find(line => line.includes('INVALID_AUTHORIZATION_HEADER'));
  assert.ok(warning, 'document the observed OAuth-derived token interruption');
  assert.match(warning, /E2E_DATOCMS_API_TOKEN.*CLI.*OAuth session/);
  assert.match(warning, /don't run `datocms login` during a suite/);
  assert.match(warning, /re-authorizing can invalidate/);
  assert.match(warning, /stop, refresh the token/);
  assert.match(warning, /owned `e2e-\*` sandboxes/);
  assert.match(warning, /rerun only failed or unstarted cases.*new output dir/);
  assert.match(warning, /keep the interrupted evidence classified as infrastructure/);
  assert.ok(section.indexOf(warning) < section.indexOf('npm --prefix dev run test:e2e'));
});

for (const scenario of ['visual-editing', 'public-site']) {
  test(`${scenario} asks for functional verification without limiting it to a build`, () => {
    const source = read(`../e2e/catalog/${scenario}.mjs`);
    const file = ts.createSourceFile('scenario.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const declaration = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'prompt');
    assert.ok(declaration);
    const prompt = new Function('frameworkNames', `return (${declaration.getText(file).replace(/^export\s+/, '')});`)({ nextjs: 'Next.js', nuxt: 'Nuxt', sveltekit: 'SvelteKit', astro: 'Astro' });
    for (const framework of ['nextjs', 'nuxt', 'sveltekit', 'astro']) {
      const text = prompt({ project: { environment: 'fixture-sandbox' }, state: { framework, records: [{ item_type: { id: 'fixture-model' } }], environmentKeys: ['FIXTURE_VARIABLE'] } });
      assert.match(text, /Verify that it works\./);
      assert.doesNotMatch(text, /Verify the production build/);
      assert.match(text, /fixture-sandbox/);
      assert.match(text, /no CMS plugin installation, deployment|without draft reads, preview setup, CMS changes or deployment/);
    }
    assert.match(source, /Production build failed|production build failed/, 'the independent build assertion stays in place');
  });
}
