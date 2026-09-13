---
name: datocms
description: >-
  Answer DatoCMS-specific questions, explain its APIs and workflows, design
  content models, query the GraphQL Content Delivery
  API, manage records and uploads, use the CLI and migrations, integrate
  frontend previews and rendering, develop dashboard plugins, or set up a
  complete project workflow. Also handle explicit feedback about DatoCMS skills
  or MCP experiences. Use for DatoCMS work in new or existing projects,
  including short follow-ups such as "publish them" or "fix those slugs".
---

# DatoCMS

Use the topic guide that matches the requested outcome. This package contains all guides, references, setup recipes, scripts, and assets; no sibling skill install is needed.

## Choose the workflow

| User intent | Read |
| - | - |
| Content design: models vs blocks, fields, reuse, taxonomy, editor organization | [Modeling](references/modeling.md) |
| GraphQL content reads, filtering, pagination, media, localization, query types | [CDA](references/cda.md) |
| Records, uploads, publishing, bulk edits, access, or application automation | [CMA](references/cma.md) |
| CLI commands, project linking, schema inspection, migrations, environments, imports | [CLI](references/cli.md) |
| Existing website integration: rendering, preview endpoints, Content Link, cache invalidation | [Frontend](references/frontend.md) |
| Create, maintain, or restyle a DatoCMS dashboard plugin | [Plugin](references/plugin.md) |
| Complete named setup outcome, missing prerequisites, or first project setup | [Setup](references/setup.md) |
| Explicit skills/MCP feedback request, or an exhausted workflow with no credible next step | [Feedback](references/feedback.md) |

Read one guide first, then only the references it selects. Combine guides when the task crosses topics. Do not load the entire reference or recipe tree.

After context compaction, reread this entrypoint and the active topic guide before continuing DatoCMS work. Reload only the specific references needed for the next step; preserve established scope and decisions.

## Routing priorities

- Keep the user's current DatoCMS context across short follow-ups.
- A question about how to model content starts with modeling. Creating that schema then uses the CLI's schema-change workflow.
- A specific CLI command or migration question stays in CLI. A request to establish a complete migration/release workflow uses setup.
- Publishing records, fixing slugs, or importing a CSV uses CMA. These requests do not imply full project setup.
- Writing a query uses CDA. A full feature installation can use setup; an existing component or endpoint fix uses frontend.
- Creating a DatoCMS dashboard plugin uses plugin, including requests phrased "set up a plugin".
- Setup activates from the requested outcome without a separate invocation. Add only missing prerequisites required for that outcome.
- Visual editing does not imply real-time updates. Add real-time subscriptions only when requested or confirmed.
- A fixable error remains in its active workflow. Feedback is not a substitute for a credible retry.

## Shared operating rules

1. Preserve explicit user scope and prior decisions. For explanations, diagnosis, or read-only reviews, do not install dependencies, link projects, or perform writes merely because an operational guide includes those steps.
2. Reuse established context. Inspect the existing implementation before editing; preserve its framework, package manager, file layout, query wrappers, and working conventions.
3. Use the DatoCMS CLI for agent-side project discovery, schema inspection, migrations, and CMA operations. See [project access](references/cli/cli-setup.md) when live project access is needed. Do not switch to DatoCMS MCP tools for those operations.
4. Keep browser plugin runtime calls separate from agent-side operations. SDK helpers and browser CMA belong to plugin code; see the plugin guide only for that work.
5. Confirm unresolved project/environment choices before writes. A project search result alone does not select the user's target. Preserve authorization already established in the conversation.
6. Keep tokens out of chat, source control, and hardcoded examples. Use read-only CDA access for reads; use scoped CMA credentials only where needed. Interactive CLI work uses OAuth/linking; unattended runtime code uses environment variables.
7. Preserve TypeScript inference and use type-only imports. Do not silence errors with assertions. Runtime-specific script validation belongs in [CLI scripting](references/cli/cma-script.md).
8. Check command/payload details with the installed CLI's help and `cma:docs` when writing CMA operations. Domain references explain workflows and ordering, not a replacement API schema.
9. Verify the behavior changed, with checks appropriate to the task. Report missing mappings, credentials, or placeholders accurately. Use setup's completion statuses only for setup work.

## Package navigation

- Topic guides are in `references/`. Their domain references are in matching subdirectories.
- Markdown and backtick file paths resolve relative to the document containing them.
- The [setup manifest](references/setup/recipe-manifest.json) uses paths relative to this skill directory, as declared by `path_base`.
- Setup recipes live under `recipes/<group>/<recipe>/`. Their scripts and assets stay beside the recipe that owns them.
- Topic names are routing labels inside this one skill. Continue the task here instead of asking the user to install or invoke another DatoCMS skill.
