_Internal recipe for `datocms-setup`. Use this file only after the parent skill selects the `cache-tags` recipe and queues any prerequisites from `../../../references/recipe-manifest.json`._

# DatoCMS Cache Tags Setup

You are an expert at setting up DatoCMS cache tag invalidation. This recipe generates the files needed for granular cache invalidation — only pages affected by a content change are purged, instead of revalidating all DatoCMS content on every change.

**Two approaches exist:**

- **Next.js (framework-centric):** Uses `rawExecuteQuery` with `queryId` to get cache tags, stores them in a database (Turso, Vercel Postgres, etc.), and calls `revalidateTag()` on webhook events.
- **Nuxt / SvelteKit / Astro (CDN-first):** Uses `rawExecuteQuery` to get cache tags, forwards them as CDN response headers, and a webhook handler calls the CDN's purge API.

See `../../../patterns/OUTPUT_STATUS.md` for output status definitions.

**CDN header names:**

| CDN | Response header |
| - | - |
| Netlify / Cloudflare | `Cache-Tag` |
| Fastly | `Surrogate-Key` |
| Bunny | `CDN-Tag` |

Follow these steps in order. Do not skip steps.

---

## Step 1: Detect Context (silent)

Silently examine the project:

Follow the shared repo inspection conventions in `../../../references/repo-conventions.md`, then inspect the recipe-specific signals below.

1. **Framework and file layout** — use `../../../references/repo-conventions.md` for supported framework detection, `src/` usage, and the standard helper or route locations used by this setup.

2. **Prerequisite: executeQuery wrapper** — Search for an existing `executeQuery` function that wraps `@datocms/cda-client`. This wrapper is the foundation for cache tags.

   If `executeQuery` does not exist, record `cda-client` as a prerequisite and continue after that shared wrapper foundation is applied.

3. **Existing cache tag setup** — Check for signs that cache tags are already configured:

   - Next.js: Check if `executeQuery` already uses `rawExecuteQuery` with `queryId`, or if a `cache-tags-db` module exists
   - Nuxt: Check if a `useQueryWithCacheTags` composable or `fetchWithCacheTags` server util exists
   - SvelteKit: Check if a `performQueryWithCacheTags` function exists
   - Astro: Check if an `executeQueryWithCacheTags` function exists
   - Any framework: Check if a webhook handler for cache invalidation exists

   If cache tags appear to be already configured, inspect the current implementation first and update it in place by default. Only ask about full replacement if the current implementation is materially incompatible or the user explicitly wants a rewrite.

4. **Astro SSR requirement** — If the framework is Astro, check `astro.config.mjs` (or `.ts`) for `output: 'server'` or `output: 'hybrid'`. Cache tags require SSR to set response headers. If the output mode is `'static'` or not set, warn the user that they need SSR mode for cache tags.

5. **Installed deps** — Check `package.json` for: `@datocms/cda-client`

### Stop conditions

- If the `executeQuery` wrapper does not exist, stop and record `cda-client` as a prerequisite and continue after it is applied.
- If cache tags are already configured, inspect the current implementation first and update it in place by default. Only ask about full replacement if the current implementation is materially incompatible or the user explicitly wants a rewrite.

---

## Step 2: Ask Questions

Infer first from the repo and follow the question-format rules in `../../../patterns/MANDATORY_RULES.md`. Ask zero questions only when the hosting choice is already obvious.

### Next.js

If the repo does not clearly indicate the cache-tag database, ask one question:

> "Which cache-tag storage should I scaffold for this Next.js app: Turso, Vercel Postgres, or a placeholder adapter? Recommended default: preserve the strongest existing repo signal; otherwise use a placeholder adapter and mark the result `scaffolded`. If you skip, I'll follow that default."

### Nuxt / SvelteKit / Astro

If the repo does not clearly indicate the CDN target, ask one question:

> "Which CDN should I target for cache-tag purging: Netlify or Cloudflare, Fastly, Bunny, or a placeholder adapter? Recommended default: preserve the strongest existing hosting signal; otherwise scaffold the generic `Cache-Tag` path and mark the result `scaffolded`. If you skip, I'll follow that default."

This determines both the response-header name and the webhook handler's purge pattern.

---

## Step 3: Load References

Read the relevant reference files. Load only what is needed.

**Always load:**

- `../../../../datocms-cda/references/draft-caching-environments.md` — for cache tags concepts, webhook payload format, and CDN header table

**Load per framework — focus on the `## Cache Tags (Optional)` section:**

| Framework | Reference file |
| - | - |
| Next.js | `../../../../datocms-frontend-integrations/references/nextjs.md` |
| Nuxt | `../../../../datocms-frontend-integrations/references/nuxt.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/sveltekit.md` |
| Astro | `../../../../datocms-frontend-integrations/references/astro.md` |

---

## Step 4: Generate Code

Generate framework-specific cache tag invalidation files following the patterns in the loaded references.

### Next.js (App Router)

1. **Update `executeQuery`** at `src/lib/datocms/executeQuery.ts` (or `lib/datocms/executeQuery.ts` if no `src/`) — Patch the existing Core version so it:
   - Uses `rawExecuteQuery` instead of `executeQuery` from `@datocms/cda-client`
   - Accepts an optional `queryId` option
   - When `queryId` is provided: sets `returnCacheTags: true`, reads the `x-cache-tags` response header, stores the mapping in the DB via `cacheTagsDb.storeTags()`, and tags the `fetch` with `[queryId]`
   - When `queryId` is omitted: falls back to the simple `cacheTag = 'datocms'` single-tag approach (backward compatible)
   - Wrapped in React `cache()` for deduplication
   - Uses `requestInitOptions: { cache: 'force-cache', next: { tags } }` for Next.js caching

2. **Create `cache-tags-db.ts`** in the same directory as `executeQuery` — Database abstraction with:
   - A `CacheTagsDb` interface: `storeTags(queryId, tags)` and `findQueryIdsForTags(tags)`
   - A `query_cache_tags(query_id TEXT, tag TEXT)` join table schema
   - Implementation for the chosen database (Turso with `@libsql/client`, Vercel Postgres with `@vercel/postgres`, or a scaffold-only placeholder interface)
   - Auto-creates the table on first use

3. **Create webhook handler** at `src/app/api/revalidate/route.ts` (or `app/api/revalidate/route.ts` if no `src/`):
   - Validates `Authorization: Bearer <CACHE_INVALIDATION_WEBHOOK_SECRET>`
   - Reads tags from `body?.entity?.attributes?.tags` (this is the DatoCMS webhook payload path)
   - Always calls `revalidateTag(cacheTag)` for the global `'datocms'` tag (for queries without `queryId`)
   - Looks up affected `queryId`s via `cacheTagsDb.findQueryIdsForTags(tags)`
   - Calls `revalidateTag(queryId)` for each affected query

### Nuxt

1. **Create `fetchWithCacheTags` server utility** at `server/middleware/cache-tags.ts` (or `server/utils/cache-tags.ts`) — A wrapper around `rawExecuteQuery` that:

   - Accepts the query and optional variables
   - Calls `rawExecuteQuery` with `returnCacheTags: true`
   - Reads the `x-cache-tags` response header
   - Returns `{ data, cacheTags }`
   - Uses `useRuntimeConfig().public.datocmsPublishedContentCdaToken` for the token

   Optionally also create a composable at `composables/useQueryWithCacheTags.ts` that wraps the server util for use in pages.

2. **Create usage pattern** — Show how to use `fetchWithCacheTags` in a server route or page, setting the CDN header via `setResponseHeader(event, 'Cache-Tag', cacheTags)` (or `Surrogate-Key` / `CDN-Tag` depending on CDN choice). For pages, show using `useRequestEvent()` to access the event.

3. **Create webhook handler** at `server/api/invalidate-cache.ts`:
   - Validates `Authorization: Bearer <cacheInvalidationWebhookSecret>` from `useRuntimeConfig()`
   - Reads tags from `body?.entity?.attributes?.tags`
   - Calls the CDN's purge API with those tags (with commented examples for Fastly, Netlify, Cloudflare, Bunny)

4. **Add runtime config** to `nuxt.config.ts` — Add `cacheInvalidationWebhookSecret` (and CDN-specific vars like `fastlyServiceId`, `fastlyKey`) to `runtimeConfig`:
   ```ts
   runtimeConfig: {
     cacheInvalidationWebhookSecret: '',
     // CDN-specific (uncomment for your CDN):
     // fastlyServiceId: '',
     // fastlyKey: '',
   }
   ```

### SvelteKit

1. **Create `performQueryWithCacheTags` function** at `src/lib/datocms/queries.ts` (or similar) — A wrapper around `rawExecuteQuery` that:
   - Accepts a `RequestEvent`, the query, and optional variables
   - Preserves draft-mode token switching if the existing wrapper already supports it; otherwise keeps the published-token flow
   - Calls `rawExecuteQuery` with `returnCacheTags: true`
   - Reads the `x-cache-tags` response header
   - Returns `{ data, cacheTags }`
   - Uses `$env/dynamic/private` for tokens

2. **Create usage pattern** — Show how to use `performQueryWithCacheTags` in a `+page.server.ts` load function, calling `event.setHeaders({ 'Cache-Tag': cacheTags })` (or `Surrogate-Key` / `CDN-Tag` depending on CDN choice)

3. **Create webhook handler** at `src/routes/api/invalidate-cache/+server.ts`:
   - Exports `POST` as a `RequestHandler`
   - Validates `Authorization: Bearer <PRIVATE_CACHE_INVALIDATION_WEBHOOK_SECRET>` from `$env/dynamic/private`
   - Reads tags from `body?.entity?.attributes?.tags`
   - Calls the CDN's purge API with those tags (with commented examples)

### Astro

1. **Create `executeQueryWithCacheTags` function** at `src/lib/datocms/executeQuery.ts` (alongside the existing `executeQuery`) — A wrapper around `rawExecuteQuery` that:
   - Accepts the query and optional `{ variables, includeDrafts }` options
   - Calls `rawExecuteQuery` with `returnCacheTags: true`
   - Reads the `x-cache-tags` response header
   - Returns `{ data, cacheTags }`
   - Imports tokens from `astro:env/server`

2. **Create usage pattern** — Show how to use `executeQueryWithCacheTags` in an `.astro` page (SSR mode), setting response headers via `Astro.response.headers.set('Cache-Tag', cacheTags)` (or `Surrogate-Key` / `CDN-Tag` depending on CDN choice)

3. **Create webhook handler** at `src/pages/api/invalidate-cache.ts`:
   - Exports `POST` as an `APIRoute`
   - Validates `Authorization: Bearer <CACHE_INVALIDATION_WEBHOOK_SECRET>` imported from `astro:env/server`
   - Reads tags from `body?.entity?.attributes?.tags`
   - Calls the CDN's purge API with those tags (with commented examples)

4. **Add env schema entries** in `astro.config.mjs` (or `.ts`) under `env.schema`:
   ```js
   CACHE_INVALIDATION_WEBHOOK_SECRET: envField.string({
     context: 'server',
     access: 'secret',
   }),
   // CDN-specific (uncomment for your CDN):
   // FASTLY_SERVICE_ID: envField.string({ context: 'server', access: 'secret' }),
   // FASTLY_KEY: envField.string({ context: 'server', access: 'secret' }),
   ```

### Mandatory rules for all generated code

#### Security

- All secrets come from environment variables — never hardcode them
- Validate the webhook secret on the invalidation endpoint
- Webhook handlers should return 401 for invalid secrets

#### TypeScript

Follow the TypeScript rules in `../../../patterns/MANDATORY_RULES.md`.

#### Env var naming conventions

Follow the env conventions in `../../../patterns/MANDATORY_RULES.md`.

Recipe-specific env var names:

- Next.js: `CACHE_INVALIDATION_WEBHOOK_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- Nuxt: `NUXT_CACHE_INVALIDATION_WEBHOOK_SECRET`, `NUXT_FASTLY_SERVICE_ID`
- SvelteKit: `PRIVATE_CACHE_INVALIDATION_WEBHOOK_SECRET`, `PRIVATE_FASTLY_SERVICE_ID`
- Astro: `CACHE_INVALIDATION_WEBHOOK_SECRET`, `FASTLY_SERVICE_ID`

#### File conflicts

Follow the file conflict rules in `../../../patterns/MANDATORY_RULES.md`.

#### Output status

- Report `scaffolded` if the database selection is still `Other`, the CDN choice is still `Other`, or any placeholder database/purge adapter logic remains
- Report `production-ready` only when the implementation uses a concrete supported database or CDN strategy and no placeholder adapter logic remains

---

## Step 5: Install Dependencies

Install missing packages:

| Package | When |
| - | - |
| `@libsql/client` | Next.js with Turso (if not already installed) |
| `@vercel/postgres` | Next.js with Vercel Postgres (if not already installed) |

For Nuxt, SvelteKit, and Astro: no additional dependencies — `rawExecuteQuery` is provided by `@datocms/cda-client` which should already be installed.

Use the project's package manager (see `../../../patterns/MANDATORY_RULES.md`).

---

## Step 6: Environment Variables

Add placeholder values to `.env.example` (create if it doesn't exist) and `.env.local` (or `.env` depending on framework convention). Only add variables that don't already exist. Preserve any existing values.

### Next.js

```
CACHE_INVALIDATION_WEBHOOK_SECRET=   # Shared secret to verify webhook requests
TURSO_DATABASE_URL=                  # Turso database URL (or replace with your DB)
TURSO_AUTH_TOKEN=                    # Turso auth token
```

### Nuxt

```
NUXT_CACHE_INVALIDATION_WEBHOOK_SECRET=   # Shared secret to verify webhook requests
# CDN-specific vars (uncomment for your CDN):
# NUXT_FASTLY_SERVICE_ID=                 # Fastly service ID
# NUXT_FASTLY_KEY=                        # Fastly API key
```

### SvelteKit

```
PRIVATE_CACHE_INVALIDATION_WEBHOOK_SECRET=   # Shared secret to verify webhook requests
# CDN-specific vars (uncomment for your CDN):
# PRIVATE_FASTLY_SERVICE_ID=                 # Fastly service ID
# PRIVATE_FASTLY_KEY=                        # Fastly API key
```

### Astro

```
CACHE_INVALIDATION_WEBHOOK_SECRET=   # Shared secret to verify webhook requests
# CDN-specific vars (uncomment for your CDN):
# FASTLY_SERVICE_ID=                 # Fastly service ID
# FASTLY_KEY=                        # Fastly API key
```

---

## Step 7: Next Steps

After generating all files, tell the user:

1. **Create the webhook in DatoCMS** — Go to Project Settings → Webhooks → Create a new webhook:
   - **Name:** "Cache Tags Invalidation" (or similar)
   - **Event type:** Select "Content Delivery API Cache Tags" → "Invalidate" event
   - **URL:** Point to their webhook endpoint:
     - Next.js: `https://your-site.com/api/revalidate`
     - Nuxt: `https://your-site.com/api/invalidate-cache`
     - SvelteKit: `https://your-site.com/api/invalidate-cache`
     - Astro: `https://your-site.com/api/invalidate-cache`
   - **Secret token:** Must match the `CACHE_INVALIDATION_WEBHOOK_SECRET` env var (with framework prefix if applicable)
   - **Payload:** The webhook sends `{ entity: { attributes: { tags: ["tag1", "tag2", ...] } } }`

2. **Usage example** — Show how to use the new function in a page:
   - Next.js: Use the modified `executeQuery` with a `queryId` option (e.g., `queryId: 'blog-post-${slug}'`). Mention adding `export const dynamic = 'force-static'` on pages using cache tags for optimal caching. The `queryId` should be stable and unique per query+variables combination.
   - Nuxt: Use `fetchWithCacheTags` in server routes and set the CDN header on the response via `setResponseHeader(event, 'Cache-Tag', cacheTags)`
   - SvelteKit: Use `performQueryWithCacheTags` in load functions and call `event.setHeaders({ 'Cache-Tag': cacheTags })`
   - Astro: Use `executeQueryWithCacheTags` in `.astro` pages and set `Astro.response.headers.set('Cache-Tag', cacheTags)`. Remind the user that SSR mode (`output: 'server'` or `output: 'hybrid'`) is required.

3. **If the result is `scaffolded`**: list the exact missing database, CDN, or purge-adapter work before the setup can be treated as production-ready.

4. **Testing** — Suggest the user:
   - Deploy the site to their hosting platform
   - Make a content change in DatoCMS
   - Verify that only affected pages are purged (check CDN logs or response headers)

Follow the shared final handoff rules in `../../../patterns/OUTPUT_STATUS.md`, including an explicit `Unresolved placeholders` section.

---

## Verification Checklist

Before presenting the final code, verify the correct output state.

### Base scaffold checks

1. The `executeQuery` wrapper (or new variant) uses `rawExecuteQuery` with `returnCacheTags: true` to access cache tags via the `x-cache-tags` response header
2. Next.js: `queryId` is passed to `rawExecuteQuery` and cache tags are stored in a database via `cacheTagsDb.storeTags()`
3. Next.js: Webhook handler calls `revalidateTag()` for both the global `'datocms'` tag and affected `queryId`s
4. Next.js: Pages using cache tags export `dynamic = 'force-static'`
5. Nuxt / SvelteKit / Astro: Cache tags are forwarded as CDN response headers using the correct header name (`Cache-Tag`, `Surrogate-Key`, or `CDN-Tag`)
6. Nuxt / SvelteKit / Astro: Webhook handler calls the CDN's purge API with the invalidated tags
7. All webhook handlers validate the secret via `Authorization: Bearer <secret>` header
8. All webhook handlers read tags from `body?.entity?.attributes?.tags` (the DatoCMS webhook payload path)
9. Nuxt: `cacheInvalidationWebhookSecret` is added to `runtimeConfig` in `nuxt.config.ts`
10. Astro: `CACHE_INVALIDATION_WEBHOOK_SECRET` is added to `env.schema` in `astro.config.mjs` using `envField.string()`
11. Astro: User is warned if output mode is not `'server'` or `'hybrid'` (SSR required for setting response headers)
12. All generated TypeScript follows the mandatory rules (no `as unknown as`, inferred types, `import type`)
13. Environment variables use the correct framework-specific names (`CACHE_INVALIDATION_WEBHOOK_SECRET`, `NUXT_CACHE_INVALIDATION_WEBHOOK_SECRET`, `PRIVATE_CACHE_INVALIDATION_WEBHOOK_SECRET`)

### Production-ready checks

1. Report `scaffolded` and list the missing adapter work if a placeholder database interface or purge function remains
2. Report `production-ready` only when a concrete database or CDN strategy is configured and no placeholder adapter logic remains
