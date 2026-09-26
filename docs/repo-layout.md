# Repo Layout

The "Repository Structure" list in [`AGENTS.md`](../AGENTS.md#repository-structure) (mirrored in `CLAUDE.md`) is the short shape of the repo. This page explains why the folders are split this way.

## Canonical Tree

```text
.agents/
  plugins/
    marketplace.json
.claude-plugin/
  plugin.json
  marketplace.json
.codex-plugin/
  plugin.json
skills/
  datocms-cda/
  datocms-cli/
  datocms-cma/
  datocms-structured-text/
  datocms-content-modeling/
  datocms-frontend-integrations/
  datocms-feedback/
  datocms-plugin/
  datocms-setup/
    agents/
    references/
docs/
evals/
  fixtures/
  scripts/
dev/
  package.json
  e2e/
  evals/coexistence/
  scripts/
  tests/
zips/
```

## Why It Is Split This Way

- `.claude-plugin/plugin.json` is the Claude Code plugin manifest. It points `skills` at `./skills/`, so Claude Code discovers the shipped skills automatically. This coexists with the Codex `agents/openai.yaml` files inside each skill folder for multi-platform support.
- `.claude-plugin/marketplace.json` is the Claude Code marketplace registry. It lists the `datocms` plugin with `source: "./"` (repo root), making the repo installable via `/plugin marketplace add datocms/agent-skills`.
- `.agents/plugins/marketplace.json` is the Codex marketplace file. It exposes this repo to `/plugins` in a local checkout and is what `codex plugin marketplace add datocms/agent-skills` reads. Its `name`, `datocms-local`, is part of the install id `datocms@datocms-local`, so renaming it breaks existing installs.
- `.codex-plugin/plugin.json` is the Codex plugin manifest. It points `skills` at `./skills/` so Codex discovers the shipped skills automatically. It also includes the plugin install-surface metadata used by Codex.
- `skills/` contains the shipped skill folders. Their names match each skill's canonical `name:` value.
- `skills/datocms-structured-text/` owns the DAST document lifecycle through focused references and a narrow Markdown/HTML conversion helper. Other skills link to those references while retaining their API, renderer, schema, or editor responsibilities.
- `skills/datocms-plugin/` is the public plugin entrypoint. It covers new plugin scaffolds, existing plugin maintenance, SDK hook work, and plugin UI work that should match DatoCMS patterns.
- `skills/datocms-setup/` is the guided setup skill. Its `SKILL.md` owns the conversation, and `references/website.md` and `references/project.md` link each play to the sibling files and headings that hold the implementation. It ships no code, so nothing is duplicated between setup and the skills that own each concern.
- `docs/` is for longer reference material that would make the root README too heavy.
- `zips/` holds one archive per skill for uploading to Claude chat; the pre-commit hook rebuilds the archives of skills with staged changes.
- `evals/` holds the trigger check, a lint of skill descriptions: fixtures and scripts. Runs write results under `evals/results/`, committed only from a deliberate run. Its scripts are Python and need no npm packages.
- `dev/` holds all Node tooling: the e2e and regression harness, the coexistence evaluator, offline tests, formatting config, release scripts, and their `package.json`/`package-lock.json`. Plugin installs copy the repo root, and Claude Code runs `npm ci` there whenever it finds `package.json` plus a lockfile, so keeping these files out of the root spares every user a dev-dependency install. The validator rejects a root `package.json` with a lockfile. For the same reason, runs write to gitignored `local/`, and a report that cites a large raw ledger links it at a commit permalink instead of keeping it in the tree; the validator fails on tracked files over 1 MB.
