# Environments

Covers sandbox environment management: forking, promoting, deleting.

> In CLI mode, endpoint shapes / payloads / TS signatures: `npx datocms cma:docs environments <action>` (add `--expand-types '*'` for full TS definitions). Only what docs don't carry below.

## Mental model

Every project has one **primary** environment (production) and zero or more **sandboxes**. A sandbox is a fork — full copy of schema and content, isolated. Schema/content edits flow primary → sandbox → primary via `fork` then `promote`. Identify primary in a list with `env.meta.primary === true`.

## Fork is asynchronous

Include planned sandboxes in the per-project batch check for [included allowances and paid extras](project-settings-and-usage.md#included-allowances-and-paid-extras), reusing current verified information and cost authorization. Being below the hard environment limit does not establish that the addition is included in the plan.

`client.environments.fork(sourceId, { id })` kicks off a background job. By default the simplified client polls until the job finishes and returns the new `Environment` — convenient but blocking, sometimes minutes for large projects.

- `immediate_return: true` returns immediately with `meta.status: "creating"` and a `meta.fork_completion_percentage`. Use this when scripting and you want to poll on your own schedule, or when the fork is long enough that holding an HTTP connection open is brittle.
- `fast: true` is faster but **puts the source environment into read-only mode** for the duration. CMS users will see write errors. Don't enable in interactive hours without warning.
- `force: true` is needed alongside `fast: true` if collaborators are actively editing — without it the fork refuses to start.

`destroy()` is also async and irreversible; it nukes schema and content.

## Promote semantics

`client.environments.promote(sandboxId)` swaps roles: the sandbox becomes primary, the old primary is demoted to a sandbox (it is **not deleted** — you keep it as a rollback target until you destroy it).

API tokens are bound to the **role of "primary"**, not to a specific environment id — so after promotion, every token previously hitting the old primary now resolves to the promoted environment. This is the point of the workflow but it surprises people who expect tokens to follow the old environment id.

## Environment-aware client

Select the environment through the chosen execution mode. When constructing your own client, pass `environment` to `buildClient`:

```ts
const sandboxClient = buildClient({
  apiToken: process.env.DATOCMS_API_TOKEN!,
  environment: "my-sandbox",
});
```

This is preferable to passing the environment per-call, both because it's less error-prone and because the CMA SDK has no per-call environment override — the environment is fixed at client construction.

## Fork → migrate → promote (CI/CD)

Canonical deployment pattern for schema/data migrations:

1. Build a primary-environment client and activate maintenance mode **before** forking. This freezes primary writes so subsequent edits cannot be lost at promotion. Coordinate the release window and preserve any maintenance state already owned by another operation.
2. Fork primary into a fresh, uniquely-named sandbox (e.g. `migration-${Date.now()}`). Build a sandbox-scoped client (`environment: sandboxId`) and apply schema mutations / data backfills against it. Verify the sandbox while primary remains frozen.
3. Use the original primary client to call `promote(sandboxId)` before unfreezing primary. The sandbox becomes primary; the old primary remains as a sandbox (clean it up later, or keep one or two as rollbacks).
4. Use `finally` to deactivate maintenance enabled by this release, including when a migration, verification, or promotion fails.

A fork created while primary stays writable is a rehearsal, not a later promotion candidate: promotion does not merge edits made since the fork. After reviewing it, start the release from a fresh fork under maintenance. Do not hold maintenance open for an indefinite review; unlock and repeat the release from a fresh fork when ready.

If a step fails before promotion, primary content is unchanged; release maintenance and keep or destroy the failed sandbox as appropriate. CLI implementations of the same sequence: [deployment workflow](../../datocms-cli/references/deployment-workflow.md#safe-deployment-sequence).
