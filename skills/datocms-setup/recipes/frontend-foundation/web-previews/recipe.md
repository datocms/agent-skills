_Internal recipe for `datocms-setup`. Use only after parent skill selects `web-previews` recipe and queues prerequisites from `../../../references/recipe-manifest.json`._

# DatoCMS Web Previews Setup

Expert at DatoCMS Web Previews plugin integration. Recipe generates preview-links endpoint returning draft/published URLs for records, enabling editors preview content from DatoCMS UI.

See `../../../patterns/OUTPUT_STATUS.md` for output status definitions.

Follow steps in order. No skipping.

## Contents

- Step 1: Detect Context (silent)
- Step 2: Ask Questions
- Step 3: Load References
- Step 4: Generate code
- Step 5: Install dependencies
- Step 6: Install plugin and final handoff
- Verification checklist

## Step 1: Detect Context (silent)

Silently examine project:

Follow shared repo inspection conventions in `../../../references/repo-conventions.md`, then inspect recipe-specific signals below.

1. **Framework and file layout** — use `../../../references/repo-conventions.md` for framework detection, `src/` usage, standard draft-mode or preview route locations.

2. **Prerequisite: Draft mode** — Check draft mode enable endpoint exists:
   - Next.js: `src/app/api/draft-mode/enable/route.ts` or `app/api/draft-mode/enable/route.ts`
   - Nuxt: `server/api/draft-mode/enable.ts`
   - SvelteKit: `src/routes/api/draft-mode/enable/+server.ts`
   - Astro: `src/pages/api/draft-mode/enable/index.ts` or `src/pages/api/draft-mode/enable.ts`

3. **Existing preview-links endpoint** — Check preview-links endpoint exists:
   - Next.js: `src/app/api/preview-links/route.ts` or `app/api/preview-links/route.ts`
   - Nuxt: `server/api/preview-links.ts`
   - SvelteKit: `src/routes/api/preview-links/+server.ts`
   - Astro: `src/pages/api/preview-links/index.ts` or `src/pages/api/preview-links.ts`

4. **Existing utilities** — Check CORS helpers, error handling utilities, URL helpers created by draft mode or other preview features.

5. **Existing route helpers** — Search helpers mapping content to public URLs:
   - sitemap / robots helpers
   - SEO/public URL utilities
   - `recordToWebsiteRoute`-style helpers
   - page-level route builders based on model api keys or slugs

6. **Frontend count** — Inspect env files, site URL helpers, hosting config for one vs multiple frontend targets.

7. **Installed deps** — Check `package.json` for `@datocms/rest-client-utils` and `@datocms/cma-client`.

8. **CLI link state** — Check for `datocms.config.json` at repo root. Baseline assumption: present (repo linked via `npx datocms link`). If missing, Step 6 falls back to manual handoff.

### Stop conditions

- If draft mode missing, record `draft-mode` as prerequisite and continue after applied. Don't tell user to run another recipe manually.
- If preview-links endpoint exists, inspect first and update in place by default.
- If `datocms.config.json` missing, ask user to run `npx datocms link` before proceeding so Step 6 can auto-install. If user declines, continue with manual-handoff fallback.

## Step 2: Ask Questions

Follow zero-question default and question-format rules in `../../../patterns/MANDATORY_RULES.md`.

Only ask if unresolved decision remains after inspection:

1. **Model-to-route mapping** — no safe existing route helper can be reused and record→URL mapping cannot be inferred confidently.

   Ask one question:

   > "What are your content models and their frontend URL patterns? For example: `blog_post` → `/blog/[slug]`, `page` → `/[slug]`, `home_page` → `/`. Recommended default: if you skip, I'll scaffold TODO placeholders and mark the result `scaffolded` until those mappings are filled in."

2. **Multiple frontend handoff** — repo clearly serves more than one site or environment, but Web Previews handoff would otherwise need to guess frontend labels or URLs.

   Ask one question:

   > "This repo appears to serve multiple frontends or environments. Should the Web Previews handoff describe a single primary frontend or multiple named frontends (for example Production and Staging)? Recommended default: single primary frontend. If you skip, I'll generate one primary frontend handoff and list the additional frontend assumptions under unresolved placeholders."

If neither ambiguity applies, proceed directly.

## Step 3: Load References

Read relevant reference files. Load only what needed.

**Always load:**

- `../../../../datocms-frontend-integrations/references/visual-editing-concepts.md`
- `../../../../datocms-frontend-integrations/references/web-previews-concepts.md`

**Load per framework — focus on `## Web Previews (Optional)` section:**

| Framework | Reference file |
| - | - |
| Next.js | `../../../../datocms-frontend-integrations/references/nextjs.md` |
| Nuxt | `../../../../datocms-frontend-integrations/references/nuxt.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/sveltekit.md` |
| Astro | `../../../../datocms-frontend-integrations/references/astro.md` |

## Step 4: Generate code

Create or patch preview-links integration using smallest safe changes.

### Files to generate or patch

1. **Preview-links endpoint** — Handles POST requests from DatoCMS Web Previews plugin:
   - CORS headers and `OPTIONS` preflight handling
   - `SECRET_API_TOKEN` validation
   - status branching for draft and published links
   - draft links flowing through draft-mode enable route

2. **Route mapping helper reuse** — If repo already has safe route helper, reuse or adapt it instead of inventing parallel `recordToWebsiteRoute` implementation.

3. **recordInfo helper** — Add only if selected framework pattern actually needs CMA lookup for route generation.

4. **CSP header configuration** — Add `frame-ancestors 'self' https://plugins-cdn.datocms.com` when not already configured.

### Route-mapping rules

- Prefer existing route helpers first
- If no safe helper exists, scaffold `recordToWebsiteRoute`
- If route mappings remain unresolved, keep explicit TODO cases and mark result `scaffolded`
- Always record missing model→URL mappings in final handoff

### Security and error-handling rules

- Validate `SECRET_API_TOKEN`
- Include CORS headers on all responses, including errors
- Reuse existing draft-mode error helpers when available
- Return successful empty `previewLinks` payload for unmatched records instead of throwing if matching framework reference pattern

### Plugin-side configuration

Resolve these values — they feed both the auto-install script (Step 6) and the manual-fallback paste instructions:

| Handoff value | Default | Maps to plugin parameter |
| - | - | - |
| frontend label | `Production` (or `Primary` when multiple frontends chosen) | `frontends[].name` |
| Preview Links API endpoint | `${baseUrl}/api/preview-links?token=${SECRET_API_TOKEN}` | `frontends[].previewWebhook` |
| Draft Mode URL | `${baseUrl}/api/draft-mode/enable?token=${SECRET_API_TOKEN}` | `frontends[].visualEditing.enableDraftModeUrl` |
| Initial path | `/` unless repo clearly indicates different entry route | `frontends[].visualEditing.initialPath` |

Plus top-level `parameters.startOpen: true` to open sidebar preview by default.

Always echo resolved values back to user in final response (audit + confirmation gate) even when code otherwise production-ready.

### Output status

- Report `scaffolded` if route mappings incomplete, frontend handoff values still placeholders, or required plugin details still depend on user input
- Report `production-ready` only when all required mappings and handoff values concrete and no TODO routing cases remain

## Step 5: Install dependencies

Install missing packages only when selected framework pattern needs them:

| Package | When |
| - | - |
| `@datocms/rest-client-utils` | Next.js only |
| `@datocms/cma-client` | Only when route generation needs CMA record info types or helper lookups |

Use project's package manager (see `../../../patterns/MANDATORY_RULES.md`).

## Step 6: Install plugin and final handoff

Default path: programmatic install via CMA (CLI link assumed from Step 1).

### Auto-install (default, CLI linked)

1. Echo resolved `frontends[]` config from "Plugin-side configuration" back to user.
2. Confirm before executing — writes to live DatoCMS project.
3. Pick execution surface based on repo:
   - **Repo has `migrations/`** → scaffold `npx datocms migrations:new "install web previews plugin" --ts` and write the install body into the generated file. User runs `npx datocms migrations:run` to apply. CLI tracks the run, so reruns are safe.
   - **No migrations setup** → one-off via `npx datocms cma:script` stdin.
4. Install body: two CMA calls — `client.plugins.create({ package_name: 'datocms-plugin-web-previews' })` then `client.plugins.update(plugin.id, { parameters: { frontends, startOpen: true } })`. See `../../../../datocms-frontend-integrations/references/web-previews-concepts.md` § Programmatic install.
5. Before `create`, call `client.plugins.list()` and reuse existing instance via `update` if `package_name` already matches (keeps `cma:script` reruns safe; the migration surface gets idempotency from the CLI tracker).
6. Report the plugin id and which surface was used.

### Manual fallback (no CLI link)

Print the resolved `frontends[]` field values as paste instructions for DatoCMS → Settings → Plugins → Web Previews.

### Final response

After install or manual handoff, tell user:

1. which route helper reused or whether new TODO mappings scaffolded
2. resolved plugin configuration values (and whether auto-installed or manual-paste required)
3. whether result `scaffolded` or `production-ready`
4. optional follow-up recipe ids still making sense: `content-link`, `realtime`, or `visual-editing`

Follow shared final handoff rules in `../../../patterns/OUTPUT_STATUS.md`, including explicit `Unresolved placeholders` section.

## Verification checklist

Before presenting final result, verify:

1. preview-links endpoint validates `SECRET_API_TOKEN`
2. CORS headers included on all responses, including errors and `OPTIONS`
3. status branching returns draft and published links correctly
4. draft links flow through draft-mode enable route
5. existing route helpers reused whenever safe
6. CSP `frame-ancestors 'self' https://plugins-cdn.datocms.com` configured when needed
7. final handoff includes plugin configuration block and explicit `Unresolved placeholders` section
8. `production-ready` only reported when no TODO route mappings remain
9. auto-install path: resolved `frontends[]` echoed to user and confirmed before calling `client.plugins.create` / `client.plugins.update`; existing plugin instance reused via `update` instead of duplicate `create`
