# Environment Commands

Managing DatoCMS environments (sandboxes).

## Inputs to confirm before running commands

Confirm these inputs when they are not already clear:

- exact environment ids involved
- whether the target is disposable
- whether the action is read-only, destructive, or promotion-related

## Simple Environment Commands

- **`environments:list`** (alias: `environments:index`) — list all primary and sandbox environments: `npx datocms environments:list`
- **`environments:primary`** — get the ID of the primary environment: `npx datocms environments:primary` (CLI convenience — no direct CMA client equivalent)
- **`environments:rename`** — rename an environment: `npx datocms environments:rename <ENVIRONMENT_ID> <NEW_ENVIRONMENT_ID>`
- **`environments:destroy`** — destroy a sandbox environment: `npx datocms environments:destroy <ENVIRONMENT_ID>`
- **Single environment details** — no dedicated command: `npx datocms cma:call environments find <ENVIRONMENT_ID>`. Otherwise prefer `environments:*` over `cma:call environments`.

**Warning:** `environments:destroy` permanently deletes the environment and all its data.

## environments:fork

Include the planned sandboxes in the per-project batch check for [included allowances and paid extras](../../datocms-cma/references/project-settings-and-usage.md#included-allowances-and-paid-extras), reusing current verified information and cost authorization. The allowance counts sandboxes only: the primary environment (usually `main`) never counts. On a verified plan permitting paid extras, approved overage is billed automatically: approval does not increase the included allowance, and no separate extra-resource activation is needed.

Create a new sandbox environment by forking an existing one:

```bash
npx datocms environments:fork <SOURCE_ENVIRONMENT_ID> <NEW_ENVIRONMENT_ID>
```

Environment ids (fork targets, `environments:rename`, `migrations:run --destination`): lowercase letters, numbers and dashes only. Primary isn't always `main` — promotion makes the promoted sandbox's id primary; get the current one with `environments:primary` (inside `$(…)` add `--log-level=NONE`: profile `logLevel` above `NONE` prints API log lines to stdout).

Run `npx datocms environments:fork --help` for all flags (including `--fast` and `--force`).

### Examples

```bash
# Fork the current primary into a sandbox named "staging"
npx datocms environments:fork "$(npx datocms environments:primary --log-level=NONE)" staging

# Fast fork for large environments (primary id `main` here)
npx datocms environments:fork main staging --fast

# Force fast fork even if editors are active
npx datocms environments:fork main staging --fast --force
```

## environments:promote

Promote a sandbox environment to primary:

```bash
npx datocms environments:promote <ENVIRONMENT_ID>
```

### Example

```bash
npx datocms environments:promote staging
```

**Warning:** This replaces the current primary environment. The old primary becomes a sandbox.
