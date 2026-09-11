---
paths:
  - "skills/datocms/SKILL.md"
  - "skills/datocms/agents/openai.yaml"
  - "skills/datocms/references/**"
---

# Skill editing

Keep one public `datocms` entrypoint with automatic invocation enabled. Setup is selected for requested setup outcomes; explanations and focused fixes stay scoped.

Keep the metadata name, description hash, default prompt, and invocation policy synchronized. The public trigger fixture is `evals/fixtures/trigger/datocms.json`. Update its labels when routing changes, but run behavioral evaluations only when explicitly requested.

Use the entrypoint for task selection and essential standing rules. Put topic-specific mechanics in the selected guide. Preserve one authoritative copy of shared decisions and keep all runtime references inside the package.

The validator rejects host-specific body instructions such as `AskUserQuestion`, `Read tool`, `Claude Code alias`, and `slash alias` in the public entrypoint.
