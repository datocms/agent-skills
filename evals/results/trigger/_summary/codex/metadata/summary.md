# Trigger Eval Summary

Generated at: 2026-09-26T10:51:50.773716+00:00
Track / source: `codex` / `metadata`
Trigger threshold (per-query): `0.5`
F1 gate threshold: `0.9`
Models: `gpt-6-luna (medium effort)`

## Gate

PASS — 9/9 skills at or above F1 90.0%.

## Unweighted F1 Stats

- Median: 94.7%
- Mean: 95.1%
- Min: 90.3% (`datocms-frontend-integrations`)
- Max: 100.0% (`datocms-feedback`)

Each skill counts once. No case-weighted averaging across skills.

## Per-Skill

| Skill | Reported Pass | Precision | Recall | F1 | FN | FP |
|---|---:|---:|---:|---:|---:|---:|
| datocms-cda | 27/30 (90.0%) | 88.9% | 94.1% | 91.4% | 1 | 2 |
| datocms-cli | 43/47 (91.5%) | 96.7% | 90.6% | 93.5% | 3 | 1 |
| datocms-cma | 37/40 (92.5%) | 92.3% | 96.0% | 94.1% | 1 | 2 |
| datocms-content-modeling | 40/42 (95.2%) | 100.0% | 92.9% | 96.3% | 2 | 0 |
| datocms-feedback | 40/40 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-frontend-integrations | 24/27 (88.9%) | 100.0% | 82.4% | 90.3% | 3 | 0 |
| datocms-plugin | 28/28 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-setup | 41/43 (95.3%) | 100.0% | 90.5% | 95.0% | 2 | 0 |
| datocms-structured-text | 32/34 (94.1%) | 100.0% | 90.0% | 94.7% | 2 | 0 |

## Skill Mode Breakdown

### datocms-cda

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 14 | 13/14 (92.9%) | 85.7% | 100.0% | 92.3% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 14 | 12/14 (85.7%) | 88.9% | 88.9% | 88.9% |

### datocms-cli

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 30 | 30/30 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 4 | 4/4 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 13 | 9/13 (69.2%) | 80.0% | 57.1% | 66.7% |

### datocms-cma

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 24 | 23/24 (95.8%) | 94.1% | 100.0% | 97.0% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 14 | 12/14 (85.7%) | 85.7% | 85.7% | 85.7% |

### datocms-content-modeling

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 26 | 25/26 (96.2%) | 100.0% | 96.0% | 98.0% |
| overlap | 16 | 15/16 (93.8%) | 100.0% | 66.7% | 80.0% |

### datocms-feedback

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 9 | 9/9 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 1 | 1/1 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 30 | 30/30 (100.0%) | 100.0% | 100.0% | 100.0% |

### datocms-frontend-integrations

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 14 | 13/14 (92.9%) | 100.0% | 85.7% | 92.3% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 11 | 9/11 (81.8%) | 100.0% | 75.0% | 85.7% |

### datocms-plugin

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 19 | 19/19 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 3 | 3/3 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 6 | 6/6 (100.0%) | 100.0% | 100.0% | 100.0% |

### datocms-setup

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 19 | 19/19 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 4 | 4/4 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 20 | 18/20 (90.0%) | 100.0% | 60.0% | 75.0% |

### datocms-structured-text

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 17 | 17/17 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 15 | 13/15 (86.7%) | 100.0% | 50.0% | 66.7% |

## False Negatives

- `datocms-cda` [overlap] Can our product listing query also return each record's link to its DatoCMS editor page? We only need the URL in the response for now.
- `datocms-cli` [overlap] I need to add a seo field to the article model on DatoCMS
- `datocms-cli` [overlap] rename the 'body' field on blog_post to 'content' in our DatoCMS project
- `datocms-cli` [overlap] add a required meta_description to every DatoCMS model that has a title field
- `datocms-cma` [overlap] do the DatoCMS token setup thing for me before publishing — I don't want to paste an API token into .env, use my OAuth login
- `datocms-content-modeling` [overlap] Inside DatoCMS structured text, when should I use inlineItem vs itemLink? And what's the difference between block and inlineBlock?
- `datocms-content-modeling` How do I lock down what editors can do inside a DatoCMS structured_text field — limit the heading levels, drop the underline mark, hide the 'open in new tab' checkbox?
- `datocms-frontend-integrations` how do i render DatoCMS structured text in my Vue 3 app using vue-datocms? i have custom blocks (code_block and call_to_action) and inline records that need special rendering
- `datocms-frontend-integrations` [overlap] I need the DatoCMS GraphQL fragment plus the React wiring to render Structured Text with inline records in my Next.js app.
- `datocms-frontend-integrations` [overlap] Fix the invalid DAST in our local article fixture, then wire the corrected value and its embedded CTA blocks into the existing react-datocms StructuredText renderer.
- `datocms-setup` [overlap] Editors publish in DatoCMS but our Nuxt pages stay stale until the next deploy. Work out what this repo needs so only the changed pages refresh, and tell me what you'd change be...
- `datocms-setup` [overlap] Our Astro site already shows DatoCMS content. Help me add live updates so editors see draft changes on the page without reloading.
- `datocms-structured-text` [overlap] Create a DatoCMS article from this Markdown in its Structured Text body field.
- `datocms-structured-text` [overlap] Why does the article body look different when I read it with the CMA client versus our GraphQL query? Which one is the actual Structured Text document?

## False Positives

- `datocms-cda` Help me set up draft mode for my Nuxt 3 site with DatoCMS. I need the enable/disable endpoints and the executeQuery wrapper that switches between published and draft tokens.
- `datocms-cda` [overlap] how do i set up cache tag invalidation for my DatoCMS next.js site? when content changes i want to revalidate only the affected pages, not the whole site
- `datocms-cli` [overlap] We have no DatoCMS tooling in this repo yet. Can you plan how we'd link the project, keep schema changes in migrations and release them from GitHub Actions? Don't change anythin...
- `datocms-cma` can you help me write a migration script using the datocms CLI? I need to create a new model with datocms migrations:new and then run it on my sandbox env
- `datocms-cma` [overlap] just tell me which fields the DatoCMS blog_post model has and whether slug is required — I don't need code, I just want to know the schema
