# Project plays

CLI plays follow [datocms-cli](../../datocms-cli/SKILL.md): authentication policy, the confirmations for destructive and production-sensitive commands, and the repo's package runner. Live reads and CMA writes follow [datocms-cma › route selection](../../datocms-cma/SKILL.md#1-select-execution-before-setup); a working MCP connection needs no CLI just for that.

## Connect the repo

- **Gives:** the `datocms` CLI installed and the repo linked to the project the user confirms; CLI commands then authenticate through the user's own login, with no token in files.
- **Needs:** a Node project (`package.json`).
- **Check:** `datocms` in `package.json`; `datocms.config.json` active profile with `siteId`; `npx datocms whoami`.
- **Ask:** which project from `projects:list`, always confirmed, even a single match; a profile that authenticates only through `apiTokenEnvName` (a CI convention) → ask before linking it.
- **Build:** [datocms-cli › Bootstrap flow](../../datocms-cli/SKILL.md#bootstrap-flow-cli-available-but-not-linked); [cli-setup.md](../../datocms-cli/references/cli-setup.md).
- **Live:** none on the project. `datocms login` is the user's step (browser); `link` writes local config only.
- **Verify:** `npx datocms whoami`; `npx datocms environments:list` lists the linked project's environments.

## Typed CMA code

- **Gives:** a generated schema module (`Schema.X.ID`, per-model types) for typed CMA code and the preview record → URL mapping.
- **When:** local code needs it (preview route mapping, TypeScript CMA scripts) or the user asks; not a default for every project.
- **Needs:** Connect the repo.
- **Check:** an existing script calling `schema:generate`; an existing module and the import alias that resolves to it.
- **Build:** [schema-generate.md](../../datocms-cli/references/schema-generate.md); [CMA type-generation.md](../../datocms-cma/references/type-generation.md).
- **Live:** none (schema read).
- **Verify:** the script regenerates the module; one consumer typechecks.

## Schema migrations

- **Gives:** versioned schema changes in the repo, tested in a forked sandbox before anything touches primary; optional extras: migrations generated from changes made by hand in a sandbox, and a disposable-sandbox reset loop.
- **Needs:** Connect the repo.
- **Check:** the profile's `migrations` block; migrations directory and the TS/JS format of existing files; `tsconfig`; existing migration scripts.
- **Ask:** an existing custom convention (several profiles, custom directory or template) → keep it (recommended) or normalize; which extras, if any (default none).
- **Build:** [creating-migrations.md](../../datocms-cli/references/creating-migrations.md) (incl. autogenerate); [running-migrations.md](../../datocms-cli/references/running-migrations.md); reset loop: [deployment-workflow.md › Local Development Workflow](../../datocms-cli/references/deployment-workflow.md#local-development-workflow).
- **Live:** none during setup. A real run forks a sandbox (counts against the plan's allowance), a reset loop destroys and re-forks one: approval per run, dry run first.
- **Verify:** once a migration exists, `npx datocms migrations:run --dry-run` lists it and changes nothing (the command fails while the directory is missing); none yet → Test it is creating the first one with `migrations:new`.

## Release migrations

- **Gives:** a repeatable release: maintenance mode on, migrations into a fresh sandbox, promote, maintenance mode off even on failure; run locally, from CI, or both.
- **Needs:** Schema migrations.
- **Check:** existing release tooling (scripts, CI jobs running `maintenance:on` or `environments:promote`), kept when working; CI provider; several profiles.
- **Ask:** local command only (recommended), or also CI (manual dispatch, or on push to the main branch); promote in the same run (recommended) or verify the fork first (the manual sequence, maintenance on until promoted); which profile, when several (every command then needs `--profile`, `default` included).
- **Build:** [deployment-workflow.md](../../datocms-cli/references/deployment-workflow.md), incl. [Release Helper](../../datocms-cli/references/deployment-workflow.md#release-helper).
- **Live:** none during setup. A release run turns on maintenance mode, forks and promotes: approval per run. CI secrets are added by the user.
- **Verify:** once a migration exists, the release command with `--dry-run` lists it and creates nothing; CI: the workflow's secret mapping matches the profile.

## Several projects

- **Gives:** one repo driving separate DatoCMS projects through named CLI profiles; for projects duplicated from a blueprint, one shared migration history rolled out to each through a sandbox, never auto-promoted.
- **Needs:** Connect the repo; Schema migrations for a shared history.
- **Check:** existing profiles (linked or token-based); per-profile token variable names (names only); existing sync helper or CI.
- **Ask:** staging and production of one project are environments, not profiles → explain and stop; profile ids (required, no default) and which one is the blueprint; were the others duplicated from it (entity IDs aligned)? No → profiles only, no shared history; unconfirmed → `scaffolded`; per-profile authentication: OAuth link (recommended), tokens only for CI; with two or more profiles, commands without `--profile` or `DATOCMS_PROFILE` stop working → how existing scripts pick one (`--profile` in each script, recommended); CI workflow (default no).
- **Build:** [blueprint-sync.md](../../datocms-cli/references/blueprint-sync.md); [cli-setup.md › Linking a Project](../../datocms-cli/references/cli-setup.md#linking-a-project) and [› Active Profile Selection](../../datocms-cli/references/cli-setup.md#active-profile-selection).
- **Live:** linking each profile needs that project confirmed; sync runs fork a sandbox per project and promotion is separate: approval per run.
- **Verify:** `npx datocms environments:list --profile=<id>` for every profile; the sync helper with `--dry-run`.

## Webhooks and build triggers

- **Gives:** DatoCMS calls another system on content, schema or deploy events (webhooks), or starts a deploy on publish (build triggers). Cache invalidation → Fresh published content; previews → Previews and visual editing.
- **Needs:** a public URL (DatoCMS can't reach localhost).
- **Check:** existing receiver routes and secret variable names; hosting signals (`vercel.json`, `.vercel/`, `netlify.toml`, `.gitlab-ci.yml`); existing webhooks and build triggers (read-only list).
- **Ask:** which events (content changes recommended); which environments (primary only, recommended, or all: events also fire in sandboxes); the receiving URL (required) and the authentication it expects (header, basic auth, none); a receiver endpoint in the app (default no); build trigger adapter (the detected provider).
- **Build:** [resource-gotchas.md › Webhooks](../../datocms-cma/references/resource-gotchas.md#webhooks-webhooks) and [› Build triggers](../../datocms-cma/references/resource-gotchas.md#build-triggers-buildtriggers), written through the route selected per datocms-cma, never in a migration (both belong to the whole project, so a sandbox run would change them live). Receiver: the same bearer-secret check as the invalidation handler in FW › `Cache Tags (Optional)` (FW as in [website.md](website.md)).
- **Live:** creating or updating webhooks and triggers (they fire immediately and overwrite same-name settings) and firing a test deploy: approval each; otherwise hand over the dashboard values.
- **Verify:** `npx datocms cma:call webhooks list` or `buildTriggers list` shows the expected entries; the receiver answers 401 without the secret.

## Imports

- **Gives:** the official WordPress or Contentful importer installed and a first import into the project.
- **Needs:** Connect the repo.
- **Check:** the importer in `npx datocms plugins --json` (not `package.json`); whether the target project is new or already holds content (`schema:inspect` for clashing models).
- **Ask:** target new or disposable (recommended) or holding content → rehearse in a separate disposable project first (importers always write to the primary environment; a sandbox can't isolate them), then a staged run in the user's own terminal (without `--autoconfirm` it prompts before replacing clashing models; Contentful: `--skip-content` first, which still replaces locales); Contentful: only some content types; large media: error tolerance.
- **Build:** [importing-content.md](../../datocms-cli/references/importing-content.md); [cli-plugin-management.md](../../datocms-cli/references/cli-plugin-management.md).
- **Live:** installing the importer is local to this machine; the import replaces and creates models, writes content (Contentful also replaces locales): the user runs it with source credentials from env vars they set (never pasted into chat), or approval with a named disposable target.
- **Verify:** `npx datocms wordpress:import --help` (or `contentful:import --help`) works; the handoff tells teammates to log in and install the importer once per machine.
