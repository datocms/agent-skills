# Repository guidance

This repository distributes one self-contained DatoCMS skill with selectively loaded topic references. It ships static guidance and a reproducible archive.

## Structure

- `skills/datocms/SKILL.md` is the only public entrypoint.
- `skills/datocms/agents/openai.yaml` must remain synchronized with its frontmatter.
- `skills/datocms/references/` contains eight topic guides and their detailed references.
- `skills/datocms/recipes/` preserves 26 setup recipes, registered in `references/setup/recipe-manifest.json` relative to the skill root.
- Both plugin manifests discover `./skills/`; marketplace and plugin identifiers are unchanged.
- `scripts/package_skill.py` builds and checks the complete archive.
- `evals/` contains existing maintenance tooling and fixtures; `docs/` contains installation and contributor documentation.

## Checks

```bash
python3 evals/scripts/validate_skill_repo.py --repo-root .
python3 -m unittest discover -s evals/tests
npm run package:check
```

After committing, use `--require-clean-git` for the clean-tree gate.

Never run paid agent evaluations or live-project e2e tests proactively. Run them only when explicitly requested. Structural tests do not require evaluation results. See `docs/maintenance.md` and `docs/rollout.md` for validation and release ordering.
