# September 14–16 coverage: Luna medium

Scope: all 26 first-parent commits after `353c06a` through release `4c01e875325a19c50658dbcbc4ad34767bb08a98`. The remote default branch still matched this release during the review on September 18. Every evaluated agent session used `gpt-5.6-luna` with medium reasoning; other provider/model results are excluded. Deterministic checks are reported separately.

The maintained runners and reproduction commands are in [the E2E guide](../README.md). The accompanying [sanitized evidence ledger](2026-09-18-luna-medium.json) preserves cohorts, model settings, outcomes, revisions, source fingerprints, fixture corrections, and outstanding failures. Raw traces, generated apps, dependency lockfiles, and private project fixtures remain in ignored local output directories.

## Results

The evidence contains **209 native sessions across 62 distinct scenarios** across the full commit range. Session totals include baseline comparisons, repeated samples, intermediate skill revisions, and failed oracle/fixture iterations; there is deliberately no blended "success rate" across these different kinds of evidence.

| Track | Outcome and limits |
| - | - |
| Live CMS | **22/22 scenarios have passing runs**, across 37 native sessions. The final eight-case regression batch and both two-case edge repeats passed. Two earlier failures were incorrect fixture/oracle assumptions, retained in the ledger. |
| Built applications | **12/12 applications passed**, three independent implementations each for Next.js, Nuxt, Astro, and SvelteKit. Saved artifacts were rechecked with the final authentication and cookie assertions. |
| Generated code | Six scenarios cover creator filters, plugin updates, Markdown conversion, cache tags, and local reference preservation. The latest relevant cohorts passed **18/18 samples**, three per scenario; earlier failures and corrected regrades remain recorded. The final creator-filter discovery correction passed three fresh repeats. |
| Advisory workflows | **13 scenarios, 46 sessions** with rubric-based answer/trace review. Initial failures prompted narrow corrections; the final plugin and approved-cost cohort passed **6/6**. Two held-out tasks vary setup context and resource allowances. |
| Controlled CLI/MCP | **17 scenarios**; the broad two-repeat batch passed **28/34 strict checks**. Later targeted results are detailed below. This remains the least reliable track. |
| Deterministic checks | **78/78** harness, content-safety, redirect, and coexistence checks; **80/80** converter tests; root typecheck, shipped cache-tag/Dastdown examples, Astro production fixture, repository validation, and archive/source checks. |

**Remaining MCP limitations:** all six final retention samples reached the correct saved state with one applied write, but only four passed strict execution-quality checks; two needed recovery from script errors. The three final read-only-permission samples stopped correctly. After the final retired-integration stop rule, all three requested-legacy samples stopped without CMS calls or writes, but one omitted the required setup URL (**2/3** complete answers). An earlier iteration made a wrong-route write; that failure remains recorded. These targeted samples do not replace a fresh clean sweep of all 17 cases, and three samples are too few to claim a stable failure rate.

The result is substantially stronger regression coverage and several observed defects corrected, **not evidence of perfect reliability**. Release decisions should keep the MCP quality failures visible. The throwaway project's final audit found only its primary environment, zero models/uploads, and the original English locale. The temporary token file was removed and an exact credential scan found zero matches in 1,569 repository/evidence files.

## Changes supported by the observations

- Existing-project planning no longer enters the greenfield link/create gate merely because the current workspace is empty. A held-out Nuxt repository checks reuse of known framework/project context.
- Approved paid overage does not increase the included allowance or imply a separate activation step. Read-only planning can proceed while an unapproved cost remains blocked. Separate collaborator cases test the same distinction with different resources and numbers.
- Plugin fallback guidance now specifies `PUT /plugins/:id`, singular JSON:API type `plugin`, and a concrete request that preserves parameters. Generated-code tests exercise actual SDK serialization; a cast that causes attributes to disappear cannot pass.
- Creator audits distinguish a source record ID from its polymorphic creator reference, and the workflow points directly to filter operators even when SDK types accept a broad object.
- Empty top-level paragraphs containing `itemLink` references survive the shipped node-editing example. Live fixtures test populated links; local document tests cover empty link labels without API normalization.
- MCP guidance distinguishes write-capable execution from read-only inspection, carries real pre-edit values between scripts, rejects writes when access is already known to be read-only, and handles a confirmed retired integration before normal route selection.

These are narrow corrections to observed behavior. They do not establish that every session will be error-free. Source fingerprints in the ledger identify intermediate iterations, including runs started before later corrections; a HEAD SHA alone would not distinguish these uncommitted candidates.

## Commit-to-behavior map

| Commit | Behavior | Maintained evaluation |
| - | - | - |
| `0967d93` | CLI script mode and ambient helpers | Live CMS suite, including localized edits and imports; script attempts and recoveries recorded |
| `a34c543` | Dastdown editing example | Live Structured Text edits, generated Markdown conversion, shipped Dastdown example execution |
| `6f999a0` | Cascading publication and atomic failure | `publication-cascade-atomicity`: invalid dependency leaves every record unpublished and unchanged |
| `7ae28ef` | Astro native cache | `astro-native-cache` advisory runs; production Astro fixture compiles and exercises shipped middleware/invalidation |
| `9769977` | Image optimization defaults | `image-defaults`: partial override versus per-image bypass |
| `6803ecd` | Historical restoration and publication | `restore-draft-model`, `restore-published-model`: both live model settings and published/current content checked |
| `4db6ce5` | Cache-tag integration | Generated `cache-tag-collector`, Astro advisory, executable cache-tag examples and production Astro fixture |
| `382fae2` | CDA cache diagnostics and concurrency | `cda-cache-diagnostics`: cache eligibility versus hit, encoded URL length, shared concurrency |
| `246ff19` | Paid-resource preflight | Unapproved sandbox, approved sandbox, and held-out collaborator advisory cases |
| `3eeb2a5` | SEO image fallback | `seo-image-fallback`: unusable explicit image, first gallery item only, global fallback, no usable image |
| `da25e13` | Plugin development and package switching | Development-copy and package-switch advice; generated package operation with SDK serialization checks |
| `f013cde` | Custom-theme compatibility | `theme-compatibility`: missing type cannot bypass restriction; unrelated rename preserves theme |
| `94dfa32` | Content Link warning behavior | `visual-editing-sidebar`: collision handling, intentional exclusions, scoped diagnostics |
| `28dc334` | Custom nested block IDs | `custom-block-id`: live new block with chosen unused ID; existing block and publication state preserved |
| `cd6b6bc` | Creator filtering | Generated client/server filtering, mixed creator types and IDs, multiple models, real SDK pagination |
| `eb952f6` | Sidebar visual editing | `visual-editing-sidebar`: overlays, preview links, plugin configuration, draft URLs |
| `658996f` | Preview redirect validation | Built Next.js, Nuxt, Astro, SvelteKit apps: malicious destinations rejected; local query/hash retained |
| `226199f` | Upload URL preservation | `upload-keep-url`: live replacement changes checksum but retains exact URL, ID, metadata, and upload count |
| `94e4bd8` | Setup discovery | Empty-workspace existing-site case and held-out Nuxt repository; preferences before implementation |
| `27c410f` | Dedicated Structured Text skill | Local conversion/cleanup plus live nested edits, blocks, links, marks, HTML/Markdown imports |
| `3be22f1` | Optional MCP routing and retention | 17 native controlled CLI/MCP cases, including unseen resumed-conversation values; honest recovery reporting |
| `a725ce6` | Inline-code whitespace | Generated Markdown conversion and live preservation case; converter regression suite |
| `cd4d4f4` | Preservation, draft-only publishing, preview authentication | 121 selected drafts plus updated sentinel; 65-record locale backfill; all four built preview apps |
| `31c2626` | Preview authentication and update examples | Missing/empty/wrong/correct tokens, missing server secret, and independent preservation assertions |
| `ec21052` | Preservation and setup guidance | Nested/empty document structures, original-value checks, setup discovery, frontend builds |
| `4c01e87` | Release packaging | Repository/metadata validation and rebuilt archive/source comparison; no separate model behavior introduced |

## What this evidence does and does not establish

Live CMS assertions inspect saved state independently, including record versions and publication state. The native actor may recover from compilation or command errors; those recoveries remain in the trace and are not equivalent to a clean first attempt. The current API project is disposable and each case uses its own environment. Cleanup verification and a final primary-environment audit are recorded separately from task success.

The frontend suite builds and serves real applications locally. It checks HTTP behavior and cookie attributes, not browser iframe policy, deployed CDN cache lookup, or hosting-provider invalidation. The Astro production fixture tests the shipped code with a controlled provider; a real deployment still needs a host-specific smoke test.

The controlled MCP suite uses a local server contract and real document helpers. It does not exercise hosted OAuth or prove production-server parity. Advice about themes, pricing, SEO fallback, image defaults, and plugin development is reviewed against the reference contract; it is not represented as live platform execution. Public paid-plan behavior was checked against [DatoCMS pricing](https://www.datocms.com/pricing); the plugin update envelope was checked against the installed SDK and [the plugin API reference](https://www.datocms.com/docs/content-management-api/resources/plugin/update).

## Oracle corrections retained in the evidence

- A creator audit may validly filter client-side unless the task requires server-side filtering. The first grader overconstrained the implementation. It was replaced with a real SDK pagination boundary, mixed unrelated creators, and a separate server-filter task.
- The API normalizes missing localized text from `null` to `""`. The live backfill oracle now accepts either initial representation as empty.
- Nested API reads normalize an empty `itemLink` wrapper before editing. The live fixture now uses a populated link; empty record-link preservation is independently exercised on local DAST.
- Client-readable preview cookies intentionally differ from Next.js's built-in HTTP-only cookie. The browser-relevant cross-site flags are checked without demanding HTTP-only cookies from integrations that read them client-side. Astro's explicit missing-secret schema error is accepted as fail-closed, not as a successful preview. Preview disable must empty or expire each enabled cookie; Next.js's empty bypass cookie is a valid disabled state even without an expiry attribute.
- The original cascade fixture attempted to create an invalid record after making its title required. The corrected fixture creates the record first, then adds the validator; the agent sees a real publication blocker.
- Controlled MCP declarations omitted optional link metadata and incorrectly narrowed every status to `draft`. Both were corrected and regression-tested. Earlier failures caused by those declarations remain identifiable rather than being attributed to a skill.
- A pure-document prompt specified empty paragraphs but the first grader silently required whitespace-only paragraphs too. Its corrected oracle checks literal emptiness; the live case separately covers whitespace-only prose. The unchanged generated functions were regraded.
- One plugin-code prompt incorrectly promised a current SDK while supplying an older serializer. The corrected compatibility task names the installed SDK as the source of truth and checks the outgoing request. Earlier contradictory-fixture outcomes remain recorded.

## Continuing the iteration loop

For each behavioral change, choose the observable outcome and preservation constraints first; add realistic tasks and failure cases; run this exact model/effort; examine traces; verify the oracle; make the smallest useful correction; repeat and evaluate unseen inputs. Keep successful task state, failed attempts, unnecessary calls, context cost, and operational coverage separate. A small set of meaningful live/integration cases plus cheap example checks is more useful than a large collection of phrase-matching tests. Do not delete failed runs or rerun unchanged candidates until only green samples remain.
