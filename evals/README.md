# Skill Trigger Eval Loop (Test, Measure, Refine)

This repo now includes a model-agnostic loop for improving skill trigger quality.

It follows the same pattern described in [Anthropic's skill-iteration article](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills):

1. Test with curated trigger/non-trigger prompts.
2. Measure with stable metrics (recall, precision, F1, false negatives/positives).
3. Refine skill descriptions, then re-test and compare.

## Result Layout

This repo now keeps all eval outputs under one root:

- `evals/results/`: the canonical latest accepted result snapshot.
- `evals/results/historicalRuns/`: published historical snapshots.
- `evals/results/adHocRuns/`: exploratory reruns, one-off checks, and side-by-side experiments.

## What Is In This Folder

- `*.json`: trigger test cases (`query`, `should_trigger`).
- Fixtures may also declare `query_mode` (`implicit`, `explicit`, `overlap`) and `boundary_with` for overlap cases.
- Canonical fixture naming is `evals/<skill-name>-skill-eval.json` for every shipped skill.
- `datocms-setup-router-eval.json`: machine-readable routing cases for `datocms-setup` (`query`, `should_route`, `expected_recipes`, `expected_stage_a`, `expected_stage_b`).
- `results/*.json`: canonical current raw run outputs (JSON or text preamble + JSON).
- `results/manifest.json`: declares which checked-in current result files are intentionally published.
- `scripts/analyze_trigger_results.py`: computes metrics from raw outputs.
- `scripts/generate_refinement_briefs.py`: writes per-skill refinement briefs from misses.
- `scripts/compare_trigger_runs.py`: compares baseline vs candidate runs.
- `scripts/run_codex_trigger_eval.py`: runs the local trigger classifier directly from skill frontmatter descriptions.
- `scripts/run_claude_trigger_eval.py`: runs the Claude Code CLI directly as a trigger classifier.
- `scripts/run_setup_router_eval.py`: scores the deterministic `datocms-setup` router fixture against `router.md` plus `recipe-manifest.json`.
- `scripts/validate_skill_repo.py`: validates repo invariants that the skill docs depend on, including metadata sync checks.

## Prerequisites

Before using the local trigger harness:

- the local trigger CLI must be installed
- the CLI must already be authenticated
- the executable must be available on `PATH`

You can verify the local docs, metadata, and routing invariants at any time with:

```bash
python3 evals/scripts/validate_skill_repo.py --repo-root .
```

That validator now also checks that every shipped skill has a canonically named eval fixture and that the checked-in baseline result filenames match canonical skill names.

Before publishing, run the same validator with the clean-tree gate enabled:

```bash
python3 evals/scripts/validate_skill_repo.py --repo-root . --require-clean-git
```

When you need to confirm that checked-in root result rows still match their canonical fixtures exactly, enable the opt-in freshness gate:

```bash
python3 evals/scripts/validate_skill_repo.py \
  --repo-root . \
  --require-fresh-results-sync
```

## Workflow

### 1) Test

To produce a fresh exploratory run, write into `evals/results/adHocRuns/<date>-<label>/`:

```bash
python3 evals/scripts/run_codex_trigger_eval.py \
  --repo-root . \
  --output-dir evals/results/adHocRuns/2026-03-06-candidate/raw
```

The runner auto-discovers every public `SKILL.md` in `skills/` and expects a matching `evals/<skill-name>-skill-eval.json` fixture for each one.

Fixture metadata guidelines:

- Use `query_mode: implicit` for natural-language routing cases.
- Use `query_mode: explicit` when the user directly names the target skill.
- Use `query_mode: overlap` plus `boundary_with` when a prompt intentionally sits on a skill boundary.

`datocms-setup-router-eval.json` uses a separate contract:

- `query`
- `should_route`
- `expected_recipes` (fully expanded prerequisite-first recipe ids; no bundle aliases)
- `expected_stage_a`
- `expected_stage_b`
- optional `notes`

Important output contract for each query result:

- `query`
- `should_trigger`
- `query_mode`
- `boundary_with`
- `trigger_rate`
- `triggers`
- `runs`
- `pass`

You can keep human-readable preambles before JSON; the analyzer handles both pure JSON and mixed-output files.

Recommended ad hoc run layout:

```text
evals/results/adHocRuns/
  2026-03-05-baseline/
    raw/*.json
  2026-03-06-candidate/
    raw/*.json
```

The local runner now performs a preflight check and fails fast with a clear error if the classifier executable is unavailable.

Run the Claude Code track with the matching runner:

```bash
python3 evals/scripts/run_claude_trigger_eval.py \
  --repo-root . \
  --output-dir evals/results/adHocRuns/2026-03-20-claude-code-combined-refresh/raw \
  --source combined
```

The Claude Code runner executes in a temporary neutral working directory with `--setting-sources user` so project-local tool settings do not leak into the classification prompt.

To score the deterministic setup router fixture itself:

```bash
python3 evals/scripts/run_setup_router_eval.py \
  --repo-root . \
  --output-json evals/results/adHocRuns/2026-03-20-setup-router/router-analysis.json
```

### 2) Measure

Analyze a run directory:

```bash
python3 evals/scripts/analyze_trigger_results.py \
  --results-dir evals/results/adHocRuns/2026-03-06-candidate/raw \
  --output-json evals/results/adHocRuns/2026-03-06-candidate/analysis.json \
  --output-markdown evals/results/adHocRuns/2026-03-06-candidate/analysis.md
```

Analyze the canonical current snapshot:

```bash
python3 evals/scripts/analyze_trigger_results.py \
--results-dir evals/results \
--output-json evals/results/analysis.json \
--output-markdown evals/results/analysis.md
```

When `evals/results/manifest.json` is present, the analysis report includes the published current-result coverage.

### 3) Refine

Generate skill-specific briefs with concrete misses and suggested trigger boundary changes:

```bash
python3 evals/scripts/generate_refinement_briefs.py \
  --analysis evals/results/adHocRuns/2026-03-06-candidate/analysis.json \
  --skills-root . \
  --output-dir evals/results/adHocRuns/2026-03-06-candidate/refinement-briefs
```

Refinement rule of thumb:

- Edit frontmatter `description` first (small deltas).
- Re-run evals before touching the body of `SKILL.md`.

### 4) Compare

Compare candidate vs baseline:

```bash
python3 evals/scripts/compare_trigger_runs.py \
  --baseline evals/results/adHocRuns/2026-03-05-baseline/analysis.json \
  --candidate evals/results/adHocRuns/2026-03-06-candidate/analysis.json \
  --output-markdown evals/results/adHocRuns/2026-03-06-candidate/comparison.md \
  --output-json evals/results/adHocRuns/2026-03-06-candidate/comparison.json
```

Keep changes only when they improve recall and keep precision within acceptable regression limits for your project.

To compare two model tracks for the same source:

```bash
python3 evals/scripts/compare_trigger_runs.py \
  --baseline evals/results/adHocRuns/2026-03-20-codex-combined-refresh/analysis.json \
  --candidate evals/results/adHocRuns/2026-03-20-claude-code-combined-refresh/analysis.json \
  --output-markdown evals/results/adHocRuns/2026-03-20-claude-code-vs-codex/combined-comparison.md \
  --output-json evals/results/adHocRuns/2026-03-20-claude-code-vs-codex/combined-comparison.json
```

## Notes

- Default classification threshold is `0.5` (`trigger_rate >= 0.5` means predicted trigger).
- Use `--threshold` on `analyze_trigger_results.py` if your policy differs.
- `compare_trigger_runs.py` expects both inputs to come from `analyze_trigger_results.py` output JSON.
