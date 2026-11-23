#!/usr/bin/env node
// Stand-in for the `datocms` CLI inside a routing probe folder. It never opens a connection: project commands
// answer with small canned data, so the actor has a tool that works and no reason to look for another one.
// `agents:reference` prints references from the skills under test, as the real command does from the repository.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [command = '', ...rest] = process.argv.slice(2);
const args = rest.filter((arg) => !arg.startsWith('-'));
const print = (value) => console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));

const field = (api_key, field_type, extra = {}) => ({ api_key, field_type, localized: false, validators: {}, ...extra });
const model = (api_key) => ({
  api_key,
  name: api_key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
  modular_block: false,
  draft_mode_active: true,
  locales: ['en', 'de'],
  fields: [
    field('title', 'string', { localized: true, validators: { required: {} } }),
    field('slug', 'slug', { validators: { slug_title_field: { title_field_id: 'title' }, unique: {} } }),
    field('body', 'structured_text', { localized: true, validators: { structured_text_blocks: { item_types: ['image_block', 'cta'] }, structured_text_links: { item_types: [] } } }),
    field('sections', 'rich_text', { validators: { rich_text_blocks: { item_types: ['hero_block', 'testimonial_block'] } } }),
    field('cover', 'file'),
    field('author', 'link', { validators: { item_item_type: { item_types: ['author'] } } }),
    field('published_on', 'date'),
  ],
});
const record = (id = 'Yx3kP9QhTSeLmA2uVw7bZg') => ({
  id,
  type: 'item',
  item_type: { type: 'item_type', id: 'Ab1cD2eF3gH4iJ5kL6mN7o' },
  title: { en: 'Winter menu', de: 'Winterkarte' },
  slug: 'winter-menu',
  body: { en: { schema: 'dast', document: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'span', value: 'Our new dishes are here.' }] }] } }, de: null },
  sections: [],
  meta: { status: 'draft', current_version: '1' },
});

switch (command) {
  case 'agents:reference': {
    const path = join(root, '.claude/skills', args[0] ?? '', 'references', `${args[1] ?? ''}.md`);
    if (!existsSync(path)) {
      console.error(`Reference "${args[1]}" not found in skill "${args[0]}"`);
      process.exit(2);
    }
    process.stdout.write(readFileSync(path, 'utf8'));
    break;
  }
  case 'whoami':
    print('  Email:      editor@example.com\n  Name:       Example Editor\n  Company:    Acme');
    break;
  case 'projects:list':
    print('  1 project: Acme website (id 100001)');
    break;
  case 'schema:inspect':
    print(args.length ? args.map(model) : ['article', 'page', 'author', 'product'].map(model));
    break;
  case 'cma:call': {
    const [resource = '', action = '', id] = args;
    if (/^(list|instances|references|query)$/.test(action)) print(resource === 'items' ? [record()] : []);
    else if (action === 'find') print(resource === 'items' ? record(id) : { id: id ?? 'main', type: resource.replace(/s$/, '') });
    else print({ id: id ?? 'Qp4rT8mWZ2eLsK1vXn6bYa', type: resource.replace(/s$/, '') });
    break;
  }
  case 'cma:script':
    try {
      readFileSync(0, 'utf8');
    } catch {}
    break;
  case 'migrations:new': {
    const name = `${Math.floor(Date.now() / 1000)}_${(args[0] ?? 'migration').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.ts`;
    mkdirSync(join(process.cwd(), 'migrations'), { recursive: true });
    writeFileSync(join(process.cwd(), 'migrations', name), 'import type { Client } from "datocms/lib/cma-client-node";\n\nexport default async function (client: Client) {\n  // DatoCMS migration script\n}\n');
    print(`Writing "migrations/${name}"... done`);
    break;
  }
  case 'migrations:run':
    print('Migrations will be run in "release-candidate" sandbox environment\nRunning migrations... done\nSuccessfully run 1 migration script!');
    break;
  case 'environments:list':
    print('  main (primary)\n  release-candidate (sandbox)\n  feature-x (sandbox)');
    break;
  case '--version':
  case '-v':
  case 'version':
    print('datocms/4.2.0 darwin-arm64');
    break;
  default:
    print('Done!');
}
