import assert from 'node:assert/strict';
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { buildClient } from '@datocms/cma-client-node';

// The actor gets real SDK dependencies and an isolated home, so neither a real
// DatoCMS login nor host configuration is reachable from the session.
function prepare(workspace, { root }) {
  writeFileSync(join(workspace, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: { '@datocms/cma-client-node': '6.1.3' } }, null, 2));
  writeFileSync(join(workspace, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, skipLibCheck: true, noEmit: true } }, null, 2));
  symlinkSync(join(root, 'node_modules'), join(workspace, 'node_modules'));
  const environment = {};
  for (const [key, name] of [['HOME', 'home'], ['XDG_CONFIG_HOME', 'config'], ['XDG_DATA_HOME', 'data'], ['XDG_CACHE_HOME', 'cache']]) {
    environment[key] = join(workspace, '..', 'oracle', name);
    mkdirSync(environment[key], { recursive: true });
  }
  return { environment };
}

async function load(workspace, file) {
  const outfile = join(workspace, '.oracle-build.mjs');
  await build({ entryPoints: [join(workspace, file)], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent' });
  return (await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`)).default;
}

const withTimeout = (promise, ms = 60000) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(Error(`oracle: no result within ${ms}ms`)), ms).unref())]);

const apiError = (code, details = {}, status = 422) =>
  [status, { data: [{ id: Math.random().toString(36).slice(2, 8), type: 'api_error', attributes: { code, doc_url: `https://www.datocms.com/docs/content-management-api/errors#${code}`, details } }] }];

// Real client, mocked at the fetch boundary: the SDK's own serialization,
// pagination and ApiError handling run exactly as against the live CMA.
function mockApi(handle, cap) {
  const log = [];
  const fetchFn = async (input, init = {}) => {
    const url = new URL(String(input));
    const request = { method: (init.method ?? 'GET').toUpperCase(), path: url.pathname, params: url.searchParams, body: init.body ? JSON.parse(init.body) : undefined };
    log.push({ method: request.method, url: url.pathname + url.search });
    if (log.length > cap) throw Error(`oracle: more than ${cap} API requests (repeating pages?)`);
    const [status, payload] = (await handle(request)) ?? apiError('NOT_FOUND', { path: url.pathname }, 404);
    return new Response(status === 204 ? null : JSON.stringify(payload), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
  };
  return { client: buildClient({ apiToken: 'synthetic-not-used', fetchFn }), log };
}

const itemTypeJson = (id, api_key, extra = {}) => ({
  id, type: 'item_type',
  attributes: { name: api_key, api_key, singleton: false, sortable: false, modular_block: false, tree: false, draft_mode_active: false, all_locales_required: false, collection_appearance: 'table', ordering_direction: null, ordering_meta: null, hint: null, inverse_relationships_enabled: false, ...extra },
  relationships: { fields: { data: [] }, fieldsets: { data: [] }, singleton_item: { data: null }, ordering_field: { data: null }, title_field: { data: null }, image_preview_field: { data: null }, excerpt_field: { data: null }, presentation_title_field: { data: null }, presentation_image_field: { data: null }, workflow: { data: null } },
});
const fieldJson = (id, itemType, api_key, field_type, localized) => ({
  id, type: 'field',
  attributes: { label: api_key, api_key, field_type, localized, validators: {}, appearance: { editor: 'default', parameters: {}, addons: [] }, position: 1, hint: null, default_value: null, deep_filtering_enabled: false },
  relationships: { item_type: { data: { id: itemType, type: 'item_type' } }, fieldset: { data: null } },
});
const itemJson = (id, itemType, attributes) => ({
  id, type: 'item', attributes,
  relationships: { item_type: { data: { id: itemType, type: 'item_type' } }, creator: { data: { id: 'token-1', type: 'access_token' } } },
  meta: { created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', published_at: null, first_published_at: null, publication_scheduled_at: null, unpublishing_scheduled_at: null, status: 'draft', is_valid: true, is_current_version_valid: true, is_published_version_valid: null, current_version: `v-${id}`, stage: null, has_children: null },
});

// datocms/api ItemVersionQuery: filter[ids] wins over filter[type]; a block model is listable via filter[type].
function listItems(params, records, types, blocks = []) {
  const filter = params.get('filter[type]'), ids = params.get('filter[ids]')?.split(',');
  if (params.get('version') && !['current', 'published'].includes(params.get('version'))) return apiError('INVALID_PARAMS', { message: 'invalid version' });
  const wanted = filter ? filter.split(',').map((t) => types[t] ?? t) : null;
  const matches = ids ? [...records, ...blocks].filter((r) => ids.includes(r.id))
    : [...records, ...(wanted ? blocks : [])].filter((r) => !wanted || wanted.includes(r.relationships.item_type.data.id));
  const limit = Number(params.get('page[limit]') ?? 30), offset = Number(params.get('page[offset]') ?? 0);
  return [200, { data: matches.slice(offset, offset + Math.min(limit, 500)), meta: { total_count: matches.length } }];
}

// ---------------------------------------------------------------- audit log
const SINCE = '2026-09-01T00:00:00Z';
const auditEvents = Array.from({ length: 30 }, (_, i) => ({
  id: `01J${String(i).padStart(4, '0')}AUDIT`, type: 'audit_log_event',
  attributes: {
    action_name: ['items.update', 'items.publish', 'item_bulk_operations.publish', 'uploads.create'][i % 4],
    actor: { type: 'user', id: 'user-1', name: 'Editor' }, role: { id: 'role-1', name: 'Editor' }, environment: { id: 'main', primary: true },
    request: { path: `/items/record-${i}`, method: 'PUT' }, response: { status: 200, payload: {} },
  },
  // Seven events predate the export window and must not be returned.
  meta: { occurred_at: new Date(Date.parse(SINCE) + (i - 7) * 3600_000).toISOString() },
}));

function auditApi() {
  const allowed = ['since', 'before', 'filter', 'next_token', 'detailed_log'];
  const tokens = new Map();
  return mockApi(({ method, path, body }) => {
    if (method !== 'POST' || path !== '/audit-log-events/query') return undefined;
    // Mirrors the endpoint's JSON schema: additionalProperties is false at every level.
    const format = (m) => apiError('INVALID_FORMAT', { messages: [m] });
    if (!body || Object.keys(body).some((k) => k !== 'data')) return format('body: only `data` is allowed');
    if (Object.keys(body.data ?? {}).some((k) => !['type', 'attributes'].includes(k)) || body.data.type !== 'audit_log_query') return format('data: invalid');
    const attributes = body.data.attributes;
    if (!attributes || typeof attributes !== 'object') return format('data.attributes: required');
    if (Object.keys(attributes).some((k) => !allowed.includes(k))) return format('data.attributes: unknown key');
    if (Object.entries(attributes).some(([k, v]) => typeof v !== (k === 'detailed_log' ? 'boolean' : 'string'))) return format('data.attributes: wrong type');
    if (attributes.filter) return apiError('INVALID_REQUEST', { code: 'ValidationException', message: 'oracle does not emulate filters' });
    let offset = 0;
    if (attributes.next_token !== undefined) {
      const cursor = tokens.get(attributes.next_token);
      if (!cursor || cursor.since !== attributes.since) return apiError('INVALID_REQUEST', { code: 'ValidationException', message: 'Invalid NextToken' });
      offset = cursor.offset;
    }
    const since = attributes.since ? Date.parse(attributes.since) : -Infinity;
    // datocms/api AuditLogEventsQuery: ORDER BY id DESC (newest first).
    const matching = auditEvents.filter((e) => Date.parse(e.meta.occurred_at) >= since).reverse();
    const page = matching.slice(offset, offset + 5);
    let next_token = null;
    if (offset + 5 < matching.length) {
      next_token = Buffer.from(`${offset + 5}:${Math.random()}`).toString('base64');
      tokens.set(next_token, { offset: offset + 5, since: attributes.since });
    }
    return [200, { data: page, meta: { next_token } }];
  }, 40);
}

// ------------------------------------------------------------ nested export
const TYPES = { landing_page: 'model-landing', hero_block: 'model-hero', author: 'model-author' };
function nestedApi() {
  const pages = Array.from({ length: 1250 }, (_, i) => ({
    id: `lp-${String(i).padStart(4, '0')}`, title: `Landing ${i}`,
    blocks: [0, 1].map((b) => itemJson(`blk-${i}-${b}`, TYPES.hero_block, { heading: `Heading ${i}.${b}` })),
  }));
  const authors = Array.from({ length: 12 }, (_, i) => itemJson(`author-${i}`, TYPES.author, { name: `Author ${i}` }));
  const types = [itemTypeJson(TYPES.landing_page, 'landing_page'), itemTypeJson(TYPES.hero_block, 'hero_block', { modular_block: true }), itemTypeJson(TYPES.author, 'author')];
  const fields = {
    [TYPES.landing_page]: [fieldJson('f-title', TYPES.landing_page, 'title', 'string', false), fieldJson('f-sections', TYPES.landing_page, 'sections', 'rich_text', false)],
    [TYPES.hero_block]: [fieldJson('f-heading', TYPES.hero_block, 'heading', 'string', false)],
    [TYPES.author]: [fieldJson('f-name', TYPES.author, 'name', 'string', false)],
  };
  const render = (nested) => [...pages.map((p) => itemJson(p.id, TYPES.landing_page, { title: p.title, sections: nested ? p.blocks : p.blocks.map((b) => b.id) })), ...authors];
  const typeFor = (key) => types.find((t) => t.id === key || t.attributes.api_key === key);
  const api = mockApi(({ method, path, params }) => {
    if (method !== 'GET') return undefined;
    const nested = params.get('nested') === 'true';
    if (path === '/item-types') return [200, { data: types }];
    let m;
    if ((m = path.match(/^\/item-types\/([^/]+)$/)) && typeFor(m[1])) return [200, { data: typeFor(m[1]) }];
    if ((m = path.match(/^\/item-types\/([^/]+)\/fields$/)) && typeFor(m[1])) return [200, { data: fields[typeFor(m[1]).id] }];
    if (path === '/items') {
      // datocms/api items_controller#index: page[limit] > 30 with nested=true is rejected, not clamped.
      if (nested && Number(params.get('page[limit]') ?? 0) > 30)
        return apiError('INVALID_PARAMS', { message: 'With nested=true, page[limit] must be <= 30' });
      return listItems(params, render(nested), TYPES, pages.flatMap((p) => p.blocks));
    }
    if ((m = path.match(/^\/items\/([^/]+)$/))) {
      const all = [...render(nested), ...pages.flatMap((p) => p.blocks)];
      const found = all.find((r) => r.id === m[1]);
      return found ? [200, { data: found }] : undefined;
    }
    return undefined;
  }, 150);
  const expected = pages.map((p) => ({ id: p.id, title: p.title, sections: p.blocks.map((b) => ({ id: b.id, heading: b.attributes.heading })) }));
  return { ...api, expected };
}

// ----------------------------------------------------------- add a locale
const ARTICLE = 'model-article', AUTHOR = 'model-author';
function localeApi() {
  const site = { id: 'site-1', type: 'site', attributes: { name: 'Magazine', locales: ['en', 'it'], timezone: 'Europe/Rome', no_index: false, favicon: null, global_seo: null, require_2fa: false, ip_tracking_enabled: false, force_use_of_sandbox_environments: false }, relationships: {} };
  const types = [itemTypeJson(ARTICLE, 'article'), itemTypeJson(AUTHOR, 'author')];
  const fields = {
    [ARTICLE]: [
      fieldJson('f-title', ARTICLE, 'title', 'string', true), fieldJson('f-summary', ARTICLE, 'summary', 'text', true),
      fieldJson('f-cover', ARTICLE, 'cover', 'file', true), fieldJson('f-slug', ARTICLE, 'slug', 'slug', false), fieldJson('f-rating', ARTICLE, 'rating', 'integer', false),
    ],
    [AUTHOR]: [fieldJson('f-name', AUTHOR, 'name', 'string', false), fieldJson('f-bio', AUTHOR, 'bio', 'text', true)],
  };
  const file = (n) => ({ upload_id: `upload-${n}`, alt: `Alt ${n}`, title: null, custom_data: {}, focal_point: null });
  const records = [
    ...Array.from({ length: 45 }, (_, i) => itemJson(`article-${String(i).padStart(2, '0')}`, ARTICLE, {
      title: { en: `Title ${i}`, it: `Titolo ${i}` },
      // Some English values are empty: French must still receive the key (null) under the Locale Sync Rule.
      summary: { en: i % 3 === 0 ? null : `Summary ${i}`, it: i % 5 === 0 ? null : `Sommario ${i}` },
      cover: { en: i % 4 === 0 ? null : file(i), it: i % 4 === 1 ? null : file(`it-${i}`) },
      slug: `article-${i}`, rating: i % 5,
    })),
    ...Array.from({ length: 4 }, (_, i) => itemJson(`author-${i}`, AUTHOR, { name: `Author ${i}`, bio: { en: `Bio ${i}`, it: null } })),
  ];
  const original = structuredClone(records);
  const jobs = new Map();
  const typeFor = (key) => types.find((t) => t.id === key || t.attributes.api_key === key);
  const localeError = (field) => apiError('INVALID_FIELD', { field, code: 'INVALID_LOCALES', message: 'Locales are not consistent with the rest of the record or the site' });
  const api = mockApi(({ method, path, params, body }) => {
    let m;
    if (method === 'GET' && path === '/site') return [200, { data: site }];
    if (method === 'PUT' && path === '/site') {
      const { locales, ...rest } = body?.data?.attributes ?? {};
      if (locales !== undefined) {
        if (!Array.isArray(locales) || !locales.length || new Set(locales).size !== locales.length) return apiError('INVALID_FIELD', { field: 'locales', code: 'VALIDATION_FORMAT' });
        site.attributes.locales = [...locales];
      }
      Object.assign(site.attributes, rest);
      const job = `job-${jobs.size + 1}`;
      jobs.set(job, { data: structuredClone(site) });
      return [202, { data: { id: job, type: 'job' } }];
    }
    if (method === 'GET' && (m = path.match(/^\/job-results\/([^/]+)$/)) && jobs.has(m[1]))
      return [200, { data: { id: m[1], type: 'job_result', attributes: { status: 200, payload: jobs.get(m[1]) } } }];
    if (method === 'GET' && path === '/item-types') return [200, { data: types }];
    if (method === 'GET' && (m = path.match(/^\/item-types\/([^/]+)$/)) && typeFor(m[1])) return [200, { data: typeFor(m[1]) }];
    if (method === 'GET' && (m = path.match(/^\/item-types\/([^/]+)\/fields$/)) && typeFor(m[1])) return [200, { data: fields[typeFor(m[1]).id] }];
    if (method === 'GET' && path === '/items') return listItems(params, records, { article: ARTICLE, author: AUTHOR });
    const record = (m = path.match(/^\/items\/([^/]+)$/)) && records.find((r) => r.id === m[1]);
    if (method === 'GET' && record) return [200, { data: record }];
    if (method === 'PUT' && record) {
      if (body?.data?.type !== 'item' || body.data.id !== record.id) return apiError('INVALID_FORMAT', { messages: ['data.type/id mismatch'] });
      const modelFields = fields[record.relationships.item_type.data.id];
      const attributes = Object.fromEntries(Object.entries(body.data.attributes ?? {}).filter(([k]) => !k.startsWith('__')));
      const sent = [];
      for (const [key, value] of Object.entries(attributes)) {
        const field = modelFields.find((f) => f.attributes.api_key === key);
        if (!field) return apiError('INVALID_FIELD', { field: key, code: 'INVALID_FIELD', message: 'Unknown field' });
        if (!field.attributes.localized) continue;
        // Per-field: a per-locale object, at least one key, every key a site locale.
        if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.keys(value).length || Object.keys(value).some((l) => !site.attributes.locales.includes(l)))
          return localeError(key);
        sent.push([key, Object.keys(value).sort().join(',')]);
      }
      const localized = modelFields.filter((f) => f.attributes.localized).map((f) => f.attributes.api_key);
      const current = Object.keys(record.attributes[localized[0]]).sort().join(',');
      const sets = new Set(sent.map(([, set]) => set));
      if (sets.size > 1) return localeError(sent.find(([, set]) => set !== sent[0][1])[0]);
      // Changing the record's locale set requires every localized field, all with the new set.
      if (sets.size === 1 && !sets.has(current)) {
        const missing = localized.find((key) => !sent.some(([k]) => k === key));
        if (missing) return localeError(missing);
      }
      Object.assign(record.attributes, structuredClone(attributes));
      record.meta.current_version = `v-${record.id}-${Date.now()}`;
      return [200, { data: record }];
    }
    return undefined;
  }, 200);
  return { ...api, site, records, original };
}

export default [
  {
    id: 'cma-audit-log-export',
    guards: ['skills/datocms-cma/references/resource-gotchas.md', 'skills/datocms-cma/references/filtering-and-pagination.md', 'skills/datocms-cma/SKILL.md'],
    prompt:
      'Create audit-export.ts in this workspace for our Node.js compliance tooling. Export a default async function exportAuditLog(client, sinceIso) that receives an already-configured @datocms/cma-client-node client and an ISO 8601 timestamp, and resolves to every DatoCMS audit log event that occurred at or after that time, as an array of { id, action_name } objects in the order the API returns them. Our project records far more events than one API response holds, so the export must include all of them. Reuse the supplied client; do not create one. Dependencies are already installed. No live project or credentials are available, so do not run it against DatoCMS.',
    setup: prepare,
    async check(workspace) {
      const exportAuditLog = await load(workspace, 'audit-export.ts');
      const { client, log } = auditApi();
      const result = await withTimeout(exportAuditLog(client, SINCE));
      const expected = auditEvents.filter((e) => Date.parse(e.meta.occurred_at) >= Date.parse(SINCE)).reverse();
      assert.deepEqual(result.map((e) => ({ id: e.id, action_name: e.action_name })), expected.map((e) => ({ id: e.id, action_name: e.attributes.action_name })));
      return { requests: log.length, events: result.length };
    },
    controls: {
      pass: {
        files: {
          'audit-export.ts': `import type { Client } from '@datocms/cma-client-node';

export default async function exportAuditLog(client: Client, sinceIso: string) {
  const events: { id: string; action_name: string }[] = [];
  let next_token: string | undefined;
  do {
    const page = await client.auditLogEvents.rawQuery({
      data: { type: 'audit_log_query', attributes: { since: sinceIso, ...(next_token ? { next_token } : {}) } },
    });
    for (const event of page.data) events.push({ id: event.id, action_name: event.attributes.action_name });
    next_token = page.meta.next_token ?? undefined;
  } while (next_token);
  return events;
}
`,
        },
      },
      fail: [
        {
          name: 'page-token-in-body',
          files: {
            'audit-export.ts': `import type { Client } from '@datocms/cma-client-node';

export default async function exportAuditLog(client: Client, sinceIso: string) {
  const events: { id: string; action_name: string }[] = [];
  let token: string | null = null;
  do {
    const page: any = await client.auditLogEvents.rawQuery({
      data: { type: 'audit_log_query', attributes: { since: sinceIso } },
      ...(token ? { page: { token } } : {}),
    } as any);
    for (const event of page.data) events.push({ id: event.id, action_name: event.attributes.action_name });
    token = page.meta.next_token;
  } while (token);
  return events;
}
`,
          },
        },
        {
          name: 'page-token-query-param',
          files: {
            'audit-export.ts': `import type { Client } from '@datocms/cma-client-node';

export default async function exportAuditLog(client: Client, sinceIso: string) {
  const events: { id: string; action_name: string }[] = [];
  let token: string | null = null;
  do {
    const page: any = await client.request({
      method: 'POST',
      url: '/audit-log-events/query',
      queryParams: token ? { page: { token } } : undefined,
      body: { data: { type: 'audit_log_query', attributes: { since: sinceIso } } },
    });
    for (const event of page.data) events.push({ id: event.id, action_name: event.attributes.action_name });
    token = page.meta.next_token;
  } while (token);
  return events;
}
`,
          },
        },
      ],
    },
  },
  {
    id: 'cma-nested-export',
    guards: ['skills/datocms-cma/SKILL.md', 'skills/datocms-cma/references/filtering-and-pagination.md', 'skills/datocms-cma/references/editing-records.md', 'skills/datocms-cma/references/records.md'],
    prompt:
      'Create export-with-blocks.ts in this workspace. Export a default async function exportLandingPages(client) that receives an already-configured @datocms/cma-client-node client and resolves to every record of the DatoCMS `landing_page` model as { id, title, sections }, where `sections` lists the blocks of its `sections` Modular Content field in order as { id, heading } (each block has a `heading` string field). The model has several thousand records, so read them in as few API requests as practical and do not fetch records or blocks one at a time. Reuse the supplied client; do not create one. Dependencies are already installed. No live project or credentials are available, so do not run it against DatoCMS.',
    setup: prepare,
    async check(workspace) {
      const exportLandingPages = await load(workspace, 'export-with-blocks.ts');
      const { client, log, expected } = nestedApi();
      const result = await withTimeout(exportLandingPages(client));
      const normalize = (rows) => rows.map((r) => ({ id: r.id, title: r.title, sections: r.sections.map((s) => ({ id: s.id, heading: s.heading })) })).sort((a, b) => a.id.localeCompare(b.id));
      assert.deepEqual(normalize(result), expected);
      return { requests: log.length, records: result.length };
    },
    controls: {
      pass: {
        files: {
          'export-with-blocks.ts': `import type { Client } from '@datocms/cma-client-node';

export default async function exportLandingPages(client: Client) {
  const rows = [];
  for await (const page of client.items.listPagedIterator({ filter: { type: 'landing_page' }, nested: true }, { concurrency: 5 })) {
    const sections = (page.sections as any[]).map((block) => ({ id: block.id, heading: block.attributes.heading }));
    rows.push({ id: page.id, title: page.title, sections });
  }
  return rows;
}
`,
        },
      },
      fail: [
        {
          name: 'nested-perpage-100',
          files: {
            'export-with-blocks.ts': `import type { Client } from '@datocms/cma-client-node';

export default async function exportLandingPages(client: Client) {
  const rows = [];
  // Old guidance: the iterator was said to lower perPage transparently for nested reads.
  for await (const page of client.items.listPagedIterator({ filter: { type: 'landing_page' }, nested: true }, { perPage: 100, concurrency: 5 })) {
    const sections = (page.sections as any[]).map((block) => ({ id: block.id, heading: block.attributes.heading }));
    rows.push({ id: page.id, title: page.title, sections });
  }
  return rows;
}
`,
          },
        },
      ],
    },
  },
  {
    id: 'cma-add-locale-backfill',
    guards: ['skills/datocms-cma/references/localization.md', 'skills/datocms-cma/references/editing-records.md'],
    prompt:
      'Our DatoCMS project currently has English and Italian content and we are launching French. Create add-french.ts in this workspace exporting a default async function addFrench(client) that receives an already-configured @datocms/cma-client-node client, adds French (`fr`) as a project locale, and fills French on every record of the `article` model by copying that record\'s English value of each localized field as a placeholder for translators. English must stay the primary locale, and existing English and Italian content must stay unchanged. Do not publish anything. Reuse the supplied client; do not create one. Dependencies are already installed. No live project or credentials are available, so do not run it against DatoCMS.',
    setup: prepare,
    async check(workspace) {
      const addFrench = await load(workspace, 'add-french.ts');
      const { client, log, site, records, original } = localeApi();
      await withTimeout(addFrench(client), 120000);
      assert.equal(site.attributes.locales[0], 'en', 'English must stay primary');
      assert.deepEqual([...site.attributes.locales].sort(), ['en', 'fr', 'it']);
      for (const [index, before] of original.entries()) {
        const after = records[index];
        const expected = structuredClone(before.attributes);
        if (before.relationships.item_type.data.id === ARTICLE)
          for (const key of ['title', 'summary', 'cover']) expected[key] = { ...before.attributes[key], fr: before.attributes[key].en };
        assert.deepEqual(after.attributes, expected, `record ${before.id}`);
      }
      return { requests: log.length, updates: log.filter((r) => r.method === 'PUT' && r.url.startsWith('/items/')).length };
    },
    controls: {
      pass: {
        files: {
          'add-french.ts': `import { isLocalized, type Client } from '@datocms/cma-client-node';

export default async function addFrench(client: Client) {
  const site = await client.site.find();
  if (!site.locales.includes('fr')) await client.site.update({ locales: [...site.locales, 'fr'] });
  const localized = (await client.fields.list('article')).filter(isLocalized).map((f) => f.api_key);
  for await (const record of client.items.listPagedIterator({ filter: { type: 'article' } })) {
    const update: Record<string, Record<string, unknown>> = {};
    for (const key of localized) {
      const value = record[key] as Record<string, unknown>;
      update[key] = { ...value, fr: value.en ?? null };
    }
    await client.items.update(record.id, update);
  }
}
`,
        },
      },
      fail: [
        {
          // The removed "Complete Example" loop: no site locale update before the backfill.
          name: 'complete-example-without-site-locale',
          files: {
            'add-french.ts': `import { toNormalizedFieldValueEntries, fromNormalizedFieldValueEntries, type Client } from '@datocms/cma-client-node';

export default async function addFrench(client: Client) {
  const model = (await client.itemTypes.list()).find((m) => m.api_key === 'article');
  if (!model) throw new Error('Model not found');
  const fields = await client.fields.list(model.id);
  const localizedFields = fields.filter((f) => f.localized);
  for await (const record of client.items.listPagedIterator({ filter: { type: 'article' } })) {
    const updates: Record<string, unknown> = {};
    for (const field of localizedFields) {
      const fieldValue = (record as any)[field.api_key];
      if (!fieldValue) continue;
      const entries = toNormalizedFieldValueEntries(fieldValue, field);
      const enEntry = entries.find((e) => e.locale === 'en');
      if (enEntry && !entries.find((e) => e.locale === 'fr')) {
        entries.push({ locale: 'fr', value: enEntry.value });
        updates[field.api_key] = fromNormalizedFieldValueEntries(entries, field);
      }
    }
    if (Object.keys(updates).length > 0) await client.items.update(record.id, updates);
  }
}
`,
          },
        },
        {
          // Locale Sync Rule violation: fields whose English value is empty are skipped.
          name: 'skip-empty-english',
          files: {
            'add-french.ts': `import type { Client } from '@datocms/cma-client-node';

export default async function addFrench(client: Client) {
  const site = await client.site.find();
  await client.site.update({ locales: [...site.locales, 'fr'] });
  for await (const record of client.items.listPagedIterator({ filter: { type: 'article' } })) {
    const updates: Record<string, unknown> = {};
    for (const key of ['title', 'summary', 'cover']) {
      const value = (record as any)[key];
      if (value?.en == null) continue;
      updates[key] = { ...value, fr: value.en };
    }
    await client.items.update(record.id, updates);
  }
}
`,
          },
        },
      ],
    },
  },
];
