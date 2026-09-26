# Generic Site Search API Patterns

Use this reference when you need DatoCMS Site Search outside the packaged React/Vue widgets. Typical cases:

- SvelteKit, Astro, or other frameworks without `useSiteSearch`
- Custom search UIs that need full control over rendering
- Server-side search helpers that normalize paging and highlighting

## Contents

- Dato-side prerequisites
- Search index provisioning via CMA
- Search requests
- Returned result shape
- Recommended helper contract
- Safety rules

## Dato-side prerequisites

Before a search UI can work, the Dato project needs:

1. A **Search Index**
2. A least-privilege **role** with only `can_perform_site_search` enabled
3. An **API token** associated with that role

Use a dedicated public-facing search token for client-side search requests. Site Search uses a CMA endpoint, so the **token** needs `can_access_cma: true`; disabling that transport gate returns 401 even when its role grants search. Keep `can_access_cda` and `can_access_cda_preview` false. The associated **role** should grant only `can_perform_site_search`, with no content, upload, configuration-management, or trigger permissions and no inherited grants. Never expose an administrator or content-management token in the browser.

Verify both sides: a search request with the new token succeeds, and a content-management action is denied. Reading token flags alone does not prove that search works.

Always pass `search_index_id` explicitly, even if the project currently has a single index.

## Search index provisioning via CMA

Search-index creation belongs on a trusted server or one-shot setup script using a CMA-capable token:

```ts
import { buildClient } from '@datocms/cma-client-node';

const client = buildClient({
  apiToken: process.env.DATOCMS_API_TOKEN,
});

const searchIndex = await client.searchIndexes.create({
  name: 'Production Website',
  enabled: true,
  frontend_url: 'https://www.example.com/',
  user_agent_suffix: null,
});

await client.searchIndexes.trigger(searchIndex.id);
```

`frontend_url` is the crawl start point: the deployed public site (the crawler can't reach localhost).

Provisioning token's role needs: `can_manage_search_indexes` (create/edit indexes), `can_manage_users` (create/edit roles), `can_manage_access_tokens` (tokens). Manual re-index (`trigger`) is gated by the role's `positive_search_index_permissions`, not `can_manage_search_indexes`. On a permission failure, name the missing one.

Useful CMA methods:

- `client.searchIndexes.list()`
- `client.searchIndexes.create()`
- `client.searchIndexes.update()`
- `client.searchIndexes.trigger()`
- `client.searchIndexes.destroy()`

If the project already has multiple search indexes, preserve them. For new integrations, default to one index unless the site clearly has separate public sections that need independent crawling rules.

## Search requests

For custom integrations, use the low-level Site Search API through the CMA client:

```ts
import { buildClient } from '@datocms/cma-client-browser';

const client = buildClient({
  apiToken: import.meta.env.PUBLIC_DATOCMS_SITE_SEARCH_TOKEN,
});

const { data: results, meta } = await client.searchResults.rawList({
  filter: {
    query: 'term to search',
    fuzzy: true,
    search_index_id: import.meta.env.PUBLIC_DATOCMS_SITE_SEARCH_INDEX_ID,
    locale: 'en',
  },
  page: {
    limit: 20,
    offset: 0,
  },
});
```

Example reads Astro's `import.meta.env`. Browser-visible elsewhere: Next.js `process.env.NEXT_PUBLIC_DATOCMS_SITE_SEARCH_TOKEN` / `_INDEX_ID`; Nuxt `useRuntimeConfig().public` keys declared in `runtimeConfig.public` (set by `NUXT_PUBLIC_*`); SvelteKit `PUBLIC_*` via `$env/static/public` or `$env/dynamic/public`; plain React/Vue with Vite `import.meta.env.VITE_DATOCMS_SITE_SEARCH_TOKEN` / `_INDEX_ID`. Token value only in the git-ignored env file.

Important behaviors:

- Default page size is 20
- Maximum page size is 100
- `meta.total_count` gives the total matching result count
- Search indexes can take a short time to reflect newly crawled content

## Returned result shape

Each result includes:

- `attributes.title`
- `attributes.body_excerpt`
- `attributes.url`
- `attributes.score`
- `attributes.highlight.title`
- `attributes.highlight.body`

Highlight values wrap matches in `[h]...[/h]` markers. Convert them into your preferred markup in the presentation layer instead of storing transformed HTML.

## Recommended helper contract

When scaffolding a framework-native search page, normalize the raw response into a stable helper return value such as:

```ts
type SearchPageResult = {
  results: Array<{
    id: string;
    title: string;
    bodyExcerpt: string;
    url: string;
    titleHighlights: string[];
    bodyHighlights: string[];
  }>;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
};
```

Keep the helper responsible for pagination math and API calling. Keep the route or component responsible for rendering and empty/loading/error states.

## Safety rules

- Never ship a CMA-capable token to the browser
- Always pass `search_index_id`
- Keep search tokens read-only and scoped to Site Search
- Treat missing token values or missing index ids as a `scaffolded` result
