---
name: datocms-setup
description: >-
  Single entry point for one-shot, end-to-end DatoCMS project setup — bundles
  prerequisites, chains recipes, takes a greenfield or partial project to
  working state in one pass. Five lanes: (1) frontend foundation (bootstrap
  Next.js/Nuxt/SvelteKit/Astro from scratch); (2) frontend features (draft
  mode, visual editing, web previews, content link, real-time updates,
  responsive images, SEO, robots/sitemaps, site search, revalidation/cache
  tags — applied with prerequisites); (3) migrations (CLI profiles, baseline
  migrations, shared histories, release workflow, sandbox reset loops,
  diff-based generation); (4) onboarding imports (WordPress, Contentful —
  content + assets); (5) platform automation (CMA scripting + project-level
  automation). Use when user wants a named outcome scaffolded in full, when
  related features must land together (e.g. "set up visual editing" → draft
  mode + content link + web previews), or for broad "set up X" needing
  routing to the smallest matching recipe bundle.
disable-model-invocation: true
---

# DatoCMS Setup

Public setup entrypoint. Keep surface small, inspect repo first, load only needed internal recipe files.

## Workflow

1. Inspect repo silently before asking, follow `references/repo-conventions.md` + `patterns/MANDATORY_RULES.md`.
2. **Greenfield gate** — if no `package.json` and no `datocms.config.json`, ask link-vs-create per `patterns/MANDATORY_RULES.md` § Project link or create before any recipe selection. On "create" → wait for confirmation, queue `datocms-content-modeling` before any frontend recipe. Frontend-framework targets — surface official DatoCMS tech starter before scaffolding (see **Tech Starters**). User picks starter → guide clone + env vars only, skip all recipe scaffolding.
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

## Tech Starters

Official DatoCMS tech starters ship with draft mode, Web Previews, Content Link, real-time updates, typed GraphQL queries. Always offer one for greenfield frontend — scaffolding from scratch is redundant, inferior.

| Framework | GitHub | Marketplace |
| - | - | - |
| Next.js | <https://github.com/datocms/nextjs-starter-kit> | <https://www.datocms.com/marketplace/starters/next-js-starter-kit> |
| Nuxt | <https://github.com/datocms/nuxt-starter-kit> | <https://www.datocms.com/marketplace/starters/nuxt-starter-kit> |
| SvelteKit | <https://github.com/datocms/sveltekit-starter-kit> | <https://www.datocms.com/marketplace/starters/sveltekit-starter-kit> |
| Astro | <https://github.com/datocms/astro-starter-kit> | <https://www.datocms.com/marketplace/starters/astro-starter-kit> |

**Flow:**

1. Identify framework from user request or Stage A question.
2. Surface starter: _"This directory is empty. The official DatoCMS \[Framework] starter already includes draft mode, Web Previews, Content Link, and real-time updates. Do you want to start from it, or scaffold from scratch?"_
3. **User picks starter** → guide `git clone <repo>`, fill env vars, stop — skip all recipe scaffolding.
4. **User declines** → continue from Workflow step 3.

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
