# Deployment Workflow

Maintenance mode, safe deployment sequences, and CI/CD integration.

## Contents

- Inputs to confirm before running commands
- Maintenance Mode
- Safe Deployment Sequence
- Local Development Workflow
- CI/CD Integration
- Release Helper

## Inputs to confirm before running commands

Confirm these inputs when they are not already clear:

- CLI profile to use
- destination environment naming convention
- whether maintenance mode is acceptable for this release
- whether promotion is manual-after-review or automatic in the proposed workflow
- whether `--fast-fork` / `--force` are acceptable operationally

## Maintenance Mode

### Turn on maintenance mode

```bash
npx datocms maintenance:on
```

Flags:

| Flag | Type | Description |
| - | - | - |
| `--force` | boolean | Activate even if users are currently editing records |

When maintenance mode is active, the DatoCMS editing interface is locked and editors cannot make content changes.

Use `--force` only as an explicit override when you understand that active editing sessions may be interrupted.

### Turn off maintenance mode

```bash
npx datocms maintenance:off
```

## Safe Deployment Sequence

The recommended deployment workflow for production schema changes:

```bash
# 1. Enable maintenance mode to prevent editor conflicts
npx datocms maintenance:on

# 2. Run migrations (fork primary -> new sandbox, apply changes)
npx datocms migrations:run --destination=release-v2

# 3. Verify each changed model in the fork (environments:list shows no schema)
npx datocms schema:inspect <changed_model> --environment=release-v2

# 4. Promote the migrated environment to primary
npx datocms environments:promote release-v2

# 5. Disable maintenance mode
npx datocms maintenance:off
```

If editors are active and the team intentionally accepts the risk, you can add `--force` to the maintenance step.

### Why This Order Matters

1. **Maintenance on** — prevents editors from creating conflicting schema/content changes
2. **Migrate to fork** — keeps the current primary safe if migrations fail
3. **Verify** — check the fork has the expected schema before promoting
4. **Promote** — atomically swap the migrated environment to primary
5. **Maintenance off** — re-enable editing with the new schema in place

## Local Development Workflow

For iterating on migrations during development. Fork from the current primary, not a hard-coded `main`: promotion makes the promoted sandbox's id primary. `--log-level=NONE` keeps API log lines (profile `logLevel` above `NONE` prints them to stdout) out of the `$(…)` capture.

```bash
# 1. Fork the current primary into a dev sandbox
npx datocms environments:fork "$(npx datocms environments:primary --log-level=NONE)" my-feature

# 2. Write your migration
npx datocms migrations:new "add author model" --ts

# 3. Run migration in-place on the sandbox
npx datocms migrations:run --source=my-feature --in-place

# 4. Verify the changes look correct
npx datocms cma:call itemTypes list --environment=my-feature

# 5. If something went wrong, destroy and start over
npx datocms environments:destroy my-feature
```

For rapid iteration, you can destroy and re-fork to reset:

```bash
npx datocms environments:destroy my-feature
npx datocms environments:fork "$(npx datocms environments:primary --log-level=NONE)" my-feature
# Edit migration script, then re-run
npx datocms migrations:run --source=my-feature --in-place
```

## CI/CD Integration

Example GitHub Actions workflow for deploying migrations:

```yaml
name: Deploy Migrations
on:
  push:
    branches: [main]
    paths: ['migrations/**']

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'

      - run: npm ci

      - name: Enable maintenance mode
        run: npx datocms maintenance:on --api-token="$DATOCMS_API_TOKEN"
        env:
          DATOCMS_API_TOKEN: ${{ secrets.DATOCMS_API_TOKEN }}

      - name: Run migrations
        run: npx datocms migrations:run --destination=${{ github.sha }} --api-token="$DATOCMS_API_TOKEN"
        env:
          DATOCMS_API_TOKEN: ${{ secrets.DATOCMS_API_TOKEN }}

      - name: Promote environment
        run: npx datocms environments:promote ${{ github.sha }} --api-token="$DATOCMS_API_TOKEN"
        env:
          DATOCMS_API_TOKEN: ${{ secrets.DATOCMS_API_TOKEN }}

      - name: Disable maintenance mode
        run: npx datocms maintenance:off --api-token="$DATOCMS_API_TOKEN"
        env:
          DATOCMS_API_TOKEN: ${{ secrets.DATOCMS_API_TOKEN }}
        if: always()
```

Add `--force` to the maintenance step only when the release process explicitly accepts the active-editor risk.

### Key CI/CD Considerations

- **Always** run `maintenance:off` in an `if: always()` step to avoid leaving the project locked if a step fails
- Use the git SHA or a build ID as the `--destination` name for traceability; `migrations:run --destination` forks the current primary itself, so CI needs no `environments:primary` lookup step
- Store `DATOCMS_API_TOKEN` as repo secret, pass via `--api-token` — linked profile (`siteId`) never reads env var, errors without OAuth login
- Trigger only on changes to the `migrations/` directory to avoid unnecessary runs

## Release Helper

[`scripts/datocms-release.mjs`](../scripts/datocms-release.mjs) runs [Safe Deployment Sequence](#safe-deployment-sequence) as one command, without the verify step; [`assets/datocms-release.github-actions.yml`](../assets/datocms-release.github-actions.yml) runs it from a manual GitHub Actions dispatch (operator-chosen `destination` input, `DATOCMS_API_TOKEN` secret). Node built-ins only: no dependency beyond `datocms`.

- **Install:** copy the script to the repo's `scripts/datocms-release.mjs` and add package script `"datocms:release": "node scripts/datocms-release.mjs"`; CI → copy the workflow to `.github/workflows/datocms-release.yml`, adapting install command and Node version; named profile → add `--profile=<id>` to the package script and both workflow steps, and map `DATOCMS_<PROFILE_ID>_PROFILE_API_TOKEN` instead; more than one profile in `datocms.config.json` → every command passes `--profile=<id>`, even for `default` — flagless commands error `Multiple profiles detected`. Keep the `destination` input passed through `env:` — `${{ inputs.* }}` inside `run:` is script injection.
- **Flags:** `--destination=<env>` required — lowercase letters, numbers and dashes, checked before any command; `--profile=<id>` forwarded to every command; `--skip-promote` → migrated fork for inspection or rehearsal only: `maintenance:off` still runs, so editors can change primary and those edits miss the fork — never promote it later; to verify before promoting, run [Safe Deployment Sequence](#safe-deployment-sequence) by hand (maintenance stays on through verify and promote) or re-run without `--skip-promote`; `--fast-fork`; `--force` → `maintenance:on --force`, plus `migrations:run --force` with `--fast-fork`; args after `--` go to `migrations:run`.
- **Sequence:** `maintenance:on` → `migrations:run --destination` → `environments:promote` (unless `--skip-promote`); `maintenance:off` runs in `finally`, also after a failed step or `--skip-promote`. Cancelling the CI run kills the script before `finally` → the workflow's last step (`if: always()`) turns maintenance off; its `concurrency` group queues overlapping dispatches so one run can't unlock another mid-release.
- **Dry run:** `--dry-run` runs only `migrations:run --dry-run` (no maintenance, fork or promote) — safe first test; see [Dry Run](running-migrations.md#dry-run).
- **Token:** appends `--api-token` from `DATOCMS_API_TOKEN` (default profile) or `DATOCMS_<PROFILE_ID>_PROFILE_API_TOKEN` when set, since linked profiles never read env vars; unset → local OAuth session. Custom `apiTokenEnvName` not read. `DATOCMS_PROFILE` and tokens read from the process environment only, not `.env.local`/`.env` (the CLI reads both): `DATOCMS_PROFILE` in an env file → pass `--profile=<id>` explicitly, else the default profile's token rides every command and `--api-token` wins over the profile's project.
- **Errors:** print only `Command failed: npx datocms <command>`, never the arguments — they can carry the token. Keep that when adapting.
