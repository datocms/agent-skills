import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// The CLI reads the same file; a missing or invalid one is left for it to report.
function readProfiles() {
  try {
    return JSON.parse(readFileSync(process.env.DATOCMS_CONFIG_FILE || 'datocms.config.json', 'utf8')).profiles ?? {};
  } catch {
    return {};
  }
}

const profiles = readProfiles();

// Linked profiles (siteId) never read token env vars, so CI passes the token as a flag.
// Same variable the CLI would read: the profile's apiTokenEnvName, else the default naming.
function tokenArgs(profile = process.env.DATOCMS_PROFILE || 'default') {
  const name = profiles[profile]?.apiTokenEnvName
    || (profile === 'default' ? 'DATOCMS_API_TOKEN' : `DATOCMS_${profile.toUpperCase()}_PROFILE_API_TOKEN`);
  return process.env[name] ? [`--api-token=${process.env[name]}`] : [];
}

function run(args, profile) {
  const result = spawnSync('npx', ['datocms', ...args, ...tokenArgs(profile)], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    // Never echo args: they carry the API token.
    throw new Error(`Command failed: npx datocms ${args[0]}`);
  }
}

function usage() {
  console.error(
    [
      'Usage:',
      '  node scripts/datocms-release.mjs --destination=<env-id>',
      '    [--profile=<profile-id>] [--dry-run] [--skip-promote]',
      '    [--fast-fork] [--force] [-- <extra migrations:run args>]',
      '',
      'Destination ids may contain only lowercase letters, numbers and dashes.',
      'Dry run: only runs migrations:run --dry-run and skips maintenance/promotion.',
    ].join('\n'),
  );
}

function parseArgs(argv) {
  const parsed = {
    destination: undefined,
    dryRun: false,
    extraArgs: [],
    fastFork: false,
    force: false,
    help: false,
    profile: undefined,
    skipPromote: false,
    unknown: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help') {
      parsed.help = true;
      continue;
    }

    if (arg === '--dry-run') {
      parsed.dryRun = true;
      continue;
    }

    if (arg === '--skip-promote') {
      parsed.skipPromote = true;
      continue;
    }

    if (arg === '--fast-fork') {
      parsed.fastFork = true;
      continue;
    }

    if (arg === '--force') {
      parsed.force = true;
      continue;
    }

    if (arg.startsWith('--destination=')) {
      parsed.destination = arg.slice('--destination='.length);
      continue;
    }

    if (arg === '--destination') {
      parsed.destination = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith('--profile=')) {
      parsed.profile = arg.slice('--profile='.length);
      continue;
    }

    if (arg === '--profile') {
      parsed.profile = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--') {
      parsed.extraArgs.push(...argv.slice(i + 1));
      break;
    }

    // Only args after `--` reach migrations:run; anything else is a mistake to catch before maintenance:on.
    parsed.unknown.push(arg);
  }

  return parsed;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  usage();
  process.exit(0);
}

if (args.unknown.length > 0) {
  // Names only: a value could be a token.
  console.error(`Unknown argument: ${args.unknown.map((arg) => (arg.startsWith('-') ? arg.split('=')[0] : '<value>')).join(' ')}`);
  usage();
  process.exit(1);
}

if (!args.destination) {
  usage();
  process.exit(1);
}

// DatoCMS environment ids may contain only lowercase letters, numbers and dashes.
// Checked before maintenance:on, so a bad id never locks the project.
if (!/^[a-z0-9-]+$/.test(args.destination)) {
  console.error(`Invalid --destination "${args.destination}": use only lowercase letters, numbers and dashes.`);
  process.exit(1);
}

if (args.dryRun) {
  run([
    'migrations:run',
    `--destination=${args.destination}`,
    ...(args.profile ? [`--profile=${args.profile}`] : []),
    ...(args.fastFork ? ['--fast-fork'] : []),
    '--dry-run',
    ...args.extraArgs,
  ], args.profile);
  process.exit(0);
}

try {
  const maintenanceArgs = ['maintenance:on'];

  if (args.profile) {
    maintenanceArgs.push(`--profile=${args.profile}`);
  }

  if (args.force) {
    maintenanceArgs.push('--force');
  }

  run(maintenanceArgs, args.profile);

  const migrationArgs = [
    'migrations:run',
    `--destination=${args.destination}`,
  ];

  if (args.profile) {
    migrationArgs.push(`--profile=${args.profile}`);
  }

  if (args.fastFork) {
    migrationArgs.push('--fast-fork');
  }

  if (args.force && args.fastFork) {
    migrationArgs.push('--force');
  }

  migrationArgs.push(...args.extraArgs);

  run(migrationArgs, args.profile);

  if (!args.skipPromote) {
    const promoteArgs = ['environments:promote', args.destination];

    if (args.profile) {
      promoteArgs.push(`--profile=${args.profile}`);
    }

    run(promoteArgs, args.profile);
  }
} finally {
  try {
    run([
      'maintenance:off',
      ...(args.profile ? [`--profile=${args.profile}`] : []),
    ], args.profile);
  } catch (error) {
    console.error('Failed to disable maintenance mode.');
    console.error(error);
    process.exitCode = 1;
  }
}
