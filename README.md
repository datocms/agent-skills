<!--datocms-autoinclude-header start-->

<a href="https://www.datocms.com/"><img src="https://www.datocms.com/images/full_logo.svg" height="60"></a>

👉 [Visit the DatoCMS homepage](https://www.datocms.com) or see [What is DatoCMS?](#what-is-datocms)

---

<!--datocms-autoinclude-header end-->

# DatoCMS Skills

Skills that teach Claude, Codex, Cursor and other coding agents how to work with [DatoCMS](https://www.datocms.com): GraphQL queries, content scripts, schema design, plugin development and guided project setup.

All open source. Claude Code and Codex install them as a plugin; any other agent installs them with `npx skills`.

## What's covered

The skills load on their own, based on what you ask. They link to each other, so every install method brings the full set.

**Building with DatoCMS**

- **Content modeling**: schema design. Model or block, linked or embedded content, taxonomies, field types, validators, editor settings.
- **Reading content**: GraphQL queries against the Content Delivery API. Filters, pagination, locales, Structured Text, responsive images, SEO, typed queries.
- **Structured Text**: build, edit, validate and convert rich-text documents (the DAST format). Import Markdown or HTML, keep embedded blocks and links intact during edits, export to HTML or plain text.
- **Writing content and automation**: create, update and publish records, bulk imports and exports, asset uploads, environments, webhooks, roles, scheduled publishing, audit logs.
- **CLI**: migrations, generated schema types, typed scripts, CI/CD pipelines, imports from WordPress and Contentful.
- **Frontend integrations**: draft mode, Web Previews, Visual Editing, Content Link, real-time previews, cache invalidation, SEO and sitemaps for Next.js, Nuxt, SvelteKit and Astro.
- **Guided setup**: plans a setup with you and changes nothing until you agree. See [Guided setup](#guided-setup).
- **Feedback**: when a skill or the MCP server leaves you stuck, writes a report with private details removed and opens a prefilled DatoCMS support form.

**Extending the DatoCMS dashboard**

- **Plugin development**: create or change DatoCMS plugins. SDK hooks, Vite and React, API calls from the browser, permissions, package metadata.
- **Plugin design**: plugin UI that looks native to the dashboard, built with `datocms-react-ui` 4. Components, layouts, color tokens, dark mode, upgrades from 2.x. Every page of react-ui.datocms.com is bundled.

Skill names, and which skill handles each setup topic: [`docs/skill-catalog.md`](docs/skill-catalog.md).

## Install

### Claude Code (recommended)

```bash
/plugin marketplace add datocms/agent-skills
/plugin install datocms@datocms-skills
```

Skills appear under the plugin's name, for example `/datocms:datocms-cda`. To update automatically, open `/plugin` → **Marketplaces** → `datocms-skills` and enable auto-update. To update by hand, run `claude plugin update datocms@datocms-skills`.

### Codex

```bash
codex plugin marketplace add datocms/agent-skills
```

Then open a Codex session, run `/plugins`, choose **DatoCMS** and install the plugin.

### Cursor, Windsurf, GitHub Copilot and other agents

```bash
npx skills add datocms/agent-skills
```

Update with `npx skills update`. To install for a whole team, install a single skill or keep a standalone copy, see [`docs/install.md`](docs/install.md).

### Claude.ai and Claude Desktop chat

Chat apps take skills as `.zip` uploads. Download the ones you need from [`zips/`](zips/), then upload and enable them under **Customize → Skills** in [Claude](https://claude.ai). For editorial work, start with [`datocms-content-modeling.zip`](zips/datocms-content-modeling.zip) (schema advice) and [`datocms-cma.zip`](zips/datocms-cma.zip) (content operations).

Schema advice needs no connection. To read or change a live project from chat, also connect the [DatoCMS MCP server](https://www.datocms.com/docs/mcp-server). Installing the skills in Claude Code does not enable them in chat.

## Usage

Describe what you want in plain language. The right skill loads on its own:

- "Should testimonials be a model or a block?"
- "Write a GraphQL query to fetch all blog posts with images"
- "Add draft mode to my Next.js app"
- "Create a migration that adds a `category` field to the blog_post model"
- "Import this CSV into the authors model"
- "Convert this Markdown article into Structured Text"
- "Make my plugin config screen match the DatoCMS style"

### Guided setup

`datocms-setup` handles setup with several parts: previews and visual editing, caching, SEO, search, migrations and releases, webhooks, imports, or a new site from a starter. It inspects your repository, asks only what it cannot work out, and shows a plan in the order the steps must happen: files, packages, environment variables, and each change to your DatoCMS project. Nothing changes until you agree, and changes to a live project need their own approval. The code itself comes from the other skills.

It loads on setup requests. To call it directly, say the outcome you want:

| Agent | Command |
| - | - |
| Claude Code | `/datocms:datocms-setup <your request>` |
| Codex | `$datocms-setup <your request>` |

```text
/datocms:datocms-setup set up draft mode and web previews
/datocms:datocms-setup add migrations and a release workflow
/datocms:datocms-setup install visual editing in this project
```

Each run ends with a status: `scaffolded` when placeholders are left for you to fill in (API tokens, route mappings), or `production-ready` when it uses real project values and was run end to end.

## Skills and the MCP server

The skills tell the agent how to do DatoCMS work. The [DatoCMS MCP server](https://www.datocms.com/docs/mcp-server) gives it a connection to a live project. Each works without the other:

- **Skills alone** cover everything through the DatoCMS CLI and API clients. Installing them does not install or require the MCP server.
- **The MCP server alone** gives the agent project access, with its own tools and instructions.
- **Both together**: the content modeling and content management skills can read and change a project through a server you have already connected. This also works in chat apps, where there is no local workspace.

Migrations, repository configuration and application code always need a local checkout. More in [installation and compatibility](docs/install.md#skills-and-remote-mcp).

## Documentation

- [`docs/install.md`](docs/install.md): every install option, and how updates work
- [`docs/skill-catalog.md`](docs/skill-catalog.md): all skills, and which one handles each setup topic
- [`docs/repo-layout.md`](docs/repo-layout.md): how the repository is organized, and why
- [`docs/maintenance.md`](docs/maintenance.md): contributor workflow (checks, zips, releases)
- [`evals/README.md`](evals/README.md): checks that each skill loads for the right requests
- [`dev/evals/README.md`](dev/evals/README.md): what the skills change for an agent, measured against a baseline
- [`dev/e2e/README.md`](dev/e2e/README.md): end-to-end tests that run real agent sessions

## Development

You need Node 24 or later, Python 3 and git. All Node tooling lives in `dev/`, so plugin users never install its dependencies. From the repository root:

```bash
npm ci --prefix dev                           # dependencies and the pre-commit hook
python3 evals/scripts/validate_skill_repo.py  # repository checks (the hook runs them too)
npm --prefix dev run typecheck
npm --prefix dev run format:check
npm --prefix dev test                         # offline tests
```

The pre-commit hook formats staged Markdown, rebuilds the zips of changed skills and runs the repository checks. Tests that call a model cost money and run only on request: see [`evals/README.md`](evals/README.md) and [`dev/e2e/README.md`](dev/e2e/README.md). Never add a `package.json` or a lockfile at the repository root: Claude Code would install it for every plugin user, and the checks reject it.

## Contributing

Issues and pull requests are welcome at [github.com/datocms/agent-skills](https://github.com/datocms/agent-skills). The workflow is in [`docs/maintenance.md`](docs/maintenance.md).

<!--datocms-autoinclude-footer start-->

---

# What is DatoCMS?

<a href="https://www.datocms.com/"><img src="https://www.datocms.com/images/full_logo.svg" height="60" alt="DatoCMS - The Headless CMS for the Modern Web"></a>

[DatoCMS](https://www.datocms.com/) is Headless CMS for the modern web. Trusted by 25,000+ businesses, agencies, and individuals, it gives your team one place to manage content and ship it to any website, app, or device via API.

**New here?** Start with [Create free account](https://dashboard.datocms.com/signup) and the [Documentation](https://www.datocms.com/docs). Stuck? Ask the [Community](https://community.datocms.com/). Curious what's new? [Product Updates](https://www.datocms.com/product-updates).

**Building with AI:** [Agent Skills](https://www.datocms.com/docs/agent-skills) guide DatoCMS workflows in compatible assistants. Use local CLI and code workflows for development, or pair content workflows with the optional [MCP Server](https://www.datocms.com/docs/mcp-server) for connected project access.

**Talking to DatoCMS from code:**

- [Content Delivery API](https://www.datocms.com/docs/content-delivery-api) (CDA) — the fast, read-only GraphQL API your website/app uses to **fetch** published content.
- [Content Management API](https://www.datocms.com/docs/content-management-api) (CMA) — the REST API for **creating and updating** content, models, and project settings (think scripts, migrations, integrations).
- [CLI](https://www.datocms.com/docs/scripting-migrations/installing-the-cli) — terminal tool for schema migrations and importing from Contentful/WordPress.

**Framework guides:** end-to-end recipes for fetching content, rendering Structured Text, optimizing images/video, handling SEO, and setting up live preview with visual editing in [Next.js](https://www.datocms.com/docs/next-js), [Nuxt](https://www.datocms.com/docs/nuxt), [Svelte](https://www.datocms.com/docs/svelte), and [Astro](https://www.datocms.com/docs/astro).

**Want a head start?** Browse our [starter projects](https://www.datocms.com/marketplace/starters) — ready-to-deploy example sites for popular frameworks.

<!--datocms-autoinclude-footer end-->
