# Topic and recipe catalog

`datocms` is the only public skill. These guides are included in every installation and loaded only for the relevant task.

| Topic | Guide | Use |
| - | - | - |
| CDA | [cda.md](../skills/datocms/references/cda.md) | GraphQL queries, filtering, pagination, media, SEO, and query types |
| CLI | [cli.md](../skills/datocms/references/cli.md) | Authentication, project targeting, migrations, commands, and scripts |
| CMA | [cma.md](../skills/datocms/references/cma.md) | Records, uploads, content operations, and project automation |
| Modeling | [modeling.md](../skills/datocms/references/modeling.md) | Schema decisions, fields, blocks, reuse, and editor organization |
| Frontend | [frontend.md](../skills/datocms/references/frontend.md) | Existing website integrations and framework components |
| Plugin | [plugin.md](../skills/datocms/references/plugin.md) | Plugin SDK hooks, browser CMA, dashboard components, and plugin projects |
| Setup | [setup.md](../skills/datocms/references/setup.md) | Complete setup outcomes and their missing prerequisites |
| Feedback | [feedback.md](../skills/datocms/references/feedback.md) | Requested, sanitized feedback through a prefilled support form |

## Setup recipes

The [manifest](../skills/datocms/references/setup/recipe-manifest.json) is authoritative for recipe paths and prerequisites. It contains 26 recipes in five groups:

| Group | Recipes |
| - | - |
| Frontend foundation | `cda-client`, `draft-mode`, `web-previews`, `content-link`, `realtime`, `visual-editing`, `cache-tags`, `graphql-types` |
| Frontend features | `responsive-images`, `structured-text`, `video-player`, `site-search`, `seo`, `robots-sitemaps` |
| Migrations | `migrations`, `migration-release-workflow`, `blueprint-sync`, `sandbox-iteration`, `cli-profiles`, `migration-autogenerate` |
| Onboarding | `contentful-import`, `wordpress-import` |
| Platform | `cli-bootstrap`, `cma-types`, `webhooks`, `build-triggers` |

Ask for the outcome in ordinary language, such as "set up visual editing" or "add a migration release workflow". Setup loads the selected recipes and missing prerequisites in dependency order. Real-time updates require requested or confirmed intent. Existing integrations are patched in place.

A focused bug fix or explanation does not start setup. Modeling decisions remain separate from permission to mutate a schema. Plugin work stays in the plugin guide even when the request mentions setup, React, or CMA.
