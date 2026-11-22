import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// The field catalog an agent reads (skills/datocms-cma/references/field-types.md)
// against dev/tests/fixtures/field-types.json, which was taken from the API source
// (lib/dato/field_type, lib/dato/validator, lib/dato/editor). A validator or editor
// the API adds or renames must be changed in the fixture first; this test then
// says where the catalog is out of date.
const repoRoot = process.env.REFERENCE_REPO_ROOT ? resolve(process.env.REFERENCE_REPO_ROOT) : fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(resolve(repoRoot, path), 'utf8');
const catalog = JSON.parse(readFileSync(new URL('./fixtures/field-types.json', import.meta.url), 'utf8'));
const doc = read('skills/datocms-cma/references/field-types.md');

/** The `### ...` section whose heading names the field type in backticks. */
function sectionOf(fieldType) {
  const sections = doc.split(/^### /m).slice(1);
  const found = sections.filter((section) => section.split('\n')[0].includes(`\`${fieldType}\``));
  assert.equal(found.length, 1, `exactly one section for \`${fieldType}\``);
  return found[0].split(/^## /m)[0];
}
const line = (section, label) => section.split('\n').find((entry) => entry.startsWith(`- ${label}`)) ?? '';
const names = (text) => [...text.matchAll(/`([a-z_0-9]+)`/g)].map((match) => match[1]);

test('the catalog covers every field type with exactly its validators and editors', () => {
  for (const [fieldType, spec] of Object.entries(catalog.fieldTypes)) {
    const section = sectionOf(fieldType);
    const validators = line(section, 'Validators');
    const editors = line(section, 'Editor');
    assert.ok(validators, `\`${fieldType}\` needs a Validators line`);
    assert.ok(editors, `\`${fieldType}\` needs an Editor(s) line`);

    const listed = names(validators.split(/\. (?=[A-Z])/)[0]).filter((name) => name in catalog.validators);
    assert.deepEqual([...new Set(listed)].sort(), [...spec.validators].sort(), `validators of \`${fieldType}\``);
    for (const required of spec.required) {
      assert.match(validators, new RegExp(`\`${required}\` \\(\\*\\*required\\*\\*`), `\`${required}\` must be marked required on \`${fieldType}\``);
    }
    assert.equal((validators.match(/\*\*required\*\*/g) ?? []).length, spec.required.length, `only the mandatory validators of \`${fieldType}\` are marked required`);

    const editorNames = names(editors).filter((name) => name in catalog.editors);
    for (const editor of spec.editors.filter((name) => name !== fieldType)) {
      assert.ok(editorNames.includes(editor), `editor \`${editor}\` missing on \`${fieldType}\``);
    }
    const foreign = editorNames.filter((name) => !spec.editors.includes(name) && !(name in catalog.fieldTypes) && !catalog.editors[spec.editors.find((own) => catalog.editors[own].includes(name)) ?? ''] );
    assert.deepEqual(foreign.filter((name) => !spec.editors.some((own) => catalog.editors[own].includes(name))), [], `editors that do not belong to \`${fieldType}\``);
    for (const editor of spec.editors) {
      for (const parameter of catalog.editors[editor]) {
        assert.ok(editors.includes(`\`${parameter}\``), `parameter \`${parameter}\` of editor \`${editor}\` missing on \`${fieldType}\``);
      }
    }
  }
});

test('every validator has its parameters in the parameter table', () => {
  const table = doc.split('## Validator parameters')[1].split(/^## /m)[0];
  const rows = table.split('\n').filter((row) => row.startsWith('| `'));
  for (const [validator, parameters] of Object.entries(catalog.validators)) {
    const row = rows.find((entry) => entry.split('|')[1].includes(`\`${validator}\``));
    assert.ok(row, `validator \`${validator}\` missing from the parameter table`);
    for (const parameter of parameters) {
      if (/^(min|eq|max)_ar_(numerator|denominator)$/.test(parameter)) {
        assert.match(row, /`min_ar_numerator` \+ `min_ar_denominator`, `eq_ar_\*`, `max_ar_\*`/);
      } else if (parameter.startsWith('on_')) {
        assert.ok(table.includes(`\`${parameter}\``), `strategy \`${parameter}\` missing`);
      } else {
        assert.ok(row.includes(`\`${parameter}\``), `parameter \`${parameter}\` of \`${validator}\` missing`);
      }
    }
  }
  for (const [strategy, values] of Object.entries(catalog.strategies)) {
    const row = table.split('\n').find((entry) => entry.startsWith(`| \`${strategy}\``));
    assert.ok(row, `strategy \`${strategy}\` needs a row`);
    assert.deepEqual(names(row.split('|')[2]), values, `values of \`${strategy}\`, default first`);
  }
});

test('conversions, default values and value shapes agree across the references', () => {
  for (const [from, to] of catalog.typeConversions) {
    assert.ok(doc.includes(`\`${from}\`↔\`${to}\``), `conversion ${from}↔${to} missing from field-types.md`);
    assert.ok(read('skills/datocms-cma/references/schema.md').includes(`\`${from}\`↔\`${to}\``), `conversion ${from}↔${to} missing from schema.md`);
  }
  const withDefault = Object.entries(catalog.fieldTypes).filter(([, spec]) => spec.defaultValue).map(([name]) => name).sort();
  const rule = doc.split('\n').find((entry) => entry.startsWith('- **`default_value`**'));
  assert.deepEqual(names(rule.split('(else')[0]).filter((name) => name in catalog.fieldTypes).sort(), withDefault);

  const formats = read('skills/datocms-cma/references/records.md').split('## Field value formats')[1].split(/^## /m)[0];
  const listed = formats.split('\n').filter((row) => row.startsWith('| `')).flatMap((row) => names(row.split('|')[1]));
  assert.deepEqual([...new Set(listed)].sort(), Object.keys(catalog.fieldTypes).sort(), 'records.md value table lists every field type once');
});

test('the catalog stays small enough to read in one go', () => {
  assert.ok(Buffer.byteLength(doc) <= 16_000, `field-types.md is ${Buffer.byteLength(doc)} bytes`);
});
