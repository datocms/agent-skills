_Internal recipe for `datocms-setup`. Use this file only after the parent skill selects the `site-search` recipe and queues any prerequisites from `../../../references/recipe-manifest.json`._

# DatoCMS Site Search Setup

You are an expert at setting up DatoCMS Site Search. This recipe combines Dato project provisioning with local frontend wiring so the project ends up with a working search route, explicit search-index wiring, and a least-privilege token story.

See `../../../patterns/OUTPUT_STATUS.md` for output status definitions.

Follow these steps in order. Do not skip steps.

---

## Step 1: Detect Context (silent)

Silently examine the project:

Follow the shared repo inspection conventions in `../../../references/repo-conventions.md`, then inspect the recipe-specific signals below.

1. **Framework and UI stack** — use `../../../references/repo-conventions.md` for supported framework detection and then inspect whether `react-datocms`, `vue-datocms`, `@datocms/svelte`, or `@datocms/astro` are installed. If none of the supported frameworks match, infer whether the project is React-based, Vue-based, or another stack.
2. **CMA client packages** — Check for `@datocms/cma-client`, `@datocms/cma-client-node`, and `@datocms/cma-client-browser`
3. **Existing search UI** — Search for `/search` routes, `useSiteSearch`, `searchResults.rawList`, and existing search components
4. **Existing Dato helpers** — Search for a shared `executeQuery` wrapper, Dato lib folder, and existing env helpers
5. **Environment files** — Check `.env.example`, `.env`, `.env.local`, and framework-specific env conventions for:
   - a CMA-capable token
   - a public search token
   - a search index id
   - a public site URL
6. **Public route structure** — Inspect the repo for distinct top-level public sections such as `/blog`, `/docs`, or `/help`
7. **Existing search topology** — If the repo already has Site Search wiring, inspect whether it clearly uses one shared index or multiple indexes

### Stop conditions

- If the framework cannot be determined, ask the user which stack they are using.
- If the repo already has a materially different search integration, patch it in place by default instead of replacing it wholesale.

---

## Step 2: Ask Questions

Follow the zero-question default and question-format rules in `../../../patterns/MANDATORY_RULES.md`.

Only ask if one of these unresolved decisions remains after inspection:

1. **Index topology** — the repo clearly exposes multiple public sections and it is ambiguous whether they should stay under one shared search index or split into multiple indexes.

   Ask one question:

   > "This repo appears to expose multiple top-level public sections. Should Site Search use one shared search index or separate indexes per section? Recommended default: one shared search index unless you already need separate crawling boundaries or search experiences. If you skip, I'll keep or create one shared index and mark any additional topology assumptions under unresolved placeholders."

2. **Search-route ownership** — an existing `/search` route has conflicting ownership and patching it safely is unclear.

   Ask one question:

   > "This repo already has more than one possible `/search` owner. Which route or component should I patch? Recommended default: preserve the currently mounted public `/search` route. If you skip, I'll patch the strongest existing public owner and list the others under unresolved placeholders."

If neither ambiguity applies, proceed directly.

---

## Step 3: Load References

Read only what is needed:

- `../../../../datocms-frontend-integrations/references/site-search-api.md`
- `../../../../datocms-cma/references/client-types-and-behaviors.md`
- `../../../../datocms-cma/references/access-control.md`

Then load the framework-appropriate search UI reference:

| Stack | Reference |
| - | - |
| React / Next.js | `../../../../datocms-frontend-integrations/references/react-site-search.md` |
| Vue / Nuxt | `../../../../datocms-frontend-integrations/references/vue-site-search.md` |
| SvelteKit / Astro / unsupported UI stack | `../../../../datocms-frontend-integrations/references/site-search-api.md` |

---

## Step 4: Generate code

Generate the full setup, attempting Dato-side automation first when a CMA-capable token is available.

### Dato-side automation

If a CMA-capable token exists, attempt this remote setup in order:

1. inspect existing search indexes
2. inspect roles and access tokens
3. create or update one least-privilege search role with `can_perform_site_search: true`
4. create or update one access token bound to that role
5. create or update search indexes using the selected topology:
   - preserve multiple existing indexes if the Dato project already uses them intentionally
   - default new setups to one shared index
   - only create multiple new indexes when the repo or user decision clearly requires separate crawling boundaries
   - when multiple indexes are used, make the distinction explicit in naming and any `user_agent_suffix` strategy
6. trigger indexing after creating or materially updating an index

If remote automation is blocked by missing permissions such as `can_manage_search_indexes` or `can_manage_access_tokens`, continue with local scaffolding and mark the result `scaffolded`.

### Local project changes

Generate only the minimum local files needed for a working search experience:

1. **Install missing packages**
   - React / Next.js: `react-datocms`, `@datocms/cma-client-browser`
   - Vue / Nuxt: `vue-datocms`, `@datocms/cma-client-browser`
   - Other stacks: a suitable CMA client package for the runtime used by the generated helper
2. **Patch env placeholders**
   - public search token
   - public search index id
   - public site URL if the project does not already define it
3. **Create or patch a shared search helper**
   - React / Vue widget stacks may keep this helper thin
   - SvelteKit / Astro / unsupported stacks must use `client.searchResults.rawList()`
4. **Create or patch a `/search` route**
   - React and Vue stacks should render a real search UI using `useSiteSearch`
   - Other stacks should render a framework-native page backed by the generated helper
5. **Reuse existing Dato lib conventions** for file placement instead of inventing parallel structures

### Public env var conventions

Use the framework's public env prefix:

- Next.js: `NEXT_PUBLIC_DATOCMS_SITE_SEARCH_TOKEN`, `NEXT_PUBLIC_DATOCMS_SITE_SEARCH_INDEX_ID`, `NEXT_PUBLIC_SITE_URL`
- Nuxt: `NUXT_PUBLIC_DATOCMS_SITE_SEARCH_TOKEN`, `NUXT_PUBLIC_DATOCMS_SITE_SEARCH_INDEX_ID`, `NUXT_PUBLIC_SITE_URL`
- SvelteKit: `PUBLIC_DATOCMS_SITE_SEARCH_TOKEN`, `PUBLIC_DATOCMS_SITE_SEARCH_INDEX_ID`, `PUBLIC_SITE_URL`
- Astro: `PUBLIC_DATOCMS_SITE_SEARCH_TOKEN`, `PUBLIC_DATOCMS_SITE_SEARCH_INDEX_ID`, `PUBLIC_SITE_URL`

Only add variables that do not already exist. Preserve existing values.

### Mandatory rules

- Always pass an explicit `search_index_id`
- Never expose a CMA-capable token in browser code
- Default to one search index unless the repo clearly needs more or the user explicitly chooses multiple
- Preserve an existing `/search` page and patch it in place where possible
- Keep search result highlighting in the presentation layer; do not store rendered HTML in helpers
- When remote automation fails, report the exact missing permission or credential instead of silently dropping the Dato-side step

### Output status

- Report `scaffolded` if any search token or search index id is still a placeholder, if the `/search` route is not fully mounted, if Dato-side automation could not complete, or if additional index-topology assumptions remain unresolved
- Report `production-ready` only when the mounted search route uses real values and any attempted Dato-side automation completed without unresolved TODOs

---

## Step 5: Final handoff

After generating the files, tell the user:

1. which Dato-side resources were created or reused
2. whether Site Search now uses one index or multiple indexes
3. which env vars still need real values, if any
4. how to trigger a fresh indexing pass if the content has not been crawled yet

Follow the shared final handoff rules in `../../../patterns/OUTPUT_STATUS.md`, including an explicit `Unresolved placeholders` section.

---

## Verification checklist

Before presenting the result, verify:

1. search UI exists at a mounted `/search` route
2. React / Vue stacks use `useSiteSearch`
3. SvelteKit / Astro / unsupported stacks use `client.searchResults.rawList()`
4. `search_index_id` is explicit in every search request
5. browser code uses only the public search token, never a CMA token
6. missing `can_manage_search_indexes` or `can_manage_access_tokens` is called out explicitly when remote automation fails
7. the final handoff includes an explicit `Unresolved placeholders` section
