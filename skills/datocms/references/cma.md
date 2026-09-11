# Content Management API

Use CMA patterns for records, uploads, localization, blocks, access, and automation. CLI owns command syntax and migrations; CMA owns payload/workflow decisions inside those commands and scripts.

## Establish the execution context

For live agent-side operations, read [CLI setup](cli/cli-setup.md) and use the existing OAuth-linked project. Inspect its schema with [schema inspection](cli/schema-inspect.md). Do not request a pasted CMA token for an interactive operation. Diagnosis and explanations can use relevant references without installing or linking anything.

Choose the deliverable:

| Need | Execution path |
| - | - |
| One method call | `cma:call`, with shape from [direct CMA calls](cli/direct-cma-calls.md) |
| One-off loops, pagination, branching, dependent calls | `cma:script` stdin or file mode, per [CMA scripting](cli/cma-script.md) |
| Committed change replayed across environments | [CLI migrations](cli/creating-migrations.md) |
| Code running unattended in CI, server, webhook, or automation | Checked-in `buildClient()` code with a scoped environment token |
| Models, fields, fieldsets, or destructive schema changes | Decide the approach with [schema changes](cli/schema-changes.md) first |

Prefer stdin for a short throwaway script. File mode supports longer scripts, local helpers, and rerunning by filename; keep those files in gitignored scratch space. Do not duplicate CLI command rules here.

For unattended code, inspect existing `buildClient()` calls and select the installed package. The universal client is the default; Node/browser variants add their respective upload helpers. Use the smallest token role needed by that runtime. Existing generated CMA types are context to preserve, not a reason to scaffold type generation during a narrow task.

## Read the relevant references

Read [client setup and errors](cma/client-setup-and-errors.md) for package/client/error conventions. Obtain exact endpoint shapes and TypeScript signatures with `cma:docs`, following [direct CMA calls](cli/direct-cma-calls.md); use domain references for ordering and implementation patterns.

| Task | Reference |
| - | - |
| Create, update, publish, delete records | [Records](cma/records.md) |
| Upload helpers, assets, metadata, collections | [Uploads](cma/uploads.md) |
| Model/field payloads and schema mechanics | [Schema](cma/schema.md) |
| Filtering or iterating many records | [Filtering and pagination](cma/filtering-and-pagination.md) |
| Localized values, locale changes | [Localization](cma/localization.md) |
| Modular content, single blocks, DAST, traversal, per-locale backfills | [Editing records](cma/editing-records.md) |
| Programmatic environment management | [Environments](cma/environments.md) |
| Roles, tokens, invitations | [Access control](cma/access-control.md) |
| Migration bodies, seeding, bulk changes | [Migration patterns](cma/migration-patterns.md) |
| Consume generated project types | [Type generation](cma/type-generation.md) |
| Raw API methods, client behavior, limits | [Client types and behaviors](cma/client-types-and-behaviors.md) |
| Site settings, maintenance, usage, subscription limits | [Project settings and usage](cma/project-settings-and-usage.md) |
| Webhooks, build triggers, schedules, workflows, menus, plugins, saved filters, audit, jobs, upload tracks/tags | [Resource gotchas](cma/resource-gotchas.md), selected section |

Combine references when necessary: localized block edits need localization and editing-records; migration bodies need migration-patterns plus their resource guidance; bulk work may need usage/limits checks.

## Implementation conventions

- Default to the simplified API. Use `raw*()` only for intentional JSON:API payloads/relationships or a workflow that actually needs the raw contract.
- Prefer `listPagedIterator()` and `for await...of` for collections; avoid manual offset loops unless the resource lacks an iterator.
- Use `buildBlockRecord()` for simplified block creation, from the same client package as `buildClient`.
- Catch `ApiError` at boundaries; use `.errors`/`.findError()` for structured errors. Handle `TimeoutError` in request-heavy or long-running flows.
- Use precise `Schema.*`, `ApiTypes.*`, field-value types, and type guards. Follow [script validation](cli/cma-script.md) when using CLI scripts; no assertion should silence a type error.
- Only unattended runtime code constructs a client from an environment token. CLI scripts and migrations receive their authenticated client.

## Verify

Confirm the intended project/environment, appropriate permissions, pagination, error handling, package imports, and typed payloads. Check generated-type workflows end to end; do not switch to raw calls merely to avoid type errors.

For a full first-time TypeScript setup, [setup](setup.md) can queue CMA types alongside CLI bootstrap. For a narrow existing-project task, preserve the existing type-generation convention. Use [modeling](modeling.md) for content-design choices and [CDA](cda.md) for GraphQL reads.
