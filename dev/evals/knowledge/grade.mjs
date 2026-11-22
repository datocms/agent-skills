// Grades one run of the knowledge eval.
//
//   node dev/evals/knowledge/grade.mjs --answers <answers.json> [--verdicts <verdicts.json>] [--out <result.json>]
//
// answers.json: { "<question id>": "<answer text>" }
// verdicts.json: { "<question id>": true | false }, the judge's verdict for the
// questions that carry a `judge` criterion.
//
// A question passes when every `all` pattern matches the answer, no `none`
// pattern matches, and its `judge` criterion (when it has one) got a true
// verdict. Patterns are case-insensitive regular expressions.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const questionsDir = resolve(import.meta.dirname, 'questions');

export function loadQuestions(dir = questionsDir) {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .flatMap((file) =>
      JSON.parse(readFileSync(resolve(dir, file), 'utf8')).map((question) => ({
        ...question,
        area: file.replace(/\.json$/, ''),
      })),
    );
}

export function checkQuestions(questions) {
  const seen = new Set();
  for (const question of questions) {
    if (!question.id || seen.has(question.id)) throw new Error(`Missing or repeated id: ${question.id}`);
    seen.add(question.id);
    if (!question.question || !question.key || !question.source) {
      throw new Error(`${question.id}: question, key and source are required`);
    }
    if (!question.all?.length && !question.judge) {
      throw new Error(`${question.id}: needs \`all\` patterns or a \`judge\` criterion`);
    }
    for (const pattern of [...(question.all ?? []), ...(question.none ?? [])]) new RegExp(pattern, 'i');
  }
  return questions;
}

export function gradeAnswer(question, answer, verdict) {
  const text = typeof answer === 'string' ? answer : '';
  const missing = (question.all ?? []).filter((pattern) => !new RegExp(pattern, 'i').test(text));
  const forbidden = (question.none ?? []).filter((pattern) => new RegExp(pattern, 'i').test(text));
  const patternsPass = missing.length === 0 && forbidden.length === 0;
  const needsJudge = Boolean(question.judge) && patternsPass && text !== '';
  const judged = needsJudge ? verdict : undefined;
  return {
    id: question.id,
    area: question.area,
    answered: text !== '',
    missing,
    forbidden,
    pendingJudge: needsJudge && typeof judged !== 'boolean',
    passed: patternsPass && text !== '' && (!question.judge || judged === true),
  };
}

export function grade(questions, answers, verdicts = {}) {
  const rows = questions.map((question) => gradeAnswer(question, answers[question.id], verdicts[question.id]));
  const byArea = {};
  for (const row of rows) {
    const area = (byArea[row.area] ??= { total: 0, passed: 0 });
    area.total += 1;
    if (row.passed) area.passed += 1;
  }
  return {
    total: rows.length,
    passed: rows.filter((row) => row.passed).length,
    pendingJudge: rows.filter((row) => row.pendingJudge).map((row) => row.id),
    byArea,
    failed: rows.filter((row) => !row.passed && !row.pendingJudge).map((row) => row.id),
    rows,
  };
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const answersPath = option('--answers');
  if (!answersPath) throw new Error('Usage: grade.mjs --answers <answers.json> [--verdicts <verdicts.json>] [--out <result.json>]');
  const read = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
  const only = option('--areas')?.split(',');
  const questions = checkQuestions(loadQuestions()).filter((question) => !only || only.includes(question.area));
  const answers = read(answersPath);
  const result = grade(questions, answers, option('--verdicts') ? read(option('--verdicts')) : {});
  if (option('--out')) writeFileSync(resolve(option('--out')), `${JSON.stringify(result, null, 2)}\n`);
  if (option('--pending')) {
    const pending = questions
      .filter((question) => result.pendingJudge.includes(question.id))
      .map(({ id, question, judge }) => ({ id, question, criterion: judge, answer: answers[id] }));
    writeFileSync(resolve(option('--pending')), `${JSON.stringify(pending, null, 2)}\n`);
  }
  const { rows, ...summary } = result;
  console.log(JSON.stringify(summary, null, 2));
}
