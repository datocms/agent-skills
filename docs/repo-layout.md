# Repo Layout

The root [README](../README.md#repo-layout) shows the short shape of the repo.
This page explains why the folders are split this way.

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
  datocms-frontend-integrations/
  datocms-plugin-builder/
  datocms-plugin-design-system/
  datocms-plugin-scaffold/
  datocms-setup/
    agents/
    references/
    recipes/
docs/
evals/
  results/
  reports/
  scripts/
```

## Why It Is Split This Way

- `.claude-plugin/plugin.json` is the Claude Code plugin manifest. It points `skills` at `./skills/`, so Claude Code discovers all eight skills automatically. This coexists with the Codex `agents/openai.yaml` files inside each skill folder for multi-platform support.
- `.claude-plugin/marketplace.json` is the Claude Code marketplace registry. It lists the `datocms` plugin with `source: "."` (repo root), making the repo installable via `/plugin marketplace add datocms/llm-skills`.
- `.agents/plugins/marketplace.json` is the repo-scoped Codex marketplace file. It exposes this repo as a local Codex plugin source for `/plugins` while developing or validating the plugin locally.
- `.codex-plugin/plugin.json` is the Codex plugin manifest. It points `skills` at `./skills/` so Codex discovers all eight skills automatically. It also includes the plugin install-surface metadata used by Codex.
- `skills/` contains the shipped skill folders. Their names match each skill's canonical `name:` value.
- `skills/datocms-plugin-design-system/` is the public design companion for native-feeling DatoCMS plugin UI work. It stays reference-heavy and pairs with plugin builder/scaffold work instead of replacing them.
- `skills/datocms-setup/` is the only shipped setup entrypoint. Its `SKILL.md` stays small and routes into local recipes through references and a manifest.
- `skills/datocms-setup/recipes/frontend-foundation/` contains project primitives such as data access, draft mode, previews, cache tags, and type generation.
- `skills/datocms-setup/recipes/frontend-features/` contains rendering and discovery add-ons layered on top of that foundation.
- `skills/datocms-setup/recipes/migrations/` contains repeatable schema and environment workflows.
- `skills/datocms-setup/recipes/onboarding/` contains one-shot content import flows.
- `skills/datocms-setup/recipes/platform/` contains project-level integrations such as webhooks, build triggers, and CMA type generation.
- `docs/` is for longer reference material that would make the root README too heavy.
- `evals/` keeps fixtures, checked-in results, reports, and tooling together so the trigger-quality loop is easy to inspect.
