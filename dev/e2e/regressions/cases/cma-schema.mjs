import assert from 'node:assert/strict';
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { ApiError, buildClient } from '@datocms/cma-client-node';

// Allowed values per @datocms/cma-client validators (item_item_type.ts etc.) and the CMA hyperschema.
const STRATEGIES = {
  on_publish_with_unpublished_references_strategy: ['fail', 'publish_references'],
  on_reference_unpublish_strategy: ['fail', 'unpublish', 'delete_references'],
  on_reference_delete_strategy: ['fail', 'delete_references'],
};
const LINK_RULES = ['item_item_type', 'items_item_type', 'structured_text_links'];

function setup(workspace, { root }) {
  const oracle = join(workspace, '..', 'oracle'), environment = {};
  for (const [key, dir] of [['HOME', 'home'], ['XDG_CONFIG_HOME', 'config'], ['XDG_DATA_HOME', 'data'], ['XDG_CACHE_HOME', 'cache']])
    mkdirSync((environment[key] = join(oracle, dir)), { recursive: true });
  symlinkSync(join(root, 'node_modules'), join(workspace, 'node_modules'));
  writeFileSync(join(workspace, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: { '@datocms/cma-client-node': '6.1.3' }, devDependencies: { typescript: '5.9.3' } }, null, 2));
  writeFileSync(join(workspace, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true, skipLibCheck: true } }, null, 2));
  return { environment };
}

async function load(workspace, directory, file) {
  const outfile = join(directory, 'evaluated', file.replace(/\.ts$/, '.mjs'));
  await build({ entryPoints: [join(workspace, file)], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent' });
  return (await import(pathToFileURL(outfile).href + '?t=' + Date.now())).default;
}

// Real SDK client; only the HTTP boundary is emulated (schema endpoints, API validation, list positioning).
function schemaApi(models, fieldsets, fields) {
  const state = { fields: structuredClone(fields), fieldsets: structuredClone(fieldsets), log: [] };
  const client = buildClient({ apiToken: 'synthetic-not-used' });
  const reject = ({ method, url, body }, status, code, details = {}) => {
    throw new ApiError({ request: { method, url, headers: {}, body }, response: { status, statusText: status === 404 ? 'Not Found' : 'Unprocessable Entity', headers: {}, body: { data: [{ id: 'error', type: 'api_error', attributes: { code, doc_url: '', details } }] } } });
  };
  const model = (id) => models.find((m) => m.id === id || m.api_key === id);
  const rawField = (f) => ({ id: f.id, type: 'field', attributes: { label: f.label, api_key: f.api_key, field_type: f.field_type, localized: !!f.localized, validators: f.validators ?? {}, appearance: f.appearance ?? { editor: 'default', parameters: {}, addons: [] }, position: f.position, hint: f.hint ?? null, default_value: f.default_value ?? null, deep_filtering_enabled: false }, relationships: { item_type: { data: { id: f.item_type, type: 'item_type' } }, fieldset: { data: f.fieldset ? { id: f.fieldset, type: 'fieldset' } : null } } });
  const rawFieldset = (s) => ({ id: s.id, type: 'fieldset', attributes: { title: s.title, hint: null, position: s.position, collapsible: false, start_collapsed: false }, relationships: { item_type: { data: { id: s.item_type, type: 'item_type' } } } });
  const rawModel = (m) => ({ id: m.id, type: 'item_type', attributes: { name: m.name, api_key: m.api_key, modular_block: false }, relationships: { fields: { data: state.fields.filter((f) => f.item_type === m.id).map((f) => ({ id: f.id, type: 'field' })) }, fieldsets: { data: state.fieldsets.filter((s) => s.item_type === m.id).map((s) => ({ id: s.id, type: 'fieldset' })) } } });
  const validate = (request, field) => {
    const v = field.validators ?? {}, rule = { link: 'item_item_type', links: 'items_item_type' }[field.field_type];
    if (rule && !(Array.isArray(v[rule]?.item_types) && v[rule].item_types.every(model)))
      reject(request, 422, 'INVALID_FIELD', { field: `validators.${rule}`, code: 'VALIDATION_INVALID' });
    for (const r of LINK_RULES) for (const [name, allowed] of Object.entries(STRATEGIES))
      if (v[r]?.[name] !== undefined && !allowed.includes(v[r][name]))
        reject(request, 422, 'INVALID_FIELD', { field: `validators.${r}.${name}`, code: 'VALIDATION_INCLUSION' });
    if (field.fieldset && !state.fieldsets.some((s) => s.id === field.fieldset && s.item_type === field.item_type))
      reject(request, 422, 'INVALID_FIELD', { field: 'fieldset', code: 'VALIDATION_INVALID' });
  };
  // Positions are per container (model top level or fieldset); explicit positions shift later siblings, none appends.
  const place = (field, position) => {
    const siblings = state.fields.filter((f) => f !== field && f.item_type === field.item_type && f.fieldset === field.fieldset);
    if (position == null) position = Math.max(-1, ...siblings.map((f) => f.position)) + 1;
    else for (const f of siblings) if (f.position >= position) f.position++;
    field.position = position;
  };
  client.request = async (request) => {
    const { method, url, body } = request, path = url.split('?')[0];
    state.log.push(`${method} ${path}`);
    let m;
    if (method === 'GET' && path === '/item-types') return { data: models.map(rawModel) };
    if ((m = path.match(/^\/item-types\/([^/]+)$/)) && method === 'GET') return { data: rawModel(model(m[1]) ?? reject(request, 404, 'NOT_FOUND')) };
    if ((m = path.match(/^\/item-types\/([^/]+)\/fieldsets$/)) && method === 'GET') return { data: state.fieldsets.filter((s) => s.item_type === model(m[1])?.id).map(rawFieldset) };
    if ((m = path.match(/^\/fieldsets\/([^/]+)$/)) && method === 'GET') return { data: rawFieldset(state.fieldsets.find((s) => s.id === m[1]) ?? reject(request, 404, 'NOT_FOUND')) };
    if ((m = path.match(/^\/item-types\/([^/]+)\/fields$/))) {
      const owner = model(m[1]) ?? reject(request, 404, 'NOT_FOUND');
      if (method === 'GET') return { data: state.fields.filter((f) => f.item_type === owner.id).map(rawField) };
      if (method === 'POST') {
        const { attributes: a = {}, relationships: r = {} } = body.data;
        for (const k of ['label', 'api_key', 'field_type']) if (!a[k]) reject(request, 422, 'INVALID_FIELD', { field: k, code: 'VALIDATION_REQUIRED' });
        if (state.fields.some((f) => f.item_type === owner.id && f.api_key === a.api_key)) reject(request, 422, 'INVALID_FIELD', { field: 'api_key', code: 'VALIDATION_UNIQUENESS' });
        const { position, ...attributes } = a;
        const field = { ...attributes, id: `new-field-${state.fields.length + 1}`, item_type: owner.id, fieldset: r.fieldset?.data?.id ?? null, created: true };
        validate(request, field);
        place(field, position);
        state.fields.push(field);
        return { data: rawField(field) };
      }
    }
    if ((m = path.match(/^\/fields\/([^/]+)$/))) {
      const field = state.fields.find((f) => f.id === m[1]) ?? reject(request, 404, 'NOT_FOUND');
      if (method === 'GET') return { data: rawField(field) };
      if (method === 'PUT') {
        const { attributes: { position, ...a } = {}, relationships: r = {} } = body.data;
        const next = { ...field, ...a, ...('fieldset' in r ? { fieldset: r.fieldset.data?.id ?? null } : {}) };
        validate(request, next);
        const moved = next.fieldset !== field.fieldset;
        Object.assign(field, next);
        if (position !== undefined || moved) place(field, position);
        return { data: rawField(field) };
      }
    }
    if ((m = path.match(/^\/fieldsets\/([^/]+)$/)) && method === 'PUT') {
      const fieldset = state.fieldsets.find((s) => s.id === m[1]) ?? reject(request, 404, 'NOT_FOUND');
      Object.assign(fieldset, body.data.attributes ?? {});
      return { data: rawFieldset(fieldset) };
    }
    if ((m = path.match(/^\/item-types\/([^/]+)\/reorder-fields-and-fieldsets$/)) && method === 'POST') {
      // Private raw endpoint exists; hyperschema requires JSON:API entries: { id, type, attributes: { position }, relationships: { fieldset } (fields only) }.
      const keys = (o) => Object.keys(o ?? {}).sort().join();
      if (!Array.isArray(body?.data) || !body.data.every((e) => keys(e) === (e.type === 'field' ? 'attributes,id,relationships,type' : 'attributes,id,type') && keys(e.attributes) === 'position' && (e.type !== 'field' || keys(e.relationships) === 'fieldset')))
        reject(request, 422, 'INVALID_FORMAT', { messages: ['Body does not match ItemTypeReorderFieldsAndFieldsetsSchema'] });
      const touched = body.data.map((e) => {
        const target = (e.type === 'field' ? state.fields : state.fieldsets).find((x) => x.id === e.id) ?? reject(request, 404, 'NOT_FOUND');
        target.position = e.attributes.position;
        if (e.type === 'field') target.fieldset = e.relationships?.fieldset?.data?.id ?? null;
        return e.type === 'field' ? rawField(target) : rawFieldset(target);
      });
      return { data: touched };
    }
    throw new Error(`Unexpected request ${method} ${url}`);
  };
  return { client, state, rawField };
}

// What happens to referring records when a linked record is deleted (API default: delete_references).
const onDelete = (field, rule) => ((field.validators[rule].on_reference_delete_strategy ?? 'delete_references') === 'fail' ? 'blocked' : 'unlinked');

async function run(workspace, directory, file, fixture, args) {
  const api = schemaApi(...fixture);
  await (await load(workspace, directory, file))(api.client, ...args);
  const created = api.state.fields.filter((f) => f.created);
  assert.equal(created.length, 1, 'Exactly one new field must be created');
  const originals = fixture[2].map((f) => api.state.fields.find((x) => x.id === f.id));
  assert.deepEqual(originals.map((f) => f.fieldset), fixture[2].map((f) => f.fieldset), 'Existing fields changed fieldset');
  return { ...api, field: created[0], originals };
}

const product = [
  [{ id: 'model-product', name: 'Product', api_key: 'product' }, { id: 'model-category', name: 'Category', api_key: 'category' }],
  [{ id: 'fieldset-details', item_type: 'model-product', title: 'Details', position: 1 }, { id: 'fieldset-seo', item_type: 'model-product', title: 'SEO', position: 2 }],
  [
    { id: 'field-name', item_type: 'model-product', label: 'Name', api_key: 'name', field_type: 'string', validators: { required: {} }, fieldset: null, position: 0 },
    { id: 'field-sku', item_type: 'model-product', label: 'SKU', api_key: 'sku', field_type: 'string', validators: {}, fieldset: 'fieldset-details', position: 3 },
    { id: 'field-price', item_type: 'model-product', label: 'Price', api_key: 'price', field_type: 'float', validators: {}, fieldset: 'fieldset-details', position: 4 },
    { id: 'field-meta', item_type: 'model-product', label: 'Meta', api_key: 'meta', field_type: 'seo', validators: {}, fieldset: 'fieldset-seo', position: 0 },
    { id: 'field-category-name', item_type: 'model-category', label: 'Name', api_key: 'name', field_type: 'string', validators: {}, fieldset: null, position: 0 },
  ],
];
const article = [
  [{ id: 'model-article', name: 'Article', api_key: 'article' }, { id: 'model-tag', name: 'Tag', api_key: 'tag' }],
  [],
  [
    { id: 'field-title', item_type: 'model-article', label: 'Title', api_key: 'title', field_type: 'string', validators: { required: {} }, fieldset: null, position: 0 },
    { id: 'field-body', item_type: 'model-article', label: 'Body', api_key: 'body', field_type: 'text', validators: {}, fieldset: null, position: 1 },
    { id: 'field-tag-name', item_type: 'model-tag', label: 'Name', api_key: 'name', field_type: 'string', validators: {}, fieldset: null, position: 0 },
  ],
];

const categoryControl = (validator, ordering) => `import type { Client } from '@datocms/cma-client-node';

export default async function addCategoryLink(client: Client, productModelId: string, categoryModelId: string, fieldsetId: string) {
  const field = await client.fields.create(productModelId, {
    label: 'Category',
    api_key: 'category',
    field_type: 'link',
    validators: { item_item_type: { item_types: [categoryModelId], ${validator} } },
    fieldset: { id: fieldsetId, type: 'fieldset' },
  });
  ${ordering}
}
`;
const updatePosition = `await client.fields.update(field.id, { position: 0, fieldset: { id: fieldsetId, type: 'fieldset' } });`;
const tagsControl = (validator) => `import type { Client } from '@datocms/cma-client-node';

export default async function addTagsField(client: Client, articleModelId: string, tagModelId: string) {
  await client.fields.create(articleModelId, {
    label: 'Tags',
    api_key: 'tags',
    field_type: 'links',
    validators: { items_item_type: { item_types: [tagModelId]${validator} } },
  });
}
`;

const noLive = 'Dependencies are already installed. There is no live DatoCMS project or API token here, so do not run it against DatoCMS.';

export default [
  {
    id: 'cma-link-delete-blocked',
    guards: ['skills/datocms-cma/references/schema.md', 'skills/datocms-content-modeling/references/taxonomy-classification.md'],
    prompt: `In this TypeScript project, create add-category-link.ts with a default-exported async function (client, productModelId, categoryModelId, fieldsetId), where client is a CMA client from @datocms/cma-client-node. It must add an optional single-record link field to the Product model (label "Category", API key "category") that accepts only Category records. Categories drive our storefront navigation, so nobody may delete a category while any product still links to it. The new field must appear first inside the existing fieldset fieldsetId, above the fields already there; leave the other fields where they are. ${noLive}`,
    setup,
    async check(workspace, { directory }) {
      const { field, state, originals, rawField } = await run(workspace, directory, 'add-category-link.ts', product, ['model-product', 'model-category', 'fieldset-details']);
      assert.equal(field.item_type, 'model-product');
      assert.equal(field.api_key, 'category');
      assert.equal(field.field_type, 'link');
      assert.deepEqual(field.validators.item_item_type.item_types, ['model-category']);
      assert.ok(!field.validators.required, 'Category must stay optional');
      assert.equal(onDelete(field, 'item_item_type'), 'blocked', 'Deleting a category still linked from products would succeed');
      assert.equal(field.fieldset, 'fieldset-details', 'Field is not in the requested fieldset');
      const siblings = state.fields.filter((f) => f !== field && f.item_type === field.item_type && f.fieldset === field.fieldset);
      assert.ok(siblings.every((f) => field.position < f.position), 'Field is not first in the fieldset');
      const [sku, price] = originals.filter((f) => f.fieldset === 'fieldset-details');
      assert.ok(sku.position < price.position, 'Existing fields were reordered');
      return { field: rawField(field), fieldsetOrder: [field, ...siblings].sort((a, b) => a.position - b.position).map((f) => f.api_key), requests: state.log };
    },
    controls: {
      pass: { files: { 'add-category-link.ts': categoryControl(`on_reference_delete_strategy: 'fail'`, updatePosition) } },
      fail: [
        { name: 'reorder-fields-and-fieldsets', files: { 'add-category-link.ts': categoryControl(`on_reference_delete_strategy: 'fail'`, `await client.itemTypes.reorderFieldsAndFieldsets(productModelId, { data: [{ id: field.id, type: 'field', position: 0, fieldset: { id: fieldsetId, type: 'fieldset' } }] });`) } },
        { name: 'raw-reorder-flat-body', files: { 'add-category-link.ts': categoryControl(`on_reference_delete_strategy: 'fail'`, `await client.itemTypes.rawReorderFieldsAndFieldsets(productModelId, { data: [{ id: field.id, type: 'field', position: 0, fieldset: { id: fieldsetId, type: 'fieldset' } }] } as any);`) } },
        { name: 'set-to-null', files: { 'add-category-link.ts': categoryControl(`on_reference_delete_strategy: 'set_to_null'`, updatePosition) } },
      ],
    },
  },
  {
    id: 'cma-link-delete-drops-reference',
    guards: ['skills/datocms-cma/references/schema.md', 'skills/datocms-content-modeling/references/taxonomy-classification.md'],
    prompt: `In this TypeScript project, create add-tags-field.ts with a default-exported async function (client, articleModelId, tagModelId), where client is a CMA client from @datocms/cma-client-node. It must add an optional multiple-records link field to the Article model (label "Tags", API key "tags") that accepts only Tag records. Editors prune tags often: deleting a tag must always go through, even when articles use it, and the tag should simply disappear from those articles while the articles themselves stay. ${noLive}`,
    setup,
    async check(workspace, { directory }) {
      const { field, state, rawField } = await run(workspace, directory, 'add-tags-field.ts', article, ['model-article', 'model-tag']);
      assert.equal(field.item_type, 'model-article');
      assert.equal(field.api_key, 'tags');
      assert.equal(field.field_type, 'links');
      assert.deepEqual(field.validators.items_item_type.item_types, ['model-tag']);
      assert.ok(!field.validators.required && !(field.validators.size?.min > 0), 'Tags must stay optional');
      assert.equal(onDelete(field, 'items_item_type'), 'unlinked', 'Deleting a tag used by articles would be blocked');
      return { field: rawField(field), requests: state.log };
    },
    controls: {
      pass: { files: { 'add-tags-field.ts': tagsControl(`, on_reference_delete_strategy: 'delete_references'`) } },
      fail: [
        { name: 'set-to-null', files: { 'add-tags-field.ts': tagsControl(`, on_reference_delete_strategy: 'set_to_null'`) } },
        { name: 'fail-strategy', files: { 'add-tags-field.ts': tagsControl(`, on_reference_delete_strategy: 'fail'`) } },
      ],
    },
  },
];
