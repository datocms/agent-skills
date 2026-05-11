# DatoCMS Skills

A collection of agent skills that teach Claude, Codex, Cursor, and other coding agents how to work effectively with [DatoCMS](https://www.datocms.com) — from GraphQL queries and content management scripts to content modeling, plugin development, and one-shot project setup.

All open source, with native plugin support on Claude Code and Codex and a universal `npx skills` installer for everything else.

---

## Skills or MCP?

DatoCMS offers two AI integrations and they don't overlap:

- **[MCP server](https://www.datocms.com/docs/mcp-server)** — for editors and PMs who want an agent to read and update a project from anywhere (web, mobile, no local setup).
- **Agent Skills** (this repo) — for developers in their editor or CLI. A superset of MCP: every MCP capability is reachable here via `npx datocms …`, plus content modeling, frontend integrations, migrations, plugin development, and more.

If you're shipping code, you want Skills.

---

## What's covered

Skills ship as two coherent packs. Pick the one that matches your work — the marketplace install for Claude Code and Codex brings both, while the universal `npx skills` installer can opt into a single pack.

### Project Pack — for building with DatoCMS

Six skills covering everyday DatoCMS development. Most trigger automatically based on your prompt:

- **Content modeling** — schema-design decisions: model vs block, references vs embedded blocks, taxonomies, field shapes, validators, editor appearances.
- **Reading content** — GraphQL queries against the Content Delivery API with filters, pagination, localization, Structured Text, responsive images, SEO, and typed queries.
- **Writing content & automation** — record CRUD, bulk imports/exports, asset uploads, environment forks and promotions, webhooks, roles, scheduled publishing, audit logs.
- **CLI workflows** — migrations, schema-type generation, typed CMA scripts, CI/CD pipelines, WordPress/Contentful imports.
- **Frontend integrations** — draft mode, Web Previews, Visual Editing, Content Link, real-time preview subscriptions, cache-tag invalidation, SEO/sitemap wiring across Next.js, Nuxt, SvelteKit, and Astro.
- **One-shot setup** (`datocms-setup`) — the only skill you invoke explicitly. Bootstraps multi-step flows like "set up visual editing" in a single command, queueing prerequisites automatically.

### Plugin Pack — for extending the DatoCMS dashboard

Three skills for building DatoCMS plugins:

- **Plugin scaffolding** — bootstrap a brand-new plugin (Vite/React, initial surfaces).
- **Plugin maintenance** — patch and extend an existing plugin: hooks, field extensions, sidebars, validations.
- **Plugin design system** — restyle plugin UI to feel native to the DatoCMS dashboard.

For the full list of skill names, internal setup recipes, and routing rules see [`docs/skill-catalog.md`](docs/skill-catalog.md).

---

## Install

Pick the install method for your agent. The marketplace install for Claude Code and Codex brings both packs (all nine skills); the universal `npx skills` installer can opt into a single pack.

### Claude Code (recommended)

```bash
/plugin marketplace add datocms/agent-skills
/plugin install datocms@datocms-skills
```

Skills are namespaced under the plugin (e.g. `/datocms:datocms-cda`). Enable auto-update from `/plugin` → **Marketplaces** → `datocms-skills`, or update manually with `claude plugin update datocms@datocms-skills`.

### Codex

```bash
codex plugin marketplace add datocms/agent-skills
```

Then open a Codex session and install from the plugin picker:

```bash
/plugins
```

Choose **DatoCMS** and "Install plugin"

### Cursor, Windsurf, GitHub Copilot, and other agents

Install one pack:

```bash
# Project Pack
npx skills add datocms/agent-skills \
  --skill datocms-content-modeling --skill datocms-cda --skill datocms-cma \
  --skill datocms-cli --skill datocms-frontend-integrations --skill datocms-setup
```

```bash
# Plugin Pack
npx skills add datocms/agent-skills \
  --skill datocms-plugin-scaffold --skill datocms-plugin-builder --skill datocms-plugin-design-system
```

Or both packs:

```bash
npx skills add datocms/agent-skills
```

Update later with `npx skills update`. For scopes, single-skill installs, and detached snapshots see [`docs/install.md`](docs/install.md).

### Claude.ai (web)

Upload skill `.zip` files via **Customize → Skills** in [claude.ai](https://claude.ai). Pre-built zips live in the [`zips/`](zips/) folder — one per skill. Upload the six Project Pack zips, the three Plugin Pack zips, or all nine.

---

## Usage

### Automatic skills

You don't need to invoke the auto-triggered skills — describe what you want in plain language and the right one activates:

- "Should testimonials be a model or a block?"
- "How should I structure a multi-locale schema with shared blocks?"
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

`datocms-setup` is the only skill you invoke explicitly. It handles one-shot project bootstrapping (draft mode, visual editing, migrations workflows, content imports, etc.) and queues prerequisites automatically when needed.

| Platform | Invocation |
| - | - |
| Claude Code | `/datocms:datocms-setup <your request>` |
| Codex | `$datocms-setup <your request>` |

Phrase the prompt as the outcome you want. Terms like `content link`, `visual editing`, `click-to-edit`, or `draft mode` help the router pick the right recipe.

```text
/datocms:datocms-setup install visual editing in this project
/datocms:datocms-setup set up draft mode and web previews
/datocms:datocms-setup add migrations and a release workflow
/datocms:datocms-setup set up click-to-edit overlays for draft pages
```

If a prerequisite is missing (e.g. draft mode is needed before web previews), setup queues it in the same run instead of requiring a second call.

Every recipe ends with one of two statuses: `scaffolded` if it still contains placeholders you need to fill in (API tokens, route mappings, model-to-URL maps, TODO stubs), or `production-ready` if it's wired to real project values and works end-to-end with no further edits. No guessing whether the output is ready to ship.

For the full recipe catalog and routing rules see [`docs/skill-catalog.md`](docs/skill-catalog.md).

---

## Documentation

- [`docs/install.md`](docs/install.md) — installation reference (scopes, single-skill installs, detached snapshots, update mechanics)
- [`docs/skill-catalog.md`](docs/skill-catalog.md) — full skill catalog, internal setup recipes, and routing rules
- [`docs/repo-layout.md`](docs/repo-layout.md) — repository layout and the reasoning behind it
- [`docs/maintenance.md`](docs/maintenance.md) — contributor and maintainer workflows (validation, regenerating zips, release notes)
- [`evals/README.md`](evals/README.md) — trigger-quality evaluation framework

---

## License & contributing

Issues and pull requests are welcome on [github.com/datocms/agent-skills](https://github.com/datocms/agent-skills). See [`docs/maintenance.md`](docs/maintenance.md) for the contributor workflow.
