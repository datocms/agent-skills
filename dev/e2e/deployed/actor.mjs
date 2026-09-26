import assert from 'node:assert/strict';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { buildClient } from '@datocms/cma-client-node';
import { nativeSession, REPO_ROOT } from '../lib/nativeSession.ts';

// The config and environment files belong under ignored local/. They describe
// an explicitly authorized disposable project and an isolated app checkout.
const path = process.argv[2];
assert.ok(path, 'Usage: tsx e2e/deployed/actor.mjs local/actor-config.json');
const config = JSON.parse(readFileSync(path, 'utf8'));
const environment = JSON.parse(readFileSync(config.environmentFile, 'utf8'));
assert.ok(!existsSync(config.output), 'Refusing to replace an attempt');
assert.equal(new URL(config.origin).protocol, 'https:');
assert.ok(['search', 'cache'].includes(config.scenario));
assert.ok(config.siteId && config.internalDomain && config.workspace);
if (environment.DATOCMS_API_TOKEN) {
  const site = await buildClient({ apiToken: environment.DATOCMS_API_TOKEN }).site.find();
  assert.equal(site.id, config.siteId);
  assert.equal(site.internal_domain, config.internalDomain);
}
const scope = `The only authorized CMS project is ${config.siteId}, ${config.internalDomain}. Do not deploy, commit, push, or read provider credentials. Do not modify existing CMS content, schema, roles, tokens, webhooks, build triggers, or project settings. Stop any local server you start. `;
let prompt, instructions;
if (config.scenario === 'search') {
  assert.ok(config.prefix && Array.isArray(config.fixtures) && config.locales?.length);
  instructions = scope + `You may create one NEW search index, one NEW least-privilege search role and one NEW search token named with prefix '${config.prefix}'. Do not trigger crawling. Write only resource IDs and environment-variable names to setup-result.json; never credential values. The operator deploys and starts the crawl afterward.`;
  prompt = `Set up working DatoCMS Site Search for this existing website at ${config.origin}, with a shared index across its public sections and locales ${config.locales.join(', ')}. Add localized /search pages with query input, locale-aware results, two-result pagination, loading, empty and error states. Provision the search index, role and browser token using DATOCMS_API_TOKEN. Use resource name prefix '${config.prefix}'. Add an idempotent provisioning script. Configure robots and a sitemap to allow DatoCmsSearchBot while disallowing general search engines. Post slugs beginning e2e-unlisted- must remain directly accessible but excluded from crawling and the sitemap. Draft-only posts must not appear publicly. Preserve existing routes, preview authentication and content. Render the page language for the crawler. The operator prepared these records: ${JSON.stringify(config.fixtures)}. Verify a production build and locally served routes. The operator will deploy and trigger indexing afterward.`;
} else {
  assert.ok(environment.CACHE_TAG_STORE_URL && environment.CACHE_TAG_STORE_TOKEN);
  instructions = scope + 'Do not create any CMS resources. You may use only the supplied tag-mapping service. The operator configures the actual webhook and deployment afterward.';
  prompt = `Set up granular DatoCMS cache-tag invalidation in this existing Next.js app. Extend the existing query wrapper and revalidation endpoint, preserving published reads, authenticated drafts, locale handling, Site Search and the rendering mode. Keep the global datocms tag as a fallback for callers without query IDs; give post queries stable granular identities. Drafts must bypass shared caching and leave published mappings intact. Handle real CDA cache-tag payloads, invalid authentication, malformed JSON/tags, empty tags, repeated delivery and dependency failures. Do not report successful invalidation after a dependency failure. A persistent external mapping service is supplied via CACHE_TAG_STORE_URL and server-only CACHE_TAG_STORE_TOKEN: authenticated PUT /mapping with {queryId:string,tags:string[]} atomically replaces the mapping and returns {stored:true}; POST /lookup with {tags:string[]} returns {queryIds:string[]}. Both use Authorization: Bearer, JSON and non-2xx failure responses. This is a concrete SQLite-backed external test service, not an app-local memory store. Do not provision other infrastructure. Verify a production build and representative locally served behavior. The operator will test publication and webhook delivery after deployment.`;
}
const result = await nativeSession({
  repoRoot: REPO_ROOT, workspace: resolve(config.workspace), output: resolve(config.output),
  environment, secrets: Object.entries(environment).filter(([key]) => /TOKEN|SECRET/.test(key)).map(([, value]) => value),
  prompt, instructions, timeoutMs: config.timeoutMs ?? 600000, maxCommands: config.maxCommands ?? 70,
});
const summary = { completed: result.completed, timedOut: result.timedOut, usageLimitReached: result.usageLimitReached, credentialLeak: result.credentialLeak, oracleAccess: result.oracleAccess, unsuccessfulCommands: result.commands.filter(command => command.exit_code !== 0).length };
writeFileSync(join(config.output, 'implementation-result.json'), JSON.stringify(summary, null, 2), { mode: 0o600 });
console.log(JSON.stringify(summary));
