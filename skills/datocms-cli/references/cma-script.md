# One-Off CMA Scripts (`cma:script`)

Use `cma:script` to run TypeScript script against Content Management API without scaffolding full repo project. Great for ad-hoc operations too complex for `cma:call` (loops, branching, multiple dependent calls, typed record payloads) but don't need to live in repo.

## Contents

- Command
- Two Modes: stdin-mode and file-mode
- Type Safety
- Pre-Installed Packages (stdin-mode only)
- Stdout and Composition
- Targeting an Environment
- Examples
- Picking right tool

## Command

```bash
npx datocms cma:script [<path>] [--environment <env>] [--timeout <seconds>] [--skip-validation] [--rebuild-workspace]
```

Script path passed as positional argument (matches ergonomics of `tsx`, `bun`, `node`). Without path, script read from **stdin** — ideal for heredocs and one-liners. Run `npx datocms cma:script --help` for full flag list.

> **Precondition:** requires CMA-enabled token via linked project (`datocms link`), `--api-token` flag, or environment variable. Same resolution order as every other CMA-using command.
>
> **No CMA token in `.env` needed** when project linked. OAuth credentials + Dashboard API cover it. If user about to write CMA token into `.env` for one-off operation, suggest `datocms login`
>
> - `datocms link` instead — fewer secrets, scoped to user's identity, revocable centrally.

> **Schema-change warning:** mutating models, fields, fieldsets, or block models via `cma:script` bypasses migration audit trail (no checked-in script, no dry-run, no reproducibility across environments). Confirm approach with user before writing schema logic here — migration is safer default. Never mutate schema against primary-like environment without explicit user confirmation.

## Two Modes: stdin-mode and file-mode

`cma:script` has two modes with different ergonomics. Pick by how script delivered, not by how "complex" — both modes support loops, branching, dependent calls, typed payloads.

### stdin-mode — top-level await with ambient globals

Source comes from stdin (heredoc, pipe, or redirect). No file on disk, no project prerequisites. `client` (pre-authenticated CMA client) and `Schema` (project record types like `Schema.BlogPost`) available as ambient globals — no imports required. CLI runs script inside isolated workspace, type-checks with `tsc --noEmit`, then executes.

```ts
const types = await client.itemTypes.list();
console.log(types.map((t) => t.api_key));
```

- Top-level await only. `export default` rejected in stdin-mode — use file-mode if you want function.
- Pre-installed packages (see below) available without install.
- Diagnostics surface only from CLI's workspace typecheck — your editor has no file to inspect.

Use stdin-mode when:

- piping one-liner or heredoc through stdin
- no setup available (no `node_modules`, no `tsconfig`)
- you want `Schema.*` autocomplete without boilerplate

### file-mode — default-export async function in `.ts` file

Same throwaway scenario as stdin-mode, but script lives in file because heredoc would be too fragile or too long. File runs in **your** TypeScript context: CLI does not spawn workspace, does not run `tsc --noEmit`, does not inject ambient globals. Validation comes from your editor's LSP (using your own `tsconfig.json`) in real time, or from explicit `tsc --noEmit` you run yourself — both sit in same TS project as script, so they see same imports and types that will resolve at runtime.

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

- `export default async function(client: Client)` required; top-level await rejected in file-mode (use stdin-mode for that).
- `Client` imported from `datocms/lib/cma-client-node` — same import that migrations use. file-mode script can be promoted into migration with `mv tmp/scripts/publish-drafts.ts migrations/` (signature matches too).
- Typed `Schema.*` **opt-in**: run `npx datocms schema:generate ./datocms-schema.ts` next to script and `import * as Schema from './datocms-schema'`. Without it, client still usable with generic types.
- Pre-installed packages **not** available in file-mode. Install what you need into your own `package.json`.
- Requires `datocms` reachable in `node_modules` from file's directory. Place file in gitignored scratch dir — typically `tmp/scripts/`, `scratch/`, or `~/scratch/dato/`. Prefer migration for code you want to commit, version, and replay across environments, and do not put file-mode scripts under `migrations/` — that directory owned by `migrations:run`.

Use file-mode when:

- script long enough that heredoc quoting becomes painful (`$`, backticks, nested quotes)
- script imports local helper modules from scratch dir
- you want to rerun it by filename
- you want to type-check script against your own `tsconfig.json` — continuously via your editor's LSP, or explicitly with `tsc --noEmit`

## Type Safety

**stdin-mode** scripts type-checked with `tsc --noEmit` inside CLI workspace **before execution**. `any` and `unknown` rejected — use `Schema.*` types for record operations:

```ts
await client.items.create<Schema.Article>({
  item_type: { id: 'ABC123', type: 'item_type' },
  title: 'Hello world',
});
```

- `--skip-validation` disables stdin-mode pre-flight type-check. Reach for it only when debugging false positive from workspace's `tsc`.
- `--rebuild-workspace` wipes and rebuilds internal workspace (`node_modules`, `tsconfig`). Use after CLI upgrade if stdin-mode scripts start failing with module resolution errors.

**file-mode** does not run CLI-side typecheck. Type safety comes from your own project: your editor's LSP continuously against your `tsconfig.json`, or explicit `tsc --noEmit` you invoke yourself. This matches how `migrations:run` loads single file — no CLI-side typecheck there either. Malformed `Schema.Article` or missing field will surface in editor before you run script, or at runtime if you skip validation entirely.

## Pre-Installed Packages (stdin-mode only)

In **stdin-mode**, following packages importable without any install step — they live inside CLI workspace:

- `@datocms/cma-client-node`
- `datocms-html-to-structured-text`
- `datocms-structured-text-utils`
- `datocms-structured-text-dastdown`

In **file-mode**, CLI does not manage your dependencies — install whatever you need into `package.json` that covers your scratch dir. If import cannot be resolved when script runs, error surfaces from `tsxRequire`.

If task needs package you don't want to install in file-mode and it isn't in stdin-mode allowlist, switch to repo script (see **datocms-cma**).

## Stdout and Composition

Use `console.log()` for output. stdout piped cleanly, so scripts compose with `jq` and other tools:

```bash
echo 'console.log(JSON.stringify(await client.itemTypes.list()))' \
  | npx datocms cma:script 2>/dev/null \
  | jq '.[].api_key'
```

Redirect stderr (`2>/dev/null`) when piping, so CLI's progress output does not contaminate JSON stream.

## Targeting an Environment

```bash
npx datocms cma:script ./backfill.ts --environment=staging
```

`--environment` configures ambient `client` to target sandbox. Omit to use primary environment.

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

### file-mode from scratch path

```bash
npx datocms cma:script tmp/scripts/backfill-slugs.ts --environment=staging
```

File must:

- `export default async function(client: Client)`,
- import `Client` from `datocms/lib/cma-client-node`,
- sit in directory with `datocms` resolvable via `node_modules`.

## Picking right tool

| Tool | When |
| - | - |
| `cma:call` | Single CMA call with shape readable from `cma:docs`. Fastest — direct HTTP request, no workspace cold-start. |
| `cma:script` stdin-mode | Throwaway one-liner, heredoc, or pipe. Zero setup, ambient `client` and `Schema`, top-level await only. |
| `cma:script` file-mode | Same throwaway scenario as stdin-mode, but script long enough that heredoc quoting hurts, imports local helpers, or should be rerunnable by filename. Lives in gitignored scratch dir. |
| Migration (`datocms-cli`) | Code that must be **committed, versioned, and replayed** across environments. Use `migrations:new` to scaffold — file-mode script can be promoted with `mv` since imports and signature already match. |
| Checked-in `buildClient()` script (**datocms-cma**) | **Unattended runtime** code: CI, app server, webhook, long-lived automation. Needs CMA token in environment. |

> **Tip:** Use `npx datocms cma:docs <resource> <action>` to look up exact request body shape and parameters before writing `cma:call` or `cma:script`.
