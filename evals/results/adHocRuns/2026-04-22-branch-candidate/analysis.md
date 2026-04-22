# Trigger Eval Analysis

Generated at: 2026-04-22T06:10:56.444211+00:00
Threshold: `0.5`

Overall: 140/149 reported-pass (94.0%), precision 97.9%, recall 93.0%, F1 95.4%.

## Overall By Query Mode

| Query Mode | Total | Reported Pass | Precision | Recall | F1 | Unstable |
|---|---:|---:|---:|---:|---:|---:|
| implicit | 81 | 77/81 (95.1%) | 97.4% | 92.5% | 94.9% | 0 |
| explicit | 51 | 49/51 (96.1%) | 97.7% | 97.7% | 97.7% | 0 |
| overlap | 17 | 14/17 (82.4%) | 100.0% | 82.4% | 90.3% | 0 |

| Skill | Reported Pass | Precision | Recall | F1 | FN | FP | Unstable |
|---|---:|---:|---:|---:|---:|---:|---:|
| datocms-cli | 32/39 (82.1%) | 91.7% | 81.5% | 86.3% | 5 | 2 | 0 |
| datocms-cma | 27/28 (96.4%) | 100.0% | 94.4% | 97.1% | 1 | 0 | 0 |
| datocms-frontend-integrations | 23/23 (100.0%) | 100.0% | 100.0% | 100.0% | 0 | 0 | 0 |
| datocms-setup | 58/59 (98.3%) | 100.0% | 97.6% | 98.8% | 1 | 0 | 0 |

## Skill Mode Breakdown

### datocms-cli

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 30 | 26/30 (86.7%) | 94.1% | 84.2% | 88.9% |
| explicit | 4 | 3/4 (75.0%) | 75.0% | 100.0% | 85.7% |
| overlap | 5 | 3/5 (60.0%) | 100.0% | 60.0% | 75.0% |

### datocms-cma

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 23 | 23/23 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 3 | 3/3 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 2 | 1/2 (50.0%) | 100.0% | 50.0% | 66.7% |

### datocms-frontend-integrations

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 15 | 15/15 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 3 | 3/3 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 5 | 5/5 (100.0%) | 100.0% | 100.0% | 100.0% |

### datocms-setup

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 13 | 13/13 (100.0%) | 0.0% | 0.0% | 0.0% |
| explicit | 41 | 40/41 (97.6%) | 100.0% | 97.2% | 98.6% |
| overlap | 5 | 5/5 (100.0%) | 100.0% | 100.0% | 100.0% |

## Highest-Impact False Negatives

- `datocms-cli` rate=0.000: I need to add a seo field to the article model on DatoCMS
- `datocms-cli` rate=0.000: rename the 'body' field on blog_post to 'content' in our DatoCMS project
- `datocms-cli` rate=0.000: add a required meta_description to every DatoCMS model that has a title field
- `datocms-cli` [overlap] rate=0.000: I just want to add a new optional text field to the author model on DatoCMS, quickly, without setting up a migrations workflow — what's the right way?
- `datocms-cli` [overlap] rate=0.000: publish those DatoCMS draft records for me
- `datocms-cma` [overlap] rate=0.000: do the DatoCMS token setup thing for me before publishing — I don't want to paste an API token into .env, use my OAuth login
- `datocms-setup` [explicit] rate=0.000: Use datocms-setup to preserve the existing Vercel website edit overlays unless full DatoCMS side-by-side editing is required.
