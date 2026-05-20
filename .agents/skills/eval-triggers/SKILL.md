---
name: eval-triggers
description: Run the trigger evaluation pipeline — classify, analyze, and optionally compare against a baseline. Only run when explicitly asked — evals are expensive.
disable-model-invocation: true
metadata:
  internal: true
---

**IMPORTANT:** This skill is expensive (makes many LLM API calls). Only run when the user explicitly asks for it. Never run proactively.

Before running, ask the user which eval source to run unless they already specified it in `$ARGUMENTS`:

- **Claude Code only** — uses `run_trigger_eval.py --track claude`
- **Codex only** — uses `run_trigger_eval.py --track codex`
- **Both** — runs both tracks sequentially

**Step 1 — Classify:**

The runner writes to the canonical layout at `evals/results/trigger/<skill>/<track>/<source>/results.json`. You do not pass an output directory.

For Claude Code:

```bash
python3 evals/scripts/run_trigger_eval.py --track claude --source combined
```

For Codex:

```bash
python3 evals/scripts/run_trigger_eval.py --track codex
```

**Step 2 — Analyze:**

```bash
python3 evals/scripts/analyze_trigger_results.py \
  --track claude --source frontmatter
```

This writes the cross-skill summary to `evals/results/trigger/_summary/<track>/<source>/summary.{json,md}`. Report:

- The gate verdict (pass/fail at F1 ≥ 0.90, with the list of skills below threshold).
- Per-skill precision, recall, F1.
- Any noteworthy false negatives / positives.

**Step 3 — Compare (optional):**

If the user provides a baseline summary or you have one from a previous run:

```bash
python3 evals/scripts/compare_trigger_runs.py \
  --baseline <baseline-summary>.json \
  --candidate evals/results/trigger/_summary/<track>/<source>/summary.json \
  --output-markdown local/comparison.md
```

Summarize regressions and improvements. For ad-hoc baselines that should not be committed, store them under `local/` (gitignored).
