// Checks statements of the CMA references against the real API.
//
//   node dev/evals/tasks/live-facts.mjs
//
// Each check performs one request in a throwaway sandbox environment of the
// empty project in dev/.env and compares the API's answer with what
// skills/datocms-cma/references/{field-types,schema,records,editing-records}.md
// say. A failing check means the reference is wrong or the API changed: fix the
// reference (and dev/tests/fixtures/field-types.json), not the check.
import { resolve } from 'node:path';
import { ApiError, buildBlockRecord, buildClient, generateId } from '@datocms/cma-client-node';
import { config as loadEnv } from 'dotenv';

const devRoot = resolve(import.meta.dirname, '../..');
loadEnv({ path: [resolve(devRoot, '.env.local'), resolve(devRoot, '.env')], quiet: true });
const apiToken = (process.env.E2E_DATOCMS_API_TOKEN ?? '').trim();
if (!apiToken) throw new Error('E2E_DATOCMS_API_TOKEN is not set in dev/.env');

const primary = buildClient({ apiToken });
const environment = `eval-facts-${Date.now().toString(36)}`;
const client = buildClient({ apiToken, environment });
const results = [];

/** The `details` of the first API error a call throws, or null when it succeeds. */
async function rejection(call) {
  try {
    await call();
    return null;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const first = error.errors[0]?.attributes ?? {};
    // `code` is the error's own code; `reason` the validation code inside its details.
    return { ...(first.details ?? {}), reason: first.details?.code, code: first.code };
  }
}

async function check(statement, run) {
  try {
    const problem = await run();
    results.push({ statement, ok: !problem, problem });
  } catch (error) {
    results.push({ statement, ok: false, problem: String(error?.message ?? error).slice(0, 300) });
  }
  const last = results.at(-1);
  console.log(`${last.ok ? 'ok  ' : 'FAIL'} ${statement}${last.ok ? '' : `\n       ${last.problem}`}`);
}

const expectRejection = (details, expected) => {
  if (!details) return 'the API accepted it';
  for (const [key, value] of Object.entries(expected)) {
    if (details[key] !== value) return `expected ${key}=${value}, got ${JSON.stringify(details)}`;
  }
  return null;
};

const main = (await primary.environments.list()).find((entry) => entry.meta.primary);
if ((await primary.itemTypes.list()).length > 0) throw new Error('The primary environment is not empty: refusing to use this project');
await primary.environments.fork(main.id, { id: environment });

try {
  await client.site.update({ locales: ['en', 'it'] });
  const block = await client.itemTypes.create({ name: 'Card', api_key: 'card', modular_block: true });
  const cardTitle = await client.fields.create(block.id, { label: 'Title', api_key: 'title', field_type: 'string', validators: { required: {} } });
  const other = await client.itemTypes.create({ name: 'Badge', api_key: 'badge', modular_block: true });
  await client.fields.create(other.id, { label: 'Text', api_key: 'text', field_type: 'string' });
  const model = await client.itemTypes.create({ name: 'Page', api_key: 'page', draft_mode_active: true });
  const title = await client.fields.create(model.id, { label: 'Title', api_key: 'title', field_type: 'string' });
  // Field configuration is probed on a model of its own, so that no probe field constrains the records below.
  const probe = await client.itemTypes.create({ name: 'Probe', api_key: 'probe' });
  const field = (attributes) => client.fields.create(probe.id, attributes);
  const pageField = (attributes) => client.fields.create(model.id, attributes);

  // ---- field configuration (field-types.md, schema.md)
  await check('a `links` field without `items_item_type` is rejected with VALIDATION_REQUIRED on `validators.items_item_type`', async () =>
    expectRejection(await rejection(() => field({ label: 'L1', api_key: 'l_one', field_type: 'links', validators: {} })), { code: 'INVALID_FIELD', reason: 'VALIDATION_REQUIRED', field: 'validators.items_item_type' }));
  await check('a `structured_text` field needs `structured_text_links` as well as `structured_text_blocks`', async () =>
    expectRejection(await rejection(() => field({ label: 'S1', api_key: 's_one', field_type: 'structured_text', validators: { structured_text_blocks: { item_types: [] } } })), { field: 'validators.structured_text_links' }));
  await check('`appearance` without `addons` is rejected', async () =>
    expectRejection(await rejection(() => field({ label: 'A1', api_key: 'a_one', field_type: 'string', appearance: { editor: 'single_line', parameters: {} } })), { code: 'INVALID_FORMAT' }));
  await check('an unknown editor parameter is rejected', async () =>
    expectRejection(await rejection(() => field({ label: 'A2', api_key: 'a_two', field_type: 'string', appearance: { editor: 'single_line', parameters: { made_up: true }, addons: [] } })), { code: 'INVALID_FIELD', field: 'appearance.parameters.made_up' }));
  await check('`string_radio_group` takes `radios`, not `options`', async () => {
    const wrong = await rejection(() => field({ label: 'R1', api_key: 'r_one', field_type: 'string', appearance: { editor: 'string_radio_group', parameters: { options: [{ label: 'A', value: 'a' }] }, addons: [] } }));
    if (!wrong) return 'the API accepted `options`';
    const right = await rejection(() => field({ label: 'R2', api_key: 'r_two', field_type: 'string', appearance: { editor: 'string_radio_group', parameters: { radios: [{ label: 'A', value: 'a' }] }, addons: [] } }));
    return right ? `\`radios\` was rejected: ${JSON.stringify(right)}` : null;
  });
  await check('`boolean` accepts no validator, not even `required`', async () =>
    expectRejection(await rejection(() => field({ label: 'B1', api_key: 'b_one', field_type: 'boolean', validators: { required: {} } })), { code: 'INVALID_FIELD', field: 'validators.required' }));
  await check('`gallery` has no `required`; `size: { min: 1 }` is accepted', async () => {
    const wrong = await rejection(() => field({ label: 'G1', api_key: 'g_one', field_type: 'gallery', validators: { required: {} } }));
    if (!wrong) return 'the API accepted `required` on a gallery';
    const right = await rejection(() => field({ label: 'G2', api_key: 'g_two', field_type: 'gallery', validators: { size: { min: 1 } } }));
    return right ? `size was rejected: ${JSON.stringify(right)}` : null;
  });
  await check('a link validator rejects a block model in `item_types`', async () =>
    expectRejection(await rejection(() => field({ label: 'L2', api_key: 'l_two', field_type: 'link', validators: { item_item_type: { item_types: [block.id] } } })), { code: 'INVALID_FIELD', field: 'validators.item_item_type.item_types' }));
  await check('`default_value` on a slug field is rejected with FIELD_DOES_NOT_SUPPORT_DEFAULT_VALUE', async () => {
    const details = await rejection(() => field({ label: 'Slug', api_key: 'slug', field_type: 'slug', default_value: 'x' }));
    return details && JSON.stringify(details).includes('FIELD_DOES_NOT_SUPPORT_DEFAULT_VALUE') ? null : `got ${JSON.stringify(details)}`;
  });
  await check('api_key `field_1` is rejected (underscore before a digit) and `field1` accepted', async () => {
    const wrong = await rejection(() => field({ label: 'K1', api_key: 'field_1', field_type: 'string' }));
    if (!wrong) return 'the API accepted `field_1`';
    const right = await rejection(() => field({ label: 'K2', api_key: 'field1', field_type: 'string' }));
    return right ? `field1 was rejected: ${JSON.stringify(right)}` : null;
  });
  await check('a plural model api_key is rejected', async () =>
    expectRejection(await rejection(() => client.itemTypes.create({ name: 'Posts', api_key: 'blog_posts' })), { code: 'INVALID_FIELD', reason: 'VALIDATION_PLURAL', field: 'api_key' }));
  await check('a field of a block model cannot be localized', async () =>
    expectRejection(await rejection(() => client.fields.create(block.id, { label: 'Loc', api_key: 'loc', field_type: 'string', localized: true })), { code: 'INVALID_FIELD', field: 'localized' }));
  await check('`modular_block` cannot be changed after creation', async () =>
    expectRejection(await rejection(() => client.itemTypes.update(model.id, { modular_block: true })), { code: 'INVALID_FIELD', field: 'modular_block' }));
  await check('`fields.update` replaces the whole `validators` object and merges editor parameters', async () => {
    const created = await field({ label: 'U1', api_key: 'u_one', field_type: 'string', validators: { required: {}, length: { max: 10 } }, appearance: { editor: 'single_line', parameters: { heading: true, placeholder: 'x' }, addons: [] } });
    const updated = await client.fields.update(created.id, { validators: { length: { max: 20 } }, appearance: { editor: 'single_line', parameters: { placeholder: 'y' }, addons: [] } });
    if ('required' in updated.validators) return '`required` survived an update that did not send it';
    return updated.appearance.parameters.heading === true ? null : `heading was not kept: ${JSON.stringify(updated.appearance.parameters)}`;
  });
  await check('changing `field_type` ignores other attributes of the same request and resets validators', async () => {
    const created = await field({ label: 'C1', api_key: 'c_one', field_type: 'string', validators: { length: { max: 10 } } });
    const updated = await client.fields.update(created.id, { field_type: 'text', label: 'Renamed' });
    if (updated.field_type !== 'text') return `type is ${updated.field_type}`;
    if (updated.label !== 'C1') return `the label changed to ${updated.label}`;
    return Object.keys(updated.validators).length === 0 ? null : `validators kept: ${JSON.stringify(updated.validators)}`;
  });
  await check('a field type outside the five pairs cannot be converted (`string` to `slug`)', async () => {
    const created = await field({ label: 'C2', api_key: 'c_two', field_type: 'string' });
    return expectRejection(await rejection(() => client.fields.update(created.id, { field_type: 'slug' })), { code: 'INVALID_FIELD', field: 'field_type' });
  });

  await check('`string` to `text` keeps `required` and `format`, drops `length`, `unique` and `enum`, and keeps the shared editor parameter', async () => {
    const created = await field({ label: 'V1', api_key: 'v_one', field_type: 'string', validators: { required: {}, unique: {}, length: { max: 60 }, format: { predefined_pattern: 'email' } }, appearance: { editor: 'single_line', parameters: { heading: true, placeholder: 'ph' }, addons: [] } });
    const updated = await client.fields.update(created.id, { field_type: 'text' });
    const kept = Object.keys(updated.validators).sort().join();
    if (kept !== 'format,required') return `validators kept: ${kept}`;
    return updated.appearance.editor === 'textarea' && updated.appearance.parameters.placeholder === 'ph' ? null : `appearance is ${JSON.stringify(updated.appearance)}`;
  });
  await check('`integer` to `float` keeps `required` and drops `number_range`', async () => {
    const created = await field({ label: 'V2', api_key: 'v_two', field_type: 'integer', validators: { required: {}, number_range: { min: 1, max: 9 } } });
    const kept = Object.keys((await client.fields.update(created.id, { field_type: 'float' })).validators).join();
    return kept === 'required' ? null : `validators kept: ${kept}`;
  });
  await check('`image_dimensions` needs width and height together', async () => {
    const alone = await rejection(() => field({ label: 'V3', api_key: 'v_three', field_type: 'file', validators: { image_dimensions: { width_min_value: 1200 } } }));
    if (!alone) return 'the API accepted a width alone';
    const both = await rejection(() => field({ label: 'V4', api_key: 'v_four', field_type: 'file', validators: { image_dimensions: { width_min_value: 1200, height_min_value: 1 } } }));
    return both ? `width and height were rejected: ${JSON.stringify(both)}` : null;
  });
  await check('a model created without `draft_mode_active` has draft mode on', async () =>
    (probe.draft_mode_active === true ? null : `draft_mode_active is ${probe.draft_mode_active}`));
  await check('a custom pattern matches anywhere in the value unless anchored', async () => {
    const loose = await client.itemTypes.create({ name: 'Loose', api_key: 'loose' });
    const sku = await client.fields.create(loose.id, { label: 'Sku', api_key: 'sku', field_type: 'string', validators: { format: { custom_pattern: '[A-Z0-9]{6}' } } });
    const create = () => client.items.create({ item_type: { type: 'item_type', id: loose.id }, sku: 'xxAB12CDxx' });
    if (await rejection(create)) return 'the unanchored pattern rejected a value that contains a match';
    await client.fields.update(sku.id, { validators: { format: { custom_pattern: '^[A-Z0-9]{6}$' } } });
    return (await rejection(create)) ? null : 'the anchored pattern accepted a longer value';
  });
  await check('on a model without draft mode every write is published at once', async () => {
    const live = await client.itemTypes.create({ name: 'Live', api_key: 'live', draft_mode_active: false });
    await client.fields.create(live.id, { label: 'Title', api_key: 'title', field_type: 'string' });
    const created = await client.items.create({ item_type: { type: 'item_type', id: live.id }, title: 'a' });
    await client.items.update(created.id, { title: 'b' });
    const published = await client.items.find(created.id, { version: 'published' });
    return created.meta.status === 'published' && published.title === 'b' ? null : `status ${created.meta.status}, published title ${published.title}`;
  });

  // ---- record values (records.md)
  await pageField({ label: 'Subtitle', api_key: 'subtitle', field_type: 'string' });
  await pageField({ label: 'Flag', api_key: 'flag', field_type: 'boolean' });
  await pageField({ label: 'Data', api_key: 'data', field_type: 'json' });
  await pageField({ label: 'Tint', api_key: 'tint', field_type: 'color' });
  await pageField({ label: 'Starts at', api_key: 'starts_at', field_type: 'date_time' });
  await pageField({ label: 'Tagline', api_key: 'tagline', field_type: 'string', localized: true });
  await pageField({ label: 'Summary', api_key: 'summary', field_type: 'string', localized: true });
  const sections = await pageField({ label: 'Sections', api_key: 'sections', field_type: 'rich_text', validators: { rich_text_blocks: { item_types: [block.id, other.id] } } });
  await pageField({ label: 'Sidebar', api_key: 'sidebar', field_type: 'rich_text', validators: { rich_text_blocks: { item_types: [block.id] } } });
  await pageField({ label: 'Body', api_key: 'body', field_type: 'structured_text', validators: { structured_text_blocks: { item_types: [block.id] }, structured_text_links: { item_types: [] } } });
  const card = (attributes) => buildBlockRecord({ item_type: { type: 'item_type', id: block.id }, ...attributes });
  const record = await client.items.create({
    item_type: { type: 'item_type', id: model.id },
    title: 'One', subtitle: null, flag: null, data: JSON.stringify({ a: 1 }), tint: { red: 255, green: 0, blue: 0, alpha: 255 },
    tagline: { en: 'Hello' }, summary: { en: 'Short' },
    sections: [card({ title: 'First' }), card({ title: 'Second' }), buildBlockRecord({ item_type: { type: 'item_type', id: other.id }, text: 'Badge' })],
  });

  await check('a `null` string reads back as "" and a `null` boolean as false', async () => {
    const read = await client.items.find(record.id);
    return read.subtitle === '' && read.flag === false ? null : `subtitle=${JSON.stringify(read.subtitle)} flag=${JSON.stringify(read.flag)}`;
  });
  await check('a `json` field takes and returns a JSON string, and rejects a raw object', async () => {
    const read = await client.items.find(record.id);
    if (typeof read.data !== 'string' || JSON.parse(read.data).a !== 1) return `read back ${JSON.stringify(read.data)}`;
    return expectRejection(await rejection(() => client.items.update(record.id, { data: { a: 2 } })), { code: 'INVALID_FIELD', field: 'data' });
  });
  await check('a hex string is rejected for a `color` field', async () =>
    expectRejection(await rejection(() => client.items.update(record.id, { tint: '#FF0000' })), { code: 'INVALID_FIELD', field: 'tint' }));
  await check('block fields read as IDs by default and as objects with `nested: true`', async () => {
    const plain = await client.items.find(record.id);
    const nested = await client.items.find(record.id, { nested: true });
    return typeof plain.sections[0] === 'string' && nested.sections[0].attributes.title === 'First' ? null : 'unexpected shapes';
  });
  await check('a nested list above 30 per page is rejected', async () =>
    expectRejection(await rejection(() => client.items.list({ nested: true, page: { limit: 31 } })), {}));
  await check('a block cannot be updated on its own, but can be read by ID', async () => {
    const [blockId] = (await client.items.find(record.id)).sections;
    if (!(await rejection(() => client.items.update(blockId, { title: 'x' })))) return 'the API updated a block directly';
    return (await client.items.find(blockId)).id === blockId ? null : 'the block could not be read';
  });

  // ---- block slots and locales (editing-records.md)
  await check('`{ id, changed attribute }` edits one block and leaves its other blocks, kept by ID, untouched', async () => {
    const before = await client.items.find(record.id, { nested: true });
    const [first, second, third] = before.sections;
    await client.items.update(record.id, { sections: [first.id, buildBlockRecord({ id: second.id, title: 'Second, edited' }), third.id] });
    const after = await client.items.find(record.id, { nested: true });
    if (after.sections.map((entry) => entry.id).join() !== [first.id, second.id, third.id].join()) return 'block identities changed';
    return after.sections[1].attributes.title === 'Second, edited' && after.sections[0].attributes.title === 'First' ? null : 'attributes are not as expected';
  });
  await check('a block left out of the array is deleted', async () => {
    const before = await client.items.find(record.id);
    await client.items.update(record.id, { sections: before.sections.slice(0, 2) });
    return (await client.items.find(record.id)).sections.length === 2 ? null : 'the block is still there';
  });
  await check('a block ID cannot be moved to another field of the same record', async () => {
    const before = await client.items.find(record.id);
    return expectRejection(await rejection(() => client.items.update(record.id, { sections: [before.sections[0]], sidebar: [before.sections[1]] })), { code: 'INVALID_FIELD', field: 'sidebar.0' });
  });
  await check('the same block ID twice in one payload is rejected', async () => {
    const before = await client.items.find(record.id);
    return expectRejection(await rejection(() => client.items.update(record.id, { sections: [before.sections[0], before.sections[0]] })), { code: 'INVALID_FIELD' });
  });
  await check('creating a record with a block ID string is rejected', async () => {
    const before = await client.items.find(record.id);
    return expectRejection(await rejection(() => client.items.create({ item_type: { type: 'item_type', id: model.id }, title: 'Two', tagline: { en: 'x' }, summary: { en: 'y' }, sections: [before.sections[0]] })), { code: 'INVALID_FIELD', field: 'sections.0' });
  });
  await check('creating a record of a model with localized fields and no locale at all is rejected with MISSING_LOCALES', async () =>
    expectRejection(await rejection(() => client.items.create({ item_type: { type: 'item_type', id: model.id }, title: 'Three' })), { code: 'MISSING_LOCALES' }));
  await check('a new block may carry an ID of your own (`generateId()`)', async () => {
    const before = await client.items.find(record.id);
    const id = generateId();
    await client.items.update(record.id, { sections: [...before.sections, buildBlockRecord({ id, item_type: { type: 'item_type', id: block.id }, title: 'Own ID' })] });
    return (await client.items.find(record.id)).sections.at(-1) === id ? null : 'the block did not get the chosen ID';
  });
  await check('a failing validator inside a block is reported at `sections.<index>.<field>`', async () => {
    const before = await client.items.find(record.id);
    return expectRejection(await rejection(() => client.items.update(record.id, { sections: [buildBlockRecord({ id: before.sections[0], title: '' }), ...before.sections.slice(1)] })), { code: 'INVALID_FIELD', field: 'sections.0.title' });
  });
  await check('adding a locale to one localized field alone is rejected with INVALID_LOCALES', async () => {
    const details = await rejection(() => client.items.update(record.id, { tagline: { en: 'Hello', it: 'Ciao' } }));
    return details && JSON.stringify(details).includes('INVALID_LOCALES') ? null : `got ${JSON.stringify(details)}`;
  });
  await check('adding a locale to every localized field in one update is accepted', async () => {
    const details = await rejection(() => client.items.update(record.id, { tagline: { en: 'Hello', it: 'Ciao' }, summary: { en: 'Short', it: 'Breve' } }));
    return details ? `rejected: ${JSON.stringify(details)}` : null;
  });

  await check('a locale left out of one localized field is rejected; left out of all of them, it is removed', async () => {
    const one = await rejection(() => client.items.update(record.id, { tagline: { en: 'Hello' } }));
    if (!one || !JSON.stringify(one).includes('INVALID_LOCALES')) return `one field: ${JSON.stringify(one)}`;
    const all = await rejection(() => client.items.update(record.id, { tagline: { en: 'Hello' }, summary: { en: 'Short' } }));
    if (all) return `all fields: ${JSON.stringify(all)}`;
    const read = await client.items.find(record.id);
    return 'it' in read.tagline ? 'the locale is still on the record' : null;
  });
  await check('a date-time sent without an offset is stored as UTC', async () => {
    await client.items.update(record.id, { starts_at: '2027-03-01T20:30:00' });
    const stored = (await client.items.find(record.id)).starts_at;
    return new Date(stored).toISOString() === '2027-03-01T20:30:00.000Z' ? null : `stored ${stored}`;
  });

  // ---- Structured Text (editing-records.md)
  const paragraph = (...children) => ({ type: 'paragraph', children });
  const span = (value, marks) => (marks ? { type: 'span', value, marks } : { type: 'span', value });
  const dast = (...children) => ({ schema: 'dast', document: { type: 'root', children } });
  await check('adjacent spans with the same marks are merged on write', async () => {
    await client.items.update(record.id, { body: dast(paragraph(span('a', ['strong']), span('b', ['strong']))) });
    const stored = (await client.items.find(record.id)).body.document.children[0].children;
    return stored.length === 1 && stored[0].value === 'ab' ? null : `stored ${JSON.stringify(stored)}`;
  });
  await check('an empty document is stored as null', async () => {
    await client.items.update(record.id, { body: { schema: 'dast', document: { type: 'root', children: [] } } });
    const stored = (await client.items.find(record.id)).body;
    return stored === null ? null : `stored ${JSON.stringify(stored)}`;
  });
  await check('a `block` node inside a paragraph is rejected', async () =>
    expectRejection(await rejection(() => client.items.update(record.id, { body: dast(paragraph(span('x'), { type: 'block', item: card({ title: 'In text' }) })) })), { code: 'INVALID_FIELD', field: 'body' }));
  await check('an inline block is rejected when the field has no `structured_text_inline_blocks` validator', async () => {
    const details = await rejection(() => client.items.update(record.id, { body: dast(paragraph(span('x '), { type: 'inlineBlock', item: card({ title: 'Inline' }) })) }));
    return details && JSON.stringify(details).includes('VALIDATION_STRUCTURED_TEXT_INLINE_BLOCKS') ? null : `got ${JSON.stringify(details)}`;
  });
  await check('a `javascript:` link URL is rejected', async () =>
    expectRejection(await rejection(() => client.items.update(record.id, { body: dast(paragraph({ type: 'link', url: 'javascript:alert(1)', children: [span('x')] })) })), { code: 'INVALID_FIELD', field: 'body' }));
  await check('a heading level outside the editor settings is accepted (settings are not enforced)', async () => {
    const stField = (await client.fields.list(model.id)).find((entry) => entry.api_key === 'body');
    await client.fields.update(stField.id, { appearance: { editor: 'structured_text', parameters: { heading_levels: [2, 3] }, addons: [] } });
    const details = await rejection(() => client.items.update(record.id, { body: dast({ type: 'heading', level: 1, children: [span('Title')] }) }));
    return details ? `rejected: ${JSON.stringify(details)}` : null;
  });

  // ---- destructive schema effects and limits
  await check('removing a block model from `rich_text_blocks` destroys its existing blocks', async () => {
    const before = await client.items.find(record.id, { nested: true });
    await client.items.update(record.id, { sections: [...before.sections.map((entry) => entry.id), buildBlockRecord({ item_type: { type: 'item_type', id: other.id }, text: 'To be removed' })] });
    await client.fields.update(sections.id, { validators: { rich_text_blocks: { item_types: [block.id] } } });
    const after = await client.items.find(record.id, { nested: true });
    return after.sections.every((entry) => entry.relationships.item_type.data.id === block.id) ? null : 'blocks of the removed model are still there';
  });
  await check('a block model still allowed by a field cannot be deleted (MODULAR_BLOCK_IN_USE)', async () => {
    const details = await rejection(() => client.itemTypes.destroy(block.id));
    return details && JSON.stringify(details).includes('MODULAR_BLOCK_IN_USE') ? null : `got ${JSON.stringify(details)}`;
  });
  await check('`update` never publishes a record of a draft-mode model', async () => {
    const read = await client.items.find(record.id);
    return read.meta.status === 'draft' ? null : `status is ${read.meta.status}`;
  });
  await check('the project reports its block limits', async () => {
    const info = await client.publicInfo.find();
    const text = JSON.stringify(info);
    return /blocks_per_item/.test(text) && /blocks_depth/.test(text) ? null : `publicInfo holds ${Object.keys(info).join(', ')}`;
  });
  void cardTitle;
  void title;
} finally {
  await primary.environments.destroy(environment).catch(() => {});
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} statements hold against the API`);
if (failed.length) process.exitCode = 1;
