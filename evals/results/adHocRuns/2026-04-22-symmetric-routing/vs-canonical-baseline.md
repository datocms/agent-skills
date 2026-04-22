# Trigger Eval Comparison

Baseline: `evals/results/analysis.json`
Candidate: `evals/results/adHocRuns/2026-04-22-symmetric-routing/analysis.json`

Overall reported pass: 183/192 (95.3%) -> 62/71 (87.3%) (-8.0%)
Overall recall / precision / F1: 98.3%/94.3%/96.3% -> 83.3%/97.6%/89.9%

## Overall By Query Mode

| Query Mode | Total Δ | Pass Δ | Recall Δ | Precision Δ | F1 Δ |
|---|---:|---:|---:|---:|---:|
| implicit | -57 | +0.9% | 0.0% | +2.1% | +1.1% |
| explicit | -55 | -6.2% | 0.0% | -7.6% | -4.3% |
| overlap | -9 | -44.1% | -52.0% | +5.0% | -37.1% |

| Skill | Pass Δ | Recall Δ | Precision Δ | F1 Δ | FN Δ | FP Δ |
|---|---:|---:|---:|---:|---:|---:|
| datocms-cli | -9.1% | -15.4% | +1.2% | -7.3% | +4 | +0 |
| datocms-cma | -12.5% | -18.2% | 0.0% | -10.0% | +4 | +0 |
