import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { buildClient } from '@datocms/cma-client-node';
import { validate } from 'datocms-structured-text-utils';

// Documented CMA values (content-management-api/resources/field.md and item-type.md).
const FIELD_TYPES = ['boolean', 'color', 'date', 'date_time', 'file', 'float', 'gallery', 'integer', 'json', 'lat_lon', 'link', 'links', 'rich_text', 'seo', 'single_block', 'slug', 'string', 'structured_text', 'text', 'video'];
const ORDERING_META = ['created_at', 'updated_at', 'first_published_at', 'published_at'];
const ST_NODES = ['blockquote', 'code', 'heading', 'link', 'list', 'thematicBreak'];
const OPENERS = ['open', 'xdg-open', 'start', 'osascript'];
// Validators the API requires per field type, read from the installed CMA client's field-type table.
const REQUIRED_VALIDATORS = Object.fromEntries(
  readFileSync(join(dirname(createRequire(import.meta.url).resolve('@datocms/cma-client/package.json')), 'dist/types/generated/ApiTypes.d.ts'), 'utf8')
    .split('<details>').flatMap((block) => {
      const code = block.match(/\| Code\s*\| `(\w+)`/), required = block.match(/\| Required validators\s*\|([^|\n]*)\|/);
      return code && required ? [[code[1], [...required[1].matchAll(/`(\w+)`/g)].map((m) => m[1])]] : [];
    }),
);
const noLive = 'Dependencies are already installed. There is no live DatoCMS project or API token here, so do not run it against DatoCMS.';

// Real SDK deps, isolated HOME/XDG and recording browser-opener shims, all outside the workspace.
function setup(workspace, { root }) {
  const oracle = join(workspace, '..', 'oracle'), bin = join(oracle, 'bin');
  const environment = { HOME: join(oracle, 'home'), XDG_CONFIG_HOME: join(oracle, 'config'), XDG_DATA_HOME: join(oracle, 'data'), XDG_CACHE_HOME: join(oracle, 'cache'), PATH: `${bin}:${process.env.PATH}`, BROWSER: join(bin, 'open') };
  for (const dir of [bin, environment.HOME, environment.XDG_CONFIG_HOME, environment.XDG_DATA_HOME, environment.XDG_CACHE_HOME]) mkdirSync(dir, { recursive: true });
  const log = JSON.stringify(join(oracle, 'openers.jsonl'));
  for (const tool of OPENERS) writeFileSync(join(bin, tool), `#!${process.execPath}\nimport('node:fs').then((fs) => fs.appendFileSync(${log}, JSON.stringify({ tool: ${JSON.stringify(tool)}, argv: process.argv.slice(2) }) + '\\n'));\n`, { mode: 0o755 });
  for (const rc of ['.zprofile', '.bash_profile']) writeFileSync(join(environment.HOME, rc), `export PATH=${JSON.stringify(bin)}:"$PATH"\n`);
  symlinkSync(join(root, 'node_modules'), join(workspace, 'node_modules'));
  writeFileSync(join(workspace, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: { '@datocms/cma-client-node': '6.1.3', 'datocms-structured-text-utils': '6.0.1' }, devDependencies: { typescript: '5.9.3' } }, null, 2));
  writeFileSync(join(workspace, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true, skipLibCheck: true } }, null, 2));
  return { environment };
}

// Bundles the actor module; runtime imports resolve through a node_modules link beside the bundle.
async function run(workspace, { root, directory }, file, api) {
  const dir = join(directory, 'oracle', 'build'), outfile = join(dir, file.replace(/\.ts$/, '.mjs'));
  mkdirSync(dir, { recursive: true });
  if (!existsSync(join(dir, 'node_modules'))) symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'));
  await build({ entryPoints: [join(workspace, file)], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent' });
  const fn = (await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`)).default;
  assert.equal(typeof fn, 'function', `${file} must default-export a function`);
  await Promise.race([fn(api.client), new Promise((_, reject) => setTimeout(() => reject(Error('oracle: no result within 60s')), 60000).unref())]);
  const openers = join(directory, 'oracle', 'openers.jsonl');
  return existsSync(openers) ? readFileSync(openers, 'utf8') : '';
}

// Real SDK client mocked at fetch: JSON:API schema/record endpoints with documented validation.
function cmaApi(seed) {
  const s = { models: structuredClone(seed.models), fieldsets: [], fields: structuredClone(seed.fields), items: [], log: [] };
  let seq = 0;
  const model = (ref) => s.models.find((m) => m.id === ref || m.api_key === ref);
  const fieldset = (ref) => s.fieldsets.find((f) => f.id === ref);
  const field = (ref) => s.fields.find((f) => f.id === ref || `${model(f.item_type)?.api_key}::${f.api_key}` === ref);
  const fail = (status, code, details = {}) => { throw Object.assign(Error(code), { reply: [status, { data: [{ id: 'err', type: 'api_error', attributes: { code, doc_url: '', details } }] }] }); };
  const invalid = (name, code = 'VALIDATION_INVALID', message) => fail(422, 'INVALID_FIELD', { field: name, code, message });
  const rel = (type, id) => ({ data: id ? { id, type } : null });
  const MODEL_RELS = ['ordering_field', 'title_field', 'image_preview_field', 'excerpt_field', 'presentation_title_field', 'presentation_image_field'];
  const modelJson = ({ id, created, ...m }) => {
    const attributes = Object.fromEntries(Object.entries(m).filter(([k]) => !MODEL_RELS.includes(k)));
    return { id, type: 'item_type', attributes, relationships: { fields: { data: s.fields.filter((f) => f.item_type === id).map((f) => ({ id: f.id, type: 'field' })) }, fieldsets: { data: s.fieldsets.filter((f) => f.item_type === id).map((f) => ({ id: f.id, type: 'fieldset' })) }, singleton_item: rel('item', null), workflow: rel('workflow', null), ...Object.fromEntries(MODEL_RELS.map((r) => [r, rel('field', m[r])])) } };
  };
  const fieldJson = (f) => ({ id: f.id, type: 'field', attributes: { label: f.label, api_key: f.api_key, field_type: f.field_type, localized: !!f.localized, validators: f.validators ?? {}, appearance: f.appearance ?? { editor: 'default', parameters: {}, addons: [] }, position: f.position ?? 0, hint: f.hint ?? null, default_value: f.default_value ?? null, deep_filtering_enabled: false }, relationships: { item_type: rel('item_type', f.item_type), fieldset: rel('fieldset', f.fieldset) } });
  const fieldsetJson = (f) => ({ id: f.id, type: 'fieldset', attributes: { title: f.title, hint: f.hint ?? null, position: f.position ?? 0, collapsible: !!f.collapsible, start_collapsed: !!f.start_collapsed }, relationships: { item_type: rel('item_type', f.item_type) } });
  const itemJson = (i) => ({ id: i.id, type: 'item', attributes: i.attributes, relationships: { item_type: rel('item_type', i.item_type), creator: rel('access_token', 'token-1') }, meta: { created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z', published_at: null, first_published_at: null, publication_scheduled_at: null, unpublishing_scheduled_at: null, status: 'draft', is_valid: true, is_current_version_valid: true, is_published_version_valid: null, current_version: `v-${i.id}`, stage: null, has_children: null } });
  const merge = (target, data) => {
    const next = { ...target, ...(data?.attributes ?? {}) };
    for (const [k, v] of Object.entries(data?.relationships ?? {})) next[k] = v?.data?.id ?? null;
    return next;
  };
  const checkModel = (m) => {
    for (const k of ['name', 'api_key']) if (!m[k]) invalid(k, 'VALIDATION_REQUIRED');
    if (s.models.some((o) => o.id !== m.id && o.api_key === m.api_key)) invalid('api_key', 'VALIDATION_UNIQUENESS');
    if (m.ordering_meta != null && !ORDERING_META.includes(m.ordering_meta)) invalid('ordering_meta', 'VALIDATION_INCLUSION');
    if (m.ordering_direction != null && !['asc', 'desc'].includes(m.ordering_direction)) invalid('ordering_direction', 'VALIDATION_INCLUSION');
    // item-type.md: ordering_meta "Cannot be set in concurrency with ordering_field".
    if (m.ordering_meta != null && m.ordering_field) invalid('ordering_meta');
    // datocms/api item_type.rb avoid_ordering_without_direction: ordering and direction come together.
    if ((m.ordering_meta != null || !!m.ordering_field) !== (m.ordering_direction != null)) invalid(m.ordering_meta != null ? 'ordering_meta' : 'ordering_field');
    for (const r of MODEL_RELS) if (m[r] && field(m[r])?.item_type !== m.id) invalid(r);
  };
  const checkField = (f) => {
    for (const k of ['label', 'api_key', 'field_type']) if (!f[k]) invalid(k, 'VALIDATION_REQUIRED');
    if (!FIELD_TYPES.includes(f.field_type)) invalid('field_type', 'VALIDATION_INCLUSION');
    if (s.fields.some((o) => o.id !== f.id && o.item_type === f.item_type && o.api_key === f.api_key)) invalid('api_key', 'VALIDATION_UNIQUENESS');
    if (f.fieldset && fieldset(f.fieldset)?.item_type !== f.item_type) invalid('fieldset');
    for (const v of REQUIRED_VALIDATORS[f.field_type] ?? []) if (!f.validators?.[v]) invalid(`validators.${v}`, 'VALIDATION_REQUIRED');
    // field.md structured_text editor: nodes and marks required; heading_levels when headings are allowed.
    const p = f.appearance?.editor === 'structured_text' ? f.appearance.parameters ?? {} : null;
    if (p && (!Array.isArray(p.nodes) || !Array.isArray(p.marks) || p.nodes.some((n) => !ST_NODES.includes(n)) || (p.nodes.includes('heading') && !Array.isArray(p.heading_levels)))) invalid('appearance.parameters');
  };
  const routes = ({ method, path, params, body }) => {
    let m;
    if (method === 'GET' && path === '/site') return [200, { data: { id: 'site-1', type: 'site', attributes: { name: 'Blog', locales: ['en'] } } }];
    if (path === '/item-types') {
      if (method === 'GET') return [200, { data: s.models.map(modelJson) }];
      if (method === 'POST') {
        const next = { name: null, api_key: null, singleton: false, sortable: false, modular_block: false, tree: false, ordering_direction: null, ordering_meta: null, draft_mode_active: false, draft_saving_active: false, all_locales_required: false, collection_appearance: 'table', hint: null, inverse_relationships_enabled: false, ...merge({}, body.data), id: `model-${++seq}`, created: true };
        checkModel(next);
        s.models.push(next);
        return [201, { data: modelJson(next) }];
      }
    }
    if ((m = path.match(/^\/item-types\/([^/]+)$/))) {
      const target = model(m[1]) ?? fail(404, 'NOT_FOUND');
      if (method === 'GET') return [200, { data: modelJson(target) }];
      if (method === 'PUT') {
        const next = merge(target, body.data);
        checkModel(next);
        Object.assign(target, next);
        return [200, { data: modelJson(target) }];
      }
    }
    if ((m = path.match(/^\/item-types\/([^/]+)\/fieldsets$/))) {
      const owner = model(m[1]) ?? fail(404, 'NOT_FOUND');
      if (method === 'GET') return [200, { data: s.fieldsets.filter((f) => f.item_type === owner.id).map(fieldsetJson) }];
      if (method === 'POST') {
        const next = { ...merge({}, body.data), id: `fieldset-${++seq}`, item_type: owner.id };
        if (!next.title) invalid('title', 'VALIDATION_REQUIRED');
        s.fieldsets.push(next);
        return [201, { data: fieldsetJson(next) }];
      }
    }
    if ((m = path.match(/^\/fieldsets\/([^/]+)$/))) {
      const target = fieldset(m[1]) ?? fail(404, 'NOT_FOUND');
      if (method === 'PUT') Object.assign(target, merge(target, body.data));
      return [200, { data: fieldsetJson(target) }];
    }
    if ((m = path.match(/^\/item-types\/([^/]+)\/fields$/))) {
      const owner = model(m[1]) ?? fail(404, 'NOT_FOUND');
      if (method === 'GET') return [200, { data: s.fields.filter((f) => f.item_type === owner.id).map(fieldJson) }];
      if (method === 'POST') {
        const next = { ...merge({}, body.data), id: `field-${++seq}`, item_type: owner.id, created: true };
        checkField(next);
        s.fields.push(next);
        return [201, { data: fieldJson(next) }];
      }
    }
    if ((m = path.match(/^\/fields\/([^/]+)$/))) {
      const target = field(decodeURIComponent(m[1])) ?? fail(404, 'NOT_FOUND');
      if (method === 'GET') return [200, { data: fieldJson(target) }];
      if (method === 'PUT') {
        const next = { ...merge(target, body.data), item_type: target.item_type };
        checkField(next);
        Object.assign(target, next, { updated: true });
        return [200, { data: fieldJson(target) }];
      }
    }
    if (path === '/items' && method === 'GET') {
      const types = params.get('filter[type]')?.split(',').map((t) => model(t)?.id);
      const matches = s.items.filter((i) => !types || types.includes(i.item_type));
      return [200, { data: matches.map(itemJson), meta: { total_count: matches.length } }];
    }
    if (path === '/items' && method === 'POST') {
      const owner = model(body.data.relationships?.item_type?.data?.id) ?? invalid('item_type');
      const attributes = body.data.attributes ?? {};
      // The CMA rejects malformed DAST; datocms-structured-text-utils validate() is the published format check.
      for (const f of s.fields.filter((x) => x.item_type === owner.id && x.field_type === 'structured_text')) {
        const value = attributes[f.api_key];
        for (const doc of f.localized && value ? Object.values(value) : [value]) {
          const result = validate(doc);
          if (!result.valid) invalid(f.api_key, 'VALIDATION_INVALID', result.message.split('\n')[0]);
        }
      }
      const item = { id: `item-${++seq}`, item_type: owner.id, attributes };
      s.items.push(item);
      return [201, { data: itemJson(item) }];
    }
    fail(404, 'NOT_FOUND', { path });
  };
  const fetchFn = async (input, init = {}) => {
    const url = new URL(String(input)), request = { method: (init.method ?? 'GET').toUpperCase(), path: url.pathname, params: url.searchParams, body: init.body ? JSON.parse(init.body) : undefined };
    s.log.push(`${request.method} ${url.pathname}`);
    assert.ok(s.log.length <= 200, 'oracle: more than 200 API requests');
    let status, payload;
    try { [status, payload] = routes(request); } catch (error) { if (!error.reply) throw error; [status, payload] = error.reply; }
    return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
  };
  return { client: buildClient({ apiToken: 'synthetic-not-used', fetchFn }), state: s };
}

// ---------------------------------------------------------------- blog ordering
const blogSeed = { models: [{ id: 'model-page', name: 'Page', api_key: 'page', modular_block: false, sortable: false, tree: false, ordering_meta: null, ordering_direction: null }], fields: [{ id: 'field-page-title', item_type: 'model-page', label: 'Title', api_key: 'title', field_type: 'string' }] };
const blogControl = (modelExtra, extra = '') => `import type { Client } from '@datocms/cma-client-node';

export default async function createBlogModel(client: Client) {
  const model = await client.itemTypes.create({ name: 'Blog post', api_key: 'blog_post', draft_mode_active: true${modelExtra} });
  const content = await client.fieldsets.create(model.id, { title: 'Content' });
  const publishing = await client.fieldsets.create(model.id, { title: 'Publishing' });
  const inSet = (fs: { id: string }) => ({ fieldset: { id: fs.id, type: 'fieldset' as const } });
  const title = await client.fields.create(model.id, { label: 'Title', api_key: 'title', field_type: 'string', validators: { required: {} }, ...inSet(content) });
  await client.fields.create(model.id, { label: 'Slug', api_key: 'slug', field_type: 'slug', validators: { slug_title_field: { title_field_id: title.id } }, ...inSet(content) });
  await client.fields.create(model.id, { label: 'Excerpt', api_key: 'excerpt', field_type: 'text', ...inSet(content) });
  await client.fields.create(model.id, { label: 'Body', api_key: 'body', field_type: 'structured_text', validators: { structured_text_blocks: { item_types: [] }, structured_text_links: { item_types: [] } }, ...inSet(content) });
  await client.fields.create(model.id, { label: 'Cover image', api_key: 'cover_image', field_type: 'file', ...inSet(content) });
  await client.fields.create(model.id, { label: 'Author', api_key: 'author', field_type: 'string', ...inSet(publishing) });
  ${extra}
}
`;
const publishedAtField = `const published = await client.fields.create(model.id, { label: 'Published at', api_key: 'published_at', field_type: 'date_time', ...inSet(publishing) });`;

export default [
  {
    id: 'modeling-blog-publish-order',
    guards: ['skills/datocms-content-modeling/references/model-configuration.md', 'skills/datocms-content-modeling/references/content-reuse.md'],
    prompt: `We're adding a blog to our DatoCMS project and I want the Blog post model designed the right way before we create it. It needs a title, a slug generated from the title, an excerpt, a Structured Text body (no blocks), a cover image and the author's name. Split the editing form into two fieldsets: "Content" (title, slug, excerpt, body, cover image) and "Publishing" (author). In the CMS, blog posts must always be listed with the most recently published first. In this TypeScript project, create create-blog-model.ts with a default-exported async function (client), where client is a CMA client from @datocms/cma-client-node, that creates this model (API key blog_post). ${noLive}`,
    setup,
    async check(workspace, ctx) {
      const api = cmaApi(blogSeed);
      const openers = await run(workspace, ctx, 'create-blog-model.ts', api);
      const { models, fields, fieldsets, log } = api.state;
      const model = models.find((m) => m.created && m.api_key === 'blog_post');
      assert.ok(model && !model.modular_block, 'blog_post model was not created');
      const own = fields.filter((f) => f.item_type === model.id);
      const set = (title) => fieldsets.find((f) => f.item_type === model.id && f.title.trim().toLowerCase() === title)?.id;
      const find = (pattern, type) => own.find((f) => pattern.test(f.api_key) && (!type || f.field_type === type));
      for (const [pattern, type, group] of [[/title/, 'string', 'content'], [/body/, 'structured_text', 'content'], [/author/, null, 'publishing']])
        assert.ok(set(group) && find(pattern, type)?.fieldset === set(group), `${pattern.source} field is missing from the "${group}" fieldset`);
      // Publication time is record meta (meta.published_at / first_published_at); a custom date field is a second, drifting copy.
      const duplicates = own.filter((f) => ['date', 'date_time'].includes(f.field_type) || /publish/i.test(f.api_key));
      assert.deepEqual(duplicates.map((f) => f.api_key), [], 'Custom field duplicates the built-in publication timestamp');
      assert.ok(['published_at', 'first_published_at'].includes(model.ordering_meta), `Collection is not ordered by publication meta (ordering_meta=${model.ordering_meta}, ordering_field=${model.ordering_field})`);
      assert.equal(model.ordering_direction, 'desc', 'Newest posts must come first');
      assert.ok(!model.ordering_field && !model.sortable && !model.tree, 'Conflicting ordering strategy');
      return { model: { api_key: model.api_key, ordering_meta: model.ordering_meta, ordering_direction: model.ordering_direction }, fields: own.map((f) => `${f.api_key}:${f.field_type}@${fieldsets.find((x) => x.id === f.fieldset)?.title ?? '-'}`), openers, requests: log };
    },
    controls: {
      pass: { files: { 'create-blog-model.ts': blogControl(`, ordering_meta: 'published_at', ordering_direction: 'desc'`) } },
      fail: [
        { name: 'published-at-ordering-field', files: { 'create-blog-model.ts': blogControl('', `${publishedAtField}\n  await client.itemTypes.update(model.id, { ordering_field: { id: published.id, type: 'field' }, ordering_direction: 'desc' });`) } },
        { name: 'published-at-in-publishing-fieldset', files: { 'create-blog-model.ts': blogControl(`, ordering_meta: 'published_at', ordering_direction: 'desc'`, publishedAtField) } },
        // The API requires structured_text_blocks and structured_text_links on every Structured Text field.
        { name: 'body-without-required-validators', files: { 'create-blog-model.ts': blogControl(`, ordering_meta: 'published_at', ordering_direction: 'desc'`).replace(", validators: { structured_text_blocks: { item_types: [] }, structured_text_links: { item_types: [] } }", '') } },
      ],
    },
  },
];
