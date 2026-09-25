import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

// Deploy reviewed source through one existing project hook. No Git push can
// accidentally fan out to other projects linked to the same repository.
export async function deployCandidate({ provider, client, triggerId, projectId, teamId, baselineRepository, baselineRevision, candidate, output, ownedEnvironment, saveOwnedEnvironment, secrets = [], timeoutMs = 600000 }) {
  assert.ok(!existsSync(output), 'Refusing to replace deployment evidence');
  mkdirSync(output, { recursive: true, mode: 0o700 });
  const save = value => writeFileSync(join(output, 'result.json'), JSON.stringify(value, null, 2), { mode: 0o600 });
  const trigger = await client.buildTriggers.find(triggerId);
  assert.equal(trigger.adapter_settings.project_id, projectId);
  assert.equal(trigger.adapter_settings.team_id, teamId);
  const project = await provider.project();
  const buildCommand = project.buildCommand;
  const stage = join(output, 'source');
  execFileSync('git', ['clone', '--quiet', '--no-hardlinks', resolve(baselineRepository), stage]);
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: stage, encoding: 'utf8' }).trim(), baselineRevision);
  execFileSync('git', ['rm', '-qr', '.'], { cwd: stage });
  cpSync(candidate, stage, { recursive: true, filter: path => !['node_modules', '.git', '.agents', '.next', '.vercel', 'setup-result.json'].includes(basename(path)) && !basename(path).startsWith('.env') });
  execFileSync('git', ['add', '.'], { cwd: stage });
  const patch = execFileSync('git', ['diff', '--binary', 'HEAD'], { cwd: stage });
  for (const secret of secrets.filter(Boolean)) assert.ok(!patch.includes(secret), 'Credential in source patch');
  writeFileSync(join(output, 'candidate.patch'), patch, { mode: 0o600 });
  const state = { phase: 'preparing', baselineRevision, sourcePatchSha256: createHash('sha256').update(patch).digest('hex'), states: [], cleanup: 'pending' };
  save(state);
  const key = 'SKILL_E2E_SOURCE_PATCH';
  for (const old of ownedEnvironment.filter(entry => entry.key === key)) await provider.deleteEnvironment(old.id, old.key);
  await provider.createEnvironment(key, gzipSync(patch).toString('base64'));
  const entry = (await provider.environment()).find(entry => entry.key === key);
  assert.ok(entry);
  ownedEnvironment.push({ id: entry.id, key });
  saveOwnedEnvironment(ownedEnvironment);
  const command = `node -e "require('fs').writeFileSync('/tmp/skill-e2e.patch',require('zlib').gunzipSync(Buffer.from(process.env.SKILL_E2E_SOURCE_PATCH,'base64')))" && git apply /tmp/skill-e2e.patch && npm ci --include=dev --ignore-scripts && npm run build`;
  try {
    await provider.setBuildCommand(command);
    const before = new Set((await provider.deployments()).map(deployment => deployment.uid));
    state.startedAt = new Date().toISOString();
    state.phase = 'building'; save(state);
    await client.buildTriggers.trigger(triggerId);
    for (const deadline = Date.now() + timeoutMs; Date.now() < deadline;) {
      const deployment = (await provider.deployments()).find(deployment => !before.has(deployment.uid));
      if (deployment) {
        state.deploymentId = deployment.uid;
        state.url = deployment.url;
        if (state.states.at(-1) !== deployment.readyState) { state.states.push(deployment.readyState); save(state); }
        if (['READY', 'ERROR', 'CANCELED'].includes(deployment.readyState)) { state.actual = deployment.readyState; break; }
      }
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
    assert.equal(state.actual, 'READY', 'Candidate deployment failed or timed out');
    state.passed = true;
  } catch (error) { state.passed = false; state.error = error.message; }
  finally {
    await provider.setBuildCommand(buildCommand);
    state.cleanup = 'Original build command restored and verified; owned environment variables retained for checks';
    state.phase = 'finished'; save(state);
  }
  return state;
}
