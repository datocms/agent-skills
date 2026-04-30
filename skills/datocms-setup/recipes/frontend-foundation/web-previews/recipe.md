_Internal recipe for `datocms-setup`. Use this file only after the parent skill selects the `web-previews` recipe and queues any prerequisites from `../../../references/recipe-manifest.json`._

# DatoCMS Web Previews Setup

You are an expert at setting up the DatoCMS Web Previews plugin integration. This recipe generates a preview-links endpoint that returns draft/published URLs for records, enabling editors to preview content directly from the DatoCMS UI.

See `../../../patterns/OUTPUT_STATUS.md` for output status definitions.

Follow these steps in order. Do not skip steps.

---

## Step 1: Detect Context (silent)

Silently examine the project:

Follow the shared repo inspection conventions in `../../../references/repo-conventions.md`, then inspect the recipe-specific signals below.

1. **Framework and file layout** — use `../../../references/repo-conventions.md` for supported framework detection, `src/` usage, and the standard draft-mode or preview route locations.

2. **Prerequisite: Draft mode** — Check if the draft mode enable endpoint exists:
   - Next.js: `src/app/api/draft-mode/enable/route.ts` or `app/api/draft-mode/enable/route.ts`
   - Nuxt: `server/api/draft-mode/enable.ts`
   - SvelteKit: `src/routes/api/draft-mode/enable/+server.ts`
   - Astro: `src/pages/api/draft-mode/enable/index.ts` or `src/pages/api/draft-mode/enable.ts`

3. **Existing preview-links endpoint** — Check if a preview-links endpoint already exists:
   - Next.js: `src/app/api/preview-links/route.ts` or `app/api/preview-links/route.ts`
   - Nuxt: `server/api/preview-links.ts`
   - SvelteKit: `src/routes/api/preview-links/+server.ts`
   - Astro: `src/pages/api/preview-links/index.ts` or `src/pages/api/preview-links.ts`

4. **Existing utilities** — Check for CORS helpers, error handling utilities, and URL helpers created by draft mode or other preview features.

5. **Existing route helpers** — Search for helpers that already map content to public URLs, such as:
   - sitemap / robots helpers
   - SEO/public URL utilities
   - `recordToWebsiteRoute`-style helpers
   - page-level route builders based on model api keys or slugs

6. **Frontend count** — Inspect env files, site URL helpers, and hosting config for one vs multiple clear frontend targets (for example primary + staging, or multiple site URLs).

7. **Installed deps** — Check `package.json` for `@datocms/rest-client-utils` and `@datocms/cma-client`.

### Stop conditions

- If draft mode does not exist, record `draft-mode` as a prerequisite and continue after it is applied. Do not tell the user to run another recipe manually.
- If a preview-links endpoint already exists, inspect it first and update it in place by default.

---

## Step 2: Ask Questions

Follow the zero-question default and question-format rules in `../../../patterns/MANDATORY_RULES.md`.

Only ask if one of these unresolved decisions remains after inspection:

1. **Model-to-route mapping** — no safe existing route helper can be reused and the record→URL mapping cannot be inferred confidently.

   Ask one question:

   > "What are your content models and their frontend URL patterns? For example: `blog_post` → `/blog/[slug]`, `page` → `/[slug]`, `home_page` → `/`. Recommended default: if you skip, I'll scaffold TODO placeholders and mark the result `scaffolded` until those mappings are filled in."

2. **Multiple frontend handoff** — the repo clearly serves more than one site or environment, but the Web Previews handoff would otherwise need to guess the frontend labels or URLs.

   Ask one question:

   > "This repo appears to serve multiple frontends or environments. Should the Web Previews handoff describe a single primary frontend or multiple named frontends (for example Production and Staging)? Recommended default: single primary frontend. If you skip, I'll generate one primary frontend handoff and list the additional frontend assumptions under unresolved placeholders."

If neither ambiguity applies, proceed directly.

---

## Step 3: Load References

Read the relevant reference files. Load only what is needed.

**Always load:**

- `../../../../datocms-frontend-integrations/references/visual-editing-concepts.md`
- `../../../../datocms-frontend-integrations/references/web-previews-concepts.md`

**Load per framework — focus on the `## Web Previews (Optional)` section:**

| Framework | Reference file |
| - | - |
| Next.js | `../../../../datocms-frontend-integrations/references/nextjs.md` |
| Nuxt | `../../../../datocms-frontend-integrations/references/nuxt.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/sveltekit.md` |
| Astro | `../../../../datocms-frontend-integrations/references/astro.md` |

---

## Step 4: Generate code

Create or patch the preview-links integration using the smallest safe changes.

### Files to generate or patch

1. **Preview-links endpoint** — Handles POST requests from the DatoCMS Web Previews plugin:
   - CORS headers and `OPTIONS` preflight handling
   - `SECRET_API_TOKEN` validation
   - status branching for draft and published links
   - draft links that flow through the draft-mode enable route

2. **Route mapping helper reuse** — If the repo already has a safe route helper, reuse or adapt it instead of inventing a parallel `recordToWebsiteRoute` implementation.

3. **recordInfo helper** — Add only if the selected framework pattern actually needs a CMA lookup for route generation.

4. **CSP header configuration** — Add `frame-ancestors 'self' https://plugins-cdn.datocms.com` when it is not already configured.

### Route-mapping rules

- Prefer existing route helpers first
- If no safe helper exists, scaffold `recordToWebsiteRoute`
- If route mappings remain unresolved, keep explicit TODO cases and mark the result `scaffolded`
- Always record the missing model→URL mappings in the final handoff

### Security and error-handling rules

- Validate `SECRET_API_TOKEN`
- Include CORS headers on all responses, including errors
- Reuse existing draft-mode error helpers when available
- Return a successful empty `previewLinks` payload for unmatched records instead of throwing if that matches the framework reference pattern

### Plugin-side handoff

Always generate a stable plugin-configuration handoff in the final response that names:

- frontend label (default `Primary` unless multiple frontends were chosen)
- Preview Links API endpoint
- Draft Mode URL
- initial path default (`/` unless the repo clearly indicates a different entry route)
- viewport preset recommendation (`desktop` + `mobile` unless the repo already exposes a stronger convention)
- custom headers or query-secret expectation
- unresolved model-to-route mappings

This handoff is required even when the code is otherwise production-ready.

### Output status

- Report `scaffolded` if route mappings are incomplete, frontend handoff values are still placeholders, or required plugin details still depend on user input
- Report `production-ready` only when all required mappings and handoff values are concrete and no TODO routing cases remain

---

## Step 5: Install dependencies

Install missing packages only when the selected framework pattern needs them:

| Package | When |
| - | - |
| `@datocms/rest-client-utils` | Next.js only |
| `@datocms/cma-client` | Only when route generation needs CMA record info types or helper lookups |

Use the project's package manager (see `../../../patterns/MANDATORY_RULES.md`).

---

## Step 6: Final handoff

After generating all files, tell the user:

1. which route helper was reused or whether new TODO mappings were scaffolded
2. the exact plugin handoff values for Web Previews
3. whether the result is `scaffolded` or `production-ready`
4. the optional follow-up recipe ids that still make sense: `content-link`, `realtime`, or `visual-editing`

Follow the shared final handoff rules in `../../../patterns/OUTPUT_STATUS.md`, including an explicit `Unresolved placeholders` section.

---

## Verification checklist

Before presenting the final result, verify:

1. the preview-links endpoint validates `SECRET_API_TOKEN`
2. CORS headers are included on all responses, including errors and `OPTIONS`
3. status branching returns draft and published links correctly
4. draft links flow through the draft-mode enable route
5. existing route helpers were reused whenever safe
6. CSP `frame-ancestors 'self' https://plugins-cdn.datocms.com` is configured when needed
7. the final handoff includes a plugin configuration block and an explicit `Unresolved placeholders` section
8. `production-ready` is only reported when no TODO route mappings remain
