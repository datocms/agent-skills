# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Project Overview

DatoCMS skills repository — public skills that provide focused guidance for content delivery, content management, content modeling, Structured Text, CLI workflows, frontend integrations, plugin development, and project setup. Ships as static markdown; no build or bundle step.

## Repository Structure

- `.claude-plugin/plugin.json` — Claude Code plugin manifest (points `skills` at `./skills/`)
- `.claude-plugin/marketplace.json` — Claude Code marketplace registry (lists the `datocms` plugin for `/plugin` discovery)
- `.codex-plugin/plugin.json` — Codex plugin manifest (points `skills` at `./skills/`, includes Plugin Directory metadata)
- `skills/<skill-name>/SKILL.md` — skill definition (YAML frontmatter + markdown body)
- `skills/<skill-name>/references/` — detailed reference docs imported by the skill
- `skills/<skill-name>/agents/openai.yaml` — Codex agent interface config, must stay synced with SKILL.md frontmatter
- `skills/datocms-setup/` — guided setup skill: owns only the conversation (inspect, ask, plan, confirm, live-change consent, handoff); `references/website.md` and `references/project.md` link to the sibling files and headings that hold the implementation (no code; the validator checks every link resolves)
- `skills/datocms-cma/references/records.md` and `editing-records.md` — also served live from `master` by the hosted DatoCMS MCP server: never move or rename them, and read [Hosted MCP dependency](docs/maintenance.md#hosted-mcp-dependency) before editing
- `evals/` — trigger evaluation framework (Python scripts, JSON fixtures, result snapshots)
- `docs/` — longer reference material
- `dev/` — Node dev tooling (e2e and regression harness, coexistence evaluator, offline tests, formatting, release scripts) with its own `package.json`; install with `npm ci --prefix dev`. Never put a `package.json` plus lockfile at the repo root: plugin installs would install them for every user
- `local/` — local-only scratch (gitignored)

## Key Commands

```bash
# Validate repo invariants and metadata sync
python3 evals/scripts/validate_skill_repo.py --repo-root .

# Validate with clean-git gate (pre-publish)
python3 evals/scripts/validate_skill_repo.py --repo-root . --require-clean-git
```

**Never run evals proactively** — they are expensive. Only run when explicitly asked. See `evals/README.md` for the full eval workflow.
