import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkQuestions, grade, gradeAnswer, loadQuestions } from '../evals/knowledge/grade.mjs';
import { selectQuestions } from '../evals/knowledge/prompt.mjs';
import { cases } from '../evals/tasks/cases.mjs';
import { checkSolution, prepareWorkspace } from '../evals/tasks/run.mjs';

// The evals in dev/evals judge agents; these tests judge the evals, with no model.

test('every knowledge question has a key, a source and a way to grade it', () => {
  const questions = checkQuestions(loadQuestions());
  assert.ok(questions.length >= 100);
  for (const question of questions) {
    assert.match(question.source, /\S+\.(rb|ts|md|json|mjs)|^https:\/\//, `${question.id}: source must name a file or a URL`);
    assert.ok(!/datocms-[a-z-]+ skill|SKILL\.md/.test(question.question), `${question.id}: a question must not name a skill`);
  }
});

test('grading needs every pattern, no forbidden pattern, and the judge when there is a criterion', () => {
  const question = { id: 'q', area: 'a', all: ['items_item_type', 'item_types'], none: ['numeric'], judge: 'criterion' };
  assert.equal(gradeAnswer(question, 'items_item_type with item_types', true).passed, true);
  assert.equal(gradeAnswer(question, 'items_item_type with item_types').pendingJudge, true);
  assert.equal(gradeAnswer(question, 'items_item_type with item_types', false).passed, false);
  assert.equal(gradeAnswer(question, 'items_item_type only', true).passed, false);
  assert.equal(gradeAnswer(question, 'items_item_type item_types numeric', true).passed, false);
  assert.equal(gradeAnswer(question, undefined, true).passed, false);
  const result = grade([question, { id: 'r', area: 'a', all: ['x'] }], { q: 'items_item_type item_types', r: 'x' }, { q: true });
  assert.deepEqual([result.passed, result.total, result.failed], [2, 2, []]);
});

test('chunks split the questions without losing or repeating any', () => {
  const questions = loadQuestions();
  const chunks = [1, 2, 3, 4].flatMap((index) => selectQuestions(questions, { chunk: `${index}/4` }).map((question) => question.id));
  assert.deepEqual([...chunks].sort(), questions.map((question) => question.id).sort());
});

test('task evals: reference solutions pass and each classic mistake fails', async () => {
  const tasks = fileURLToPath(new URL('../evals/tasks/', import.meta.url));
  const workspace = mkdtempSync(join(tmpdir(), 'task-evals-'));
  try {
    await prepareWorkspace(workspace);
    const covered = new Set();
    for (const [folder, expected] of [['solutions', true], ['controls', false]]) {
      for (const file of readdirSync(join(tasks, folder)).filter((name) => name.endsWith('.ts')).sort()) {
        const testCase = cases.find((entry) => entry.id === file.replace(/(\.[\w-]+)?\.ts$/, ''));
        assert.ok(testCase, `${folder}/${file} names no case`);
        cpSync(join(tasks, folder, file), join(workspace, 'solution.ts'));
        const result = await checkSolution(testCase, workspace);
        assert.equal(result.passed, expected, `${folder}/${file}: ${result.error ?? 'passed'}`);
        if (expected) {
          assert.equal(result.typecheck, 'ok', `${folder}/${file} must type-check`);
          covered.add(testCase.id);
        }
      }
    }
    assert.deepEqual([...covered].sort(), cases.map((entry) => entry.id).sort(), 'every case needs a reference solution');
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
