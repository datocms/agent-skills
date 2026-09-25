_Internal recipe for `datocms-setup`. Use this file only after the parent skill selects the `draft-mode` recipe and queues any prerequisites from `../../../references/recipe-manifest.json`._

# DatoCMS Draft Mode Setup

## Contents

- Step 1: Detect Context (silent)
- Step 2: Ask Questions
- Step 3: Load References
- Step 4: Generate Code
- Step 5: Install Dependencies
- Step 6: Environment Variables
- Step 7: Final handoff
- Verification Checklist

## Step 1: Detect Context (silent)

1. **Existing draft mode** — Check if draft endpoints already exist:
   - Next.js: `src/app/api/draft-mode/enable/route.ts` or `app/api/draft-mode/enable/route.ts`
   - Nuxt: `server/api/draft-mode/enable.ts`
   - SvelteKit: `src/routes/api/draft-mode/enable/+server.ts`
   - Astro: `src/pages/api/draft-mode/enable/index.ts` or `src/pages/api/draft-mode/enable.ts`

2. **Existing executeQuery wrapper** — Search for an existing `executeQuery` function that wraps `@datocms/cda-client`

3. **Installed deps** — Check `package.json` against the selected framework reference's Core Dependencies before installing missing packages

4. **Env files** — Check `.env`, `.env.local`, `.env.example` for existing DatoCMS tokens

### Stop conditions

- If draft endpoints already exist, inspect the current implementation first and update it in place by default. Only ask about full replacement if the existing setup is materially different, clearly broken, or the user requested a clean rewrite.

## Step 2: Ask Questions

Only ask if inspecting an existing draft-mode setup leaves one high-impact ambiguity around which existing endpoint, cookie helper, or shared query wrapper should remain the source of truth.

Recommended default: preserve the most central working draft-aware wrapper or endpoint already used by the live preview flow. If the user skips, patch that strongest existing owner in place and list any alternative owners under `Unresolved placeholders`.

## Step 3: Load References

**Always load:**

- `../../../../datocms-frontend-integrations/references/draft-mode-concepts.md`

**Load per framework — focus on the `## Core` section:**

| Framework | Reference file |
| - | - |
| Next.js | `../../../../datocms-frontend-integrations/references/nextjs.md` |
| Nuxt | `../../../../datocms-frontend-integrations/references/nuxt.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/sveltekit.md` |
| Astro | `../../../../datocms-frontend-integrations/references/astro.md` |

## Step 4: Generate Code

Create all files following the patterns in the loaded references. Generate:

### Files to generate

1. **Enable endpoint** — Validates `SECRET_API_TOKEN`, sets draft mode cookie, redirects to the requested page
2. **Disable endpoint** — Removes draft mode cookie (no auth required), redirects back
3. **Utilities** — CORS headers helper, generic error handling using `serialize-error`, and `isRelativeUrl()` for redirect validation
4. **executeQuery wrapper** — Wraps `@datocms/cda-client` with:
   - `includeDrafts` option that switches between published and draft CDA tokens
   - `excludeInvalid: true` always set
   - Dual-token architecture (published token for production, draft token for preview)

### Mandatory rules for all generated code

#### Security

- All secrets come from environment variables — never hardcode them
- Validate the `SECRET_API_TOKEN` query parameter on the enable endpoint
- No authentication required on the disable endpoint
- Use the framework reference's `isRelativeUrl()` helper on the decoded redirect parameter before redirecting that same value. Preserve relative destinations; reject absolute URLs, protocol-relative URLs, backslashes, and control characters. Do not substitute a successful `new URL(path, base)` parse for validation

#### Cookie Attributes

- `partitioned: true` — Required for CHIPS (third-party cookie partitioning)
- `sameSite: 'none'` — Required because DatoCMS loads the preview in an iframe
- `secure: true` — Required when `sameSite` is `'none'`

#### Framework-Specific Patterns

- Use the framework's native env access pattern:
  - Next.js: `process.env`
  - Nuxt: `useRuntimeConfig()`
  - SvelteKit: `$env/dynamic/private`
  - Astro: `astro:env/server`
- Use the framework's native redirect and response mechanisms
- Non-Next.js frameworks: keep the reference's JWT signing/verification helper server-only. Nuxt Vue components use `useDraftMode` with `jwt-decode`; they must not import the Node-only signing helper

#### Env var naming conventions

Use the exact names in Step 6 and the selected framework reference's runtime configuration. Next.js uses built-in draft mode and does not need a JWT signing secret. Keep draft-token configuration, signing secrets, and endpoint authentication secrets out of public runtime configuration; Nuxt exposes only the published CDA token there.

## Step 5: Install Dependencies

Install missing packages from the selected framework reference's Core Dependencies:

| Package | When |
| - | - |
| `@datocms/cda-client` | Always (if not already installed) |
| `serialize-error` | Always (if not already installed) |
| `jsonwebtoken` | Non-Next.js reference cookie helpers (for JWT signing/verification) |
| `@types/jsonwebtoken` | Non-Next.js reference cookie helpers (dev dependency) |
| `jwt-decode` | Nuxt's client-side `useDraftMode` composable |

## Step 6: Environment Variables

Add placeholder values to `.env.example` (create if it doesn't exist) and `.env.local` (or `.env` depending on framework convention):

### Next.js

```
DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=your_published_token_here
DATOCMS_DRAFT_CONTENT_CDA_TOKEN=your_draft_token_here
SECRET_API_TOKEN=your_secret_webhook_token_here
```

### Nuxt

```
NUXT_PUBLIC_DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=your_published_token_here
NUXT_DATOCMS_DRAFT_CONTENT_CDA_TOKEN=your_draft_token_here
NUXT_SECRET_API_TOKEN=your_secret_webhook_token_here
NUXT_SIGNED_COOKIE_JWT_SECRET=run_openssl_rand_hex_32
NUXT_PUBLIC_DRAFT_MODE_COOKIE_NAME=datocms-draft-mode
```

### SvelteKit

```
PRIVATE_DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=your_published_token_here
PRIVATE_DATOCMS_DRAFT_CONTENT_CDA_TOKEN=your_draft_token_here
PRIVATE_SECRET_API_TOKEN=your_secret_webhook_token_here
PRIVATE_SIGNED_COOKIE_JWT_SECRET=run_openssl_rand_hex_32
PUBLIC_DRAFT_MODE_COOKIE_NAME=datocms-draft-mode
```

### Astro

```
DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=your_published_token_here
DATOCMS_DRAFT_CONTENT_CDA_TOKEN=your_draft_token_here
SECRET_API_TOKEN=your_secret_webhook_token_here
SIGNED_COOKIE_JWT_SECRET=run_openssl_rand_hex_32
DRAFT_MODE_COOKIE_NAME=datocms-draft-mode
```

Only add variables that don't already exist. Preserve any existing values.

## Step 7: Final handoff

After generating all files, tell the user:

1. which draft-mode files were created or reused
2. which env vars still need real values, if any
3. whether the result is `scaffolded` or `production-ready`
4. the optional follow-up recipe ids that still make sense:
   - `visual-editing` when they want the full editorial preview stack
   - `web-previews` for preview links and the Visual tab
   - `content-link` for click-to-edit overlays
   - `realtime` for live draft-session updates

Treat the result as `scaffolded` if any token or secret still uses placeholders or if wrapper ownership stayed ambiguous. Report `production-ready` only when the generated or patched draft-mode flow uses intentional repo values and no ownership ambiguity remains.

## Verification Checklist

Before presenting the final code, verify:

1. Enable endpoint validates `SECRET_API_TOKEN`
2. Enable and disable endpoints validate redirect URLs with `isRelativeUrl()`
3. Cookies have `partitioned: true`, `sameSite: 'none'`, `secure: true`
4. `executeQuery` supports `includeDrafts` with token switching
5. Non-Next.js frameworks use JWT for the draft mode cookie
6. All secrets come from environment variables
7. Disable endpoint does NOT require authentication
8. All generated TypeScript follows the mandatory rules (no `as unknown as`, inferred types, `import type`)
