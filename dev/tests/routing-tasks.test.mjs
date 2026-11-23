import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// Reads repo files by repo-relative path; run from the repo root whatever the caller's cwd.
process.chdir(new URL('../..', import.meta.url).pathname);

const routing = 'dev/e2e/routing';
const skills = readdirSync('skills').map((name) => name.replace(/^datocms-/, ''));
const workspaces = ['empty', ...readdirSync(join(routing, 'workspaces'))];
const read = (file) => JSON.parse(readFileSync(join(routing, file), 'utf8'));

for (const file of ['tasks.json', 'tasks-heldout.json']) {
  test(`${file}: every task names a known folder and known skills, once each`, () => {
    const tasks = read(file);
    assert.equal(new Set(tasks.map((task) => task.id)).size, tasks.length, 'task ids are unique');
    for (const task of tasks) {
      assert.match(task.id, /^[a-z0-9-]+$/, task.id);
      assert.ok(task.task?.trim(), `${task.id}: has a request`);
      assert.ok(workspaces.includes(task.workspace), `${task.id}: unknown folder ${task.workspace}`);
      const named = [...(task.load ?? []), ...(task.oneOf ?? []), ...(task.allow ?? [])];
      for (const skill of named) assert.ok(skills.includes(skill), `${task.id}: unknown skill ${skill}`);
      assert.equal(new Set(named).size, named.length, `${task.id}: a skill is listed in two fields`);
      for (const path of Object.keys(task.files ?? {})) assert.ok(!path.startsWith('/') && !path.includes('..'), `${task.id}: file stays in the folder`);
    }
  });
}

test('the two task files share no id and no request', () => {
  const dev = read('tasks.json');
  const heldOut = read('tasks-heldout.json');
  const ids = new Set(dev.map((task) => task.id));
  const requests = new Set(dev.map((task) => task.task));
  for (const task of heldOut) {
    assert.ok(!ids.has(task.id), `${task.id} is in both files`);
    assert.ok(!requests.has(task.task), `${task.id} repeats a development request`);
  }
});

test('every skill is required by some task and forbidden by some task', () => {
  const tasks = read('tasks.json');
  for (const skill of skills) {
    assert.ok(tasks.some((task) => (task.load ?? []).includes(skill)), `${skill}: no task requires it`);
    assert.ok(tasks.some((task) => ![...(task.load ?? []), ...(task.oneOf ?? []), ...(task.allow ?? [])].includes(skill)), `${skill}: no task forbids it`);
  }
});

test('the expected skills of the live cases name real cases and skills', () => {
  const expected = read('live-expected.json');
  // A live case's run folder carries its `name`, which is not always its file name.
  const cases = new Set(readdirSync('dev/e2e/cases').flatMap((file) => [...readFileSync(join('dev/e2e/cases', file), 'utf8').matchAll(/^\s*name: "([a-z0-9-]+)",$/gm)].map((match) => match[1])));
  for (const [name, { load = [], allow = [] }] of [['default', expected.default], ...Object.entries(expected.cases)]) {
    if (name !== 'default') assert.ok(cases.has(name), `${name}: no such live case`);
    for (const skill of [...load, ...allow]) assert.ok(skills.includes(skill), `${name}: unknown skill ${skill}`);
  }
});
