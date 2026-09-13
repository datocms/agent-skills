<!--datocms-autoinclude-header start-->

<a href="https://www.datocms.com/"><img src="https://www.datocms.com/images/full_logo.svg" height="60"></a>

👉 [Visit the DatoCMS homepage](https://www.datocms.com) or see [What is DatoCMS?](#what-is-datocms)

---

<!--datocms-autoinclude-header end-->

# DatoCMS skill

One self-contained skill for building with [DatoCMS](https://www.datocms.com). Install `datocms` once to get content delivery, content management, content modeling, CLI workflows, frontend integrations, plugin development, setup, and feedback guidance.

The short entrypoint selects relevant topic references. Installing the whole package does not mean loading every reference into the conversation.

## Install

### Universal installer

```bash
npx skills add datocms/agent-skills --skill datocms
```

Choose your agent and installation scope when prompted. Update with `npx skills update`.

### Claude Code plugin

```text
/plugin marketplace add datocms/agent-skills
/plugin install datocms@datocms-skills
```

The plugin name stays `datocms`; its single skill is `/datocms:datocms`.

### Codex plugin

```bash
codex plugin marketplace add datocms/agent-skills
```

Open `/plugins` in a session and install DatoCMS from the plugin picker. The skill can also be invoked as `$datocms`.

### Archive

Download [datocms.zip](zips/datocms.zip) for clients that accept skill archives. It contains the same complete skill directory, including references, recipes, scripts, assets, and agent metadata. Available workflows depend on the host's tools. Development recipes require a local project and shell; uploading the archive does not provide those capabilities.

For scopes, detached copies, plugin updates, and migration instructions, see [the installation guide](docs/install.md).

## Usage

Describe the task normally:

- "Should testimonials be a model or a block?"
- "Write a DatoCMS GraphQL query for blog posts with images."
- "Fix the preview error in this Next.js project."
- "Set up visual editing in this app."
- "Create a migration that adds a category field."
- "Make this DatoCMS plugin's config screen match the dashboard."

Setup is available automatically when you request a setup outcome. It selects the necessary recipes and missing prerequisites. Explanations and focused fixes stay scoped to the request. Real-time updates are added only when requested or confirmed.

The [topic and recipe catalog](docs/skill-catalog.md) explains the available guidance. Setup reports `scaffolded` when required values remain unresolved and `production-ready` only after verification with the actual project values.

## Upgrading from the separate skills

Version 2 replaces the eight `datocms-*` skills with `datocms`. Plugin users update the existing plugin. Users of standalone skills should remove their old DatoCMS skill installations and install `datocms`; see [the migration steps](docs/install.md#upgrading-from-version-1).

The old skill names and installation selectors are retired. No alias skills are shipped. CLI versions that retrieve references from the old repository paths need upgrading.

## Skills and MCP

This package supplies development guidance for a coding agent. The [DatoCMS MCP server](https://www.datocms.com/docs/mcp-server) separately provides project access through tools. Follow the selected topic's execution requirements; installing this skill does not configure an MCP connection or grant access to a project.

## Contributing

- [Repository layout](docs/repo-layout.md)
- [Maintenance and validation](docs/maintenance.md)
- [Version 2 rollout](docs/rollout.md)
- [Existing evaluation tooling](evals/README.md)

Issues and pull requests are welcome at [datocms/agent-skills](https://github.com/datocms/agent-skills).

<!--datocms-autoinclude-footer start-->

---

# What is DatoCMS?

<a href="https://www.datocms.com/"><img src="https://www.datocms.com/images/full_logo.svg" height="60" alt="DatoCMS - The Headless CMS for the Modern Web"></a>

[DatoCMS](https://www.datocms.com/) is Headless CMS for the modern web. Trusted by 25,000+ businesses, agencies, and individuals, it gives your team one place to manage content and ship it to any website, app, or device via API.

**New here?** Start with [Create free account](https://dashboard.datocms.com/signup) and the [Documentation](https://www.datocms.com/docs). Stuck? Ask the [Community](https://community.datocms.com/). Curious what's new? [Product Updates](https://www.datocms.com/product-updates).

**Building with AI:** [Agent Skills](https://www.datocms.com/docs/agent-skills) turn coding assistants (Claude Code, Cursor) into expert DatoCMS developers, with full read/write via the auto-installed CLI. No local terminal? Use the [MCP Server](https://www.datocms.com/docs/mcp-server) instead.

**Talking to DatoCMS from code:**

- [Content Delivery API](https://www.datocms.com/docs/content-delivery-api) (CDA) — the fast, read-only GraphQL API your website/app uses to **fetch** published content.
- [Content Management API](https://www.datocms.com/docs/content-management-api) (CMA) — the REST API for **creating and updating** content, models, and project settings (think scripts, migrations, integrations).
- [CLI](https://www.datocms.com/docs/scripting-migrations/installing-the-cli) — terminal tool for schema migrations and importing from Contentful/WordPress.

**Framework guides:** end-to-end recipes for fetching content, rendering Structured Text, optimizing images/video, handling SEO, and setting up live preview with visual editing in [Next.js](https://www.datocms.com/docs/next-js), [Nuxt](https://www.datocms.com/docs/nuxt), [Svelte](https://www.datocms.com/docs/svelte), and [Astro](https://www.datocms.com/docs/astro).

**Want a head start?** Browse our [starter projects](https://www.datocms.com/marketplace/starters) — ready-to-deploy example sites for popular frameworks.

<!--datocms-autoinclude-footer end-->
