# CLI Setup

Installation, authentication, project linking, profiles, token resolution, and global flags for `datocms`.

## Contents

- Inputs to confirm before running commands
- Authentication
- Listing Accessible Projects
- Linking a Project
- Configuration File
- Active Profile Selection
- API Token Resolution
- Command Flags

## Inputs to confirm before running commands

Confirm these inputs when unclear:

- user wants OAuth (`login` + `link`, best practice) vs env-var auth
- which profile ids
- preserve existing migrations convention or create new
- JavaScript or TypeScript migrations
- custom migration template/tsconfig paths must be preserved

---

Install CLI locally:

```bash
npm install --save-dev datocms
npx datocms --help
```

Default to local `npx datocms` commands so repo controls CLI version. If repo has established runner style (`pnpm exec`, `bunx`, package scripts), keep that convention.

> **Package rename (v4.0.12+).** CLI published as `datocms` on npm. Legacy `@datocms/cli` exists as thin alias depending on `datocms` and re-exporting same binary and programmatic API (including `/lib/cma-client-node`), so existing projects keep working. For new installs/recommendations/examples, always use `datocms` (package and import path). If project has `@datocms/cli` in `package.json` or migration imports (`from '@datocms/cli/lib/cma-client-node'`), not broken — but one-line swap to `datocms` preferred when file is being edited. `datocms` package name also fixes `npx datocms …` under npm, which previously failed with misleading "Missing script: datocms" error.

## Authentication

CLI v4+ uses **OAuth-based authentication** as best practice.

### Log in

```bash
npx datocms login
```

Opens browser for OAuth. Port 7651 in use → manual copy-paste flow. Re-running `login` replaces existing credentials. Credentials live in per-user OS config dir, not the repo: one login per machine serves every repo; teammates and CI don't inherit it.

### Log out

```bash
npx datocms logout
```

Revokes OAuth token remotely and removes local credentials.

### Check current account

```bash
npx datocms whoami
```

Shows email, name, company of currently authenticated account.

## Listing Accessible Projects

Use `projects:list` to discover projects authenticated account can reach across personal account and organizations. Read-only, OAuth-only (no `--api-token`, no `--profile` — never touches CMA, only Dashboard API).

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

1. **Exact match first** — query equals `id`, `name` (case-insensitive), or full `domain` (case-insensitive) → only those matches.
2. **Fuzzy match otherwise** — scores against project name and short domain (custom or `internal_subdomain`). `.admin.datocms.com` excluded from fuzzy matching.
3. Results sorted by score, capped to `--limit`. **Always returns list, never single "best" guess.**
4. Query matches nothing → error `No projects match '<query>'`: rerun without query (default cap 20: raise `--limit` or narrow with `--workspace`). No accessible project at all → error `No projects found.`: user creates one at <https://dashboard.datocms.com/>, then link.

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

Agent bootstrap pipeline:

```bash
npx datocms projects:list blog --json
# show each candidate (name, id, workspace); wait for explicit yes
npx datocms link --site-id=<id> [--organization-id=<workspace.id>]
```

Never auto-pick `.[0]`, even when list has one result: link only project user explicitly confirmed. `--organization-id` = `workspace.id` when `workspace.type` is `organization`.

## Linking a Project

Use `link` to connect current directory to DatoCMS project and configure profile.

Profiles map to **separate projects or auth contexts**, not to environments of the same project. Staging/production environments of one project use per-command `--environment=<id>` (`migrations:run`: `--source`/`--destination`). Multi-project workflows (one repo managing several DatoCMS projects) use named profiles (see blueprint-sync.md).

```bash
# Interactive: pick workspace + project, configure profile
npx datocms link

# Non-interactive: link to a specific project by ID (no prompts when
# OAuth credentials are already saved)
npx datocms link --site-id=12345

# Add the org id when the project belongs to an organization
npx datocms link --site-id=12345 --organization-id=67890

# Configure a named profile instead of "default" (e.g. one profile per
# project in a blueprint-sync repo, sharing ./migrations)
npx datocms link --profile=client_a --site-id=12345 --migrations-dir=./migrations
```

`link` combines authentication and profile configuration:

1. Authenticates via OAuth (reuses existing credentials when present)
2. Picks project — interactively when no `--site-id`, otherwise non-interactively
3. Stores project's `siteId` (and `organizationId`) in profile
4. Configures migration directory, model API key, log level, etc. (auto-defaulted in non-TTY)

Extra profile: linking a profile not yet in a config that already has another (e.g. `default`) defaults its migrations directory to `./<camelCase(profileId)>Migrations` (`client_a` → `./clientAMigrations`; same TTY prompt default) — splits shared migration history (`migrations:run` → `Directory "…" does not exist!`). Pass `--migrations-dir=./migrations` (model already defaults to `schema_migration`), or write the profile block first — existing `migrations.directory` kept.

### Interactive vs non-interactive behavior

- **`--site-id` provided + OAuth credentials present** → fully non-interactive. Defaults written for log level and migrations; agent can drive.
- **`--site-id` provided but no credentials** → fails fast in non-TTY with suggestion to run `datocms login` first.
- **No `--site-id` in non-TTY** → fails fast with suggestion to pass `--site-id=<ID>` (use `projects:list` to discover) or run in interactive terminal.
- **No `--site-id` in TTY** → interactive picker (workspace selection + project search).

Alternatively, authenticate via API token env var during interactive `link` flow.

Never hand-write `siteId`/`organizationId` in `datocms.config.json`: `link` validates project against Dashboard API before saving. Hand-authored profiles without them are fine — link each afterwards.

Linking profile that has `apiTokenEnvName` keeps it but adds `siteId`, which wins in [API Token Resolution](#api-token-resolution) — env token no longer read; CI without OAuth session then errors unless passing `--api-token`. Ask before linking such profile.

Run `npx datocms link --help` for all flags (`--profile`, `--log-level`, `--migrations-dir`, `--migrations-model`, `--migrations-template`, `--migrations-tsconfig`, `--organization-id`, `--site-id`).

### Unlink a project

```bash
# Remove the default profile
npx datocms unlink

# Remove a named profile
npx datocms unlink --profile=client_a
```

## Configuration File

CLI uses `datocms.config.json` in project root. Structure:

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
    "client_a": {
      "siteId": "98765",
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
| - | - | - |
| `siteId` | `string` | DatoCMS project ID (set by `link` when using OAuth) |
| `organizationId` | `string` | Organization ID (set by `link` for org projects) |
| `apiTokenEnvName` | `string` | Custom env var name for API token (overrides default naming) |
| `logLevel` | `"NONE" \| "BASIC" \| "BODY" \| "BODY_AND_HEADERS"` | API call logging verbosity |
| `logMode` | `"stdout" \| "file" \| "directory"` | Where logs are written |
| `baseUrl` | `string` | Custom API base URL (advanced) |
| `migrations.directory` | `string` | Path to migrations directory (relative to config) |
| `migrations.modelApiKey` | `string` | API key of model used to track migrations |
| `migrations.template` | `string` | Path to custom migration template |
| `migrations.tsconfig` | `string` | Path to tsconfig for running TS migrations |

## Active Profile Selection

CLI decides **which profile to use** in this order:

1. `--profile=<id>` on command
2. `DATOCMS_PROFILE=<id>` in environment (also read from `.env.local`, then `.env`, in cwd)
3. `default` profile in `datocms.config.json` — config with several profiles and neither 1 nor 2 → error `Multiple profiles detected`, no fallback

Config file: `--config-file=<path>` / `DATOCMS_CONFIG_FILE` (default `./datocms.config.json`); `migrations.*` paths resolve relative to it.

Use `DATOCMS_PROFILE` when multiple commands in same shell should share same non-default profile.

## API Token Resolution

Once active profile known, CLI resolves API token in this order:

1. **`--api-token` flag** — passed directly on command line (no env binding)
2. **Linked project** — if profile has `siteId` (set by `link`), CLI uses OAuth credentials to fetch project's API token via Dashboard API. Requires prior `datocms login`; no OAuth session (e.g. CI) → hard error, step 3 never checked — pass `--api-token`.
3. **Environment variable for active profile** (unlinked profiles only; also read from `.env.local`/`.env`) — uses `apiTokenEnvName` from profile config, or falls back to default naming:
   - default profile: `DATOCMS_API_TOKEN`
   - named profile `client_a`: `DATOCMS_CLIENT_A_PROFILE_API_TOKEN`

Token must have CMA access enabled (`can_access_cma: true`).

### Example `.env` setup (env-var-based auth)

```env
# For the default profile
DATOCMS_API_TOKEN=your_full_access_token

# For a named profile
DATOCMS_CLIENT_A_PROFILE_API_TOKEN=your_client_a_token
```

## Command Flags

Flags are command-specific: check `npx datocms <command> --help`. Commands operating on a project share authentication/profile flags; public documentation reads do not select a project. See [direct CMA calls](./direct-cma-calls.md) for the distinct `cma:docs` and `cma:call` flags.

### Log Mode Details

- `stdout` — prints API call logs to console
- `file` — appends logs to `./api-calls.log`
- `directory` — writes each API call to separate file in `./api-calls/`
