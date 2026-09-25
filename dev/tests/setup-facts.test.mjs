// Guards for the guided setup skill: its conversation contract, the play catalogue, and the facts it
// hands to sibling skills. REFERENCE_REPO_ROOT points the checks at another skills snapshot (e.g. a baseline).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const devRoot = fileURLToPath(new URL('../', import.meta.url));
const repoRoot = process.env.REFERENCE_REPO_ROOT ? resolve(process.env.REFERENCE_REPO_ROOT) : resolve(devRoot, '..');
const skills = join(repoRoot, 'skills');
const setup = join(skills, 'datocms-setup');
const read = (path) => readFileSync(join(setup, path), 'utf8');
// Body of `heading` up to the next heading of the same or higher level.
const section = (text, heading) => text.split(`\n${heading}\n`)[1]?.split(new RegExp(`\\n#{1,${heading.indexOf(' ')}} `))[0] ?? '';
const step = (n) => read('SKILL.md').split('\n').find((line) => line.startsWith(`${n}. `)) ?? '';
const rule = (name) => section(read('SKILL.md'), '## Rules').split('\n').find((line) => line.startsWith(`- **${name}`)) ?? '';

// Plays: SKILL.md table rows → `## <Play>` sections in the linked reference, with `- **Field:**` bullets.
function plays() {
  const rows = [...read('SKILL.md').matchAll(/^\| (.+?) \| (.+?) \| \[[\w.-]+\]\((references\/[\w.-]+\.md)\) \|$/gm)];
  assert.ok(rows.length >= 10, 'SKILL.md has no play table');
  return rows.map(([, outcome, name, file]) => {
    const body = section(read(file), `## ${name}`);
    const fields = Object.fromEntries([...body.matchAll(/^- \*\*(\w+):?\*\*(.*)$/gm)].map(([, field, text]) => [field, text]));
    return { outcome, name, file, body, fields };
  });
}

test('nothing changes before the user agrees to the plan', () => {
  // The redesign's core safety property: a model-invoked setup may only inspect until the plan is agreed, and a
  // precise request is not agreement (an actor wrote a requested CI workflow before any plan when this was implicit).
  const gate = rule('Plan first');
  assert.match(gate, /no edits in the turn that starts setup/);
  assert.match(gate, /reply with the plan \(or the questions it needs\) and stop/);
  assert.match(gate, /Instructions about what to build, however exact \(files, paths, steps, "leave X as it is"\), are the request, not permission to skip the plan/);
  assert.match(gate, /Only an explicit waiver of the plan in the user's words \("go ahead without confirming", "skip the plan"\) lets you build in the same turn/);
  assert.match(rule('Scope lock'), /Build only the agreed plan/);
  assert.match(step(5), /End the turn asking whether to proceed/);
  assert.match(rule('Ask'), /Every reply before building ends with the question the user must answer/);
});

test('live changes need approval of the exact operation and target', () => {
  // setup-6: the site-search recipe created a role, token and indexes with no gate. The gate is now shared by every play.
  const gate = rule('Live changes');
  for (const write of ['plugins', 'webhooks', 'build triggers', 'roles', 'tokens', 'search indexes', 'migration runs', 'maintenance mode', 'imports'])
    assert.ok(gate.includes(write), `live-change gate does not name ${write}`);
  assert.match(gate, /only when the user approved that exact operation and target/);
  for (const play of plays())
    assert.match(play.fields.Live ?? '', /none|approval|user runs|hand over|recommendation only/i, `${play.name}: Live field has no gate`);
});

test('every play in the table exists with its contract fields', () => {
  const found = plays();
  for (const { name, file, body, fields } of found) {
    assert.ok(body, `${file} has no "## ${name}" section`);
    for (const field of ['Gives', 'Check', 'Build', 'Live', 'Verify']) assert.ok(fields[field], `${name} lacks **${field}**`);
  }
  // No orphan sections: every play section in a play file is reachable from the table.
  for (const file of new Set(found.map((p) => p.file)))
    for (const [, heading] of read(file).matchAll(/^## (.+)$/gm)) assert.ok(found.some((p) => p.name === heading && p.file === file), `${file}: "${heading}" is not in the SKILL.md table`);
});

test('play prerequisites name existing plays and never loop', () => {
  const found = plays();
  const needs = new Map(found.map((p) => [p.name, found.filter((q) => q !== p && (p.fields.Needs ?? '').includes(q.name)).map((q) => q.name)]));
  const visit = (name, path = []) => {
    assert.ok(!path.includes(name), `prerequisite cycle: ${[...path, name].join(' → ')}`);
    for (const next of needs.get(name)) visit(next, [...path, name]);
  };
  for (const name of needs.keys()) visit(name);
  // The chains the old manifest encoded.
  assert.deepEqual(needs.get('Release migrations'), ['Schema migrations']);
  assert.deepEqual(needs.get('Schema migrations'), ['Connect the repo']);
  assert.ok(needs.get('Previews and visual editing').includes('Connect the site'));
  assert.ok(needs.get('Imports').includes('Connect the repo'));
});

test('every outcome of the old 26 setup recipes is still covered by a play', () => {
  const byName = new Map(plays().map((p) => [p.name, p.body]));
  const coverage = {
    'cda-client': ['Connect the site', /query helper/], 'graphql-types': ['Connect the site', /typed queries/i],
    'draft-mode': ['Previews and visual editing', /draft mode/], 'web-previews': ['Previews and visual editing', /Web Previews/],
    'content-link': ['Previews and visual editing', /Content Link/], realtime: ['Previews and visual editing', /real-time/],
    'visual-editing': ['Previews and visual editing', /visual-editing-concepts/], 'cache-tags': ['Fresh published content', /Cache Tags/],
    'responsive-images': ['Render content', /image/], 'structured-text': ['Render content', /Structured Text/], 'video-player': ['Render content', /video/],
    seo: ['SEO and crawling', /canonical/], 'robots-sitemaps': ['SEO and crawling', /sitemap/], 'site-search': ['Site search', /Site Search/],
    'cli-bootstrap': ['Connect the repo', /link/], 'cma-types': ['Typed CMA code', /schema-generate/],
    migrations: ['Schema migrations', /running-migrations/], 'migration-autogenerate': ['Schema migrations', /autogenerate/],
    'sandbox-iteration': ['Schema migrations', /reset loop/], 'migration-release-workflow': ['Release migrations', /Release Helper/],
    'cli-profiles': ['Several projects', /profiles/], 'blueprint-sync': ['Several projects', /blueprint-sync/],
    webhooks: ['Webhooks and build triggers', /Webhooks/], 'build-triggers': ['Webhooks and build triggers', /build trigger/i],
    'wordpress-import': ['Imports', /wordpress:import/], 'contentful-import': ['Imports', /Contentful/],
  };
  for (const [recipe, [play, marker]] of Object.entries(coverage)) {
    assert.ok(byName.has(play), `${recipe}: play "${play}" is missing`);
    assert.match(byName.get(play), marker, `${recipe}: "${play}" no longer covers it`);
  }
  // Each play still sends the build to the sibling reference that owns it.
  const build = new Map(plays().map((p) => [p.name, p.fields.Build ?? '']));
  const owners = {
    'Connect the site': [/client-and-config\.md/, /type-generation\.md/], 'Previews and visual editing': [/draft-mode-concepts\.md/, /web-previews-concepts\.md/, /content-link-concepts\.md/, /realtime-concepts\.md/],
    'Fresh published content': [/draft-caching-environments\.md#cache-tags/, /cache-tag-adapters\.md/], 'Render content': [/image-concepts\.md/, /structured-text\.md/, /video-player-concepts\.md/],
    'SEO and crawling': [/seo-concepts\.md/, /robots-and-sitemaps\.md/], 'Site search': [/site-search-api\.md/, /access-control\.md/],
    'Connect the repo': [/cli-setup\.md/], 'Typed CMA code': [/schema-generate\.md/, /datocms-cma\/references\/type-generation\.md/],
    'Schema migrations': [/creating-migrations\.md/, /running-migrations\.md/, /#local-development-workflow/], 'Release migrations': [/#release-helper/],
    'Several projects': [/blueprint-sync\.md/, /#linking-a-project/], 'Webhooks and build triggers': [/#webhooks-webhooks/, /#build-triggers-buildtriggers/],
    Imports: [/importing-content\.md/, /cli-plugin-management\.md/],
  };
  for (const [play, links] of Object.entries(owners)) for (const link of links) assert.match(build.get(play) ?? '', link, `${play}: Build lost ${link}`);
});

test('validator anchors follow GitHub slugs and CommonMark fences', () => {
  // Setup links by anchor; a wrong slug or fence rule would accept broken pointers or reject good ones.
  const probe = spawnSync('python3', ['-c', `
import sys, tempfile, pathlib, json
sys.path.insert(0, ${JSON.stringify(join(repoRoot, 'evals/scripts'))})
import validate_skill_repo as v
t = pathlib.Path(tempfile.mkdtemp()) / 'x.md'
t.write_text("# Top\\n\x60\x60\x60\x60md\\n\x60\x60\x60js\\n# not heading\\n\x60\x60\x60\\n\x60\x60\x60\x60\\n~~~\\n\x60\x60\x60\\n~~~\\n## After tilde\\n")
print(json.dumps({"headings": v._markdown_headings(t), "slugs": sorted(v._github_heading_slugs(["\x60<ContentLink />\x60 component", "_italic_ word", "A &amp; B", "Webhooks (\x60webhooks\x60)", "Setup", "Setup"]))}))
`], { encoding: 'utf8' });
  assert.equal(probe.status, 0, probe.stderr);
  const { headings, slugs } = JSON.parse(probe.stdout);
  assert.deepEqual(headings, ['Top', 'After tilde']);
  assert.deepEqual(slugs, ['a--b', 'contentlink--component', 'italic-word', 'setup', 'setup-1', 'webhooks-webhooks']);
});

test('setup speaks in outcomes and ships no implementation', () => {
  const files = ['SKILL.md', ...readdirSync(join(setup, 'references')).map((f) => `references/${f}`)];
  for (const file of files) {
    const text = read(file);
    assert.doesNotMatch(text, /```/, `${file} ships a code block; implementation belongs to sibling skills`);
    assert.doesNotMatch(text, /\brecipes?\b|\bStage [AB]\b|\blanes?\b/i, `${file} uses the old routing vocabulary`);
  }
  assert.deepEqual(readdirSync(setup).sort(), ['SKILL.md', 'agents', 'references'], 'setup ships extra folders (scripts belong to their owning skill)');
  assert.equal(files.length, 3, 'setup grew beyond SKILL.md and two play files');
  // Budget: the whole skill stays a fraction of the 25k words the recipe tree carried.
  const words = files.map(read).join(' ').split(/\s+/).length;
  assert.ok(words < 4500, `setup is ${words} words`);
});

test('setup is model-invocable with a matching Codex policy', () => {
  const skill = read('SKILL.md');
  assert.doesNotMatch(skill.split('\n---\n')[0], /disable-model-invocation/);
  assert.match(read('agents/openai.yaml'), /^policy:\n {2}allow_implicit_invocation: true$/m);
});

test('sibling skills no longer route into setup recipe ids', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.md') && !path.startsWith(setup) && /`datocms-setup` (for|with) `|datocms-setup[^\n]*\brecipe/.test(readFileSync(path, 'utf8'))) offenders.push(path);
    }
  };
  walk(skills);
  assert.deepEqual(offenders, []);
});

test('setup links resolve to existing sibling files and headings', () => {
  // The validator owns link, anchor and FW-heading resolution (and runs in the pre-commit hook).
  const run = spawnSync('python3', [join(repoRoot, 'evals/scripts/validate_skill_repo.py'), '--repo-root', repoRoot], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /datocms-setup/i);
});

test('package-manager detection maps Bun text lockfiles to bun', () => {
  // setup-11: Bun >= 1.2 writes text bun.lock (bun.com/docs/pm/lockfile; Bun 1.2.0 `bun add` wrote bun.lock, no bun.lockb).
  assert.match(step(1), /`bun\.lock`\/`bun\.lockb` → bun/);
  assert.match(step(1), /`pnpm-lock\.yaml` → pnpm, `yarn\.lock` → yarn/);
});

test('starter offer keeps the official repositories', () => {
  const starters = section(read('SKILL.md'), '## New site');
  for (const name of ['nextjs', 'nuxt', 'sveltekit', 'astro']) assert.match(starters, new RegExp(`https://github\\.com/datocms/${name}-starter-kit`));
});

test('web-previews plugin install reads the secret from process.env at run time', () => {
  // setup-6: migrations are committed and replayed; datocms 4.2.0 loads .env.local/.env (cli-utils index.js dotenv.config)
  // and require()s migrations in-process (commands/migrations/run.js), so process.env reaches them at run time.
  const install = section(readFileSync(join(skills, 'datocms-frontend-integrations/references/web-previews-concepts.md'), 'utf8'), '## Plugin Installation');
  assert.match(install, /process\.env\.SECRET_API_TOKEN/);
  assert.match(install, /never inline/);
});

test('importer docs tell teammates the CLI login and plugin install are per machine', () => {
  // leftover-3: @oclif/plugin-plugins records installs in <config.dataDir>/package.json, a per-user XDG dir, not the project.
  const probe = spawnSync(process.execPath, ['--input-type=module', '-e', `
    const { Config } = (await import('node:module')).createRequire(${JSON.stringify(join(devRoot, 'package.json'))})('@oclif/core');
    const { default: Plugins } = await import(${JSON.stringify(pathToFileURL(join(devRoot, 'node_modules/@oclif/plugin-plugins/lib/plugins.js')).href)});
    console.log(new Plugins({ config: await Config.load(${JSON.stringify(join(devRoot, 'node_modules/datocms'))}) }).pjsonPath);
  `], { env: { PATH: process.env.PATH, HOME: '/tmp/teammate', XDG_DATA_HOME: '/tmp/teammate/data' }, encoding: 'utf8' });
  assert.equal(probe.stdout.trim(), '/tmp/teammate/data/datocms/package.json', probe.stderr);
  // The importers extend cli-utils CmaClientCommand: a linked profile (siteId) takes its token from OAuth credentials in
  // the per-user env-paths config dir (credentials.js) and fails without them, even with DATOCMS_API_TOKEN set.
  const teammate = mkdtempSync(join(tmpdir(), 'teammate-'));
  writeFileSync(join(teammate, 'datocms.config.json'), JSON.stringify({ profiles: { default: { siteId: '1' } } }));
  const linked = spawnSync(process.execPath, [join(devRoot, 'node_modules/datocms/bin/run'), 'migrations:new', 'probe'], { cwd: teammate, env: { PATH: process.env.PATH, HOME: teammate, DATOCMS_API_TOKEN: 'offline' }, encoding: 'utf8' });
  assert.match(linked.stderr, /linked but no OAuth credentials/, linked.stderr + linked.stdout);
  const importing = readFileSync(join(skills, 'datocms-cli/references/importing-content.md'), 'utf8');
  for (const importer of ['## WordPress Import', '## Contentful Import']) {
    const installation = section(`\n${section(importing, importer)}`, '### Installation');
    assert.match(installation, /teammate(?=[^\n]*`npx datocms login`)(?=[^\n]*`plugins:install`)[^\n]*per machine/, importer);
  }
  // Setup's own handoff keeps the reminder.
  assert.match(section(read('references/project.md'), '## Imports'), /once per machine/);
});
