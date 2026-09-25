# Fact regressions

This round corrects skill statements that were shown to be wrong against package source, CLI source or API behavior, and adds a [regression case](../regressions/README.md) for each group of corrections. All evaluated sessions use `gpt-6-luna` with medium reasoning, now the pinned default. The baseline is the unchanged `skills/` tree at `d1c53f7`. No live DatoCMS project, credentials, deployment or usage reset was used. The oracles run the actor's output against the real SDK, CLI, build tools or browser, with the DatoCMS network boundary mocked.

## Corrections

| Area | Previous statement | Evidence |
| - | - | - |
| Delete strategy | `on_reference_delete_strategy` accepts `set_to_null`; `delete_references` deletes referring records | `@datocms/cma-client` validator types and the CMA hyperschema allow only `fail` and `delete_references` (default), which unlinks referrers |
| Field order | `itemTypes.reorderFieldsAndFieldsets` with a flat body | No such simplified method; only the private, deprecated raw endpoint with a JSON:API body. `fields.update` and `fieldsets.update` serialize `position`/`fieldset` |
| CI authentication | An env token authenticates CLI steps in CI | `@datocms/cli-utils` resolves a linked `siteId` through OAuth before the env var and fails without a login; `--api-token` wins |
| Setup CI assets | Release asset passes the destination positionally; sync asset maps an unused secret; helpers echo their arguments | The helper only reads `--destination`; the sync helper runs each destination profile; echoed arguments would include the token |
| Importers | `npm install --save-dev @datocms/cli-plugin-*` registers `wordpress:import`/`contentful:import`; helpers require `DATOCMS_API_TOKEN` | oclif loads CLI user plugins, never project dependencies; recipes authenticate through the linked profile |
| Content Link | `revealStega` from `vue-datocms`, `@datocms/svelte`, `@datocms/astro/ContentLink`; a bare Astro controller | Those packages do not export it; the bare controller ignores Web Previews navigation that `<ContentLink />` wires |
| Next.js cache | Core `force-cache` wrapper has tag-based invalidation | No invalidation route exists in Core; published content stays cached |
| Plugin | Templates with unused hook parameters; `single_block` field type; local toast component | TS6133 under the scaffold's own `noUnusedParameters`; SDK `FieldType` has no `single_block`; host toasts are `ctx.notice/alert/customToast` |
| CMA | Audit log `page.token`; iterator lowers nested `perPage`; `{ file }` uploads; `findAllNodes`; Complete Example locale backfill; misspelt build-trigger attribute | Source of `@datocms/cma-client`, `@datocms/cma-client-browser`, `datocms-structured-text-utils` and the API's nested page limit |
| CDA | Ungated `contentLink: 'vercel-v1'`; `crop: center`; focal point needs `crop: focalpoint` | API maps `vercel-v1` to `v1`; `ImgixParamsCrop` has no `center`; DatoCMS injects the focal point under documented conditions |
| CLI | `--in-place` on primary without `--allow-primary`; file-mode `cma:script` unchecked; `scheduledPublications`; offline `migrations:new` | `datocms@4.2.0` command source and resource metadata |
| Feedback | Description promises support emails; `encodeURIComponent` output single-quoted in a shell | The body builds a support-form URL; raw `'` breaks the command or silently drops the body |

## Results

Controls: 49 of 49 variants behave as intended across 17 cases (`local/regressions/final/controls-all-01`). Each correct reference passes and each reproduction of a previous statement fails for the stated reason. Deterministic tests for the shipped setup helpers also fail against the previous assets and pass against the corrected ones.

| Case | Fixed skills (latest) | Previous skills | Note |
| - | - | - | - |
| `cda-draft-editing-client` | Pass | Fail | Baseline read the old reference and leaked editing metadata into published reads |
| `cda-centered-square-thumbnail` | Pass | Fail | Baseline read the old reference and used `crop: center` |
| `cli-primary-in-place` | Pass (3rd session) | Fail | Baseline read the old reference; the CLI refused `--in-place` on primary |
| `cma-nested-export` | Pass | Fail | Baseline hit the nested page limit without opening the reference |
| `cli-schedule-publication-call` | Pass | Fail | Baseline answered from memory with an invalid command |
| `cma-audit-log-export` | Pass (3rd session) | Fail | No session opened a skill; failures were unrelated SDK mistakes |
| `plugin-new-scaffold-strict` | Pass (2nd session) | Fail | Both earlier failures omitted `rich_text`; guarded facts were correct |
| `cma-add-locale-backfill` | Pass (2nd session) | Pass | First candidate read no skill and replaced other locales |
| `feedback-apostrophe-url` | Pass (recheck) | Pass | Oracle corrected, see below |
| Remaining 8 cases | Pass | Pass | Actor avoided the old statement or verified against package types |

Every latest fixed-skill session passes. With the previous skills, three failures are directly caused by reading the corrected statements, and one more reproduces the guarded failure without reading it. Ten previous-skill sessions pass, so for this model most live sessions show no regression rather than a behavior change; the controls are the durable guard. The ledger lists all 46 graded results, including failures and model-free rechecks: [2026-09-25-fact-regressions.json](2026-09-25-fact-regressions.json).

## Changes during the round

No skill guidance was added to chase a failure. Three prompts were clarified between sessions without changing the guarded fact: the primary-migration task became an npm script and names the `main` environment, the plugin task names `rich_text` for modular content, and the Svelte task no longer points at `node_modules`. Oracle defects corrected after sessions started (each followed by a model-free recheck): the feedback shell-error rule now applies only to opener commands, the CI shim keeps `npm exec datocms --` arguments, the plugin typecheck uses a modern `lib` and blocks all DatoCMS requests in the browser, and the CLI command extractor ignores prose mentions. A first attempt was interrupted; its incomplete sessions are kept in the output directories but are not counted.

Not covered by an actor case: the `schema:inspect` verification step, the Contentful path, the Vue and Astro `revealStega` imports (package-export proofs, with the Svelte case exercising the same re-export), and the feedback description, which only trigger evaluation can measure. The setup release and sync assets are covered by `tests/setup-ci-assets.test.mjs` and `tests/setup-import-helpers.test.mjs`.
