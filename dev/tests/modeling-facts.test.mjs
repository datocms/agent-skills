import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validate } from 'datocms-structured-text-utils';

// Facts in datocms-content-modeling references checked against the installed SDK
// packages (dev/node_modules) or, for plan policy, the DatoCMS docs.
const repoRoot = process.env.REFERENCE_REPO_ROOT
  ? resolve(process.env.REFERENCE_REPO_ROOT)
  : fileURLToPath(new URL('../../', import.meta.url));
const devRoot = fileURLToPath(new URL('../', import.meta.url));
const reference = (name) => readFileSync(resolve(repoRoot, 'skills/datocms-content-modeling/references', name), 'utf8');
const sdkTypes = (path) => readFileSync(resolve(devRoot, 'node_modules/@datocms/cma-client/dist/types', path), 'utf8');
const prose = (markdown) => markdown.replace(/^```[\s\S]*?^```/gm, '');

test('publish timestamps are record meta, never example fields or ordering_field keys', () => {
  // @datocms/cma-client ItemType.ordering_meta enum: the record-meta timestamps a model sorts by without a field.
  const meta = sdkTypes('generated/ApiTypes.d.ts').match(/ordering_meta: null((?: \| '\w+')+);/)[1].match(/\w+/g);
  assert.ok(meta.includes('published_at'));
  const byField = reference('model-configuration.md').split('\n').find((line) => line.startsWith('| **By a field**'));
  const examples = [...byField.split('|').at(-2).matchAll(/`(\w+)`/g)].map((m) => m[1]);
  assert.ok(examples.length, 'ordering_field examples not found');
  assert.deepEqual(examples.filter((name) => meta.includes(name)), [], 'ordering_field example is record meta; use ordering_meta');
  const diagramFields = [...reference('content-reuse.md').matchAll(/^[\s│]*[├└]── (\w+)\s*$/gm)].map((m) => m[1]);
  assert.ok(diagramFields.includes('author'), 'fieldset diagram not found');
  assert.deepEqual(diagramFields.filter((name) => meta.includes(name)), [], 'fieldset example recreates record meta');
});

test('native DAST code attributes named in the guide pass the real validator', () => {
  const [, list] = reference('block-fields-and-structured-text.md').match(/`code` \(with ([^)]+)\)/) ?? [];
  assert.ok(list, 'code node attribute list not found');
  for (const name of list.split(',').map((s) => s.replace(/[`\s]/g, ''))) {
    const node = { type: 'code', code: 'x', [name]: name === 'language' ? 'js' : [0] };
    const result = validate({ schema: 'dast', document: { type: 'root', children: [node] } });
    assert.ok(result.valid, `${name}: ${result.message}`);
  }
});

test('record limits are plan-independent', () => {
  // docs/content-modelling/record-block-limits-and-byte-size-limits: limits "apply regardless of your
  // DatoCMS pricing plan"; support may raise them only "in exceptional cases ... after a technical evaluation".
  const row = reference('models-vs-blocks.md').split('\n').find((line) => line.startsWith('| Max record size'));
  assert.doesNotMatch(row, /higher on some plans/i);
  assert.match(row, /plan-independent/i);
});

test('rich_text size counts blocks; structured_text length caps characters, not blocks', () => {
  // @datocms/cma-client: RichTextFieldValidators.size counts items (blocks); StructuredTextFieldValidators has no count validator and its LengthValidator counts characters.
  const validators = sdkTypes('fieldTypes/structured_text.d.ts').match(/type StructuredTextFieldValidators = \{([\s\S]*?)\n\};/)[1];
  assert.deepEqual([...validators.matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1]).sort(), ['length', 'required', 'structured_text_blocks', 'structured_text_inline_blocks', 'structured_text_links']);
  assert.match(validators, /characters \*\/\s+length\?: LengthValidator/);
  assert.match(sdkTypes('fieldTypes/rich_text.d.ts'), /number of items within the specified range \*\/\s+size\?: SizeValidator/);
  const claims = prose(reference('field-configuration.md')).split('\n').filter((line) => line.includes('`length`') && line.includes('`structured_text`'));
  assert.equal(claims.length, 1, 'structured_text length guidance not found');
  assert.match(claims[0], /characters only/);
  assert.match(claims[0], /no block-count validator/);
});
