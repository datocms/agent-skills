// Builds the prompt for one run of the knowledge eval.
//
//   node dev/evals/knowledge/prompt.mjs --out <run dir> [--skills-root <dir with skills/>]
//     [--arm skills|none] [--areas fields,blocks] [--chunk 1/4]
//
// `--arm skills` (default) tells the agent which skills are installed under
// <skills-root>/skills, by name and description, as an agent's skill listing
// does. `--arm none` asks for answers from the model's own knowledge.
// `--chunk i/n` keeps every n-th question starting from the i-th, so each chunk
// mixes areas and no chunk can answer everything from one file.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkQuestions, loadQuestions } from './grade.mjs';

export function skillListing(skillsRoot) {
  const dir = resolve(skillsRoot, 'skills');
  return readdirSync(dir)
    .sort()
    .map((name) => {
      const text = readFileSync(resolve(dir, name, 'SKILL.md'), 'utf8');
      const frontmatter = text.split('\n---\n')[0];
      const description = frontmatter
        .match(/^description: >-?\n((?:  .*\n?)*)/m)?.[1]
        ?.split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join(' ');
      if (!description) throw new Error(`No description in ${name}/SKILL.md`);
      return `- ${name}: ${description}`;
    })
    .join('\n');
}

export function selectQuestions(questions, { areas, chunk }) {
  let selected = areas ? questions.filter((question) => areas.includes(question.area)) : questions;
  if (chunk) {
    const [index, count] = chunk.split('/').map(Number);
    if (!(index >= 1 && index <= count)) throw new Error(`Bad --chunk ${chunk}`);
    selected = selected.filter((_, position) => position % count === index - 1);
  }
  return selected;
}

export function buildPrompt({ arm, skillsRoot, out, questions }) {
  const sources =
    arm === 'none'
      ? [
          'Answer from your own knowledge. Do not read files, search the web, or use any tool other than writing the answers file.',
        ]
      : [
          `You have DatoCMS skills installed at ${resolve(skillsRoot, 'skills')}. Each skill is a folder with a SKILL.md and reference files. The list below is your skill listing: open a skill's SKILL.md when its description fits the question, then follow it to the reference files it points to.`,
          '',
          `Your only sources are your own knowledge and the files under that folder. Do not use the Skill tool, the web, MCP tools, the datocms CLI, or any file outside that folder. Work as you normally would: read only what you need.`,
          '',
          'Installed skills:',
          skillListing(skillsRoot),
        ];
  const outputs =
    arm === 'none'
      ? [`Write your answers to ${resolve(out, 'answers.json')} as one JSON object: {"<id>": "<answer>"}.`]
      : [
          `Write your answers to ${resolve(out, 'answers.json')} as one JSON object: {"<id>": "<answer>"}.`,
          `Also write ${resolve(out, 'reads.json')}: a JSON array of the file paths you read, in order (repeat a path you read more than once).`,
        ];
  return [
    'You are a coding agent helping a developer who works with DatoCMS.',
    '',
    ...sources,
    '',
    'Answer the questions below. Give a short, precise answer to each, with the exact identifiers and values it asks for (API keys, editor names, parameter names, error codes). If you are not sure, write what you believe is true; do not leave an answer blank.',
    '',
    ...outputs,
    '',
    'Questions:',
    ...questions.map((question, index) => `${index + 1}. [${question.id}] ${question.question}`),
    '',
  ].join('\n');
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const out = option('--out');
  if (!out) throw new Error('Usage: prompt.mjs --out <run dir> [--skills-root <dir>] [--arm skills|none] [--areas a,b] [--chunk i/n]');
  const arm = option('--arm') ?? 'skills';
  const skillsRoot = option('--skills-root') ?? resolve(import.meta.dirname, '../../..');
  const questions = selectQuestions(checkQuestions(loadQuestions()), {
    areas: option('--areas')?.split(','),
    chunk: option('--chunk'),
  });
  mkdirSync(resolve(out), { recursive: true });
  const prompt = buildPrompt({ arm, skillsRoot, out, questions });
  writeFileSync(resolve(out, 'prompt.md'), prompt);
  writeFileSync(resolve(out, 'questions.json'), `${JSON.stringify(questions.map((question) => question.id), null, 2)}\n`);
  console.log(`${questions.length} questions -> ${resolve(out, 'prompt.md')}`);
}
