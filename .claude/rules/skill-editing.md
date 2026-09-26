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

Headings are link targets: skills and docs link to SKILL.md and reference headings by anchor. The validator checks every relative link and anchor in maintained markdown, so renaming a heading or file fails it until the links are updated.

## Invocation Policy

Every skill is model-invocable: `agents/openai.yaml` needs `policy:` → `allow_implicit_invocation: true`. Frontmatter keeps to the Agent Skills spec keys (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`); the validator rejects others such as `disable-model-invocation`, because claude.ai and Skills API zip uploads refuse them.
