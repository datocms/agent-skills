# End-to-end evaluation

The maintained evaluation track exercises the repository's actual skills through a native agent session, then checks the resulting CMS state or application independently. It does not force a skill load, suppress the agent's verification, substitute another model, or treat a completed answer as a passing result.

Use Node 24+, `npm ci`, and an authenticated native CLI. Set `CODEX_BIN` to its executable if it is not on PATH. The current validation baseline is `gpt-5.6-luna` with `model_reasoning_effort=medium`. Model and reasoning effort are pinned in `lib/nativeSession.ts`; a conflicting per-case model is rejected. Reports retain those settings so results can be reproduced and attributed to the tested configuration.

## Live CMS cases

Supply `E2E_DATOCMS_API_TOKEN` through the process environment or a secret manager, together with `E2E_DATOCMS_SITE_ID`. Use a dedicated, disposable project with an empty primary environment. Never put the token in a command argument, prompt, fixture, or tracked file.

```bash
npm run test:e2e
npm run test:e2e -- e2e/cases/recent-content-regressions.e2e.test.ts
```

Each case verifies the project ID, forks a uniquely named sandbox, seeds fixtures, runs the agent, independently asserts final state, and destroys only its sandbox. Cleanup runs after failures and verifies deletion. Token mode does not perform organization-wide cleanup. The default is one worker; increase workers only when the disposable project's sandbox capacity allows it. `E2E_KEEP_PROJECT=1` retains environments for deliberate debugging.

The agent receives the confirmed environment and CLI authentication context. Credentials are supplied only through environment variables. The runner installs this checkout's skills in an isolated workspace, disables host configuration/plugins/memory, uses temporary authentication links, and removes its workspace and authentication directory afterward. Shell environment snapshots are disabled so credentials are not copied into runtime snapshot files. Transcripts are redacted; observed credential output fails the run.

The original dashboard-account provisioning route and other agent adapters remain available for compatibility, but are outside this track's validation claims.

## Application, generated-code, and advisory cases

```bash
npm run e2e:frontend -- --repetitions 3 --output local/frontend/run-01
npm run e2e:code -- --repetitions 3 --output local/code/run-01
npm run e2e:workflows -- --repetitions 3 --output local/workflows/run-01
```

- `frontend/run.mjs` scaffolds minimal Next.js, Nuxt, Astro, and SvelteKit applications. The agent implements preview routes; the evaluator rebuilds and starts them, then tests authentication, missing configuration, hostile redirects, valid query/fragment preservation, and embedded-preview cookies over HTTP. Astro's explicit missing-secret schema failure is accepted as fail-closed; arbitrary server failures are not. Exact direct dependencies are pinned and generated lockfiles remain in the evidence.
- `workflows/code.mjs` executes generated TypeScript and converted DAST against independent semantic assertions. Creator audits use the actual SDK pagination implementation with a mocked API boundary. These are local integration cases, not live CMS evidence.
- `workflows/run.mjs` records complete advisory tasks and evaluator-only rubrics. Every result starts as `review: pending`; a reviewer must assess both the answer and trace against the cited skill/API contract. No keyword grader or model-completion flag turns advice into a quality pass.

Use `--cases` to select workflow/code cases, or `--frameworks` for applications. `--recheck <original-output>` on code/application runners regrades the same generated artifacts without another model call; choose a new `--output` so original evidence remains intact. Rechecks rebuild applications and use their saved dependency lockfiles.

## Catalog workflow coverage

The [catalog scenarios](catalog/README.md) add real CDA reads and rendering, migration execution and recovery, duplicate-free content and asset imports, SDK plugin behavior in Chrome, and visual-editing flows with live CMS updates. They use independent outcome checks, disposable sandboxes, and model-free rechecks for saved applications. The [catalog report](reports/2026-09-19-catalog-workflows.md) and [remaining-gap report](reports/2026-09-19-remaining-gaps.md) preserve successful outcomes, implementation failures, and separate harness corrections. The latter also tracks Nuxt, SvelteKit and Astro, actual hosted-editor operation, environment promotion, scoped schema types, and the catalog capability inventory.

## Controlled CLI/MCP coexistence

```bash
node evals/coexistence/run.mjs \
  --model gpt-5.6-luna --effort medium \
  --baseline <baseline-commit> --arms base,candidate \
  --repetitions 3 --jobs 2 --output local/coexistence/run-01
```

This suite runs native sessions with controlled CLI/MCP tools, including permission failures, uncertain writes, legacy routing, and resumed conversations. The server contract and content are simulated. It does not prove hosted MCP OAuth connectivity or production-server parity. `long-followup-unseen` varies original fields and locale content to expose verification based on guessed values. The rich-values and multiple-block variants add custom marks, complete asset values, publication history, code whitespace, and an untargeted block. Reports distinguish final content, applied writes, rejected write attempts, and compilation/recovery quality. Server guidance defaults to the baseline references. Add `--server-guidance candidate` to model a fresh server fetch after release, or select an explicit commit for cached-guidance compatibility. Candidate skills and the chosen server documents are frozen at run start; report those modes separately.

## Hosted MCP smoke

Authenticate the native client against the real hosted server, using only a dedicated empty throwaway project with an English-only `main` environment. Grant the test connection access to that project and the permission to create and clean up its sandbox fixtures:

```bash
codex mcp add DatoCMSReleaseCheck --url https://mcp.datocms.com
npm run e2e:hosted -- --site <authorized-site-id> --output local/hosted/run-01
```

The native client manages OAuth credentials. No API token is supplied to this runner. Its isolated sessions use the same server name and URL to reuse the authorized connection, with the pinned validation settings and shell snapshots disabled. When the temporary test connection is no longer needed, `codex mcp logout DatoCMSReleaseCheck` clears its local authorization. If registration used a separate `CODEX_HOME`, use that same home for logout.

`hosted/run.mjs` forks one uniquely named environment and seeds typed models, a real uploaded image, localized documents, and a record with published history. Three fresh actors perform a title edit, a localized document edit, and an edit preserving published content and a second block. All CMS work goes through the hosted MCP; there is no API-token or CLI fallback.

Fixture setup, independent reads, and cleanup use exact maintained scripts from `hosted/fixtures.mjs`. The agent transports those scripts after method discovery, but their source must match byte-for-byte after trimming, execute exactly once through the prescribed safe/unsafe tool, and return an actual execution receipt. These infrastructure sessions are counted separately from the three evaluated tasks. The local oracle compares fresh returned records against pre-edit snapshots, requires exactly one new parent version, and checks publication, locales, links, marks, asset values and untargeted content. It does not grade an actor's own success claim.

Cleanup runs after failures and deletes only the named sandbox, then checks the primary project's models, uploads and locales. Failed runs remain in their original directories. A fixture/compiler failure is distinct from an actor failure; fix and typecheck the fixture before using a new output directory. Strict execution results remain diagnostic alongside independent outcome assertions.

The [hosted validation report](reports/2026-09-18-hosted-mcp.md) records the initial fixture correction, three independently verified actor outcomes, and cleanup evidence.

## Evidence and iteration

The [reading-cost comparisons](ablation/README.md) evaluate deletion candidates against a frozen release, then run a combined candidate on tasks reserved from tuning. These focused cases explicitly name the intended skill; they measure behavior after activation, not automatic skill discovery. They preserve baseline failures, rejected attempts, actual context usage, and independent browser/build results. A shorter document is not automatically a better skill, and one successful pair is not proof of non-inferiority.

The [deployed website harness](deployed/README.md) adds explicitly scoped Vercel deployment, real search crawling and Next.js cache-tag checks. Its [validation report](reports/2026-09-19-deployed-workflows.md) separates evaluated implementations from operator deployments and independent browser/API verification.

Live runs default to `local/e2e/<timestamp>/<case>/`; set a fresh `E2E_RUN_ID` or `E2E_OUTPUT` to organize runs. Other suites require fresh output directories. Existing transcripts are never overwritten. Evidence includes prompts, skill hashes, revision, exact model/effort, runtime version, command events, errors, usage, independent assertions, and final answers. A source hash identifies uncommitted candidates more precisely than HEAD alone. Raw artifacts are ignored by Git; commit a sanitized report and coverage map instead.

Choose behavior and failure consequences before writing a prompt. Check the test oracle against actual API normalization and supported SDK defaults. Preserve failed runs; distinguish fixture defects, infrastructure failures, recoverable execution errors, and wrong final state. Make the smallest skill correction supported by the trace, repeat the same cases, and test unseen inputs and neighboring workflows. Repeated passes increase confidence; they do not establish perfection or causality by themselves. Track task completion, preservation, unnecessary operations, retries, latency, and context usage separately.

New live cases use `runE2ETest`: provide fixtures, a natural task, optional local files, bounded `maxAttempts`/`timeoutMs`, and an independent `assert` callback. Keep rubric/expected outputs out of the agent's prompt. `maxAttempts` counts observed CLI script invocations; a timeout/command cap also fails the run. A `cma:call` solution remains valid when it meets the task.

Deterministic harness and shipped-example checks complement these paid sessions:

```bash
npm run test:e2e:harness
npm run typecheck
npm run test:coexistence:fixtures
node --test tests/cma-content-safety.test.mjs tests/redirect-validation.test.mjs tests/optional-mcp.test.mjs tests/hosted-mcp.test.mjs
```
