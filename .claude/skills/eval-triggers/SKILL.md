---
name: eval-triggers
description: Run the trigger evaluation pipeline — classify, analyze, and optionally compare against a baseline. Only run when explicitly asked — evals are expensive.
disable-model-invocation: true
metadata:
  internal: true
---

**IMPORTANT:** This skill is expensive (makes many LLM API calls). Only run when the user explicitly asks for it. Never run proactively.

Before running, ask the user which track to run unless they already specified it in `$ARGUMENTS`:

- **Claude Code only** — `--track claude`
- **Codex only** — `--track codex`
- **Both** — run both tracks sequentially

Use `--source frontmatter` (the default) unless the user asks for `metadata` or `combined`. Pass `--model` when the user names a model; without it, Codex results record no model. Every step below takes the same `--track` and `--source`.

**Step 1 — Classify:**

The runner writes to the canonical layout at `evals/results/trigger/<skill>/<track>/<source>/results.json`. You do not pass an output directory.

```bash
python3 evals/scripts/run_trigger_eval.py --track <track> --source <source> [--model <model>]
```

**Step 2 — Analyze:**

```bash
python3 evals/scripts/analyze_trigger_results.py --track <track> --source <source>
```

This writes the cross-skill summary to `evals/results/trigger/_summary/<track>/<source>/summary.{json,md}`. Report:

- The gate verdict: it passes only when every skill has results at or above F1 0.90. List the skills below the floor and the skills without results.
- Per-skill precision, recall, F1.
- Any warnings (different models, results older than the current description) and noteworthy false negatives / positives.

**Step 3 — Compare (optional):**

If the user provides a baseline summary or you have one from a previous run:

```bash
python3 evals/scripts/compare_trigger_runs.py \
  --baseline <baseline-summary>.json \
  --candidate evals/results/trigger/_summary/<track>/<source>/summary.json \
  --output-markdown local/comparison.md
```

Summarize regressions and improvements, and say so when the two runs used different or unrecorded models. For ad-hoc baselines that should not be committed, store them under `local/` (gitignored).
