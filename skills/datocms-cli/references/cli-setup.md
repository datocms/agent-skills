# CLI Setup

Installation, authentication, project linking, profiles, token resolution, and global flags for `@datocms/cli`.

---

Install the CLI in the project and run it locally:

```bash
npm install --save-dev @datocms/cli
npx datocms --help
```

Use local `npx datocms` commands by default so the repo controls the CLI
version. If the repo already has an established runner style (`pnpm exec`,
`bunx`, package scripts), keep that convention.

---

## Authentication

CLI v4 uses **OAuth-based authentication** as the best practice. Credentials are stored at
`~/.config/datocms-cli/credentials.json` (file is `chmod 600`).

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

## Linking a Project

Use `link` to connect the current directory to a DatoCMS project and
configure its profile in one step.

```bash
# Interactive: log in (if needed), pick workspace + project, configure profile
npx datocms link

# Non-interactive: link to a specific project by ID
npx datocms link --site-id=12345

# Configure a named profile instead of "default"
npx datocms link --profile=staging
```

`link` combines authentication and profile configuration:
1. Authenticates via OAuth (or reuses existing credentials)
2. Lets you select a workspace and project interactively
3. Stores the project's `siteId` (and `organizationId`) in the profile
4. Configures migration directory, model API key, log level, etc.

Alternatively, instead of linking to a project, you can choose to authenticate
via an API token environment variable during the `link` flow.

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
