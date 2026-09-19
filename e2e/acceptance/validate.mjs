import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, symlinkSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import { checkCli, checkLinks, checkDocument, checkNotice } from './checks.mjs';

const { values } = parseArgs({ options: { output: { type: 'string' }, dependencies: { type: 'string' } } });
if (!values.output || !values.dependencies) throw Error('Specify --output and --dependencies');
const output = resolve(values.output), root = resolve(import.meta.dirname, '../..');
if (existsSync(output)) throw Error('Choose a fresh output');
mkdirSync(output, { recursive: true });
const checks = [];
const commands = 'pnpm exec datocms cma:docs uploads self\npnpm exec datocms cma:docs uploads create --expand-types "*"\npnpm exec datocms cma:call uploads find asset_47 --profile studio --environment photo-review';
await checkCli(commands);
await checkCli(commands.replaceAll('pnpm exec datocms', 'pnpm datocms'));
for (const flag of ['--profile studio', '--environment photo-review', '--api-token synthetic']) await assert.rejects(() => checkCli(commands.replace('uploads self', `uploads self ${flag}`)), /Nonexistent flag/);
await assert.rejects(() => checkCli(commands.replaceAll('pnpm exec datocms', 'pnpm datocms').replace('uploads self', 'uploads find')), /Documentation action must exist/);
checks.push('CLI: both valid pnpm forms accepted; three invalid documentation flags and a wrong action rejected');

const links = join(output, 'links'); mkdirSync(join(links, 'src/components'), { recursive: true });
symlinkSync(join(resolve(values.dependencies), 'node_modules'), join(links, 'node_modules'));
const component = `import {stripStega} from '@datocms/content-link';export default function Collection({entries}) {return <ul>{entries.map(e=><li key={e.id} data-entry={e.id} data-badge={stripStega(e.badge).toLowerCase()} data-datocms-content-link-group><img data-datocms-content-link-boundary src={e.image.url} alt={e.image.alt}/><span className="badge">{stripStega(e.badge)}</span><h2>{e.heading}</h2><footer><span className="curator" data-datocms-content-link-boundary>{e.curator}</span><span className="count" data-datocms-content-link-url={e._editingUrl}>{e.count}</span></footer></li>)}</ul>}`;
const path = join(links, 'src/components/Collection.tsx');
writeFileSync(path, component); await checkLinks(links);
writeFileSync(path, component.replaceAll('data-datocms-content-link-boundary', ''));
await assert.rejects(() => checkLinks(links));
writeFileSync(path, component.replace('{stripStega(e.badge)}</span>', '{e.badge}</span>'));
await assert.rejects(() => checkLinks(links));
// All final targets can look correct while two sources still compete. The SDK
// warning describes multiple payloads rather than using the word "collision".
writeFileSync(path, component.replace('<h2>{e.heading}</h2>', '<span hidden>{e.badge}</span><h2>{e.heading}</h2>'));
await assert.rejects(() => checkLinks(links), /Multiple stega-encoded payloads/);
checks.push('Content Link: correct groups accepted; missing independence, encoded display label and competing-source warning rejected');

const noticePath = join(links, 'src/components/NoticeBanner.tsx');
const notice = `import {stripStega} from '@datocms/content-link';export default function NoticeBanner({notice:n}){return <section className="notice" data-datocms-content-link-group><p className="audience">{stripStega(n.audience)}</p><h2><a href={stripStega(n.href)}>{n.heading}</a></h2><p className="body" data-datocms-content-link-boundary>{n.body}</p></section>}`;
writeFileSync(noticePath, notice); await checkNotice(links);
writeFileSync(noticePath, notice.replace('href={stripStega(n.href)}', 'href={n.href}'));
await assert.rejects(() => checkNotice(links));
checks.push('Notice: correct preview/published behavior accepted; encoded navigation URL rejected');

const document = join(output, 'document'); mkdirSync(join(document, 'src/content'), { recursive: true });
symlinkSync(join(root, 'node_modules'), join(document, 'node_modules'));
const documentPath = join(document, 'src/content/replaceBrand.ts');
writeFileSync(documentPath, `export function replaceBrand(input,from,to){const doc=structuredClone(input);function visit(node){if(node.type==='span'&&from)node.value=node.value.replaceAll(from,to);for(const child of node.children??[])visit(child);}visit(doc.document);return doc;}`);
await checkDocument(document, document);
writeFileSync(documentPath, `export function replaceBrand(input,from,to){return JSON.parse(JSON.stringify(input).replaceAll(from,to));}`);
// A fresh bundle URL avoids the ESM module cache retaining the valid control.
const invalid = join(output, 'document-invalid'); mkdirSync(invalid);
await assert.rejects(() => checkDocument(document, invalid));
checks.push('Document: surgical edit accepted; whole-JSON replacement rejected');
writeFileSync(join(output, 'result.json'), JSON.stringify({ passed: true, checks }, null, 2));
console.log(JSON.stringify({ passed: true, checks }));
