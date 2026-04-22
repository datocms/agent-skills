# Trigger Eval Comparison

Baseline: `evals/results/analysis.json`
Candidate: `evals/results/adHocRuns/2026-04-22-cma-retune/analysis.json`

Overall reported pass: 183/192 (95.3%) -> 60/67 (89.6%) (-5.8%)
Overall recall / precision / F1: 98.3%/94.3%/96.3% -> 86.7%/97.5%/91.8%

## Overall By Query Mode

| Query Mode | Total Δ | Pass Δ | Recall Δ | Precision Δ | F1 Δ |
|---|---:|---:|---:|---:|---:|
| implicit | -54 | -4.7% | -9.1% | +2.1% | -3.7% |
| explicit | -55 | -6.2% | 0.0% | -7.6% | -4.3% |
| overlap | -16 | -29.8% | -33.3% | +5.0% | -20.0% |

| Skill | Pass Δ | Recall Δ | Precision Δ | F1 Δ | FN Δ | FP Δ |
|---|---:|---:|---:|---:|---:|---:|
| datocms-cli | -11.7% | -18.5% | +1.2% | -9.1% | +5 | +0 |
| datocms-cma | -3.6% | -5.6% | 0.0% | -2.9% | +1 | +0 |
