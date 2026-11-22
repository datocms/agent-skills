import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// The DatoCMS CLI is a consumer of this repo too. When `cma:script` rejects a script it tells the
// agent to read the `editing-records` reference of the `datocms-cma` skill, and
// `datocms agents:reference <skill> <name>` prints `skills/<skill>/references/<name>.md` as
// downloaded from the default branch (datocms CLI: lib/commands/cma/script.js and
// lib/commands/agents/reference.js). An agent that never loaded the skill reads that one file.
const CLI_REFERENCE = 'skills/datocms-cma/references/editing-records.md';
// Claude Code replaces a command's output with a 2 KB preview ("Output too large ... saved to")
// once it passes 30,000 characters, so a longer file reaches the agent as its first screen only.
// The margin leaves room for what the CLI prints around the file.
const COMMAND_OUTPUT_LIMIT = 30_000;
const MARGIN = 1_000;

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('the reference the CLI prints to agents fits one command output', () => {
  const length = read(CLI_REFERENCE).length;
  assert.ok(length <= COMMAND_OUTPUT_LIMIT - MARGIN, `${CLI_REFERENCE} is ${length} characters; keep it at ${COMMAND_OUTPUT_LIMIT - MARGIN} or less`);
});

test('the reference the CLI prints opens with what a rejected script needs', () => {
  // Agents sent here by a type error often read only the top of the file (`head -250`).
  const top = read(CLI_REFERENCE).split('\n').slice(0, 150).join('\n');
  for (const heading of ['## Workflow', '## `Schema.X` is mandatory on every typed call', '## Typing values you build up in code']) {
    assert.ok(top.includes(`\n${heading}\n`), `"${heading}" should be within the first 150 lines`);
  }
});
