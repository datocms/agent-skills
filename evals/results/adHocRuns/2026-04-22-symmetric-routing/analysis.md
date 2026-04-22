# Trigger Eval Analysis

Generated at: 2026-04-22T06:36:53.560880+00:00
Threshold: `0.5`

Overall: 62/71 reported-pass (87.3%), precision 97.6%, recall 83.3%, F1 89.9%.

## Overall By Query Mode

| Query Mode | Total | Reported Pass | Precision | Recall | F1 | Unstable |
|---|---:|---:|---:|---:|---:|---:|
| implicit | 50 | 50/50 (100.0%) | 100.0% | 100.0% | 100.0% | 0 |
| explicit | 7 | 6/7 (85.7%) | 83.3% | 100.0% | 90.9% | 0 |
| overlap | 14 | 6/14 (42.9%) | 100.0% | 38.5% | 55.6% | 0 |

| Skill | Reported Pass | Precision | Recall | F1 | FN | FP | Unstable |
|---|---:|---:|---:|---:|---:|---:|---:|
| datocms-cli | 34/39 (87.2%) | 95.7% | 84.6% | 89.8% | 4 | 1 | 0 |
| datocms-cma | 28/32 (87.5%) | 100.0% | 81.8% | 90.0% | 4 | 0 | 0 |

## Skill Mode Breakdown

### datocms-cli

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 27 | 27/27 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 4 | 3/4 (75.0%) | 75.0% | 100.0% | 85.7% |
| overlap | 8 | 4/8 (50.0%) | 100.0% | 42.9% | 60.0% |

### datocms-cma

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 23 | 23/23 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 3 | 3/3 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 6 | 2/6 (33.3%) | 100.0% | 33.3% | 50.0% |

## Highest-Impact False Negatives

- `datocms-cli` [overlap] rate=0.000: I need to add a seo field to the article model on DatoCMS
- `datocms-cli` [overlap] rate=0.000: rename the 'body' field on blog_post to 'content' in our DatoCMS project
- `datocms-cli` [overlap] rate=0.000: add a required meta_description to every DatoCMS model that has a title field
- `datocms-cli` [overlap] rate=0.000: publish those DatoCMS draft records for me
- `datocms-cma` [overlap] rate=0.000: do the DatoCMS token setup thing for me before publishing — I don't want to paste an API token into .env, use my OAuth login
- `datocms-cma` [overlap] rate=0.000: I need to add a seo field to the article model on DatoCMS
- `datocms-cma` [overlap] rate=0.000: rename the 'body' field on blog_post to 'content' in our DatoCMS project
- `datocms-cma` [overlap] rate=0.000: add a required meta_description to every DatoCMS model that has a title field
