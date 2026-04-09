# Direct CMA Calls

Use `cma:call` for one-off Content Management API operations from the terminal
when a reusable script would be overkill.

The command surface is **dynamic**: available resources and methods reflect the
`@datocms/cma-client` version installed in the project. Always use the
discovery commands below rather than guessing resource/method pairs.

---

## Command Shape

```bash
npx datocms cma:call <RESOURCE> <METHOD> [...pathArgs] [--data '...'] [--params '...'] [--environment <env>]
```

### Flags

| Flag | Description |
|---|---|
| `--data <value>` | JSON or JSON5 string for the request body (create/update operations) |
| `--params <value>` | JSON or JSON5 string for query parameters (filtering, pagination) |
| `-e, --environment <value>` | Target a specific environment |
| `--json` | Machine-readable JSON output (useful for piping) |
| `--api-token <value>` | Override the API token for this call |
| `--profile <value>` | Use a specific CLI profile |
| `--log-level <level>` | NONE, BASIC, BODY, or BODY_AND_HEADERS |

---

## Resource and Method Discovery

### `cma:docs` — Browse full API reference

Use `cma:docs` to get detailed, up-to-date documentation about any CMA
endpoint directly in the terminal:

```bash
# List all available resources
npx datocms cma:docs

# Describe a resource and its actions
npx datocms cma:docs items

# Describe a specific action with request/response examples
npx datocms cma:docs items create

# Expand a collapsed details section for more info
npx datocms cma:docs items create --expand "Example: Basic example"
```

This is the recommended way to look up endpoint details — request body
schemas, required fields, query parameters, and response shapes — before
constructing a `cma:call` command or writing CMA client code.

### `cma:call --help` — Quick resource/method listing

For a quick listing of available resources and methods:

```bash
# List all available resources
npx datocms cma:call --help

# List all methods for a specific resource
npx datocms cma:call <RESOURCE> --help
```

The CLI provides helpful suggestions when a resource or method name is not
found, including a list of valid options.

### Naming Convention

`cma:call` accepts flexible resource naming — snake_case (`item_types`),
camelCase (`itemTypes`), and bare (`itemtypes`) all work. Matching is
case-insensitive and ignores underscores/hyphens.

> **CLI vs JavaScript mapping:** `cma:call` resource names correspond to the
> camelCase namespace on the JavaScript CMA client (e.g., `item_types` on the
> CLI = `client.itemTypes` in code).

---

## Operation Safety Levels

Every `cma:call` operation falls into one of three categories. Classify the
user's intent before proposing commands:

### Read-only (safe to run without confirmation)

Methods that never modify data — always safe:

- `list`, `find`, `references`, `related`, `referencing`, `query`
- `fields` (on plugins — lists fields using a plugin)
- `find_me` (on users)
- `maintenance_mode find`, `site find`, `public_info find`

### Mutating (reversible — confirm target environment)

Methods that create or modify data, but the changes can typically be undone:

- `create`, `update`, `duplicate`, `publish`, `unpublish`
- `bulk_publish`, `bulk_unpublish`, `bulk_move_to_stage`
- `activate`, `deactivate` (maintenance mode)
- `trigger`, `abort`, `reindex` (build triggers)
- `reorder` (menu items, schema menu items, upload collections)
- `resend` (invitations), `resend_webhook` (webhook calls)
- `regenerate_token` (access tokens — old token stops working)

### Destructive (irreversible — always confirm before proposing)

Methods that permanently delete data or replace environments:

- `destroy` on any resource (`items`, `item_types`, `fields`, `uploads`,
  `environments`, `roles`, `webhooks`, `access_tokens`, `plugins`, etc.)
- `bulk_destroy` (`items`, `uploads`)
- `environments promote` (replaces the current primary environment)
- `environments rename` (may break references to old ID)

---

## Path Arguments

Some methods require positional arguments after the method name. These map to
URL placeholders in the API endpoint.

```bash
# find / update / destroy require the entity ID
npx datocms cma:call items find <ITEM_ID>
npx datocms cma:call items update <ITEM_ID> --data '{title: "Updated"}'

# Nested resources need the parent ID
npx datocms cma:call fields list <ITEM_TYPE_ID>
npx datocms cma:call fields create <ITEM_TYPE_ID> --data '{label: "Title", api_key: "title", field_type: "string"}'

# Some need both parent and entity ID
npx datocms cma:call fields update <ITEM_TYPE_ID> <FIELD_ID> --data '{label: "New Label"}'
npx datocms cma:call upload_tracks create <UPLOAD_ID> --data '{...}'
```

The CLI validates argument count and shows the required placeholder names when
too few or too many are provided.

---

## JSON5 Support for --data and --params

Both flags accept **JSON5** syntax, which is more shell-friendly than strict
JSON:

```bash
# JSON5: unquoted keys (avoids shell quote escaping)
npx datocms cma:call roles create --data '{name: "Editor", can_edit_site: true}'

# Strict JSON also works
npx datocms cma:call roles create --data '{"name": "Editor", "can_edit_site": true}'
```

JSON5 allows: unquoted keys, trailing commas, single-quoted strings, comments.

### Shell Quoting

Wrap `--data` / `--params` values in **single quotes** to prevent shell
interpolation. Use double quotes only inside the JSON:

```bash
# Correct — single quotes outside
npx datocms cma:call items create --data '{item_type: {type: "item_type", id: "blog_post"}, title: "Hello"}'
```

---

## Core Patterns by Example

These four patterns cover the vast majority of `cma:call` usage. The resource
and field names change, but the shapes are consistent across all 44 resources.

### Pattern 1: List + filter + paginate (read-only)

```bash
# Simple list
npx datocms cma:call item_types list

# Filter by model type
npx datocms cma:call items list --params '{filter: {type: "blog_post"}}'

# Paginate (offset-based)
npx datocms cma:call items list --params '{page: {offset: 0, limit: 30}}'

# Target a sandbox environment
npx datocms cma:call items list --environment=staging
```

### Pattern 2: Find / inspect a single entity (read-only)

```bash
npx datocms cma:call items find <ITEM_ID>
npx datocms cma:call item_types find <ITEM_TYPE_ID>
npx datocms cma:call uploads references <UPLOAD_ID>
npx datocms cma:call site find
```

### Pattern 3: Create / update with --data (mutating)

```bash
# Create — path args for parent if nested, --data for the body
npx datocms cma:call item_types create --data '{name: "Author", api_key: "author"}'
npx datocms cma:call fields create <ITEM_TYPE_ID> --data '{label: "Name", api_key: "name", field_type: "string"}'
npx datocms cma:call items create --data '{item_type: {type: "item_type", id: "blog_post"}, title: "New Post"}'

# Update — entity ID as path arg, changed fields in --data
npx datocms cma:call items update <ITEM_ID> --data '{title: "Updated Title"}'
npx datocms cma:call roles update <ROLE_ID> --data '{name: "Senior Editor"}'

# Publish / unpublish
npx datocms cma:call items publish <ITEM_ID>
npx datocms cma:call items unpublish <ITEM_ID>
```

### Pattern 4: Bulk operations with --data (mutating/destructive)

```bash
# Bulk publish (mutating)
npx datocms cma:call items bulk_publish --data '{items: [{type: "item", id: "123"}, {type: "item", id: "456"}]}'

# Bulk tag uploads (mutating)
npx datocms cma:call uploads bulk_tag --data '{uploads: [{type: "upload", id: "789"}], tags: ["hero"]}'

# Bulk destroy (DESTRUCTIVE — confirm first)
npx datocms cma:call items bulk_destroy --data '{items: [{type: "item", id: "123"}]}'
```

Bulk payloads use relationship arrays: `{items: [{type: "item", id: "..."}]}`.

---

## Commonly Used Resources

44 resources are available. Run `npx datocms cma:call --help` for the current
list. The most frequently used:

| Resource | Key methods | Path args |
|---|---|---|
| `items` | list, find, create, update, destroy, publish, unpublish, duplicate, bulk_publish, bulk_unpublish, bulk_destroy, references, validate_new, validate_existing | itemId |
| `item_types` | list, find, create, update, destroy, duplicate, referencing | itemTypeId |
| `fields` | list, find, create, update, destroy, duplicate, referencing, related | itemTypeId + fieldId |
| `fieldsets` | list, find, create, update, destroy | itemTypeId + fieldsetId |
| `uploads` | list, find, create, update, destroy, references, bulk_tag, bulk_destroy | uploadId |
| `roles` | list, find, create, update, destroy, duplicate | roleId |
| `webhooks` | list, find, create, update, destroy | webhookId |
| `build_triggers` | list, find, create, update, destroy, trigger, abort, reindex | buildTriggerId |
| `plugins` | list, find, create, update, destroy, fields | pluginId |
| `access_tokens` | list, find, create, update, destroy, regenerate_token | accessTokenId |
| `environments` | list, find, fork, promote, rename, destroy | environmentId |
| `site` | find, update | (none) |
| `maintenance_mode` | find, activate, deactivate | (none) |
| `scheduled_publications` | create, destroy | itemId |
| `workflows` | list, find, create, update, destroy | workflowId |
| `upload_tracks` | list, create, destroy, generate_subtitles | uploadId + uploadTrackId |

> **Note:** For `environments`, prefer the dedicated CLI commands
> (`environments:fork`, `environments:promote`, etc.) — they have better flags
> and output than the `cma:call` equivalents.

> **Note:** Creating new uploads from URL or local file is better done via
> **datocms-cma** (the `client.uploads.createFromUrl()` helper). The raw
> `upload_request` + `uploads create` flow via CLI is multi-step.

---

## Pagination

`list` methods return paginated results:

```bash
npx datocms cma:call items list --params '{page: {offset: 0, limit: 30}}'
npx datocms cma:call items list --params '{page: {offset: 30, limit: 30}}'
```

Default page size varies by resource. For iterating over all pages, switch to
**datocms-cma** (the JavaScript client provides `listPagedIterator`).

---

## Output and Scripting

Default output is pretty-printed JSON. Use `--json` for piping:

```bash
npx datocms cma:call items create --json --data '{...}' | jq '.id'
npx datocms cma:call item_types list --json | jq '.[].api_key'
```

---

## When to Switch to datocms-cma

`cma:call` is ideal for one-off terminal operations. Switch to **datocms-cma**
(the JavaScript CMA client) when:

- The task needs loops or iteration over all pages
- You need conditional logic, retries, or error handling
- The operation involves file uploads from URL or local files
- The code should live in the repo as a reusable script
- You need typed helpers or autocomplete from generated schema types
- Multiple related API calls depend on each other's results

> **Tip:** Use `npx datocms cma:docs <resource> <action>` to look up the
> exact request body shape and parameters before writing either a `cma:call`
> command or CMA client code.
