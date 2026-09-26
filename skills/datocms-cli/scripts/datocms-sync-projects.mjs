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
      '  node scripts/datocms-sync-projects.mjs <profile...>',
      '    [--dry-run] [--source=<env>] [--destination-template=<template>]',
      '    [--fast-fork [--force]] [-- <extra migrations:run args>]',
      '',
      'Default destination template: {profile}-sync-{timestamp}',
      '  {profile}: profile id lowercased, other characters -> "-"; {timestamp}: UTC YYYYMMDDHHmmss',
      'Destination ids may contain only lowercase letters, numbers and dashes.',
    ].join('\n'),
  );
}

function parseArgs(argv) {
  const parsed = {
    destinationTemplate: '{profile}-sync-{timestamp}',
    dryRun: false,
    extraArgs: [],
    fastFork: false,
    force: false,
    help: false,
    profiles: [],
    source: undefined,
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

    if (arg === '--fast-fork') {
      parsed.fastFork = true;
      continue;
    }

    if (arg === '--force') {
      parsed.force = true;
      continue;
    }

    if (arg.startsWith('--source=')) {
      parsed.source = arg.slice('--source='.length);
      continue;
    }

    if (arg === '--source') {
      parsed.source = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith('--destination-template=')) {
      parsed.destinationTemplate = arg.slice('--destination-template='.length);
      continue;
    }

    if (arg === '--destination-template') {
      parsed.destinationTemplate = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--') {
      parsed.extraArgs.push(...argv.slice(i + 1));
      break;
    }

    // A mistyped flag (--dryrun) would otherwise become a profile id and run the profiles before it for real.
    if (arg.startsWith('-')) {
      parsed.unknown.push(arg);
      continue;
    }

    parsed.profiles.push(arg);
  }

  return parsed;
}

// DatoCMS environment ids may contain only lowercase letters, numbers and dashes.
const ENVIRONMENT_ID = /^[a-z0-9-]+$/;

function formatDestination(template, profile, timestamp) {
  // Profile ids may carry capitals or underscores (client_a); environment ids may not.
  const slug = profile.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return template.replaceAll('{profile}', slug).replaceAll('{timestamp}', timestamp);
}

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  usage();
  process.exit(0);
}

if (options.unknown.length > 0) {
  // Names only: a value could be a token.
  console.error(`Unknown option: ${options.unknown.map((arg) => arg.split('=')[0]).join(' ')}`);
  usage();
  process.exit(1);
}

if (options.profiles.length === 0) {
  usage();
  process.exit(1);
}

// migrations:run rejects --force unless --fast-fork is also set.
if (options.force && !options.fastFork) {
  console.error('--force requires --fast-fork.');
  usage();
  process.exit(1);
}

// UTC YYYYMMDDHHmmss: digits only, so the id stays valid.
const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);

const destinations = options.profiles.map((profile) => [
  profile,
  formatDestination(options.destinationTemplate, profile, timestamp),
]);

// Refuse before any command runs, so no project gets a partial rollout.
const invalid = destinations.filter(([, destination]) => !ENVIRONMENT_ID.test(destination));

if (invalid.length > 0) {
  for (const [profile, destination] of invalid) {
    console.error(`Invalid destination environment id "${destination}" for profile ${profile}: use only lowercase letters, numbers and dashes.`);
  }
  process.exit(1);
}

for (const [profile, destination] of destinations) {
  const runArgs = [
    'migrations:run',
    `--profile=${profile}`,
    `--destination=${destination}`,
  ];

  if (options.source) {
    runArgs.push(`--source=${options.source}`);
  }

  if (options.fastFork) {
    runArgs.push('--fast-fork');
  }

  if (options.force) {
    runArgs.push('--force');
  }

  if (options.dryRun) {
    runArgs.push('--dry-run');
  }

  runArgs.push(...options.extraArgs);

  console.log(`\n==> ${profile} -> ${destination}`);
  run(runArgs, profile);
}
