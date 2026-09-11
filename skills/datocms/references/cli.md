# CLI and migrations

Use `datocms` for project discovery/linking, schema inspection, migrations, environments, imports, and direct CMA commands. Keep an established package runner; otherwise use `npx datocms`.

## Choose the command workflow

For live project work, read [CLI setup](cli/cli-setup.md) for installation, OAuth, project selection, profiles, and credential resolution. Reuse an existing linked context. Advisory questions do not require installing or linking a project.

Inspect the real schema with [schema inspection](cli/schema-inspect.md) before choosing model/field IDs or writing mutations. Use `schema:inspect` instead of manually composing model and field-list calls.

| Task | Read |
| - | - |
| Choose migration vs direct schema mutation | [Schema changes](cli/schema-changes.md) |
| Scaffold or autogenerate migrations | [Creating migrations](cli/creating-migrations.md) |
| Run migrations, preview, fork-and-run | [Running migrations](cli/running-migrations.md) |
| Generate project types | [Schema generation](cli/schema-generate.md) |
| Inspect models, blocks, validators, relationships | [Schema inspection](cli/schema-inspect.md) |
| Discover endpoint shapes or make one CMA call | [Direct CMA calls](cli/direct-cma-calls.md) |
| Loops, branching, typed one-off scripts | [CMA scripting](cli/cma-script.md) |
| Fork, promote, rename, destroy environments | [Environment commands](cli/environment-commands.md) |
| Maintenance mode, release sequence, CI/CD | [Deployment workflow](cli/deployment-workflow.md) |
| Multiple projects and shared migration history | [Blueprint sync](cli/blueprint-sync.md) |
| WordPress or Contentful import | [Importing content](cli/importing-content.md) |
| CLI extension discovery/install/removal | [CLI plugin management](cli/cli-plugin-management.md) |

Read creating and running references together when the task includes both. Deployment may also need environment commands; multi-project rollout may need running-migrations guidance. Creating a complete workflow uses [setup](setup.md).

## Command and code ownership

- [Direct CMA calls](cli/direct-cma-calls.md) owns `cma:docs` flags and positional `cma:call` syntax. Look up the requested method before supplying payloads.
- [CMA scripting](cli/cma-script.md) owns stdin/file modes, validation, imports, stdout, and timeouts. Use file mode for long one-offs, local helpers, or rerunning by filename.
- [CMA](cma.md) owns content/payload patterns inside commands or migration bodies, including records, uploads, localization, and blocks.
- Use `migrations:new` to scaffold migration files and preserve the documented signature/import path. Do not hand-name a migration or put throwaway scripts in the migration directory.
- Preserve explicit source/destination environments. Preview migration changes with `--dry-run`; prefer fork-and-run for production changes. `--force` requires the user's intended override.
- CLI plugins are extensions of the command-line tool. Dashboard plugin development uses [plugin](plugin.md).
- `schema:generate` owns the generated artifact; [CMA type generation](cma/type-generation.md) explains consuming it. Narrow output and environment scope to the request.

## Verify

Check the active authentication path, linked project/profile, command arguments and payload shape, intended environment, migration directory and TypeScript configuration, and whether requested production-sensitive actions are authorized. Check source structure in both `cma:script` modes; file mode additionally needs the project's TypeScript check when appropriate.

Use [CDA](cda.md) for GraphQL reads and [frontend](frontend.md) for framework integration. Do not turn a single content operation into a migration/setup workflow unless it must be committed and replayed.
