---
name: datocms-cli
description: >-
  Work with the DatoCMS CLI tool (@datocms/cli) for command-line migrations,
  schema type generation, direct one-off CMA calls, typed one-off TypeScript
  CMA scripts, environment operations, deployment workflows, and
  multi-project profile syncing. Use when users ask for datocms CLI commands
  or scripts such as migrations:new, migrations:run, schema:generate,
  cma:call, cma:docs, cma:script (for ad-hoc typed TypeScript scripts with
  ambient client/Schema globals), migration scaffolding for
  models/fields/blocks, CLI setup with datocms.config.json and profiles,
  OAuth authentication (login, logout, whoami), discovering accessible
  projects (projects:list), project linking (link, unlink),
  environment commands (list/fork/promote/rename/destroy),
  maintenance-mode toggling, CI/CD migration pipelines, blueprint/client
  project sync, imports from WordPress or Contentful (including
  assets/content), and CLI plugin management (plugins:install, plugins:add,
  plugins:available, plugins:link for local plugin development,
  plugins:remove, plugins:update, plugins:reset, plugins:inspect).
---

# DatoCMS CLI Skill

You are an expert at using the DatoCMS CLI (`@datocms/cli`). Follow these steps in order. Do not skip steps.

---

## Step 1: Detect Context

If the project context is already established in this conversation (CLI
package, config file, token, migrations directory, TypeScript setup), skip
broad detection below. Re-inspect only when a question cannot be answered
from prior context.

**CLI + link is a required bootstrap for any repo that interfaces with a
DatoCMS project.** `@datocms/cli` installed + `datocms login` + `datocms
link` is how the agent gets visibility into the live project (models,
fields, ids, record state). Missing → fix first, same as `git init` or
`npm install`.

### Detection (do not rely on `which datocms` — the CLI runs via `npx`)

1. `@datocms/cli` in `package.json` devDependencies → CLI available. If missing, install it (`npm install --save-dev @datocms/cli`) — never fall back to pasted tokens or manual Dashboard steps.
2. `datocms.config.json` with a `siteId` on the active profile → linked. If missing, drive the bootstrap below.
3. `npx datocms whoami` succeeds → OAuth session active.
4. `migrations/` directory → migrations already scaffolded.
5. `tsconfig.json` or `migrations.tsconfig` → TypeScript migrations convention.

### Bootstrap flow (CLI available but not linked)

Only `datocms login` needs a terminal; the rest runs in non-TTY.

```bash
npx datocms login                                   # user, one-time, interactive
npx datocms projects:list [hint] --json             # agent discovers siteId
npx datocms link --site-id=<ID> [--organization-id=<ID>]   # agent links
```

**Always confirm the target project with the user before running `datocms
link`**, even when `projects:list` returns a single candidate. Show the
candidate(s) (name, id, organization) and wait for an explicit yes. Do not
treat "only one result" as consent — the user may have access to a project
they did not mean to wire to this repo, and fixing a mis-linked project
later is painful.

`datocms link` without `--site-id` requires a terminal. In non-TTY it
now exits cleanly with a suggestion to pass `--site-id`; do not retry
without it. Same applies when credentials are missing — ask the user to
run `datocms login` first.

### Authentication policy

- **Interactive task** (publish, delete, fix, backfill, introspect,
  etc.): OAuth via `login` + `link` is the mechanism. Never ask the user
  to paste a token or add `DATOCMS_CMA_TOKEN=...` to `.env` for this
  case.
- **Unattended execution** (CI, cron, server-side app, shared scripts
  without an OAuth session): CMA-enabled token via env var. Read-only
  CDA tokens (`DATOCMS_READONLY_API_TOKEN`, `NEXT_PUBLIC_DATOCMS_API_TOKEN`)
  will not work — flag that a separate CMA-enabled token is needed. The
  agent itself still needs CLI + link at development time for visibility.

**Token resolution order the CLI uses:**

- `--api-token` flag
- Linked project (OAuth-backed, the default after `login` + `link`)
- Env var: `DATOCMS_API_TOKEN` (default profile), `DATOCMS_<PROFILE>_PROFILE_API_TOKEN` (named), or custom `apiTokenEnvName`
- Profile override via `DATOCMS_PROFILE`

---

## Step 2: Understand the Task

Classify the user's task into one or more categories:

| Category | Examples |
|---|---|
| **CLI setup** | Install CLI, authenticate (`login`/`logout`/`whoami`), discover accessible projects (`projects:list`), link/unlink projects (`link`/`unlink`), configure profiles, `datocms.config.json` |
| **Schema changes** | Add, modify, or remove models, fields, fieldsets, or block models — via a migration script (default) or a direct CMA operation against a chosen environment |
| **Creating migrations** | Scaffold new migration scripts, autogenerate from environment diffs, custom templates (sub-task of schema changes once the migration approach is chosen) |
| **Running migrations** | Execute pending migrations, dry-run, fork-and-run, in-place execution |
| **Schema generation** | Run `schema:generate`, scope output to item types, target a specific environment |
| **Direct CMA calls** | Use `cma:docs` to browse API reference, `cma:call` for single-method ad-hoc API operations, `cma:script` for typed TypeScript one-off scripts (loops, branching, `Schema.*` types) without scaffolding a repo project |
| **Environment management** | Fork, promote, rename, destroy, list environments via CLI commands |
| **Deployment workflow** | Maintenance mode, safe deployment sequences, CI/CD integration |
| **Multi-project sync** | Shared migrations across blueprint/client projects via CLI profiles |
| **Importing content** | WordPress import, Contentful import |
| **CLI plugin management** | Install, remove, update, list, inspect, link, or reset CLI plugins (`plugins:*` commands) |

---

## Step 2.5: Collect Critical Inputs Before You Commit To Commands

Do **not** skip questions merely because the category is obvious. Skip follow-up
questions **only if** the request already includes the critical inputs for the
relevant category, or the repo inspection answers them safely.

Ask the **minimum targeted question set** needed to avoid flattening a real
workflow decision.

### Category-specific inputs live in the reference files

Each category reference loaded in Step 3 opens with an **"Inputs to confirm
before running commands"** section — that is the per-category equivalent of
this step. Do not skip loading the reference for the task's category: it
carries the workflow decisions this step is designed to protect. If you
skip it, you skip the checklist.

### Schema changes — decide the approach with the user

DatoCMS schema operations fall into four buckets. The choice of approach
is not automatic — ask the user when the bucket is not obvious from the
request, because reversibility and workflow preference matter more than
which tool performs the mutation.

| Bucket | What it covers | Approach |
|---|---|---|
| **A. Truly destructive** | DROP a field, DROP a model, `bulk_destroy` records, lossy `field_type` changes (e.g. `string → json`, `json → string`, anything that discards stored values) | **Migration script** via `datocms-cli`, against a forked sandbox first. Never run these against a primary environment without explicit, repeated user confirmation. |
| **B. Additive / reversible-config** | Add a field, add a model or block, rename a field, toggle `required`, add or tighten a validation, reorder fieldsets | **Ask the user.** Both approaches are safe; pick by preference and context. Lean to a migration script (`datocms-cli`) when the repo already uses a migrations workflow or the user is on a secondary branch — reviewable, reproducible. Direct mutation (`cma:call` / `cma:script` / `buildClient()`) is fine for quick iteration on a sandbox. Default to migration only when the user has no preference AND the repo shows migration conventions (`migrations/` directory, prior migration commits). |
| **C. User explicit opt-out** | Phrases like "quickly, without a migrations workflow", "just patch this", "one-off", "don't scaffold migrations for this" | **Honor the opt-out.** Use direct mutation via `cma:call` (single op), `cma:script` (typed multi-step logic), or `buildClient()` (checked-in reusable script). Do not re-suggest migrations unless the change turns out to fall in bucket A. |
| **D. Content operations (not schema)** | Publish, unpublish, delete individual records, fix slugs, bulk update a field value, re-tag uploads | Either tool is correct. Prefer `cma:call` for one-shots, `cma:script` for typed multi-step logic, or `buildClient()` for reusable scripts. No migration is needed for content mutations. |

Regardless of which skill is loaded, the **question to ask the user is
the same** when bucket B is ambiguous: *"Do you want this as a reviewable
migration script, or a direct mutation against a sandbox?"* The answer
determines which skill owns the follow-up — not which skill was loaded
first.

**Cross-skill routing.**
- Bucket A and the migration branch of B are this skill's core:
  `migrations:new`, `migrations:run`, fork-and-run, safe deployment.
  Stay here and load `creating-migrations.md` + `running-migrations.md`.
- Buckets C and D — and the direct-mutation branch of B — are better
  covered by **datocms-cma**. Switch when the user has opted out of
  migrations, when the task is a content mutation (publish, delete,
  fix), or when the user wants reusable `buildClient()` code checked
  into the repo. The handoff is loading the sibling skill's
  references — do not bounce the user.

### Destructive and production-sensitive confirmations

Bucket A above always requires these confirmations; the list below also
covers non-schema destructive commands.

If context is missing, ask for explicit confirmation before proposing final commands for:
- `environments:destroy`
- `environments:promote`
- imports into a non-obviously disposable target
- `migrations:run --in-place` on a primary-like environment
- `maintenance:on --force`
- `environments:fork --fast --force`
- `cma:call` with `destroy`, `bulk_destroy`, or `promote` methods
- direct schema mutations (via `cma:call` or `cma:script`) targeting a primary-like environment instead of a migration on a forked sandbox
- `plugins:reset` (removes all user-installed and linked CLI plugins)

---

## Step 3: Load References

Based on the task classification, read the appropriate reference files from the `references/` directory next to this skill file. Only load what is relevant.

**Always load:**
- `references/cli-setup.md` — Installation, configuration, profiles, global flags, token resolution

**Load per category:**

| Task category | Reference file |
|---|---|
| Creating migrations | `references/creating-migrations.md` |
| Running migrations | `references/running-migrations.md` |
| Schema generation | `references/schema-generate.md` |
| Direct CMA calls | `references/direct-cma-calls.md` (for `cma:call`) and/or `references/cma-script.md` (for `cma:script`) |
| Environment management | `references/environment-commands.md` |
| Deployment workflow | `references/deployment-workflow.md` |
| Multi-project sync | `references/blueprint-sync.md` |
| Importing content | `references/importing-content.md` |
| CLI plugin management | `references/cli-plugin-management.md` |

**Load cross-cutting references when needed:**
- If creating + running migrations together -> load both `creating-migrations.md` and `running-migrations.md`
- If schema generation is followed by typed CMA code changes -> also load `datocms-cma` guidance for consuming the generated types
- If a direct CMA call grows beyond a one-off command -> switch to `datocms-cma` for reusable code
- If deployment involves environment commands -> also load `environment-commands.md`
- If multi-project sync involves rollout execution -> also load `running-migrations.md`
- If a CLI plugin install is specifically for WordPress/Contentful import -> also load `importing-content.md`

---

## Step 4: Generate Code

Write commands and scripts following these mandatory rules:

### Command Prefix
- Respect the repo's existing package-manager execution style when one is already established (`npm run ...`, `pnpm exec ...`, `bunx ...`)
- Otherwise default to `npx datocms` so the local CLI version is used
- Example: `npx datocms migrations:new "add blog model" --ts`

### Migration File Templates
- When generating migration file content, use the **exact function signatures** from the reference files
- TypeScript: `export default async function(client: Client): Promise<void>`
- JavaScript: `module.exports = async (client) => {}`
- Import for TypeScript migrations: `import { Client } from '@datocms/cli/lib/cma-client-node'`

### File Naming
- Migration files are automatically named: `{unix_timestamp}_{camelCaseName}.ts|.js`
- Do not manually create migration files — always use `npx datocms migrations:new`

### Migration Script Bodies
- For the CMA API calls inside migration scripts (creating models, fields, records, uploads), defer to the **datocms-cma** reference patterns
- The `client` parameter in migrations is the same CMA client from `@datocms/cma-client-node`

### Schema Generation
- Use `npx datocms schema:generate <filename>` to generate TypeScript schema definitions
- Use `--item-types` to narrow the output when the user only needs specific models
- Use `--environment` when the generated types must reflect a sandbox or staging environment
- Route the follow-up code changes that consume those types to `datocms-cma`

### Direct CMA Calls
- Use `npx datocms cma:docs <resource> <action>` to look up endpoint details (request body, parameters, examples) before constructing a command
- Use `npx datocms cma:call <resource> <method> [...pathArgs]` for single-method ad-hoc CMA operations
- Pass request bodies with `--data '{...}'` and query parameters with `--params '{...}'`
- Add `--environment` when the call must target a sandbox environment
- `cma:call` is **positional** (`<RESOURCE> <METHOD>` + URL placeholders as extra positional args). It is **not** a REST wrapper: there is no `--endpoint`, `--method`, `--query-params`, or `--body` flag — do not invent these

Concrete shape, with JSON5 accepted in `--data` / `--params`:

```bash
npx datocms cma:call items list --params='{filter: {type: "article"}}'
npx datocms cma:call items find <ITEM_ID>
npx datocms cma:call items update <ITEM_ID> --data='{title: "Updated"}'
npx datocms cma:call items publish <ITEM_ID>
npx datocms cma:call fields create <ITEM_TYPE_ID> --data='{label: "Title", api_key: "title", field_type: "string"}'
```

Run `npx datocms cma:call --help` for the full list of built-in examples, or `npx datocms cma:docs <resource> <action>` for body schema and required fields.

- Use `npx datocms cma:script` (file or stdin) when the task needs loops, branching, multiple dependent calls, or typed `Schema.*` records, but the code does not need to live in the repo — `client` and `Schema` are ambient globals, and `tsc --noEmit` type-checks before execution
- Prefer Format A (`export default async function (client: Client)`) when the script may be promoted into a migration, or when a TypeScript error needs editor LSP / diagnostics to triage (Format B heredocs have no on-disk file for the language server); Format B (top-level await) for throwaway one-liners or heredocs
- Redirect `2>/dev/null` when piping `cma:script` stdout into `jq`
- Switch to `datocms-cma` when the task needs reusable code checked into the repo, tests, or packages outside the `cma:script` workspace
- **Schema changes:** default to scaffolding a migration. Only propose `cma:call` or `cma:script` for schema mutations after the user has explicitly opted out of the migration workflow, and never propose a direct schema mutation against a primary-like environment without an explicit confirmation from the user

### CLI Plugin Commands
- Use `npx datocms plugins:available` to discover official CLI plugins before installing
- Use `npx datocms plugins:add <PLUGIN>` to install a CLI plugin by npm package name or GitHub URL
- Use `npx datocms plugins:link <PATH>` only for local plugin development
- These commands manage CLI extensions, not DatoCMS project plugins — route project plugin work to **datocms-plugin-builder**

### Environment Safety
- Always specify `--source` when running migrations to be explicit about the target
- Use `--dry-run` first to preview changes before applying
- Prefer fork-and-run (default) over `--in-place` for production environments
- Treat `--force` as an explicit override, not a default

---

## Step 5: Verify

Before presenting the final commands or scripts:

1. **API token** — Confirm a CMA-enabled token is available (via env var or `--api-token` flag)
2. **Config file** — If using profiles, verify `datocms.config.json` exists and has the right profile
3. **Migrations directory** — Confirm the migrations directory exists or will be created by the command
4. **TypeScript config** — If generating TS migrations, ensure `tsconfig.json` exists or `--migrations-tsconfig` is set
5. **Schema generation scope** — If using `schema:generate`, verify the output file path plus any `--item-types` / `--environment` scope match the request
6. **Direct CMA calls** — If using `cma:call`, verify positional args, `--data`, `--params`, and `--environment` align with the targeted method. If using `cma:script`, verify the script uses `Schema.*` types (not `any`/`unknown`), imports only from the pre-installed package list, and targets the intended environment
7. **Environment targeting** — Verify the correct `--source` / `--destination` environment is specified
8. **Safety checks** — For destructive operations (promote, destroy, destructive `cma:call` usage, risky imports, maintenance-mode force), confirm the user intends to target the right environment. For schema mutations, confirm the chosen approach (migration vs direct) and — if direct — the target environment (sandbox vs primary) before issuing commands
9. **CLI plugin commands** — If using `plugins:*` commands, verify the plugin name is correct and distinguish CLI plugins from DatoCMS project plugins

---

## Cross-Skill Routing

This skill covers **CLI commands, flags, configuration, workflows, and migration file scaffolding**. If the task involves any of the following, activate the companion skill:

| Condition | Route to |
|---|---|
| CMA API calls inside migration script bodies (records, schema, uploads) | **datocms-cma** |
| Programmatic environment management via `client.environments.*` in code | **datocms-cma** |
| Consuming generated schema types inside application code or reusable scripts | **datocms-cma** |
| Querying content with GraphQL for frontend display | **datocms-cda** |
| Setting up framework integration, draft mode, or real-time updates | **datocms-frontend-integrations** |
| Building a DatoCMS plugin | **datocms-plugin-builder** |
