# Catalog workflow coverage

These scenarios exercise workflows that were missing from the regression suites. They use the shared native runner's pinned model and reasoning effort, copied candidate skills, isolated workspaces, command budgets, and credential redaction. Model completion alone is not a pass: independent checks execute the resulting code and inspect browser or CMS outcomes.

| Scenario | Independent outcome checks | Boundary |
| - | - | - |
| Plugin | Production build, real SDK iframe protocol, localized and nested writes, host updates, disabled input, theme and sizing in Chrome; optional sidebar/modal confirmation and cancellation flow | Controlled host, not the hosted CMS editor |
| CDA | Real GraphQL reads, pagination and totals, locale fallback, embedded records and blocks rendered in Chrome, draft separation | Server-rendered React module |
| Migration | Recovery from partial schema, existing-record preservation, tracking records, independent no-op rerun, execution from empty schema | Owned disposable sandbox; no promotion |
| Import | Quoted and multiline CSV, updates and preservation, attachment bytes from the CDN, shared assets, duplicate-free independent rerun | CSV and local files; not WordPress or Contentful importers |
| Visual editing | Production Next.js, Nuxt, SvelteKit, or Astro app; real preview links, authenticated draft flow, exact edit destination, live CMS updates, embedded navigation and record selection, previous subscription closed, return to published content | Controlled iframe host by default; consult the results report for which frameworks passed |
| Public site | Published/localized pages and 404s; SEO, canonical and favicon without browser JavaScript; actual responsive-image delivery; null-image handling; robots rules and exact sitemap URLs/lastmod | Next.js production server, real CDA/CDN; no external search crawler or hosting deployment |
| Video playback | Real processed clip and streaming requests; browser play/pause, player seeking and completion; privacy defaults; absent clip and 404s | Next.js production server, generated synthetic clip, real DatoCMS/Mux processing |
| Promotion | Real CLI migrations and promotion; original primary preservation; failed migration and validation cannot promote; maintenance released on every exit | Disposable project only; restores original primary before removing the owned sandbox |
| Schema types | Actual schema inspection, scoped generation with linked dependencies, compile-time field/localization checks and stable independent regeneration | Read-only CMS operation in an owned sandbox |
| GraphQL types | Real sandbox schema generation, result/variable type errors enforced, generated typed query executed against published CDA content | gql.tada in a Next.js fixture; distinct from CMA schema types |
| Schema diff | Read-only generation, independent CLI execution on an empty target, localized fields and block validators recreated, source records excluded | Reuses the owned sandbox after verifying source preservation |
| Scheduling | Timed publication and unpublishing actually execute; cancellation and unrelated schedules preserved | Bounded observation of real scheduled jobs, without deployment triggers |
| Hosted plugin editor | Load an existing evaluated plugin in the actual hosted editor, edit a localized field, save and reload, independently verify the saved record | Browser-operated check with no additional model call; distinct from a fresh implementation test |

## Run

Install root dependencies and the pinned fixture dependency sets needed for the selected case. Chrome must be installed; `E2E_BROWSER_CHANNEL` can select another Playwright browser channel.

```sh
npm ci --ignore-scripts
npm ci --ignore-scripts --prefix e2e/catalog/plugin
npm ci --ignore-scripts --prefix e2e/catalog/web
node e2e/catalog/plugin.mjs --output local/catalog-plugin/run-01
node e2e/catalog/plugin.mjs --variant sidebar-modal --output local/catalog-plugin/modal-01
```

For live scenarios, authenticate with `datocms login`. Resolve the already-authorized disposable project's organization with `datocms projects:list`. The runner reads credentials through the CLI library and never prints them. Unattended callers may instead supply `E2E_DATOCMS_API_TOKEN` through their secret manager.

```sh
node_modules/.bin/tsx e2e/catalog/live.mjs \
  --site PROJECT_ID --organization ORGANIZATION_ID \
  --case cda --output local/catalog-live/cda-01
```

Choose one of `cda`, `migration`, `import`, `visual-editing`, `promotion`, `schema-types`, `schema-diff`, `graphql-types`, `scheduling`, `public-site`, or `video-playback` per invocation. Visual editing also requires `E2E_DATOCMS_EDITING_BASE` with the authorized project's `https://PROJECT.admin.datocms.com` URL. The live runner requires an empty primary schema, forks an owned sandbox, and removes it in `finally`. Web scenarios mint temporary CDA-only tokens and revoke them during cleanup. Never run against a production project.

For visual editing, select `--framework nextjs`, `nuxt`, `sveltekit`, or `astro` (default `nextjs`). Install the matching `e2e/catalog/web-FRAMEWORK` dependency set with `npm ci`; Next.js uses `e2e/catalog/web`. All frameworks verify the same user outcomes. React/Vue/Svelte must update in place; Astro may use its documented QueryListener page reload. Rechecks must specify the original framework and can rebind environment/model IDs in framework source files without changing application logic.

`--case promotion` explicitly exercises maintenance and promotion on the throwaway project. It requires maintenance initially off, migrates the existing owned sandbox, preserves the original primary, and restores it during cleanup. Do not run another CMS case or edit the project concurrently with this rehearsal.

The hosted plugin check uses an already-passing implementation:

```sh
node_modules/.bin/tsx e2e/catalog/hosted-editor.mjs \
  --site PROJECT_ID --organization ORGANIZATION_ID \
  --editing-base https://PROJECT.admin.datocms.com \
  --implementation local/catalog-plugin/run-01 \
  --output local/catalog-hosted/run-01
```

Add `--variant sidebar-modal` with a passing sidebar/modal implementation to exercise the actual hosted Title tools panel and custom modal; record `modalApplied: true` as well as save/reload observations.

The runner serves the production plugin locally, installs it without extra permissions in its sandbox, and writes `browser-task.json`. An authenticated browser operator follows that task in the actual editor and records save/reload observations in `finish.json` with `savedAndReloaded: true`. That observation alone is not a pass: the runner independently reads the saved record and verifies the target locale, untouched locale and unrelated field before cleaning up. It times out after twenty minutes. Keep failed browser observations and do not mark an unfinished interaction as saved.

For visual-editing checks inside the hosted editor, add `--hosted-editor` to a visual-editing invocation. After the automated browser assertions, the runner installs and configures Web Previews in the owned sandbox, writes `hosted-browser-task.json`, and waits up to twenty minutes. An authenticated browser operator follows that task in the actual Visual tab and records the four required observations in `hosted-finish.json`. The runner then verifies the saved draft, untouched locale and second record, and unchanged published page before removing the plugin, tokens and environment. This exercises the actual editor against the local production server; it does not establish coverage of a deployed hosting provider.

WordPress imports, Contentful imports, cache tags and tag-based CDN invalidation are excluded from the current remaining-gap round. Existing historical evidence for those areas is retained.

The CDA scenario defaults to an empty inline-block allowlist. Add `--variant inline-blocks` to seed real inline blocks and independently verify their rendering. This exercises both scalar and record-list shapes of the generated GraphQL field.

Every invocation requires a new output directory. It retains the actor transcript, actual model/effort, skill and harness hashes, build logs, independent observations, cleanup status, and unsuccessful attempts. Keep output under ignored `local/`; it is not suitable for public upload without review. `checkpoint.json` identifies owned resources if the process is interrupted before cleanup. Do not remove that evidence until resource cleanup is verified.

Plugin browser checks can be repeated without another model call:

```sh
node e2e/catalog/plugin.mjs \
  --recheck local/catalog-plugin/run-01/workspace \
  --output local/catalog-plugin/recheck-01
```

Visual-editing checks can also be repeated without a model call by passing `--recheck local/catalog-live/visual-01` to the live runner. This creates a fresh sandbox and reuses the original application and dependency installation. It substitutes only the environment and model IDs explicitly supplied in the original task; `replay.json` records every substitution and file hash. It does not repair application logic. These runs are independent outcome rechecks, not new skill evaluations.

Public-site and video-playback cases support the same `--recheck` flow. Only the supplied environment is rebound; the original application must query the new fixture's images and videos. Rechecks require the same scenario, site and framework.

Schema-diff checks also support `--recheck`: the original helper and generated migration are copied byte-for-byte, then independently applied to a fresh empty target. The runner supplies new sandbox authentication and records file hashes; it does not regenerate or repair the migration.

For an existing-app debugging task, use `--repair <original-output> --issue "observed runtime symptom"` instead of `--recheck`. The runner rebinds fixture coordinates, then starts a new evaluated session against the current skills. These results are explicitly labelled `guided-repair`, retain their failed source attempt, and are not counted as fresh implementations. The independent outcome checks stay unchanged.

An account usage-exhaustion error stops the native actor, records `paused-usage-limit`, and exits with code 2 after cleanup. Do not retry a quota failure or consume reset credits. Resume only when ordinary usage is available. This check is separate from application API rate limiting.

## Reference diagnostic

After installing `e2e/catalog/web-nuxt` dependencies, run `node e2e/catalog/nuxt-reference.mjs --output local/catalog-reference/run-01`. It extracts the literal real-time composable from the Nuxt reference, checks its types, and exercises real Vue effect-scope disposal before and after a connection opens. Fetch and subscription transport are controlled for deterministic timing. This model-free diagnostic complements the live browser checks and does not count as a CMS E2E or a fresh skill evaluation.

## Interpret results

A correct outcome means the independent assertions passed. A strict pass additionally requires clean actor execution, credential handling and verified cleanup; `strictExecutionPass` records the actor-only execution result. Recovered command or API errors remain visible and prevent a strict pass, even if the final outcome is correct. Fixture preparation failures are infrastructure results, not failed skill tasks. One successful workflow is useful coverage, not evidence that every feature, framework, or model has been tested.

Credential output fails the run even after redaction. A completed application can still receive independent functional checks, recorded separately as `outcome`; those checks cannot turn its failed privacy grade into a passing run. Earlier attempts that stopped before functional checking retain that boundary.
