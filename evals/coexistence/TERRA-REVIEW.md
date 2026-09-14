# Terra medium validation

The current comparison passes **48/48 required candidate routing, scope, and duplicate-write checks**, **48/48 strict content/script checks**, and all context gates. The strict `gatesPassed` result is **true**. The retained real CLI assessment passes **6/6 strict checks**, and the retained production-hosted MCP assessment passes **48/48 assertions across six content edits**. Earlier failed attempts remain visible.

All new behavioral sessions use `gpt-5.6-terra` with `medium` reasoning and native client version `0.154.0-alpha.6.2`. The [controlled results](terra-results.json) and [real CLI results](terra-live-results.json) record source hashes, actual guidance reads and repeats, scripts, tool-output tokens, usage, assertions, and earlier observations. Historical Astra and Luna results remain in [REVIEW.md](REVIEW.md); they are not relabeled as Terra runs.

## Corrections

The entrypoint makes CLI precedence explicit even when MCP is connected. A confirmed legacy request stops execution, includes the current setup link, and does not silently switch to another connection. Setup guidance loads only when needed. The CMA description now distinguishes token/OAuth setup before content operations from standalone CLI setup and schema inspection; its interface metadata stays synchronized.

CLI references distinguish documentation actions (`self`, `instances`) from SDK methods (`find`, `list`). They retain the observed CLI 4.2.0 JSON-output caveat and explain its ES2020 validation target. These are checked against the current CLI's [action resolution](https://github.com/datocms/cli/blob/c56bff12f1aba12664353c4ffc701cd69c069f51/packages/cli/src/commands/cma/docs.ts#L183-L223), [call output](https://github.com/datocms/cli/blob/c56bff12f1aba12664353c4ffc701cd69c069f51/packages/cli/src/commands/cma/call.ts#L102-L135), and [managed workspace configuration](https://github.com/datocms/cli/blob/c56bff12f1aba12664353c4ffc701cd69c069f51/packages/cli/src/utils/script-workspace/workspace.ts#L291-L331). The schema reference distinguishes an optional field from the nested `required` validator; the [field schema makes validators optional](https://github.com/datocms/js-rest-api-clients/blob/720b41ee5b7154346ed168c272d8cf5402bad1b2/packages/cma-client/src/fieldTypes/schema.ts#L285-L308), and the [string validator type](https://github.com/datocms/js-rest-api-clients/blob/720b41ee5b7154346ed168c272d8cf5402bad1b2/packages/cma-client/src/fieldTypes/string.ts#L29-L39) defines requiredness.

The complete Structured Text example now appears earlier in the existing editing reference, so common partial reads include its typed mapper. Its parsing result has an explicit writable field type. Guidance covers node/child guards and comparing saved values with the original snapshot, including null assets, without confusing object identity, normalized optional arrays, serialized request payloads, or saved content. The MCP-only summary keeps preconditions and the single mutation separate from read-only verification, and calls out optional marks and link metadata. A read-only script compiled the typed pipeline against the real managed CLI workspace. The [retention audit](RETENTION.md) and exact importer tests preserve all 14 substantive workflow sections; only the reviewed parsing type annotation and its comment are normalized in that comparison.

The evaluator also had defects: host skill overrides used directory paths and missed symlinks; an extremely small skill budget produced misleading removal warnings; nullable logging was rejected; migration artifacts could not be read back; and the migration scorer required an unnecessary empty validators object. These are corrected and covered by deterministic tests. A clean native discovery probe returned no host skills or skill-budget errors. Record IDs are now explicit in task prompts. CLI documentation/action and `--json` behavior match the observed version. These corrections improve fixture fidelity; they do not demonstrate that every earlier failure was caused by the harness.

## Controlled comparison

The comparison includes three repetitions per applicable case: 48 base, 48 candidate, and 30 MCP-without-installed-skills sessions. All selected rows use identical prompts, fixture source hash, dependency lockfile, model, and effort. Server-supplied guidance is frozen at the PR base in every arm.

| Arm | Required route/scope/write checks | Content and script quality | All assertions |
| - | - | - | - |
| PR base | 41/48 | 47/48 | 41/48 |
| Candidate | 48/48 | 48/48 | 48/48 |
| MCP without installed skills | 29/30 | 28/30 | 28/30 |

All 48 candidate final records match the expected state. Skills-alone and both-available default cases choose CLI; explicit MCP, no-shell and individually distributed CMA cases avoid CLI setup. Migrations remain local artifacts. Legacy requests redirect without execution. Authentication, permission, connection failure and uncertain-write cases retain their restrictions. All three long follow-ups preserve the route, project, environment and scope.

Three fresh long-follow-up repetitions pass after the guard and response-shape corrections. The earlier mutable optional-marks compilation failure remains in the retained attempt history; it was rejected before execution and never caused a duplicate write. No validation bypass, lost content, unauthorized route change or duplicate write was accepted.

Controls come from `terra-final-06`. Candidate results retain 36 unaffected sessions from `terra-candidate-07`, nine corrected legacy/localized sessions from `terra-correction-09`, and three fresh long-follow-up repetitions from `terra-host-final-longfollowup`. Earlier runs exposed an unauthorized switch from legacy to current MCP, missing setup links, false object-identity checks, and missing paragraph-child guards. All earlier completed results are retained, including passing repetitions replaced by correction runs. This is a post-correction comparison, not a perfect first-attempt success rate. The 420 retained controlled results include diagnostic and interrupted batches and the separate local-authoring checks; unfinished attempts without a completed result are not included in that count.

The existing-project code fixture passes 3/3 candidate and 3/3 base repetitions, reusing the configured client and generated types. The coexistence discovery evaluation passes its 37/37 cases, and the three Structured Text boundary cases added on `master` also pass, for 40/40 committed rows with precision, recall and F1 of 1.00. This is explicit classifier evaluation, not native automatic-invocation verification.

## Context

Counts use the repository's `gpt-tokenizer` and current PR base `27c410f7952bf14d12c0284a81cfb5d5d266fb6c` after conflict resolution.

| Measurement | Base | Current |
| - | - | - |
| CMA entrypoint | 6,289 | 2,409; 61.70% reduction |
| Optional MCP reference | — | 468; below 600-token ceiling |
| Aggregate discovery metadata | 1,684 | 1,636 |
| Other touched entrypoints | 6,553 | 6,503 |

Actual loaded guidance for skills-only CLI runs is 6,132–13,169 candidate tokens versus 18,554–22,328 base tokens. With both tools available and no preference, it is 8,316–9,984 versus 18,554–25,727. Every candidate CLI run remains below the minimum corresponding baseline read count and avoids the MCP reference. MCP content cases do not load unrelated CLI setup, migration, or client-construction guidance.

Across the 48 selected candidate sessions, 18 repeated logical guidance deliveries account for 58,464 tokens; none are byte-identical repeated content. The server can return its older frozen reference after the installed skill has supplied a newer version. Median loaded guidance is 10,125 tokens and median tool output is 11,996.5 tokens. These measurements record delivered content, not ZIP size or unique model context. The server's live fetch remains unchanged.

The selected candidate sessions report 7,190,705 input tokens, including 5,969,152 cached, and 46,753 output tokens. All 420 retained controlled results report 65,277,565 input tokens, including 53,940,224 cached, and 462,013 output tokens. The final 37-prompt classifier reports 9,884 input and 374 output tokens. These are provider counters, not monetary cost or isolated account-limit consumption. A separate account-wide snapshot after earlier testing showed 34% of the weekly allowance remaining; concurrent work prevents attributing changes to this task.

## Real CLI execution and cleanup

The native shell used actual CLI 4.2.0, CMA client-node 6.1.3, underlying CMA client 6.3.0, and managed Structured Text helper packages 5.1.16. These differ from the pure helper versions used by the controlled fixture. A launcher supplied the disposable token only to CLI subprocesses, kept it out of prompts, and redacted command output.

All 30 real CLI sessions saved correct content, preserved publication state, kept TypeScript validation enabled, and produced exactly one additional record version. Twenty-two pass every strict assertion; eight earlier sessions recovered from command, compilation, or verification errors. Those eight remain failures. The retained six-case assessment consists of simple edits 7–9 and the three fresh complex edits 19–21: all six pass. The simple cases precede the later verification refinement; complex cases follow it, with the final child-guard/link wording present in case 21. Complete source snapshots preserve these differences rather than presenting the six as one unchanged skill revision.

All project-access commands explicitly target the owned sandbox; `--help` is a local documentation read and excluded from project-access assertions. Independent final reads confirmed the recorded content and exactly two versions for all 30 records. Cleanup then deleted only the evaluator-owned sandbox, including its two models and 30 records, and verified its absence. No global model/environment count is asserted constant or restored. The owner confirmed that earlier model-count changes came from concurrent tests.

The six retained live sessions report 1,296,584 input tokens, including 1,102,336 cached, and 13,314 output tokens. All 30 sessions report 8,552,232 input tokens, including 7,388,160 cached, and 90,090 output tokens. Actual read commands, repeated paths and output tokens remain in the evidence. A later manual read-only probe is excluded from the frozen agent metrics for case 2; case 11 includes a pause in its elapsed time to serialize the shared CLI workspace.

## Hosted MCP execution

OAuth authentication, identity, and project discovery succeeded in a fresh native OpenAI client against `https://mcp.datocms.com`. All content work stayed in one evaluator-owned environment of the supplied throwaway project. The retained assessment contains three simple edits and three localized Structured Text edits. Every script in those six retained sessions compiles and executes, all **48/48 route, script, content, preservation, publication, and duplicate-write assertions pass**, and an independent read-only script confirms exactly two top-level versions per record: creation plus one update. A final post-correction Structured Text smoke uses one mutation script and one separate read-only verifier with no error.

The full [hosted MCP evidence](terra-host-mcp-results.json) records sanitized scripts, actual skill-reference reads, MCP calls, tool-output tokens, model usage, version checks, and all 19 exploratory/correction attempts. Ten attempts are script-clean; earlier compilation, verification, HTTP 502, and timeout observations remain visible and are not presented as clean first-attempt successes. Those observations produced the final guard, normalization, and separate-verifier guidance. The six retained hosted sessions report 1,687,248 input tokens, including 1,412,096 cached, and 20,403 output tokens. Cleanup deleted only the evaluator-owned environment, verified its absence, and confirmed that the primary environment remained present.

## Remaining verification boundary

All 55 deterministic tests, repository validation, formatting, typecheck, context gates and shared-reference importer checks pass. Normal precommit processing regenerated the CLI and CMA ZIPs. All 172 files across eight ZIPs match their source bytes and exclude evaluation dependencies. The committed files, ZIP contents, local outputs and owned workspaces passed an exact-credential scan. The temporary credential file and all 30 CLI scratch workspaces were removed; the shared project token was not revoked. Existing E2E commands and precommit activation are unchanged.

The original live E2E suite still stops in global setup because its organization/account prerequisites are unavailable; the authorized project-token CLI and OAuth-hosted checks above cover separate execution paths. Claude Desktop is outside this PR's acceptance scope at the user's request. Historical failed connection and stale Claude snapshots in [REVIEW.md](REVIEW.md) remain labeled historical.

All PR-specific routing, content/script, context, CLI, and hosted-MCP acceptance checks now pass. No runtime dependency, automatic MCP installation, new public skill, server change, version bump or release is introduced.
