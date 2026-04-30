# Skill Catalog

The root [README](../README.md#public-skills) is the short version. This page keeps the fuller catalog and the internal setup matrix.

## Core Skills

| Skill | Repo path | Scope |
| - | - | - |
| `datocms-plugin-builder` | `skills/datocms-plugin-builder` | Patch and maintain existing DatoCMS plugins |
| `datocms-plugin-design-system` | `skills/datocms-plugin-design-system` | Design or restyle DatoCMS plugin UI so it feels native to DatoCMS |
| `datocms-plugin-scaffold` | `skills/datocms-plugin-scaffold` | Scaffold new DatoCMS plugin projects |
| `datocms-cma` | `skills/datocms-cma` | Content management scripts, records, schema, environments, and webhooks |
| `datocms-cli` | `skills/datocms-cli` | CLI workflows, migrations, environments, and imports |
| `datocms-cda` | `skills/datocms-cda` | Content delivery queries, GraphQL reads, media, SEO, and typed queries |
| `datocms-content-modeling` | `skills/datocms-content-modeling` | Schema-design decisions: models vs blocks, block-bearing fields, reuse, taxonomies, limits, admin UI organization, model and field configuration |
| `datocms-frontend-integrations` | `skills/datocms-frontend-integrations` | Framework integration patterns for draft mode, previews, live updates, rendering, and search |
| `datocms-setup` | `skills/datocms-setup` | One-time setup orchestrator that routes to internal recipes for frontend, migrations, onboarding, and platform work |

## Public Prompt Examples

These are good explicit prompt shapes for the shipped public skills:

```text
$datocms-cda write a GraphQL query for blog posts with title, slug, and SEO fields
$datocms-cma write a script that publishes all records in a model
$datocms-content-modeling should testimonials be a model or a block?
$datocms-cli scaffold a migration workflow for this project
$datocms-frontend-integrations show how to wire DatoCMS draft mode into this Next.js app
$datocms-plugin-builder patch the config screen in this plugin
$datocms-plugin-design-system make this plugin config screen feel native to DatoCMS
$datocms-plugin-scaffold scaffold a new sidebar panel plugin for this project
$datocms-setup install content link in this project
```

`datocms-frontend-integrations` and `datocms-setup` are the two public skills that are most important to call explicitly when you want deterministic routing.

## Internal Setup Recipes

`datocms-setup` is the public setup entrypoint. It owns the following internal recipe groups:

| Group | Internal recipe ids | Notes |
| - | - | - |
| `frontend-foundation` | `cda-client`, `draft-mode`, `web-previews`, `content-link`, `realtime`, `cache-tags`, `graphql-types` | Query baseline, previews, visual editing, live preview, cache invalidation, typed queries |
| `frontend-features` | `responsive-images`, `structured-text`, `video-player`, `site-search`, `seo`, `robots-sitemaps` | Rendering and discovery add-ons layered on top of the foundation |
| `migrations` | `migrations`, `migration-release-workflow`, `blueprint-sync`, `sandbox-iteration`, `cli-profiles`, `migration-autogenerate` | Schema workflow, release, and environment tooling |
| `onboarding` | `contentful-import`, `wordpress-import` | One-shot import helpers |
| `platform` | `cma-types`, `webhooks`, `build-triggers` | Project-level automation and schema tooling |

## Setup Routing Rules

- `draft-mode` is queued automatically before `web-previews`, `content-link`, `realtime`, or `cache-tags` when that foundation is missing.
- `migrations` is queued automatically before `migration-release-workflow`, `blueprint-sync`, `sandbox-iteration`, or `migration-autogenerate` when that baseline is missing.
- The setup skill keeps setup self-contained: shared references, scripts, and assets all live inside `skills/datocms-setup`.

## Explicit Prompt Examples

Call `datocms-setup` explicitly, then describe the outcome in plain language. For Content Link, prompts like these should route to the `content-link` recipe and queue `draft-mode` first when needed:

```text
$datocms-setup install content link in this project
$datocms-setup add visual editing to this app
$datocms-setup set up click-to-edit overlays for draft pages
$datocms-setup enable content-link for this repo and wire any missing prerequisites
```
