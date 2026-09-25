import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Pinned dependency set (no lockfile needed: only @types/node has a transitive dep), installed once under ignored local/.
const DEPS = { '@0no-co/graphql.web': '1.3.4', '@datocms/cda-client': '0.3.2', graphql: '16.14.2', '@types/node': '22.19.17', typescript: '5.9.3' };
// Real DatoCMS CDA schema published by datocms/nextjs-starter-kit (schema.graphql at a14eb23, 2026-07-18); pinned by hash.
const SCHEMA_URL = 'https://raw.githubusercontent.com/datocms/nextjs-starter-kit/a14eb2365d744c9936e1ce017da2a80975516444/schema.graphql';
const SCHEMA_SHA256 = 'cf648fb7ed0c9518a5ed9cfb5fc58d7ae52357c9e784bf4c113a37ffb6c7cced';

async function fixture(root) {
  const dir = join(root, '../local/regressions/cda/fixture');
  if (!Object.keys(DEPS).every((name) => existsSync(join(dir, 'node_modules', name, 'package.json')))) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: DEPS }, null, 2));
    const npm = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', dir], { stdio: 'inherit' });
    assert.equal(npm.status, 0, 'fixture install failed');
  }
  const schema = join(dir, 'datocms-schema.graphql');
  if (!existsSync(schema)) writeFileSync(schema, await (await fetch(SCHEMA_URL)).text());
  assert.equal(createHash('sha256').update(readFileSync(schema)).digest('hex'), SCHEMA_SHA256, 'pinned schema changed');
  return { dir, schema, require: createRequire(join(dir, 'package.json')) };
}

// Workspace linked to the fixture plus an actor HOME/XDG sandbox, so no host login is reachable.
async function prepare(workspace, ctx, files) {
  const { dir } = await fixture(ctx.root);
  for (const [path, content] of Object.entries(files)) writeFileSync(join(workspace, path), content);
  if (!existsSync(join(workspace, 'node_modules'))) symlinkSync(join(dir, 'node_modules'), join(workspace, 'node_modules'), 'dir');
  const environment = {};
  for (const [key, name] of [['HOME', 'home'], ['XDG_CONFIG_HOME', 'config'], ['XDG_DATA_HOME', 'data'], ['XDG_CACHE_HOME', 'cache']]) {
    environment[key] = join(workspace, '..', 'oracle', name);
    mkdirSync(environment[key], { recursive: true });
  }
  return { environment };
}

const ADMIN = 'https://acme.admin.datocms.com';
const TOKENS = { DATOCMS_PUBLISHED_TOKEN: 'published-token-7f3a', DATOCMS_DRAFT_TOKEN: 'draft-token-91c2' };

// Runs the actor module (bundled with the real cda-client) against a CDA stub that
// mirrors DatoCMS header validation (api graphql_controller.rb: include-drafts only
// "true"; visual editing only v1|vercel-v1 and requires X-Base-Editing-Url).
async function draftClient(workspace, ctx) {
  const outfile = join(ctx.directory, 'oracle', 'datocms.mjs');
  await build({ entryPoints: [join(workspace, 'src/lib/datocms.ts')], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const requests = [];
  const saved = { fetch: globalThis.fetch, env: { ...process.env } };
  globalThis.fetch = async (input, init = {}) => {
    const request = new Request(input, init);
    const headers = Object.fromEntries(request.headers);
    requests.push({ url: request.url, headers });
    const error = (code) => new Response(JSON.stringify({ data: null, errors: [{ message: code }] }), { status: 422, headers: { 'content-type': 'application/json' } });
    if ('x-include-drafts' in headers && headers['x-include-drafts'] !== 'true') return error('INVALID_X_INCLUDE_DRAFTS_HEADER');
    if ('x-visual-editing' in headers && !['v1', 'vercel-v1'].includes(headers['x-visual-editing'])) return error('INVALID_X_VISUAL_EDITING_HEADER');
    if ('x-visual-editing' in headers && !headers['x-base-editing-url']) return error('INVALID_X_BASE_EDITING_URL_HEADER');
    return new Response(JSON.stringify({ data: { post: { title: 'Hello' } } }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  Object.assign(process.env, TOKENS);
  try {
    const { fetchContent } = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
    assert.equal(typeof fetchContent, 'function', 'src/lib/datocms.ts must export fetchContent');
    const read = async (options) => {
      const before = requests.length;
      await fetchContent('query { post { title } }', options);
      assert.ok(requests.length > before, 'fetchContent made no CDA request');
      return requests.at(-1);
    };
    const published = await read(undefined);
    const explicit = await read({ preview: false });
    const preview = await read({ preview: true });
    for (const r of [published, explicit, preview]) assert.match(r.url, /^https:\/\/graphql\.datocms\.com\//);
    for (const r of [published, explicit]) {
      assert.equal(r.headers.authorization, `Bearer ${TOKENS.DATOCMS_PUBLISHED_TOKEN}`);
      assert.ok(!('x-include-drafts' in r.headers), 'published read requested drafts');
      assert.ok(!('x-visual-editing' in r.headers), 'published read embeds Content Link metadata');
    }
    assert.equal(preview.headers.authorization, `Bearer ${TOKENS.DATOCMS_DRAFT_TOKEN}`);
    assert.equal(preview.headers['x-include-drafts'], 'true');
    assert.ok(preview.headers['x-visual-editing'], 'preview read has no Content Link metadata');
    assert.equal(preview.headers['x-base-editing-url'].replace(/\/$/, ''), ADMIN);
    return { published: published.headers, preview: { ...preview.headers, authorization: '[draft token]' } };
  } finally {
    globalThis.fetch = saved.fetch;
    for (const key of Object.keys(TOKENS)) if (saved.env[key] === undefined) delete process.env[key]; else process.env[key] = saved.env[key];
  }
}

const FOCAL = { x: 0.2, y: 0.3 };
// Documented CDA focal-point injection (docs/content-delivery-api/images-and-videos, "Focal points")
// followed by imgix crop anchoring (crop=focalpoint uses fp-x/fp-y, default 0.5; no crop = center).
function rendition(params, focal) {
  const crops = [params.crop ?? []].flat();
  const inject = params.fit === 'crop' && ((params.w && params.h) || params.ar) && crops.every((c) => c === 'focalpoint')
    && params.fpX == null && params.fpY == null && !(focal.x === 0.5 && focal.y === 0.5);
  const p = inject ? { ...params, crop: ['focalpoint'], fpX: focal.x, fpY: focal.y } : params;
  const final = [p.crop ?? []].flat();
  const anchor = final.includes('focalpoint') ? { x: p.fpX ?? 0.5, y: p.fpY ?? 0.5 } : final.length ? final.join(',') : { x: 0.5, y: 0.5 };
  const ratio = p.ar ? p.ar.split(':').map(Number).reduce((a, b) => a / (b ?? 1)) : undefined;
  const size = p.w && p.h ? [p.w, p.h] : p.w && ratio ? [p.w, p.w / ratio] : p.h && ratio ? [p.h * ratio, p.h] : [p.w, p.h];
  return { fit: p.fit, size, anchor };
}

// Validates the actor's query against the real DatoCMS file/imgix types, executes it
// with graphql-js, captures each responsiveImage's coerced imgixParams, then applies the rendition model.
async function thumbnail(workspace, ctx) {
  const { schema: schemaFile, require } = await fixture(ctx.root);
  const graphql = require('graphql');
  const real = graphql.buildSchema(readFileSync(schemaFile, 'utf8'));
  const names = new Set(), types = [];
  const collect = (type) => {
    type = graphql.getNamedType(type);
    if (names.has(type.name) || graphql.isSpecifiedScalarType(type)) return;
    names.add(type.name);
    if ('getFields' in type) for (const f of Object.values(type.getFields())) { collect(f.type); for (const a of f.args ?? []) collect(a.type); }
    if (graphql.isObjectType(type)) type.getInterfaces().forEach(collect);
    types.push(graphql.printType(type));
  };
  ['FileField', 'ItemIdFilter'].forEach((name) => collect(real.getType(name)));
  const schema = graphql.buildSchema(`${types.join('\n')}
    type Query { product(filter: ProductModelFilter, locale: SiteLocale): ProductRecord }
    input ProductModelFilter { id: ItemIdFilter }
    type ProductRecord { id: ItemId! name: String photo: FileField }`);
  const document = graphql.parse(readFileSync(join(workspace, 'queries/thumbnail.graphql'), 'utf8'));
  const errors = graphql.validate(schema, document);
  assert.deepEqual(errors.map((e) => e.message), [], 'query is invalid against the DatoCMS schema');
  const captured = [];
  const keys = (path) => (path ? [...keys(path.prev), path.key] : []);
  const responsive = (args, _c, info) => {
    captured.push({ path: keys(info.path), imgixParams: JSON.parse(JSON.stringify(args.imgixParams ?? {})) });
    return { src: 'https://www.datocms-assets.com/1/photo.jpg', srcSet: 's', webpSrcSet: 's', sizes: '400px', width: 400, height: 400, aspectRatio: 1, alt: 'Photo', title: null, base64: null, bgColor: null };
  };
  const photo = { id: 'upload-1', url: () => 'https://www.datocms-assets.com/1/photo.jpg', width: 2400, height: 1600, alt: 'Photo', title: null, focalPoint: FOCAL, responsiveImage: responsive };
  for (const op of document.definitions.filter((d) => d.kind === 'OperationDefinition')) {
    const variableValues = {};
    for (const v of op.variableDefinitions ?? []) {
      if (v.defaultValue || v.type.kind !== 'NonNullType') continue;
      assert.ok(['ItemId', 'ID', 'String'].includes(graphql.getNamedType(graphql.typeFromAST(schema, v.type)).name), `unexpected required variable $${v.variable.name.value}`);
      variableValues[v.variable.name.value] = 'product-1';
    }
    await graphql.execute({ schema, document, operationName: op.name?.value, variableValues, rootValue: { product: () => ({ id: 'product-1', name: 'Mug', photo }) } });
  }
  const variant = (alias) => {
    const found = captured.filter((c) => c.path.includes(alias));
    assert.equal(found.length, 1, `expected one responsiveImage under alias "${alias}"`);
    return { ...found[0], rendition: rendition(found[0].imgixParams, FOCAL) };
  };
  const square = variant('square'), focused = variant('focused');
  for (const v of [square, focused]) {
    assert.equal(v.rendition.fit, 'crop', `${v.path.join('.')} is not cropped`);
    assert.deepEqual(v.rendition.size.map(Number), [400, 400], `${v.path.join('.')} is not 400x400`);
  }
  assert.deepEqual(square.rendition.anchor, { x: 0.5, y: 0.5 }, 'square thumbnail is not center-cropped when the photo has a focal point');
  assert.deepEqual(focused.rendition.anchor, FOCAL, 'focused thumbnail ignores the editor focal point');
  return { square, focused };
}

const draftPass = `import { executeQuery } from '@datocms/cda-client';

export async function fetchContent<T = unknown>(query: string, options: { preview?: boolean; variables?: Record<string, unknown> } = {}): Promise<T> {
  const preview = Boolean(options.preview);
  return executeQuery<T>(query, {
    token: (preview ? process.env.DATOCMS_DRAFT_TOKEN : process.env.DATOCMS_PUBLISHED_TOKEN)!,
    variables: options.variables,
    includeDrafts: preview,
    contentLink: preview ? 'v1' : undefined,
    baseEditingUrl: 'https://acme.admin.datocms.com',
  });
}
`;
const query = (square, focused) => `query ProductThumbnails($id: ItemId!) {
  product(filter: { id: { eq: $id } }) {
    photo {
      square: responsiveImage(imgixParams: ${square}) { src srcSet width height alt }
      focused: responsiveImage(imgixParams: ${focused}) { src srcSet width height alt }
    }
  }
}
`;

export default [
  {
    id: 'cda-draft-editing-client',
    guards: ['skills/datocms-cda/references/draft-caching-environments.md'],
    prompt: `Create src/lib/datocms.ts for our TypeScript site. Export async function fetchContent<T = unknown>(query: string, options?: { preview?: boolean; variables?: Record<string, unknown> }): Promise<T>, which runs GraphQL queries against the DatoCMS Content Delivery API using @datocms/cda-client (already installed, along with TypeScript). Public pages call it without preview and must get published content, authenticated with the token in the DATOCMS_PUBLISHED_TOKEN environment variable. Our preview mode calls it with preview: true and uses DATOCMS_DRAFT_TOKEN; editors there must see unpublished changes, and our page already loads DatoCMS's click-to-edit overlay library, which needs the fetched content to carry the links back to the fields in our project (admin at ${ADMIN}). Only the two tokens come from environment variables. No live project or credentials are available, so do not call the API; just write the module.`,
    setup: (workspace, ctx) => prepare(workspace, ctx, { 'package.json': JSON.stringify({ name: 'site', private: true, type: 'module', dependencies: { '@datocms/cda-client': DEPS['@datocms/cda-client'] } }, null, 2), 'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, types: ['node'], noEmit: true } }, null, 2) }),
    check: draftClient,
    controls: {
      pass: { files: { 'src/lib/datocms.ts': draftPass } },
      fail: [
        {
          // Old example: contentLink "vercel-v1" + baseEditingUrl, not gated on drafts.
          name: 'ungated-vercel-v1',
          files: { 'src/lib/datocms.ts': draftPass.replace("contentLink: preview ? 'v1' : undefined", 'contentLink: "vercel-v1"') },
        },
      ],
    },
  },
  {
    id: 'cda-centered-square-thumbnail',
    guards: ['skills/datocms-cda/references/images-and-videos.md'],
    prompt: `Our DatoCMS project has a product model (GraphQL root field product, filterable by id; record type ProductRecord) with a single-asset image field whose API key is photo. Create queries/thumbnail.graphql with one query that takes $id: ItemId!, loads that product, and returns two responsiveImage renditions of photo (select src, srcSet, width, height, alt), aliased:
- square: a 400x400 thumbnail for the catalog grid, cropped from the exact center of the photo. It must stay centered even when an editor has moved the photo's focal point.
- focused: a 400x400 crop that follows the focal point editors set on the photo.
No live project or credentials are available, so do not call the API; just write the file.`,
    setup: (workspace, ctx) => (mkdirSync(join(workspace, 'queries'), { recursive: true }), prepare(workspace, ctx, {})),
    check: thumbnail,
    controls: {
      pass: { files: { 'queries/thumbnail.graphql': query('{ fit: crop, w: 400, h: 400, fpX: 0.5, fpY: 0.5 }', '{ fit: crop, w: 400, h: 400 }') } },
      fail: [
        // Old crop list offered `center`.
        { name: 'crop-center', files: { 'queries/thumbnail.graphql': query('{ fit: crop, w: 400, h: 400, crop: center }', '{ fit: crop, w: 400, h: 400, crop: focalpoint }') } },
        // Old focal text: focal point applies via crop: focalpoint, so omitting crop was read as centered.
        { name: 'old-focal-rule', files: { 'queries/thumbnail.graphql': query('{ fit: crop, w: 400, h: 400 }', '{ w: 400, h: 400, fit: crop, crop: focalpoint }') } },
      ],
    },
  },
];
