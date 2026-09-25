import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const devRoot = fileURLToPath(new URL('../', import.meta.url));
const repoRoot = process.env.REFERENCE_REPO_ROOT ? resolve(process.env.REFERENCE_REPO_ROOT) : resolve(devRoot, '..');
const setup = join(repoRoot, 'skills/datocms-setup');
const read = (path) => readFileSync(join(setup, path), 'utf8');
const section = (text, heading) => text.split(`\n${heading}\n`)[1].split(/\n##+ /)[0];

test('site-search confirms planned live-project writes before creating the role, token or index', () => {
  // setup-6: the recipe created a role, an access token and indexes with a CMA token and no gate (web-previews already confirms).
  const steps = section(read('recipes/frontend-features/site-search/recipe.md'), '### Dato-side automation').split('\n').filter((line) => /^\d+\. /.test(line));
  const confirm = steps.findIndex((line) => /confirm/i.test(line));
  assert.ok(confirm >= 0 && confirm < steps.findIndex((line) => /create or update/.test(line)), 'no confirmation before the first live write');
});

test('web-previews plugin-install migration reads the secret from process.env', () => {
  // setup-6: migrations are committed and replayed; datocms 4.2.0 loads .env.local/.env (cli-utils index.js dotenv.config)
  // and require()s migrations in-process (commands/migrations/run.js), so process.env reaches them at run time.
  const surface = read('recipes/frontend-foundation/web-previews/recipe.md').split('\n').find((line) => line.includes('**Repo has `migrations/`**'));
  assert.match(surface, /secret[^;]*`process\.env`[^;]*never inline/);
});

test('router.md, manifest groups and recipe reference lists agree', () => {
  // setup-10: router.md omitted cli-bootstrap (manifest group platform, router fixture case 0), and 9 manifest
  // shared_references lists differed from the references their recipes load.
  const manifest = JSON.parse(read('references/recipe-manifest.json'));
  const rows = new Map([...read('references/router.md').matchAll(/^\| `([\w-]+)` \| (.+?) \|/gm)].map(([, group, ids]) => [group, [...ids.matchAll(/`([\w-]+)`/g)].map((m) => m[1]).sort()]));
  for (const group of manifest.discovery_mode_groups)
    assert.deepEqual(rows.get(group), manifest.recipes.filter((r) => r.group === group).map((r) => r.id).sort(), `router.md ${group} row`);
  for (const recipe of manifest.recipes) {
    const linked = new Set([...read(recipe.path).matchAll(/(?:\.\.\/)+(datocms-[\w-]+\/references\/[\w./-]+?\.md)/g)].map((m) => `../${m[1]}`));
    assert.deepEqual([...recipe.shared_references].sort(), [...linked].sort(), `${recipe.id} shared_references`);
  }
});

test('package-manager rule maps Bun text lockfiles to bun add', () => {
  // setup-11: Bun >= 1.2 writes text bun.lock (bun.com/docs/pm/lockfile; Bun 1.2.0 `bun add` wrote bun.lock, no bun.lockb).
  const rules = [...section(read('patterns/MANDATORY_RULES.md'), '## Dependency Installation').matchAll(/^\d+\. (.+?) -> `(.+?)`/gm)];
  const pick = (lockfile) => rules.find(([, when]) => when.includes(`\`${lockfile}\``) || when.startsWith('Otherwise'))[2];
  assert.deepEqual(['bun.lock', 'bun.lockb', 'pnpm-lock.yaml', 'package-lock.json'].map(pick), ['bun add', 'bun add', 'pnpm add', 'npm install']);
});

test('autogenerate helper keeps the format of the directory datocms migrations:new writes to', () => {
  // setup-12: the helper scanned a hard-coded ./migrations; datocms 4.2.0 migrations:new resolves --config-file,
  // --profile/DATOCMS_PROFILE (also from .env.local/.env) and the profile's migrations.directory.
  const cli = join(devRoot, 'node_modules/datocms/bin/run');
  const script = join(setup, 'recipes/migrations/migration-autogenerate/scripts/datocms-autogenerate-migration.mjs');
  const perProfile = { default: { migrations: { directory: './migrations' } }, blog: { migrations: { directory: './cms/blog' } } };
  const legacyJs = { 'migrations/1700000000_init.js': '', 'cms/blog/1700000001_init.ts': '' };
  const scenarios = [
    { args: ['--profile', 'blog'], profiles: perProfile, files: legacyJs, dir: 'cms/blog', ext: '.ts' },
    { args: [], profiles: perProfile, files: { ...legacyJs, '.env.local': 'DATOCMS_PROFILE=blog\n' }, dir: 'cms/blog', ext: '.ts' },
    { args: [], profiles: { default: { migrations: { directory: './datocms/migrations' } } }, files: { 'tsconfig.json': '{}', 'datocms/migrations/1700000000_init.js': '' }, dir: 'datocms/migrations', ext: '.js' },
    // migrations.directory is relative to the config file, not the cwd.
    { args: ['--config-file', 'cms/datocms.config.json'], config: 'cms/datocms.config.json', profiles: { default: perProfile.default }, files: { 'migrations/1700000000_init.js': '', 'cms/migrations/1700000001_init.ts': '' }, dir: 'cms/migrations', ext: '.ts' },
  ];
  for (const { args, config = 'datocms.config.json', profiles, files, dir, ext } of scenarios) {
    const root = mkdtempSync(join(tmpdir(), 'autogenerate-')), repo = join(root, 'repo'), bin = join(root, 'bin');
    for (const [path, content] of Object.entries({ ...files, [config]: JSON.stringify({ profiles }) })) {
      mkdirSync(dirname(join(repo, path)), { recursive: true });
      writeFileSync(join(repo, path), content);
    }
    // `npx` shim: record argv, then run the real CLI offline. --autogenerate only needs the API for the diff body;
    // directory and format are resolved before it.
    mkdirSync(bin);
    writeFileSync(join(bin, 'npx'), `#!${process.execPath}
const args = process.argv.slice(3);
require('node:fs').appendFileSync(${JSON.stringify(join(root, 'argv.jsonl'))}, JSON.stringify(args) + '\\n');
process.exit(require('node:child_process').spawnSync(process.execPath, [${JSON.stringify(cli)}, ...args.filter((a) => !a.startsWith('--autogenerate='))], { stdio: 'inherit' }).status);
`, { mode: 0o755 });
    const env = { PATH: `${bin}:${process.env.PATH}`, HOME: root, XDG_DATA_HOME: join(root, 'data'), XDG_CONFIG_HOME: join(root, 'config'), XDG_CACHE_HOME: join(root, 'cache'), DATOCMS_API_TOKEN: 'offline', DATOCMS_BLOG_PROFILE_API_TOKEN: 'offline' };
    const run = spawnSync(process.execPath, [script, 'add author', '--from=sandbox', '--to=main', ...args], { cwd: repo, env, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr + run.stdout);
    const [argv] = readFileSync(join(root, 'argv.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    assert.deepEqual(argv.slice(0, 3), ['migrations:new', 'add author', '--autogenerate=sandbox:main']);
    const created = readdirSync(join(repo, dir)).filter((file) => file.includes('_addAuthor'));
    assert.equal(created.length, 1, `CLI wrote no migration into ${dir}`);
    assert.ok(created[0].endsWith(ext), `${created[0]} breaks the ${ext} convention of ${dir} (${JSON.stringify(argv)})`);
  }
});

test('importer recipes tell teammates the CLI login and plugin install are per machine', () => {
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
  for (const recipe of ['wordpress-import', 'contentful-import'])
    assert.match(section(read(`recipes/onboarding/${recipe}/recipe.md`), '## Step 5: Next Steps'), /teammate(?=[^\n]*`npx datocms login`)(?=[^\n]*`plugins:install`)[^\n]*per machine/, recipe);
});
