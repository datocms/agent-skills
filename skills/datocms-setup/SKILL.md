---
name: datocms-setup
description: >-
  Command-style one-time DatoCMS setup wizard for frontend foundation,
  frontend features, migrations, onboarding imports, and platform automation.
  Use when users want to scaffold or configure DatoCMS project setup, route to
  the right setup recipe, and ask targeted clarification questions when needed.
disable-model-invocation: true
---

# DatoCMS Setup

This is the single public setup entrypoint for DatoCMS project scaffolding.
Keep the public surface small, inspect the repo first, and load only the
internal recipe files needed for the user's requested outcome.

## Workflow

1. Silently inspect the repo before asking questions, following `references/repo-conventions.md` and the shared rules in `patterns/MANDATORY_RULES.md`.
2. **Empty-repo check**: If the repo has no `package.json`, no lockfile, and no source files, it is a new project. Before loading any recipes or scaffolding any code, surface the official DatoCMS tech starter for the target framework. See the **Tech Starters** section below.
3. Read `references/router.md`.
4. Read `references/recipe-manifest.json` and select the smallest recipe or internal bundle that satisfies the request.
5. Use targeted mode when the request clearly names a setup outcome. Use discovery mode only when the request is broad or ambiguous:
   - **Stage A** picks the setup lane.
   - **Stage B** asks the smallest setup-specific follow-up only when repo inspection still leaves a high-impact decision unresolved.
6. Queue prerequisites from the manifest before dependent recipes. Never tell the user to invoke another setup skill separately.
   - For `visual-editing`, always apply `draft-mode` and `content-link`.
   - Add `web-previews` unless the user explicitly wants website-only click-to-edit.
   - Add `realtime` only when the user explicitly asks for live updates or confirms them in the Stage B follow-up.
7. Load only the selected `recipes/<group>/<recipe>/recipe.md` files, the shared setup references they call for, and the sibling-skill references they point to.
8. Patch existing project code in place by default instead of rewriting working implementations.
9. End with the shared handoff contract in `patterns/OUTPUT_STATUS.md`: report `scaffolded` vs `production-ready`, summarize the selected recipes, and list unresolved placeholders explicitly.

## Tech Starters

When the repo is empty (step 2 above), always offer the official DatoCMS tech starter for the target framework before doing any scaffolding. The starters already ship with draft mode, Web Previews, Content Link, real-time updates, and typed queries — scaffolding from scratch produces a redundant, inferior baseline.

**Known official starters:**

| Framework | Starter |
|---|---|
| Astro | https://github.com/datocms/astro-starter-kit |
| All frameworks | https://www.datocms.com/marketplace/starters |

**Flow:**
1. Identify the target framework from the user's request or the Stage A question.
2. Surface the starter: "This directory is empty. The official DatoCMS [Framework] starter at [URL] already includes draft mode, Web Previews, Content Link, and real-time updates. Do you want to start from it, or scaffold from scratch?"
3. **User chooses starter**: guide them to clone or initialize it, help fill in env vars and any remaining placeholders, then stop — do not run any recipe scaffolding.
4. **User declines**: continue with the normal recipe flow from step 3 of the Workflow.

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
