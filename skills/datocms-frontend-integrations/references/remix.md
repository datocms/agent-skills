# Remix and React Router framework mode

Use this reference for existing Remix apps and React Router framework-mode apps. Reuse the React component references for rendering concerns.

## Detect the application mode

Inspect the installed versions, scripts, Vite plugins, route configuration, and existing server modules. `@react-router/dev`, the React Router Vite plugin, and `react-router.config.*` / `app/routes.*` indicate framework mode. A `react-router` dependency or `<BrowserRouter>` alone does not: client-only apps should use the React references and their existing server/API boundary.

Preserve Remix loaders/actions and imports from `@remix-run/*`. In React Router framework mode, follow the installed version's `react-router` imports and generated route types (`./+types/...`) where already used. Check `ssr` and prerender settings before assuming a loader runs on the server; never move a secret-bearing query into `clientLoader` or browser code. Do not migrate the framework to add a DatoCMS feature.

## Server loaders and preview sessions

Adapt the existing server `loader` and query wrapper:

1. Read the project's validated preview session. An authenticated preview selects the draft token and `includeDrafts: true`; ordinary requests select published content. A query parameter or unsigned cookie must not grant draft access.
2. Keep queries and environment secrets in server-only modules, preserving Content Link options and the published caching policy.
3. Return only the data needed by the route. Keep preview responses private and non-cacheable; do not serialize server tokens in ordinary loader data.

For enable/disable actions, use the [draft-mode guidance](draft-mode-concepts.md) with the existing authenticated session, cookie/CSRF protections, relative redirects, and iframe behavior.

## SEO and optional real-time rendering

Query `_seoMetaTags` in the server loader. Use `toRemixMeta` from `react-datocms` with the route's `meta` export; it produces the descriptor shape used by Remix and React Router framework mode. Follow the installed `meta` argument shape (`loaderData` in React Router 8; `data` in Remix and React Router 7). Keep the root `<Meta />` and existing favicon/link handling. See [React SEO](react-seo.md) for the helper and [SEO concepts](seo-concepts.md) for query composition.

If real-time preview is requested, follow [React real-time guidance](react-realtime.md). Preserve the initial server data and matching query/options. Expose the least-privilege draft CDA token only to the authenticated preview response that needs the browser subscription; keep ordinary published responses token-free and subscription-free.

## Verification

- Confirm actual framework mode and installed-version imports; retain working Remix conventions.
- Verify published and authenticated-preview requests separately, including forged/expired cookies, missing records, and upstream errors.
- Confirm tokens stay server-side except for an explicitly enabled, authenticated real-time preview; drafts bypass shared caches.
- No dedicated Remix/React Router setup recipes are bundled. For a requested complete outcome, implement against the concrete app here without inventing a recipe or automatically migrating it.
