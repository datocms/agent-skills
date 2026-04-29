# One-Off CMA Scripts (`cma:script`)

Use `cma:script` to run a TypeScript script against the Content Management
API without scaffolding a full repo project. Great for ad-hoc operations
that are too complex for `cma:call` (loops, branching, multiple dependent
calls, typed record payloads) but do not need to live in the repo.

---

## Command

```bash
npx datocms cma:script [<path>] [--environment <env>] [--timeout <seconds>] [--skip-validation] [--rebuild-workspace]
```

The script path is passed as a positional argument (matches the ergonomics of
`tsx`, `bun`, `node`). Without a path, the script is read from **stdin** —
ideal for heredocs and one-liners. Run `npx datocms cma:script --help` for
the full flag list.

> **Precondition:** requires a CMA-enabled token via a linked project
> (`datocms link`), `--api-token` flag, or environment variable. Same
> resolution order as every other CMA-using command.
>
> **No CMA token in `.env` needed** when the project is linked. OAuth
> credentials + Dashboard API cover it. If the user is about to write a
> CMA token into `.env` for a one-off operation, suggest `datocms login`
> + `datocms link` instead — fewer secrets, scoped to the user's
> identity, revocable centrally.

> **Schema-change warning:** mutating models, fields, fieldsets, or
> block models via `cma:script` bypasses the migration audit trail
> (no checked-in script, no dry-run, no reproducibility across
> environments). Confirm the approach with the user before writing
> schema logic here — a migration is the safer default. Never mutate
> schema against a primary-like environment without explicit user
> confirmation.

---

## Two Modes: stdin-mode and file-mode

`cma:script` has two modes with different ergonomics. Pick by how the
script is delivered, not by how "complex" it is — both modes support
loops, branching, dependent calls, and typed payloads.

### stdin-mode — top-level await with ambient globals

Source comes from stdin (heredoc, pipe, or redirect). No file on disk,
no project prerequisites. `client` (pre-authenticated CMA client) and
`Schema` (project record types like `Schema.BlogPost`) are available as
ambient globals — no imports required. The CLI runs the script inside
an isolated workspace, type-checks it with `tsc --noEmit`, then
executes.

```ts
const types = await client.itemTypes.list();
console.log(types.map((t) => t.api_key));
```

- Top-level await only. `export default` is rejected in stdin-mode —
  use file-mode if you want a function.
- Pre-installed packages (see below) are available without install.
- Diagnostics surface only from the CLI's workspace typecheck — your
  editor has no file to inspect.

Use stdin-mode when:
- piping a one-liner or a heredoc through stdin
- no setup is available (no `node_modules`, no `tsconfig`)
- you want `Schema.*` autocomplete without boilerplate

### file-mode — default-export async function in a `.ts` file

Same throwaway scenario as stdin-mode, but the script lives in a file
because a heredoc would be too fragile or too long. The file runs in
**your** TypeScript context: the CLI does not spawn the workspace, does
not run `tsc --noEmit`, does not inject ambient globals. Validation
comes from your editor's LSP (using your own `tsconfig.json`) in real
time, or from an explicit `tsc --noEmit` you run yourself — both sit in
the same TS project as the script, so they see the same imports and
types that will resolve at runtime.

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

- `export default async function(client: Client)` is required;
  top-level await is rejected in file-mode (use stdin-mode for that).
- `Client` is imported from `datocms/lib/cma-client-node` — the
  same import that migrations use. A file-mode script can be promoted
  into a migration with `mv tmp/scripts/publish-drafts.ts migrations/`
  (signature matches too).
- Typed `Schema.*` is **opt-in**: run
  `npx datocms schema:generate ./datocms-schema.ts` next to the script
  and `import * as Schema from './datocms-schema'`. Without it, the
  client is still usable with generic types.
- Pre-installed packages are **not** available in file-mode. Install
  what you need into your own `package.json`.
- Requires `datocms` reachable in `node_modules` from the file's
  directory. Place the file in a gitignored scratch dir — typically
  `tmp/scripts/`, `scratch/`, or `~/scratch/dato/`. Prefer a migration
  for code you want to commit, version, and replay across environments,
  and do not put file-mode scripts under `migrations/` — that directory
  is owned by `migrations:run`.

Use file-mode when:
- the script is long enough that heredoc quoting becomes painful (`$`,
  backticks, nested quotes)
- the script imports local helper modules from a scratch dir
- you want to rerun it by filename
- you want to type-check the script against your own `tsconfig.json`
  — continuously via your editor's LSP, or explicitly with
  `tsc --noEmit`

---

## Type Safety

**stdin-mode** scripts are type-checked with `tsc --noEmit` inside the
CLI workspace **before execution**. `any` and `unknown` are rejected —
use `Schema.*` types for record operations:

```ts
await client.items.create<Schema.Article>({
  item_type: { id: 'ABC123', type: 'item_type' },
  title: 'Hello world',
});
```

- `--skip-validation` disables the stdin-mode pre-flight type-check.
  Reach for it only when debugging a false positive from the workspace's
  `tsc`.
- `--rebuild-workspace` wipes and rebuilds the internal workspace
  (`node_modules`, `tsconfig`). Use after a CLI upgrade if stdin-mode
  scripts start failing with module resolution errors.

**file-mode** does not run a CLI-side typecheck. Type safety comes from
your own project: your editor's LSP continuously against your
`tsconfig.json`, or an explicit `tsc --noEmit` you invoke yourself.
This matches how `migrations:run` loads a single file — no CLI-side
typecheck there either. A malformed `Schema.Article` or a missing field
will surface in the editor before you run the script, or at runtime if
you skip validation entirely.

---

## Pre-Installed Packages (stdin-mode only)

In **stdin-mode**, the following packages are importable without any
install step — they live inside the CLI workspace:

- `@datocms/cma-client-node`
- `datocms-html-to-structured-text`
- `datocms-structured-text-utils`
- `datocms-structured-text-dastdown`

In **file-mode**, the CLI does not manage your dependencies — install
whatever you need into the `package.json` that covers your scratch
dir. If an import cannot be resolved when the script runs, the error
surfaces from `tsxRequire`.

If the task needs a package you don't want to install in file-mode and
it isn't in the stdin-mode allowlist, switch to a repo script (see
**datocms-cma**).

---

## Stdout and Composition

Use `console.log()` for output. stdout is piped cleanly, so scripts
compose with `jq` and other tools:

```bash
echo 'console.log(JSON.stringify(await client.itemTypes.list()))' \
  | npx datocms cma:script 2>/dev/null \
  | jq '.[].api_key'
```

Redirect stderr (`2>/dev/null`) when piping, so the CLI's progress
output does not contaminate the JSON stream.

---

## Targeting an Environment

```bash
npx datocms cma:script ./backfill.ts --environment=staging
```

`--environment` configures the ambient `client` to target a sandbox.
Omit to use the primary environment.

---

## Examples

### stdin-mode heredoc

```bash
npx datocms cma:script <<'EOF'
const itemTypes = await client.itemTypes.list();
console.log(itemTypes.map((t) => t.api_key));
EOF
```

### stdin-mode heredoc with typed `Schema.*`

```bash
npx datocms cma:script <<'EOF'
await client.items.create<Schema.Article>({
  item_type: { id: 'ABC123', type: 'item_type' },
  title: 'Hello world',
});
EOF
```

### stdin-mode one-liner

```bash
echo 'console.log((await client.itemTypes.list()).map(t => t.api_key))' \
  | npx datocms cma:script
```

### file-mode from a scratch path

```bash
npx datocms cma:script tmp/scripts/backfill-slugs.ts --environment=staging
```

The file must:
- `export default async function(client: Client)`,
- import `Client` from `datocms/lib/cma-client-node`,
- sit in a directory with `datocms` resolvable via `node_modules`.

---

## Picking the right tool

| Tool | When |
|---|---|
| `cma:call` | A single CMA call with a shape readable from `cma:docs`. Fastest — a direct HTTP request, no workspace cold-start. |
| `cma:script` stdin-mode | Throwaway one-liner, heredoc, or pipe. Zero setup, ambient `client` and `Schema`, top-level await only. |
| `cma:script` file-mode | Same throwaway scenario as stdin-mode, but the script is long enough that heredoc quoting hurts, imports local helpers, or should be rerunnable by filename. Lives in a gitignored scratch dir. |
| Migration (`datocms-cli`) | Code that must be **committed, versioned, and replayed** across environments. Use `migrations:new` to scaffold — a file-mode script can be promoted with `mv` since imports and signature already match. |
| Checked-in `buildClient()` script (**datocms-cma**) | **Unattended runtime** code: CI, app server, webhook, long-lived automation. Needs a CMA token in the environment. |

> **Tip:** Use `npx datocms cma:docs <resource> <action>` to look up the
> exact request body shape and parameters before writing a `cma:call`
> or a `cma:script`.
