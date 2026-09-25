---
name: datocms-setup
description: >-
  Guided DatoCMS setup: inspects the project, asks only what it can't infer,
  proposes a plan with prerequisites, and changes nothing until the user
  agrees. For setting DatoCMS up in a site or repo (previews and visual
  editing, caching, content rendering, SEO, search, CLI and migrations,
  releases, multi-project sync, webhooks, build triggers, WordPress or
  Contentful imports) or starting a new DatoCMS site. Use when the user wants
  something set up end to end or wants to be walked through it; a single,
  already-specified code change belongs to the owning DatoCMS skill.
---

# DatoCMS Setup

Guided setup. This skill owns the conversation: goal, questions, plan, order, consent, handoff. Implementation lives in the sibling DatoCMS skills; each play links the exact files and sections to follow. Load those, never improvise from memory. Missing sibling skill → ask the user to install the full `datocms/agent-skills` bundle.

## Rules

- **Plan first: no edits in the turn that starts setup.** Inspect read-only, then reply with the plan (or the questions it needs) and stop. Instructions about what to build, however exact (files, paths, steps, "leave X as it is"), are the request, not permission to skip the plan. Only an explicit waiver of the plan in the user's words ("go ahead without confirming", "skip the plan") lets you build in the same turn: state the plan, then proceed within that scope. Otherwise build after the user replies agreeing. Live changes still need their own approval.
- **Scope lock.** Build only the agreed plan. A new need → stop, explain, ask.
- **Live changes.** Writes to a DatoCMS project (plugins, webhooks, build triggers, roles, tokens, search indexes, migration runs, environment fork/promote/destroy, maintenance mode, imports) or an external service (deploys, crawls) run only when the user approved that exact operation and target, in the plan or directly. Otherwise leave them as reviewable code (migration, script) or dashboard steps. Route and authentication: **datocms-cma** and **datocms-cli**; an approved live read or write without a working route (MCP connection or linked CLI) queues Connect the repo.
- **Ask, don't assume.** Every reply before building ends with the question the user must answer. Talk in outcomes; this skill's play names, reference files and step numbers stay internal (the repo's own files belong in the plan).

## Flow

1. **Inspect (read-only, silent).** `package.json` (framework: `next`, `nuxt`, `@sveltejs/kit`, `astro`; DatoCMS packages; `datocms` CLI), package manager from lockfile (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lock`/`bun.lockb` → bun, else npm), source layout (`src/`, Nuxt `app/`), env files (names only, never print values), `datocms.config.json` and migrations directory, existing DatoCMS code (query helper, draft/preview routes, webhook handlers, CI jobs). Never ask what the repo answers.
2. **Goal.** No `package.json` and a website goal → **New site** below first. Clear request → step 3. Unclear ("set up DatoCMS") → ask what they want: 2–4 outcomes fitted to the repo, each with one sentence on the result. An unanswered goal has no default: wait.
3. **Plays.** Pick from the table below; read only those sections of the play file. Queue each play's **Needs** unless the repo already has them; shared pieces once.
4. **Questions.** Only **Ask** items still open after inspection and the user's own words; one grouped question; recommended option first; say what skipping does. A skipped implementation question takes the recommended default, recorded in the handoff.
5. **Plan, then stop.** Show: plays in order; files to add or patch; packages; env vars; every change to DatoCMS or an external service, listed separately; what stays a placeholder. End the turn asking whether to proceed or what to change.
6. **Build** after agreement. Plan order; follow each play's **Build** links; patch existing code in place; track steps as todos.
7. **Hand off.** `production-ready` only when real values are wired and the result was exercised end to end (websites: serve and load a real page and the preview flow, not just build); otherwise `scaffolded`. List every open value under **Unresolved placeholders** (or "none"). Summarize what changed; **Test it**: 1–3 concrete steps from the play's **Verify**, using the real routes and env var names; offer next outcomes in plain language.

## Plays

| Outcome | Play | File |
| - | - | - |
| Site reads DatoCMS content, optionally with typed queries | Connect the site | [website.md](references/website.md) |
| Draft previews, preview inside DatoCMS, click-to-edit, live updates | Previews and visual editing | [website.md](references/website.md) |
| Published pages refresh when content changes | Fresh published content | [website.md](references/website.md) |
| Images, Structured Text, video rendered from DatoCMS | Render content | [website.md](references/website.md) |
| SEO tags, canonical URLs, robots.txt, sitemap | SEO and crawling | [website.md](references/website.md) |
| Search page powered by DatoCMS Site Search | Site search | [website.md](references/website.md) |
| CLI installed and repo linked to the project | Connect the repo | [project.md](references/project.md) |
| Typed CMA code and preview route mapping | Typed CMA code | [project.md](references/project.md) |
| Versioned schema changes | Schema migrations | [project.md](references/project.md) |
| Release schema changes to production | Release migrations | [project.md](references/project.md) |
| One repo driving several DatoCMS projects | Several projects | [project.md](references/project.md) |
| DatoCMS calls other systems or starts deploys | Webhooks and build triggers | [project.md](references/project.md) |
| Content moved in from WordPress or Contentful | Imports | [project.md](references/project.md) |

Schema design (models, fields, blocks) is decided with **datocms-content-modeling** and implemented through a migration or **datocms-cma**; setup never invents schema.

## New site

No app yet (no `package.json`) and a website goal, before any play:

1. Framework unknown → ask: Next.js, Nuxt, SvelteKit or Astro.
2. Always offer the official starter next to scaffolding; recommend it for a new project. It ships draft mode, Web Previews, Content Link, real-time updates and typed queries. Its Marketplace page creates a new DatoCMS project with the starter's schema and sample content (and can deploy it); the GitHub repo is the code. Existing project with its own schema → say the starter's queries won't match it, so the starter serves as a reference there.

   | Framework | GitHub | Marketplace |
   | - | - | - |
   | Next.js | <https://github.com/datocms/nextjs-starter-kit> | <https://www.datocms.com/marketplace/starters/next-js-starter-kit> |
   | Nuxt | <https://github.com/datocms/nuxt-starter-kit> | <https://www.datocms.com/marketplace/starters/nuxt-starter-kit> |
   | SvelteKit | <https://github.com/datocms/sveltekit-starter-kit> | <https://www.datocms.com/marketplace/starters/sveltekit-starter-kit> |
   | Astro | <https://github.com/datocms/astro-starter-kit> | <https://www.datocms.com/marketplace/starters/astro-starter-kit> |
3. Starter chosen → guide creating it from the Marketplace page (or cloning the repo against a project created from it) and filling its env vars; no plays needed.
4. Scaffold chosen → after the plan is agreed, create the app with the framework's own generator, then continue with website plays.

## Project

Implementation needs a DatoCMS project and none is known → ask (header "Project"): "Do you already have a DatoCMS project, or should we create a new one?" Options: link existing (first), create new. Neither is recommended. Create → the user creates it at <https://dashboard.datocms.com/> and confirms; then **Connect the repo**, then schema design, then website plays.

## Questions

Use the harness's structured question tool when available and allowed, following its real schema and limits: short header, options with one-sentence outcomes, `(Recommended)` only when justified, multi-select only for compatible choices. No tool → numbered plain-text list. Can't ask (non-interactive run) → do only work that doesn't depend on the answer and report what's missing.
