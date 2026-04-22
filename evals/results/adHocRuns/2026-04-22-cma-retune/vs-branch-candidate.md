# Trigger Eval Comparison

Baseline: `evals/results/adHocRuns/2026-04-22-branch-candidate/analysis.json`
Candidate: `evals/results/adHocRuns/2026-04-22-cma-retune/analysis.json`

Overall reported pass: 140/149 (94.0%) -> 60/67 (89.6%) (-4.4%)
Overall recall / precision / F1: 93.0%/97.9%/95.4% -> 86.7%/97.5%/91.8%

## Overall By Query Mode

| Query Mode | Total Δ | Pass Δ | Recall Δ | Precision Δ | F1 Δ |
|---|---:|---:|---:|---:|---:|
| implicit | -28 | -0.7% | -1.6% | +2.6% | +0.4% |
| explicit | -44 | -10.4% | +2.3% | -14.3% | -6.8% |
| overlap | -10 | -25.2% | -25.2% | 0.0% | -17.6% |

| Skill | Pass Δ | Recall Δ | Precision Δ | F1 Δ | FN Δ | FP Δ |
|---|---:|---:|---:|---:|---:|---:|
| datocms-cli | +2.6% | 0.0% | +4.0% | +1.7% | +0 | -1 |
| datocms-cma | 0.0% | 0.0% | 0.0% | 0.0% | +0 | +0 |

## Query-Level Improvements

- `datocms-cli` rate 1.000 -> 0.000: build me a reusable, checked-in Node.js utility that programmatically adds/removes fields on DatoCMS models based on a JSON spec, so different teams can run it
