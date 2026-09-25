_Internal recipe for `datocms-setup`. Use this file only after the parent skill selects the `sandbox-iteration` recipe and queues any prerequisites from `../../../references/recipe-manifest.json`._

# DatoCMS Sandbox Iteration Setup

## Step 1: Detect Context (silent)

1. **Node project** — Check for `package.json`
2. **CLI migrations baseline** — Check for the `datocms` npm package, `datocms.config.json`, and a `migrations/` directory or existing migration scripts
3. **Existing helper** — Check for `scripts/datocms-reset-sandbox.mjs`
4. **Existing scripts** — Check `package.json` for `datocms:sandbox:reset`

### Stop conditions

- If the project does not already have working CLI migration setup, stop and record `migrations` as a prerequisite and continue after it is applied.
- If an existing sandbox-reset helper follows a materially different workflow, patch it in place by default and only ask if a rewrite would replace working behavior.

## Step 2: Ask Questions

Only ask if an existing sandbox-reset helper materially conflicts with the lean reset-and-rerun flow.

## Step 3: Load References

Read only these references:

- `../../../../datocms-cli/references/cli-setup.md`
- `../../../../datocms-cli/references/running-migrations.md`
- `../../../../datocms-cli/references/environment-commands.md`
- `../../../../datocms-cli/references/deployment-workflow.md`

Also inspect this bundled asset only when generating files:

- `scripts/datocms-reset-sandbox.mjs`

## Step 4: Generate Code

Generate only these project changes:

1. **Create or patch `scripts/datocms-reset-sandbox.mjs`** from `scripts/datocms-reset-sandbox.mjs`
2. **Patch `package.json`** with `datocms:sandbox:reset`

### Required behavior

The helper script must:

1. Accept explicit runtime arguments for the sandbox environment id
2. Accept an optional source environment id and optional profile flag
3. Destroy the target sandbox if it already exists
4. Fork from the requested source environment, or resolve the primary environment when no source is provided
5. Optionally rerun migrations in place on the sandbox
6. Never promote an environment
7. Never toggle maintenance mode

### Mandatory rules

- Use Node built-ins only in the helper script
- Keep environment ids and profiles runtime-configurable instead of hardcoding repo-specific values
- Allow the helper to skip the migration rerun when explicitly requested
- Do not add CI files, promotion logic, or maintenance-mode logic
- Do not add more than one helper script for this setup

## Step 5: Install Dependencies

Do not add any dependencies for this setup beyond the existing CLI baseline. The helper must work with Node built-ins only.

## Step 6: Next Steps

After generating the files, tell the user:

1. Use the helper against disposable sandbox environments only
2. Run it once with migrations enabled and once with `--skip-migrations` so they understand both modes
3. Keep production rollout separate by using `datocms-setup` for `migration-release-workflow`

## Verification Checklist

Before presenting the result, verify:

1. `scripts/datocms-reset-sandbox.mjs` exists
2. `package.json` contains `datocms:sandbox:reset`
3. The helper uses `npx datocms`
4. The helper never promotes an environment
5. The helper never toggles maintenance mode
