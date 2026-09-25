import { spawnSync } from 'node:child_process';

// Linked profiles (siteId) never read token env vars, so CI passes the token as a flag.
function tokenArgs(profile = process.env.DATOCMS_PROFILE || 'default') {
  const name = profile === 'default' ? 'DATOCMS_API_TOKEN' : `DATOCMS_${profile.toUpperCase()}_PROFILE_API_TOKEN`;
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
      '    [--fast-fork] [--force] [-- <extra migrations:run args>]',
      '',
      'Default destination template: {profile}-sync-{timestamp}',
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

    parsed.profiles.push(arg);
  }

  return parsed;
}

function formatDestination(template, profile, timestamp) {
  return template.replaceAll('{profile}', profile).replaceAll('{timestamp}', timestamp);
}

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  usage();
  process.exit(0);
}

if (options.profiles.length === 0) {
  usage();
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

for (const profile of options.profiles) {
  const destination = formatDestination(
    options.destinationTemplate,
    profile,
    timestamp,
  );

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
