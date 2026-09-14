# Optional MCP coexistence review

Skills baseline: [`94e4bd8`](https://github.com/datocms/agent-skills/commit/94e4bd8128e52963829f65bce8f202fcd68ac8d6). Candidate skill sources after the verification fix: [`419ddc7`](https://github.com/datocms/agent-skills/commit/419ddc79005c5d99274a20b6d6007c4f080c0deb). The comparison uses the existing server contract at [`beeca70`](https://github.com/datocms/remote-mcp/blob/beeca70bdf702461ae8e226bfd9714d8e58f33ac/src/tools/getApiMethods/index.ts#L69-L74); it does not change the server.

The initial rewrite omitted useful instructions for existing projects. The correction restores client/configuration and generated-type reuse, credential scope, import consistency, and several CLI/editing details. The [retention audit](RETENTION.md) maps every original entrypoint section to its current destination and distinguishes preserved guidance from intentional routing changes. Token reduction alone did not establish that useful guidance survived.

The subsequent verification fix addresses a demonstrated script mistake: comparing a serialized partial update payload with a full nested response after a successful write. The SDK distinguishes [block request forms from nested responses](https://github.com/datocms/js-rest-api-clients/blob/720b41ee5b7154346ed168c272d8cf5402bad1b2/packages/cma-client/src/fieldTypes/single_block.ts#L62-L110), and the [block builder can omit the model discriminator on ID-only updates](https://github.com/datocms/js-rest-api-clients/blob/720b41ee5b7154346ed168c272d8cf5402bad1b2/packages/cma-client/src/utilities/buildBlockRecord.ts#L48-L67). The entrypoint now explicitly requires comparing saved field values. A focused shared-reference section explains how to verify intended changes and preserved content in matching response shapes, without replaying a successful mutation after a verification error. This adds 24 entrypoint tokens. The new deterministic regressions reproduce the false mismatch and confirm that corrected verification still rejects actual loss of another locale.

The implementation follows concise discovery metadata, conditional reference loading, and execution-trace review from [OpenAI's skill guidance](https://learn.chatgpt.com/docs/build-skills) and [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices), consulted on 2026-09-14. The numeric gates below are specific to this PR.

## Static context measurements

Measured with the repository's `gpt-tokenizer`, against the PR base. Entrypoint counts include frontmatter. Discovery counts include the name and unfolded description of every public skill.

| Measurement | Base tokens | Candidate tokens | Result |
| - | - | - | - |
| CMA entrypoint | 5,988 | 2,133 | 64.38% reduction; exceeds 30% requirement |
| Optional MCP reference | — | 356 | Below 600-token ceiling |
| All discovery metadata | 1,539 | 1,482 | 57 fewer tokens |
| Other touched entrypoints, combined | 6,275 | 6,169 | 106 fewer tokens |

The optional reference loads only after MCP is selected. Method catalogs, authentication details, script globals, and tool prefixes remain owned by the exposed tools. CLI bootstrap and script syntax reuse existing CLI references; client construction is conditional on the deliverable.

## Repository checks

The existing precommit validator, formatting check, and typecheck pass for eight public skills and 26 setup recipes. The CMA description passes all 37 positive and negative trigger cases: precision, recall, and F1 are 1.00, above the existing 0.90 F1 gate. The [fresh trigger results](../results/trigger/datocms-cma/codex/frontmatter/results.json) are included. The first description attempt passed 32/37 and missed existing schema/authentication boundaries; it was refined and rerun before changing the entrypoint body.

The additional `--require-fresh-results-sync` check still fails on historical Claude snapshots. Both were already stale at the base: CLI has 32 results for 46 fixtures; CMA has 21 results for 33 base fixtures (37 after this PR). These historical results were not relabeled as current runs or replaced with another model's output. The ordinary validator and precommit command remain unchanged.

The 12 static compatibility checks pass. They validate the original and exact MCP-filtered Markdown, closed fences, syntax of applicable TypeScript examples, and preservation of 14 substantive workflow sections against the base. The preserved record files stay at their existing paths; the server's nonrecursive import remains supported.

All 32 deterministic evaluator/report tests pass, including two local-authoring tests, two saved-content verification regressions, and a check that the evaluator permits a standard own-property comparison without permitting general prototype access. Migration scoring rejects wrong filenames, comment-only stubs, invalid syntax, and incorrect field payloads. All retained migration outputs pass this check. It is static syntax/structure verification, not live migration execution or SDK typechecking. Original observations and scorer hashes are retained separately from post-run scoring.

Normal precommit processing regenerated the CLI, CMA, content-modeling, and setup ZIPs. All 81 archive files match the corresponding skill sources byte for byte, with interface metadata excluded by the existing packaging rule. No evaluation code or test dependencies are included. Existing E2E files, commands, and precommit behavior remain unchanged.

## Existing-project regression evaluation

Six native sessions at the retention correction (`994f1f1`) use the same recorded model, effort, and binary as the routing comparison: three for the PR base and three for that candidate. The task asks for a server-side article-title helper in an existing application, without CMS execution or file/configuration changes. The synthetic project already has a configured client and a generated model module. All six sessions inspect and reuse both modules, avoid setup/type-generation detours, and return a helper that compiles and reads exactly the requested records with correct title and null results. The checks use bounded TypeScript declarations and a synthetic client, not live SDK calls or schema generation. These observations remain tied to `994f1f1`; client/type-reuse instructions did not change in the later verification fix.

Both arms pass 3/3. This checks the restored workflow in one controlled fixture; it does not prove that the correction is universally lossless or establish a comparative quality advantage. Actual file/reference reads, returned modules, assertions, tool-output tokens, usage, and provenance are in [retention-results.json](retention-results.json).

## Behavioral evaluation after the verification fix

The comparison uses `gpt-6-astra`, reasoning effort `ultra`, and native binary version `0.154.0-alpha.6.2`. On 2026-09-14, all 48 candidate sessions were rerun at the fixed skill revision: three repetitions of 16 cases. After the evaluator correction described below, all six repetitions of the two affected Structured Text cases were rerun; one separate pre-execution capacity failure was retried with the same model. The final comparison retains 41 unaffected completed runs, that CLI retry, and the six fresh Structured Text runs. It compares these 48 candidate results with the 48 base and 30 applicable no-skill controls retained from the earlier run on the same date. Task prompts, tool descriptions, record data, dependency lockfile, and pinned server guidance are unchanged; prompt identity is checked by the report. The [verification-results.json](verification-results.json) records every selected run, all seven superseded observations, total usage for all 55 new attempts, provenance, actual reference reads, and live-check blockers.

The initial comparison at `a715084` remains unchanged in [review-results.json](review-results.json), and the retention correction at `994f1f1` remains in [retention-results.json](retention-results.json). Their candidate script-quality results were 47/48 and 46/48 respectively. Those observations apply to the earlier revisions and are not relabeled as current results.

**All candidate route, scope, duplicate-write, context, and script-quality gates pass in the final comparison.** Every candidate final record matches the requested result, including preserved content and publication state:

| Arm | Route, scope, duplicate-write assertions | Correct final record state | Content and script quality | All assertions, including script quality |
| - | - | - | - | - |
| PR base | 42/48 | 48/48 | 47/48 | 41/48 |
| Candidate after verification fix | 48/48 | 48/48 | 48/48 | 48/48 |
| MCP without installed skills | 30/30 | 30/30 | 29/30 | 29/30 |

The base misses the required legacy setup link in all three repetitions of each legacy-request case and invokes the retired tool in the case where current MCP is also present. The candidate directs the user to the current setup guide without executing either integration in response to an explicit legacy request.

The two candidate post-write payload-comparison errors from the retention run do not recur. The retained base and no-skill control still each include one recovered post-write verification failure; their original outcomes remain visible. The final candidate passes the stricter `gatesPassed` field as well as `requiredGatesPassed`, `criticalGatesPassed`, and `contextGatesPassed`.

The first verification-fix batch passed 44/48 strict checks. One session hit provider capacity before executing any script. Two generated scripts used `Object.prototype.hasOwnProperty.call(...)` for value comparisons, which the bounded evaluator incorrectly rejected as general prototype access. Both exact scripts replay successfully after narrowly allowing that intrinsic: each performs one correct write. All other prototype access remains blocked by a regression test. Neither retained control arm used the newly permitted intrinsic. Another first-batch script had a nullable-value TypeScript error and was repaired before writing. All repetitions of both affected cases were rerun after the evaluator correction, including their originally passing repetitions. The superseded failures remain recorded, with no outcome assertion or scorer relaxed. The final table describes the completed comparison after that correction, not a 55/55 first-attempt success rate.

| Scenario | Candidate repetitions | Observed behavior |
| - | - | - |
| Skills alone; both available without preference | 3/3 each | CLI selected; no MCP reference loaded |
| Explicit MCP; no shell; individually installed CMA | 3/3 each | MCP selected without CLI setup |
| Localized Structured Text | 3/3 | All three edits performed; unrelated nodes, marks, links, locale, block identity, and draft state preserved |
| Versioned migration | 3/3 | Requested local migration artifact created; no remote mutation |
| Neither route ready | 3/3 | Missing prerequisite reported; no false completion |
| Permission, authentication, connection failure | 3/3 each | Actual issue reported; no permission bypass or silent CLI switch |
| Uncertain write | 3/3 | Result checked without duplicate write |
| Legacy only; explicit legacy beside current | 3/3 each | Current setup link supplied; legacy not executed or repaired |
| Explicit current MCP beside legacy | 3/3 | Current route used; legacy ignored |
| Long follow-up | 3/3 including script quality | Same route, project, environment, and scope across three real turns; saved content verified without a post-write error |

The no-skill controls also pass the required assertions and reach the correct final content, so this evaluation demonstrates optional cooperation and preserves standalone MCP use. It does not establish a content-quality advantage over MCP alone.

### Observed context

These are actual delivered guidance tokens, including rereads and tool-supplied references. They exclude ordinary schema/record data, which is included in the separate tool-output measurement. Each range covers three repetitions.

| Scenario | Base guidance tokens | Candidate guidance tokens | MCP without installed skills |
| - | - | - | - |
| Skills-only CLI | 20,823–31,715 | 16,875 | Not applicable |
| Both available, default CLI | 22,491–26,265 | 8,481–12,305 | Not applicable |
| Explicit MCP | 17,574 | 12,371 | 7,698 |
| Editor / individually installed CMA | 17,574 | 12,371 | 7,698 |
| Localized Structured Text | 26,597–34,630 | 18,803–21,557 | 7,698 |
| Local migration | 31,032 | 15,656–19,480 | Not applicable |
| Long follow-up | 34,943–44,305 | 16,049–29,552 | 7,698 |

Every ordinary candidate CLI run remains below the smallest corresponding base run and loads no MCP reference. No candidate MCP content run loads CLI setup, migration, or client-construction guidance. The three long-context cases each receive an untruncated schema response of 32,160 tokenizer tokens, then an unrelated conversation turn before the final edit.

Across the 48 comparable sessions per arm, repeated logical-reference deliveries are 42 for the base and 30 for the candidate, representing 137,776 and 89,961 repeated-source tokens. Byte-identical repeated content is 55,958 and 19,011 tokens respectively. Duplication remains: for example, a reference read before method discovery can overlap guidance the server subsequently returns. The no-skill control has no repeated reference deliveries across its 30 sessions. Source reuse and byte-identical duplication are measured separately because the server filters shared documents.

| Usage measure | Base, 48 sessions | Candidate, 48 sessions | No installed skills, 30 sessions |
| - | - | - | - |
| Median tool-output tokens per session | 19,284 | 14,090 | 9,410 |
| Provider input tokens | 9,379,937 | 8,287,280 | 3,170,487 |
| Cached input tokens | 7,814,144 | 6,601,984 | 2,329,600 |
| Provider output tokens | 60,105 | 55,923 | 30,156 |
| Reasoning output tokens | 18,081 | 14,751 | 6,747 |

Usage fields are sums of the native `turn.completed` counters, retained as reported, not a cost estimate. For resumed conversations, whether this binary reports per-turn or cumulative thread usage has not been independently verified; those sums must not be interpreted as unique or billable tokens. Tool-output counts include guidance as well as data and do not measure the complete context or exact billing. The context gates use delivered reference content and do not depend on usage-counter semantics. The control has fewer scenarios, so its aggregate usage is not a like-for-like comparison with either 48-session arm.

### Method and limitations

The comparison uses synthetic records and controlled tools through native model sessions. CLI commands run through a bounded adapter; no real DatoCMS project or credentials are exposed. Scripts compile against the fixture's TypeScript contract and execute against recorded state. The document transformations use the real pure Structured Text utilities, with a bounded adapter for block identity and partial-update behavior. The tool contract is a tested subset, not a complete server emulator.

All arms receive identical task prompts, tool descriptions, record data, and pinned server-imported guidance. The candidate arm changes installed skill text; the no-skill control removes installed skills while retaining the server's own guidance. The long-context scenario has three native turns: a large schema response, an intervening conversation, and an edit that does not restate the route or target. Fixture sources and the dependency lockfile are hashed and frozen before each batch. Six supplementary no-skill sessions complete the long-follow-up and current-beside-legacy comparisons; their provider/runtime files are byte-identical to the first batch, with the same prompts, model, data, and dependency lock. Only case-arm inclusion and the static migration scorer changed between batches.

An initial diagnostic run was stopped after 53 completed sessions. It exposed a missing legacy setup link in the candidate response, which prompted the explicit redirect wording. It also exposed harness issues: a block discriminator mismatch, missing guidance-reuse metadata, and overly strict scoring for a prior identity read and harmless read-only diagnostics. The final fixture includes the server's [guidance-reuse description](https://github.com/datocms/remote-mcp/blob/beeca70bdf702461ae8e226bfd9714d8e58f33ac/src/tools/getApiMethods/index.ts#L197-L203) and [identity-check advice](https://github.com/datocms/remote-mcp/blob/beeca70bdf702461ae8e226bfd9714d8e58f33ac/src/tools/whoami/index.ts#L27-L28). Diagnostic transcripts are retained separately and excluded from final comparison totals.

## Real-client verification

| Client | Result |
| - | - |
| Claude Desktop with current hosted DatoCMS MCP | Blocked on 2026-09-14: computer controls could not resolve Claude Desktop, and the available-app inventory contained no Claude entry. Candidate installation and a disposable test project remain unconfigured. |
| OpenAI client with production hosted DatoCMS MCP | Attempted on 2026-09-14: the installed connection's identity call returned `UNAUTHORIZED` / `Reauthentication required`. No project operation ran. Reconnection and a disposable project/environment are needed for the content smoke test. |
| Existing live-CLI E2E suite | Attempted on 2026-09-14 with the existing nested-block-edit and marks-and-links cases. Global setup failed with `Missing env var TEST_DATOCMS_ORGANIZATION_ID`; no tests or project operations ran. Test-account email/password were also unconfigured, and neither supported agent executable was on PATH. |
| Native OpenAI client with real DatoCMS CLI | Six additional live sessions on 2026-09-14 using `gpt-5.6-luna`, low reasoning, CLI 4.2.0, and CMA client 6.1.3. All six saved the correct content and preserved draft state; only two passed every strict execution-quality assertion. See the separate diagnostic results below. |

## Additional live tests with a smaller model

At the user's request, six bounded sessions used `gpt-5.6-luna` with low reasoning: three simple title edits and three localized Structured Text edits on separate synthetic records. The native client ran real CLI commands in a temporary fork of the supplied throwaway project. A launcher supplied the token only to CLI subprocesses and redacted their output; no credential was placed in agent prompts or committed files. Candidate skills were copied into isolated workspaces and explicitly catalogued. This verifies real content execution, not client-UI installation, automatic discovery, or hosted MCP authentication. The hosted server [requires an issued OAuth bridge token](https://github.com/datocms/remote-mcp/blob/beeca70bdf702461ae8e226bfd9714d8e58f33ac/src/lib/oauth/datocmsProvider.ts#L288-L296), so the supplied project token cannot replace its login.

Independent saved-record reads confirm **6/6 correct results**, including unrelated fields, Italian content, marks, links, block identities and image values, with draft status preserved. Each record has exactly its initial version and one saved update. All project-access commands named the temporary environment. **Only 2/6 sessions passed every strict execution-quality assertion**; recovered errors remain failures. The first simple case recovered from empty `--json` output. The second simple case attached an unsupported environment flag to a documentation command, encouraged by ambiguous wording in the test prompt. The Structured Text cases respectively bypassed validation after a bad read script, recovered from a rejected block payload, and corrected a type error before executing a validated script. The last complex case preserved all content without disabling validation, but its initial compilation error still counts against script quality.

These observations prompted small reference corrections: pipe `cma:call`'s default JSON output without `--json`, reserve validation bypass for confirmed workspace defects, and clarify concrete types and record-versus-block field shapes. CLI 4.2.0 produced empty output with `--json` in the live calls; its [current implementation enables the flag but prints through `this.log()`](https://github.com/datocms/cli/blob/c56bff12f1aba12664353c4ffc701cd69c069f51/packages/cli/src/commands/cma/call.ts#L102-L135). The three reference changes add 17 tokens in total; discovery metadata and every entrypoint remain unchanged. The 44 deterministic tests, formatting, typecheck, repository validator, and context budgets pass. The shared-reference importer checks still preserve all existing substantive workflows.

The skill text and test prompt were corrected during these six sessions. They are exploratory smoke results, **not** a controlled three-repetition comparison of the final text against the base. The earlier 48-case candidate comparison above remains tied to its recorded revision; it was not rerun with the expensive model or relabeled after these reference edits. [live-cli-results.json](live-cli-results.json) retains source hashes, prompt variants, actual reference-read commands and repetitions, CLI calls and generated scripts, independent before/after values, recovered failures, tool-output token counts, and usage. The six native usage reports total 1,075,153 input tokens (862,464 cached) and 9,897 output tokens; the reasoning-output counter was 2,102. These are provider counters, not unique context size, monetary cost, or isolated account-limit usage.

An initial harness assertion incorrectly treated real version IDs as numeric counters. It was corrected by listing the same record's versions; the write was not rerun. Final reads also verified that none of the six records changed after its test. Cleanup deleted the temporary fork, including both added models and all six records, and verified that only the original primary environment remains. Its locale list was preserved. The primary model count changed from four to one during the run; this change is not explained by the captured test commands, and neither test model appeared in primary. That unresolved observation is recorded without restoring or otherwise altering primary. The original live E2E suite and hosted-client checks remain separate; these additional results do not justify claiming that all production verification is complete.

The synthetic runs exercise tool selection, generated scripts, state preservation, and transcript/context accounting. They do not establish client installation behavior, OAuth handshakes, production server execution, or universal model reliability. The failed live prerequisites are not passing integration checks. The missing connection, app, and test configuration were requested; no alternate credentials, unrelated projects, or replacement execution routes were used.

No runtime dependency, automatic MCP installation, new public skill, minimum coordinated server release, or publishing/version change is introduced. MCP users do not need installed skills. The server's existing live fetch from this repository remains; removing that dependency is separate server work.
