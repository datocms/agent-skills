# Catalog workflow coverage

These scenarios exercise workflows that were missing from the regression suites. They use the shared native runner's pinned model and reasoning effort, copied candidate skills, isolated workspaces, command budgets, and credential redaction. Model completion alone is not a pass: independent checks execute the resulting code and inspect browser or CMS outcomes.

| Scenario | Independent outcome checks | Boundary |
| - | - | - |
| Plugin | Production build, real SDK iframe protocol, localized and nested writes, host updates, disabled input, theme and sizing in Chrome | Controlled host, not the hosted CMS editor |
| CDA | Real GraphQL reads, pagination and totals, locale fallback, embedded records and blocks rendered in Chrome, draft separation | Server-rendered React module |
| Migration | Recovery from partial schema, existing-record preservation, tracking records, independent no-op rerun, execution from empty schema | Owned disposable sandbox; no promotion |
| Import | Quoted and multiline CSV, updates and preservation, attachment bytes from the CDN, shared assets, duplicate-free independent rerun | CSV and local files; not WordPress or Contentful importers |
| Visual editing | Production Next.js app, real preview links, authenticated draft flow, click-to-edit destination, live CMS updates without reload, embedded navigation and record selection, return to published content | Controlled iframe host; not the hosted CMS editor |

## Run

Install root dependencies and the two pinned fixture dependency sets. Chrome must be installed; `E2E_BROWSER_CHANNEL` can select another Playwright browser channel.

```sh
npm ci --ignore-scripts
npm ci --ignore-scripts --prefix e2e/catalog/plugin
npm ci --ignore-scripts --prefix e2e/catalog/web
node e2e/catalog/plugin.mjs --output local/catalog-plugin/run-01
```

For live scenarios, authenticate with `datocms login`. Resolve the already-authorized disposable project's organization with `datocms projects:list`. The runner reads credentials through the CLI library and never prints them. Unattended callers may instead supply `E2E_DATOCMS_API_TOKEN` through their secret manager.

```sh
node_modules/.bin/tsx e2e/catalog/live.mjs \
  --site PROJECT_ID --organization ORGANIZATION_ID \
  --case cda --output local/catalog-live/cda-01
```

Choose one of `cda`, `migration`, `import`, or `visual-editing` per invocation. Visual editing also requires `E2E_DATOCMS_EDITING_BASE` with the authorized project's `https://PROJECT.admin.datocms.com` URL. The live runner requires an empty primary schema, forks an owned sandbox, and removes it in `finally`. Web scenarios mint temporary CDA-only tokens and revoke them during cleanup. Never run against a production project.

The CDA scenario defaults to an empty inline-block allowlist. Add `--variant inline-blocks` to seed real inline blocks and independently verify their rendering. This exercises both scalar and record-list shapes of the generated GraphQL field.

Every invocation requires a new output directory. It retains the actor transcript, actual model/effort, skill and harness hashes, build logs, independent observations, cleanup status, and unsuccessful attempts. Keep output under ignored `local/`; it is not suitable for public upload without review. `checkpoint.json` identifies owned resources if the process is interrupted before cleanup. Do not remove that evidence until resource cleanup is verified.

Plugin browser checks can be repeated without another model call:

```sh
node e2e/catalog/plugin.mjs \
  --recheck local/catalog-plugin/run-01/workspace \
  --output local/catalog-plugin/recheck-01
```

Visual-editing checks can also be repeated without a model call by passing `--recheck local/catalog-live/visual-01` to the live runner. This creates a fresh sandbox and reuses the original application and dependency installation. It substitutes only the environment and model IDs explicitly supplied in the original task; `replay.json` records every substitution and file hash. It does not repair application logic. These runs are independent outcome rechecks, not new skill evaluations.

An account usage-exhaustion error stops the native actor, records `paused-usage-limit`, and exits with code 2 after cleanup. Do not retry a quota failure or consume reset credits. Resume only when ordinary usage is available. This check is separate from application API rate limiting.

## Interpret results

A correct outcome means the independent assertions passed. Recovered command or API errors remain visible and prevent a strict pass, even if the final outcome is correct. Fixture preparation failures are infrastructure results, not failed skill tasks. One successful workflow is useful coverage, not evidence that every feature, framework, or model has been tested.
