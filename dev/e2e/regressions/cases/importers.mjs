import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Fresh HOME/XDG/npm-prefix dirs: the host DatoCMS login and CLI data dir stay unreachable.
const isolated = (base) => Object.fromEntries(
  [['HOME', 'home'], ['XDG_CONFIG_HOME', 'config'], ['XDG_DATA_HOME', 'data'], ['XDG_CACHE_HOME', 'cache'], ['NPM_CONFIG_PREFIX', 'npm-global']]
    .map(([key, dir]) => { mkdirSync(join(base, dir), { recursive: true }); return [key, join(base, dir)]; }),
);
const run = (command, args, cwd, env) => spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 300000 });
const pkg = (setupImporter, devDependencies = {}) => JSON.stringify({
  name: 'wordpress-migration', private: true,
  scripts: { 'setup:importer': setupImporter },
  devDependencies: { datocms: '4.2.0', ...devDependencies },
}, null, 2);

export default [
  {
    id: 'cli-importer-install',
    guards: ['skills/datocms-cli/references/importing-content.md', 'skills/datocms-setup/recipes/onboarding/wordpress-import/recipe.md'],
    prompt: `We are going to migrate our WordPress site into DatoCMS with the official DatoCMS CLI importer. Set up the importer for this project so that \`npx datocms wordpress:import --help\` works here. Also add an npm script named \`setup:importer\` to package.json that a teammate can run once, after cloning and \`npm install\`, to get the same working command on their machine. The \`datocms\` CLI is already a devDependency and installed; npm registry access is available. Do not run an actual import: no WordPress or DatoCMS credentials or live project are available.`,
    budget: { timeoutMs: 420000, maxCommands: 60 },
    setup(workspace) {
      writeFileSync(join(workspace, 'package.json'), JSON.stringify({ name: 'wordpress-migration', private: true, devDependencies: { datocms: '4.2.0' } }, null, 2));
      // A real install (not the shared root symlink): the old guidance runs npm install in the workspace.
      const install = run('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts', '--prefer-offline'], workspace, process.env);
      assert.equal(install.status, 0, install.stderr);
      return { environment: isolated(join(workspace, '..', 'oracle', 'actor')) };
    },
    check(workspace) {
      const script = JSON.parse(readFileSync(join(workspace, 'package.json'), 'utf8')).scripts?.['setup:importer'];
      assert.ok(script, 'package.json has no setup:importer script');
      // Teammate on a fresh machine: clean CLI data/config dirs, project deps already installed.
      const env = { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR ?? '/tmp', LANG: process.env.LANG ?? 'C', ...isolated(join(workspace, '..', 'oracle', `check-${Date.now()}`)) };
      const setup = run('npm', ['run', 'setup:importer'], workspace, env);
      assert.equal(setup.status, 0, `setup:importer failed: ${setup.stderr.slice(-2000)}`);
      const help = run('npx', ['--no-install', 'datocms', 'wordpress:import', '--help'], workspace, env);
      assert.equal(help.status, 0, `wordpress:import --help failed: ${(help.stderr + help.stdout).slice(-1000)}`);
      assert.match(help.stdout, /Imports a WordPress site into a DatoCMS project[\s\S]*--wp-username/);
      const listed = run('npx', ['--no-install', 'datocms', 'plugins', '--json'], workspace, env);
      assert.equal(listed.status, 0, listed.stderr);
      const owner = JSON.parse(listed.stdout).find((p) => p.commandIDs?.includes('wordpress:import'));
      assert.equal(owner?.name, '@datocms/cli-plugin-wordpress', 'wordpress:import is not provided by the official plugin');
      assert.ok(['user', 'link'].includes(owner.type), `importer registered as ${owner.type}, not a CLI plugin`);
      return { script, plugin: `${owner.name}@${owner.version} (${owner.type})` };
    },
    controls: {
      pass: { files: { 'package.json': pkg('npx datocms plugins:install @datocms/cli-plugin-wordpress') } },
      fail: [
        { name: 'project-dev-dependency', files: { 'package.json': pkg('npm install --save-dev @datocms/cli-plugin-wordpress', { '@datocms/cli-plugin-wordpress': '^4.2.0' }) } },
      ],
    },
  },
];
