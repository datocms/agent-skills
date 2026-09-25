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

Headings are link targets: `datocms-setup` links to sibling SKILL.md and reference headings by anchor. Renaming one fails the validator until the setup link is updated.

## Invocation Policy

Model-invocable skills (no `disable-model-invocation`) need `policy:` → `allow_implicit_invocation: true` in `agents/openai.yaml`. Explicit-only skills (`disable-model-invocation: true`) omit `policy`. `datocms-setup` is model-invocable like the others.
