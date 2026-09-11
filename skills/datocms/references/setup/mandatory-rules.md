# Setup rules

These rules apply only to selected setup recipes. Shared task-scope, credential, and inspection rules are in [the skill entrypoint](../../SKILL.md).

## TypeScript and existing files

Use type guards and correct types instead of `as unknown as` or assertions that silence errors. Prefer type-only imports and inference. Follow [CLI script rules](../cli/cma-script.md) for CLI source validation.

Read files before changing them. Preserve working imports, exports, layout, and existing owners. Patch in place; discuss a replacement only when it is required by the requested outcome or explicitly requested.

## Inspection and dependencies

Start with [repo conventions](repo-conventions.md). Identify framework/runtime, `src/` layout, package manager, env files, and existing helpers/endpoints before creating anything.

Use the existing package manager. If there is no established runner, infer from `pnpm-lock.yaml`, `yarn.lock`, or `bun.lock`/`bun.lockb`; otherwise use npm. Install only packages required by the selected implementation. Runtime dependencies belong in dependencies; CLI-only packages can be devDependencies.

## Environment variables

| Framework | Public prefix | Server-only convention | Default file |
| - | - | - | - |
| Next.js | `NEXT_PUBLIC_` | No public prefix | `.env.local` |
| Nuxt | `NUXT_PUBLIC_` | `NUXT_` runtime config | `.env` |
| SvelteKit | `PUBLIC_` | No public prefix | `.env` |
| Astro | `PUBLIC_` | No public prefix | `.env` |

Preserve existing naming. Document required variables with placeholders in `.env.example`; populate actual env files only with available authorized values. Never commit real tokens or expose server credentials through public prefixes.

## Questions and authorization

Infer from the repo and the conversation first. Proceed without questions when the requested outcome and target are clear. Ask only for unresolved decisions that change correctness or impact: model-to-route mappings, conflicting owners, unavailable credentials, importer tolerance, or deployment/profile choices.

Ask a short focused question using the host's available interaction mechanism. Optional preferences can use a stated conservative default; unanswered authorization or required target selection cannot. Do not ask again for choices or actions already authorized.

For migrations, imports, and production-sensitive platform operations, use [schema-change and target rules](../cli/schema-changes.md) plus the selected operational reference. Present a concrete proposal before requesting any missing authorization.

## Project link or create

On first-time setup, establish whether the user has a project or wants a new one. An empty directory alone does not select either option; reuse explicit instructions, otherwise ask.

For an existing project, create only the local foundation needed for the requested lane, then use the `cli-bootstrap` recipe and [CLI setup](../cli/cli-setup.md).

For a new project, direct the user to <https://dashboard.datocms.com/> and wait until it exists. Resolve model design with [modeling](../modeling.md) before frontend queries depend on it; link the selected project through CLI bootstrap. Neither existing nor new is a default when intent is unknown.

## Agent-side project operations

Use the CLI for project discovery, linking, schema inspection, CMA scripts, and migrations. Authentication and project selection have one authority in [CLI setup](../cli/cli-setup.md). Only interactive login needs the user's browser; do not replace the workflow with DatoCMS MCP calls. Plugin iframe runtime code follows the [plugin guide](../plugin.md) instead.
