# Trigger Eval Comparison

Baseline: `evals/results/adHocRuns/2026-04-22-branch-candidate/analysis.json`
Candidate: `evals/results/adHocRuns/2026-04-22-symmetric-routing/analysis.json`

Overall reported pass: 140/149 (94.0%) -> 62/71 (87.3%) (-6.6%)
Overall recall / precision / F1: 93.0%/97.9%/95.4% -> 83.3%/97.6%/89.9%

## Overall By Query Mode

| Query Mode | Total Δ | Pass Δ | Recall Δ | Precision Δ | F1 Δ |
|---|---:|---:|---:|---:|---:|
| implicit | -31 | +4.9% | +7.5% | +2.6% | +5.1% |
| explicit | -44 | -10.4% | +2.3% | -14.3% | -6.8% |
| overlap | -3 | -39.5% | -43.9% | 0.0% | -34.8% |

| Skill | Pass Δ | Recall Δ | Precision Δ | F1 Δ | FN Δ | FP Δ |
|---|---:|---:|---:|---:|---:|---:|
| datocms-cli | +5.1% | +3.1% | +4.0% | +3.5% | -1 | -1 |
| datocms-cma | -8.9% | -12.6% | 0.0% | -7.1% | +3 | +0 |

## Query-Level Improvements

- `datocms-cli` [overlap] rate 0.000 -> 0.000: I just want to add a new optional text field to the author model on DatoCMS, quickly, without setting up a migrations workflow — what's the right way?
- `datocms-cli` rate 1.000 -> 0.000: build me a reusable, checked-in Node.js utility that programmatically adds/removes fields on DatoCMS models based on a JSON spec, so different teams can run it
