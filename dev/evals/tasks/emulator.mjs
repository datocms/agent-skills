// In-process emulation of the part of the DatoCMS CMA that the task evals need.
//
// The real SDK client is used; only its HTTP boundary (`client.request`) is
// replaced. The rules implemented here are the ones of the API source (see
// dev/tests/fixtures/field-types.json and docs in skills/datocms-cma): block
// slots (ID string keeps, object with id edits, object with item_type adds, a
// block left out is deleted), block IDs bound to one field and locale, the
// locale set shared by localized fields, Structured Text tree rules and write
// normalization, field validators and editors per field type.
//
// It is an oracle for evals, not a full API: endpoints outside the list in
// `route()` throw, so a solution that needs them fails loudly.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ApiError, buildClient, generateId } from '@datocms/cma-client-node';

const catalog = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../tests/fixtures/field-types.json'), 'utf8'));

const BLOCK_FIELD_TYPES = ['rich_text', 'single_block', 'structured_text'];
const BLOCK_VALIDATORS = ['rich_text_blocks', 'single_block_blocks', 'structured_text_blocks', 'structured_text_inline_blocks'];
const LINK_VALIDATORS = ['item_item_type', 'items_item_type', 'structured_text_links'];
const API_KEY = /^[a-z](([a-z0-9]|_(?![_0-9]))*[a-z0-9])$/;
const ENTITY_ID = /^[A-Za-z0-9_-]{22}$/;
const INLINE_NODES = ['span', 'link', 'itemLink', 'inlineItem', 'inlineBlock'];
const CHILDREN = {
  root: ['paragraph', 'heading', 'list', 'code', 'blockquote', 'block', 'thematicBreak'],
  paragraph: INLINE_NODES,
  heading: INLINE_NODES,
  list: ['listItem'],
  listItem: ['paragraph', 'list'],
  blockquote: ['paragraph'],
  link: ['span'],
  itemLink: ['span'],
};
const NODE_ATTRIBUTES = {
  root: ['children'],
  paragraph: ['children', 'style'],
  heading: ['children', 'level', 'style'],
  list: ['children', 'style'],
  listItem: ['children'],
  blockquote: ['children', 'attribution'],
  code: ['code', 'language', 'highlight'],
  thematicBreak: [],
  span: ['value', 'marks'],
  link: ['children', 'url', 'meta'],
  itemLink: ['children', 'item', 'meta'],
  inlineItem: ['item'],
  block: ['item'],
  inlineBlock: ['item'],
};

class Rejection extends Error {
  constructor(code, details = {}, status = 422) {
    super(`${code} ${JSON.stringify(details)}`);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}
const invalidField = (field, code, extra = {}) => new Rejection('INVALID_FIELD', { field, code, ...extra });
const clone = (value) => structuredClone(value);

export function createProject(fixture) {
  const state = {
    locales: fixture.locales ?? ['en'],
    itemTypes: clone(fixture.itemTypes ?? []),
    fields: clone(fixture.fields ?? []),
    fieldsets: clone(fixture.fieldsets ?? []),
    records: clone(fixture.records ?? []),
    limits: { blocks_per_item: 1000, blocks_depth: 5, ...(fixture.limits ?? {}) },
    calls: [],
    writes: [],
    published: [],
  };
  const original = clone(state);
  const client = buildClient({ apiToken: 'emulated' });
  client.request = async (request) => {
    const path = request.url.split('?')[0];
    state.calls.push(`${request.method} ${path}`);
    try {
      return route(state, request, path);
    } catch (error) {
      if (!(error instanceof Rejection)) throw error;
      state.calls.push(`  -> ${error.status} ${error.code} ${JSON.stringify(error.details)}`);
      throw new ApiError({
        request: { method: request.method, url: request.url, headers: {}, body: request.body },
        response: {
          status: error.status,
          statusText: error.status === 404 ? 'Not Found' : 'Unprocessable Entity',
          headers: {},
          body: { data: [{ id: 'error', type: 'api_error', attributes: { code: error.code, details: error.details } }] },
        },
      });
    }
  };
  return { client, state, original };
}

// ---------------------------------------------------------------- lookups

const itemTypeOf = (state, idOrKey) => state.itemTypes.find((type) => type.id === idOrKey || type.api_key === idOrKey);
const fieldsOf = (state, itemTypeId) => state.fields.filter((field) => field.item_type === itemTypeId);
const fieldOf = (state, itemTypeId, apiKey) => fieldsOf(state, itemTypeId).find((field) => field.api_key === apiKey);
const recordOf = (state, id) => state.records.find((record) => record.id === id);
const isBlock = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && 'attributes' in value;

/** Every block stored anywhere in a field value (not localized), depth first. */
export function blocksIn(state, field, value, visit, depth = 0) {
  if (value == null) return;
  const walk = (block) => {
    visit(block, depth);
    for (const nested of fieldsOf(state, block.item_type)) {
      if (BLOCK_FIELD_TYPES.includes(nested.field_type)) blocksIn(state, nested, block.attributes[nested.api_key], visit, depth + 1);
    }
  };
  if (field.field_type === 'rich_text') value.forEach(walk);
  else if (field.field_type === 'single_block') walk(value);
  else if (field.field_type === 'structured_text') {
    visitNodes(value.document, (node) => {
      if ((node.type === 'block' || node.type === 'inlineBlock') && isBlock(node.item)) walk(node.item);
    });
  }
}

function visitNodes(node, visit) {
  visit(node);
  for (const child of node.children ?? []) visitNodes(child, visit);
}

function slotBlocks(field, value) {
  if (value == null || !BLOCK_FIELD_TYPES.includes(field.field_type)) return [];
  if (field.field_type === 'rich_text') return value.filter(isBlock);
  if (field.field_type === 'single_block') return isBlock(value) ? [value] : [];
  if (typeof value.document !== 'object' || value.document === null) return [];
  const found = [];
  visitNodes(value.document, (node) => {
    if ((node.type === 'block' || node.type === 'inlineBlock') && isBlock(node.item)) found.push(node.item);
  });
  return found;
}

function allBlockIds(state) {
  const ids = new Set();
  for (const record of state.records) {
    for (const field of fieldsOf(state, record.item_type)) {
      if (!BLOCK_FIELD_TYPES.includes(field.field_type)) continue;
      const stored = record.attributes[field.api_key];
      const values = field.localized ? Object.values(stored ?? {}) : [stored];
      for (const value of values) blocksIn(state, field, value, (block) => ids.add(block.id));
    }
  }
  return ids;
}

// ---------------------------------------------------------------- serialization

function rawBlock(state, block, nested) {
  return {
    type: 'item',
    id: block.id,
    attributes: rawAttributes(state, block.item_type, block.attributes, nested),
    relationships: { item_type: { data: { type: 'item_type', id: block.item_type } } },
  };
}

function rawValue(state, field, value, nested) {
  if (value == null) return field.field_type === 'rich_text' ? [] : null;
  const slot = (block) => (nested ? rawBlock(state, block, true) : block.id);
  if (field.field_type === 'rich_text') return value.map(slot);
  if (field.field_type === 'single_block') return slot(value);
  if (field.field_type === 'structured_text') {
    const map = (node) => ({
      ...node,
      ...(node.type === 'block' || node.type === 'inlineBlock' ? { item: slot(node.item) } : {}),
      ...(node.children ? { children: node.children.map(map) } : {}),
    });
    return { schema: 'dast', document: map(value.document) };
  }
  return clone(value);
}

function rawAttributes(state, itemTypeId, attributes, nested) {
  const out = {};
  for (const field of fieldsOf(state, itemTypeId)) {
    const stored = attributes[field.api_key];
    out[field.api_key] = field.localized
      ? Object.fromEntries(Object.entries(stored ?? {}).map(([locale, value]) => [locale, rawValue(state, field, value, nested)]))
      : rawValue(state, field, stored, nested);
  }
  return out;
}

function rawRecord(state, record, nested = false) {
  const timestamp = '2026-01-01T00:00:00.000+00:00';
  return {
    type: 'item',
    id: record.id,
    attributes: rawAttributes(state, record.item_type, record.attributes, nested),
    relationships: {
      item_type: { data: { type: 'item_type', id: record.item_type } },
      creator: { data: { type: 'access_token', id: 'emulated' } },
    },
    meta: {
      created_at: timestamp,
      updated_at: timestamp,
      published_at: record.meta?.status === 'draft' ? null : timestamp,
      first_published_at: record.meta?.status === 'draft' ? null : timestamp,
      publication_scheduled_at: null,
      unpublishing_scheduled_at: null,
      status: record.meta?.status ?? 'published',
      is_valid: true,
      is_current_version_valid: true,
      is_published_version_valid: true,
      current_version: String(record.meta?.current_version ?? 1),
      stage: null,
      has_children: null,
    },
  };
}

const rawField = (field) => ({
  type: 'field',
  id: field.id,
  attributes: {
    label: field.label,
    field_type: field.field_type,
    api_key: field.api_key,
    localized: Boolean(field.localized),
    validators: field.validators ?? {},
    position: field.position ?? 0,
    hint: field.hint ?? null,
    default_value: field.default_value ?? null,
    appearance: field.appearance ?? defaultAppearance(field.field_type),
    appeareance: field.appearance ?? defaultAppearance(field.field_type),
    deep_filtering_enabled: Boolean(field.deep_filtering_enabled),
    content_link_enabled: field.content_link_enabled ?? true,
  },
  relationships: {
    item_type: { data: { type: 'item_type', id: field.item_type } },
    fieldset: { data: field.fieldset ? { type: 'fieldset', id: field.fieldset } : null },
  },
});

const relationship = (type, id) => ({ data: id ? { type, id } : null });

const rawItemType = (state, type) => ({
  type: 'item_type',
  id: type.id,
  attributes: {
    name: type.name,
    api_key: type.api_key,
    singleton: Boolean(type.singleton),
    sortable: Boolean(type.sortable),
    modular_block: Boolean(type.modular_block),
    tree: Boolean(type.tree),
    ordering_direction: type.ordering_direction ?? null,
    ordering_meta: type.ordering_meta ?? null,
    draft_mode_active: Boolean(type.draft_mode_active),
    all_locales_required: Boolean(type.all_locales_required),
    collection_appearance: type.collection_appearance ?? 'compact',
    collection_appeareance: type.collection_appearance ?? 'compact',
    hint: type.hint ?? null,
    inverse_relationships_enabled: Boolean(type.inverse_relationships_enabled),
    draft_saving_active: Boolean(type.draft_saving_active),
    has_singleton_item: false,
  },
  relationships: {
    fields: { data: fieldsOf(state, type.id).map((field) => ({ type: 'field', id: field.id })) },
    fieldsets: { data: [] },
    singleton_item: { data: null },
    ordering_field: relationship('field', type.ordering_field),
    title_field: relationship('field', type.title_field),
    image_preview_field: relationship('field', type.image_preview_field),
    excerpt_field: relationship('field', type.excerpt_field),
    presentation_title_field: relationship('field', type.presentation_title_field),
    presentation_image_field: relationship('field', type.presentation_image_field),
    workflow: { data: null },
  },
  meta: { has_singleton_item: false },
});

const defaultAppearance = (fieldType) => ({ editor: catalog.fieldTypes[fieldType].editors[0], parameters: {}, addons: [] });

// ---------------------------------------------------------------- record writes

function normalizeDocument(value) {
  const normalize = (node) => {
    const kept = Object.fromEntries(Object.entries(node).filter(([key]) => key === 'type' || NODE_ATTRIBUTES[node.type].includes(key)));
    if (!kept.children) return kept;
    const children = [];
    for (const child of kept.children.map(normalize)) {
      if (child === null) continue;
      const previous = children.at(-1);
      const marks = (span) => JSON.stringify([...(span.marks ?? [])].sort());
      if (child.type === 'span' && previous?.type === 'span' && marks(child) === marks(previous)) {
        previous.value += child.value;
        continue;
      }
      children.push(child);
    }
    const meaningful = children.filter((child) => !(child.type === 'span' && child.value === '' && children.length > 1));
    if (meaningful.length === 0 && node.type !== 'root') return null;
    return { ...kept, children: meaningful };
  };
  const document = normalize(value.document);
  return document.children.length === 0 ? null : { schema: 'dast', document };
}

function checkTree(node, path) {
  const fail = (message) => {
    throw invalidField(path.root, 'INVALID_FORMAT', { messages: [`Invalid dast format at ${path.at}: ${message}`] });
  };
  if (!NODE_ATTRIBUTES[node?.type]) fail(`unknown node type ${JSON.stringify(node?.type)}`);
  if (node.type === 'heading' && ![1, 2, 3, 4, 5, 6].includes(node.level)) fail('heading level must be 1-6');
  if (node.type === 'list' && !['bulleted', 'numbered'].includes(node.style)) fail('list style must be bulleted or numbered');
  if (node.type === 'span' && typeof node.value !== 'string') fail('span needs a string value');
  if (node.type === 'code' && typeof node.code !== 'string') fail('code needs a string code');
  if (node.type === 'link') {
    if (typeof node.url !== 'string') fail('link needs a url');
    if (/^[\s\u0000-\u001f]*(javascript|vbscript|data):/i.test(node.url)) fail('key "url" cannot use the javascript:, vbscript:, data: schemes');
  }
  const allowed = CHILDREN[node.type];
  if (!allowed) {
    if (node.children) fail(`${node.type} cannot have children`);
    return;
  }
  if (!Array.isArray(node.children)) fail(`${node.type} needs children`);
  node.children.forEach((child, index) => {
    if (!allowed.includes(child?.type)) fail(`"${node.type}" has invalid child "${child?.type}"`);
    checkTree(child, { root: path.root, at: `${path.at}.children.${index}` });
  });
}

/**
 * Turns the value sent for one block slot into the stored block, following the
 * API's rules. `previous` are the blocks of the same field and locale in the
 * record's current version; `context` carries the shared bookkeeping.
 */
function resolveSlot(state, slot, previous, context, path) {
  if (typeof slot === 'string') {
    if (context.creating) {
      throw invalidField(path, 'INVALID_FORMAT', { messages: ['Cannot use IDs instead of block records objects when creating an Item'] });
    }
    const kept = previous.find((block) => block.id === slot);
    if (!kept) {
      throw invalidField(path, 'INVALID_FORMAT', {
        messages: [`Block record ID "${slot}" belongs to another record (or another field/locale on this record); it cannot be referenced in \`${path}\` on this Item`],
      });
    }
    claim(context, slot, path);
    return clone(kept);
  }
  if (!isBlock(slot) || slot.type !== 'item') {
    throw invalidField(path, 'INVALID_FORMAT', { messages: ['A block must be an ID string or an object with `type: "item"` and `attributes`'] });
  }
  const extra = Object.keys(slot).filter((key) => !['type', 'id', 'attributes', 'relationships', 'meta'].includes(key));
  if (extra.length) throw invalidField(path, 'INVALID_FORMAT', { messages: [`Unknown block keys: ${extra.join(', ')}`] });
  const id = slot.id === '' ? undefined : slot.id;
  const existing = id ? previous.find((block) => block.id === id) : undefined;
  let block;
  if (existing) {
    block = clone(existing);
  } else {
    if (id !== undefined) {
      if (!ENTITY_ID.test(id)) throw invalidField(`${path}.id`, 'INVALID_ENTITY_ID');
      if (context.knownBlockIds.has(id) || recordOf(state, id)) {
        throw invalidField(path, 'INVALID_FORMAT', {
          messages: [`Block record ID "${id}" belongs to another record (or another field/locale on this record); it cannot be referenced in \`${path}\` on this Item`],
        });
      }
    }
    const typeId = slot.relationships?.item_type?.data?.id;
    if (!typeId) {
      throw invalidField(path, 'INVALID_FORMAT', { messages: ['New block records require a `relationships.item_type` payload to indicate the Block Model'] });
    }
    const type = itemTypeOf(state, typeId);
    if (!type?.modular_block) {
      throw invalidField(path, 'INVALID_FORMAT', { messages: [`New block records require a block model in \`relationships.item_type\`; "${typeId}" is not a block model`] });
    }
    block = { id: id ?? generateId(), item_type: type.id, attributes: {}, created: true };
    context.created.push(block.id);
  }
  claim(context, block.id, path);
  const fields = fieldsOf(state, block.item_type);
  const unknown = Object.keys(slot.attributes).filter((key) => !fields.some((field) => field.api_key === key));
  if (unknown.length) throw new Rejection('INVALID_ATTRIBUTES', { extraneous_attributes: unknown, field: path });
  for (const field of fields) {
    if (field.api_key in slot.attributes) {
      block.attributes[field.api_key] = writeValue(state, field, slot.attributes[field.api_key], block.attributes[field.api_key], context, `${path}.${field.api_key}`, context.depth + 1);
    } else if (!(field.api_key in block.attributes)) {
      block.attributes[field.api_key] = field.field_type === 'rich_text' ? [] : null;
    }
    checkValidators(state, field, block.attributes[field.api_key], `${path}.${field.api_key}`);
  }
  if (!existing || JSON.stringify(existing.attributes) !== JSON.stringify(block.attributes)) {
    if (existing) context.edited.push(block.id);
  }
  return block;
}

function claim(context, id, path) {
  if (context.seen.has(id)) throw invalidField(path, 'INVALID_FORMAT', { messages: [`Block record ID "${id}" is used twice in this payload`] });
  context.seen.add(id);
}

function allowedModels(field, validator) {
  return field.validators?.[validator]?.item_types ?? [];
}

/** The stored form of one non-localized field value, validated. */
function writeValue(state, field, value, previousValue, context, path, depth = 0) {
  const type = field.field_type;
  const previous = slotBlocks(field, previousValue);
  const deeper = { ...context, depth };
  if (depth > state.limits.blocks_depth - 1 && BLOCK_FIELD_TYPES.includes(type) && value != null && slotBlocks(field, value).length) {
    throw new Rejection('TECHNICAL_LIMIT_REACHED', { limit: 'blocks_depth' });
  }
  const format = () => invalidField(path, 'INVALID_FORMAT', { messages: ['Value not acceptable for this field type'], failing_value: value });
  if (type === 'rich_text') {
    if (value == null) return [];
    if (!Array.isArray(value)) throw format();
    const blocks = value.map((slot, index) => resolveSlot(state, slot, previous, deeper, `${path}.${index}`));
    const allowed = allowedModels(field, 'rich_text_blocks');
    if (blocks.some((block) => !allowed.includes(block.item_type))) throw invalidField(path, 'VALIDATION_RICH_TEXT_BLOCKS');
    return blocks;
  }
  if (type === 'single_block') {
    if (value == null) return null;
    const block = resolveSlot(state, value, previous, deeper, path);
    if (!allowedModels(field, 'single_block_blocks').includes(block.item_type)) throw invalidField(path, 'VALIDATION_SINGLE_BLOCK_BLOCKS');
    return block;
  }
  if (type === 'structured_text') {
    if (value == null) return null;
    if (typeof value !== 'object' || typeof value.schema !== 'string' || typeof value.document !== 'object' || value.document === null) {
      throw invalidField(path, 'INVALID_FORMAT', { messages: ['Value must be an object with .schema and .document'] });
    }
    if (value.schema !== 'dast') throw invalidField(path, 'INVALID_FORMAT', { messages: ['.schema must be "dast"'] });
    if (value.document.type !== 'root') throw invalidField(path, 'INVALID_FORMAT', { messages: ['Invalid dast format: document must be a root node'] });
    checkTree(value.document, { root: path, at: '.document' });
    const resolve = (node, at) => {
      const out = { ...node };
      if (node.type === 'block' || node.type === 'inlineBlock') {
        out.item = resolveSlot(state, node.item, previous, deeper, `${at}.item`);
        const validator = node.type === 'block' ? 'structured_text_blocks' : 'structured_text_inline_blocks';
        if (!allowedModels(field, validator).includes(out.item.item_type)) throw invalidField(path, `VALIDATION_${validator.toUpperCase()}`);
      }
      if (node.type === 'itemLink' || node.type === 'inlineItem') {
        if (typeof node.item !== 'string') throw invalidField(path, 'INVALID_FORMAT', { messages: [`node in document at path ${at} is invalid: key "item" must be a string`] });
        const target = recordOf(state, node.item);
        if (!target) throw invalidField(path, 'INVALID_FORMAT', { messages: ['some item IDs referenced in the document are invalid'] });
        if (!allowedModels(field, 'structured_text_links').includes(target.item_type)) throw invalidField(path, 'VALIDATION_STRUCTURED_TEXT_LINKS');
      }
      if (node.children) out.children = node.children.map((child, index) => resolve(child, `${at}.children.${index}`));
      return out;
    };
    return normalizeDocument({ schema: 'dast', document: resolve(value.document, `${path}.document`) });
  }
  if (value == null) return type === 'string' || type === 'text' ? '' : type === 'boolean' ? false : type === 'links' || type === 'gallery' ? [] : null;
  const isObject = typeof value === 'object' && !Array.isArray(value);
  const ok = {
    string: () => typeof value === 'string',
    text: () => typeof value === 'string',
    slug: () => typeof value === 'string',
    integer: () => Number.isInteger(value),
    float: () => typeof value === 'number',
    boolean: () => typeof value === 'boolean',
    date: () => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
    date_time: () => typeof value === 'string' && !Number.isNaN(Date.parse(value)),
    json: () => typeof value === 'string' && isJson(value),
    color: () => isObject && ['red', 'green', 'blue', 'alpha'].every((key) => Number.isInteger(value[key]) && value[key] >= 0 && value[key] <= 255) && Object.keys(value).length === 4,
    lat_lon: () => isObject && typeof value.latitude === 'number' && typeof value.longitude === 'number',
    seo: () => isObject && Object.keys(value).every((key) => ['title', 'description', 'image', 'twitter_card', 'no_index'].includes(key)),
    video: () => isObject && ['provider', 'provider_uid', 'url', 'width', 'height', 'thumbnail_url', 'title'].every((key) => value[key] != null),
    file: () => isObject && typeof value.upload_id === 'string',
    gallery: () => Array.isArray(value) && value.every((entry) => typeof entry?.upload_id === 'string'),
    link: () => typeof value === 'string',
    links: () => Array.isArray(value) && value.every((entry) => typeof entry === 'string'),
  }[type];
  if (!ok()) throw format();
  for (const id of type === 'link' ? [value] : type === 'links' ? value : []) {
    const target = recordOf(state, id);
    if (!target) throw invalidField(path, 'INVALID_FORMAT', { messages: ['some item IDs are invalid'] });
    const validator = type === 'link' ? 'item_item_type' : 'items_item_type';
    if (!allowedModels(field, validator).includes(target.item_type)) throw invalidField(path, `VALIDATION_${validator.toUpperCase()}`);
  }
  return clone(value);
}

function isJson(text) {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function checkValidators(state, field, value, path) {
  const validators = field.validators ?? {};
  const empty = value == null || value === '' || (Array.isArray(value) && value.length === 0);
  if (validators.required && empty) throw invalidField(path, 'VALIDATION_REQUIRED');
  if (validators.enum && !empty && !validators.enum.values.includes(value)) throw invalidField(path, 'VALIDATION_ENUM');
  if (validators.length && typeof value === 'string') {
    const { min, max, eq } = validators.length;
    if ((min != null && value.length < min) || (max != null && value.length > max) || (eq != null && value.length !== eq)) throw invalidField(path, 'VALIDATION_LENGTH');
  }
  if (validators.size && Array.isArray(value)) {
    const { min, max, eq } = validators.size;
    if ((min != null && value.length < min) || (max != null && value.length > max) || (eq != null && value.length !== eq)) throw invalidField(path, 'VALIDATION_SIZE');
  }
  if (validators.format?.predefined_pattern === 'url' && !empty && !/^https?:\/\/\S+$/.test(value)) throw invalidField(path, 'VALIDATION_FORMAT');
}

function writeRecord(state, record, attributes, creating) {
  const type = itemTypeOf(state, record.item_type);
  const fields = fieldsOf(state, type.id);
  const unknown = Object.keys(attributes).filter((key) => !fields.some((field) => field.api_key === key));
  if (unknown.length) throw new Rejection('INVALID_ATTRIBUTES', { extraneous_attributes: unknown });
  const context = { creating, seen: new Set(), created: [], edited: [], knownBlockIds: allBlockIds(state), depth: 0 };
  const next = clone(record.attributes);
  // On create, a localized field left out gets the locales of the localized fields that were sent.
  const sentLocales = [...new Set(fields.filter((field) => field.localized).flatMap((field) => {
    const value = attributes[field.api_key];
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : [];
  }))];
  for (const field of fields) {
    const sent = field.api_key in attributes;
    if (!sent && !creating) continue;
    const value = attributes[field.api_key];
    if (field.localized) {
      if (value === null || typeof value !== 'object' || Array.isArray(value) || 'schema' in (value ?? {})) {
        if (sent) throw invalidField(field.api_key, 'LOCALIZATION_HASH_REQUIRED');
        next[field.api_key] = Object.fromEntries(sentLocales.map((locale) => [locale, writeValue(state, field, null, undefined, context, `${field.api_key}.${locale}`)]));
        continue;
      }
      const bad = Object.keys(value).filter((locale) => !state.locales.includes(locale));
      if (bad.length) throw invalidField(field.api_key, 'INVALID_LOCALES', { locales: bad });
      next[field.api_key] = Object.fromEntries(
        Object.entries(value).map(([locale, localeValue]) => {
          const stored = writeValue(state, field, localeValue, record.attributes[field.api_key]?.[locale], context, `${field.api_key}.${locale}`);
          checkValidators(state, field, stored, field.api_key);
          return [locale, stored];
        }),
      );
    } else {
      next[field.api_key] = writeValue(state, field, value, record.attributes[field.api_key], context, field.api_key);
      checkValidators(state, field, next[field.api_key], field.api_key);
    }
  }
  const localeSets = fields.filter((field) => field.localized).map((field) => Object.keys(next[field.api_key] ?? {}).sort().join());
  if (new Set(localeSets).size > 1) {
    throw new Rejection('INVALID_LOCALES', { message: 'All localized fields of a record must have the same locales; send every localized field when adding or removing a locale' });
  }
  if (type.all_locales_required && localeSets.some((set) => set !== [...state.locales].sort().join())) {
    throw new Rejection('MISSING_LOCALES', {});
  }
  let count = 0;
  for (const field of fields) {
    if (!BLOCK_FIELD_TYPES.includes(field.field_type)) continue;
    const values = field.localized ? Object.values(next[field.api_key] ?? {}) : [next[field.api_key]];
    for (const value of values) blocksIn(state, field, value, () => (count += 1));
  }
  if (count > state.limits.blocks_per_item) throw new Rejection('TECHNICAL_LIMIT_REACHED', { limit: 'blocks_per_item' });
  return { attributes: next, created: context.created, edited: context.edited };
}

// ---------------------------------------------------------------- schema writes

function checkApiKey(value) {
  if (typeof value !== 'string' || !API_KEY.test(value)) throw invalidField('api_key', 'API_KEY_FORMAT_INVALID');
}

function checkFieldConfig(state, type, attributes, relationships, existing) {
  const fieldType = attributes.field_type;
  const spec = catalog.fieldTypes[fieldType];
  if (!spec) throw invalidField('field_type', 'VALIDATION_INCLUSION');
  for (const key of ['label', 'api_key']) if (!attributes[key]) throw invalidField(key, 'VALIDATION_REQUIRED');
  checkApiKey(attributes.api_key);
  const siblings = fieldsOf(state, type.id).filter((field) => field.id !== existing?.id);
  if (siblings.some((field) => field.api_key === attributes.api_key)) throw invalidField('api_key', 'VALIDATION_UNIQUENESS');
  if (siblings.some((field) => field.label === attributes.label)) throw invalidField('label', 'VALIDATION_UNIQUENESS');
  if (type.modular_block && attributes.localized) throw invalidField('localized', 'VALIDATION_INVALID');
  if (type.modular_block && relationships?.fieldset?.data) throw new Rejection('INVALID_RELATIONSHIP', { field: 'fieldset' });
  if (attributes.deep_filtering_enabled && (type.modular_block || !BLOCK_FIELD_TYPES.includes(fieldType))) throw invalidField('deep_filtering_enabled', 'VALIDATION_INVALID');
  if (attributes.default_value != null && !spec.defaultValue) throw invalidField('default_value', 'FIELD_DOES_NOT_SUPPORT_DEFAULT_VALUE');

  const validators = attributes.validators ?? {};
  if (typeof validators !== 'object' || Array.isArray(validators)) throw invalidField('validators', 'VALIDATION_INVALID');
  for (const name of spec.required) if (!(name in validators)) throw invalidField(`validators.${name}`, 'VALIDATION_REQUIRED');
  for (const [name, options] of Object.entries(validators)) {
    if (!spec.validators.includes(name)) throw invalidField(`validators.${name}`, 'VALIDATION_INVALID', { message: 'validator not applicable on field type' });
    if (type.modular_block && name === 'unique') throw invalidField('validators.unique', 'VALIDATION_INVALID', { message: 'validator not applicable inside a modular block: unique' });
    if (options === null || typeof options !== 'object' || Array.isArray(options)) throw invalidField(`validators.${name}`, 'VALIDATION_INVALID');
    const extra = Object.keys(options).filter((key) => !catalog.validators[name].includes(key));
    if (extra.length) throw invalidField(`validators.${name}`, 'VALIDATION_INVALID', { message: `extra attributes: ${extra.join(', ')}` });
    if (BLOCK_VALIDATORS.includes(name) || LINK_VALIDATORS.includes(name)) {
      if (!Array.isArray(options.item_types)) throw invalidField(`validators.${name}.item_types`, 'VALIDATION_NOT_AN_ARRAY');
      const wantBlocks = BLOCK_VALIDATORS.includes(name);
      for (const id of options.item_types) {
        const target = state.itemTypes.find((candidate) => candidate.id === id);
        if (!target || Boolean(target.modular_block) !== wantBlocks) throw invalidField(`validators.${name}.item_types`, 'VALIDATION_INVALID');
      }
      for (const [strategy, values] of Object.entries(catalog.strategies)) {
        if (options[strategy] !== undefined && !values.includes(options[strategy])) throw invalidField(`validators.${name}.${strategy}`, 'VALIDATION_INCLUSION');
      }
    }
    if (['length', 'size', 'number_range', 'date_range', 'date_time_range'].includes(name)) {
      if (!['min', 'max', 'eq'].some((key) => options[key] != null)) throw invalidField(`validators.${name}`, 'VALIDATION_AT_LEAST_ONE_OPTION_REQUIRED');
    }
    if (name === 'enum' && !(Array.isArray(options.values) && options.values.length)) throw invalidField('validators.enum.values', 'VALIDATION_REQUIRED');
    if (name === 'format' || name === 'slug_format') {
      if (Boolean(options.predefined_pattern) === Boolean(options.custom_pattern)) throw invalidField(`validators.${name}`, 'VALIDATION_INVALID');
      const allowed = name === 'format' ? ['email', 'url'] : ['webpage_slug'];
      if (options.predefined_pattern && !allowed.includes(options.predefined_pattern)) throw invalidField(`validators.${name}.predefined_pattern`, 'VALIDATION_INCLUSION');
    }
    if (name === 'slug_title_field') {
      const source = state.fields.find((field) => field.id === options.title_field_id);
      if (!source || source.item_type !== type.id || source.field_type !== 'string') throw invalidField('validators.slug_title_field.title_field_id', 'VALIDATION_INVALID');
    }
    if (name === 'extension') {
      if (!options.predefined_list && !options.extensions) throw invalidField('validators.extension', 'VALIDATION_INVALID');
      if (options.predefined_list && !['image', 'transformable_image', 'video', 'document'].includes(options.predefined_list)) throw invalidField('validators.extension.predefined_list', 'VALIDATION_INCLUSION');
    }
    if (name === 'file_size') {
      for (const side of ['min', 'max']) {
        if ((options[`${side}_value`] == null) !== (options[`${side}_unit`] == null)) throw invalidField('validators.file_size', 'VALIDATION_INVALID');
        if (options[`${side}_unit`] != null && !['B', 'KB', 'MB'].includes(options[`${side}_unit`])) throw invalidField('validators.file_size', 'VALIDATION_INCLUSION');
      }
      if (options.min_value == null && options.max_value == null) throw invalidField('validators.file_size', 'VALIDATION_AT_LEAST_ONE_OPTION_REQUIRED');
    }
    if ((name === 'required_alt_title' || name === 'required_seo_fields') && !Object.values(options).some((flag) => flag === true)) {
      throw invalidField(`validators.${name}`, 'VALIDATION_AT_LEAST_ONE_OPTION_REQUIRED');
    }
  }

  if (attributes.appearance !== undefined) {
    const appearance = attributes.appearance;
    for (const key of ['editor', 'parameters', 'addons']) {
      if (appearance === null || !(key in appearance)) throw invalidField(key === 'editor' ? 'appearance.editor' : key, 'VALIDATION_REQUIRED');
    }
    if (!Array.isArray(appearance.addons)) throw invalidField('addons', 'VALIDATION_INVALID');
    if (!appearance.field_extension) {
      if (!spec.editors.includes(appearance.editor)) throw invalidField('appearance.editor', 'VALIDATION_INVALID', { message: 'editor not applicable on field type' });
      const parameters = Object.keys(appearance.parameters ?? {});
      const extra = parameters.filter((key) => !catalog.editors[appearance.editor].includes(key));
      if (extra.length) throw invalidField('appearance.parameters', 'VALIDATION_INVALID', { message: `invalid attribute: ${extra.join(', ')}` });
      for (const needed of catalog.requiredEditorParameters[appearance.editor] ?? []) {
        const merged = existing?.appearance?.editor === appearance.editor ? { ...existing.appearance.parameters, ...appearance.parameters } : appearance.parameters;
        if (merged[needed] == null) throw invalidField(`appearance.parameters.${needed}`, 'VALIDATION_REQUIRED');
      }
    }
  }
}

function checkItemType(state, attributes, existing) {
  if (!attributes.name) throw invalidField('name', 'VALIDATION_REQUIRED');
  checkApiKey(attributes.api_key);
  if (/(ies|[^su]s)$/.test(attributes.api_key) && !/(ss|is)$/.test(attributes.api_key)) throw invalidField('api_key', 'VALIDATION_PLURAL');
  if (state.itemTypes.some((type) => type.id !== existing?.id && (type.api_key === attributes.api_key || type.name === attributes.name))) {
    throw invalidField('api_key', 'VALIDATION_UNIQUENESS');
  }
  if (existing && attributes.modular_block !== undefined && Boolean(attributes.modular_block) !== Boolean(existing.modular_block)) {
    throw invalidField('modular_block', 'VALIDATION_INVALID', { message: 'Once a model is created it cannot be switched to modular block, and viceversa' });
  }
  if (attributes.modular_block) {
    for (const key of ['singleton', 'sortable', 'tree', 'draft_mode_active', 'draft_saving_active', 'inverse_relationships_enabled']) {
      if (attributes[key]) throw invalidField(key, 'VALIDATION_INVALID');
    }
  }
}

// ---------------------------------------------------------------- routing

function route(state, request, path) {
  const { method, body } = request;
  const query = request.queryParams ?? {};
  const nested = query.nested === true || query.nested === 'true';
  let match;

  if (method === 'GET' && path === '/site') {
    const data = { type: 'site', id: 'site', attributes: { name: 'Emulated', locales: state.locales, timezone: 'UTC' }, relationships: { item_types: { data: state.itemTypes.map((type) => ({ type: 'item_type', id: type.id })) } } };
    const included = String(query.include ?? '').includes('item_types') ? [...state.itemTypes.map((type) => rawItemType(state, type)), ...state.fields.map(rawField)] : undefined;
    return included ? { data, included } : { data };
  }
  if (method === 'GET' && path === '/public-info') {
    return { data: { type: 'public_info', id: 'site', attributes: { blocks_per_item: state.limits.blocks_per_item, blocks_depth: state.limits.blocks_depth } } };
  }

  if (path === '/item-types') {
    if (method === 'GET') return { data: state.itemTypes.map((type) => rawItemType(state, type)) };
    if (method === 'POST') {
      const attributes = body.data.attributes ?? {};
      checkItemType(state, attributes);
      const type = { ...attributes, id: body.data.id ?? generateId(), created: true };
      state.itemTypes.push(type);
      state.writes.push({ kind: 'item_type.create', id: type.id });
      return { data: rawItemType(state, type) };
    }
  }
  if ((match = path.match(/^\/item-types\/([^/]+)$/))) {
    const type = itemTypeOf(state, match[1]);
    if (!type) throw new Rejection('NOT_FOUND', {}, 404);
    if (method === 'GET') return { data: rawItemType(state, type) };
    if (method === 'PUT') {
      const attributes = { ...type, ...(body.data.attributes ?? {}) };
      checkItemType(state, attributes, type);
      Object.assign(type, body.data.attributes ?? {});
      for (const [name, value] of Object.entries(body.data.relationships ?? {})) {
        const id = value?.data?.id ?? null;
        if (id && !fieldsOf(state, type.id).some((field) => field.id === id)) throw new Rejection('FIELD_DOES_NOT_BELONG_TO_ITEM_TYPE', { field: name });
        type[name] = id;
      }
      state.writes.push({ kind: 'item_type.update', id: type.id });
      return { data: rawItemType(state, type) };
    }
  }
  if ((match = path.match(/^\/item-types\/([^/]+)\/fields$/))) {
    const type = itemTypeOf(state, match[1]);
    if (!type) throw new Rejection('NOT_FOUND', {}, 404);
    if (method === 'GET') return { data: fieldsOf(state, type.id).map(rawField) };
    if (method === 'POST') {
      const attributes = body.data.attributes ?? {};
      checkFieldConfig(state, type, attributes, body.data.relationships);
      const field = { ...attributes, appearance: attributes.appearance ?? attributes.appeareance, id: body.data.id ?? generateId(), item_type: type.id, created: true };
      state.fields.push(field);
      state.writes.push({ kind: 'field.create', id: field.id });
      return { data: rawField(field) };
    }
  }
  if ((match = path.match(/^\/fields\/([^/]+)$/))) {
    const field = state.fields.find((candidate) => candidate.id === match[1]);
    if (!field) throw new Rejection('NOT_FOUND', {}, 404);
    if (method === 'GET') return { data: rawField(field) };
    if (method === 'PUT') {
      const sent = body.data.attributes ?? {};
      const next = { ...field, ...sent };
      checkFieldConfig(state, itemTypeOf(state, field.item_type), next, body.data.relationships, field);
      if (sent.appearance && field.appearance?.editor === sent.appearance.editor) {
        next.appearance = { ...sent.appearance, parameters: { ...field.appearance.parameters, ...sent.appearance.parameters } };
      }
      Object.assign(field, next);
      state.writes.push({ kind: 'field.update', id: field.id });
      return { data: rawField(field) };
    }
  }

  if (path === '/items') {
    if (method === 'GET') {
      let records = state.records;
      const filter = query.filter ?? {};
      if (filter.type) {
        const types = String(filter.type).split(',').map((key) => itemTypeOf(state, key)?.id);
        records = records.filter((record) => types.includes(record.item_type));
      }
      if (filter.ids) records = records.filter((record) => String(filter.ids).split(',').includes(record.id));
      const limit = Number(query.page?.limit ?? 30);
      const offset = Number(query.page?.offset ?? 0);
      if (nested && limit > 30) throw new Rejection('INVALID_PARAMS', { message: 'With nested=true, page[limit] must be <= 30' });
      return { data: records.slice(offset, offset + limit).map((record) => rawRecord(state, record, nested)), meta: { total_count: records.length } };
    }
    if (method === 'POST') {
      const typeId = body.data.relationships?.item_type?.data?.id;
      const type = itemTypeOf(state, typeId);
      if (!type || type.modular_block) throw new Rejection('NOT_FOUND', {}, 404);
      const record = { id: body.data.id ?? generateId(), item_type: type.id, attributes: {}, meta: { status: type.draft_mode_active ? 'draft' : 'published', current_version: 1 } };
      const result = writeRecord(state, record, body.data.attributes ?? {}, true);
      record.attributes = result.attributes;
      state.records.push(record);
      state.writes.push({ kind: 'item.create', id: record.id, createdBlocks: result.created });
      return { data: rawRecord(state, record) };
    }
  }
  if ((match = path.match(/^\/items\/([^/]+)$/))) {
    const record = recordOf(state, match[1]);
    if (!record) {
      if (method === 'GET' && allBlockIds(state).has(match[1])) throw new Error('Reading a block by ID is not emulated');
      throw new Rejection('NOT_FOUND', {}, 404);
    }
    if (method === 'GET') return { data: rawRecord(state, record, nested) };
    if (method === 'PUT') {
      const version = body.data.meta?.current_version;
      if (version !== undefined && String(version) !== String(record.meta?.current_version ?? 1)) throw new Rejection('STALE_ITEM_VERSION', {});
      const sent = body.data.attributes ?? {};
      const result = writeRecord(state, record, sent, false);
      record.attributes = result.attributes;
      record.meta = { ...(record.meta ?? {}), current_version: Number(record.meta?.current_version ?? 1) + 1 };
      state.writes.push({ kind: 'item.update', id: record.id, fields: Object.keys(sent), payload: clone(sent), createdBlocks: result.created, editedBlocks: result.edited });
      return { data: rawRecord(state, record) };
    }
  }
  if ((match = path.match(/^\/items\/([^/]+)\/(publish|unpublish)$/)) && method === 'PUT') {
    const record = recordOf(state, match[1]);
    if (!record) throw new Rejection('NOT_FOUND', {}, 404);
    state.published.push({ id: record.id, action: match[2] });
    record.meta = { ...(record.meta ?? {}), status: match[2] === 'publish' ? 'published' : 'draft' };
    return { data: rawRecord(state, record) };
  }
  throw new Error(`The emulated API does not implement ${method} ${request.url}`);
}
