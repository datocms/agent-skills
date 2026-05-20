---
paths:
  - "skills/*/SKILL.md"
  - "skills/*/agents/openai.yaml"
---

# Skill Editing Rules

## Frontmatter ↔ YAML Sync

Each skill's `agents/openai.yaml` tracks its source via `synced_from_name` and `synced_from_description_sha256`. After changing a SKILL.md `name` or `description` field, update the corresponding `openai.yaml` to match and run validation:

```bash
python3 evals/scripts/validate_skill_repo.py
```

## Eval Fixture Requirement

Every shipped skill must have a matching eval fixture at `evals/fixtures/trigger/<skill-name>.json`. If you add a new skill, create its fixture.

## Trigger Boundary Refinement

When refining trigger boundaries: edit frontmatter `description` first (small deltas). Do not touch the SKILL.md body until evals confirm the description change works.

## SKILL.md Body Constraints

The validator bans these patterns in skill bodies: `AskUserQuestion`, `Read tool`, `Claude Code alias`, `slash alias`. Do not introduce them.

## datocms-setup Special Rules

`datocms-setup` has `disable-model-invocation: true` and `allow_implicit_invocation: false` — it must always be invoked explicitly.
