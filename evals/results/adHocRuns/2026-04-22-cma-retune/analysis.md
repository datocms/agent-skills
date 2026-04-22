# Trigger Eval Analysis

Generated at: 2026-04-22T06:22:35.459377+00:00
Threshold: `0.5`

Overall: 60/67 reported-pass (89.6%), precision 97.5%, recall 86.7%, F1 91.8%.

## Overall By Query Mode

| Query Mode | Total | Reported Pass | Precision | Recall | F1 | Unstable |
|---|---:|---:|---:|---:|---:|---:|
| implicit | 53 | 50/53 (94.3%) | 100.0% | 90.9% | 95.2% | 0 |
| explicit | 7 | 6/7 (85.7%) | 83.3% | 100.0% | 90.9% | 0 |
| overlap | 7 | 4/7 (57.1%) | 100.0% | 57.1% | 72.7% | 0 |

| Skill | Reported Pass | Precision | Recall | F1 | FN | FP | Unstable |
|---|---:|---:|---:|---:|---:|---:|---:|
| datocms-cli | 33/39 (84.6%) | 95.7% | 81.5% | 88.0% | 5 | 1 | 0 |
| datocms-cma | 27/28 (96.4%) | 100.0% | 94.4% | 97.1% | 1 | 0 | 0 |

## Skill Mode Breakdown

### datocms-cli

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 30 | 27/30 (90.0%) | 100.0% | 84.2% | 91.4% |
| explicit | 4 | 3/4 (75.0%) | 75.0% | 100.0% | 85.7% |
| overlap | 5 | 3/5 (60.0%) | 100.0% | 60.0% | 75.0% |

### datocms-cma

| Query Mode | Total | Reported Pass | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| implicit | 23 | 23/23 (100.0%) | 100.0% | 100.0% | 100.0% |
| explicit | 3 | 3/3 (100.0%) | 100.0% | 100.0% | 100.0% |
| overlap | 2 | 1/2 (50.0%) | 100.0% | 50.0% | 66.7% |

## Highest-Impact False Negatives

- `datocms-cli` rate=0.000: I need to add a seo field to the article model on DatoCMS
- `datocms-cli` rate=0.000: rename the 'body' field on blog_post to 'content' in our DatoCMS project
- `datocms-cli` rate=0.000: add a required meta_description to every DatoCMS model that has a title field
- `datocms-cli` [overlap] rate=0.000: I just want to add a new optional text field to the author model on DatoCMS, quickly, without setting up a migrations workflow — what's the right way?
- `datocms-cli` [overlap] rate=0.000: publish those DatoCMS draft records for me
- `datocms-cma` [overlap] rate=0.000: do the DatoCMS token setup thing for me before publishing — I don't want to paste an API token into .env, use my OAuth login
