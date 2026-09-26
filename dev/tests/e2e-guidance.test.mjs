import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
