# Trigger Eval Summary

Generated at: 2026-09-26T10:51:50.446095+00:00
Track / source: `claude` / `frontmatter`
Trigger threshold (per-query): `0.5`
F1 gate threshold: `0.9`
Models: `claude-opus-5-5`

## Gate

PASS — 9/9 skills at or above F1 90.0%.

## Unweighted F1 Stats

- Median: 100.0%
- Mean: 98.7%
- Min: 92.1% (`datocms-cli`)
- Max: 100.0% (`datocms-cda`)

Each skill counts once. No case-weighted averaging across skills.

## Per-Skill

| Skill | Reported Pass | Precision | Recall | F1 | FN | FP |
|---|---:|---:|---:|---:|---:|---:|
| datocms-cda | 30/30 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-cli | 42/47 (89.4%) | 93.5% | 90.6% | 92.1% | 3 | 2 |
| datocms-cma | 40/40 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-content-modeling | 41/42 (97.6%) | 100.0% | 96.4% | 98.2% | 1 | 0 |
| datocms-feedback | 40/40 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-frontend-integrations | 27/27 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-plugin | 28/28 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-setup | 42/43 (97.7%) | 95.5% | 100.0% | 97.7% | 0 | 1 |
| datocms-structured-text | 34/34 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |

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
| overlap | 13 | 8/13 (61.5%) | 66.7% | 57.1% | 61.5% |

### datocms-cma

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 24 | 24/24 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 14 | 14/14 (100.0%) | 100.0% | 100.0% | 100.0% |

### datocms-content-modeling

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 26 | 26/26 (100.0%) | 100.0% | 100.0% | 100.0% |
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
| explicit | 4 | 4/4 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 20 | 19/20 (95.0%) | 83.3% | 100.0% | 90.9% |

### datocms-structured-text

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 17 | 17/17 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 15 | 15/15 (100.0%) | 100.0% | 100.0% | 100.0% |

## False Negatives

- `datocms-cli` [overlap] I need to add a seo field to the article model on DatoCMS
- `datocms-cli` [overlap] rename the 'body' field on blog_post to 'content' in our DatoCMS project
- `datocms-cli` [overlap] add a required meta_description to every DatoCMS model that has a title field
- `datocms-content-modeling` [overlap] Inside DatoCMS structured text, when should I use inlineItem vs itemLink? And what's the difference between block and inlineBlock?

## False Positives

- `datocms-cli` [overlap] We have no DatoCMS tooling in this repo yet. Can you plan how we'd link the project, keep schema changes in migrations and release them from GitHub Actions? Don't change anythin...
- `datocms-cli` [overlap] I don't want to add a CMA token to .env for this DatoCMS cleanup — use my login instead and delete those three test records
- `datocms-setup` [overlap] Set up the datocms CLI in this repo and link it to our existing project.
