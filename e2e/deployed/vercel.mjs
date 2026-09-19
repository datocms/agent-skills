import assert from 'node:assert/strict';

// This adapter deliberately has no account-wide listing or mutation methods.
// Every operation is bound to the operator's explicitly authorized project.
export function scopedVercel({ token, projectId, teamId, projectName, repository, fetchImpl = fetch }) {
  assert.match(projectId, /^prj_[A-Za-z0-9]+$/);
  assert.match(teamId, /^team_[A-Za-z0-9]+$/);
  assert.ok(token && projectName && repository);
  const encode = encodeURIComponent;
  async function request(path, { method = 'GET', body, query = {} } = {}) {
    const url = new URL(path, 'https://api.vercel.com');
    url.searchParams.set('teamId', teamId);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
    const response = await fetchImpl(url, {
      method, redirect: 'error', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw Error(`Vercel ${method} ${url.pathname}: HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  }
  async function project() {
    const value = await request(`/v9/projects/${projectId}`);
    assert.equal(value.id, projectId, 'Unexpected project');
    assert.equal(value.accountId, teamId, 'Unexpected team');
    assert.equal(value.name, projectName, 'Unexpected project name');
    assert.equal(`${value.link?.org}/${value.link?.repo}`, repository, 'Unexpected repository');
    return value;
  }
  async function deployments() {
    const result = await project();
    const recent = result.latestDeployments ?? [];
    for (const value of recent) {
      if (value.projectId !== undefined) assert.equal(value.projectId, projectId);
      if (value.name !== undefined) assert.equal(value.name, projectName);
    }
    return recent.map(value => ({ ...value, uid: value.id, created: value.createdAt }));
  }
  async function deployment(id) {
    assert.match(id, /^dpl_[A-Za-z0-9]+$/);
    // Project integrations can read their project's snapshot even when the
    // account-level deployments endpoint is outside their granted scopes.
    const result = await project();
    const value = [...(result.latestDeployments ?? []), ...Object.values(result.targets ?? {})].find(value => value.id === id);
    assert.ok(value, 'Deployment is not in the authorized project snapshot');
    return value;
  }
  async function setBuildCommand(command) {
    await project();
    await request(`/v9/projects/${projectId}`, { method: 'PATCH', body: { buildCommand: command } });
    const value = await project();
    assert.equal(value.buildCommand, command);
  }
  async function environment() {
    await project();
    return (await request(`/v9/projects/${projectId}/env`, { query: { decrypt: true } })).envs;
  }
  async function createEnvironment(key, value) {
    // Never replace an existing variable: callers must track and delete owned IDs.
    assert.match(key, /^[A-Z][A-Z0-9_]+$/);
    const current = await environment();
    assert.ok(!current.some(entry => entry.key === key), `Environment variable already exists: ${key}`);
    return request(`/v10/projects/${projectId}/env`, { method: 'POST', body: { key, value, type: 'encrypted', target: ['production'] } });
  }
  async function deleteEnvironment(id, expectedKey) {
    const current = await environment();
    const entry = current.find(value => value.id === id);
    if (!entry) return;
    assert.equal(entry.key, expectedKey);
    await request(`/v9/projects/${projectId}/env/${encode(id)}`, { method: 'DELETE' });
    assert.ok(!(await environment()).some(value => value.id === id));
  }
  return { project, deployments, deployment, setBuildCommand, environment, createEnvironment, deleteEnvironment };
}
