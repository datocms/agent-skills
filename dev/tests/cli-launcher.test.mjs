import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {cliLauncherSource} from '../e2e/lib/cliLauncher.ts';

test('live CLI launcher works inside an ESM project, forwards arguments and enforces its environment', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cli-launcher-'));
  try {
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}');
    const cli = join(directory, 'actual-cli.mjs');
    writeFileSync(cli, 'console.log(JSON.stringify(process.argv.slice(2))); if(process.argv.includes("fail")) process.exit(23);');
    const launcher = join(directory, 'datocms');
    writeFileSync(launcher, cliLauncherSource(cli), {mode: 0o700});
    const run = (args) => spawnSync(launcher, args, {cwd: directory, env: {DATOCMS_ENVIRONMENT: 'sandbox'}, encoding: 'utf8'});
    for (const command of ['cma:call', 'cma:script', 'schema:inspect', 'schema:generate']) {
      const result = run([command, 'value with spaces']);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout), [command, 'value with spaces', '--environment', 'sandbox']);
      for (const flags of [['--environment', 'main'], ['--environment=main']]) {
        const wrong = run([command, ...flags]);
        assert.notEqual(wrong.status, 0);
        assert.equal(wrong.stdout, '');
        assert.match(wrong.stderr, /Wrong evaluation environment/);
      }
      assert.deepEqual(JSON.parse(run([command, '--environment=sandbox']).stdout), [command, '--environment=sandbox']);
    }
    assert.deepEqual(JSON.parse(run(['cma:docs', 'items']).stdout), ['cma:docs', 'items']);
    assert.equal(run(['fail']).status, 23);
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});
