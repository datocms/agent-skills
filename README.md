# DatoCMS Skills

Focused DatoCMS skills for content delivery, content management, CLI workflows,
frontend integrations, plugin implementation, plugin UI design, and project
setup. This README is the main guide for the repo.

## Public Skills

- `datocms-cda`: read content with the DatoCMS CDA and GraphQL, including media, SEO, and typed query workflows.
- `datocms-cma`: write records, manage schema, environments, uploads, webhooks, and automation.
- `datocms-cli`: handle CLI workflows such as setup/config, migrations, schema generation, direct CMA calls, environments, deployment, multi-project sync, and imports.
- `datocms-frontend-integrations`: patch or extend existing frontend integrations for draft mode, previews, visual editing, rendering, and search.
- `datocms-plugin-builder`: patch and maintain existing DatoCMS plugins.
- `datocms-plugin-design-system`: design or restyle DatoCMS plugins so they feel native to the DatoCMS UI.
- `datocms-plugin-scaffold`: scaffold new DatoCMS plugin projects.
- `datocms-setup`: one-time setup orchestrator for frontend foundation/features, migrations, onboarding imports, and platform automation.

## Usage

### Implicit skills (7 of 8)

The first 7 skills listed above trigger **automatically** — you do not need to
invoke them. Just describe what you want in plain language and the right skill
activates based on your request.

Examples:

```text
Write a GraphQL query to fetch all blog posts with images
                                          → triggers datocms-cda

Create a migration that adds a "category" field to the blog_post model
                                          → triggers datocms-cli

Bulk-publish all draft records of type "article"
                                          → triggers datocms-cma

Add draft mode to my Next.js app
                                          → triggers datocms-frontend-integrations

Add a sidebar panel to my plugin that shows word count
                                          → triggers datocms-plugin-builder

Make my plugin config screen match the DatoCMS style
                                          → triggers datocms-plugin-design-system

Create a new DatoCMS plugin from scratch
                                          → triggers datocms-plugin-scaffold
```

### Setup skill (explicit only)

`datocms-setup` does **not** trigger automatically. You must invoke it
explicitly:

| Platform | Invocation |
|----------|-----------|
| **Claude Code** | `/datocms:datocms-setup <your request>` |
| **Codex** | `$datocms-setup <your request>` |

Write the prompt as the outcome you want in plain language. You do not need to
know the internal recipe ids, but using terms like `content link`,
`visual editing`, `click-to-edit`, or `draft mode` helps the router land on the
smallest matching setup bundle.

Examples (Claude Code):

```text
/datocms:datocms-setup install visual editing in this project
/datocms:datocms-setup set up draft mode and web previews
/datocms:datocms-setup add migrations and a release workflow
/datocms:datocms-setup set up click-to-edit overlays for draft pages
```

Examples (Codex):

```text
$datocms-setup install visual editing in this project
$datocms-setup set up draft mode and web previews
$datocms-setup add migrations and a release workflow
```

If a prerequisite is missing (e.g., draft mode is needed before web previews),
the setup skill queues it in the same run instead of requiring a second call.

Inside `datocms-setup`, setup work is organized into five internal lanes:

- `frontend-foundation`: `cda-client`, `draft-mode`, `web-previews`, `content-link`, `realtime`, `visual-editing`, `cache-tags`, `graphql-types`
- `frontend-features`: `responsive-images`, `structured-text`, `video-player`, `site-search`, `seo`, `robots-sitemaps`
- `migrations`: `migrations`, `migration-release-workflow`, `blueprint-sync`, `sandbox-iteration`, `cli-profiles`, `migration-autogenerate`
- `onboarding`: `contentful-import`, `wordpress-import`
- `platform`: `cma-types`, `webhooks`, `build-triggers`

Setup work is reported as `scaffolded` when placeholders or unresolved
project-specific values remain, and `production-ready` only when those gaps are
gone.

## Install

Each public skill can be installed on its own, but the full public set gives
the smoothest cross-skill routing.

### Claude Code (recommended)

This repo ships as a Claude Code plugin. Add the marketplace and install:


```bash
/plugin marketplace add datocms/llm-skills
/plugin install datocms@datocms-skills
```

Skills are namespaced under the plugin name (e.g. `/datocms:datocms-cda`).

**Updates:** After installation, enable auto-update so you always get the
latest skill improvements: run `/plugin`, go to **Marketplaces**, select
`datocms-skills`, and choose **Enable auto-update**. Or update manually with
`claude plugin update datocms@datocms-skills`. See [docs/install.md](docs/install.md)
for scopes, update details, and single-skill install options.

### Codex (recommended)

This repo ships as a Codex plugin and includes a repo-scoped Codex marketplace
entry at `.agents/plugins/marketplace.json` for local installation and testing.
Inside a Codex session from this repo:

```
/plugins
```

Choose the **DatoCMS Local Plugins** marketplace and install `datocms`. All 8
skills are bundled into the plugin automatically. If the repo marketplace does
not appear yet, restart Codex and open `/plugins` again.

**Updates:** This repo-scoped marketplace points at the local repo, so it is
best for development and validation. After changing the plugin files, restart
Codex and reinstall/update the local plugin if needed. For published Codex
distribution, keep `.codex-plugin/plugin.json` versioned and treat the repo
marketplace as the local verification path.

### Codex (fallback — `$skill-installer`)

If the Plugin Directory is unavailable, ask the skill installer to pull all
skills from this repo:

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

Restart Codex after installing. Then verify all 8 skills were picked up by
running `ls ~/.codex/skills/ | grep datocms`. You should see all 8 folders
listed. If any are missing, re-run `$skill-installer` for the missing skill
individually.

**Updates:** The `$skill-installer` copies skill files into `~/.codex/skills/`.
These are frozen snapshots — there is no auto-update. To get the latest
version after the repo is updated, re-run the same `$skill-installer` command
above. It will overwrite the existing copies with the latest files from the
repo.

### Other agents (Cursor, Copilot, Windsurf, etc.)

Use the cross-agent `npx skills` CLI:

```bash
npx skills add datocms/llm-skills
```

Installs all 8 skills at once. Uses symlinks by default so updates are easy:

```bash
npx skills update
```

### Claude.ai

Upload each skill individually via **Customize > Skills** in
[claude.ai](https://claude.ai). Pre-built zips are in the [`zips/`](zips/)
folder — one per skill:

1. Go to **Customize > Skills** and click **"+"** > **"Upload a skill"**
2. Upload each `.zip` from `zips/` (e.g. `datocms-cda.zip`, `datocms-cma.zip`, etc.)

To regenerate the zips after skill content changes:

```bash
rm -rf zips && mkdir zips && for s in skills/datocms-*/; do n=$(basename "$s"); (cd skills && zip -r "../zips/${n}.zip" "$n/" -x "${n}/agents/*"); done
```

## Repo Layout

```text
.claude-plugin/
  plugin.json         # Claude Code plugin manifest
  marketplace.json    # Claude Code marketplace registry
.codex-plugin/
  plugin.json         # Codex plugin manifest
skills/
  datocms-cda/
  datocms-cli/
  datocms-cma/
  datocms-frontend-integrations/
  datocms-plugin-builder/
  datocms-plugin-design-system/
  datocms-plugin-scaffold/
  datocms-setup/
    agents/           # Codex agent interface config (openai.yaml)
    patterns/
    references/
    recipes/
docs/   # deeper guides and longer repo notes
evals/
  *.json    # eval fixtures and checked-in result snapshots
  *.md      # eval guides and manual review matrices
  results/  # analyzed outputs and historical snapshots
  scripts/  # validation and eval tooling
local/  # local-only scratch inputs
```

For the evaluation workflow details, see [evals/README.md](evals/README.md).

### Claude.ai

To use these skills in [claude.ai](https://claude.ai):

1. Download the individual `.zip` files from the [`zips/`](zips/) folder
2. Go to **Customize > Skills** and click **"+"** > **"Upload a skill"**
3. Upload each `.zip` one at a time (e.g. `datocms-cda.zip`, `datocms-cma.zip`, etc.)

All 8 skills will then be available in your claude.ai conversations.
