# DatoCMS Skills

A collection of agent skills that teach Claude, Codex, Cursor, and other coding
agents how to work effectively with [DatoCMS](https://www.datocms.com) — from
GraphQL queries and content management scripts to plugin development and
one-shot project setup.

Eight skills, all open source, installable in one step on every supported
platform.

---

## What's included

| Skill | What it does |
|---|---|
| `datocms-cda` | Read content with the Content Delivery API and GraphQL — including media, SEO, and typed query workflows. |
| `datocms-cma` | Write records, manage schema, environments, uploads, webhooks, and other content-management automation. |
| `datocms-cli` | Drive the DatoCMS CLI: setup/config, migrations, schema generation, direct CMA calls, environments, deployment, multi-project sync, and imports. |
| `datocms-frontend-integrations` | Patch and extend frontend integrations for draft mode, web previews, visual editing, rendering, and search. |
| `datocms-plugin-builder` | Patch and maintain existing DatoCMS plugins. |
| `datocms-plugin-design-system` | Restyle plugin UI so it feels native to the DatoCMS dashboard. |
| `datocms-plugin-scaffold` | Scaffold brand-new DatoCMS plugin projects. |
| `datocms-setup` | One-shot setup orchestrator for frontend foundation/features, migrations, onboarding imports, and platform automation. |

The first seven skills trigger **automatically** based on what you ask. The
eighth, `datocms-setup`, is invoked **explicitly** — see [Usage](#usage) below.

---

## Install

Pick the section for your agent. All variants install the full set of eight
skills; for single-skill installs and advanced options see
[`docs/install.md`](docs/install.md).

### Claude Code

This repo ships as a Claude Code plugin:

```bash
/plugin marketplace add datocms/llm-skills
/plugin install datocms@datocms-skills
```

Skills are namespaced under the plugin (e.g. `/datocms:datocms-cda`).

To stay current, run `/plugin` → **Marketplaces** → `datocms-skills` →
**Enable auto-update**. You can also update manually with
`claude plugin update datocms@datocms-skills`.

### Codex

This repo also ships as a Codex plugin. From a Codex session in this repo,
open the plugin picker:

```
/plugins
```

Choose **DatoCMS Local Plugins** and install `datocms`. All eight skills are
bundled. If the marketplace doesn't appear, restart Codex and reopen
`/plugins`.

If the Plugin Directory is unavailable, fall back to the `$skill-installer`:

```
$skill-installer install all of these skills from https://github.com/datocms/llm-skills:
- skills/datocms-cda
- skills/datocms-cli
- skills/datocms-cma
- skills/datocms-frontend-integrations
- skills/datocms-plugin-builder
- skills/datocms-plugin-design-system
- skills/datocms-plugin-scaffold
- skills/datocms-setup
```

Restart Codex afterwards and verify with `ls ~/.codex/skills/ | grep datocms`
(you should see all eight folders).

### Cursor, Copilot, Windsurf, and other agents

Use the cross-agent `npx skills` CLI:

```bash
npx skills add datocms/llm-skills
```

This installs all eight skills via symlinks, so updating later is one command:

```bash
npx skills update
```

### Claude.ai

Upload each skill via **Customize → Skills** in
[claude.ai](https://claude.ai). Pre-built `.zip` files live in the
[`zips/`](zips/) folder — one per skill.

1. Go to **Customize → Skills**, click **+** → **Upload a skill**
2. Upload each `.zip` (e.g. `datocms-cda.zip`, `datocms-cma.zip`, …)

---

## Usage

### Automatic skills

You don't need to invoke the seven core skills — describe what you want in
plain language and the right one activates:

```text
Write a GraphQL query to fetch all blog posts with images
                                          → datocms-cda

Create a migration that adds a "category" field to the blog_post model
                                          → datocms-cli

Bulk-publish all draft records of type "article"
                                          → datocms-cma

Add draft mode to my Next.js app
                                          → datocms-frontend-integrations

Add a sidebar panel to my plugin that shows word count
                                          → datocms-plugin-builder

Make my plugin config screen match the DatoCMS style
                                          → datocms-plugin-design-system

Create a new DatoCMS plugin from scratch
                                          → datocms-plugin-scaffold
```

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
