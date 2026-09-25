import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function run(args) {
  const result = spawnSync('npx', ['datocms', ...args], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: npx datocms ${args.join(' ')}`);
  }
}

function usage() {
  console.error(
    [
      'Usage:',
      '  node scripts/datocms-autogenerate-migration.mjs "<name>" --from=<env>',
      '    [--to=<env>] [--profile=<profile-id>] [--ts] [--js] [--schema=<filter>]',
      '',
      'Autogenerate is schema-only: it captures model/field diffs, not records or uploads.',
    ].join('\n'),
  );
}

// Same directory `datocms migrations:new` writes to: --config-file / DATOCMS_CONFIG_FILE
// (default ./datocms.config.json), --profile / DATOCMS_PROFILE (default "default"; both
// also read from .env.local and .env), then the profile's migrations.directory relative
// to the config file, else ./migrations.
function migrationsDir(options) {
  for (const file of ['.env.local', '.env']) if (existsSync(file)) process.loadEnvFile?.(file);
  const configPath = resolve(options['config-file'] ?? process.env.DATOCMS_CONFIG_FILE ?? 'datocms.config.json');
  const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
  const directory = config.profiles?.[options.profile ?? process.env.DATOCMS_PROFILE ?? 'default']?.migrations?.directory;
  return directory ? resolve(dirname(configPath), directory) : resolve('migrations');
}

// Keep the directory's single existing format; otherwise the CLI infers it (template, tsconfig).
function inferMigrationFormat(directory) {
  const files = existsSync(directory) ? readdirSync(directory).filter((file) => /^\d+.*\.(js|ts)$/.test(file)) : [];
  const hasTs = files.some((file) => file.endsWith('.ts'));
  const hasJs = files.some((file) => file.endsWith('.js'));
  return hasTs === hasJs ? undefined : hasTs ? '--ts' : '--js';
}

const [name, ...rawArgs] = process.argv.slice(2);

if (!name || name === '--help' || rawArgs.includes('--help')) {
  usage();
  process.exit(name ? 0 : 1);
}

const options = {};
const passthroughArgs = [];

for (let i = 0; i < rawArgs.length; i += 1) {
  const match = rawArgs[i].match(/^--(from|to|profile|config-file)(?:=(.*))?$/);

  if (!match) {
    passthroughArgs.push(rawArgs[i]);
    continue;
  }

  const value = match[2] ?? rawArgs[++i];
  options[match[1]] = value;

  if (match[1] === 'profile' || match[1] === 'config-file') {
    passthroughArgs.push(`--${match[1]}=${value}`);
  }
}

if (!options.from) {
  usage();
  process.exit(1);
}

const autogenerateTarget = options.to ? `${options.from}:${options.to}` : options.from;
const formatFlag =
  passthroughArgs.includes('--ts') || passthroughArgs.includes('--js')
    ? undefined
    : inferMigrationFormat(migrationsDir(options));

run([
  'migrations:new',
  name,
  `--autogenerate=${autogenerateTarget}`,
  ...(formatFlag ? [formatFlag] : []),
  ...passthroughArgs,
]);
