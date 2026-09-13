# Complete setup outcomes

Use setup when the user asks for a complete named feature/workflow or first-time project setup. Select it automatically from that intent; no separate skill invocation is needed. A narrow query, explanation, or existing-code fix stays in its topic guide.

## Select and complete the minimum work

1. Inspect existing code with [repo conventions](setup/repo-conventions.md) and [setup rules](setup/mandatory-rules.md). Reuse working prerequisites instead of reinstalling or replacing them.
2. For an empty project with no `package.json` or `datocms.config.json`, resolve existing-project vs new-project intent only if the user has not already specified it. See the setup rules' project section.
3. Read the [router](setup/router.md) and [recipe manifest](setup/recipe-manifest.json). Choose the smallest requested recipe/bundle. Manifest paths are relative to the skill root.
4. Inspect each prerequisite before queueing it. Add only missing prerequisites necessary for the selected outcome; preserve existing implementations.
5. For visual editing, check draft mode and Content Link; include Web Previews unless the user asked for website-only click-to-edit. Add real-time updates only when requested or confirmed.
6. On a complete first-time DatoCMS TypeScript setup, queue `cma-types` alongside `cli-bootstrap`. Do not impose this baseline on unrelated narrow changes.
7. Load only selected recipes, their listed references, and required setup rules. Track the queued work and verify it as completed.
8. Use [modeling](modeling.md) for unresolved schema-design decisions, then [schema changes](cli/schema-changes.md) for implementation. Resume the selected recipe after the needed schema exists.
9. Patch existing code in place. End with [output status](setup/output-status.md), the actual recipes used, checks performed, and unresolved project-specific values.

For a clear outcome, use targeted routing. For broad setup, ask only the unresolved choice of lane or outcome. Additional questions should resolve a material decision that inspection cannot answer, such as preview route ownership, an import target, or a release environment.

## Greenfield frontend starters

For a new frontend, offer the appropriate official starter if the user has not already chosen another starting point. These starters provide existing preview, Content Link, real-time, and typed-query implementations to inspect and adapt.

| Framework | Repository | Marketplace |
| - | - | - |
| Next.js | <https://github.com/datocms/nextjs-starter-kit> | <https://www.datocms.com/marketplace/starters/next-js-starter-kit> |
| Nuxt | <https://github.com/datocms/nuxt-starter-kit> | <https://www.datocms.com/marketplace/starters/nuxt-starter-kit> |
| SvelteKit | <https://github.com/datocms/sveltekit-starter-kit> | <https://www.datocms.com/marketplace/starters/sveltekit-starter-kit> |
| Astro | <https://github.com/datocms/astro-starter-kit> | <https://www.datocms.com/marketplace/starters/astro-starter-kit> |

If selected, clone/configure the starter and verify the requested outcome before adding recipes. Do not duplicate features already supplied by the starter or call a clone alone production-ready. If the user chooses scaffolding, continue with the minimum recipe bundle.

## Scope and completion

Recipe IDs such as `draft-mode`, `visual-editing`, and `migration-release-workflow` are internal labels. Continue the task here rather than asking the user to invoke another skill.

Apply shared prerequisites once. Preserve explicit choices about overlays, real-time behavior, profiles, migration history, imports, and deployment. A missing optional feature is not a reason to expand scope.

Report `scaffolded` when provider choices, credentials, routes, mappings, or other placeholders remain. Report `production-ready` only when the requested integration works end to end with no unresolved values. Keep status and test instructions proportional to the selected recipes.
