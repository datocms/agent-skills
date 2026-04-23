# CLI Setup

Installation, authentication, project linking, profiles, token resolution, and global flags for `datocms`.

---

## Inputs to confirm before running commands

Confirm these inputs when they are not already clear:
- whether the user wants OAuth-based auth (`login` + `link`, best practice) or env-var-based auth
- which profile ids are needed
- whether the repo should preserve an existing migrations convention or create a new shared one
- whether the project expects JavaScript or TypeScript migrations
- whether custom migration template / migrations tsconfig paths already exist and must be preserved

---

Install the CLI in the project and run it locally:

```bash
npm install --save-dev datocms
npx datocms --help
```

Use local `npx datocms` commands by default so the repo controls the CLI
version. If the repo already has an established runner style (`pnpm exec`,
`bunx`, package scripts), keep that convention.

> **Package rename (v4.0.12+).** The CLI is now published as `datocms` on
> npm. The legacy `@datocms/cli` package still exists as a thin alias that
> depends on `datocms` and re-exports the same binary and programmatic API
> (including the `/lib/cma-client-node` deep path), so existing projects
> keep working unchanged. For any new install, recommendation, or example
> across this skill set, always use `datocms` (package and import path).
> If a project already has `@datocms/cli` in `package.json` or in
> migration imports (`from '@datocms/cli/lib/cma-client-node'`), it is not
> broken — but the one-line swap to `datocms` is preferred whenever the
> file is being edited anyway. The `datocms` package name also fixes
> `npx datocms …` under npm, which previously failed with a misleading
> "Missing script: datocms" error because npm/npx resolves by package
> name, not binary name.

---

## Authentication

CLI v4 uses **OAuth-based authentication** as the best practice.

### Log in

```bash
npx datocms login
```

Opens the browser for OAuth authentication. If port 7651 is in use, falls
back to a manual copy-paste flow. Re-running `login` replaces existing
credentials.

### Log out

```bash
npx datocms logout
```

Revokes the OAuth token remotely and removes local credentials.

### Check current account

```bash
npx datocms whoami
```

Shows the email, name, and company of the currently authenticated account.

---

## Listing Accessible Projects

Use `projects:list` to discover the projects the authenticated account
can reach across personal account and organizations. Read-only,
OAuth-only (no `--api-token`, no `--profile` — it never touches the
CMA, only the Dashboard API).

```bash
# List all projects (capped to --limit, default 20)
npx datocms projects:list

# Fuzzy-match by name or subdomain
npx datocms projects:list blog

# Restrict to a workspace (personal, org name, or org id)
npx datocms projects:list --workspace="Acme Corp"
npx datocms projects:list --workspace=personal

# Raise the cap
npx datocms projects:list --limit=100

# Machine-readable for scripts and agents
npx datocms projects:list blog --json
```

Search behavior:
1. **Exact match first** — if the query equals an `id`, `name` (case-insensitive), or full `domain` (case-insensitive), only those matches are returned.
2. **Fuzzy match otherwise** — scores against project name and short domain (custom domain or `internal_subdomain`). `.admin.datocms.com` is excluded from fuzzy matching.
3. Results sorted by score, capped to `--limit`. **Always returns a list, never a single "best" guess.**

JSON output schema (one object per project):

```json
{
  "id": "12345",
  "name": "Blog",
  "domain": "blog.admin.datocms.com",
  "workspace": {
    "type": "personal_account",
    "name": "Personal account",
    "id": null
  }
}
```

Common pipeline for agents bootstrapping a project link:

```bash
SITE_ID=$(npx datocms projects:list blog --json | jq -r '.[0].id')
npx datocms link --site-id=$SITE_ID
```

Only safe to auto-pick `.[0]` when the agent has high confidence the
query matches a single project (or the result has length 1). On
ambiguity, surface the list to the user and let them choose.

---

## Linking a Project

Use `link` to connect the current directory to a DatoCMS project and
configure its profile.

```bash
# Interactive: pick workspace + project, configure profile
npx datocms link

# Non-interactive: link to a specific project by ID (no prompts when
# OAuth credentials are already saved)
npx datocms link --site-id=12345

# Add the org id when the project belongs to an organization
npx datocms link --site-id=12345 --organization-id=67890

# Configure a named profile instead of "default"
npx datocms link --profile=staging --site-id=12345
```

`link` combines authentication and profile configuration:
1. Authenticates via OAuth (reuses existing credentials when present)
2. Picks a project — interactively when no `--site-id` is passed, otherwise non-interactively
3. Stores the project's `siteId` (and `organizationId`) in the profile
4. Configures migration directory, model API key, log level, etc.
   (auto-defaulted in non-TTY)

### Interactive vs non-interactive behavior

- **`--site-id` provided + OAuth credentials present** → fully non-interactive. Defaults are written for log level and migrations settings; the agent can drive this.
- **`--site-id` provided but no credentials** → fails fast in non-TTY with a suggestion to run `datocms login` first.
- **No `--site-id` in non-TTY** → fails fast with a suggestion to pass `--site-id=<ID>` (use `projects:list` to discover it) or run in an interactive terminal.
- **No `--site-id` in TTY** → interactive picker (workspace selection + project search prompt).

Alternatively, instead of linking to a project, you can choose to authenticate
via an API token environment variable during the interactive `link` flow.

Run `npx datocms link --help` for all available flags (`--profile`,
`--log-level`, `--migrations-dir`, `--migrations-model`,
`--migrations-template`, `--migrations-tsconfig`, `--organization-id`,
`--site-id`).

### Unlink a project

```bash
# Remove the default profile
npx datocms unlink

# Remove a named profile
npx datocms unlink --profile=staging
```

---

## Configuration File

The CLI uses `datocms.config.json` in the project root. Structure:

```json
{
  "profiles": {
    "default": {
      "siteId": "12345",
      "organizationId": "67890",
      "logLevel": "NONE",
      "migrations": {
        "directory": "migrations",
        "modelApiKey": "schema_migration",
        "template": "migrations/template.ts",
        "tsconfig": "tsconfig.migrations.json"
      }
    },
    "staging": {
      "apiTokenEnvName": "DATOCMS_STAGING_TOKEN",
      "logLevel": "BASIC",
      "migrations": {
        "directory": "migrations"
      }
    }
  }
}
```

### Profile Config Properties

| Property | Type | Description |
|---|---|---|
| `siteId` | `string` | DatoCMS project ID (set by `link` when using OAuth) |
| `organizationId` | `string` | Organization ID (set by `link` for org projects) |
| `apiTokenEnvName` | `string` | Custom env var name for the API token (overrides default naming convention) |
| `logLevel` | `"NONE" \| "BASIC" \| "BODY" \| "BODY_AND_HEADERS"` | API call logging verbosity |
| `logMode` | `"stdout" \| "file" \| "directory"` | Where logs are written |
| `baseUrl` | `string` | Custom API base URL (advanced) |
| `migrations.directory` | `string` | Path to migrations directory (relative to config file) |
| `migrations.modelApiKey` | `string` | API key of the model used to track migrations |
| `migrations.template` | `string` | Path to a custom migration template file |
| `migrations.tsconfig` | `string` | Path to tsconfig for running TS migrations |

---

## Active Profile Selection

The CLI decides **which profile configuration to use** in this order:

1. `--profile=<id>` on the command
2. `DATOCMS_PROFILE=<id>` in the environment
3. `default` profile in `datocms.config.json`

Use `DATOCMS_PROFILE` when multiple commands in the same shell should share the
same non-default profile.

---

## API Token Resolution

Once the active profile is known, the CLI resolves the API token in this order:

1. **`--api-token` flag** — passed directly on the command line
2. **Linked project** — if the profile has a `siteId` (set by `link`), the CLI
   uses OAuth credentials to fetch the project's API token via the Dashboard API.
   Requires a prior `datocms login`.
3. **Environment variable for the active profile** — uses the `apiTokenEnvName`
   from the profile config, or falls back to the default naming convention:
   - default profile: `DATOCMS_API_TOKEN`
   - named profile `staging`: `DATOCMS_STAGING_PROFILE_API_TOKEN`

The token must have CMA access enabled (`can_access_cma: true`).

### Example `.env` setup (for env-var-based auth)

```env
# For the default profile
DATOCMS_API_TOKEN=your_full_access_token

# For a named profile
DATOCMS_STAGING_PROFILE_API_TOKEN=your_staging_token
```

---

## Global Flags

Run `npx datocms <command> --help` to see available flags. CMA-based commands
support flags such as `--api-token`, `--profile`, `--log-level`, `--log-mode`,
and `--json`.

### Log Mode Details

- `stdout` — prints API call logs to the console
- `file` — appends logs to `./api-calls.log`
- `directory` — writes each API call to a separate file in `./api-calls/`
