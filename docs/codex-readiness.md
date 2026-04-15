# Codex Readiness Checklist

Use this checklist when you want to confirm the repo is ready for Codex-local
plugin use and ongoing maintenance.

## Structural checklist

- `.codex-plugin/plugin.json` exists and points `skills` at `./skills/`.
- `.agents/plugins/marketplace.json` exists and exposes the repo as a local
  Codex plugin marketplace entry.
- Every public skill ships as `skills/<skill-name>/SKILL.md`.
- Every public skill has synced `agents/openai.yaml` metadata.
- Every public skill has a canonical eval fixture at
  `evals/<skill-name>-skill-eval.json`.
- Every included public skill has a checked-in result file at
  `evals/results/<skill-name>-eval-results.json`.

## Validation commands

Run these from the repo root:

```bash
python3 evals/scripts/validate_skill_repo.py --repo-root .
python3 evals/scripts/validate_skill_repo.py --repo-root . --require-fresh-results-sync
python3 evals/scripts/validate_skill_repo.py --repo-root . --require-clean-git
```

## What “golden” means here

Treat the repo as golden when:

1. the base validator passes,
2. the fresh-results sync gate passes,
3. the repo-scoped Codex marketplace resolves locally, and
4. the working tree is clean when you are ready to publish or hand off.

The clean-git gate is operational rather than structural: it will fail during
active local edits even when the repo layout itself is correct.
