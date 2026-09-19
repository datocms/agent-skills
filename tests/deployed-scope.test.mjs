import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scopedVercel } from '../e2e/deployed/vercel.mjs';

const identity = { projectId: 'prj_fixture', teamId: 'team_fixture', projectName: 'throwaway', repository: 'owner/throwaway', token: 'private-fixture-token' };
const project = { id: identity.projectId, accountId: identity.teamId, name: identity.projectName, link: { org: 'owner', repo: 'throwaway' } };

for (const [field, value] of [['id', 'prj_other'], ['accountId', 'team_other'], ['name', 'other'], ['link', { org: 'owner', repo: 'other' }]]) {
  test(`rejects ${field} mismatch before provider mutation`, async () => {
    const calls = [];
    const client = scopedVercel({ ...identity, fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return Response.json({ ...project, [field]: value });
    } });
    await assert.rejects(client.setBuildCommand('npm run build'));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.method, 'GET');
    assert.equal(calls[0].url.searchParams.get('teamId'), identity.teamId);
    assert.equal(calls[0].options.redirect, 'error');
  });
}

test('refuses to replace an existing environment variable', async () => {
  const calls = [];
  const client = scopedVercel({ ...identity, fetchImpl: async (url, options) => {
    calls.push(options.method);
    return Response.json(url.pathname.endsWith('/env') ? { envs: [{ id: 'existing', key: 'PUBLIC_SEARCH_TOKEN' }] } : project);
  } });
  await assert.rejects(client.createEnvironment('PUBLIC_SEARCH_TOKEN', 'new-value'), /already exists/);
  assert.deepEqual(calls, ['GET', 'GET']);
});

test('refuses cleanup when a recorded environment ID has a different key', async () => {
  const methods = [];
  const client = scopedVercel({ ...identity, fetchImpl: async (url, options) => {
    methods.push(options.method);
    return Response.json(url.pathname.endsWith('/env') ? { envs: [{ id: 'owned', key: 'UNRELATED_SECRET' }] } : project);
  } });
  await assert.rejects(client.deleteEnvironment('owned', 'PUBLIC_SEARCH_TOKEN'));
  assert.deepEqual(methods, ['GET', 'GET']);
});

test('provider error responses cannot expose credentials', async () => {
  const client = scopedVercel({ ...identity, fetchImpl: async () => Response.json({ error: identity.token }, { status: 403 }) });
  await assert.rejects(client.project(), error => error.message.includes('HTTP 403') && !error.message.includes(identity.token));
});
