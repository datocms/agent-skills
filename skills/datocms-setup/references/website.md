# Website plays

**FW** = the detected framework's reference: [nextjs.md](../../datocms-frontend-integrations/references/nextjs.md), [nuxt.md](../../datocms-frontend-integrations/references/nuxt.md), [sveltekit.md](../../datocms-frontend-integrations/references/sveltekit.md), [astro.md](../../datocms-frontend-integrations/references/astro.md). FW › `Core` = that file's `## Core` section. **UI refs** = the site's component library files (React, Vue, Svelte, Astro) listed for the feature in [datocms-frontend-integrations › Step 3](../../datocms-frontend-integrations/SKILL.md#step-3-load-references). Other stacks (Remix / React Router, plain React or Vue): **datocms-frontend-integrations** Steps 1–3 choose the references.

Every play also follows [datocms-frontend-integrations › Step 4](../../datocms-frontend-integrations/SKILL.md#step-4-generate-or-patch-code) (security, env, query wrapper, TypeScript, dependency rules) and checks its section of [verification-checklists.md](../../datocms-frontend-integrations/references/verification-checklists.md).

## Connect the site

- **Gives:** one shared query helper that reads published content; optionally typed queries.
- **Check:** existing helper (`executeQuery`, SvelteKit `queries.ts`, Nuxt `useQuery`) — already draft-aware → nothing to add; typed-query setup (`gql.tada`, GraphQL Code Generator, `.graphql` documents).
- **Ask:** typed queries? Keep the repo's existing approach; none yet → `gql.tada` (recommended) or plain strings. Both approaches present → which one owns typing.
- **Build:** [client-and-config.md](../../datocms-cda/references/client-and-config.md); FW › `Core` query helper, published-only (draft switching comes with previews); typed queries: [CDA type-generation.md](../../datocms-cda/references/type-generation.md).
- **Live:** none. Schema download for typed queries is a read with the published token.
- **Verify:** build passes; one real query through the helper returns data; typed queries: an unknown field fails typecheck.

## Previews and visual editing

- **Gives:** editors open drafts on the site (draft mode); preview links and a side-by-side preview inside DatoCMS (Web Previews); click text on the page to open its field (Content Link); optional live updates while editing (real-time).
- **Pieces:** draft mode always; Web Previews unless click-to-edit on the site only; Content Link unless preview links only; real-time only when asked. Bundle defaults, the Vercel conflict rule and plugin handoff fields: [visual-editing-concepts.md](../../datocms-frontend-integrations/references/visual-editing-concepts.md).
- **Needs:** Connect the site when no query helper exists; Typed CMA code when the record → URL mapping follows the reference's `Schema.X.ID` switch and no generated types exist.
- **Check:** draft enable/disable routes; preview-links endpoint; `contentLink` in the helper and a `<ContentLink />` mount; realtime subscriptions; Vercel Content Link / Edit Mode signals (`@vercel/stega`, `@vercel/toolbar`, `vercel-v1`); route helpers or URL builders for record → URL mapping; one or several frontends; public site URL; existing `frame-ancestors` header.
- **Ask** (one grouped question, skip what's decided): which pieces — side-by-side preview with click-to-edit, on the site too (recommended) / click-to-edit on the site only / preview links only, no click-to-edit; live updates — no (recommended unless asked); record → URL mapping when routes can't be inferred (skip → placeholder cases, `scaffolded`); one frontend (recommended) or several; Vercel overlays present → keep them or switch per the conflict rule, never both.
- **Build** (in this order): [draft-mode-concepts.md](../../datocms-frontend-integrations/references/draft-mode-concepts.md) + FW › `Core`; [web-previews-concepts.md](../../datocms-frontend-integrations/references/web-previews-concepts.md) + FW › `Web Previews (Optional)`; [content-link-concepts.md](../../datocms-frontend-integrations/references/content-link-concepts.md) + FW › `Content Link (Optional)` + UI refs; [realtime-concepts.md](../../datocms-frontend-integrations/references/realtime-concepts.md) + FW › `Real-Time Updates (Optional)` + UI refs.
- **Live:** installing and configuring the Web Previews plugin writes to the project: [web-previews-concepts.md › Plugin Installation](../../datocms-frontend-integrations/references/web-previews-concepts.md#plugin-installation). Not approved → hand over the exact plugin values. Turning off Content Link on fields (`content_link_enabled`) is a recommendation only.
- **Verify:** [verification-checklists.md › Setup Flows](../../datocms-frontend-integrations/references/verification-checklists.md#setup-flows) for each piece built; open a record's preview from DatoCMS, see draft content, click a text and land on its field; side-by-side → move to another record and the preview follows; live updates → an edit shows without a manual reload (Astro reloads the page).

## Fresh published content

- **Gives:** pages built from DatoCMS content refresh when that content changes, without rebuilding everything.
- **Needs:** Connect the site when no query helper exists. Not previews: published-only sites skip the draft branches.
- **Check:** existing cache-tag wrapper or invalidation route (reuse its secret and route); Next.js storage signal (`@libsql/client`, `TURSO_*`, other DB); hosting/CDN signal (`netlify.toml`, `wrangler.toml`, adapters, Fastly or Bunny config); Astro version and adapter.
- **Ask:** Next.js without a storage signal → which store for the query-to-tag mapping (existing signal recommended; skip → placeholder adapter, `scaffolded`); manual CDN path without a hosting signal → which CDN (skip → unconfigured adapter, `scaffolded`).
- **Build:** [draft-caching-environments.md › Cache Tags](../../datocms-cda/references/draft-caching-environments.md#cache-tags); FW › `Cache Tags (Optional)`; manual CDN purge: [cache-tag-adapters.md](../../datocms-frontend-integrations/references/cache-tag-adapters.md).
- **Live:** the `cda_cache_tags` → `invalidate` webhook, sending the shared secret as an `Authorization: Bearer` header, is a project write: approval, or hand over the dashboard values.
- **Verify:** [verification-checklists.md › Cache Tags](../../datocms-frontend-integrations/references/verification-checklists.md#cache-tags); invalidation route answers 401 without the secret; after deploy, publishing one record refreshes only the pages that use it.

## Render content

- **Gives:** responsive images, Structured Text (with its blocks, inline records and links) and video fields rendered through one shared component each, wired into at least one real field.
- **Needs:** Connect the site when no query helper exists.
- **Check:** UI package (`react-datocms`, `vue-datocms`, `@datocms/svelte`, `@datocms/astro`); existing image, Structured Text or video components; a real field to patch (`responsiveImage`, Structured Text `value`, `video`); Content Link already configured; Astro React integration for video.
- **Ask:** only when several components compete for the same job → which one to extend (skip → the most central one, noted). Astro without React → video through the Mux web component, or skip video.
- **Build:** images: [image-concepts.md](../../datocms-frontend-integrations/references/image-concepts.md), [images-and-videos.md](../../datocms-cda/references/images-and-videos.md) + UI refs; Structured Text: [CDA structured-text.md](../../datocms-cda/references/structured-text.md) + UI refs (Content Link on → its Structured Text rules); video: [video-player-concepts.md](../../datocms-frontend-integrations/references/video-player-concepts.md) + UI refs (Astro without React: [› Astro without React integration](../../datocms-frontend-integrations/references/video-player-concepts.md#astro-without-react-integration)). Document conversion or editing → **datocms-structured-text**.
- **Live:** none.
- **Verify:** [verification-checklists.md › Component Integrations](../../datocms-frontend-integrations/references/verification-checklists.md#component-integrations); the patched page renders every block and link, images carry `srcset`, video plays without autoplay or tracking unless opted in.

## SEO and crawling

- **Gives:** server-rendered titles, meta, social tags and favicons from DatoCMS; absolute canonical URLs; `robots.txt` and a sitemap listing real public routes.
- **Needs:** Connect the site when no query helper exists. Both parts chosen → SEO first (they share the site URL helper).
- **Check:** existing head/metadata owner; public site URL variable or helper; existing robots/sitemap routes; route builders per model (`recordToWebsiteRoute`, URL builders); public sections; Site Search indexes or crawler suffixes; Content Link configured (strip stega from head values).
- **Ask:** several metadata systems → which one DatoCMS feeds (skip → the framework-native owner); sections whose sitemap or crawler scope can't be inferred (skip → only sections with route builders, rest listed as open). No site URL → placeholder, `scaffolded`.
- **Build:** [seo-concepts.md](../../datocms-frontend-integrations/references/seo-concepts.md) (incl. [canonical URLs](../../datocms-frontend-integrations/references/seo-concepts.md#canonical-urls-and-site-url)) + UI refs; [robots-and-sitemaps.md](../../datocms-frontend-integrations/references/robots-and-sitemaps.md). Adding an SEO field to the schema → **datocms-content-modeling**.
- **Live:** none.
- **Verify:** [verification-checklists.md › SEO and Meta Tags](../../datocms-frontend-integrations/references/verification-checklists.md#seo-and-meta-tags) and [› Robots and Sitemaps](../../datocms-frontend-integrations/references/verification-checklists.md#robots-and-sitemaps); with JavaScript off, title, description, canonical and favicon match DatoCMS; `/robots.txt` and `/sitemap.xml` return real, absolute, same-site URLs.

## Site search

- **Gives:** a search page backed by DatoCMS Site Search, with a least-privilege browser token.
- **Needs:** a deployed public site for indexing (the crawler can't reach localhost).
- **Check:** UI stack (React or Vue widget vs framework-native page); existing `/search` route; search token and index id env vars; public sections (topology); existing indexes, search roles and tokens (read-only).
- **Ask:** several top-level sections whose boundaries can't be inferred → one shared index (recommended) or one per section; several `/search` owners → which one to patch (skip → the mounted one).
- **Build:** [site-search-concepts.md](../../datocms-frontend-integrations/references/site-search-concepts.md), [site-search-api.md](../../datocms-frontend-integrations/references/site-search-api.md) + UI refs; role and token writes: [access-control.md](../../datocms-cma/references/access-control.md); one index per section, or a `robots.txt` catch-all block → crawler groups: [robots-and-sitemaps.md › User-agent suffixes](../../datocms-frontend-integrations/references/robots-and-sitemaps.md#user-agent-suffixes) and [› Order matters](../../datocms-frontend-integrations/references/robots-and-sitemaps.md#order-matters).
- **Live:** creating or updating the search role, token and index, and triggering a crawl → list each in the plan; approval, or hand over the dashboard steps. The token value goes only into the untracked env file.
- **Verify:** [verification-checklists.md › Site Search](../../datocms-frontend-integrations/references/verification-checklists.md#site-search); the token can search but can't manage content; `/search` returns results once indexing completes.
