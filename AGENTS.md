# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

DatoCMS skills repository — 10 public skills that provide focused AI-tool guidance for content delivery, content management, content modeling, CLI workflows, frontend integrations, plugin development, plugin UI design, plugin scaffolding, and project setup. Ships as static markdown; no build or bundle step.

## Repository Structure

- `.Codex-plugin/plugin.json` — Codex plugin manifest (points `skills` at `./skills/`)
- `.Codex-plugin/marketplace.json` — Codex marketplace registry (lists the `datocms` plugin for `/plugin` discovery)
- `.codex-plugin/plugin.json` — Codex plugin manifest (points `skills` at `./skills/`, includes Plugin Directory metadata)
- `skills/<skill-name>/SKILL.md` — skill definition (YAML frontmatter + markdown body)
- `skills/<skill-name>/references/` — detailed reference docs imported by the skill
- `skills/<skill-name>/agents/openai.yaml` — Codex agent interface config, must stay synced with SKILL.md frontmatter
- `skills/datocms-setup/` — special orchestrator skill that routes to 25 internal recipes via `references/recipe-manifest.json`
- `evals/` — trigger evaluation framework (Python scripts, JSON fixtures, result snapshots)
- `docs/` — longer reference material
- `local/` — local-only scratch (gitignored)

## Key Commands

```bash
# Validate repo invariants and metadata sync
python3 evals/scripts/validate_skill_repo.py --repo-root .

# Validate with clean-git gate (pre-publish)
python3 evals/scripts/validate_skill_repo.py --repo-root . --require-clean-git
```

**Never run evals proactively** — they are expensive. Only run when explicitly asked. See `evals/README.md` for the full eval workflow.
