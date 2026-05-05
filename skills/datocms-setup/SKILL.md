---
name: datocms-setup
description: >-
  Single entry point for one-shot, end-to-end DatoCMS project setup
  orchestration — the only skill that bundles prerequisites, chains related
  recipes, and takes a greenfield or partially configured project to a
  working state in one pass. Covers five setup lanes: (1) frontend foundation
  (bootstrap a new Next.js/Nuxt/SvelteKit/Astro integration from scratch);
  (2) frontend features (draft mode, visual editing, web previews, content
  link, real-time updates, responsive images, SEO, robots/sitemaps, site
  search, revalidation/cache tags — applied together with their
  prerequisites); (3) migrations (CLI profiles, baseline migrations, shared
  histories, release workflow, sandbox reset loops, diff-based generation);
  (4) onboarding imports (WordPress, Contentful — content plus assets);
  (5) platform automation (CMA scripting patterns and project-level
  automation). Use when the user wants a named outcome scaffolded in full
  rather than a single file patched, when multiple related features need to
  land together (e.g. "set up visual editing" implies draft mode + content
  link + web previews), or when the request is a broad "set up X" that needs
  routing to the smallest matching recipe bundle.
disable-model-invocation: true
---

# DatoCMS Setup

Public setup entrypoint. Keep surface small, inspect repo first, load only needed internal recipe files.

## Workflow

1. Inspect repo silently before asking, follow `references/repo-conventions.md` + `patterns/MANDATORY_RULES.md`.
2. **Greenfield gate** — if no `package.json` and no `datocms.config.json`, ask link-vs-create per `patterns/MANDATORY_RULES.md` § Project link or create before any recipe selection. On "create" → wait for confirmation, queue `datocms-content-modeling` before any frontend recipe.
3. Read `references/router.md`.
4. Read `references/recipe-manifest.json`, pick smallest recipe/bundle for request.
5. Use targeted mode for clear setup outcomes. Discovery mode only for broad/ambiguous:
   - **Stage A**: pick setup lane.
   - **Stage B**: ask smallest setup-specific follow-up only when repo inspection leaves high-impact decision unresolved.
6. Queue prerequisites from manifest before dependents. Never tell user to invoke separate setup skill.
   - `visual-editing`: always apply `draft-mode` + `content-link`.
   - Add `web-previews` unless user wants website-only click-to-edit.
   - Add `realtime` only if user asks or confirms in Stage B.
   - **Project baseline (TypeScript projects)**: queue `cma-types` alongside `cli-bootstrap` for any greenfield or first-time DatoCMS+TS setup. Default for a fully typed CMA experience; not opt-in.
7. Load only selected `recipes/<group>/<recipe>/recipe.md`, shared setup references, sibling-skill references.
8. Create todo list — one task per queued recipe + prerequisite, plus discrete sub-steps within each recipe (file edits, installs, env vars, verification). Mark complete as you go, never batch. Setup bundles always have many steps; todos keep progress visible and recoverable.
9. Schema/modeling intent (add models, edit fields, design taxonomy) → `datocms-content-modeling`. Don't improvise schema here.
10. Patch existing code in-place by default.
11. End with `patterns/OUTPUT_STATUS.md`: report `scaffolded` vs `production-ready`, summarize recipes, list unresolved placeholders.

## Rules

- Don't load every recipe upfront.
- Don't use external setup bundles. Prefer sibling DatoCMS skill references over copies.
- Treat `draft-mode`, `web-previews`, `visual-editing`, `migration-release-workflow` as internal labels.
- Apply shared foundation once if outcomes overlap.
- Broad setup: ask compact Stage A, execute minimal bundle.
- Stage B only for unresolved high-impact decisions repo can't answer.
- Migration-heavy: ask smallest extra follow-up to separate baseline, profiles, histories, helpers, resets, diffs.
- Report `scaffolded` when recipe depends on placeholders/provider choices/routes/ownership repo couldn't resolve.
- Report `production-ready` only when no unresolved customer-specific values remain.
- End by summarizing used recipes and available follow-up ids inside `datocms-setup`.
