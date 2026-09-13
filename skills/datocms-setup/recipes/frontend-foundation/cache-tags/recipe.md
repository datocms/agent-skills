_Internal recipe for `datocms-setup`. Use this file only after the parent skill selects the `cache-tags` recipe and queues any prerequisites from `../../../references/recipe-manifest.json`._

# DatoCMS Cache Tags Setup

You are an expert at setting up DatoCMS cache tag invalidation. This recipe generates the files needed for granular cache invalidation — only pages affected by a content change are purged, instead of revalidating all DatoCMS content on every change.

Two approaches:

- **Next.js:** `rawExecuteQuery` with `queryId` → store tags in DB → `revalidateTag()` on webhook
- **Nuxt / SvelteKit / Astro:** `rawExecuteQuery` → CDN response headers → webhook calls CDN purge API

See `../../../patterns/OUTPUT_STATUS.md` for output status definitions.

For provider header formats, see the [CDA cache-tag table](../../../../datocms-cda/references/draft-caching-environments.md#architectural-patterns).

## Contents

- Step 1: Detect Context (silent)
- Step 2: Ask Questions
- Step 3: Load References
- Step 4: Generate Code
- Step 5: Install Dependencies
- Step 6: Environment Variables
- Step 7: Next Steps
- Verification Checklist

## Step 1: Detect Context (silent)

Follow `../../../references/repo-conventions.md`, then inspect:

1. **Framework and file layout** — use `../../../references/repo-conventions.md`
2. **Prerequisite: executeQuery wrapper** — search for existing `executeQuery` wrapping `@datocms/cda-client`. If missing, record `cda-client` as prerequisite and continue after wrapper is applied.
3. **Existing cache tag setup** — check for:

   - Next.js: `executeQuery` using `rawExecuteQuery` with `queryId`, or `cache-tags-db` module
   - Nuxt: `useQueryWithCacheTags` or `fetchWithCacheTags`
   - SvelteKit: `performQueryWithCacheTags`
   - Astro: `executeQueryWithCacheTags`
   - Any framework: webhook handler for cache invalidation

   If configured, inspect and update in place. Only ask for replacement if incompatible or user requests rewrite.
4. **Astro SSR requirement** — check `astro.config.mjs` for `output: 'server'` or `'hybrid'`. Cache tags require SSR. Warn if `'static'` or not set.
5. **Installed deps** — check `package.json` for `@datocms/cda-client`

**Stop conditions:**

- No `executeQuery` wrapper → record `cda-client` as prerequisite
- Cache tags already configured → inspect and update in place

## Step 2: Ask Questions

Infer from repo first. Follow `../../../patterns/MANDATORY_RULES.md`. Ask zero questions only when hosting choice is obvious.

**Next.js:** No clear cache-tag database signal:

> "Which cache-tag storage should I scaffold for this Next.js app: Turso, Vercel Postgres, or a placeholder adapter? Recommended default: preserve the strongest existing repo signal; otherwise use a placeholder adapter and mark the result `scaffolded`. If you skip, I'll follow that default."

**Nuxt / SvelteKit / Astro:** No clear CDN target:

> "Which CDN should I target for cache-tag purging: Netlify or Cloudflare, Fastly, Bunny, or a placeholder adapter? Recommended default: preserve the strongest existing hosting signal; otherwise leave an explicit unconfigured adapter and mark the result `scaffolded`. If you skip, I'll follow that default."

This determines both the response-header name and the webhook handler's purge pattern.

## Step 3: Load References

**Always load:**

- `../../../../datocms-cda/references/draft-caching-environments.md`

**Manual CDN integrations only:** also load `../../../../datocms-frontend-integrations/references/cache-tag-adapters.md` for response collection and the purge adapter contract. Skip it for Next.js query-ID mappings.

**Load per framework (`## Cache Tags (Optional)` section):**

| Framework | Reference file |
| - | - |
| Next.js | `../../../../datocms-frontend-integrations/references/nextjs.md` |
| Nuxt | `../../../../datocms-frontend-integrations/references/nuxt.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/sveltekit.md` |
| Astro | `../../../../datocms-frontend-integrations/references/astro.md` |

## Step 4: Generate Code

Generate framework-specific cache tag invalidation files following the patterns in the loaded references.

### Next.js (App Router)

Follow the selected Next.js reference's **Cache Tags (Optional)** section. Extend the existing query wrapper, database mapping, and authenticated webhook in place:

- Published queries with a `queryId` request CDA tags and store their mapping; published queries without one retain the global-tag fallback. Preserve the existing published cache policy.
- Draft queries use `no-store`, do not request purge tags, and never replace published mappings. Preserve routes that inspect draft cookies; do not force them static.
- Use the chosen database's `storeTags` / `findQueryIdsForTags` implementation. The webhook resolves affected query IDs and revalidates them plus the global tag; mapping or revalidation failures must propagate.

### Manual CDN integrations: Nuxt, SvelteKit, and Astro

Use the [shared adapters](../../../../datocms-frontend-integrations/references/cache-tag-adapters.md) with the selected framework's cache section. Extend its server query wrapper and authenticated invalidation endpoint, preserving the framework's token and environment handling.

- Nuxt: use the request event in a server utility and finalize headers at the response boundary.
- SvelteKit: share the collector through the request when layouts and pages fetch independently, then set response headers once.
- Astro: collect page and nested-component dependencies before committing headers; retain the current SSR adapter and rendering configuration.

Collect all contributing queries per response, apply the actual provider's format, and bypass shared caches for drafts before lookup. Implement a concrete purge adapter with the selected provider's batch limits, bounded retries, and error propagation. Follow the shared reference for response limits and deployment invalidation; keep unconfigured adapters explicitly `scaffolded`.

### Mandatory rules for all generated code

**Security:**

- Secrets from env vars only
- Validate webhook secret
- Return 401 for invalid secrets

**TypeScript:** Follow `../../../patterns/MANDATORY_RULES.md`

**Env var naming:** Follow `../../../patterns/MANDATORY_RULES.md`

Recipe-specific names:

- Next.js: `CACHE_INVALIDATION_WEBHOOK_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- Nuxt: `NUXT_CACHE_INVALIDATION_WEBHOOK_SECRET`, `NUXT_FASTLY_SERVICE_ID`
- SvelteKit: `PRIVATE_CACHE_INVALIDATION_WEBHOOK_SECRET`, `PRIVATE_FASTLY_SERVICE_ID`
- Astro: `CACHE_INVALIDATION_WEBHOOK_SECRET`, `FASTLY_SERVICE_ID`

**File conflicts:** Follow `../../../patterns/MANDATORY_RULES.md`

**Output status:**

- `scaffolded` if database is `Other`, CDN is `Other`, or placeholder adapter logic remains
- `production-ready` only when concrete database/CDN strategy and no placeholder logic

## Step 5: Install Dependencies

| Package | When |
| - | - |
| `@libsql/client` | Next.js with Turso |
| `@vercel/postgres` | Next.js with Vercel Postgres |

Nuxt/SvelteKit/Astro: no additional deps — `rawExecuteQuery` from `@datocms/cda-client`.

Use project's package manager (see `../../../patterns/MANDATORY_RULES.md`).

## Step 6: Environment Variables

Add to `.env.example` (create if needed) and `.env.local` (or `.env`). Only add missing vars; preserve existing.

**Next.js:**

```
CACHE_INVALIDATION_WEBHOOK_SECRET=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

**Nuxt:**

```
NUXT_CACHE_INVALIDATION_WEBHOOK_SECRET=
# NUXT_FASTLY_SERVICE_ID=
# NUXT_FASTLY_KEY=
```

**SvelteKit:**

```
PRIVATE_CACHE_INVALIDATION_WEBHOOK_SECRET=
# PRIVATE_FASTLY_SERVICE_ID=
# PRIVATE_FASTLY_KEY=
```

**Astro:**

```
CACHE_INVALIDATION_WEBHOOK_SECRET=
# FASTLY_SERVICE_ID=
# FASTLY_KEY=
```

## Step 7: Next Steps

1. **Create webhook in DatoCMS** — Project Settings → Webhooks → Create:
   - **Name:** "Cache Tags Invalidation"
   - **Event type:** "Content Delivery API Cache Tags" → "Invalidate"
   - **URL:**
     - Next.js: `https://your-site.com/api/revalidate`
     - Nuxt/SvelteKit/Astro: `https://your-site.com/api/invalidate-cache`
   - **Secret token:** Must match `CACHE_INVALIDATION_WEBHOOK_SECRET` env var
   - **Payload:** `{ entity: { attributes: { tags: ["tag1", "tag2", ...] } } }`

2. **Usage example:** Show a published request and a draft request through the configured wrapper. For Next.js, demonstrate a stable `queryId` for the query, variables, environment, and published access scope. For manual CDN integrations, show the response-local collector finalized into the selected provider's headers.

3. **If `scaffolded`:** list exact missing database/CDN/purge-adapter work for production-ready.

4. **Testing:** Deploy site, make content change in DatoCMS, verify only affected pages purged (check CDN logs or response headers).

Follow `../../../patterns/OUTPUT_STATUS.md` for final handoff, including explicit `Unresolved placeholders` section.

## Verification Checklist

### Base scaffold checks

1. Check the selected framework's cache implementation and the shared frontend [Cache Tags checklist](../../../../datocms-frontend-integrations/references/verification-checklists.md#cache-tags).
2. Published queries request and consume CDA tags where the chosen strategy needs them; draft queries stay uncached and cannot overwrite published mappings.
3. Next.js: the wrapper owns `queryId`, database lookups feed `revalidateTag()`, and draft-aware routes remain able to inspect cookies.
4. Manual CDN integrations: response tags include all contributing queries, provider formatting is correct, and the configured adapter completes every purge batch or returns an error.
5. Webhook handlers validate the secret and payload; environment variables follow the selected framework reference.
6. Astro: request-time tagging uses SSR with the existing adapter; prerendered pages retain their rebuild strategy.

### Production-ready checks

1. Report `scaffolded` and list missing adapter work if placeholder remains
2. Report `production-ready` only when concrete database/CDN strategy and no placeholder logic
