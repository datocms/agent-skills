# Trigger Eval Comparison

Baseline: `evals/results/analysis.json`
Candidate: `evals/results/adHocRuns/2026-04-22-branch-candidate/analysis.json`

Overall reported pass: 183/192 (95.3%) -> 140/149 (94.0%) (-1.4%)
Overall recall / precision / F1: 98.3%/94.3%/96.3% -> 93.0%/97.9%/95.4%

## Overall By Query Mode

| Query Mode | Total Δ | Pass Δ | Recall Δ | Precision Δ | F1 Δ |
|---|---:|---:|---:|---:|---:|
| implicit | -26 | -4.0% | -7.5% | -0.5% | -4.1% |
| explicit | -11 | +4.1% | -2.3% | +6.8% | +2.4% |
| overlap | -6 | -4.6% | -8.1% | +5.0% | -2.4% |

| Skill | Pass Δ | Recall Δ | Precision Δ | F1 Δ | FN Δ | FP Δ |
|---|---:|---:|---:|---:|---:|---:|
| datocms-cli | -14.2% | -18.5% | -2.8% | -10.9% | +5 | +1 |
| datocms-cma | -3.6% | -5.6% | 0.0% | -2.9% | +1 | +0 |
| datocms-frontend-integrations | +8.7% | +14.3% | 0.0% | +7.7% | -2 | +0 |
| datocms-setup | +5.1% | -2.4% | +8.9% | +3.4% | +1 | -4 |

## Query-Level Improvements

- `datocms-frontend-integrations` [overlap] rate 0.000 -> 1.000: I need to set up draft mode for my Next.js App Router site with DatoCMS. I want enable/disable route handlers, a dual-token executeQuery wrapper, and the coo...
- `datocms-frontend-integrations` [overlap] rate 0.000 -> 1.000: I'm building a Nuxt 3 site with DatoCMS and I need to set up the Web Previews plugin integration. Editors should be able to click 'Open preview' in the CMS a...
- `datocms-setup` [explicit] rate 1.000 -> 0.000: Use datocms-setup to build the React site-search UI against the existing public search endpoint and current indexes only.
- `datocms-setup` [explicit] rate 1.000 -> 0.000: Use datocms-setup to patch my existing preview-links route handler only and keep the rest of the setup untouched.
- `datocms-setup` [explicit] rate 1.000 -> 0.000: Use datocms-setup to patch one missing ContentLink boundary in the existing Structured Text renderer and leave the rest of the visual editing setup untouched.
- `datocms-setup` [explicit] rate 1.000 -> 0.000: Use datocms-setup to wire a ContentLink component into my existing Next.js page and patch the current renderer only.

## Query-Level Regressions

- `datocms-setup` [explicit] rate 1.000 -> 0.000: Use datocms-setup to preserve the existing Vercel website edit overlays unless full DatoCMS side-by-side editing is required.
