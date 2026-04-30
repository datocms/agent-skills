_Internal recipe for `datocms-setup`. Use this file only after the parent skill selects the `content-link` recipe and queues any prerequisites from `../../../references/recipe-manifest.json`._

# DatoCMS Content Link Setup

You are an expert at setting up DatoCMS Content Link — click-to-edit overlays that let editors click any element on the draft site to jump directly to the corresponding field in DatoCMS.

Follow these steps in order. Do not skip steps.

---

## Step 1: Detect Context (silent)

Silently examine the project:

Follow the shared repo inspection conventions in `../../../references/repo-conventions.md`, then inspect the recipe-specific signals below.

1. **Framework and file layout** — use `../../../references/repo-conventions.md` for supported framework detection, `src/` usage, and the standard layout or route locations used by this setup.

2. **Prerequisite: Draft mode** — Check if the draft mode enable endpoint exists:
   - Next.js: `src/app/api/draft-mode/enable/route.ts` or `app/api/draft-mode/enable/route.ts`
   - Nuxt: `server/api/draft-mode/enable.ts`
   - SvelteKit: `src/routes/api/draft-mode/enable/+server.ts`
   - Astro: `src/pages/api/draft-mode/enable/index.ts` or `src/pages/api/draft-mode/enable.ts`

3. **Existing executeQuery wrapper** — Find the shared `executeQuery` function. Check whether it already passes `contentLink` and `baseEditingUrl` options.

4. **Root layout file** — Find the root layout:
   - Next.js: `src/app/layout.tsx` or `app/layout.tsx`
   - Nuxt: `app.vue` or `layouts/default.vue`
   - SvelteKit: `src/routes/+layout.svelte`
   - Astro: `src/layouts/Layout.astro` or similar

5. **Existing preview/editor wiring** — Inspect whether the repo already has:
   - Web Previews endpoints or helpers
   - real-time preview wiring
   - any existing visual-editing or stega-specific helpers

6. **Vercel conflict signals** — Look for signs that the repo already uses Vercel Content Link / Edit Mode, such as:
   - `@vercel/stega`, `@vercel/toolbar`, or related packages
   - Vercel preview-specific visual-editing headers
   - `data-vercel-edit-target` usage
   - existing Edit Mode helpers or clearly named Vercel content-link utilities

7. **Structured Text renderers** — Inspect whether the repo already renders Structured Text with `react-datocms`, `vue-datocms`, `@datocms/svelte`, or `@datocms/astro`.

8. **Non-text Dato field rendering** — Inspect whether the repo already renders Dato-backed numbers, booleans, dates, or JSON-derived values that may need explicit edit URLs.

9. **Existing CSP config** — Check if `frame-ancestors` CSP is already configured.

10. **Installed deps** — Check `package.json` for: `@datocms/content-link`, `react-datocms`, `vue-datocms`, `@datocms/svelte`, `@datocms/astro`.

### Stop conditions

- If draft mode does not exist, record `draft-mode` as a prerequisite and continue after it is applied. Do not tell the user to run another recipe manually.
- If `executeQuery` already has `contentLink: 'v1'` and `baseEditingUrl`, inspect the existing setup first and update it in place by default.
- If the repo already has Vercel overlay wiring, do not layer Dato overlays on top of it without resolving the conflict first.

---

## Step 2: Ask Questions

Follow the zero-question default and question-format rules in `../../../patterns/MANDATORY_RULES.md`.

Only ask if one of these high-impact ambiguities remains after inspection:

1. **Vercel conflict** — The repo appears to already use Vercel Content Link / Edit Mode and this recipe was selected directly rather than through an earlier visual-editing bundle decision.

   Ask one conflict-resolution question:

   > "This repo already appears to use Vercel Content Link / Edit Mode. Do you want me to preserve that setup, replace it with DatoCMS Content Link, or switch to the full DatoCMS visual-editing workflow with Web Previews? Recommended default: preserve the existing Vercel setup unless you explicitly want DatoCMS side-by-side editing. If you skip, I'll preserve the existing Vercel overlays and avoid duplicate overlays."

2. **Renderer ownership** — Multiple competing layout or Content Link mounting points exist and it is genuinely unclear which one owns the production preview shell.

   Ask one question:

   > "This repo already has more than one possible preview shell. Which layout or wrapper should own the Content Link mount? Recommended default: preserve the most central draft-aware shell already used by the preview flow. If you skip, I'll patch that strongest existing owner and list alternative shells under unresolved placeholders."

If neither ambiguity applies, proceed directly.

---

## Step 3: Load References

Read the relevant reference files. Load only what is needed.

**Always load:**

- `../../../../datocms-frontend-integrations/references/visual-editing-concepts.md`
- `../../../../datocms-frontend-integrations/references/content-link-concepts.md`

**Load per framework — focus on the `## Content Link (Optional)` section:**

| Framework | Reference file |
| - | - |
| Next.js | `../../../../datocms-frontend-integrations/references/nextjs.md` |
| Nuxt | `../../../../datocms-frontend-integrations/references/nuxt.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/sveltekit.md` |
| Astro | `../../../../datocms-frontend-integrations/references/astro.md` |

**Load the framework-appropriate component reference:**

| Framework | Component reference |
| - | - |
| Next.js (React) | `../../../../datocms-frontend-integrations/references/react-content-link.md` |
| Nuxt (Vue) | `../../../../datocms-frontend-integrations/references/vue-content-link.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/svelte-content-link.md` |
| Astro | `../../../../datocms-frontend-integrations/references/astro-content-link.md` |

---

## Step 4: Modify executeQuery

Modify the existing `executeQuery` wrapper to add DatoCMS Content Link support when in draft mode:

- Add `contentLink: 'v1'` to the query options when `includeDrafts` is true
- Add `baseEditingUrl` (from environment variables) to the query options when `includeDrafts` is true
- Preserve any existing draft-mode or preview-specific options instead of rewriting them
- If the repo already uses Vercel visual-editing headers, do not keep both systems active at once

**Environment variable for `baseEditingUrl`:**

- Next.js: `DATOCMS_BASE_EDITING_URL`
- Nuxt: `NUXT_PUBLIC_DATOCMS_BASE_EDITING_URL`
- SvelteKit: `PRIVATE_DATOCMS_BASE_EDITING_URL`
- Astro: `DATOCMS_BASE_EDITING_URL`

Read the existing `executeQuery` file first, then make targeted modifications.

---

## Step 5: Generate or Patch the Content Link shell

Generate or patch the Content Link component with framework-specific router integration:

### Next.js (React)

- Create or patch a `ContentLink` client component that wraps the DatoCMS implementation
- Wire `onNavigateTo` to Next.js `router.push()`
- Wire `currentPath` to `usePathname()`
- Prefer a touch-safe default such as `enableClickToEdit={{ hoverOnly: true }}` unless the repo already uses a different convention

### Nuxt (Vue)

- Create or patch a `ContentLink` component using `vue-datocms`
- Wire `on-navigate-to` to `navigateTo()`
- Wire `current-path` to `useRoute().path`

### SvelteKit

- Create or patch a `ContentLink` component using `@datocms/svelte`
- Wire `onNavigateTo` to `goto`
- Wire `currentPath` to `$page.url.pathname`

### Astro

- Use `<ContentLink />` from `@datocms/astro/ContentLink`
- Keep the Astro API limited to the documented props
- Do not add React-style router props

### Root layout placement

- Add `<ContentLink />` to the root layout only when draft mode is active
- Reuse the existing preview shell if one already exists

---

## Step 6: Patch Structured Text and non-text edit targets when they already exist

When the repo already renders Structured Text, patch the existing renderer to follow the documented Content Link rules:

- wrap the main Structured Text container with `data-datocms-content-link-group`
- add `data-datocms-content-link-boundary` around embedded blocks and inline records so they open their own editor instead of bubbling to the parent field
- reuse the existing renderer/component structure instead of inventing a parallel one

When the repo already renders non-text Dato-backed values and the current query/data flow can safely support it:

- prefer explicit edit URLs based on `_editingUrl`
- attach those edit URLs to the existing rendered element instead of introducing decorative wrappers
- only expand the GraphQL/query shape when the repo clearly has a stable place to consume `_editingUrl`

Do not fabricate new query surfaces just to demonstrate the pattern.

---

## Step 7: Add CSP header

If not already configured, add this Content Security Policy header:

```text
frame-ancestors 'self' https://plugins-cdn.datocms.com
```

This is required for DatoCMS Web Previews / side-by-side visual editing.

---

## Step 8: Install dependencies

Install missing packages:

| Package | When |
| - | - |
| `@datocms/content-link` | Always (if not already installed) |

The framework-specific component library (`react-datocms`, `vue-datocms`, `@datocms/svelte`, `@datocms/astro`) should already be installed or will be installed here if missing.

Use the project's package manager (see `../../../patterns/MANDATORY_RULES.md`).

---

## Step 9: Environment variables

Add the base editing URL placeholder to env files when it is missing:

- Next.js: `DATOCMS_BASE_EDITING_URL=https://your-project.admin.datocms.com/environments/main`
- Nuxt: `NUXT_PUBLIC_DATOCMS_BASE_EDITING_URL=https://your-project.admin.datocms.com/environments/main`
- SvelteKit: `PRIVATE_DATOCMS_BASE_EDITING_URL=https://your-project.admin.datocms.com/environments/main`
- Astro: `DATOCMS_BASE_EDITING_URL=https://your-project.admin.datocms.com/environments/main`

Only add variables that do not already exist.

---

## Step 10: Final handoff

After generating all files, tell the user:

1. the base editing URL that still needs a real value, if any
2. whether Structured Text or non-text edit-target patches were applied
3. whether the repo kept an existing Vercel overlay flow or switched fully to DatoCMS Content Link
4. the optional follow-up recipe ids that still make sense: `web-previews`, `realtime`, or `visual-editing`

Follow the shared final handoff rules in `../../../patterns/OUTPUT_STATUS.md`, including an explicit `Unresolved placeholders` section.

---

## Mandatory rules for all generated code

### TypeScript

Follow the TypeScript rules in `../../../patterns/MANDATORY_RULES.md`.

### File conflicts

Follow the file conflict rules in `../../../patterns/MANDATORY_RULES.md`.

### Overlay exclusivity

Never enable DatoCMS Content Link and Vercel Content Link overlays simultaneously.

---

## Verification checklist

Before presenting the final code, verify:

1. `executeQuery` has `contentLink: 'v1'` and `baseEditingUrl` when `includeDrafts` is true
2. the Content Link component is created or patched with the correct framework-specific router integration
3. `<ContentLink />` is added to the root layout only when draft mode is active
4. CSP `frame-ancestors 'self' https://plugins-cdn.datocms.com` is configured when needed
5. Structured Text renderers are patched with group/boundary handling when they already exist in the repo
6. non-text edit URLs use `_editingUrl` only when the repo has a safe place to consume them
7. Dato overlays and Vercel overlays are never left active at the same time
8. the final handoff includes an explicit `Unresolved placeholders` section
