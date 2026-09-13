# Maintenance

The public package has one entrypoint and one source tree. Keep installation documentation outside the skill directory and technical guidance in the relevant topic references.

## Authoring

- Keep `SKILL.md` short and the description specific to DatoCMS tasks. State when each guide should be read.
- Preserve requested scope. Setup is automatic for setup outcomes; do not attach its defaults to explanations or focused fixes.
- Keep CLI authentication and command rules authoritative in CLI references. Keep framework and plugin rules local to their topics.
- Use concise, readable prose. Preserve non-obvious constraints and useful examples; avoid mechanical rewriting of all references.
- When changing the skill name or description, synchronize `agents/openai.yaml`, including its source hash.
- Preserve the setup manifest's 26 recipe identifiers and prerequisite graph when relocating content.

## Structural checks

Install development dependencies with `npm ci --ignore-scripts`. Run:

```bash
python3 -m unittest discover -s evals/tests
python3 evals/scripts/validate_skill_repo.py --repo-root .
npm run format:check
npm run typecheck
npm run package:check
git diff --check
```

Use Python 3.10 or newer for evaluation tooling. Run the clean-tree gate after committing:

```bash
python3 evals/scripts/validate_skill_repo.py --repo-root . --require-clean-git
```

Validation covers metadata, fixture structure, references, recipe dependencies, and packaging. It does not establish task quality or context efficiency. Existing behavioral evaluation tooling remains available under [evals/](../evals/README.md); run it only when explicitly requested. Do not require invented results to pass structural checks.

## Archive generation

```bash
npm run package:build
npm run package:check
```

The archive contains the complete `datocms/` directory, including agent metadata. The reusable packaging helper can also build from the Git index. The pre-commit hook uses staged content, detects additions, modifications, and deletions, and stages the resulting archive. Unstaged edits must not leak into it.

To enable hooks in a development checkout, run `npm run prepare`. The hook checks formatting in a staged snapshot, builds the archive when necessary, and validates that snapshot. Format and stage any reported Markdown before retrying. Do not enable hooks in another user's checkout as a side effect of validation.

## Versions and release

Keep the version synchronized in both plugin manifests. Version 2.0.0 retires the eight public skill names, standalone selectors, and archive paths. The plugin and marketplace identifiers remain unchanged.

Follow [the coordinated rollout](rollout.md) before merging the migration. Consumer deployment and package validation are separate checks. Publishing, deploying, and refreshing production indexes require authorization.

## Internal helpers

Helpers in `.claude/skills/` and `.agents/skills/` are for repository maintenance. Keep `metadata.internal: true`; public plugin manifests expose only `./skills/`. Existing trigger fixtures may be maintained without running paid classifiers or live-project tests.
