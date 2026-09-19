---
name: datocms-cli
description: >-
  DatoCMS CLI (datocms) — command-line migrations, schema codegen, schema
  inspection, one-off CMA calls, typed TypeScript CMA scripts, env operations,
  deployment workflows, multi-project profile syncing. Use for datocms CLI
  commands/scripts: migrations:new, migrations:run; schema:generate;
  schema:inspect (dump models, blocks, fields, validators, appearance,
  fieldsets, nested blocks, referenced/embedding models); cma:call, cma:docs,
  cma:script (ad-hoc typed TS with ambient client/Schema globals); migration
  scaffolding for models/fields/blocks; CLI setup via datocms.config.json +
  profiles; OAuth (login/logout/whoami); projects:list; project link/unlink;
  env list/fork/promote/rename/destroy; maintenance-mode toggle; CI/CD
  migration pipelines; blueprint/client project sync; imports from WordPress
  or Contentful (assets + content); CLI plugin management
  (plugins:install/add/available/link/remove/update/reset/inspect).
---

# DatoCMS CLI Skill

Use for CLI commands, migrations, and local project configuration.

Pure Structured Text conversion or local DAST work → **datocms-structured-text** before CLI bootstrap: [document model](../datocms-structured-text/references/document-model.md), [editing](../datocms-structured-text/references/editing.md), or [conversion](../datocms-structured-text/references/conversion.md). CLI execution/authentication stays here when a project operation is needed. Missing required reference → install `datocms-structured-text` from `datocms/agent-skills` or update the full bundle; ordinary CLI tasks do not depend on it.

## Step 1: Detect Context

Reuse established CLI context. For live reads or content operations, follow **datocms-cma** route selection first. Don't install CLI solely to displace a working current remote MCP connection.

Bootstrap only for selected CLI execution; explaining commands needs no connection. CLI-specific migrations, linking, profiles, imports, and type generation stay here.

### Detection (don't rely on `which datocms` — CLI runs via `npx`)

1. `datocms` in `package.json` devDependencies → CLI available. Missing for selected CLI execution: install it (`npm install --save-dev datocms`).
2. `datocms.config.json` with `siteId` on active profile → linked. Missing: drive bootstrap below.
3. `npx datocms whoami` succeeds → OAuth session active.
4. `migrations/` directory → migrations already scaffolded.
5. `tsconfig.json` or `migrations.tsconfig` → TS migrations convention.

### Bootstrap flow (CLI available but not linked)

Only `datocms login` needs terminal; rest runs in non-TTY.

```bash
npx datocms login  # user, one-time, interactive
npx datocms projects:list [hint] --json # agent discovers siteId
npx datocms link --site-id=<ID> [--organization-id=<ID>] # agent links
```

**Always confirm target project with user before running `datocms link`**, even when `projects:list` returns single candidate. Show candidate(s) (name, id, organization) and wait for explicit yes. Don't treat "only one result" as consent — user may have access to project they didn't mean to wire to this repo; fixing mis-linked project later is painful.

`datocms link` without `--site-id` requires terminal. In non-TTY it now exits cleanly with suggestion to pass `--site-id`; don't retry without it. Same when credentials missing — ask user to run `datocms login` first.

For CLI work, use `npx datocms schema:inspect` on selected project/environment before schema-dependent code or mutations. Filter by model API key, id, or name as needed. See `references/schema-inspect.md`.

### Authentication policy

- **Interactive CLI execution**: OAuth via `login` + `link`. Never ask user to paste token or add `DATOCMS_CMA_TOKEN=...` to `.env` for this case.
- **Unattended execution** (CI, cron, server-side app, shared scripts without OAuth session): CMA-enabled token via env var. Read-only CDA tokens (`DATOCMS_READONLY_API_TOKEN`, `NEXT_PUBLIC_DATOCMS_API_TOKEN`) won't work — flag that separate CMA-enabled token is needed.

## Step 2: Resolve the Workflow

Do **not** skip questions merely because category is obvious. Skip follow-up questions **only if** request already includes critical inputs for relevant category, or repo inspection answers them safely.

Ask **minimum targeted question set** needed to avoid flattening real workflow decision.

### Category-specific inputs live in reference files

Each category reference loaded in Step 3 opens with **"Inputs to confirm before running commands"** section — that is per-category equivalent of this step. Don't skip loading reference for task's category: it carries workflow decisions this step is designed to protect. If you skip it, you skip checklist.

### Schema changes — decide approach with user

DatoCMS schema operations fall into four buckets. Choice of approach is not automatic — ask user when bucket is not obvious from request, because reversibility and workflow preference matter more than which tool performs mutation.

| Situation | What it covers | Approach |
| - | - | - |
| **Destructive schema change** | DROP field, DROP model, `bulk_destroy` records, lossy `field_type` changes (e.g. `string → json`, `json → string`, anything that discards stored values) | **Migration** via `datocms-cli` (`migrations:new`), against forked sandbox first. Never run these against primary environment without explicit, repeated user confirmation. |
| **Reversible schema change** | Add field, add model or block, rename field, toggle `required`, add or tighten validation, reorder fieldsets | **Ask user.** Both approaches safe; pick by preference and context. Lean to migration (`datocms-cli`) when repo already uses migrations workflow or user is on secondary branch — reviewable, reproducible. Direct mutation (`cma:call`, `cma:script` stdin-mode, or `cma:script` file-mode) fine for quick iteration on sandbox. Default to migration only when user has no preference AND repo shows migration conventions (`migrations/` directory, prior migration commits). |
| **User-requested one-off** | Phrases like "quickly, without migrations workflow", "just patch this", "one-off", "don't scaffold migrations for this" | **Honor opt-out.** Use direct mutation via `cma:call` (single call with shape from `cma:docs`) or `cma:script` (stdin-mode for loops/multi-step, file-mode when script is long enough that heredoc hurts). Don't re-suggest migrations unless change turns out to be destructive schema change. |
| **Content operation** | Publish, unpublish, delete individual records, fix slugs, bulk update field value, re-tag uploads | No migration needed. Prefer `cma:call` for single call; `cma:script` stdin-mode for loops, pagination, or multi-step logic; `cma:script` file-mode only when heredoc becomes painful. Code that needs to be committed and replayed across environments is migration (`datocms-cli`), not **datocms-cma**. |

Regardless of which skill is loaded, **question to ask user is same** for reversible schema change: _"Do you want this as reviewable migration, or direct mutation against sandbox?"_ Answer determines which skill owns follow-up — not which skill was loaded first.

**Cross-skill routing:**

- Destructive schema changes and migration branch of reversible schema change are this skill's core: `migrations:new`, `migrations:run`, fork-and-run, safe deployment. Stay here and load `creating-migrations.md` + `running-migrations.md`.
- User-requested one-offs, content operations, and direct-mutation branch of reversible schema change are better covered by **datocms-cma**. Switch when user has opted out of migrations, when task is content mutation (publish, delete, fix), or when user wants `cma:script` or checked-in `buildClient()` script. Handoff is loading sibling skill's references — don't bounce user.
- Unattended runtime code (CI, app server, webhook, long-lived automation) is separate scenario — that is where checked-in `buildClient()` script belongs, and **datocms-cma** owns that pattern.

### Destructive and production-sensitive confirmations

Destructive schema changes always require these confirmations; list below also covers non-schema destructive commands.

If context missing, ask for explicit confirmation before proposing final commands for:

- `environments:destroy`
- `environments:promote`
- imports into non-obviously disposable target
- `migrations:run --in-place` on primary-like environment
- `maintenance:on --force`
- `environments:fork --fast --force`
- `cma:call` with `destroy`, `bulk_destroy`, or `promote` methods
- direct schema mutations (via `cma:call` or `cma:script`) targeting primary-like environment instead of migration on forked sandbox
- `plugins:reset` (removes all user-installed and linked CLI plugins)

## Step 3: Load References

Based on task classification, read appropriate reference files from `references/` directory next to this skill file. Only load what's relevant.

**Load only when setup or configuration is needed:**

- `references/cli-setup.md` — Installation, configuration, profiles, global flags, token resolution

**Load per category:**

| Task category | Reference file |
| - | - |
| Creating migrations | `references/creating-migrations.md` |
| Running migrations | `references/running-migrations.md` |
| Schema generation | `references/schema-generate.md` |
| Schema inspection | `references/schema-inspect.md` |
| Direct CMA calls | `references/direct-cma-calls.md` (for `cma:call`) and/or `references/cma-script.md` (for `cma:script`) |
| Environment management | `references/environment-commands.md` |
| Deployment workflow | `references/deployment-workflow.md` |
| Multi-project sync | `references/blueprint-sync.md` |
| Importing content | `references/importing-content.md` |
| CLI plugin management | `references/cli-plugin-management.md` |

**Load cross-cutting references when needed:**

- If creating + running migrations together -> load both `creating-migrations.md` and `running-migrations.md`
- If schema generation followed by typed CMA code changes -> also load `datocms-cma` guidance for consuming generated types
- If direct CMA call grows beyond one-off command -> switch to `datocms-cma` for reusable code
- If deployment involves environment commands -> also load `environment-commands.md`
- If multi-project sync involves rollout execution -> also load `running-migrations.md`
- If CLI plugin install is specifically for WordPress/Contentful import -> also load `importing-content.md`

## Step 4: Implement and Verify

Use the selected reference for command syntax, required inputs, templates and verification. Keep the repo's package-manager runner; otherwise use `npx datocms`.

- Scaffold migrations with `migrations:new`, not hand-named files. Use the reference's exact function signature; load **datocms-cma** for API calls inside the body.
- Inspect the selected project/environment schema before schema-dependent code or mutations. Prefer `schema:inspect` over manually joining model and field calls.
- For migrations, specify `--source`, dry-run first, and prefer fork-and-run over primary `--in-place`. Treat `--force` as an explicit override.
- For direct calls, load `direct-cma-calls.md` or `cma-script.md` before choosing positional arguments, stdin or file mode. Keep schema-approach and environment authorization from Step 2.
- Before execution, verify the selected authentication route, profile, environment and output paths. Reuse established OAuth or unattended token authentication; don't require both.
- Verify the requested result and report what ran, what was checked, and any unresolved inputs. For command examples, state missing prerequisites without connecting.

## Cross-Skill Routing

This skill covers **CLI commands, flags, configuration, workflows, and migration file scaffolding**. If task involves any of following, activate companion skill:

| Condition | Route to |
| - | - |
| DAST inside scripts or migrations | **datocms-structured-text** — [document model](../datocms-structured-text/references/document-model.md), [editing](../datocms-structured-text/references/editing.md), or [conversion](../datocms-structured-text/references/conversion.md); **datocms-cma** for record persistence |
| CMA API calls inside migration script bodies (records, schema, uploads) | **datocms-cma** |
| Programmatic environment management via `client.environments.*` in code | **datocms-cma** |
| Consuming generated schema types inside application code or reusable scripts | **datocms-cma** |
| Querying content with GraphQL for frontend display | **datocms-cda** |
| Setting up framework integration, draft mode, or real-time updates | **datocms-frontend-integrations** |
| Building a DatoCMS plugin | **datocms-plugin** |
