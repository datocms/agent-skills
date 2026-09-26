---
paths:
  - "evals/**"
---

# Eval Framework Rules

**Never run evals proactively** — they are expensive (many LLM API calls). Only run when the user explicitly asks.

## Fixture Format

- Trigger fixtures: `evals/fixtures/trigger/<skill-name>.json` with fields `query`, `should_trigger`, `query_mode` (`implicit`/`explicit`/`overlap`), and optional `boundary_with`.
- The classifier sees only the numbered query text; `query_mode` and `boundary_with` never enter the prompt, since they correlate with the label. They slice results only.
- A query that names a skill loads it in Claude Code and Codex, so it is only ever a positive, in that skill's fixture. Prefer near-miss negatives from neighbouring DatoCMS skills over unrelated tech.
- Trigger fixtures are the only eval fixtures. Setup orchestration behavior is covered by `dev/e2e/regressions/cases/setup-guided.mjs`.

## Result Output

- Default per-query classification threshold: `0.5` (trigger_rate >= 0.5 = predicted trigger).
- Default F1 gate threshold: `0.90` (`--threshold-f1`, used by `analyze_trigger_results.py`).
- Canonical results live at `evals/results/trigger/<skill>/<track>/<source>/results.json` and record the model that answered (Codex only when `--model` is pinned), with the `--effort` when one is set; cross-skill summary at `evals/results/trigger/_summary/<track>/<source>/summary.{json,md}`. Commit results only from a deliberate full run.
- For one-off / exploratory runs, write to `local/` (gitignored) — history is owned by git, not duplicated in the tree.
- Two eval tracks selected via `run_trigger_eval.py --track {claude,codex}`.

## Scripts

All eval scripts are in `evals/scripts/`. The runner, analyzer and validator take `--repo-root` as the base path. See `evals/README.md` for the full workflow.
