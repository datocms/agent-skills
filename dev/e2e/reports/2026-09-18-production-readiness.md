# Release-candidate validation

The later [hosted MCP follow-up](2026-09-18-hosted-mcp.md) resolves the connection gate recorded here. This report preserves the results and release decision from its original validation round.

This follow-up covers the same 26 first-parent commits after `353c06a` through `4c01e875325a19c50658dbcbc4ad34767bb08a98`. The [original coverage map and 209-session report](2026-09-18-luna-medium.md) remain historical evidence. Every new evaluated session also uses `gpt-5.6-luna` with medium reasoning. Other model/provider results are excluded.

This follow-up contains **333 additional native sessions across 66 distinct scenarios**, including intermediate candidates, held-out tasks, and failed attempts. It supplements the earlier 209 sessions.

The [new evidence ledger](2026-09-18-production-readiness.json) records each cohort separately, including failed attempts, native transcript hashes, source snapshots, runtime settings, and independent assertions. Rechecking a saved artifact does not count as another native session. There is no aggregate success rate across different candidates, fixture versions, and kinds of work.

## Results and release decision

The broad release-guidance MCP cohort reached the required final state and route in **57/57 sessions** across 19 scenarios; **50/57** passed the strict execution grade. The seven other sessions recovered from script compilation or verification errors. The separate older-server-guidance cohort reached the required outcomes in **12/12**, with **7/12** strict passes. These remain the original grades.

The final typed-snapshot cohort reached the correct outcome in **15/15 sessions** across five content cases, with **12/15** strict passes. All three multiple-block holdouts passed strictly. The preceding validator-clarification cohort had **12/12** correct outcomes but only **2/12** strict passes, exposing nullable/type-inference and verification mistakes. These are separate small cohorts, not a controlled estimate of causal improvement. Three final failures remained: nullable helper construction, an invalid template plus an incorrect publication precondition, and a preservation check that included an authorized added span. Every session performed one authorized write and recovered without replaying it.

The final publication-preservation follow-up reached the required outcome in **6/6 sessions**, with **5/6** strict passes. The remaining failure imported a Structured Text guard from the wrong package, then corrected it before the single authorized write. All six preserved publication and unrelated content, including the three multiple-block cases. No publication-precondition failure recurred in this small sample.

The first fresh live sweep passed **21/22**; the Markdown import exceeded its script budget while working around the broken ESM launcher. After the launcher correction, the second sweep passed **19/22**, including the import in three script calls. Three cases timed out; their traces include a connection reset and a session that never reached a tool call. Their exact cause is not established. A bounded retry of those three cases with the corrected runtime passed **3/3**, without increasing attempt or time budgets. All 22 live scenarios therefore have successful runs in this follow-up, while the failed runs remain recorded.

| Track | Additional evidence and limits |
| - | - |
| Applications | **4/4** fresh implementations built and passed HTTP assertions, one per framework; the prior report separately retains twelve repeated builds. |
| Generated code | The fresh 18-session batch passed **16/18**. Both observed defects received focused guidance corrections; six fresh follow-ups passed **6/6**, and the same six artifacts passed stronger missing-header assertions without more model calls. The other four scenarios passed all twelve original samples. |
| Advice | The first thirteen tasks produced eleven complete answers, one partial answer, and one failure. Four affected/held-out resource and CDA cases then passed **12/12** reviews. The final plugin development/rollback cohort had **5/6** complete rubric passes and one omission of the unique-name explanation; all six gave the safe operational sequence. |
| Deterministic | **94/94** harness, contract, preservation, redirect, and routing checks, with the relevant **67/67** rerun after the final publication clarification; **80/80** converter tests; typecheck, formatting, shipped examples, Astro production fixture, repository validation, and nine matching source archives. |

The context check uses its original pre-extraction baseline, `27c410f`: the CMA entrypoint remains 60.76% smaller and the MCP adapter is 588 tokenizer tokens, under its 600-token budget. This is a historical extraction budget, not a demand for another 30% reduction relative to the latest release. Discovery metadata did not grow.

Release remains gated on a successful hosted MCP smoke. The local suites provide strong outcome and preservation evidence, but recovered execution errors remain visible and no finite sample establishes perfect reliability. Further prompt additions should address a repeatable failure mechanism, with an executable example and unseen case; adding a warning for every incidental script error would increase context without establishing reliability.

## Corrections supported by new observations

- The live CLI launcher now runs as ESM inside an ESM workspace. Its previous CommonJS wrapper failed before the command reached the CLI and encouraged unnecessary command workarounds.
- MCP scripts use the exposed runtime contract: `client` and `Schema` are implicit; helper values and types are imported. The fixture compiles actual installed SDK/helper declarations, models publication versions, and rejects the server's type-safety escape hatches. Account identity is separate from write permission.
- Content transformations keep nested response types until mapping, then type the generated result as a request. Preservation uses original in-memory values, typed node guards, and value comparison. File fields preserve full asset objects; custom marks are not narrowed to the six defaults; update timestamps and current-version IDs are not mistaken for publication changes.
- Typed preservation snapshots use guarded `collectNodes(...).map(...)` projections. A held-out multiple-block task verifies that editing one image leaves a second image block unchanged; the grader masks the appended node by the original root length rather than a fixed index.
- Plain DAST validation is distinguished from hydrated CMA and partial/new block request types, avoiding an unsupported validator call without erasing types or block data.
- The fixture now declares its draft-enabled model explicitly. For that model, “do not publish” allows a current draft edit on an already-published record; the published version must remain unchanged. This resolves an ambiguity observed in two cohorts without relaxing the saved-state assertions.
- A never-published record has no readable published version. Uncertain writes are resolved through read-only inspection without replaying the mutation or changing transport.
- Retired-integration guidance applies when a user reports that their old local integration no longer works, as well as when explicitly requesting it. Current connection failures do not imply retirement.
- Plugin installation changes and development copies route directly to their operation guidance. Rollback explicitly restores and verifies field assignments before removing a development copy.
- Manual CDN tasks directly load the adapter reference. Draft queries suppress page cache tags even when the query returns no tag header; Cloudflare output is comma-separated, as required by the [provider's header contract](https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-tags/).
- Paid-resource guidance keeps included allowance, approved overage, and hard capacity distinct. CDA diagnostics explicitly inspect the 429 response and reset information.

## Evidence boundaries

Live CMS cases use an authorized disposable project, serial sandbox environments, independent saved-state assertions, and verified cleanup. A correct result after a recovered command error is distinguishable from a clean first attempt. Timeouts and transport errors remain failed runs; they are not silently converted into passes.

Application cases build and serve Next.js, Nuxt, Astro, and SvelteKit implementations and test their HTTP authentication, redirects, and cookie behavior. They do not test browser iframe policy or a deployed CDN. Generated-code cases exercise real SDK serialization and pagination against a controlled API boundary. Advice is reviewed from both answers and command traces; model completion is not a quality grade.

The connected hosted route returned `-32603 Internal error` for two method-documentation calls and one identity call. No successful hosted smoke is claimed, and the failure does not establish a service-wide outage. Hosted authentication and execution remain an external release check.

Controlled MCP is a local contract fixture, not hosted OAuth or a deployed sandbox test. The connected tool descriptions and inspected server source informed its contract. In particular, the server fetches the record/editing references from this repository's `master` branch and memoizes them. `--server-guidance candidate` models a fresh fetch after release; `--server-guidance baseline` models older cached guidance. Both freeze the chosen documents at run start and identify them by revision and hash. The two cohorts must not be conflated.

Strict controlled grades include compilation and verification errors even when the session recovers. The separate final-state-and-routing measure excludes only that explicit script-error flag; it still requires the requested saved state, preservation, route, scope, write count, permission handling, and uncertain-write behavior. Neither measure proves perfection.

## Runtime hygiene and provenance

A scan during an active live case found the credential in an automatically generated shell-environment snapshot inside the ignored temporary runtime home. Completed sessions remove that entire directory; the harness now also disables both snapshot features, consistent with the [runtime configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference#configtoml). Credentials remain absent from command arguments and prompts, and observed transcript output fails a run. The final audit scans completed evidence, repository files, changed-history blobs, and archive members before removing the temporary token file. The final live project audit found only the primary environment, zero models and uploads, and the original English locale.

Native runs now hash the installed workspace skill copy and capture harness hashes when the runner module loads. Earlier long-lived live processes could retain loaded code while later provenance hashes reflected edited repository files; their traces establish which launcher actually ran. Controlled cohorts already preserve complete frozen fixture and candidate trees. Historical results are retained with this distinction, rather than relabeled as runs of the newest harness.

## Reproduction

Use the commands in [the E2E guide](../README.md). For a release-candidate MCP matrix:

```bash
node evals/coexistence/run.mjs \
  --model gpt-5.6-luna --effort medium \
  --baseline 4c01e875325a19c50658dbcbc4ad34767bb08a98 \
  --server-guidance candidate --arms candidate \
  --repetitions 3 --jobs 2 --timeout 420 \
  --output local/release-candidate-01
```

Use a fresh output directory and inject credentials through the process environment for live CMS work. Do not put credentials in prompts, arguments, or repository files. Preserve unsuccessful runs; verify whether a failure belongs to the skill, the model's execution, the fixture, or the transport before changing guidance.
