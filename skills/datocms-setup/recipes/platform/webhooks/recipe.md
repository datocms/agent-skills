_Internal recipe for `datocms-setup`. Use this file only after the parent skill selects the `webhooks` recipe and queues any prerequisites from `../../../references/recipe-manifest.json`._


# DatoCMS Webhooks Setup

You are an expert at setting up lean, repeatable DatoCMS webhook management.
This recipe adds a declarative webhook config, a sync helper, and, when the repo
supports it, one minimal authenticated receiver endpoint.

See `../../../patterns/OUTPUT_STATUS.md` for output status definitions.

Follow these steps in order. Do not skip steps.

---

## Step 1: Detect Context (silent)

Silently examine the project:

Follow the shared repo inspection conventions in `../../../references/repo-conventions.md`, then inspect the recipe-specific signals below.

1. **Node project** — Confirm `package.json` exists
2. **Framework and file layout** — use `../../../references/repo-conventions.md` for supported framework detection and `src/` usage when a local receiver is in scope.
3. **CMA client package** — Check for `@datocms/cma-client`,
   `@datocms/cma-client-node`, or `@datocms/cma-client-browser`
4. **Existing webhook setup**
   - `scripts/datocms-webhooks.config.mjs`
   - `scripts/datocms-sync-webhooks.mjs`
   - `package.json` script `datocms:webhooks:sync`
5. **Existing receiver endpoint**
   - Next.js: `src/app/api/datocms/webhook/route.ts` or
     `app/api/datocms/webhook/route.ts`
   - Nuxt: `server/api/datocms/webhook.post.ts`
   - SvelteKit: `src/routes/api/datocms/webhook/+server.ts`
   - Astro: `src/pages/api/datocms/webhook.ts`
6. **Public frontend URL** — Inspect env files or existing project config for a
   usable site URL
7. **Existing Dato config** — Inspect env files for a CMA-capable
   `DATOCMS_API_TOKEN`

### Stop conditions

- If `package.json` is missing, stop and explain that this setup expects a Node
  project so it can add the local sync helper.
- If an existing webhook-management setup is materially different, inspect it
  first and patch it in place by default instead of replacing it wholesale.
- If no supported framework is detected, continue with the CMA-side webhook
  setup only and explicitly say receiver scaffolding is out of scope for this
  repo.

---

## Step 2: Ask Questions

Infer first from the repo.

Follow the zero-question default and question-format rules in `../../../patterns/MANDATORY_RULES.md`.

Only ask one explicit question if no `scripts/datocms-webhooks.config.mjs` exists yet.

In that case, ask:

> "Which starter webhook template should I scaffold: content events, schema or admin events, or build or deploy events? Recommended default: content events for a new baseline setup. If you skip, I'll scaffold content events and mark any receiver-specific behavior as `scaffolded` until real values or handlers are filled in."

---

## Step 3: Load References

Read only these references:

- `../../../../datocms-cma/references/client-types-and-behaviors.md`
- `../../../../datocms-cma/references/resource-gotchas.md` (§ Webhooks)
- `../../../../datocms-cma/references/access-control.md`

If a supported framework is present and a local receiver should be scaffolded,
also load the matching framework reference:

| Framework | Reference file |
|---|---|
| Next.js | `../../../../datocms-frontend-integrations/references/nextjs.md` |
| Nuxt | `../../../../datocms-frontend-integrations/references/nuxt.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/sveltekit.md` |
| Astro | `../../../../datocms-frontend-integrations/references/astro.md` |

Also inspect this bundled asset only when generating files:

- `scripts/datocms-sync-webhooks.mjs`

---

## Step 4: Generate Code

Generate the declarative webhook config, the sync helper, and the optional local
receiver.

### Required project changes

1. **Install a CMA client package** if the project does not already have one
2. **Patch `.env.example`** with:
   - `DATOCMS_API_TOKEN`
   - one shared webhook secret placeholder using framework conventions when a
     local receiver is scaffolded
   - `SITE_URL` only if the repo does not already expose a usable public URL
3. **Create or patch `scripts/datocms-webhooks.config.mjs`**
4. **Create or patch `scripts/datocms-sync-webhooks.mjs`** from
   `scripts/datocms-sync-webhooks.mjs`
5. **Patch `package.json`** with `datocms:webhooks:sync`
6. **When a supported framework is present and the generated config points to a
   site-local receiver**, scaffold one minimal authenticated endpoint at:
   - Next.js: `src/app/api/datocms/webhook/route.ts` or
     `app/api/datocms/webhook/route.ts`
   - Nuxt: `server/api/datocms/webhook.post.ts`
   - SvelteKit: `src/routes/api/datocms/webhook/+server.ts`
   - Astro: `src/pages/api/datocms/webhook.ts`

### Shared secret env conventions

- Next.js: `DATOCMS_WEBHOOK_SECRET`
- Nuxt: `NUXT_DATOCMS_WEBHOOK_SECRET`
- SvelteKit: `PRIVATE_DATOCMS_WEBHOOK_SECRET`
- Astro: `DATOCMS_WEBHOOK_SECRET`

### Config contract

`scripts/datocms-webhooks.config.mjs` must be the declarative source of truth.
Export either:

- a default array of webhook definitions, or
- a default object with `webhooks: [...]`

Each webhook definition should use the CMA field names directly:

```js
export default [
  {
    name: 'Local content events receiver',
    url: new URL('/api/datocms/webhook', process.env.SITE_URL ?? 'http://localhost:3000').toString(),
    headers: {
      Authorization: `Bearer ${process.env.DATOCMS_WEBHOOK_SECRET ?? ''}`,
    },
    events: [
      {
        entity_type: 'item',
        event_types: ['create', 'update', 'delete', 'publish', 'unpublish'],
      },
    ],
    custom_payload: null,
    http_basic_user: null,
    http_basic_password: null,
    enabled: true,
    payload_api_version: '3',
    nested_items_in_payload: false,
    auto_retry: true,
  },
];
```

### Starter templates

Use one starter webhook definition when no config exists yet:

- `content events`
  - one local receiver webhook for `item` events:
    `create`, `update`, `delete`, `publish`, `unpublish`
- `schema/admin events`
  - one webhook for `item_type`, `environment`, and `maintenance_mode` changes
- `build/deploy events`
  - one webhook for `build_trigger` events:
    `deploy_started`, `deploy_succeeded`, `deploy_failed`

### Mandatory rules

- The sync helper must create or update webhooks by name only
- The sync helper must never delete unrelated webhooks
- Preserve `payload_api_version: "3"`
- Default `custom_payload` to `null`
- Default `auto_retry` to `true`
- Use Node built-ins only in the helper script
- Keep the helper compatible with any installed CMA client package by resolving
  `@datocms/cma-client`, `@datocms/cma-client-node`, or
  `@datocms/cma-client-browser`
- The generated receiver must:
  - validate the shared secret
  - parse the JSON body
  - return quickly
  - expose a clearly marked project-specific handler stub
- Do not generate cache invalidation, preview routing, queueing logic, or other
  project-specific business logic in this skill

### Output status

- Report `scaffolded` if `SITE_URL`, the webhook secret, or any receiver stub
  behavior still uses placeholders
- Report `production-ready` only when the webhook definitions use real values
  and any generated local receiver has intentional project-specific handling

---

## Step 5: Next Steps

After generating the files, tell the user:

1. Which webhook template was scaffolded or updated
2. Which env vars still need real values, if any
3. How to run `datocms:webhooks:sync`
4. Whether any generated local receiver is still a generic stub
5. Whether the result is still `scaffolded`

Follow the shared final handoff rules in `../../../patterns/OUTPUT_STATUS.md`, including an explicit `Unresolved placeholders` section.

---

## Verification Checklist

Before presenting the result, verify:

1. `scripts/datocms-webhooks.config.mjs` exists
2. `scripts/datocms-sync-webhooks.mjs` exists
3. `package.json` contains `datocms:webhooks:sync`
4. The sync helper creates or updates webhooks by name and never deletes
   unrelated ones
5. The sync helper preserves `payload_api_version: "3"` and defaults
   `custom_payload` / `auto_retry` correctly
6. Local receiver scaffolding is limited to Next.js App Router, Nuxt,
   SvelteKit, or Astro
7. Generated receivers validate the shared secret, parse JSON, and return
   quickly
8. The skill does not generate cache invalidation, preview, or queueing logic
9. The result is `scaffolded` unless real values and intentional receiver logic
   are already present
