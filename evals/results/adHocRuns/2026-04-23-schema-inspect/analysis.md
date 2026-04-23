# Trigger Eval Analysis

Generated at: 2026-04-23T14:34:23.782412+00:00
Threshold: `0.5`

Overall: 69/79 reported-pass (87.3%), precision 97.9%, recall 83.6%, F1 90.2%.

## Overall By Query Mode

| Query Mode | Total | Reported Pass | Precision | Recall | F1 | Unstable |
|---|---:|---:|---:|---:|---:|---:|
| implicit | 55 | 55/55 (100.0%) | 100.0% | 100.0% | 100.0% | 0 |
| explicit | 8 | 7/8 (87.5%) | 85.7% | 100.0% | 92.3% | 0 |
| overlap | 16 | 7/16 (43.8%) | 100.0% | 35.7% | 52.6% | 0 |

| Skill | Reported Pass | Precision | Recall | F1 | FN | FP | Unstable |
|---|---:|---:|---:|---:|---:|---:|---:|
| datocms-cli | 40/46 (87.0%) | 96.6% | 84.8% | 90.3% | 5 | 1 | 0 |
| datocms-cma | 29/33 (87.9%) | 100.0% | 81.8% | 90.0% | 4 | 0 | 0 |

## Skill Mode Breakdown

### datocms-cli

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 32 | 32/32 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 5 | 4/5 (80.0%) | 80.0% | 100.0% | 88.9% |
| overlap | 9 | 4/9 (44.4%) | 100.0% | 37.5% | 54.5% |

### datocms-cma

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 23 | 23/23 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 3 | 3/3 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 7 | 3/7 (42.9%) | 100.0% | 33.3% | 50.0% |

## Highest-Impact False Negatives

- `datocms-cli` [overlap] rate=0.000: I need to add a seo field to the article model on DatoCMS
- `datocms-cli` [overlap] rate=0.000: rename the 'body' field on blog_post to 'content' in our DatoCMS project
- `datocms-cli` [overlap] rate=0.000: add a required meta_description to every DatoCMS model that has a title field
- `datocms-cli` [overlap] rate=0.000: publish those DatoCMS draft records for me
- `datocms-cli` [overlap] rate=0.000: I don't want to add a CMA token to .env for this DatoCMS cleanup — use my login instead and bulk-delete those test records
- `datocms-cma` [overlap] rate=0.000: do the DatoCMS token setup thing for me before publishing — I don't want to paste an API token into .env, use my OAuth login
- `datocms-cma` [overlap] rate=0.000: I need to add a seo field to the article model on DatoCMS
- `datocms-cma` [overlap] rate=0.000: rename the 'body' field on blog_post to 'content' in our DatoCMS project
- `datocms-cma` [overlap] rate=0.000: add a required meta_description to every DatoCMS model that has a title field
