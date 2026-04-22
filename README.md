# DatoCMS Skills

A collection of agent skills that teach Claude, Codex, Cursor, and other coding
agents how to work effectively with [DatoCMS](https://www.datocms.com) — from
GraphQL queries and content management scripts to plugin development and
one-shot project setup.

All open source, installable in one step on every supported platform.

---

## What's covered

Most skills trigger **automatically** based on your prompt. The only one you
invoke explicitly is `datocms-setup` (see [Usage](#usage)). Together they
cover the full range of DatoCMS work:

- **Frontend integrations** — draft mode, Web Previews, Visual Editing and
  Content Link overlays, real-time preview subscriptions, cache-tag
  invalidation, SEO/robots/sitemap wiring, crawler-safe search — across
  Next.js App Router, Nuxt, SvelteKit, Astro, plus `react-datocms`,
  `vue-datocms`, `@datocms/svelte`, and `@datocms/astro`.
- **Reading content** — GraphQL against the Content Delivery API, with
  filters, pagination, localization, modular content, Structured Text,
  responsive images, SEO metadata, and typed queries (gql.tada / codegen).
- **Writing content & project automation** — record CRUD and bulk edits,
  CSV imports and exports, asset uploads, environment forks and promotions,
  webhooks and build triggers, roles and tokens, scheduled publish flows,
  audit logs.
- **CLI workflows** — CLI setup and profiles, migrations, schema-type
  generation, direct and typed CMA scripts, environment operations, CI/CD
  pipelines, WordPress/Contentful imports, plugin management.
- **Plugin development** — scaffolding new plugins with the Plugin SDK,
  maintaining existing ones (config screens, hooks, sidebars, pages, field
  extensions), and restyling plugin UI to feel native to the DatoCMS
  dashboard.
- **One-shot project setup** (explicit) — `datocms-setup` bootstraps draft
  mode, visual editing, migrations workflows, content imports, and similar
  multi-step flows in a single command.

For the full list of skill names, internal setup recipes, and routing rules
see [`docs/skill-catalog.md`](docs/skill-catalog.md).

---

## Install

The universal installer works on every supported agent — Claude Code, Codex,
Cursor, Copilot, Windsurf, and anything else that reads agent skills:

```bash
npx skills add datocms/llm-skills
```

This installs all skills via symlinks. Update later with:

```bash
npx skills update
```

For single-skill installs, scopes, and detached snapshots see
[`docs/install.md`](docs/install.md).

### Native plugin integration (Claude Code & Codex)

Claude Code and Codex ship with plugin systems that wrap the skills with
extras: namespaced invocation, auto-update from the plugin UI, and
discoverability through the marketplace. If you're on one of these agents and
want that integration, use the plugin install instead of `npx skills`.

**Claude Code**

```bash
/plugin marketplace add datocms/llm-skills
/plugin install datocms@datocms-skills
```

Skills are namespaced under the plugin (e.g. `/datocms:datocms-cda`). Enable
auto-update from `/plugin` → **Marketplaces** → `datocms-skills`, or update
manually with `claude plugin update datocms@datocms-skills`.

**Codex**

From a Codex session, open the plugin picker with `/plugins`, choose
**DatoCMS Local Plugins**, and install `datocms`. All skills are bundled.
Restart Codex if the marketplace doesn't appear on first open.

### Claude.ai

Upload each skill via **Customize → Skills** in
[claude.ai](https://claude.ai). Pre-built `.zip` files live in the
[`zips/`](zips/) folder — one per skill.

1. Go to **Customize → Skills**, click **+** → **Upload a skill**
2. Upload each `.zip` (e.g. `datocms-cda.zip`, `datocms-cma.zip`, …)

---

## Usage

### Automatic skills

You don't need to invoke the auto-triggered skills — describe what you want
in plain language and the right one activates:

- "Write a GraphQL query to fetch all blog posts with images"
- "How do I paginate past the 100-record limit?"
- "Add draft mode to my Next.js app"
- "Why isn't my Visual Editing overlay showing up?"
- "Create a migration that adds a `category` field to the blog_post model"
- "What's the safest way to run a migration in production?"
- "Bulk-publish all draft records of type `article`"
- "Publish them"
- "Fix those slugs"
- "Import this CSV into the authors model"
- "Make my plugin config screen match the DatoCMS style"
- "Create a new DatoCMS plugin from scratch"

### The setup skill (explicit)

`datocms-setup` is the only skill you invoke explicitly. It handles one-shot
project bootstrapping (draft mode, visual editing, migrations workflows,
content imports, etc.) and queues prerequisites automatically when needed.

| Platform | Invocation |
|---|---|
| Claude Code | `/datocms:datocms-setup <your request>` |
| Codex | `$datocms-setup <your request>` |

Phrase the prompt as the outcome you want. Terms like `content link`,
`visual editing`, `click-to-edit`, or `draft mode` help the router pick the
right recipe.

```text
/datocms:datocms-setup install visual editing in this project
/datocms:datocms-setup set up draft mode and web previews
/datocms:datocms-setup add migrations and a release workflow
/datocms:datocms-setup set up click-to-edit overlays for draft pages
```

If a prerequisite is missing (e.g. draft mode is needed before web previews),
setup queues it in the same run instead of requiring a second call.

Each setup step is reported as `scaffolded` when project-specific values still
need to be filled in, and as `production-ready` only when those gaps are gone —
so you always know whether a recipe is ready to ship or still needs a hand.

For the full recipe catalog and routing rules see
[`docs/skill-catalog.md`](docs/skill-catalog.md).

---

## Documentation

- [`docs/install.md`](docs/install.md) — installation reference (scopes,
  single-skill installs, detached snapshots, update mechanics)
- [`docs/skill-catalog.md`](docs/skill-catalog.md) — full skill catalog,
  internal setup recipes, and routing rules
- [`docs/repo-layout.md`](docs/repo-layout.md) — repository layout and the
  reasoning behind it
- [`docs/maintenance.md`](docs/maintenance.md) — contributor and maintainer
  workflows (validation, regenerating zips, release notes)
- [`evals/README.md`](evals/README.md) — trigger-quality evaluation framework

---

## License & contributing

Issues and pull requests are welcome on
[github.com/datocms/llm-skills](https://github.com/datocms/llm-skills).
See [`docs/maintenance.md`](docs/maintenance.md) for the contributor
workflow.
