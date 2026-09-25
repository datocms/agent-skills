---
paths:
  - "skills/datocms-setup/**"
---

# Setup Orchestrator Rules

`datocms-setup` owns only the conversation: goal, questions, play choice and order, plan-then-confirm, scope lock, live-change consent, handoff (`scaffolded` / `production-ready`). Implementation lives in the sibling skills.

- No implementation facts in setup: no code, env var names, packages, commands or API facts beyond what a question or inspection step needs. A missing fact goes into the owning sibling; setup then links to it.
- Every pointer is a relative link to a sibling file or heading (`../../datocms-<skill>/references/<file>.md#<heading-slug>`), or FW › `Heading` for a heading present in all four framework references (`nextjs`, `nuxt`, `sveltekit`, `astro`). `evals/scripts/validate_skill_repo.py` fails on unresolved files, anchors and FW headings, and on fenced code blocks.
- Renaming a linked sibling heading → update the setup links in the same change.
- Setup text and replies never say `recipe`, `lane` or `Stage A/B` (`dev/tests/setup-facts.test.mjs`, `dev/e2e/regressions/cases/setup-guided.mjs`).
