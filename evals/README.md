# Validation and evaluations

The repository ships one public skill, `datocms`, with internal topic guides and setup recipes. Deterministic checks verify packaging and file contracts. Agent evaluations measure trigger behavior and run only when explicitly requested.

## Deterministic checks

Run these from the repository root. They do not call a model or create DatoCMS projects:

```bash
python3 -m unittest discover -s evals/tests -v
python3 evals/scripts/validate_skill_repo.py --repo-root .
python3 scripts/package_skill.py --check
python3 evals/scripts/run_setup_router_eval.py
```

The validator requires exactly `skills/datocms/SKILL.md`, synced `agents/openai.yaml` metadata, all eight topic guides, valid setup recipes, and one complete reproducible `zips/datocms.zip`. It checks local Markdown links, backtick document references, manifest paths, prerequisites, and Astro import conventions. References must resolve inside the skill package. Fenced examples, inline Markdown-syntax examples, and documented target-project files are not shipped dependencies.

To check a copied package without repository files:

```bash
python3 evals/scripts/validate_skill_repo.py --skill-root /path/to/datocms
```

`package_skill.py --check` also materializes only the packaged files in a temporary directory and validates that isolated copy. The ZIP includes the single `agents/openai.yaml`, all references, recipes, scripts, and assets. It preserves executable files and normalizes timestamps and permissions for reproducible bytes. Rebuild it with `npm run package:build` after changing package contents.

The pre-commit hook checks formatting in a temporary checkout of the index. If staged Markdown needs formatting, it fails without changing the working tree or index. It then builds the archive from staged blobs, validates the complete staged snapshot, and stages only the validated archive. Deletions and metadata-only changes rebuild it too.

The unit tests cover missing and escaping references, nested public skills, missing metadata/setup/Astro files, prerequisite cycles, complete archives, isolation, executable permissions, deletion-only changes, and partially staged Markdown through the actual hook.

## Setup routing checks

The existing setup router remains a deterministic local checker. It matches fixture prompts against recipe aliases and expands prerequisites. It does not run an agent or prove that an agent will choose the same files.

The fixture stays at `fixtures/router/datocms-setup.json`; `datocms-setup` in this development filename identifies the setup subsystem, not a separately installable skill. The companion matrix records the same negative controls. Each row has:

- `query` and `should_route` for whether setup recipes apply.
- `expected_recipes` in prerequisite-first order, with bundle aliases expanded.
- `expected_stage_a`, a boolean for bootstrap work, and `expected_stage_b`, the selected follow-on workflow label.
- Optional `notes` explaining the case.

The runner reads `skills/datocms/references/setup/router.md` and `recipe-manifest.json`. By default it prints JSON to stdout. To keep an exploratory result:

```bash
python3 evals/scripts/run_setup_router_eval.py --output-json local/setup-router.json
```

## Trigger evaluations

**Run only when explicitly requested.** These commands call a model through Claude Code or Codex. They need Python 3.10 or later and the selected agent CLI with its authentication already configured.

`fixtures/trigger/datocms.json` contains 79 curated cases: 64 positives and 15 unrelated-task negatives. It carries forward examples from the former eight-skill fixtures, relabels cross-topic DatoCMS tasks as positives, removes duplicate queries, replaces explicit legacy skill invocations with `datocms`, and adds unrelated controls. Optional `topics` tags describe coverage; they are not shown to the classifier.

`query_mode` is `implicit`, `explicit`, or `overlap`. For this unified skill, `overlap` means a task spanning internal topics; there is no dependency on a neighboring public skill and no `boundary_with` is required.

Choose the routing information to test:

| Source | Classifier input |
| - | - |
| `frontmatter` | Public name and description from `SKILL.md` |
| `metadata` | Agent display name, short description, default prompt, and invocation policy |
| `combined` | Both frontmatter and agent metadata |

For example, after an explicit request to run the Codex frontmatter evaluation:

```bash
python3 evals/scripts/run_trigger_eval.py --track codex --skill datocms --source frontmatter
python3 evals/scripts/analyze_trigger_results.py --track codex --source frontmatter --fail-on-gate
```

Use `--track claude` for Claude Code and `--model` to select a model explicitly. The runner sends one batch of fixture queries per skill and stores one binary prediction per query. It measures activation, not guide loading, execution success, repeated-run stability, or context efficiency.

Results go to `results/trigger/datocms/<track>/<source>/results.json`. Analysis goes to `results/trigger/_summary/<track>/<source>/summary.{json,md}` and reports precision, recall, F1, false positives, and false negatives. Default classification threshold is `0.5`; the F1 gate is `0.90`. These thresholds remain configurable with `--threshold` and `--threshold-f1`.

No agent results were created for the unification. The old fixtures and results remain in Git history at `86c533b74c2913e590797eb0b2622d2cdfe5cf68`; they must not be relabeled as measurements of `datocms`. `compare_trigger_runs.py` and `generate_refinement_briefs.py` remain available for future requested experiments. Compare like-for-like fixtures, tracks, and sources.

## Release checks

After recording results, `--require-fresh-results-sync` checks that every existing canonical result still matches its fixture. It does not claim that an evaluation has been run when no result exists:

```bash
python3 evals/scripts/validate_skill_repo.py --require-fresh-results-sync
```

After committing, add the clean-tree gate:

```bash
python3 evals/scripts/validate_skill_repo.py --require-clean-git
```

Exploratory outputs belong in `local/`, which is ignored by Git. The real-project tests under `e2e/` are separate from these checks and must not be used as packaging smoke tests.
