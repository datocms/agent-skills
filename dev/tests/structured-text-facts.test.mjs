import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// REFERENCE_REPO_ROOT checks another checkout (e.g. a pre-fix baseline) instead of this one.
const repoRoot = process.env.REFERENCE_REPO_ROOT
  ? resolve(process.env.REFERENCE_REPO_ROOT)
  : fileURLToPath(new URL('../../', import.meta.url));
const skillRoot = join(repoRoot, 'skills/datocms-structured-text');
const read = (path) => readFileSync(join(skillRoot, path), 'utf8');

// Audit modeling+st-8. Agent shell calls do not share variables (each Bash/exec call is a
// fresh shell), so a random `mktemp -d` runtime is only reusable if its path is printed.
// The old snippet created the directory silently while the prose said "install once and reuse it".
test('conversion setup prints the per-task runtime path it tells agents to reuse', () => {
  const conversion = read('references/conversion.md');
  assert(!conversion.includes('then install once and reuse it'), 'old reuse claim without a way to find the runtime');
  assert.match(conversion, /install once per task; later commands reuse the printed path/);
  const fence = conversion.match(/## Local conversion helper[\s\S]*?```bash\n([\s\S]*?)```/)?.[1];
  assert(fence, 'conversion helper bash fence');
  const setup = fence.split('\n').slice(0, fence.split('\n').findIndex((line) => line.startsWith('cp ')));
  assert.match(setup[0], /mktemp -d/, 'runtime stays a private per-task directory');
  const scratch = mkdtempSync(join(tmpdir(), 'structured-text-facts-'));
  try {
    const result = spawnSync('bash', ['-euc', setup.join('\n')], { encoding: 'utf8', env: { ...process.env, TMPDIR: scratch } });
    assert.equal(result.status, 0, result.stderr);
    const printed = result.stdout.trim();
    assert(printed.startsWith(join(scratch, 'structured-text.')), `setup must print the runtime path, got ${JSON.stringify(result.stdout)}`);
    assert(statSync(printed).isDirectory());
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// Audit modeling+st-6/st-7: the converter now labels missing paths INVALID_ARGUMENTS and prints a
// bounded console summary (see dev/tests/structured-text/convert.test.mjs for behavior). The
// reference must name the summary fields the script actually emits.
test('conversion reference documents the console summary the converter emits', () => {
  const conversion = read('references/conversion.md');
  const converter = read('scripts/convert.mjs');
  for (const field of ['reportPath', 'diagnosticCounts']) {
    assert(conversion.includes(`\`${field}\``), `conversion.md mentions ${field}`);
    assert(converter.includes(field), `convert.mjs emits ${field}`);
  }
  const documented = conversion.match(/first (\d+) diagnostics/)?.[1];
  const emitted = converter.match(/const consoleLimit = (\d+);/)?.[1];
  assert(documented && emitted, 'documented and emitted console diagnostic limits');
  assert.equal(documented, emitted, 'conversion.md states the converter console limit');
  assert.match(conversion, /Missing\/invalid\/aliased file paths produce full JSON on stderr/);
});

// Audit modeling+st-9 / routing+feedback-9. OpenAI's openai.yaml spec
// (openai/skills@94fa19526eea7676eb5ecde1b9d611d9889aa624,
// skills/.system/skill-creator/references/openai_yaml.md:31) defines default_prompt as a
// "short (typically 1 sentence) example starting prompt" that names `$skill-name`. Routing
// rules live in the SKILL.md description, not in this starter prompt.
test('default_prompt is one starter sentence without routing rules', () => {
  const yaml = read('agents/openai.yaml');
  const prompt = yaml.match(/^ {2}default_prompt: "((?:[^"\\]|\\.)*)"$/m)?.[1];
  assert(prompt, 'default_prompt');
  assert(prompt.startsWith('Use $datocms-structured-text to '), prompt);
  assert.equal(prompt.match(/[.!?](\s|$)/g)?.length, 1, `one sentence: ${prompt}`);
  for (const routing of ['companion skills', 'Renderer callbacks', 'leave ordinary']) {
    assert(!prompt.includes(routing), `routing text "${routing}" belongs in the description`);
  }
});

// Audit modeling+st-11(d). The shipped converter pins datocms-structured-text-utils 6.0.0
// (scripts/package.json and package-lock.json). `npm pack` of 6.0.0 and 6.0.1 shows identical
// dist/types/validate.d.ts and dist/cjs/validate.js, so the claim holds for 6.x; citing 6.0.1
// contradicted the pin.
test('document-model validate() version citation matches the shipped utils pin', () => {
  const pinned = JSON.parse(read('scripts/package.json')).dependencies['datocms-structured-text-utils'];
  const lock = JSON.parse(read('scripts/package-lock.json'));
  assert.equal(lock.packages['node_modules/datocms-structured-text-utils'].version, pinned);
  const cited = read('references/document-model.md').match(/`validate\(\)` in utils (\S+)/)?.[1];
  assert(cited, 'validate() version citation');
  const pattern = new RegExp(`^${cited.replaceAll('.', '\\.').replace(/\\\.x$/, '\\.\\d+(?:\\.\\d+)?')}$`);
  assert.match(pinned, pattern, `utils ${cited} cited, scripts pin ${pinned}`);
});
