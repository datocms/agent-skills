# Importing Content

WordPress and Contentful import commands.

Standalone Markdown/HTML → Structured Text is a different task: load [conversion](../../datocms-structured-text/references/conversion.md) from `datocms-structured-text`, then [CMA editing records](../../datocms-cma/references/editing-records.md) only when importing the result into a project. Do not run an onboarding importer for an isolated document conversion.

## Contents

- Inputs to confirm before running commands
- WordPress Import
- Contentful Import

## Inputs to confirm before running commands

These importers are best treated as onboarding tools for a **new or disposable** DatoCMS target.

Confirm these inputs when they are not already clear:

- whether the target is a disposable/new DatoCMS project or an existing one
- schema-only first vs full import
- content-type narrowing needs
- concurrency / ignore-errors tolerance for large asset sets

If the target is existing or unclear, prefer a staged approach:

- run once **without** `--autoconfirm`
- consider schema-only or narrowed imports first when the importer supports it
- call out any destructive schema-reset behavior explicitly

Importers have no DatoCMS environment flag: they always write to the primary environment of the profile or `--api-token` project, so a sandbox fork can't isolate them. To rehearse against a project holding content, import first into a separate disposable project (another profile or `--api-token`).

Without `--autoconfirm`, the importer asks in the terminal before destroying each clashing model — a non-TTY agent shell can't answer, so a staged run is the user's step in their own terminal. Credentials (`--wp-password`, `--contentful-token`) come from env vars the user sets (e.g. `--wp-password="$WORDPRESS_PASSWORD"`), never pasted into chat.

## WordPress Import

### Installation

```bash
npx datocms plugins:install @datocms/cli-plugin-wordpress
```

Installs into the per-user CLI data directory, never as project dependency — `npm install` of the plugin never registers `wordpress:import`. Each teammate runs `npx datocms login` and the `plugins:install` command above once: CLI login and plugins are per machine.

### Command

```bash
npx datocms wordpress:import [flags]
```

Run `npx datocms wordpress:import --help` for all flags. Key flags include `--autoconfirm` (skip prompts), `--concurrency` (default: 15), and `--ignore-errors`.

Site URL: `--wp-url` (any URL of REST-enabled site; API endpoint auto-discovered) or `--wp-json-api-url` (exact `/wp-json` endpoint, no discovery — prefer when known) — mutually exclusive, one required. `--wp-username` and `--wp-password` required.

### Destructive behavior

The importer destroys existing WordPress schema (`wp_*` models) in the DatoCMS target before recreating it.

### Import Steps

1. Destroy existing WordPress schema (`wp_*` models) from DatoCMS
2. Import WordPress metadata (concurrently):
   - Categories
   - Tags
   - Authors
   - Assets
3. Import WordPress content (concurrently):
   - Pages
   - Articles

### Example

```bash
npx datocms wordpress:import \
  --wp-url=https://myblog.wordpress.com \
  --wp-username=admin \
  --wp-password=secret
```

Add `--autoconfirm` only when the operator intentionally wants a non-interactive run.

## Contentful Import

### Installation

```bash
npx datocms plugins:install @datocms/cli-plugin-contentful
```

Installs into the per-user CLI data directory, never as project dependency — `npm install` of the plugin never registers `contentful:import`. Each teammate runs `npx datocms login` and the `plugins:install` command above once: CLI login and plugins are per machine.

### Command

```bash
npx datocms contentful:import [flags]
```

Run `npx datocms contentful:import --help` for all flags. Key flags include `--autoconfirm` (skip prompts), `--concurrency` (default: 15), and `--ignore-errors`.

`--contentful-token` needs Contentful Content Management API token (personal access token): importer reads through `contentful-management`, so Delivery/Preview API keys don't work despite flag help saying "read-only API token". `--contentful-environment` picks Contentful environment by name (default `master`; unknown → `Could not find environment named "…"`).

### Destructive behavior

The importer destroys existing Contentful-shaped schema in the DatoCMS target before recreating it. Only prompt (skipped by `--autoconfirm`): destroying existing models whose api_keys match the imported content types (snake_cased Contentful id + `_model`: `blogPost` → `blog_post_model`). It also replaces the project's locales with the Contentful locales (site update, no prompt, even with `--skip-content`).

### Import Steps

1. Download Contentful schema
2. Destroy existing Contentful schema from DatoCMS
3. Copy Contentful schema:
   - Set locales
   - Import models
   - Import fields
4. Import content (skipped if `--skip-content`):
   - Import assets
   - Import records
5. Add validations to fields

### Examples

```bash
# Full import from Contentful
npx datocms contentful:import \
  --contentful-token=your_token \
  --contentful-space-id=your_space

# Schema-only import (no content)
npx datocms contentful:import \
  --contentful-token=your_token \
  --contentful-space-id=your_space \
  --skip-content

# Import specific content types only
npx datocms contentful:import \
  --contentful-token=your_token \
  --contentful-space-id=your_space \
  --only-content-type=blogPost,landingPage,author
```

Add `--autoconfirm` only when the operator intentionally wants a non-interactive run.
