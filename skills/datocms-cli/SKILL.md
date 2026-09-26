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
  or Contentful (assets + content); CLI plugin management.
---

# DatoCMS CLI Skill

Use for CLI commands, migrations, and local project configuration.

Pure Structured Text conversion or local DAST work → **datocms-structured-text** before CLI bootstrap: [document model](../datocms-structured-text/references/document-model.md), [editing](../datocms-structured-text/references/editing.md), or [conversion](../datocms-structured-text/references/conversion.md). CLI execution/authentication stays here when a project operation is needed. Missing sibling reference → install that skill from `datocms/agent-skills` or update the full bundle; ordinary CLI commands need none.

## Step 1: Detect Context

Reuse established CLI context. For live reads or content operations, follow **datocms-cma** route selection first. Don't install CLI solely to displace a working current remote MCP connection. User chose the DatoCMS MCP for live work → stop here and stay on it until they explicitly switch.

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

For CLI work, use `npx datocms schema:inspect` (not manually joined model and field calls) on selected project/environment before schema-dependent code or mutations. Filter by model API key, id, or name as needed. See `references/schema-inspect.md`.

### Authentication policy

- **Interactive CLI execution**: OAuth via `login` + `link`. Never ask user to paste token or add `DATOCMS_CMA_TOKEN=...` to `.env` for this case.
- **Unattended execution** (CI, cron, server-side app, shared scripts without OAuth session): CMA-enabled token via env var. Read-only CDA tokens (`DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN`, `DATOCMS_DRAFT_CONTENT_CDA_TOKEN`, `NEXT_PUBLIC_DATOCMS_API_TOKEN`) won't work — flag that separate CMA-enabled token is needed.

## Step 2: Resolve the Workflow

Do **not** skip questions merely because category is obvious. Skip follow-up questions **only if** request already includes critical inputs for relevant category, or repo inspection answers them safely.

Ask **minimum targeted question set** needed to avoid flattening real workflow decision.

### Category-specific inputs live in reference files

Each category reference loaded in Step 3 opens with **"Inputs to confirm before running commands"** section — that is per-category equivalent of this step. Don't skip loading reference for task's category: it carries workflow decisions this step is designed to protect. If you skip it, you skip checklist.

### Schema changes — decide approach with user

Ask user when row is not obvious from request — reversibility and workflow preference matter more than which tool mutates.

| Task | Approach |
| - | - |
| Destructive schema change: drop fields/models, `bulk_destroy` records, lossy `field_type` changes (e.g. `string → json`; anything discarding stored values) | Migration (`migrations:new`) against forked sandbox first. Never against primary without explicit, repeated user confirmation. |
| Reversible schema change: add field/model/block, rename field, toggle `required`, add/tighten validation, reorder fieldsets | Ask _"Do you want this as reviewable migration, or direct mutation against sandbox?"_ — answer, not first-loaded skill, decides owner. Lean to migration when repo uses migrations or user is on secondary branch; direct mutation fine for quick sandbox iteration. Default to migration only when user has no preference AND repo shows migration conventions (`migrations/` directory, prior migration commits). |
| Explicit one-off or opt-out ("just patch this", "without migrations workflow", "don't scaffold migrations") | Honor direct mutation. Don't re-suggest migrations unless change turns out destructive. |
| Content operation: publish/unpublish, delete individual records, fix slugs, bulk field value updates, re-tag uploads | No migration needed. |
| Code to commit and replay across environments | Migration, not **datocms-cma**. |

Destructive + migration branch stay here: load `creating-migrations.md` + `running-migrations.md`. One-offs, content operations, direct-mutation branch → **datocms-cma**: it owns the API work and picks the route (CLI `cma:call` / `cma:script`, or MCP); load its references yourself, don't bounce user. Command mechanics stay here — `cma:call` / `cma:script` / `cma:docs` flags, stdin vs file mode, ambient globals, environment targeting (`direct-cma-calls.md`, `cma-script.md`). Checked-in `buildClient()` scripts and unattended runtime code (CI, app server, webhook, long-lived automation) → **datocms-cma**.

### Destructive and production-sensitive confirmations

Destructive schema changes always require these confirmations; list below also covers non-schema destructive commands.

If context missing, ask for explicit confirmation before proposing final commands for:

- `environments:destroy`
- `environments:promote`
- imports into non-obviously disposable target
- `migrations:run --in-place` on primary-like environment (`--in-place --allow-primary` on primary)
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
| Direct CMA call mechanics | `references/direct-cma-calls.md` (for `cma:call`) and/or `references/cma-script.md` (for `cma:script`) |
| Environment management | `references/environment-commands.md` |
| Deployment workflow | `references/deployment-workflow.md` |
| Multi-project sync | `references/blueprint-sync.md` |
| Importing content | `references/importing-content.md` |
| CLI plugin management | `references/cli-plugin-management.md` |

Bundled helpers to copy into the repo: `scripts/` (release and multi-project sync wrappers) and `assets/` (their GitHub Actions workflows); contracts in `deployment-workflow.md` › Release Helper and `blueprint-sync.md` › Automation Guidance.

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
- For migrations, specify `--source`, dry-run first, and prefer fork-and-run over primary `--in-place`. Treat `--force` as an explicit override.
- For direct calls, load `direct-cma-calls.md` or `cma-script.md` before choosing positional arguments, stdin or file mode. Keep schema-approach and environment authorization from Step 2.
- Before execution, verify the selected authentication route, profile, environment and output paths. Reuse established OAuth or unattended token authentication; don't require both.
- Verify the requested result and report what ran, what was checked, and any unresolved inputs. For command examples, state missing prerequisites without connecting.

## Cross-Skill Routing

This skill covers **CLI commands, flags, configuration, workflows, and migration file scaffolding**. If task involves any of following, activate companion skill:

| Condition | Route to |
| - | - |
| DAST inside scripts or migrations | **datocms-structured-text**; **datocms-cma** for record persistence |
| CMA API calls inside migration script bodies (records, schema, uploads) | **datocms-cma** |
| Programmatic environment management via `client.environments.*` in code | **datocms-cma** |
| Consuming generated schema types inside application code or reusable scripts | **datocms-cma** |
| Querying content with GraphQL for frontend display | **datocms-cda** |
| Setting up framework integration, draft mode, or real-time updates | **datocms-frontend-integrations** |
| Building a DatoCMS plugin | **datocms-plugin** |
| User wants a setup planned or walked through (migrations plus release, multi-project sync, imports into a project) | **datocms-setup** |
