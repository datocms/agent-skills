import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = process.env.REFERENCE_REPO_ROOT
  ? resolve(process.env.REFERENCE_REPO_ROOT)
  : fileURLToPath(new URL('../../', import.meta.url));
const references = resolve(repoRoot, 'skills/datocms-plugin/references');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function snippets(name) {
  return [...readFileSync(resolve(references, name), 'utf8')
    .matchAll(/^```tsx?\n([\s\S]*?)^```/gm)].map((match) => match[1]);
}

function snippet(name, marker) {
  const found = snippets(name).filter((source) => source.includes(marker));
  assert.equal(found.length, 1, `one executable example for ${marker} in ${name}`);
  return found[0];
}

function javascript(source) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
    reportDiagnostics: true,
  });
  assert.deepEqual(result.diagnostics, [], 'documented code must transpile');
  return result.outputText;
}

function readHelper(name) {
  const source = snippet(name, 'function readFieldValue(');
  const parsed = ts.createSourceFile(name + '.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = parsed.statements.find((node) =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'readFieldValue');
  assert.ok(declaration);
  const read = new Function(javascript(declaration.getText(parsed)) + '\nreturn readFieldValue;')();
  // Preserve the old call signature for baseline runs so failures measure
  // value handling, rather than merely the move from an API key to metadata.
  const acceptsApiKey = declaration.parameters[1].type?.kind === ts.SyntaxKind.StringKeyword;
  return (values, field, locale) => read(values, acceptsApiKey ? field.attributes.api_key : field, locale);
}

function field(apiKey, fieldType, localized = false, modelId = 'article') {
  return {
    id: `${modelId}-${apiKey}`, type: 'field',
    attributes: { api_key: apiKey, field_type: fieldType, localized },
    relationships: { item_type: { data: { id: modelId, type: 'item_type' } } },
  };
}

for (const name of ['form-values.md', 'sidebar-panels.md', 'dropdown-actions.md']) {
  test(`${name}: metadata distinguishes localized fields from ordinary object values`, () => {
    const read = readHelper(name);
    const cases = [
      ['string', 'Plain title'], ['integer', 0], ['boolean', false],
      ['file', { upload_id: 'image', alt: 'Keep alt', custom_data: { en: 'Not a locale wrapper' } }],
      ['seo', { title: 'Search title', description: 'Keep description', image: 'image' }],
      ['color', { red: 5, green: 10, blue: 20, alpha: 1 }],
      ['lat_lon', { latitude: 43.4, longitude: 11.9 }],
      ['single_block', { itemId: 'block', itemTypeId: 'hero', heading: 'Keep heading', en: 'Block field named en' }],
      ['rich_text', [{ itemId: 'block', itemTypeId: 'hero', heading: 'Keep heading' }]],
    ];
    for (const [type, value] of cases) {
      const unchanged = structuredClone(value);
      assert.strictEqual(read({ value }, field('value', type), 'en'), value, `${type} must keep its unlocalized value`);
      assert.strictEqual(read({ value: { en: value, it: null } }, field('value', type, true), 'en'), value);
      assert.equal(read({ value: { en: value, it: null } }, field('value', type, true), 'it'), null);
      assert.deepEqual(value, unchanged, `${type} reads must not mutate content`);
    }
    assert.equal(read({ value: null }, field('value', 'file'), 'en'), null);
    for (const raw of [undefined, null, {}]) {
      assert.equal(read({ value: raw }, field('value', 'file', true), 'it'), undefined);
    }
  });
}

function host(fields, values, locale = 'en') {
  const ctx = {
    itemType: { id: 'article' }, locale, formValues: structuredClone(values), writes: [],
    async loadItemTypeFields(modelId) {
      assert.equal(modelId, 'article');
      return fields;
    },
    async setFieldValue(path, value) {
      ctx.writes.push({ path, value: structuredClone(value) });
      const keys = path.split('.');
      let target = ctx.formValues;
      for (const key of keys.slice(0, -1)) target = target[key];
      target[keys.at(-1)] = structuredClone(value);
    },
    notice() {},
  };
  return ctx;
}

test('single-block examples edit, create and clear one object while preserving other content', async () => {
  const read = readHelper('form-values.md');
  const edit = snippet('form-values.md', 'const heroField =');
  const create = snippet('form-values.md', "heading: 'New hero'");
  const clear = snippet('form-values.md', 'ctx.setFieldValue(heroPath, null)');
  const editBlock = new AsyncFunction('ctx', 'readFieldValue', javascript(edit) + '\nreturn heroPath;');
  for (const localized of [false, true]) {
    const original = {
      itemId: 'existing-block', itemTypeId: '810886', heading: 'Original heading',
      image: { upload_id: 'existing-image', alt: 'Keep alt' },
      links: [{ label: 'Keep link', url: '/original' }],
    };
    const italian = { ...original, itemId: 'italian-block', heading: 'Italiano' };
    const ctx = host([field('hero', 'single_block', localized)], {
      hero: localized ? { en: original, it: italian } : original,
      note: 'Untouched note',
    });
    const path = await editBlock(ctx, read);
    assert.deepEqual(ctx.writes, [{
      path: localized ? 'hero.en' : 'hero',
      value: { ...original, heading: 'Updated heading' },
    }]);
    assert.equal(ctx.formValues.note, 'Untouched note');
    if (localized) assert.deepEqual(ctx.formValues.hero.it, italian);

    await new AsyncFunction('ctx', 'heroPath', javascript(clear))(ctx, path);
    assert.deepEqual(ctx.writes.at(-1), { path, value: null });
    await new AsyncFunction('ctx', 'heroPath', javascript(create))(ctx, path);
    assert.deepEqual(ctx.writes.at(-1), {
      path, value: { itemTypeId: '810886', heading: 'New hero' },
    });
    assert.equal(ctx.formValues.note, 'Untouched note');
    if (localized) assert.deepEqual(ctx.formValues.hero.it, italian);

    const empty = host([field('hero', 'single_block', localized)], {
      hero: localized ? { en: null, it: italian } : null,
    });
    await editBlock(empty, read);
    assert.deepEqual(empty.writes, [], 'editing an empty slot must not fabricate a block');
  }
});

test('dropdown example reads and writes the selected locale without replacing sibling locales', async () => {
  let hooks;
  new Function('connect', 'exports', javascript(snippet('dropdown-actions.md', 'function readFieldValue(')))(
    (value) => { hooks = value; }, {},
  );
  for (const localized of [false, true]) {
    const ctx = host([field('title', 'string', localized), field('slug', 'slug', localized)], {
      title: localized ? { en: 'English sentinel', it: 'Nuovo Titolo' } : 'Nuovo Titolo',
      slug: localized ? { en: 'english-sentinel', it: 'old' } : 'old',
      note: 'Untouched note',
    }, 'it');
    await hooks.executeItemFormDropdownAction('auto-slug', ctx);
    assert.deepEqual(ctx.writes, [{ path: localized ? 'slug.it' : 'slug', value: 'nuovo-titolo' }]);
    if (localized) assert.equal(ctx.formValues.slug.en, 'english-sentinel');
    assert.equal(ctx.formValues.note, 'Untouched note');
  }
});

const fixture = fileURLToPath(new URL('../e2e/catalog/plugin', import.meta.url));
test('updated examples typecheck against the installed plugin SDK and React UI', {
  skip: !existsSync(resolve(fixture, 'node_modules/datocms-plugin-sdk/package.json')) &&
    'plugin fixture not installed: npm ci --prefix dev/e2e/catalog/plugin',
}, () => {
  const files = new Map([
    [resolve(fixture, '__form-values-reader.ts'), snippet('form-values.md', 'function readFieldValue(')],
    [resolve(fixture, '__form-values-panel.tsx'), snippet('sidebar-panels.md', 'function readFieldValue(')],
    [resolve(fixture, '__form-values-action.tsx'), "import { connect } from 'datocms-plugin-sdk';\n" + snippet('dropdown-actions.md', 'function readFieldValue(')],
    [resolve(fixture, '__form-values-block.ts'), [
      "import type { RenderItemFormSidebarPanelCtx } from 'datocms-plugin-sdk';",
      'declare const ctx: RenderItemFormSidebarPanelCtx;',
      snippet('form-values.md', 'function readFieldValue('),
      snippet('form-values.md', 'const heroField ='),
      snippet('form-values.md', "heading: 'New hero'"),
      snippet('form-values.md', 'ctx.setFieldValue(heroPath, null)'),
    ].join('\n')],
  ]);
  const options = {
    strict: true, noEmit: true, skipLibCheck: true,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX,
  };
  const compiler = ts.createCompilerHost(options);
  const getSourceFile = compiler.getSourceFile.bind(compiler);
  compiler.getSourceFile = (path, ...args) => files.has(path)
    ? ts.createSourceFile(path, files.get(path), ts.ScriptTarget.Latest, true)
    : getSourceFile(path, ...args);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([...files.keys()], options, compiler));
  assert.deepEqual(diagnostics.map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), []);
});
