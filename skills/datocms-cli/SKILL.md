---
name: datocms-cli
description: >-
  Work with the DatoCMS CLI tool (@datocms/cli) for command-line migrations,
  schema type generation, direct one-off CMA calls, environment operations,
  deployment workflows, and multi-project profile syncing. Use when users ask
  for datocms CLI commands or scripts such as migrations:new, migrations:run,
  schema:generate, cma:call, cma:docs, migration scaffolding for
  models/fields/blocks, CLI setup with datocms.config.json and profiles,
  OAuth authentication (login, logout, whoami), project linking (link,
  unlink), environment commands (list/fork/promote/rename/destroy),
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

Silently examine the project to determine CLI readiness.

1. Read `package.json` and check for `@datocms/cli` in `devDependencies` (or `dependencies`).
   - If not installed, recommend: `npm install --save-dev @datocms/cli`

2. Look for a `datocms.config.json` file in the project root. This file stores CLI profiles with settings like migration directory, log level, and template paths.

3. Check how authentication is set up. The CLI resolves tokens in this order:
   - `--api-token` flag on the command
   - Linked project: if the profile has a `siteId` (set by `datocms link`), the CLI uses OAuth credentials (`~/.config/datocms-cli/credentials.json`) to fetch the token via the Dashboard API
   - Environment variable: `DATOCMS_API_TOKEN` (default profile) or `DATOCMS_<PROFILE_ID>_PROFILE_API_TOKEN` (named profile), or a custom env var name set via `apiTokenEnvName` in the profile config
   - Active profile override via `DATOCMS_PROFILE`

4. Check for a `migrations/` directory to see if migration scripting is already set up.

5. Detect TypeScript: look for `tsconfig.json` or a `migrations.tsconfig` setting in `datocms.config.json`. TypeScript projects default to `.ts` migration files.

**Important:** The CLI requires a CMA-enabled API token. A read-only CDA token will not work. If you see a token named like `DATOCMS_READONLY_API_TOKEN` or `NEXT_PUBLIC_DATOCMS_API_TOKEN`, warn the user. The best practice is `datocms login` + `datocms link`, which handles token resolution automatically via OAuth.

Commands that inspect project state or generate output from the live DatoCMS project — including `migrations:new --autogenerate`, `schema:generate`, and most `cma:call` usage — need a valid token (via linked project, env var, or `--api-token` flag) before they can run successfully.

---

## Step 2: Understand the Task

Classify the user's task into one or more categories:

| Category | Examples |
|---|---|
| **CLI setup** | Install CLI, authenticate (`login`/`logout`/`whoami`), link projects (`link`/`unlink`), configure profiles, `datocms.config.json` |
| **Creating migrations** | Scaffold new migration scripts, autogenerate from environment diffs, custom templates |
| **Running migrations** | Execute pending migrations, dry-run, fork-and-run, in-place execution |
| **Schema generation** | Run `schema:generate`, scope output to item types, target a specific environment |
| **Direct CMA calls** | Use `cma:docs` to browse API reference, `cma:call` for one-off API operations without writing a script |
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

### CLI setup

Confirm these inputs when they are not already clear:
- whether the user wants OAuth-based auth (`login` + `link`, best practice) or env-var-based auth
- which profile ids are needed
- whether the repo should preserve an existing migrations convention or create a new shared one
- whether the project expects JavaScript or TypeScript migrations
- whether custom migration template / migrations tsconfig paths already exist and must be preserved

### Creating migrations

Confirm these inputs when they are not already clear:
- manual migration vs `--autogenerate`
- sandbox/source environment if `--autogenerate` is requested
- TypeScript vs JavaScript output when the repo does not already imply it
- whether schema helper types (`--schema`) are needed

**Always warn** that `--autogenerate` captures schema changes only. It does **not** include records or uploads.

### Running migrations

Confirm these inputs when they are not already clear:
- source environment
- fork-and-run vs `--in-place`
- dry-run first vs real execution
- custom migrations dir / tracking model / migrations tsconfig, if the repo already uses them
- whether `--fast-fork` is needed for a large environment
- whether active editors make `--force` risky

### Schema generation

Confirm these inputs when they are not already clear:
- output file path
- full schema vs narrowed `--item-types`
- target environment when sandbox-specific types are needed

### Direct CMA calls

When unsure about the exact request shape for a resource/action, run
`npx datocms cma:docs <resource> <action>` first to look up the endpoint
details.

Confirm these inputs when they are not already clear:
- resource + method
- required positional path args
- whether the call needs `--data`, `--params`, or `--environment`
- whether the operation is read-only (list/find — safe), mutating (create/update/publish — confirm environment), or destructive (destroy/bulk_destroy/promote — always confirm target)
- whether this is truly a one-off CLI call or should become reusable CMA code

### Environment management

Confirm these inputs when they are not already clear:
- exact environment ids involved
- whether the target is disposable
- whether the action is read-only, destructive, or promotion-related

### Deployment workflow

Confirm these inputs when they are not already clear:
- CLI profile to use
- destination environment naming convention
- whether maintenance mode is acceptable for this release
- whether promotion is manual-after-review or automatic in the proposed workflow
- whether `--fast-fork` / `--force` are acceptable operationally

### Multi-project sync

Confirm these inputs when they are not already clear:
- existing profile ids that must be preserved
- whether one shared migrations history already exists
- whether destination projects were duplicated from the blueprint or otherwise keep aligned entity IDs
- whether the helper should stop at dry-run / forked env creation or also describe promotion steps separately

### Importing content

Confirm these inputs when they are not already clear:
- whether the target is a disposable/new DatoCMS project
- schema-only first vs full import
- content-type narrowing needs
- concurrency / ignore-errors tolerance for large asset sets

### CLI plugin management

Confirm these inputs when they are not already clear:
- whether the goal is installing an official DatoCMS CLI plugin or a third-party/custom one
- whether the plugin is being developed locally (`plugins:link`) or installed from npm
- whether the action targets all plugins (`reset` / `update`) or a specific one

### Destructive and production-sensitive confirmations

If context is missing, ask for explicit confirmation before proposing final commands for:
- `environments:destroy`
- `environments:promote`
- imports into a non-obviously disposable target
- `migrations:run --in-place` on a primary-like environment
- `maintenance:on --force`
- `environments:fork --fast --force`
- `cma:call` with `destroy`, `bulk_destroy`, or `promote` methods
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
| Direct CMA calls | `references/direct-cma-calls.md` |
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
- Use `npx datocms cma:call <resource> <method> [...pathArgs]` for one-off CMA operations that do not justify a reusable script
- Pass request bodies with `--data '{...}'` and query parameters with `--params '{...}'`
- Add `--environment` when the call must target a sandbox environment
- Switch to `datocms-cma` when the task needs reusable code, iteration, branching, or typed application logic

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
6. **Direct CMA calls** — If using `cma:call`, verify positional args, `--data`, `--params`, and `--environment` align with the targeted method
7. **Environment targeting** — Verify the correct `--source` / `--destination` environment is specified
8. **Safety checks** — For destructive operations (promote, destroy, destructive `cma:call` usage, risky imports, maintenance-mode force), confirm the user intends to target the right environment
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
