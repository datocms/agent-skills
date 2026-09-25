---
paths:
  - "evals/**"
---

# Eval Framework Rules

**Never run evals proactively** — they are expensive (many LLM API calls). Only run when the user explicitly asks.

## Fixture Format

- Trigger fixtures: `evals/fixtures/trigger/<skill-name>.json` with fields `query`, `should_trigger`, `query_mode` (`implicit`/`explicit`/`overlap`), and optional `boundary_with`.
- Trigger fixtures are the only eval fixtures. Setup orchestration behavior is covered by `dev/e2e/regressions/cases/setup-guided.mjs`.

## Result Output

- Default per-query classification threshold: `0.5` (trigger_rate >= 0.5 = predicted trigger).
- Default F1 gate threshold: `0.90` (`--threshold-f1`, used by `analyze_trigger_results.py`).
- Canonical results live at `evals/results/trigger/<skill>/<track>/<source>/results.json`; cross-skill summary at `evals/results/trigger/_summary/<track>/<source>/summary.{json,md}`.
- For one-off / exploratory runs, write to `local/` (gitignored) — history is owned by git, not duplicated in the tree.
- Two eval tracks selected via `run_trigger_eval.py --track {claude,codex}`.

## Scripts

All eval scripts are in `evals/scripts/`. They use standard argparse with `--repo-root` as the base path. See `evals/README.md` for the full workflow.
