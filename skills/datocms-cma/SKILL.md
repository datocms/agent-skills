---
name: datocms-cma
description: >-
  Manage DatoCMS records, uploads, and project automation through the Content
  Management API (CMA). Use for content reads/edits, publish/unpublish, bulk
  imports/exports, CSV scripts, localization, Structured Text and block edits,
  assets, roles/tokens, webhooks, scheduling, environment operations, and typed
  Node.js/TypeScript CMA scripts. Includes short follow-ups such as "publish
  them" or "fix those slugs", authentication needed for content operations, and
  model/field changes needing a migration-versus-direct decision or embedded
  in CMA automation. Works with the CLI or an available DatoCMS MCP; neither
  MCP installation nor local execution is assumed. Route versioned migrations
  and standalone CLI configuration to `datocms-cli`, GraphQL reads to `datocms-cda`, and
  frontend or plugin code to their dedicated skills.
---

# DatoCMS Content Management API Skill

Use this workflow for CMA operations and scripts. For advice or code explanations, skip execution and setup. Short follow-ups such as “publish them” retain the earlier DatoCMS task, selected route, project, environment, and scope.

## 1. Select execution before setup

Use only task-relevant capabilities already exposed in the current environment. Available means usable now, not merely installable. Reuse established context; don't run startup connection checks or scan client configuration.

- **Explicit route:** honor the user's choice of current MCP or CLI, including MCP when CLI is available. A follow-up keeps its established route unless the user changes it.
- **No preference or established route:** prefer a usable CLI. If current MCP is available and CLI execution is not usable, use MCP without package installation, CLI login, or project linking. Don't bootstrap CLI merely to displace an available MCP connection.
- **Neither ready:** explain the missing prerequisite appropriate to this environment. Local CLI work may need CLI setup; a client without local execution needs a supported project connection for live operations. MCP is optional, not a prerequisite for all skills.
- **Local deliverable:** migrations, repo configuration, and application code retain their local development workflow. Remote execution cannot substitute for a versioned migration or create the requested local artifacts.
- **Confirmed legacy MCP:** direct the user to the [current DatoCMS MCP setup](https://www.datocms.com/docs/mcp-server). Do not execute, repair, reinstall, or change the legacy integration. Authentication or connection failure alone is not evidence of legacy software.

After choosing:

| Route or deliverable | Load only as needed |
| - | - |
| Current MCP | `references/mcp.md`; the exposed tools supply their current runtime contract. |
| CLI single calls or endpoint documentation | `../datocms-cli/references/direct-cma-calls.md`. |
| CLI loops, pagination, or dependent calls | `../datocms-cli/references/cma-script.md` for stdin/file mode and runtime globals. |
| Missing prerequisites for selected CLI work | **datocms-cli** setup workflow. Always confirm the target project before linking; an inferred single candidate is not consent. |
| Code constructing its own client (app/server, CI, cron, shared unattended script) | `references/client-setup-and-errors.md` for package choice, token/environment configuration, and error handling. |

Use the selected tool's current documentation for method signatures, payloads, authentication, project/environment selection, and execution requirements. CLI documentation hints in shared references apply only to CLI work. MCP tasks must not acquire a CLI prerequisite through a linked reference.

## 2. Establish scope and schema approach

Reuse the known project and environment. Resolve only missing information; ask when the target or requested operation is ambiguous. Choosing another tool does not authorize more actions, a different environment, or publication. Schema mutations require schema-edit permission (`can_edit_schema`); explicitly confirm direct schema changes against primary before execution.

Inspect the relevant models, fields, validators, and current record values before schema-dependent mutations. In CLI mode, use targeted `schema:inspect` guidance in `../datocms-cli/references/schema-inspect.md`; in MCP mode use the exposed schema tools. Don't retrieve the whole project for a narrow edit.

| Task | Approach |
| - | - |
| Destructive schema change: drop fields/models, lossy field-type changes, or `bulk_destroy` records | **datocms-cli** migration against a forked sandbox first. Never execute against primary without explicit, repeated user confirmation. |
| Reversible schema change: add/rename fields or models, change validators, reorder fieldsets | Ask whether the user wants a reviewable migration or direct sandbox mutation unless already decided. Prefer migrations when the repo uses them; direct mutation is valid for quick sandbox iteration. |
| Explicit one-off or migration opt-out | Honor direct mutation unless the change is destructive. Do not repeatedly suggest migrations. |
| Content operation: publish/unpublish, individual record deletion, field edits, bulk value updates, upload metadata | Use the selected route; no migration needed. Preserve the authorized records, fields, locales, and publication state. |
| Change requested as versioned and replayable across environments | Use **datocms-cli** migration guidance and local artifacts. |

Load sibling guidance yourself when available; do not bounce the user between skills. If a local deliverable cannot be produced here, explain the missing local capability rather than silently replacing it with a remote mutation.

## 3. Load only the relevant workflow

Method documentation supplies API shapes; these references supply DatoCMS editing workflows and gotchas. Consult current method details only for the operation being built. If the selected tool already returned the relevant guidance, reuse it instead of loading a duplicate. Do not preload every reference or reread unchanged references on follow-ups.

| Task | Reference |
| - | - |
| Record lifecycle, publication, references | `references/records.md` |
| Uploads and asset metadata | `references/uploads.md` |
| Direct schema changes | `references/schema.md` |
| Filtering, querying, collection pagination | `references/filtering-and-pagination.md` |
| Localized fields and locale backfills | `references/localization.md` |
| Modular Content, Single Block, Structured Text, block traversal | `references/editing-records.md` |
| Environment operations | `references/environments.md` |
| Roles, tokens, collaborators | `references/access-control.md` |
| Requested migration scripts | `references/migration-patterns.md` plus **datocms-cli** migration guidance |
| Local generated CMA types | `references/type-generation.md` |
| Raw methods, advanced client behavior, platform limits | `references/client-types-and-behaviors.md` |
| Project settings, maintenance mode, subscription limits, usage | `references/project-settings-and-usage.md` |
| Webhooks/build triggers, scheduling/workflows, menus, plugins, saved filters, upload tracks/tags, audit logs/async jobs/search | Matching section of `references/resource-gotchas.md` |

Combine references only when the task spans their subjects: for example, a localized Structured Text edit needs localization and editing guidance. Don't load migration or type-generation guidance merely because a content operation uses a script.

## 4. Build the operation

- Use the selected runtime's authenticated client, helper availability, and script form. Do not transplant CLI globals, imports, or file-mode conventions into another runtime. For client construction, read credentials from environment variables, never chat or hardcoded strings; use the least privileges needed and explicitly target the sandbox when applicable.
- Prefer the simplified API. Use raw methods only when the task needs JSON:API payloads or relationship metadata. Use `listPagedIterator()` with `for await...of` for complete collection traversal when available.
- Inspect then mutate current values in the same script for complex edits. Fetch nested blocks when needed and use typed block helpers. Preserve unrelated fields, locales, blocks, links, and upload metadata; avoid reconstructing whole records from partial reads.
- For Structured Text, follow the editing reference's text round-trip, typed node/block mutation, then root-append order. Preserve existing block identities and references unless replacement is requested.
- Use precise project types on record calls and helpers. Prefer inference and type guards; never use `any`, `unknown`, or casts that hide a mismatch. Supplied project types need no local generation step. Only local code that needs its own type module follows type-generation guidance.
- Handle API errors at the operation boundary using the selected runtime's facilities. Report authentication and permission failures accurately; do not bypass them through another route. A timeout or missing write response has an uncertain outcome: inspect resulting state before any retry, and never silently replay that write through another tool.

## 5. Verify and report

Verify against the same project, environment, and authorized scope. Check the changed values and preservation of unrelated content, locale values, links, and publication state. Publishing is a separate operation and requires authorization. For scripts, validate applicable types, imports/helpers, pagination, and error handling against the chosen runtime contract.

Report what was actually executed and verified, including partial or uncertain outcomes. For local code deliverables, distinguish validation from live execution. Missing local CLI setup is relevant only when that deliverable or selected route needs it.

## Other tasks

Use **datocms-cli** for CLI configuration, migrations, schema generation, CLI environment workflows, onboarding imports, plugin management, multi-project sync, and CI/CD. Use **datocms-cda** for GraphQL content reads, **datocms-frontend-integrations** for framework code, **datocms-plugin** for plugin development, and **datocms-content-modeling** for modeling decisions without implementation.
