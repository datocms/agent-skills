# Choosing a schema-change workflow

Use this decision once, whether the task started with CLI, CMA, modeling, or setup. Reuse the user's stated approach and target; ask only for unresolved decisions.

| Situation | Approach |
| - | - |
| Destructive schema change: drop a field/model or change its type with value loss | Use a migration against a forked sandbox first. Applying it to primary requires explicit authorization for that target and impact. |
| Reversible schema change: add/rename a model or field, change validators, reorder fieldsets | Preserve the user's preference. Prefer migrations where the repo already versions/replays schema changes; direct mutation is suitable for requested sandbox iteration. Ask about migration vs direct mutation when neither intent nor repo conventions settles it. |
| Explicit one-off or opt-out of migrations | Use `cma:call` for one method or `cma:script` for dependent steps. Do not reintroduce migrations unless the change is destructive. |
| Content operation: publish/unpublish, individual record deletion, fix slugs, retag uploads, bulk field updates | No migration is required. Use the direct CMA workflow, with confirmation for unresolved destructive scope. |
| Change must be committed and replayed across environments | Scaffold a migration with `migrations:new`. |
| Long-lived app, CI, webhook, or scheduled automation | Use checked-in client code through the [CMA guide](../cma.md). |

For migrations, read [creating migrations](creating-migrations.md) and [running migrations](running-migrations.md); the [CMA schema reference](../cma/schema.md) covers payload mechanics. For direct operations, read [direct CMA calls](direct-cma-calls.md) or [CMA scripting](cma-script.md).

## Target and impact

Resolve the project and environment before a write. Review the concrete change before requesting any missing authorization. Do not ask again when the user's existing instructions already authorize that exact action and target.

Production-sensitive operations include environment promote/destroy, imports into a non-disposable target, `migrations:run --in-place` on primary, `maintenance:on --force`, `environments:fork --fast --force`, destructive/bulk-destroy CMA calls, and direct schema mutation on primary. `plugins:reset` removes installed/linked CLI plugins. Confirm any unresolved target, impact, or force override before execution.

Prefer fork-and-run for production migrations, specify `--source`, and preview with `--dry-run`. Treat `--force` as an intentional override, not a default. An explanation or proposed command does not authorize execution.
