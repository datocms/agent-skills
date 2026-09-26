import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as scenario from '../e2e/catalog/schema-types.mjs';

const unlinked = { profiles: { default: { migrations: { directory: 'migrations' } } } };
test('schema type checks reject newly linked or retargeted profiles but accept existing links', () => {
  assert.equal(typeof scenario.assertConfigSiteIds, 'function');
  assert.doesNotThrow(() => scenario.assertConfigSiteIds(unlinked, structuredClone(unlinked)));
  for (const after of [
    { ...unlinked, siteId: '123' },
    { profiles: { default: { siteId: '123' } } },
    { profiles: { default: {}, extra: { siteId: '123' } } },
  ]) assert.throws(() => scenario.assertConfigSiteIds(unlinked, after), /siteId/);
  const linked = { profiles: { default: { siteId: '123' } } };
  assert.doesNotThrow(() => scenario.assertConfigSiteIds(linked, { profiles: { default: { siteId: '123', migrations: { directory: 'new-path' } } } }));
  assert.throws(() => scenario.assertConfigSiteIds(linked, { profiles: { default: { siteId: '456' } } }), /siteId/);
  assert.throws(() => scenario.assertConfigSiteIds(linked, { profiles: { other: { siteId: '123' } } }), /siteId/);
  assert.doesNotThrow(() => scenario.assertConfigSiteIds(linked, {}));
});

test('schema type checks capture the seeded configuration and reject a link before executing code', async () => {
  assert.equal(typeof scenario.configure, 'function');
  const workspace = mkdtempSync(join(tmpdir(), 'schema-auth-'));
  try {
    const path = join(workspace, 'datocms.config.json'), state = {};
    writeFileSync(path, JSON.stringify(unlinked));
    await scenario.configure({ workspace, state });
    assert.deepEqual(state.configBefore, unlinked);
    writeFileSync(path, JSON.stringify({ profiles: { default: { siteId: '123' } } }));
    // No generated files, compiler or client exists: this guard must run first.
    await assert.rejects(scenario.check({ workspace, state }), /siteId/);
  } finally { rmSync(workspace, { recursive: true, force: true }); }
});
