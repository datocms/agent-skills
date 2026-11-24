import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { analyse, loadSkills, readTranscript, report } from '../e2e/routing/skill-usage.mjs';

const root = mkdtempSync(join(tmpdir(), 'skill-usage-test-'));
test.after(() => rmSync(root, { recursive: true, force: true }));

const body = `# Records skill

Run one script with \`datocms cma:script\` and read the record back afterwards.

## Publishing

Publish with \`client.items.publish\` only when the user asked for it by name.
`;
const reference = `# Editing blocks

## Moving a block

Call \`moveBlockToField\` with the block and the target field of the same record.
A block keeps its identity when it moves between two fields of one record.
Never recreate a block that only has to move: its history would be lost.

## Deleting a block

Remove it with \`dropBlockFromField\` and save the parent record afterwards.
Blocks cannot be deleted on their own: the parent record owns every one of them.
The API answers \`BLOCK_STILL_REFERENCED\` when another field still holds it.
`;
const skills = join(root, 'skills');
mkdirSync(join(skills, 'datocms-records/references'), { recursive: true });
writeFileSync(join(skills, 'datocms-records/SKILL.md'), `---\nname: datocms-records\ndescription: Edit records.\n---\n\n${body}`);
writeFileSync(join(skills, 'datocms-records/references/blocks.md'), reference);
// A mirror of someone else's documentation is not guidance.
mkdirSync(join(skills, 'datocms-records/references/docs'), { recursive: true });
writeFileSync(join(skills, 'datocms-records/references/docs/Button.md'), '# Button\n\nA button the reader presses to confirm the action shown.\n');

const assistant = (...content) => JSON.stringify({ type: 'assistant', message: { content } });
const use = (id, name, input) => ({ type: 'tool_use', id, name, input });
const result = (id, content, is_error = false) => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content, is_error }] } });
const claude = join(root, 'run/case-claude');
mkdirSync(claude, { recursive: true });
writeFileSync(join(claude, 'outcome.json'), JSON.stringify({ passed: true }));
writeFileSync(join(claude, 'session.json'), JSON.stringify({ prompt: 'Move the hero block to the footer field and publish with client.items.publish.' }));
writeFileSync(join(claude, 'raw.jsonl'), [
  JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-test' }),
  assistant(use('1', 'Skill', { skill: 'datocms-records' })),
  result('1', 'Launching skill: datocms-records'),
  JSON.stringify({ type: 'user', message: { content: [{ type: 'text', text: `Base directory for this skill: /tmp/x\n\n${body}` }] } }),
  assistant(use('2', 'Bash', { command: "datocms cma:script <<'EOF'\nawait swapBlocks();\nEOF" })),
  result('2', 'Exit code 2\n\nswapBlocks is not defined', true),
  // Only the first section of the reference is printed, with grep's line numbers.
  assistant(use('3', 'Bash', { command: 'grep -n "" references/blocks.md | head -7' })),
  result('3', reference.split('\n').slice(0, 7).map((line, i) => `${i + 1}:${line}`).join('\n')),
  assistant(use('4', 'Bash', { command: "datocms cma:script <<'EOF'\nawait moveBlockToField(hero, 'footer');\nawait client.items.publish(id);\nEOF" })),
  result('4', 'done'),
].join('\n'));

const codex = join(root, 'run/case-codex');
mkdirSync(codex, { recursive: true });
const item = (value) => JSON.stringify({ type: 'item.completed', item: value });
writeFileSync(join(codex, 'session.json'), JSON.stringify({ model: 'codex-test', prompts: ['Delete the hero block.'] }));
writeFileSync(join(codex, 'native.jsonl'), [
  item({ type: 'command_execution', command: 'cat .agents/skills/datocms-records/references/blocks.md', aggregated_output: reference, exit_code: 0 }),
  // The server's own documentation names the method before the agent uses it: not an echo of the file.
  item({ type: 'mcp_tool_call', tool: 'get_api_methods', arguments: { resource: 'blocks' }, result: { content: [{ type: 'text', text: 'dropBlockFromField(block): removes a block' }] }, status: 'completed' }),
  item({ type: 'mcp_tool_call', tool: 'upsert_and_execute_unsafe_script', arguments: { body: { content: 'await dropBlockFromField(hero); // BLOCK_STILL_REFERENCED is handled' } }, result: { content: [{ type: 'text', text: '# Script executed successfully' }] }, status: 'completed' }),
].join('\n'));

const loaded = loadSkills(skills);
const run = (dir) => analyse(loaded, readTranscript(dir));

test('skill files are split into sections and mirrored docs are left out', () => {
  assert.deepEqual(loaded.map((f) => f.file).sort(), ['datocms-records/SKILL.md', 'datocms-records/references/blocks.md']);
  assert.deepEqual(loaded.find((f) => f.file.endsWith('blocks.md')).sections.map((s) => s.title), ['Moving a block', 'Deleting a block']);
});

test('a Claude transcript: what reached the agent, when, and what it used afterwards', () => {
  const r = run(claude);
  assert.equal(r.model, 'claude-test');
  assert.equal(r.firstWrite, 2);
  assert.deepEqual(r.failedSteps, [2]);
  const [skill, blocks] = r.reads;
  assert.deepEqual([skill.file, skill.via, skill.part, skill.when], ['datocms-records/SKILL.md', ['skill load'], 1, 'before']);
  // The prompt already named client.items.publish, so the skill gets no credit for it.
  assert.deepEqual(skill.echoes.map((e) => e.term), ['datocms cma:script']);
  assert.deepEqual([blocks.file, blocks.via, blocks.when, blocks.failuresBefore], ['datocms-records/references/blocks.md', ['file read'], 'afterFailure', 1]);
  assert.equal(blocks.part, 0.5);
  assert.deepEqual(blocks.sections.map((s) => s.seen), [3, 0]);
  assert.deepEqual(blocks.sections.map((s) => s.shown.length), [3, 0]);
  assert.deepEqual(blocks.echoes, [{ term: 'moveBlockToField', step: 4, section: 'Moving a block' }]);
});

test('a Codex transcript: a term another tool showed first is not an echo of the file', () => {
  const r = run(codex);
  assert.equal(r.model, 'codex-test');
  const [blocks] = r.reads;
  assert.deepEqual([blocks.file, blocks.part, blocks.when], ['datocms-records/references/blocks.md', 1, 'before']);
  assert.deepEqual(blocks.echoes.map((e) => e.term), ['BLOCK_STILL_REFERENCED']);
});

test('the report counts cases per file and lists the files nobody opened', () => {
  const text = report(loaded, [run(claude), run(codex)]);
  assert.match(text, /\| `datocms-records\/references\/blocks\.md` \| [\d.]+ KB \| 2\/2 \| 1\/1 \| file read 2 \| 75% \| 1 \| 1 \| 0 \| 2 \|/);
  assert.match(text, /\| `datocms-records\/SKILL\.md` \| [\d.]+ KB \| 1\/2 \| - \| skill load 1 \| 100% \| 1 \| 0 \| 0 \| 1 \|/);
  assert.match(text, /\| Deleting a block \| 3 \| 1 \| 1 \| `BLOCK_STILL_REFERENCED` \|/);
  assert.doesNotMatch(text, /Files no agent opened\n\n- /);
  // The Claude case saw the main file and half the reference, the Codex case the whole reference.
  assert.match(text, /Skill text shown per case: 0\.\d KB on average \(main files 0\.\d KB, references 0\.\d KB\); most in case-(claude|codex), 0\.\d KB\. Failed calls: 1 in 1 cases\./);
});
