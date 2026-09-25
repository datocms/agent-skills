import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

// The importer commands authenticate through the linked CLI profile, so the
// shipped helpers must run with provider credentials only.
const recipes = resolve(import.meta.dirname, '../skills/datocms-setup/recipes/onboarding');

function runHelper(script, env, args = []) {
  const directory = mkdtempSync(join(tmpdir(), 'import-helper-'));
  try {
    const log = join(directory, 'argv.json');
    writeFileSync(join(directory, 'npx'), `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)));\n`, {mode: 0o755});
    const result = spawnSync(process.execPath, [join(recipes, script), ...args], {cwd: directory, encoding: 'utf8', env: {PATH: directory, HOME: directory, ...env}});
    return {...result, argv: existsSync(log) ? JSON.parse(readFileSync(log, 'utf8')) : undefined};
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
}

test('WordPress helper runs without DATOCMS_API_TOKEN and forwards the import command', () => {
  const credentials = {WORDPRESS_USERNAME: 'editor', WORDPRESS_PASSWORD: 'app-pass'};
  const script = 'wordpress-import/scripts/datocms-import-wordpress.mjs';
  const result = runHelper(script, {...credentials, WORDPRESS_URL: 'https://wp.example'}, ['--ignore-errors']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.argv, ['datocms', 'wordpress:import', '--wp-url=https://wp.example', '--wp-username=editor', '--wp-password=app-pass', '--ignore-errors']);
  const json = runHelper(script, {...credentials, WORDPRESS_URL: 'https://wp.example', WORDPRESS_JSON_API_URL: 'https://wp.example/wp-json'});
  assert.equal(json.status, 0, json.stderr);
  assert.equal(json.argv[2], '--wp-json-api-url=https://wp.example/wp-json');
  const missing = runHelper(script, {WORDPRESS_URL: 'https://wp.example', WORDPRESS_USERNAME: 'editor'});
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /WORDPRESS_PASSWORD/);
  assert.equal(missing.argv, undefined);
});

test('Contentful helper runs without DATOCMS_API_TOKEN and forwards the import command', () => {
  const script = 'contentful-import/scripts/datocms-import-contentful.mjs';
  const result = runHelper(script, {CONTENTFUL_SPACE_ID: 'space1', CONTENTFUL_TOKEN: 'cf-token', CONTENTFUL_ENVIRONMENT: 'staging'}, ['--skip-content']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.argv, ['datocms', 'contentful:import', '--contentful-space-id=space1', '--contentful-token=cf-token', '--contentful-environment=staging', '--skip-content']);
  const missing = runHelper(script, {CONTENTFUL_SPACE_ID: 'space1'});
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /CONTENTFUL_TOKEN/);
  assert.equal(missing.argv, undefined);
});
