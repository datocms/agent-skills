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

This is the single public setup entrypoint for DatoCMS project scaffolding.
Keep the public surface small, inspect the repo first, and load only the
internal recipe files needed for the user's requested outcome.

## Workflow

1. Silently inspect the repo before asking questions, following `references/repo-conventions.md` and the shared rules in `patterns/MANDATORY_RULES.md`.
2. Read `references/router.md`.
3. Read `references/recipe-manifest.json` and select the smallest recipe or internal bundle that satisfies the request.
4. Use targeted mode when the request clearly names a setup outcome. Use discovery mode only when the request is broad or ambiguous:
   - **Stage A** picks the setup lane.
   - **Stage B** asks the smallest setup-specific follow-up only when repo inspection still leaves a high-impact decision unresolved.
5. Queue prerequisites from the manifest before dependent recipes. Never tell the user to invoke another setup skill separately.
   - For `visual-editing`, always apply `draft-mode` and `content-link`.
   - Add `web-previews` unless the user explicitly wants website-only click-to-edit.
   - Add `realtime` only when the user explicitly asks for live updates or confirms them in the Stage B follow-up.
6. Load only the selected `recipes/<group>/<recipe>/recipe.md` files, the shared setup references they call for, and the sibling-skill references they point to.
7. Patch existing project code in place by default instead of rewriting working implementations.
8. End with the shared handoff contract in `patterns/OUTPUT_STATUS.md`: report `scaffolded` vs `production-ready`, summarize the selected recipes, and list unresolved placeholders explicitly.

## Rules

- Do not load every recipe up front.
- Do not reference or depend on any external setup bundles. Prefer sibling DatoCMS skill references over copied duplicates when a recipe reuses existing documentation.
- Treat recipe ids such as `draft-mode`, `web-previews`, `visual-editing`, and `migration-release-workflow` as internal orchestration labels.
- If several requested outcomes share a foundation, apply that foundation once and continue through the queued recipes.
- If the user asks for broad setup, ask one compact grouped Stage A clarification pass, then execute the minimal recipe bundle.
- Use Stage B only for unresolved, high-impact setup decisions that the repo cannot answer safely.
- For migration-heavy requests, ask the smallest extra grouped follow-up needed to separate baseline migrations, named profiles, shared histories, release helpers, sandbox reset loops, and diff-based generation.
- Report `scaffolded` when a recipe still depends on placeholders, provider choices, route mappings, or unresolved ownership the repo could not resolve automatically.
- Report `production-ready` only when the selected recipe no longer depends on unresolved customer-specific values.
- End by summarizing which internal recipes were used and which optional follow-up recipe ids are available inside `datocms-setup`.
