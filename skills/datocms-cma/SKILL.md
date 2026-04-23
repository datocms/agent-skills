---
name: datocms-cma
description: >-
  Write programmatic Node.js or TypeScript scripts that drive the DatoCMS
  Content Management API using @datocms/cma-client, @datocms/cma-client-node,
  or @datocms/cma-client-browser — the code-first companion for content-heavy
  and automation work. Prefer this skill whenever the task needs real code for
  records, uploads, or project automation — including short mid-conversation
  asks like "publish them", "fix those slugs", "delete all drafts", or "bulk
  import this CSV", and longer checked-in scripts. Covers four areas:
  (1) content operations — create/update/delete/publish records, bulk
  import/export and CSV pipelines, pagination over large record sets, asset
  uploads from URL or local files with metadata, structured text and block
  payload edits; (2) environment and project governance — fork/promote
  environments, webhooks and build triggers, project settings and maintenance
  mode, scheduled publish/unpublish workflows, audit logs, usage analytics,
  subscription limits; (3) access control and typed flows — roles and API
  tokens, upload tracks and tags, generated CMA schema types for type-safe
  record operations; (4) schema and UI configuration when the user explicitly
  bypasses the migrations workflow or wants schema mutations embedded in a
  larger script — models, fields, blocks, saved filters, dashboard and schema
  menus, plugin install and configuration. For ordinary schema changes inside
  a project with a migrations workflow or a secondary environment, prefer
  `datocms-cli` migrations as the safe default; reach for this skill only
  when the user opts out or the mutation is part of a broader automation.
  Works for both one-off execution via `cma:call` / `cma:script` and
  checked-in `buildClient()` scripts for reusable or unattended code.
---

# DatoCMS Content Management API Skill

You are an expert at writing code that interacts with the DatoCMS Content Management API (CMA). Use this workflow as a default. Reorder or skip steps when the task is purely diagnostic, advisory, or the user only needs an explanation.

A short, imperative request in mid-conversation ("publish them",
"delete those", "fix the slugs", "check how many drafts I have") that
follows earlier DatoCMS context is still a DatoCMS task — do not lose
the context just because the latest message is short. Signals that
you are on a DatoCMS-connected repo: `@datocms/*` packages in
`package.json`, `DATOCMS_*` env vars, `datocms.config.json`,
`cma-types.ts`.

---

## Step 1: Detect Context

If the project context is already established in this conversation (client
package, authentication approach, environment targeting), skip broad
detection below. Re-inspect only when a question cannot be answered from
prior context.

### Step 1a — Bootstrap project awareness (CLI + `datocms link` is mandatory)

Any CMA work on a DatoCMS-connected repo requires agent-side visibility
into the live project (models, fields, ids, record state). `datocms`
installed + `datocms login` + `datocms link` is that bootstrap — treat it
like `git init` or `npm install`: missing → fix first, do not route around.

**Bootstrap flow** (only `datocms login` needs an interactive terminal;
the rest the agent drives in non-TTY):

```bash
npm install --save-dev datocms        # if missing
npx datocms login                          # user, one-time, interactive
npx datocms projects:list [hint] --json    # agent discovers siteId
npx datocms link --site-id=<ID> [--organization-id=<ID>]   # agent links
```

**Always confirm the target project with the user before running `datocms
link`**, even when `projects:list` returns a single candidate. Show the
candidate(s) (name, id, organization) and wait for an explicit yes. Do not
treat "only one result" as consent — the user may have access to a project
they did not mean to wire to this repo, and fixing a mis-linked project
later is painful.

**Detection hints** (do not rely on `which datocms` — the CLI runs via
`npx`):

- `datocms` in `package.json` devDependencies → CLI available
- `datocms.config.json` with a `siteId` on the active profile → linked
- `npx datocms whoami` succeeds → OAuth session active
- none of the above → drive the bootstrap above

**Token-in-`.env` is the exception.** An explicit `DATOCMS_API_TOKEN` is
only for runtimes that cannot use OAuth: CI, server-side application code,
cron, webhooks, shared repo scripts. Even there, the agent still needs
CLI + link during development for project visibility.

**Learning the project's shape.** Once linked, run
`npx datocms schema:inspect` (optionally with a model API key, id, or
display name) to see the real models, blocks, fields, validators,
fieldsets, nested blocks, and relationships — TOON output by default,
`--json` for `| jq`. Use this any time the agent or user needs to
understand the project structure before writing code, choosing the right
field for a mutation, or deciding which model to query. Prefer it to
composing `cma:call item_types list` / `fields list` by hand. Reference:
`../datocms-cli/references/schema-inspect.md`.

**Red flag:** if you are about to say "paste a CMA token" or "add
`DATOCMS_CMA_TOKEN=...` to `.env`" for a task the user is running
interactively, stop. The right answer is the bootstrap above + the
actual operation expressed as a `cma:call` / `cma:script` invocation
(shapes in Step 4).

### Step 1b — Package and project detection

Once the auth approach is chosen, examine the project to determine the
runtime and which CMA client package is available.

1. Read `package.json` and check for these packages (in priority order):
   - `@datocms/cma-client` — Universal/isomorphic package. **Recommended for most cases.** Works in any environment with native `fetch`. Only provide a `fetchFn` if your runtime lacks native Fetch API.
   - `@datocms/cma-client-node` — Node.js-optimized. Adds upload helpers (`createFromLocalFile`, `createFromUrl`). Use when you need file-system upload convenience methods.
   - `@datocms/cma-client-browser` — Browser-optimized. Adds `createFromFileOrBlob()` for File/Blob uploads.

2. If none is installed and the task requires `buildClient()` code, recommend the appropriate package:
   - General / universal → `@datocms/cma-client`
   - Node.js project needing upload helpers → `@datocms/cma-client-node`
   - Browser-only project needing File/Blob uploads → `@datocms/cma-client-browser`

   (For pure OAuth-path work via `cma:call` / `cma:script`, none of these need to be installed — the CLI workspace ships its own client.)

3. Search for existing `buildClient()` calls to understand how the project already configures the client (API token source, environment targeting, etc.).

4. Only if the deliverable is unattended runtime code (see Step 1a): check for a `.env` or `.env.local` file and see whether a CMA-enabled `DATOCMS_API_TOKEN` (or similar) is already defined. If the only variable present is something read-only (`DATOCMS_READONLY_API_TOKEN`, `NEXT_PUBLIC_DATOCMS_API_TOKEN`, a CDA token), flag that a separate CMA-enabled token is needed for that specific runtime — not for the agent's own introspection, which must go through CLI + link regardless.

5. Check for an existing `cma-types.ts` file to determine if CMA type generation is already set up. Do **not** proactively suggest setting up type generation. For `cma:docs` lookups, `cma:call`, and `cma:script` this skill owns the execution shape directly — see the cheat sheets in Step 4. For schema-change requests, see the decision tree in **Step 2.5** — it covers when this skill owns the work directly and when it routes to **datocms-cli** migrations. Otherwise route to **datocms-cli** for CLI-workflow topics (`schema:generate`, environment operations, imports, plugin management, multi-project sync, CI/CD).

**Token scope reminder** (only when an unattended runtime genuinely needs one): the token must have `can_access_cma: true` and a role with the permissions the task requires (publishing, editing schema, etc.). It does not need to be "full-access" — it should be scoped to the smallest set of models, actions, and environments that the runtime actually needs.

---

## Step 2: Understand the Task

Classify the user's task into one or more categories. Ask follow-up questions only when the request is ambiguous or the risk of a wrong assumption is high.

- **Content operations** — Create, read, update, delete, publish, or unpublish records
- **Upload operations** — Upload files, manage assets, update metadata, bulk tag
- **Schema operations** — Create or modify models, fields, fieldsets, block models
- **Filtering & querying** — Search records, filter by fields, paginate large collections
- **Localization** — Work with localized field values and multi-locale content
- **Blocks & modular content** — Modular content fields, single-block fields, nested block payloads
- **Structured text & block tooling** — DAST payloads, embedded blocks, block traversal, debugging helpers
- **Environment operations** — Fork, promote, rename, delete sandbox environments
- **Webhook & deploy operations** — Configure webhooks, build triggers, deploy management
- **Access control** — Create roles, manage API tokens, invite users
- **Scheduling** — Schedule publish/unpublish, manage workflows
- **Migration & scripting** — Bulk data operations, content seeding, field migrations
- **Type generation** — Consume generated CMA schema types or wire typed record operations
- **Dashboard & schema menu management** — Organize navigation sidebar items, group models in menus
- **Plugin management** — Install, configure, or audit plugins programmatically
- **Project settings & usage** — Site settings, maintenance mode, subscription limits, usage tracking, white-label
- **Saved filters** — Create or manage saved record/upload filter views
- **Audit & debugging** — Query audit logs, inspect async job results, CMA-side search

If the user's request is clear and falls into an obvious category, skip the clarifying questions and proceed directly.

---

## Step 2.5: Schema changes — decide the approach with the user

DatoCMS schema operations fall into four buckets. The choice of approach
is not automatic — ask the user when the bucket is not obvious from the
request, because reversibility and workflow preference matter more than
which tool performs the mutation.

| Situation | What it covers | Approach |
|---|---|---|
| **Destructive schema change** | DROP a field, DROP a model, `bulk_destroy` records, lossy `field_type` changes (e.g. `string → json`, `json → string`, anything that discards stored values) | **Migration** via `datocms-cli` (`migrations:new`), against a forked sandbox first. Never run these against a primary environment without explicit, repeated user confirmation. |
| **Reversible schema change** | Add a field, add a model or block, rename a field, toggle `required`, add or tighten a validation, reorder fieldsets | **Ask the user.** Both approaches are safe; pick by preference and context. Lean to a migration (`datocms-cli`) when the repo already uses a migrations workflow or the user is on a secondary branch — reviewable, reproducible. Direct mutation (`cma:call`, `cma:script` stdin-mode, or `cma:script` file-mode) is fine for quick iteration on a sandbox. Default to migration only when the user has no preference AND the repo shows migration conventions (`migrations/` directory, prior migration commits). |
| **User-requested one-off** | Phrases like "quickly, without a migrations workflow", "just patch this", "one-off", "don't scaffold migrations for this" | **Honor the opt-out.** Use direct mutation via `cma:call` (single call with shape from `cma:docs`) or `cma:script` (stdin-mode for loops/multi-step, file-mode when the script is long enough that a heredoc hurts). Do not re-suggest migrations unless the change turns out to be a destructive schema change. |
| **Content operation** | Publish, unpublish, delete individual records, fix slugs, bulk update a field value, re-tag uploads | No migration needed. Prefer `cma:call` for a single call; `cma:script` stdin-mode for loops, pagination, or multi-step logic; `cma:script` file-mode only when a heredoc becomes painful. Code that needs to be committed and replayed across environments is a migration (`datocms-cli`), not this skill. |

Regardless of which skill is loaded, the **question to ask the user is
the same** for a reversible schema change: *"Do you want this as a
reviewable migration, or a direct mutation against a sandbox?"* The
answer determines which skill owns the follow-up — not which skill was
loaded first.

**Cross-skill routing.**
- User-requested one-offs, content operations, and the direct-mutation
  branch of a reversible schema change are this skill's core:
  `cma:call`, `cma:script` stdin-mode, and `cma:script` file-mode.
  Stay here and load the references in Step 3.
- Destructive schema changes, the migration branch of a reversible
  schema change, and anything that must be committed/versioned/replayed
  across environments are better covered by **datocms-cli**
  (`migrations:new`, `migrations:run`). Switch when the change is
  destructive, when the repo already uses a migrations workflow, or
  when the user wants the change as a reviewable migration. The
  handoff is loading the sibling skill's references — do not bounce
  the user.
- Unattended runtime code (CI, app server, webhook, long-lived
  automation) is a separate scenario — that is where a checked-in
  `buildClient()` script belongs. See Step 4 ("Client Setup").

---

## Step 3: Load References

Based on the task classification, read the appropriate reference files from the `references/` directory next to this skill file. Prefer section-level reads inside long references by using each file's Quick Navigation section first. Only load what is relevant.

**Always load:**
- `references/client-setup-and-errors.md` — Package choice, client setup, token/environment config, error handling

**Load per category:**

- `Content operations` → `references/records.md`
- `Upload operations` → `references/uploads.md`
- `Schema operations` → `references/schema.md`
- `Filtering & querying` → `references/filtering-and-pagination.md`
- `Localization` → `references/localization.md`
- `Blocks & modular content` → `references/block-records-and-modular-content.md`
- `Structured text & block tooling` → `references/structured-text-and-block-tools.md`
- `Environment operations` → `references/environments.md`
- `Webhook & deploy operations` → `references/webhooks-and-triggers.md`
- `Access control` → `references/access-control.md`
- `Scheduling` → `references/scheduling.md`
- `Migration & scripting` → `references/migration-patterns.md`
- `Type generation` → `references/type-generation.md`
- `Dashboard & schema menu management` → `references/dashboard-and-schema-menus.md`
- `Plugin management` → `references/plugins.md`
- `Project settings & usage` → `references/project-settings-and-usage.md`
- `Saved filters` → `references/saved-filters.md`
- `Audit & debugging` → `references/async-jobs-and-search.md`

**Load cross-cutting references when needed:**
- If the task involves localized fields in any context → also load `references/localization.md`
- If the task uses `raw*()` methods, generated CMA types, advanced client behavior, or platform limits → also load `references/client-types-and-behaviors.md`
- If the task involves modular content or single-block fields → also load `references/block-records-and-modular-content.md`
- If the task involves DAST structured text, `SchemaRepository`, `inspectItem()`, or block traversal utilities → also load `references/structured-text-and-block-tools.md`
- If the task involves listing many records → also load `references/filtering-and-pagination.md`
- If the task is a migration script → also load `references/migration-patterns.md` plus whatever domain refs are needed
- If the task involves video upload subtitles/tracks or upload tag management → also load `references/upload-tracks-and-tags.md`
- If the task involves maintenance mode before a migration → also load `references/project-settings-and-usage.md`
- If the task involves checking subscription limits before bulk operations → also load `references/project-settings-and-usage.md`

---

## Step 4: Generate the Solution

When the response includes code, follow these default rules:

### Authentication (respect the Step 1a bootstrap)
- CLI + link is a prerequisite of Step 4, not a choice. If the project is not yet linked, fix that first (propose install + login + link) before writing any solution code.
- For interactive / one-off work (the majority of CMA tasks), do not write `buildClient({ apiToken: ... })` code at all — output a `cma:call` invocation (single call with shape from `cma:docs`) or a `cma:script` invocation (stdin-mode for loops/multi-step, file-mode when a heredoc becomes painful) using the shapes below. The CLI handles auth silently via the linked project; no cross-skill hop needed.
- Only when the deliverable is unattended runtime code (CI, server-side app, long-lived automation, repo-committed shared scripts) should the response include `buildClient()` + env-var token code.

#### `cma:call` shape — do not invent REST-style flags

`cma:call` is **positional** (`<RESOURCE> <METHOD>` + any URL placeholders as
extra positional args), with JSON5 request bodies and query params passed via
`--data` / `--params`. It is **not** a REST wrapper — there is no
`--endpoint`, `--method`, `--query-params`, or `--body` flag.

```bash
# List + filter
npx datocms cma:call items list --params='{filter: {type: "article"}}'

# Single resource
npx datocms cma:call items find <ITEM_ID>

# Mutate (confirm environment first)
npx datocms cma:call items update <ITEM_ID> --data='{title: "Updated"}'
npx datocms cma:call items publish <ITEM_ID>

# Schema (prefer a migration unless the user opted out)
npx datocms cma:call fields create <ITEM_TYPE_ID> --data='{label: "Title", api_key: "title", field_type: "string"}'
```

`--data` / `--params` accept JSON5 (unquoted keys, single-quoted wrapping), which
keeps shell escaping sane. If unsure about the exact resource/method/body shape,
run `npx datocms cma:docs <resource> <action>` — that is the authoritative
source.

#### `cma:script` shape — typed one-off TypeScript, two modes

Use `cma:script` when a one-off task needs loops, branching, multiple dependent
calls, or typed `Schema.*` record payloads. It has two modes with different
ergonomics — pick by how the script is delivered, not by how "complex" it is.

**stdin-mode** — top-level await, piped or heredoc. Zero setup. `client`
(pre-authenticated) and `Schema` (project record types) are **ambient globals**
inside a CLI-bundled workspace; `tsc --noEmit` type-checks before execution;
`any` and `unknown` are rejected. Pre-installed packages available without
install: `@datocms/cma-client-node`, `datocms-structured-text-*`, `parse5`.
`export default` is not supported here — use file-mode if you want a function.

```bash
npx datocms cma:script <<'EOF'
const items = await client.items.list({ filter: { type: 'article' } });
console.log(items.length);
EOF
```

**file-mode** — `export default async function(client: Client)` in a `.ts`
file on disk. Runs in the user's own TypeScript context (validation via
editor LSP against your `tsconfig.json`, or an explicit `tsc --noEmit`;
no CLI-side typecheck). Same throwaway scenario
as stdin-mode — this is not "code to commit"; use it when a heredoc becomes
painful (long script, fragile quoting with `$`/backticks, local helper
imports, or you want to rerun by filename).

```ts
// tmp/scripts/publish-drafts.ts
import type { Client } from 'datocms/lib/cma-client-node';
// Optional typed project schema — run once next to the script:
//   npx datocms schema:generate ./datocms-schema.ts
// import * as Schema from './datocms-schema';

export default async function (client: Client): Promise<void> {
  for await (const draft of client.items.listPagedIterator({
    filter: { fields: { _status: { eq: 'draft' } } },
  })) {
    await client.items.publish(draft.id);
  }
}
```

```bash
npx datocms cma:script tmp/scripts/publish-drafts.ts [--environment <env>]
```

Rules of thumb:
- **Use `cma:call` first** for a single call with a shape you can read from
  `cma:docs`. Reach for `cma:script` only when the task needs loops,
  pagination, branching, dependent calls, or typed `Schema.*` payloads.
- **stdin-mode for quick hacks**: pipes, heredocs, one-liners. No file on
  disk, no project prerequisites.
- **file-mode when a heredoc hurts**: long script, nested quoting, local
  helper imports, or you want to rerun the file by name. Requires
  `datocms` reachable in `node_modules` from the file's directory;
  place the file in a gitignored scratch dir (`tmp/scripts/`, `scratch/`,
  `~/scratch/dato/`). Prefer a migration for code you want to commit,
  version, and replay across environments, and do not put file-mode
  scripts under `migrations/` — that directory is owned by
  `migrations:run`.
- **Typed `Schema.*` in file-mode is opt-in**: run
  `npx datocms schema:generate ./datocms-schema.ts` next to the script and
  `import * as Schema from './datocms-schema'`. In stdin-mode `Schema.*`
  is ambient — no generation needed.
- **Import path matters for promotion**: file-mode imports `Client` from
  `datocms/lib/cma-client-node` — the same import migrations use, so
  a file-mode script can be promoted into a migration with a plain `mv`
  into `migrations/` (signature matches too).
- **Redirect `2>/dev/null`** when piping stdin-mode stdout into `jq`.
- **Pre-installed packages are stdin-only**. In file-mode, install what
  you need into your own `package.json`.
- **Reach for a checked-in `buildClient()` script** only when the code
  must run unattended (CI, app server, webhook, long-lived automation).
  See "Client Setup" below.

For advanced patterns (workspace flags, stdout shaping, long-running scripts),
consult the **datocms-cli** skill.

### Client Setup (unattended-runtime code only)
- Default to `buildClient()` from the detected package (Step 1b)
- Read the API token from an environment variable; never hardcode it and never ask the user to paste it into the chat
- Set the `environment` option when working with sandbox environments

### API Surface
- Default to the simplified API (e.g., `client.items.create()`) because it handles serialization/deserialization automatically
- Switch to `raw*()` methods only when the task explicitly needs raw JSON:API payloads, relationship metadata, or generated CMA schema types are intentionally part of the solution

### Pagination
- Prefer `*.listPagedIterator()` (for example `client.items.listPagedIterator()`) when iterating over collections
- Avoid manual offset/limit pagination loops unless a resource genuinely lacks an iterator
- Use `for await...of` to consume async iterators

### Blocks
- Prefer `buildBlockRecord()` when creating block records for the simplified API
- Import it from the same package as `buildClient`

### Error Handling
- Catch `ApiError` for API failures — it provides `.errors` getter and `.findError()` method
- Catch `TimeoutError` for request timeouts in long-running or request-heavy flows
- Import both from the same package as `buildClient`

### TypeScript
- Follow the TypeScript strictness rules: no `as unknown as`, no unnecessary `as` casts
- Let TypeScript infer types wherever possible
- Use `import type { ... }` for type-only imports

---

## Step 5: Verify

Before presenting the final code:

1. **Project-awareness bootstrap** — Confirm the repo has the `datocms` npm package installed and the project is linked (`datocms.config.json` with a `siteId`, `npx datocms whoami` succeeds). If not, the final proposal must include the install + login + link sequence before any CMA operation. For interactive / one-off tasks the deliverable should be a `cma:call` / `cma:script` invocation (shapes in Step 4), not a `buildClient()` script that requires a token in `.env`. Only when the code will run unattended (CI, server-side app, long-lived automation) should a token-in-env solution be presented — and in that case the token must have CMA access enabled and the role permissions the task needs. Schema changes require a role with `can_edit_schema: true`.
2. **Environment targeting** — If working with a sandbox, ensure the `environment` config option is set
3. **Error handling** — Ensure `ApiError` is caught at appropriate boundaries
4. **Pagination** — If the solution iterates a collection that could exceed a single page, prefer `listPagedIterator()`
5. **Type safety** — Ensure no type assertions (`as`) are used to silence errors
6. **Imports** — Ensure all imports come from the correct package (the one detected in Step 1)
7. **Generated types** — If the solution intentionally uses generated CMA types (`cma-types.ts`), ensure the chosen path is typed end to end: simplified API generics by default, or `raw*()` / `RawApiTypes.Item<>` only when raw payload access is intentional

If the generated code is a script (migration, seeding, etc.), wrap it in an async function with proper error handling and progress reporting.

---

## Cross-Skill Routing

This skill covers **content management via the REST CMA** (mutations, schema, uploads, webhooks, scripts). If the task involves any of the following, activate the companion skill:

| Condition | Route to |
|---|---|
| CLI-workflow topics: migrations (creating, running, autogenerate), `schema:generate`, environment operations (`fork`/`promote`/`destroy`/`rename`), imports (WordPress, Contentful), CLI plugin management, blueprint/multi-project sync, CI/CD deployment workflows | **datocms-cli** |
| Querying content with GraphQL for frontend display | **datocms-cda** |
| Setting up draft mode, Web Previews, Content Link, real-time subscriptions, or framework integration | **datocms-frontend-integrations** |
| Building a DatoCMS plugin | **datocms-plugin-builder** |
