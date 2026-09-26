# Trigger Eval Summary

Generated at: 2026-09-26T13:21:36.352514+00:00
Track / source: `codex` / `combined`
Trigger threshold (per-query): `0.5`
F1 gate threshold: `0.9`
Models: `gpt-6-luna (medium effort)`

## Gate

PASS — 9/9 skills at or above F1 90.0%.

## Unweighted F1 Stats

- Median: 97.4%
- Mean: 97.1%
- Min: 92.3% (`datocms-content-modeling`)
- Max: 100.0% (`datocms-cda`)

Each skill counts once. No case-weighted averaging across skills.

## Per-Skill

| Skill | Reported Pass | Precision | Recall | F1 | FN | FP |
|---|---:|---:|---:|---:|---:|---:|
| datocms-cda | 30/30 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-cli | 43/47 (91.5%) | 96.7% | 90.6% | 93.5% | 3 | 1 |
| datocms-cma | 39/40 (97.5%) | 96.2% | 100.0% | 98.0% | 0 | 1 |
| datocms-content-modeling | 38/42 (90.5%) | 100.0% | 85.7% | 92.3% | 4 | 0 |
| datocms-feedback | 40/40 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-frontend-integrations | 27/27 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-plugin | 28/29 (96.6%) | 94.4% | 100.0% | 97.1% | 0 | 1 |
| datocms-setup | 41/43 (95.3%) | 95.2% | 95.2% | 95.2% | 1 | 1 |
| datocms-structured-text | 33/34 (97.1%) | 100.0% | 95.0% | 97.4% | 1 | 0 |

## Skill Mode Breakdown

### datocms-cda

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 14 | 14/14 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 14 | 14/14 (100.0%) | 100.0% | 100.0% | 100.0% |

### datocms-cli

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 30 | 30/30 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 4 | 4/4 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 13 | 9/13 (69.2%) | 80.0% | 57.1% | 66.7% |

### datocms-cma

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 24 | 24/24 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 14 | 13/14 (92.9%) | 87.5% | 100.0% | 93.3% |

### datocms-content-modeling

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 26 | 24/26 (92.3%) | 100.0% | 92.0% | 95.8% |
| overlap | 16 | 14/16 (87.5%) | 100.0% | 33.3% | 50.0% |

### datocms-feedback

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 9 | 9/9 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 1 | 1/1 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 30 | 30/30 (100.0%) | 100.0% | 100.0% | 100.0% |

### datocms-frontend-integrations

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 14 | 14/14 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 11 | 11/11 (100.0%) | 100.0% | 100.0% | 100.0% |

### datocms-plugin

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 20 | 20/20 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 3 | 3/3 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 6 | 5/6 (83.3%) | 50.0% | 100.0% | 66.7% |

### datocms-setup

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 19 | 19/19 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 4 | 4/4 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 20 | 18/20 (90.0%) | 80.0% | 80.0% | 80.0% |

### datocms-structured-text

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 17 | 17/17 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 15 | 14/15 (93.3%) | 100.0% | 75.0% | 85.7% |

## False Negatives

- `datocms-cli` [overlap] I need to add a seo field to the article model on DatoCMS
- `datocms-cli` [overlap] rename the 'body' field on blog_post to 'content' in our DatoCMS project
- `datocms-cli` [overlap] add a required meta_description to every DatoCMS model that has a title field
- `datocms-content-modeling` [overlap] Inside DatoCMS structured text, when should I use inlineItem vs itemLink? And what's the difference between block and inlineBlock?
- `datocms-content-modeling` Editors keep asking me to build them a 'Drafts awaiting review' view in DatoCMS. Is there a way to put this in the sidebar so they don't have to apply the filter every time?
- `datocms-content-modeling` Can I add emoji icons to DatoCMS fields in the record edit form? I want to make the form more scannable for editors.
- `datocms-content-modeling` [overlap] I'm writing a DatoCMS migration that creates 15 new fields across 4 models. Should I bother filling in the hint field for each one, or is that something we can backfill later?
- `datocms-setup` [overlap] Our Astro site already shows DatoCMS content. Help me add live updates so editors see draft changes on the page without reloading.
- `datocms-structured-text` [overlap] Why does the article body look different when I read it with the CMA client versus our GraphQL query? Which one is the actual Structured Text document?

## False Positives

- `datocms-cli` [overlap] We have no DatoCMS tooling in this repo yet. Can you plan how we'd link the project, keep schema changes in migrations and release them from GitHub Actions? Don't change anythin...
- `datocms-cma` [overlap] We've never hooked DatoCMS up to our Vercel deploys. Walk me through getting the site to rebuild whenever an editor publishes, and plan it with me before changing anything.
- `datocms-plugin` [overlap] Move that plugin off the marketplace package onto our private build URL, keeping its settings.
- `datocms-setup` [overlap] Set up the datocms CLI in this repo and link it to our existing project.
