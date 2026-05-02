---
paths:
  - "skills/datocms-setup/recipes/**"
  - "skills/datocms-setup/patterns/**"
  - "skills/datocms-setup/references/**"
---

# Setup Recipe Rules

All setup recipes must follow the mandatory rules:

@skills/datocms-setup/patterns/MANDATORY_RULES.md

## Routing

Setup routing is defined in `skills/datocms-setup/references/router.md` with the recipe registry in `skills/datocms-setup/references/recipe-manifest.json`. Recipes have prerequisite chains — changes to one recipe may affect others.

## Repo Conventions

Before writing recipe-specific detection logic, start from the shared conventions:

@skills/datocms-setup/references/repo-conventions.md
