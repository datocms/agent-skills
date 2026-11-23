# Trigger Eval Summary

Generated at: 2026-11-23T03:02:54.366092+00:00
Track / source: `claude` / `frontmatter`
Trigger threshold (per-query): `0.5`
F1 gate threshold: `0.9`
Models: `claude-sonnet-5-5`

## Gate

PASS — 10/10 skills at or above F1 90.0%.

## Unweighted F1 Stats

- Median: 100.0%
- Mean: 99.2%
- Min: 97.1% (`datocms-cma`)
- Max: 100.0% (`datocms-cli`)

Each skill counts once. No case-weighted averaging across skills.

## Per-Skill

| Skill | Reported Pass | Precision | Recall | F1 | FN | FP |
|---|---:|---:|---:|---:|---:|---:|
| datocms-cda | 38/39 (97.4%) | 96.3% | 100.0% | 98.1% | 0 | 1 |
| datocms-cli | 91/91 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-cma | 99/102 (97.1%) | 100.0% | 94.3% | 97.1% | 3 | 0 |
| datocms-content-modeling | 54/54 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-feedback | 45/45 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-frontend-integrations | 57/57 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-plugin | 42/43 (97.7%) | 96.6% | 100.0% | 98.2% | 0 | 1 |
| datocms-plugin-design | 41/41 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |
| datocms-setup | 63/64 (98.4%) | 100.0% | 96.4% | 98.2% | 1 | 0 |
| datocms-structured-text | 90/90 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 |

## Skill Mode Breakdown

### datocms-cda

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 21 | 21/21 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 16 | 15/16 (93.8%) | 91.7% | 100.0% | 95.7% |

### datocms-cli

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 40 | 40/40 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 4 | 4/4 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 47 | 47/47 (100.0%) | 100.0% | 100.0% | 100.0% |

### datocms-cma

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 43 | 42/43 (97.7%) | 100.0% | 97.1% | 98.6% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 57 | 55/57 (96.5%) | 100.0% | 87.5% | 93.3% |

### datocms-content-modeling

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 34 | 34/34 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 20 | 20/20 (100.0%) | 100.0% | 100.0% | 100.0% |

### datocms-feedback

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 13 | 13/13 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 1 | 1/1 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 31 | 31/31 (100.0%) | 100.0% | 100.0% | 100.0% |

### datocms-frontend-integrations

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 15 | 15/15 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 40 | 40/40 (100.0%) | 100.0% | 100.0% | 100.0% |

### datocms-plugin

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 23 | 23/23 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 3 | 3/3 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 17 | 16/17 (94.1%) | 90.0% | 100.0% | 94.7% |

### datocms-plugin-design

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 13 | 13/13 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 1 | 1/1 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 27 | 27/27 (100.0%) | 100.0% | 100.0% | 100.0% |

### datocms-setup

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 19 | 18/19 (94.7%) | 100.0% | 91.7% | 95.7% |
| explicit | 4 | 4/4 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 41 | 41/41 (100.0%) | 100.0% | 100.0% | 100.0% |

### datocms-structured-text

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 23 | 23/23 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 2 | 2/2 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 65 | 65/65 (100.0%) | 100.0% | 100.0% | 100.0% |

## False Negatives

- `datocms-cma` [overlap] How do I fork a DatoCMS environment, make some schema changes (add a new field to the blog_post model), and then promote it to primary? Using the CMA client programmatically.
- `datocms-cma` [overlap] I just want to add a new optional text field to the author model on DatoCMS, quickly, without setting up a migrations workflow — what's the right way?
- `datocms-cma` I just want to add an optional text field called nickname to the author model in DatoCMS, quickly, without setting up a migrations workflow.
- `datocms-setup` Plan the DatoCMS setup for this repo: connect the CLI, generate CMA types, and add a GitHub Actions workflow that releases migrations.

## False Positives

- `datocms-cda` [overlap] how do i set up cache tag invalidation for my DatoCMS next.js site? when content changes i want to revalidate only the affected pages, not the whole site
- `datocms-plugin` [overlap] Patch this existing DatoCMS plugin settings page and make the updated UI feel native while keeping the behavior the same.
