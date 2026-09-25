# Skill Catalog

The root [README](../README.md#whats-covered) is the short version. This page keeps the fuller catalog and the setup ownership map.

## Core Skills

| Skill | Repo path | Scope |
| - | - | - |
| `datocms-plugin` | `skills/datocms-plugin` | Create, patch, extend, or restyle DatoCMS plugin projects |
| `datocms-structured-text` | `skills/datocms-structured-text` | DAST structure, construction, validation, preservation during edits, Markdown/HTML conversion, and format export; CMA writes, queries, renderer wiring, and Slate editor integration stay with their existing skills |
| `datocms-cma` | `skills/datocms-cma` | Content management scripts, records, schema, environments, and webhooks |
| `datocms-cli` | `skills/datocms-cli` | CLI workflows, migrations, environments, and imports |
| `datocms-cda` | `skills/datocms-cda` | Content delivery queries, GraphQL reads, media, SEO, and typed queries |
| `datocms-content-modeling` | `skills/datocms-content-modeling` | Schema-design decisions: models vs blocks, block-bearing fields, reuse, taxonomies, limits, admin UI organization, model and field configuration |
| `datocms-frontend-integrations` | `skills/datocms-frontend-integrations` | Framework integration patterns for draft mode, previews, live updates, rendering, and search |
| `datocms-setup` | `skills/datocms-setup` | Guided setup: inspects the project, asks, plans, waits for confirmation, then applies through the sibling skills; holds no implementation itself |
| `datocms-feedback` | `skills/datocms-feedback` | Build a prefilled support-form link when DatoCMS skills or MCP workflows get stuck |

## Public Prompt Examples

These are good explicit prompt shapes for the shipped public skills:

```text
$datocms-cda write a GraphQL query for blog posts with title, slug, and SEO fields
$datocms-cma write a script that publishes all records in a model
$datocms-structured-text convert this Markdown article into DAST
$datocms-structured-text rewrite this paragraph without changing embedded blocks
$datocms-content-modeling should testimonials be a model or a block?
$datocms-cli scaffold a migration workflow for this project
$datocms-frontend-integrations show how to wire DatoCMS draft mode into this Next.js app
$datocms-plugin patch the config screen in this plugin
$datocms-plugin make this plugin config screen match DatoCMS spacing, forms, and actions
$datocms-plugin scaffold a new sidebar panel plugin for this project
$datocms-setup walk me through previews and click-to-edit for this site
$datocms-feedback report this stuck MCP workflow to DatoCMS support
```

Naming a skill is optional; it settles prompts that sit between two skills, such as a guided multi-part setup (`datocms-setup`) versus one targeted patch (`datocms-frontend-integrations`).

## Structured Text reference ownership

`datocms-structured-text` owns [document structure and validation](../skills/datocms-structured-text/references/document-model.md), [editing and traversal](../skills/datocms-structured-text/references/editing.md), and [conversion and export](../skills/datocms-structured-text/references/conversion.md). Consumers load the relevant file only when their task needs DAST work. CMA retains create/update adapters, block request construction, locale/version handling, and persistence; CDA retains query envelopes; frontend skills retain rendering; plugin skills retain Slate form values.

## Setup Ownership

`datocms-setup` owns the conversation (questions, plan, confirmation, live-change consent, handoff). Its plays in [`website.md`](../skills/datocms-setup/references/website.md) and [`project.md`](../skills/datocms-setup/references/project.md) link to the sibling files that own each concern:

| Setup concern | Owning skill and references |
| - | - |
| Query helper, typed queries | `datocms-frontend-integrations` framework reference (`## Core`); `datocms-cda` `client-and-config.md`, `type-generation.md` |
| Draft mode, Web Previews, Content Link, real-time | `datocms-frontend-integrations` `visual-editing-concepts.md`, `draft-mode-concepts.md`, `web-previews-concepts.md`, `content-link-concepts.md`, `realtime-concepts.md`, framework reference |
| Cache-tag invalidation | `datocms-cda` `draft-caching-environments.md`; `datocms-frontend-integrations` framework reference, `cache-tag-adapters.md` |
| Images, Structured Text, video | `datocms-frontend-integrations` `image-concepts.md`, `video-player-concepts.md`, component references; `datocms-cda` `images-and-videos.md`, `structured-text.md` |
| SEO, robots, sitemap | `datocms-frontend-integrations` `seo-concepts.md`, `robots-and-sitemaps.md` |
| Site search | `datocms-frontend-integrations` `site-search-concepts.md`, `site-search-api.md`; `datocms-cma` `access-control.md` |
| CLI install and project link | `datocms-cli` `SKILL.md`, `cli-setup.md` |
| Typed CMA code | `datocms-cli` `schema-generate.md`; `datocms-cma` `type-generation.md` |
| Migrations, releases, several projects | `datocms-cli` `creating-migrations.md`, `running-migrations.md`, `deployment-workflow.md`, `blueprint-sync.md` |
| Webhooks, build triggers | `datocms-cma` `resource-gotchas.md` |
| WordPress or Contentful imports | `datocms-cli` `importing-content.md`, `cli-plugin-management.md` |
| Schema design | `datocms-content-modeling` |

## Setup Prompt Examples

Describe the outcome in plain language. The plan lists prerequisites in order (for example draft mode before Content Link) before anything changes:

```text
$datocms-setup install content link in this project
$datocms-setup add visual editing to this app
$datocms-setup set up click-to-edit overlays for draft pages
$datocms-setup add migrations and a release workflow
```
