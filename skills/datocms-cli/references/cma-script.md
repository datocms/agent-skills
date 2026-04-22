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

## Two Script Formats

### Format A — default-export async function

Portable: the same file is compatible with `migrations:run`.

```ts
import type { Client } from '@datocms/cma-client-node';

export default async function (client: Client) {
  const itemTypes = await client.itemTypes.list();
  console.log(itemTypes.map((t) => t.api_key));
}
```

Use when:
- the script might later be promoted into a migration
- the logic is long enough to deserve a named, typed function
- multiple contributors will edit it

### Format B — top-level await with ambient globals

`client` (pre-authenticated CMA client) and `Schema` (project-specific
`ItemTypeDefinition` types, e.g. `Schema.BlogPost`) are available as
ambient globals. No imports required.

```ts
const types = await client.itemTypes.list();
console.log(types.map((t) => t.api_key));
```

Use when:
- piping a one-liner through stdin
- the script will be thrown away after it runs
- you want `Schema.*` autocomplete without boilerplate

---

## Type Safety

Scripts are type-checked with `tsc --noEmit` **before execution**. `any`
and `unknown` are rejected — use `Schema.*` types for record operations:

```ts
await client.items.create<Schema.Article>({
  item_type: { id: 'ABC123', type: 'item_type' },
  title: 'Hello world',
});
```

- `--skip-validation` disables the pre-flight type-check. Reach for it
  only when debugging a false positive from the workspace's `tsc`.
- `--rebuild-workspace` wipes and rebuilds the internal workspace
  (`node_modules`, `tsconfig`). Use after a CLI upgrade if scripts start
  failing with module resolution errors.

---

## Pre-Installed Packages

Both formats can import these without any install step:

- `@datocms/cma-client-node`
- `datocms-html-to-structured-text`
- `datocms-structured-text-utils`
- `datocms-structured-text-to-plain-text`
- `datocms-structured-text-to-html-string`
- `datocms-structured-text-to-markdown`
- `parse5`

If the task needs a package outside this list, switch to a repo script
(see **datocms-cma**) rather than trying to extend the `cma:script`
workspace.

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

### Inline heredoc — Format A

```bash
npx datocms cma:script <<'EOF'
import type { Client } from '@datocms/cma-client-node';

export default async function (client: Client) {
  const itemTypes = await client.itemTypes.list();
  console.log(itemTypes.map((t) => t.api_key));
}
EOF
```

### Inline heredoc — Format B with `Schema.*` types

```bash
npx datocms cma:script <<'EOF'
await client.items.create<Schema.Article>({
  item_type: { id: 'ABC123', type: 'item_type' },
  title: 'Hello world',
});
EOF
```

### Stdin one-liner

```bash
echo 'console.log((await client.itemTypes.list()).map(t => t.api_key))' \
  | npx datocms cma:script
```

### Running from a file

```bash
npx datocms cma:script ./scripts/backfill-slugs.ts --environment=staging
```

---

## `cma:call` vs `cma:script` vs repo script

| Tool | When to use |
|---|---|
| `cma:call` | Single API method invocation from the terminal |
| `cma:script` | Multi-step or typed TypeScript logic that does not need to live in the repo (loops, branching, `Schema.*` types, structured text helpers) |
| Repo script (datocms-cma) | The code should be checked in, reused, tested, or needs packages outside the `cma:script` workspace |

> **Tip:** Use `npx datocms cma:docs <resource> <action>` to look up the
> exact request body shape and parameters before writing a `cma:script`.
