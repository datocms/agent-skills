# Fact regressions, round 2

This round corrects the remaining statements the audit proved wrong but the [first round](2026-09-25-fact-regressions.md) left out, plus four follow-ups found while fixing them. Each statement was re-checked against package types or source, the CLI, official docs or the upstream repositories before editing. The skill text gets shorter overall (151 lines added, 186 removed, one stub reference deleted). Sessions use `gpt-6-luna` with medium reasoning; the baseline is the unchanged `skills/` tree at `07f335b`. No live DatoCMS project or credentials were used.

## Corrections

| Area | Previous statement | Evidence |
| - | - | - |
| Content modeling | `published_at` as a fieldset field and `ordering_field` example; `code` has `highlight_lines`; 300 KB limit "higher on some plans"; `length` bounds blocks | `ordering_meta` covers publish dates; `validate()` accepts only `language`, `highlight`, `code`; limits apply regardless of plan; `length` counts characters and structured text has no block-count validator |
| Frontend | `MetaFunction` from the removed `remix` package; two-argument `revalidateTag` everywhere; `cma-types` with no generate command; stale Nuxt starter claim; Web Previews install used undefined secrets | `@remix-run/node` and React Router `MetaArgs` (`loaderData` from 7.8, `data` removed in 8); Next ≤15 takes one argument; `schema:generate FILENAME`; the starter sets `contentLink`; values come from `process.env` |
| Plugin | Pre-2.4 asset metadata shape; hardcoded overlay colour and conflicting disabled token; settings-only `navigateTo` path shown as general; stale versions; internal-monorepo patterns; addons "for" single-block fields by type | SDK 2.4+ `NewUploadDefaultFieldMetadata`; react-ui overlay token; host routes per hook; npm latest and SDK dependency majors; public `datocms/plugins`; `overrideFieldExtensions` or `fieldTypes: 'all'` |
| CDA | Token names missing the starters'; vague legacy-token note; unconditional gql.tada masking | Starter `.env` examples; legacy restricted tokens return `null` without hiding fields; masking follows `disableMasking` |
| Setup | Live site-search writes without confirmation; inline secrets in migrations; router and manifest disagree; `bun.lock` ignored; autogenerate helper scans `./migrations` only; importer teammates only need the plugin; sync helper forwards `--force` alone | CLI loads `.env` for migrations; manifest synced to recipe links; Bun 1.2 lockfile; CLI 4.2.0 config/profile resolution; OAuth and plugins are per machine; `--force` requires `--fast-fork` |
| CMA and CLI | Retired-integration stop rule overrode an explicit route; "scan client configuration"; "three" helper options; `--fast-fork` without `--destination` | Route rules; `Upload.d.ts` helper schemas; `migrations:run` `dependsOn` |
| Structured Text converter | Missing paths reported as unsafe; full diagnostics echoed to the console; "install once" with an unprinted temp dir; routing text in `default_prompt`; utils 6.0.1 | Converter source; console summary with report path; printed runtime path; one-sentence prompt; utils 6.x |

## Results

Every correction has a deterministic test that runs against the real source of truth where one exists (SDK types, the real validator, the CLI's flag metadata or command classes, shipped scripts) and fails when pointed at the previous skills with `REFERENCE_REPO_ROOT`. The offline suite passes 184 of 184 tests. Model-free controls pass for all 76 variants across the 26 regression cases of both rounds.

| Case | Fixed skills (latest) | Previous skills | Note |
| - | - | - | - |
| `react-router-post-seo` | Pass | Fail | Baseline followed the old `({ data })` pattern; the page rendered without SEO tags |
| `plugin-asset-source-default-metadata` | Pass | Fail | Baseline read the old reference and used the deprecated shape |
| `plugin-top-nav-page-path` | Pass | Fail | Baseline invented an admin path without reading the skill |
| `modeling-blog-publish-order` | Pass (2 of 2) | Fail | Baseline omitted `ordering_direction`, unrelated to the fact |
| Remaining 5 cases | Pass | Pass | Actors verified against package types or avoided the old statement |

Two baseline failures come from following the old text this round corrects. Several cases do not discriminate for this model because actors read package types or skip the reference; their deterministic tests are the guard. The ledger lists all 49 graded results, including failures and model-free rechecks: [2026-09-25-fact-regressions-round2.json](2026-09-25-fact-regressions-round2.json).

## Changes during the round

Independent reviewers checked each group and corrected: the React Router `loaderData` version (7.8+), the stop-rule wording ("asks for" rather than "names"), oracle holes in the fast-fork, single-block and code cases, the missing `datocms login` for importer teammates, and an untested `--config-file` path in the autogenerate check. The navigation case was redesigned after its first actor built the path from the current location. The `modeling-code-highlight` case was dropped: fixed-skill sessions failed on the editor configuration and the DAST wrapper rather than the guarded attribute, which the real validator already checks deterministically. Plugin fact tests skip with an install hint when the plugin fixture is missing.
