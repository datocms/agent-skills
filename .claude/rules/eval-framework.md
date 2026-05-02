---
paths:
  - "evals/**"
---

# Eval Framework Rules

**Never run evals proactively** — they are expensive (many LLM API calls). Only run when the user explicitly asks.

## Fixture Format

- Trigger fixtures: `evals/<skill-name>-skill-eval.json` with fields `query`, `should_trigger`, `query_mode` (`implicit`/`explicit`/`overlap`), and optional `boundary_with`.
- Router fixture: `evals/datocms-setup-router-eval.json` with fields `query`, `should_route`, `expected_recipes`, `expected_stage_a`, `expected_stage_b`.

## Result Output

- Default classification threshold: `0.5` (trigger_rate >= 0.5 = predicted trigger)
- Ad hoc runs go in `evals/results/adHocRuns/<date>-<label>/`
- Historical baselines go in `evals/results/historicalRuns/`
- Two eval tracks: Claude Code (`run_claude_trigger_eval.py`) and Codex (`run_codex_trigger_eval.py`)

## Scripts

All eval scripts are in `evals/scripts/`. They use standard argparse with `--repo-root` as the base path. See `evals/README.md` for the full workflow.
