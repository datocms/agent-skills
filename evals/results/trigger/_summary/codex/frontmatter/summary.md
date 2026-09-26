# Trigger Eval Summary

Generated at: 2026-09-26T10:51:50.698983+00:00
Track / source: `codex` / `frontmatter`
Trigger threshold (per-query): `0.5`
F1 gate threshold: `0.9`
Models: `gpt-6-luna (medium effort)`

## Gate

PASS — 9/9 skills at or above F1 90.0%.

## Unweighted F1 Stats

- Median: 97.1%
- Mean: 96.2%
- Min: 90.2% (`datocms-content-modeling`)
- Max: 100.0% (`datocms-feedback`)

Each skill counts once. No case-weighted averaging across skills.

## Per-Skill

| Skill | Reported Pass | Precision | Recall | F1 | FN | FP |
|---|---:|---:|---:|---:|---:|---:|
| datocms-cda | 29/30 (96.7%) | 94.4% | 100.0% | 97.1% | 0 | 1 |
| datocms-cli | 42/47 (89.4%) | 93.5% | 90.6% | 92.1% | 3 | 2 |
| datocms-cma | 38/40 (95.0%) | 92.6% | 100.0% | 96.2% | 0 | 2 |
| datocms-content-modeling | 37/42 (88.1%) | 100.0% | 82.1% | 90.2% | 5 | 0 |
| datocms-feedback | 40/40 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-frontend-integrations | 27/27 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-plugin | 28/28 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-setup | 40/43 (93.0%) | 95.0% | 90.5% | 92.7% | 2 | 1 |
| datocms-structured-text | 33/34 (97.1%) | 100.0% | 95.0% | 97.4% | 1 | 0 |

## Skill Mode Breakdown

### datocms-cda

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 14 | 14/14 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 14 | 13/14 (92.9%) | 90.0% | 100.0% | 94.7% |

### datocms-cli

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 30 | 30/30 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 4 | 4/4 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 13 | 8/13 (61.5%) | 66.7% | 57.1% | 61.5% |

### datocms-cma

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 24 | 24/24 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 14 | 12/14 (85.7%) | 77.8% | 100.0% | 87.5% |

### datocms-content-modeling

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 26 | 23/26 (88.5%) | 100.0% | 88.0% | 93.6% |
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
| implicit | 19 | 19/19 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 3 | 3/3 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 6 | 6/6 (100.0%) | 100.0% | 100.0% | 100.0% |

### datocms-setup

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 19 | 19/19 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 4 | 3/4 (75.0%) | 100.0% | 75.0% | 85.7% |
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
- `datocms-content-modeling` How should I share an SEO field set across multiple DatoCMS models? Coming from Sanity I'd spread a fields array — what's the DatoCMS equivalent?
- `datocms-content-modeling` Editors keep asking me to build them a 'Drafts awaiting review' view in DatoCMS. Is there a way to put this in the sidebar so they don't have to apply the filter every time?
- `datocms-content-modeling` Can I add emoji icons to DatoCMS fields in the record edit form? I want to make the form more scannable for editors.
- `datocms-content-modeling` [overlap] I'm writing a DatoCMS migration that creates 15 new fields across 4 models. Should I bother filling in the hint field for each one, or is that something we can backfill later?
- `datocms-setup` [explicit] Use datocms-setup to add visual editing to this Next.js site.
- `datocms-setup` [overlap] Our Astro site already shows DatoCMS content. Help me add live updates so editors see draft changes on the page without reloading.
- `datocms-structured-text` [overlap] Why does the article body look different when I read it with the CMA client versus our GraphQL query? Which one is the actual Structured Text document?

## False Positives

- `datocms-cda` [overlap] The DatoCMS click-to-edit overlays stopped showing up on our Nuxt draft pages after the last deploy. Can you track down why?
- `datocms-cli` [overlap] We have no DatoCMS tooling in this repo yet. Can you plan how we'd link the project, keep schema changes in migrations and release them from GitHub Actions? Don't change anythin...
- `datocms-cli` [overlap] I don't want to add a CMA token to .env for this DatoCMS cleanup — use my login instead and delete those three test records
- `datocms-cma` [overlap] Our 40 authors appear on hundreds of DatoCMS articles. Should an author be a separate model we link to, or a block inside each article? Only the trade-offs, nothing changed yet.
- `datocms-cma` [overlap] We've never hooked DatoCMS up to our Vercel deploys. Walk me through getting the site to rebuild whenever an editor publishes, and plan it with me before changing anything.
- `datocms-setup` [overlap] Set up the datocms CLI in this repo and link it to our existing project.
