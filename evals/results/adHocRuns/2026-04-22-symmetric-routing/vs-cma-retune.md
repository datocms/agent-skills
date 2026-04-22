# Trigger Eval Comparison

Baseline: `evals/results/adHocRuns/2026-04-22-cma-retune/analysis.json`
Candidate: `evals/results/adHocRuns/2026-04-22-symmetric-routing/analysis.json`

Overall reported pass: 60/67 (89.6%) -> 62/71 (87.3%) (-2.2%)
Overall recall / precision / F1: 86.7%/97.5%/91.8% -> 83.3%/97.6%/89.9%

## Overall By Query Mode

| Query Mode | Total Δ | Pass Δ | Recall Δ | Precision Δ | F1 Δ |
|---|---:|---:|---:|---:|---:|
| implicit | -3 | +5.7% | +9.1% | 0.0% | +4.8% |
| explicit | +0 | 0.0% | 0.0% | 0.0% | 0.0% |
| overlap | +7 | -14.3% | -18.7% | 0.0% | -17.2% |

| Skill | Pass Δ | Recall Δ | Precision Δ | F1 Δ | FN Δ | FP Δ |
|---|---:|---:|---:|---:|---:|---:|
| datocms-cli | +2.6% | +3.1% | 0.0% | +1.8% | -1 | +0 |
| datocms-cma | -8.9% | -12.6% | 0.0% | -7.1% | +3 | +0 |

## Query-Level Improvements

- `datocms-cli` [overlap] rate 0.000 -> 0.000: I just want to add a new optional text field to the author model on DatoCMS, quickly, without setting up a migrations workflow — what's the right way?
