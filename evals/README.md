# Evals

For native `gpt-6-luna` medium task execution, live CMS verification, and built-application checks, see [the end-to-end suite](../dev/e2e/README.md). Trigger classification below is a separate signal and does not count as end-to-end task success.

This directory holds the **trigger check**, a cheap lint of each skill's description. For each labelled query, a classifier reads one skill's description and decides whether that skill should load. The check catches descriptions that attract requests owned by another skill (precision) or miss requests they should handle (recall).

It does not measure real routing. A real agent chooses among every installed skill at once, turn by turn. For that, use the Claude Code routing probe [`dev/e2e/routing/claude.mjs`](../dev/e2e/routing/claude.mjs), which records the skill Claude Code actually invokes for a fixture's queries, and the end-to-end suite. Setup orchestration behavior (questions, plan-then-confirm, handoff) is covered by the regression case [`dev/e2e/regressions/cases/setup-guided.mjs`](../dev/e2e/regressions/cases/setup-guided.mjs), not here.

> **Cost warning.** Evals make many LLM calls. Do not run them proactively. Only run when explicitly asked.

---

## Trigger check

**Question it answers:** "Reading only this skill's description, should it load for this query — yes or no?"

The runner sends one prompt per skill: the skill's routing surface (see sources below) and the fixture's queries, numbered, as plain text. Fixture metadata (`query_mode`, `boundary_with`) never reaches the classifier, because it correlates with the answer; it only slices the results afterwards. The classifier answers `{"predictions":[{"id":1,"trigger":true},…]}`. Answers are matched to queries by id, and a skipped, repeated or unknown id fails the run instead of shifting every later answer. Each query is sampled once.

Trigger fixtures exist for every public skill in `skills/`.

### Sources: frontmatter, metadata, combined

The same fixture can be scored against three different "sources" — the slice of skill metadata exposed to the classifier.

| Source | Classifier sees | What it tests |
| - | - | - |
| `frontmatter` | The SKILL.md `name` + `description` only. | Whether the public skill description on its own is enough to make the right call. This is the channel Claude Code uses. |
| `metadata` | The Codex agent metadata only (`display_name`, `short_description`, `default_prompt`). | Whether the Codex-side interface copy alone is enough. |
| `combined` | Frontmatter description **and** agent metadata together. | The maximum-context condition: useful as a ceiling and to spot cases that _only_ succeed when both surfaces agree. |

For most day-to-day skill work, `frontmatter` is the default and most representative target.

### Tracks: claude and codex

Each run also has a **track**, the CLI that classifies. Both run in an empty temporary directory, never the repo, whose `AGENTS.md` and fixtures would reach the classifier. Both time out after 10 minutes instead of hanging, and a timeout ends the CLI's child processes too.

- `claude` runs `claude -p` with no user or project settings, no MCP servers (claude.ai connectors included) and no tools. Results record the model that answered.
- `codex` runs `codex exec` with an empty `HOME` and a fresh `CODEX_HOME` that holds only your login (`auth.json`), so no user config, skills, plugins or MCP servers load. Codex does not report its default model: pass `--model` to pin it and record it. Its fresh `CODEX_HOME` has no config, so without `--effort` the model runs at its own default effort, not the one in your `config.toml`.

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
- **`should_trigger`** — ground truth: should this skill load? Judge it from the skills' descriptions and bodies (their routing tables). A query may be positive in two fixtures when both skills should load.
- **`query_mode`** — how the prompt is shaped, used to slice results:
  - `implicit` — natural-language routing case (the most common).
  - `explicit` — the user names the target skill. Claude Code and Codex always load a named skill, so an explicit query is only ever a positive, in the named skill's fixture.
  - `overlap` — the prompt intentionally sits on a boundary between skills; `boundary_with` names the neighbouring skills.

A good fixture has both positives and negatives in rough balance. Negatives should be near misses that belong to a neighbouring DatoCMS skill, not unrelated tech; those boundary cases are where description quality shows up. Phrase queries the way users do, not in the description's own words: copied wording inflates the score.

### Running

Runs write to `evals/results/trigger/<skill>/<track>/<source>/results.json`:

```bash
python3 evals/scripts/run_trigger_eval.py --track codex --model gpt-6-luna --effort medium
```

Defaults to `--source frontmatter`; pass `--source metadata` or `--source combined` to test the other surfaces, and `--skill <name>` to run one skill. The runner discovers every public `SKILL.md` under `skills/` and expects a matching `evals/fixtures/trigger/<skill>.json`. Pin `--model` and `--effort` so two runs differ only by what you changed; results record them together, e.g. `gpt-6-luna (medium effort)`.

### Summary and gate

After a run, build the cross-skill summary and gate:

```bash
python3 evals/scripts/analyze_trigger_results.py \
  --track claude --source frontmatter
```

This writes `evals/results/trigger/_summary/<track>/<source>/summary.{json,md}` containing:

- **Gate verdict** — passes only when every skill has results and each is at or above the F1 floor (default `--threshold-f1 0.90`). Fail lists the skills under the floor and the skills without results.
- **Models and warnings** — the models that answered, a warning when they differ, and a warning for results produced before the description or metadata their prompt shows last changed.
- **Unweighted F1 stats** — median, mean, min, max across skills, each skill counting once. No case-weighted aggregate (one big skill would dominate it).
- **Per-skill table** — precision, recall, F1, FN, FP. This is the primary diagnostic; read it first.
- **False negatives and false positives** — every misrouted query, for refining a description.

Add `--fail-on-gate` to exit with status `1` when the gate fails.

### Comparing two runs

To check whether a description change actually moved the needle, compare two summary JSONs:

```bash
python3 evals/scripts/compare_trigger_runs.py \
  --baseline <baseline-summary>.json \
  --candidate evals/results/trigger/_summary/claude/frontmatter/summary.json \
  --output-markdown local/comparison.md
```

The comparison notes when the runs used different or unrecorded models, since a model change can move scores as much as a description change. Use a baseline copied off to `local/` (gitignored) for ad-hoc experiments; commit a new canonical baseline only when a refinement has been validated.

### Refining a description

Edit the SKILL.md frontmatter `description` in small steps, based on the misroutes the summary lists, then re-run. Never paste words from failed queries into it: that fits the description to this fixture and grows it without improving real routing. Touch the SKILL.md body only once the description change is validated.

---

## Validation

Cross-cutting check that the repo invariants the evals rely on are still intact (every shipped skill has a fixture, fixture rows are well formed, metadata stays in sync, etc.):

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

- Default F1 gate threshold is `0.90`. Override with `--threshold-f1`.
- Commit results only from a deliberate full run. Ad-hoc and exploratory runs belong in `local/` (gitignored).
- Historical snapshots live in git — recover an older snapshot with `git show <sha>:evals/results/trigger/<skill>/<track>/<source>/results.json`. Snapshots from before 2026-09-26 were produced by a prompt that showed each query's mode, so they are not comparable with later runs.
