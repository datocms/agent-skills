# Frontend integrations

Patch, extend, or explain DatoCMS integrations in an existing website. Use [setup](setup.md) for a requested complete feature installation, loading only missing prerequisites. Stay here for component/endpoint fixes, partial changes, framework questions, and mixed concerns.

## Inspect and select

Reuse established context. Otherwise inspect the framework/runtime, renderer libraries, `src/` layout, existing CDA query wrapper, token variable names, preview endpoints, Content Link, subscriptions, cache invalidation, search, and crawl routes. Preserve existing owners and patch them in place.

If framework or model-to-route mapping is unresolved and affects correctness, ask only for that missing choice. Do not replace working abstractions or add optional features to resolve a narrow issue.

For an existing gql.tada starter, inspect colocated fragments, URL builders, and any project Structured Text wrapper. Apply its conventions only when present.

## Load by concern and framework

Load the shared concept when listed, then the matching framework reference. Do not read all framework variants.

| Concern | Shared reference |
| - | - |
| Responsive images | [Image concepts](frontend/image-concepts.md) |
| Video players | [Video concepts](frontend/video-player-concepts.md) |
| SEO/meta tags | [SEO concepts](frontend/seo-concepts.md) |
| Live preview subscriptions | [Real-time concepts](frontend/realtime-concepts.md) |
| Site Search | [Search concepts](frontend/site-search-concepts.md) |
| Draft enable/disable and token switching | [Draft mode](frontend/draft-mode-concepts.md) |
| Preview links and Visual tab | [Web Previews](frontend/web-previews-concepts.md) |
| Stega, overlays, editing links | [Content Link](frontend/content-link-concepts.md) |
| Raw/custom search or crawler handling | [Search API](frontend/site-search-api.md) |
| Robots and sitemap generation | [Robots and sitemaps](frontend/robots-and-sitemaps.md) |

For framework endpoints, environment conventions, and cache integration, select [Next.js](frontend/nextjs.md), [Nuxt](frontend/nuxt.md), [SvelteKit](frontend/sveltekit.md), [Astro](frontend/astro.md), or [Remix](frontend/remix.md).

| Component | React | Vue | Svelte | Astro |
| - | - | - | - | - |
| Images | [React](frontend/react-image.md) | [Vue](frontend/vue-image.md) | [Svelte](frontend/svelte-image.md) | [Astro](frontend/astro-image.md) |
| Structured Text | [React](frontend/react-structured-text.md) | [Vue](frontend/vue-structured-text.md) | [Svelte](frontend/svelte-structured-text.md) | [Astro](frontend/astro-structured-text.md) |
| SEO | [React](frontend/react-seo.md) | [Vue](frontend/vue-seo.md) | [Svelte](frontend/svelte-seo.md) | [Astro](frontend/astro-seo.md) |
| Real-time updates | [React](frontend/react-realtime.md) | [Vue](frontend/vue-realtime.md) | [Svelte](frontend/svelte-realtime.md) | [Astro](frontend/astro-realtime.md) |
| Content Link | [React](frontend/react-content-link.md) | [Vue](frontend/vue-content-link.md) | [Svelte](frontend/svelte-content-link.md) | [Astro](frontend/astro-content-link.md) |
| Video | [React](frontend/react-video-player.md) | [Vue](frontend/vue-video-player.md) | [Svelte](frontend/svelte-video-player.md) | Use Mux's web component or an existing React integration |
| Site Search widgets | [React](frontend/react-site-search.md) | [Vue](frontend/vue-site-search.md) | Use the Search API reference | Use the Search API reference |

For gql.tada block/inline-record/routable-model changes, read [URL builders](frontend/url-builders.md) and [fragment patterns](cda/fragment-patterns.md). Do not impose these on plain query strings or a different existing codegen convention.

## Setup boundaries

For a full installation, the setup router maps the requested concern to `draft-mode`, `web-previews`, `responsive-images`, `structured-text`, `video-player`, `seo`, `realtime`, `visual-editing`, `content-link`, `site-search`, `robots-sitemaps`, or `cache-tags`.

Visual editing combines draft mode and Content Link, plus Web Previews unless the user wants website-only click-to-edit. Real-time updates remain optional. An existing endpoint or overlay fix does not require rerunning that bundle.

Keep the user's selected overlay system. If existing Vercel overlays conflict with requested DatoCMS editing behavior, resolve that choice before adding another overlay implementation.

## Implementation rules

- Use environment variables for secrets. Preserve dedicated preview/webhook secret naming and validate it where those flows require it.
- Validate redirects with `isRelativeUrl()`. Do not add authentication to draft-mode disable endpoints.
- Preserve `includeDrafts` behavior and switch published/draft tokens intentionally.
- Draft-aware wrappers default to `excludeInvalid: true` unless the requested schema work needs invalid records.
- Enable the selected `contentLink` mode and `baseEditingUrl` only in draft/visual-editing contexts.
- Use the detected framework's native env/redirect APIs. Astro imports use `@datocms/astro/*` subpaths.
- Use the matching renderer API from its reference, not a different framework's component shape.
- Install dependencies only when the selected implementation imports them. React video uses `@mux/mux-player-react`; Vue/Svelte video uses `@mux/mux-player`. React/Vue search widgets use `@datocms/cma-client-browser`.
- Keep public search tokens least-privileged and use explicit index IDs. Sitemap URLs stay on the configured public domain. Put crawler `Allow` rules before a catch-all `Disallow: /`.
- Preserve TypeScript inference, type-only imports, and existing abstractions; do not silence errors with assertions.

## Verify

Read only the relevant sections of [verification checklists](frontend/verification-checklists.md). Check token/draft boundaries, redirect validation, query/wrapper behavior, framework imports, and the actual changed feature. Report unresolved routes, providers, index IDs, or credentials clearly; do not call placeholders production-ready.

Use [CDA](cda.md) for query work, [CMA](cma.md) for project resources, and [plugin](plugin.md) for DatoCMS dashboard plugin code. Plugin-specific Canvas, hook, and style rules do not apply to ordinary websites.
