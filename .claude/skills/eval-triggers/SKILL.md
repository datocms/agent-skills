---
name: eval-triggers
description: Run the trigger evaluation pipeline — classify, analyze, and optionally compare against a baseline. Only run when explicitly asked — evals are expensive.
disable-model-invocation: true
metadata:
  internal: true
---

**IMPORTANT:** This skill is expensive (makes many LLM API calls). Only run when the user explicitly asks for it. Never run proactively.

Before running, ask the user which eval source to run unless they already specified it in `$ARGUMENTS`:

- **Claude Code only** — uses `run_claude_trigger_eval.py`
- **Codex only** — uses `run_codex_trigger_eval.py`
- **Both** — runs both runners sequentially

Pick a descriptive label for the run. Default to today's date if none provided.

**Step 1 — Classify:**

For Claude Code:
```bash
python3 evals/scripts/run_claude_trigger_eval.py \
  --repo-root . \
  --output-dir evals/results/adHocRuns/<date>-<label>/raw \
  --source combined
```

For Codex:
```bash
python3 evals/scripts/run_codex_trigger_eval.py \
  --repo-root . \
  --output-dir evals/results/adHocRuns/<date>-<label>/raw
```

**Step 2 — Analyze:**

```bash
python3 evals/scripts/analyze_trigger_results.py \
  --results-dir evals/results/adHocRuns/<date>-<label>/raw \
  --output-json evals/results/adHocRuns/<date>-<label>/analysis.json \
  --output-markdown evals/results/adHocRuns/<date>-<label>/analysis.md
```

Report the key metrics: recall, precision, F1, and any false negatives/positives.

**Step 3 — Compare (optional):**

If the user provides a baseline path or there is a recent baseline in `evals/results/adHocRuns/`, compare:

```bash
python3 evals/scripts/compare_trigger_runs.py \
  --baseline <baseline>/analysis.json \
  --candidate evals/results/adHocRuns/<date>-<label>/analysis.json \
  --output-markdown evals/results/adHocRuns/<date>-<label>/comparison.md \
  --output-json evals/results/adHocRuns/<date>-<label>/comparison.json
```

Summarize regressions and improvements.
