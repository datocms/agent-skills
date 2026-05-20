# Evals

This directory holds the evaluation framework for the skills shipped in this repo. Its single purpose is to **measure whether the skills are effective at being invoked on the right kind of prompt** — both correctly (precision) and reliably (recall).

The loop follows the pattern from [Anthropic's skill-iteration article](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills): write a curated set of test prompts, score the skill against them, and iterate on the skill description until precision and recall are acceptable.

There are two distinct evaluations in this repo. They answer different questions, run with different scripts, and live in separate directory trees. Everything below is organised under them.

> **Cost warning.** Evals make many LLM calls. Do not run them proactively. Only run when explicitly asked.

---

## Trigger evaluation

**Question it answers:** "For each user query, should this specific skill fire — yes or no?"

Trigger evals are per-skill binary classifiers. We feed a target skill's routing surface (its name + description, or its agent metadata, or both) plus a list of test queries to an LLM-based classifier and ask: would this skill be invoked for this query? Then we compare the classifier's answer to the ground-truth label in the fixture.

This is the right tool when the question is whether each skill's _description_ is sharp enough to:

- attract the prompts it should handle (high recall);
- repel the prompts that belong to other skills (high precision).

Trigger evals exist for every public skill in `skills/`.

### Sources: frontmatter, metadata, combined

The same fixture can be scored against three different "sources" — the slice of skill metadata exposed to the classifier. Each source tests a different routing channel an agent may see in practice.

| Source | Classifier sees | What it tests |
| - | - | - |
| `frontmatter` | The SKILL.md `name` + `description` only. | Whether the public skill description on its own is enough to make the right routing call. This is the channel Claude Code uses. |
| `metadata` | The Codex agent metadata only (`display_name`, `short_description`, `default_prompt`, `allow_implicit_invocation`). | Whether the Codex-side routing surface alone is enough. |
| `combined` | Frontmatter description **and** agent metadata together. | The maximum-context routing condition: useful as a ceiling and to spot cases that _only_ succeed when both surfaces agree. |

Pick a source that matches the question you're investigating. For most day-to-day skill work, `frontmatter` is the default and most representative target.

Orthogonally, each eval also has a **track** (`claude` vs `codex`) — which classifier was used to run it. The two tracks let us compare how each agent reads the same routing surfaces.

### Fixture format

Trigger fixtures live at `evals/fixtures/trigger/<skill-name>.json`. The filename **is** the skill name — there is no manifest declaring "what counts": if the file exists, that skill has an eval.

A trigger fixture is a JSON array of labelled queries:

```json
[
  {
    "query": "fetch the 10 latest posts from datocms",
    "should_trigger": true,
    "query_mode": "implicit"
  },
  {
    "query": "use datocms-cda to list my blog entries",
    "should_trigger": true,
    "query_mode": "explicit"
  },
  {
    "query": "create a new post in datocms",
    "should_trigger": false,
    "query_mode": "overlap",
    "boundary_with": ["datocms-cma"]
  }
]
```

The skill's name and description are read from `skills/<skill>/SKILL.md` at run time, so the fixture only needs the cases themselves.

Fields:

- **`query`** — the user prompt to classify.
- **`should_trigger`** — ground truth: should this skill fire?
- **`query_mode`** — how the prompt is shaped:
  - `implicit` — natural-language routing case (the most common).
  - `explicit` — the user directly names the target skill.
  - `overlap` — the prompt intentionally sits on a boundary between skills; combine with `boundary_with` to name the neighbouring skills.

A good fixture covers all three modes, includes both positives and negatives, and pays special attention to `overlap` cases against neighbouring skills — those are where description quality actually shows up.

### Running

Runs write to `evals/results/trigger/<skill>/<track>/<source>/results.json`.

Pick a track with `--track claude` (the classifier most users care about) or `--track codex`:

```bash
python3 evals/scripts/run_trigger_eval.py --track claude
```

Defaults to `--source frontmatter`; pass `--source metadata` or `--source combined` to test the other routing surfaces. The runner discovers every public `SKILL.md` under `skills/` and expects a matching `evals/fixtures/trigger/<skill>.json`.

### Summary and gate

After a run, build the cross-skill summary and gate:

```bash
python3 evals/scripts/analyze_trigger_results.py \
  --track claude --source frontmatter
```

This writes `evals/results/trigger/_summary/<track>/<source>/summary.{json,md}` containing:

- **Per-skill table** — precision, recall, F1, FN, FP, unstable count. This is the primary diagnostic; read it first.
- **Gate verdict** — pass / fail at the configured F1 floor (default `--threshold-f1 0.90`). Fail lists the skills under the floor.
- **Unweighted F1 stats** — median, mean, min, max across skills, each skill counting once. No case-weighted aggregate (one big skill would dominate it).
- **Highest-impact false negatives** — sorted by lowest trigger rate, useful when you're about to refine a description.

Add `--fail-on-gate` to exit with status `1` when the gate fails (useful in CI).

### Comparing two runs

To check whether a description change actually moved the needle, compare two summary JSONs:

```bash
python3 evals/scripts/compare_trigger_runs.py \
  --baseline <baseline-summary>.json \
  --candidate evals/results/trigger/_summary/claude/frontmatter/summary.json \
  --output-markdown local/comparison.md
```

Use a baseline copied off to `local/` (gitignored) for ad-hoc experiments; commit a new canonical baseline only when a refinement has been validated.

### Refining a skill

For each skill, generate a brief listing its failing queries and suggested boundary changes:

```bash
python3 evals/scripts/generate_refinement_briefs.py \
  --analysis evals/results/trigger/_summary/claude/frontmatter/summary.json \
  --skills-root skills \
  --output-dir local/refinement-briefs
```

Rule of thumb: edit the SKILL.md frontmatter `description` first (small deltas), re-run the eval, only touch the SKILL.md body once the description change is validated.

---

## Router evaluation

**Question it answers:** "Given the user's setup intent, which recipes — in which stages, in which order — does the `datocms-setup` orchestrator route to?"

The `datocms-setup` skill is a special case: it's an orchestrator that internally routes a setup prompt to a deterministic sequence of recipes (Stage A + Stage B). A simple "fire / don't fire" classifier isn't enough — we need to check the actual routing decision (which recipes, in which order). The router eval scores that decision against an expected expansion.

Router evals only exist for `datocms-setup` today. Everything else uses trigger evals.

### Fixture format

The router fixture lives at `evals/fixtures/router/datocms-setup.json` and is a JSON array of routing cases. Each case has:

- `query` — the user request.
- `should_route` — whether the setup orchestrator should fire at all.
- `expected_recipes` — fully expanded, prerequisite-first recipe ids (no bundle aliases).
- `expected_stage_a` / `expected_stage_b` — which stage each recipe belongs to.
- `notes` — optional context.

The companion `datocms-setup.matrix.md` is a human-readable matrix of the cases; the JSON is the source of truth.

### Running

```bash
python3 evals/scripts/run_setup_router_eval.py
```

Writes under `evals/results/router/datocms-setup/<track>/<source>/results.json`. There is no `_summary/` for the router (single skill — the per-skill report _is_ the report).

---

## Validation

Cross-cutting check that the repo invariants the evals rely on are still intact (every shipped skill has a fixture, committed results match their fixtures, metadata stays in sync, etc.):

```bash
python3 evals/scripts/validate_skill_repo.py
```

Pre-publish, add the clean-tree gate:

```bash
python3 evals/scripts/validate_skill_repo.py --require-clean-git
```

To confirm checked-in canonical rows still match their fixtures exactly:

```bash
python3 evals/scripts/validate_skill_repo.py --require-fresh-results-sync
```

## Notes

- Default per-query trigger threshold is `0.5` (`trigger_rate >= 0.5` means predicted trigger). Override with `--threshold` on `analyze_trigger_results.py`.
- Default F1 gate threshold is `0.90`. Override with `--threshold-f1`.
- Ad-hoc and exploratory runs belong in `local/` (gitignored). Historical snapshots live in git — recover an older snapshot with `git show <sha>:evals/results/trigger/<skill>/<track>/<source>/results.json`.
- The Claude Code runner executes in a temporary neutral working directory with `--setting-sources user` so project-local tool settings do not leak into the classification prompt.
