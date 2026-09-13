# Remix and React Router framework mode

Use this reference for existing Remix apps and React Router framework-mode apps. Reuse the React component references for rendering concerns.

## Detect the application mode

Inspect the installed versions, scripts, Vite plugins, route configuration, and existing server modules. `@react-router/dev`, the React Router Vite plugin, and `react-router.config.*` / `app/routes.*` indicate framework mode. A `react-router` dependency or `<BrowserRouter>` alone does not: client-only apps should use the React references and their existing server/API boundary.

Preserve Remix loaders/actions and imports from `@remix-run/*`. In React Router framework mode, follow the installed version's `react-router` imports and generated route types (`./+types/...`) where already used. Check `ssr` and prerender settings before assuming a loader runs on the server; never move a secret-bearing query into `clientLoader` or browser code. Do not migrate the framework to add a DatoCMS feature.

## Server loaders and preview sessions

Keep CDA requests and environment secrets in server-only modules. Reuse the project's query wrapper and session storage. An authenticated preview session selects the draft token and `includeDrafts: true`; ordinary requests select published content. A query parameter or unsigned cookie must not grant draft access.

The following server-module pattern assumes an existing signed session whose `datocmsPreview` flag is set only by an authenticated preview action. Adapt the query and fields to the project's schema. `getSession` must validate the session cookie; do not replace it with a raw cookie check.

**File:** `app/lib/article.server.ts`

```ts
import { executeQuery } from '@datocms/cda-client';
import { getSession } from './session.server';

type Article = { title: string; _seoMetaTags: Array<{ tag: string; attributes: Record<string, string> | null; content: string | null }> };
const query = `query Article($slug: String!) {
  article(filter: { slug: { eq: $slug } }) { title _seoMetaTags { tag attributes content } }
}`;

export async function loadArticle(request: Request, slug: string | undefined) {
  if (!slug) throw new Response('Not found', { status: 404 });
  const session = await getSession(request.headers.get('Cookie'));
  const preview = session.get('datocmsPreview') === true;
  const token = preview
    ? process.env.DATOCMS_DRAFT_CONTENT_CDA_TOKEN
    : process.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN;
  if (!token) throw new Error('Missing server-side CDA token');
  const { article } = await executeQuery<{ article: Article | null }>(query, {
    token, variables: { slug }, includeDrafts: preview, excludeInvalid: true,
    requestInitOptions: { cache: 'no-store' },
  });
  if (!article) throw new Response('Not found', { status: 404 });
  return { article, preview };
}
```

Call this from the existing server `loader`, using its route params. Return private, non-cacheable responses for previews and preserve the application's published caching policy. Do not serialize either server token in ordinary loader data. Preserve Content Link options in the existing wrapper when visual editing is already enabled.

For enable/disable actions, keep the existing authentication, signed session, cookie security, and CSRF protections. Validate the requested destination as a same-site relative path, commit/destroy the preview session with `Set-Cookie`, and return a non-cacheable redirect. Keep iframe cookie behavior consistent with the existing working preview integration. Do not copy an unauthenticated `?preview=true` demonstration endpoint.

## SEO and optional real-time rendering

Query `_seoMetaTags` in the server loader. Use `toRemixMeta` from `react-datocms` with the route's `meta` export; it produces the descriptor shape used by Remix and React Router framework mode. Follow the installed `meta` argument shape (`loaderData` in React Router 8; `data` in Remix and React Router 7). Keep the root `<Meta />` and existing favicon/link handling. See [React SEO](react-seo.md) for the helper and [SEO concepts](seo-concepts.md) for query composition.

Real-time subscriptions remain optional. If requested, preserve the server's initial fetch, and enable the React subscription only for authenticated preview rendering. Pass the same query, variables, initial data, and draft options across that boundary. Only that authorized preview response may expose the least-privilege draft CDA token required by the browser subscription; keep published responses token-free and subscription-free. Use [React real-time guidance](react-realtime.md) and preserve existing Content Link behavior.

## Verification

- Confirm actual framework mode and installed-version imports; retain working Remix conventions.
- Verify published and authenticated-preview requests separately, including forged/expired cookies, missing records, and upstream errors.
- Confirm tokens stay server-side except for an explicitly enabled, authenticated real-time preview; drafts bypass shared caches.
- No dedicated Remix/React Router setup recipes are bundled. For a requested complete outcome, implement against the concrete app here without inventing a recipe or automatically migrating it.
