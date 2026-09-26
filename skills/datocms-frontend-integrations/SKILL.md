---
name: datocms-frontend-integrations
description: >-
  Patch, extend, or explain DatoCMS front-end integration code in an existing
  web project (Next.js App Router, Nuxt, SvelteKit, Astro, plus
  React/Vue/Svelte component usage). Use for targeted, per-concern work —
  adding a draft mode endpoint, wiring Preview Links / Visual Editing flows,
  fixing Content Link overlays, tuning real-time preview subscriptions,
  setting up cache-tag invalidation/revalidation (Next.js revalidateTag or
  CDN purge by tags), adding robots/sitemap wiring, hooking up crawler-safe
  search. Also the go-to skill for framework component/hook wiring with
  react-datocms, vue-datocms, @datocms/svelte, @datocms/astro:
  Image/RSCImage/datocms-image, StructuredText, VideoPlayer (React/Vue/Svelte),
  SEO/meta helpers (renderMetaTags/toHead/Seo), QuerySubscription/QueryListener
  realtime, ContentLink components, Site Search (React/Vue). Prefer when
  modifying a live codebase one concern at a time, asking a framework-specific
  API question, or mixing several front-end concerns in the same patch.
---

# DatoCMS Front-End Integrations Skill

Shared front-end integration bundle: targeted single- or mixed-feature implementation, partial patching, framework comparison, companion-reference loading.

Structured Text components and renderer callbacks are covered here, including the resolved `record` passed to `renderBlock`. Load the document specialist only for a requested document inspection, transformation, conversion, or validation; ordinary renderer examples need no companion read.

Report `scaffolded` when placeholders remain, `production-ready` only when implementation no longer depends on unresolved project-specific values.

## Step 1: Detect Context (silent)

Skip if context established. Only re-inspect when question can't be answered from prior context.

Silently examine:

1. **Framework** — `package.json`: `next` → Next.js App Router, `nuxt` → Nuxt, `@sveltejs/kit` → SvelteKit, `astro` → Astro, `@remix-run/*` or `@react-router/dev` → Remix / React Router framework mode (React references; patch existing loaders/route modules), or infer React/Vue/other
2. **UI stack** — Dato rendering lib: React (`react-datocms`), Vue (`vue-datocms`), SvelteKit/Svelte (`@datocms/svelte`), Astro without React (`@datocms/astro`)
3. **Existing Dato helpers** — `@datocms/cda-client`, query wrappers, image/Structured Text helpers, env vars
4. **Existing integration markers** — draft mode endpoints, preview-links, Content Link, real-time subscriptions, cache-tag forwarding, search routes, robots/sitemap
5. **File structure** — `src/` or root-level app directories. References show `src/` paths; Next.js without `src/` → `app/`, `lib/datocms/`; SvelteKit and Astro default to `src/` (`kit.files.src`, `srcDir`); Nuxt refs show root `lib/`, `composables/` — relative to `srcDir` (`~`): Nuxt 4 → `app/` when it exists, else root; `server/` stays at root (`references/nuxt.md` › File Structure)
6. **Starter-conventions markers** (gql.tada projects) — `gql.tada` in `package.json`, `lib/datocms/gqlUrlBuilder/` folder, project `<Text>` wrapper around `<StructuredText />`, co-located `fragments.ts` next to block / inline-record / link-to-record components. Presence of these = project follows the patterns in `references/url-builders.md` + `datocms-cda/references/fragment-patterns.md`.

### Stop conditions

- Framework unclear → ask user
- Integration exists → inspect and patch in place by default
- Only ask about full replacement when clearly incompatible, broken, or user explicitly requested rewrite

## Step 2: Classify and Route

Categorize into:

| Category | When to select |
| - | - |
| **Draft Mode Setup** | Draft cookies, enable/disable endpoints, or draft CDA token switching |
| **Web Previews Setup** | Preview-links endpoints, route mapping, Visual tab support |
| **Responsive Images** | Dato image rendering helpers or component selection |
| **Structured Text Rendering** | Structured Text query shapes or renderer wiring |
| **Video Player** | Dato / Mux video playback integration |
| **SEO & Meta Tags** | `_seoMetaTags`, favicon tags, canonical wiring |
| **Real-Time Updates** | Live preview subscriptions or `<QueryListener />` wiring |
| **Visual Editing / Content Link** | Click-to-edit overlays and stega-aware rendering |
| **Site Search** | React / Vue widgets or low-level Search API wiring |
| **Robots & Sitemaps** | `robots.txt`, sitemap routes, crawler-safe rules |
| **Cache Tags** | Granular invalidation or tag-forwarding patterns |

Multiple categories can apply.

**Visual editing** = draft mode + Web Previews + Content Link; real-time only when asked. Content Link alone only when user wants overlays/stega in isolation. Bundle defaults, Vercel conflict rule, plugin handoff fields: `references/visual-editing-concepts.md`.

### Questions

Ask zero questions by default.

Only ask when blocked by something the repo cannot answer:

- missing model-to-route mappings for preview/sitemap
- missing cache provider or purge-adapter choice
- multiple competing renderers where patching the wrong one is risky

Otherwise proceed and call out unresolved values instead of stalling.

## Step 3: Load References

Read relevant sections from `references/`; preview long files' contents first.

For cache-tag work, read the selected framework reference's **Cache Tags (Optional)** section, including for a targeted patch to an existing query helper. The Core section alone does not cover granular invalidation. For manual CDN collection/purge, also load `references/cache-tag-adapters.md`; skip that adapter file for Next.js query-ID mappings or native cache providers.

### Component concept references

Load concept file first (shared GraphQL queries, field definitions, patterns), then framework-specific file for component APIs/props.

| Category | Concept file |
| - | - |
| Responsive Images | `references/image-concepts.md` |
| Video Player | `references/video-player-concepts.md` |
| SEO & Meta Tags | `references/seo-concepts.md` |
| Real-Time Updates | `references/realtime-concepts.md` |
| Site Search | `references/site-search-concepts.md` |

### Setup foundations

Load these for mixed-feature setup work:

- `references/draft-mode-concepts.md`
- one framework reference:
  - `references/nextjs.md`
  - `references/nuxt.md`
  - `references/sveltekit.md`
  - `references/astro.md`
- optional concept references:
  - `references/web-previews-concepts.md`
  - `references/content-link-concepts.md`
  - `references/realtime-concepts.md`

### React references

| Category | Reference file |
| - | - |
| Responsive Images | `references/react-image.md` |
| Structured Text Rendering | `references/react-structured-text.md` |
| Video Player | `references/react-video-player.md` |
| SEO & Meta Tags | `references/react-seo.md` |
| Real-Time Updates | `references/react-realtime.md` |
| Visual Editing / Content Link | `references/react-content-link.md` |
| Site Search | `references/react-site-search.md` |

### Vue references

| Category | Reference file |
| - | - |
| Responsive Images | `references/vue-image.md` |
| Structured Text Rendering | `references/vue-structured-text.md` |
| Video Player | `references/vue-video-player.md` |
| SEO & Meta Tags | `references/vue-seo.md` |
| Real-Time Updates | `references/vue-realtime.md` |
| Visual Editing / Content Link | `references/vue-content-link.md` |
| Site Search | `references/vue-site-search.md` |

### Svelte references

| Category | Reference file |
| - | - |
| Responsive Images | `references/svelte-image.md` |
| Structured Text Rendering | `references/svelte-structured-text.md` |
| Video Player | `references/svelte-video-player.md` |
| SEO & Meta Tags | `references/svelte-seo.md` |
| Real-Time Updates | `references/svelte-realtime.md` |
| Visual Editing / Content Link | `references/svelte-content-link.md` |

Use `references/site-search-api.md` for Svelte / SvelteKit site-search work.

### Astro references

| Category | Reference file |
| - | - |
| Responsive Images | `references/astro-image.md` |
| Structured Text Rendering | `references/astro-structured-text.md` |
| SEO & Meta Tags | `references/astro-seo.md` |
| Real-Time Updates | `references/astro-realtime.md` |
| Visual Editing / Content Link | `references/astro-content-link.md` |

Use `references/site-search-api.md` for Astro site-search work. For Astro video, use Mux web component directly (`references/video-player-concepts.md` › Astro without React integration) or React integration when project already has it.

### gql.tada starter-conventions references

Load when project uses `gql.tada` AND task adds/extends a block, inline-record, link-to-record, routable model, or page query:

- `references/url-builders.md` — per-model URL builders + `buildUrlFromGql()` dispatcher
- `../datocms-cda/references/fragment-patterns.md` — masking discipline, `readFragment()` boundary, fragment composition, page-query rule

Don't load when project uses plain `executeQuery` strings or codegen with hand-shaped types — patterns don't apply.

### Generic search and crawl references

Load for framework-agnostic, non-widget-based, or crawler-specific:

- `references/site-search-api.md`
- `references/robots-and-sitemaps.md`

## Step 4: Generate or Patch Code

Follow loaded references and shared rules:

### Workflow rules

- Respect existing abstractions and patch in place by default
- Make targeted changes instead of full rewrites unless current code is unusable

### Security and environment rules

- All secrets from environment variables
- New runtime env vars: placeholder entry in `.env.example` and the repo's local git-ignored env file; reuse existing names; never commit real values. CLI/CMA tokens excluded (CLI authenticates via `login` + `link`)
- Validate dedicated preview/webhook secret env var where draft mode or preview-links flows require it; preserve existing repo naming when present
- Use `isRelativeUrl()` for redirect validation
- Do not require authentication on draft-mode disable endpoints

### Query-wrapper rules

- Shared helper: framework reference's `## Core` query helper — published-only variant until draft mode exists; document type follows the repo (`TadaDocumentNode` for `gql.tada`, codegen `TypedDocumentNode`, else `query: string`). Client options: [client-and-config.md](../datocms-cda/references/client-and-config.md)
- Add or preserve `includeDrafts` option for draft-aware querying
- Switch between published and draft CDA tokens based on that option
- Default to `excludeInvalid: true` for draft-aware wrapper patterns unless task explicitly needs invalid records during schema work
- Enable repo's existing `contentLink` mode (`'v1'` or `'vercel-v1'`) only in draft / visual-editing contexts
- Supply the public `baseEditingUrl` whenever a query selects `_editingUrl`, including published reads

### Framework rules

- Use native env and redirect APIs for detected framework
- For Astro, always use `@datocms/astro/*` subpath imports
- Use framework-appropriate component or helper API from loaded reference, not cross-framework pattern from memory

### TypeScript rules

- No `as unknown as`
- Avoid unnecessary casts
- Prefer `import type { ... }` for type-only imports
- Let TypeScript infer where it can

### Dependency rules

- Install missing packages only when task truly needs them
- Packages generated code imports → direct `dependencies`, even when a Dato package already pulls them in (strict pnpm); `@types/*` and the `datocms` CLI → `devDependencies`
- Use `@mux/mux-player-react` for React video
- Use `@mux/mux-player` for Vue or Svelte video
- Use `@datocms/cma-client-browser` for React / Vue widget-based site search

### Search and crawl safety rules

- Use explicit search index ids
- Use least-privilege public search tokens in browser
- Keep sitemap output on configured public domain only
- Order Dato crawler `Allow` rules before any catch-all `Disallow: /`

If customer-specific values (route mappings, provider details, index ids) remain unresolved, leave clear placeholders and explicitly call out missing inputs instead of presenting work as fully ready.

## Step 5: Verify

Load `references/verification-checklists.md` and check only sections relevant to work you actually performed.

At minimum, verify:

- security, token handling, redirect validation, environment-variable usage
- query shapes, wrapper options, framework-specific component APIs
- dependency choices and import paths
- draft-only behavior stays draft-only
- any remaining placeholders or customer-specific mappings are clearly called out

## Cross-Skill Routing

DAST structure/validation → [document model](../datocms-structured-text/references/document-model.md); content traversal/transforms → [editing](../datocms-structured-text/references/editing.md); Markdown/HTML import and framework-independent export → [conversion](../datocms-structured-text/references/conversion.md), all owned by **datocms-structured-text**. Load only for those tasks; component wiring and query/render adapters remain here. Missing sibling reference → install that skill from `datocms/agent-skills` or update the full bundle.

Use companion skills when task leaves this bundle's sweet spot:

| Condition | Route to |
| - | - |
| Guided multi-part setup, a new site, or user unsure which outcome they need | `datocms-setup` |
| Writing or optimizing GraphQL queries for the CDA | `datocms-cda` |
| gql.tada fragment-writing discipline (masking, composition, page query) | `datocms-cda` (`../datocms-cda/references/fragment-patterns.md`) |
| Programmatic content management, schema changes, migration scripts, access control, or webhook creation via REST | `datocms-cma` |
| Building a DatoCMS plugin | `datocms-plugin` |
