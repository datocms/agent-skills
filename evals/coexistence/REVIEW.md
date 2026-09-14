# Optional MCP coexistence review

Skills baseline: [`94e4bd8`](https://github.com/datocms/agent-skills/commit/94e4bd8128e52963829f65bce8f202fcd68ac8d6). Candidate skill sources: [`a715084`](https://github.com/datocms/agent-skills/commit/a71508405bb0cb5e10a228965927d3f704eb1d1c). The comparison uses the existing server contract at [`beeca70`](https://github.com/datocms/remote-mcp/blob/beeca70bdf702461ae8e226bfd9714d8e58f33ac/src/tools/getApiMethods/index.ts#L69-L74); it does not change the server.

The implementation follows concise discovery metadata, conditional reference loading, and execution-trace review from [OpenAI's skill guidance](https://learn.chatgpt.com/docs/build-skills) and [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices), consulted on 2026-09-14. The numeric gates below are specific to this PR.

## Static context measurements

Measured with the repository's `gpt-tokenizer`, against the PR base. Entrypoint counts include frontmatter. Discovery counts include the name and unfolded description of every public skill.

| Measurement | Base tokens | Candidate tokens | Result |
| - | - | - | - |
| CMA entrypoint | 5,988 | 2,026 | 66.17% reduction; exceeds 30% requirement |
| Optional MCP reference | — | 356 | Below 600-token ceiling |
| All discovery metadata | 1,539 | 1,482 | 57 fewer tokens |
| Other touched entrypoints, combined | 6,275 | 6,169 | 106 fewer tokens |

The optional reference loads only after MCP is selected. Method catalogs, authentication details, script globals, and tool prefixes remain owned by the exposed tools. CLI bootstrap and script syntax reuse existing CLI references; client construction is conditional on the deliverable.

## Repository checks

The existing precommit validator, formatting check, and typecheck pass for eight public skills and 26 setup recipes. The CMA description passes all 37 positive and negative trigger cases: precision, recall, and F1 are 1.00, above the existing 0.90 F1 gate. The [fresh trigger results](../results/trigger/datocms-cma/codex/frontmatter/results.json) are included. The first description attempt passed 32/37 and missed existing schema/authentication boundaries; it was refined and rerun before changing the entrypoint body.

The additional `--require-fresh-results-sync` check still fails on historical Claude snapshots. Both were already stale at the base: CLI has 32 results for 46 fixtures; CMA has 21 results for 33 base fixtures (37 after this PR). These historical results were not relabeled as current runs or replaced with another model's output. The ordinary validator and precommit command remain unchanged.

The 12 static compatibility checks pass. They validate the original and exact MCP-filtered Markdown, closed fences, syntax of applicable TypeScript examples, and preservation of 14 substantive workflow sections against the base. The preserved record files stay at their existing paths; the server's nonrecursive import remains supported.

All 27 deterministic evaluator/report tests pass. A final review strengthened migration scoring to reject wrong filenames, comment-only stubs, invalid syntax, and incorrect field payloads. The six retained migration outputs pass the stronger check with no changed outcomes. This is static syntax/structure verification, not live migration execution or SDK typechecking. Original observations and scorer hashes are retained separately from post-run scoring.

Normal precommit processing regenerated the CLI, CMA, content-modeling, and setup ZIPs. All 81 archive files match the corresponding skill sources byte for byte, with interface metadata excluded by the existing packaging rule. No evaluation code or test dependencies are included. Existing E2E files, commands, and precommit behavior remain unchanged.

## Behavioral evaluation

The complete comparison ran on 2026-09-14 with `gpt-6-astra`, reasoning effort `ultra`, and native binary version `0.154.0-alpha.6.2`. It contains 126 sessions: three repetitions of 16 cases for base and candidate, plus ten applicable cases for MCP without installed skills. Per-session reference reads, repeated deliveries, tool-output token estimates, usage, provenance hashes, and outcomes are in [review-results.json](review-results.json).

**All required candidate route, scope, duplicate-write, and context gates pass.** Every candidate final record matches the requested result, including preserved content and publication state. Script quality remains a separate result:

| Arm | Route, scope, duplicate-write assertions | Correct final record state | Content and script quality | All assertions, including script quality |
| - | - | - | - | - |
| PR base | 42/48 | 48/48 | 47/48 | 41/48 |
| Candidate | 48/48 | 48/48 | 47/48 | 47/48 |
| MCP without installed skills | 30/30 | 30/30 | 29/30 | 29/30 |

The base misses the required legacy setup link in all three repetitions of each legacy-request case and invokes the retired tool in the case where current MCP is also present. The candidate directs the user to the current setup guide without executing either integration in response to an explicit legacy request.

The candidate's second long-context repetition, the base's third repetition, and the no-skill control's first repetition each make one correct update, then compare the raw request body to an expanded nested response. The response has additional block metadata, so that verification throws. All three sessions recover with read-only inspection and confirm the correct final state; none repeats the write. These remain recorded script-quality failures. Consequently, the stricter combined `gatesPassed` field is false and the report command exits 1; `requiredGatesPassed`, `criticalGatesPassed`, and `contextGatesPassed` are true. No failed assertion was removed from the recorded run.

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
| Long follow-up | 3/3 required assertions; 2/3 script quality | Same route, project, environment, and scope across three real turns; one recovered verification error |

The no-skill controls also pass the required assertions and reach the correct final content, so this evaluation demonstrates optional cooperation and preserves standalone MCP use. It does not establish a content-quality advantage over MCP alone.

### Observed context

These are actual delivered guidance tokens, including rereads and tool-supplied references. They exclude ordinary schema/record data, which is included in the separate tool-output measurement. Each range covers three repetitions.

| Scenario | Base guidance tokens | Candidate guidance tokens | MCP without installed skills |
| - | - | - | - |
| Skills-only CLI | 20,823–31,715 | 16,718 | Not applicable |
| Both available, default CLI | 22,491–26,265 | 9,652–12,148 | Not applicable |
| Explicit MCP | 17,574 | 12,264 | 7,698 |
| Editor / individually installed CMA | 17,574 | 12,264 | 7,698 |
| Localized Structured Text | 26,597–34,630 | 18,525 | 7,698 |
| Local migration | 31,032 | 15,549–19,323 | Not applicable |
| Long follow-up | 34,943–44,305 | 21,279–31,750 | 7,698 |

Every ordinary candidate CLI run remains below the smallest corresponding base run and loads no MCP reference. No candidate MCP content run loads CLI setup, migration, or client-construction guidance. The three long-context cases each receive an untruncated schema response of 32,160 tokenizer tokens, then an unrelated conversation turn before the final edit.

Across the 48 comparable sessions per arm, repeated logical-reference deliveries fall from 42 to 32, representing 137,776 to 97,190 repeated-source tokens. Byte-identical repeated content falls from 55,958 to 26,450 tokens. Duplication is reduced, not eliminated: for example, a reference read before method discovery can overlap guidance the server subsequently returns. The no-skill control has no repeated reference deliveries across its 30 sessions. Source reuse and byte-identical duplication are measured separately because the server filters shared documents.

| Usage measure | Base, 48 sessions | Candidate, 48 sessions | No installed skills, 30 sessions |
| - | - | - | - |
| Median tool-output tokens per session | 19,284 | 13,981 | 9,410 |
| Provider input tokens | 9,379,937 | 8,420,837 | 3,170,487 |
| Cached input tokens | 7,814,144 | 6,834,816 | 2,329,600 |
| Provider output tokens | 60,105 | 53,241 | 30,156 |
| Reasoning output tokens | 18,081 | 12,948 | 6,747 |

Usage fields are sums of the native `turn.completed` counters, retained as reported, not a cost estimate. For resumed conversations, whether this binary reports per-turn or cumulative thread usage has not been independently verified; those sums must not be interpreted as unique or billable tokens. Tool-output counts include guidance as well as data and do not measure the complete context or exact billing. The context gates use delivered reference content and do not depend on usage-counter semantics. The control has fewer scenarios, so its aggregate usage is not a like-for-like comparison with either 48-session arm.

### Method and limitations

The comparison uses synthetic records and controlled tools through native model sessions. CLI commands run through a bounded adapter; no real DatoCMS project or credentials are exposed. Scripts compile against the fixture's TypeScript contract and execute against recorded state. The document transformations use the real pure Structured Text utilities, with a bounded adapter for block identity and partial-update behavior. The tool contract is a tested subset, not a complete server emulator.

All arms receive identical task prompts, tool descriptions, record data, and pinned server-imported guidance. The candidate arm changes installed skill text; the no-skill control removes installed skills while retaining the server's own guidance. The long-context scenario has three native turns: a large schema response, an intervening conversation, and an edit that does not restate the route or target. Fixture sources and the dependency lockfile are hashed and frozen before each batch. Six supplementary no-skill sessions complete the long-follow-up and current-beside-legacy comparisons; their provider/runtime files are byte-identical to the first batch, with the same prompts, model, data, and dependency lock. Only case-arm inclusion and the static migration scorer changed between batches.

An initial diagnostic run was stopped after 53 completed sessions. It exposed a missing legacy setup link in the candidate response, which prompted the explicit redirect wording. It also exposed harness issues: a block discriminator mismatch, missing guidance-reuse metadata, and overly strict scoring for a prior identity read and harmless read-only diagnostics. The final fixture includes the server's [guidance-reuse description](https://github.com/datocms/remote-mcp/blob/beeca70bdf702461ae8e226bfd9714d8e58f33ac/src/tools/getApiMethods/index.ts#L197-L203) and [identity-check advice](https://github.com/datocms/remote-mcp/blob/beeca70bdf702461ae8e226bfd9714d8e58f33ac/src/tools/whoami/index.ts#L27-L28). Diagnostic transcripts are retained separately and excluded from final comparison totals.

## Real-client verification

| Client | Result |
| - | - |
| Claude Desktop with current hosted DatoCMS MCP | Not performed. No candidate-skill installation and dedicated test project were configured for this review. |
| OpenAI client with production hosted DatoCMS MCP | Not performed. The native evaluation runs against controlled synthetic providers, not the production connection. |

The synthetic runs exercise tool selection, generated scripts, state preservation, and transcript/context accounting. They do not establish client installation behavior, OAuth handshakes, production server execution, or universal model reliability. The existing live-project E2E suite was not run for this documentation/routing change.

No runtime dependency, automatic MCP installation, new public skill, minimum coordinated server release, or publishing/version change is introduced. MCP users do not need installed skills. The server's existing live fetch from this repository remains; removing that dependency is separate server work.
