---
name: datocms-frontend-integrations
description: >-
  Patch, extend, or explain DatoCMS front-end integration code inside an
  existing web project (Next.js App Router, Nuxt, SvelteKit, Astro, plus
  React/Vue/Svelte component usage). Use for targeted, per-concern work —
  adding a draft mode endpoint, wiring Preview Links / Visual Editing flows,
  fixing Content Link overlays, tuning real-time preview
  updates/subscriptions, setting up cache-tag invalidation/revalidation flows
  (Next.js revalidateTag or CDN purge by tags), adding robots/sitemap wiring,
  or hooking up crawler-safe search integration. Also the go-to skill for
  framework component/hook wiring with react-datocms, vue-datocms,
  @datocms/svelte, and @datocms/astro: Image/SRCImage/datocms-image,
  StructuredText, VideoPlayer (React/Vue/Svelte), SEO/meta helpers
  (renderMetaTags/toHead/Seo), QuerySubscription/QueryListener realtime
  patterns, ContentLink components, and Site Search (React/Vue). Prefer this
  skill whenever the user is modifying a live codebase one concern at a time,
  asking a framework-specific API question, or mixing several front-end
  concerns in the same patch.
---

# DatoCMS Front-End Integrations Skill

This skill is the shared front-end integration bundle for DatoCMS web projects.
Prefer `datocms-setup` when the user wants one feature fully scaffolded
end-to-end. Stay in this skill for:

- mixed-feature tasks touching multiple front-end concerns
- framework comparison or API-shape questions
- partial patching inside an existing custom integration
- companion-reference loading for another DatoCMS skill

When this skill helps scaffold setup-adjacent work, report the result as
`scaffolded` when placeholders remain and `production-ready` only when the
implementation no longer depends on unresolved project-specific values.

## Contents

- [Step 1: Detect Context](#step-1-detect-context-silent)
- [Step 2: Classify and Route](#step-2-classify-and-route)
- [Step 3: Load References](#step-3-load-references)
- [Step 4: Generate or Patch Code](#step-4-generate-or-patch-code)
- [Step 5: Verify](#step-5-verify)
- [Cross-Skill Routing](#cross-skill-routing)

---

## Step 1: Detect Context (silent)

If the project context is already established in this conversation (framework,
UI stack, existing integrations, file structure), skip broad detection below.
Re-inspect only when a question cannot be answered from prior context.

Silently examine the project to determine setup and configuration.

1. **Framework** — Read `package.json` and check for:
   - `next` -> Next.js (App Router)
   - `nuxt` -> Nuxt
   - `@sveltejs/kit` -> SvelteKit
   - `astro` -> Astro
   - `@remix-run/` -> Remix
   - otherwise infer whether the project is React-based, Vue-based, or another stack
2. **UI stack** — Determine which library the project actually uses for Dato rendering:
   - React-based -> `react-datocms`
   - Vue-based -> `vue-datocms`
   - SvelteKit / Svelte -> `@datocms/svelte`
   - Astro without React integration -> `@datocms/astro`
3. **Existing Dato helpers** — Search for:
   - `@datocms/cda-client`
   - an existing `executeQuery` wrapper
   - existing image / Structured Text / SEO / video / search helpers
   - environment variable files with Dato tokens or URLs
4. **Existing integration markers** — Check whether the repo already has:
   - draft mode endpoints
   - preview-links endpoints
   - Content Link mounting
   - real-time subscription usage
   - cache-tag forwarding or invalidation
   - search routes or search helpers
   - robots / sitemap routes
5. **File structure** — Determine whether the project uses `src/` or root-level app directories

### Stop conditions

- If the framework cannot be determined, ask the user which stack they are using.
- If a requested integration already exists, inspect it and patch in place by default.
- Only ask about full replacement when the current setup is clearly incompatible, broken, or the user explicitly asked for a rewrite.

---

## Step 2: Classify and Route

Classify the user's request into one or more categories:

| Category | When to select |
|---|---|
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

### Prefer the setup orchestrator for full single-feature scaffolding

If the task is clearly "set up X end-to-end", route to `datocms-setup` instead
of keeping all work in this bundle:

| Category | Route |
|---|---|
| Draft Mode Setup | `datocms-setup` for `draft-mode` |
| Web Previews Setup | `datocms-setup` for `web-previews` |
| Responsive Images | `datocms-setup` for `responsive-images` |
| Structured Text Rendering | `datocms-setup` for `structured-text` |
| Video Player | `datocms-setup` for `video-player` |
| SEO & Meta Tags | `datocms-setup` for `seo` |
| Real-Time Updates | `datocms-setup` for `realtime` |
| Visual Editing / Content Link | `datocms-setup` for `visual-editing` when the user means the full editor flow, or `content-link` when they explicitly want only overlays/stega wiring |
| Site Search | `datocms-setup` for `site-search` |
| Robots & Sitemaps | `datocms-setup` for `robots-sitemaps` |
| Cache Tags | `datocms-setup` for `cache-tags` |

Route to `datocms-setup` when the task is "set up X end-to-end from scratch" for a single feature. Stay here for multi-feature tasks, partial patching, framework comparisons, or when another skill explicitly depends on these references.

If the request says **visual editing** and clearly wants the full editorial flow, treat that as the bundled setup: draft mode + preview links + Content Link + real-time updates. Only route to `content-link` by itself when the user explicitly wants the overlay/stega piece in isolation.

### Questions

Ask zero questions by default.

Only ask when a safe implementation is blocked by something the repo cannot answer, such as:

- missing model-to-route mappings for preview or sitemap generation
- missing cache provider or purge-adapter choice
- multiple competing renderers where patching the wrong one would be risky

Otherwise proceed directly and call out unresolved values instead of stalling.

---

## Step 3: Load References

Read only what is needed from the `references/` directory next to this skill.
Long files include a contents section at the top; preview that first, then load the relevant section.

### Component concept references

Load the relevant concept file first — it contains shared GraphQL queries, field definitions, and patterns. Then load the framework-specific file for component APIs and props.

| Category | Concept file |
|---|---|
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
  - `references/remix.md`
- optional concept references:
  - `references/web-previews-concepts.md`
  - `references/content-link-concepts.md`
  - `references/realtime-concepts.md`

### React references

| Category | Reference file |
|---|---|
| Responsive Images | `references/react-image.md` |
| Structured Text Rendering | `references/react-structured-text.md` |
| Video Player | `references/react-video-player.md` |
| SEO & Meta Tags | `references/react-seo.md` |
| Real-Time Updates | `references/react-realtime.md` |
| Visual Editing / Content Link | `references/react-content-link.md` |
| Site Search | `references/react-site-search.md` |

### Vue references

| Category | Reference file |
|---|---|
| Responsive Images | `references/vue-image.md` |
| Structured Text Rendering | `references/vue-structured-text.md` |
| Video Player | `references/vue-video-player.md` |
| SEO & Meta Tags | `references/vue-seo.md` |
| Real-Time Updates | `references/vue-realtime.md` |
| Visual Editing / Content Link | `references/vue-content-link.md` |
| Site Search | `references/vue-site-search.md` |

### Svelte references

| Category | Reference file |
|---|---|
| Responsive Images | `references/svelte-image.md` |
| Structured Text Rendering | `references/svelte-structured-text.md` |
| Video Player | `references/svelte-video-player.md` |
| SEO & Meta Tags | `references/svelte-seo.md` |
| Real-Time Updates | `references/svelte-realtime.md` |
| Visual Editing / Content Link | `references/svelte-content-link.md` |

Use `references/site-search-api.md` for Svelte / SvelteKit site-search work.

### Astro references

| Category | Reference file |
|---|---|
| Responsive Images | `references/astro-image.md` |
| Structured Text Rendering | `references/astro-structured-text.md` |
| SEO & Meta Tags | `references/astro-seo.md` |
| Real-Time Updates | `references/astro-realtime.md` |
| Visual Editing / Content Link | `references/astro-content-link.md` |

Use `references/site-search-api.md` for Astro site-search work. For Astro video,
use the Mux web component directly or React integration when the project already has it.

### Generic search and crawl references

Load these when the task is framework-agnostic, non-widget-based, or crawler-specific:

- `references/site-search-api.md`
- `references/robots-and-sitemaps.md`

### Verification reference

When implementation work is involved, load:

- `references/verification-checklists.md`

---

## Step 4: Generate or Patch Code

Follow the loaded references and these shared rules:

### Workflow rules

- Respect existing abstractions and patch in place by default.
- Prefer the focused setup skill when the task narrows to a single full scaffold.
- Make targeted changes instead of full rewrites unless the current code is unusable.

### Security and environment rules

- All secrets come from environment variables.
- Validate a dedicated preview/webhook secret environment variable where draft mode or preview-links flows require it; preserve existing repo naming when present.
- Use `isRelativeUrl()` for redirect validation.
- Do not require authentication on draft-mode disable endpoints.

### Query-wrapper rules

- Add or preserve an `includeDrafts` option for draft-aware querying.
- Switch between published and draft CDA tokens based on that option.
- Default to `excludeInvalid: true` for draft-aware wrapper patterns unless the task explicitly needs invalid records during schema work.
- Enable the repo's existing `contentLink` mode (`'v1'` or `'vercel-v1'`) plus `baseEditingUrl` only in draft / visual-editing contexts.

### Framework rules

- Use native env and redirect APIs for the detected framework.
- For Astro, always use `@datocms/astro/*` subpath imports.
- Use the framework-appropriate component or helper API from the loaded reference, not a cross-framework pattern copied from memory.

### TypeScript rules

- No `as unknown as`.
- Avoid unnecessary casts.
- Prefer `import type { ... }` for type-only imports.
- Let TypeScript infer types where it can.

### Dependency rules

- Install missing packages only when the task truly needs them.
- Use `@mux/mux-player-react` for React video.
- Use `@mux/mux-player` for Vue or Svelte video.
- Use `@datocms/cma-client-browser` for React / Vue widget-based site search.

### Search and crawl safety rules

- Use explicit search index ids.
- Use least-privilege public search tokens in the browser.
- Keep sitemap output on the configured public domain only.
- Order Dato crawler `Allow` rules before any catch-all `Disallow: /`.

If customer-specific values such as route mappings, provider details, or index ids remain unresolved, leave clear placeholders and explicitly call out the missing inputs instead of presenting the work as fully ready.

---

## Step 5: Verify

Load `references/verification-checklists.md` and check only the sections relevant to the work you actually performed.

At minimum, verify:

- security, token handling, redirect validation, and environment-variable usage
- query shapes, wrapper options, and framework-specific component APIs
- dependency choices and import paths
- draft-only behavior stays draft-only
- any remaining placeholders or customer-specific mappings are clearly called out

---

## Cross-Skill Routing

Use companion skills when the task leaves this bundle's sweet spot:

| Condition | Route to |
|---|---|
| Full single-feature scaffolding | `datocms-setup` with the matching recipe from Step 2 |
| Shared CDA client wrapper or `executeQuery` baseline | `datocms-setup` for `cda-client` |
| Writing or optimizing GraphQL queries for the CDA | `datocms-cda` |
| Programmatic content management, schema changes, migration scripts, access control, or webhook creation via REST | `datocms-cma` |
| Building a DatoCMS plugin | `datocms-plugin-builder` |
