# Maintenance

This page collects the contributor and maintainer workflows for the
`datocms/llm-skills` repository. End users do not need anything on this page —
see the root [README](../README.md) instead.

## Validation

Run from the repo root before publishing or opening a PR:

```bash
# Base validation: metadata sync, eval fixture coverage, repo invariants
python3 evals/scripts/validate_skill_repo.py --repo-root .

# Pre-publish gate: also requires a clean working tree
python3 evals/scripts/validate_skill_repo.py --repo-root . --require-clean-git

# Optional: fail if checked-in eval results are stale
python3 evals/scripts/validate_skill_repo.py --repo-root . --require-fresh-results-sync
```

For the full eval workflow (running, interpreting, and updating snapshots) see
[`evals/README.md`](../evals/README.md). **Do not run evals proactively** —
they are expensive. Only run them when explicitly investigating trigger
quality.

## Regenerate the claude.ai zips

The [`zips/`](../zips) folder ships a pre-built `.zip` per skill for the
[claude.ai](https://claude.ai) upload flow. Regenerate them after any change to
skill content:

```bash
rm -rf zips && mkdir zips && for s in skills/datocms-*/; do
  n=$(basename "$s")
  (cd skills && zip -r "../zips/${n}.zip" "$n/" -x "${n}/agents/*")
done
```

The `-x "${n}/agents/*"` exclusion strips the Codex `agents/openai.yaml` files,
which are not relevant to the claude.ai upload flow.

## Bumping plugin versions

Updates only propagate to installed Claude Code and Codex plugins when the
plugin version changes. Bump the `version` field in **both**:

- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`

Without a version bump, Claude Code and Codex consider their cached copies up
to date and will not fetch your changes.

## Releasing

1. Land all skill changes on `master`.
2. Bump the plugin version in both manifests (see above).
3. Run the validator with `--require-clean-git`.
4. Regenerate the zips if any skill content changed.
5. Commit the zip refresh together with the version bump.
6. Tag and publish.

## Codex readiness

For a structural checklist that confirms the repo is ready for Codex-local
plugin use, see [`codex-readiness.md`](codex-readiness.md).

## Repo-internal helper skills

This repo ships two dev-only helper skills (`eval-triggers`, `validate`) under
both `.claude/skills/` and `.agents/skills/` so Claude Code and Codex can
trigger them while working *on* the repo. These must **not** be installed by
end users.

The Claude Code and Codex plugin manifests (`.claude-plugin/plugin.json`,
`.codex-plugin/plugin.json`) already scope `skills` to `./skills/`, so plugin
installs are clean. The `npx skills` CLI, however, walks every known skills
directory in the cloned repo. To hide a skill from `npx skills` discovery, add
this to its frontmatter:

```yaml
---
name: my-internal-skill
description: …
metadata:
  internal: true
---
```

`npx skills` checks `data.metadata?.internal === true` and skips the entry
unless `INSTALL_INTERNAL_SKILLS=1` is set. Any new helper skill added under
`.claude/skills/` or `.agents/skills/` must include this flag.

## Authoring rules for skills

- Each public skill lives at `skills/<skill-name>/SKILL.md` with a YAML
  frontmatter block followed by markdown body.
- Each skill ships a Codex agent interface config at
  `skills/<skill-name>/agents/openai.yaml` that **must stay synced** with the
  SKILL.md frontmatter. The validator checks this.
- Detailed reference docs go under `skills/<skill-name>/references/`.
- `datocms-setup` is the special orchestrator and routes to internal recipes
  via `references/recipe-manifest.json`. Recipes live under
  `skills/datocms-setup/recipes/<lane>/<recipe-id>/`.
- Every public skill needs a canonical eval fixture at
  `evals/<skill-name>-skill-eval.json` and a checked-in results snapshot at
  `evals/results/<skill-name>-eval-results.json`.
