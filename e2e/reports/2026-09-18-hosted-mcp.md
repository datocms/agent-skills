# Hosted MCP validation with Luna medium

The hosted MCP release gate recorded in the [preceding validation report](2026-09-18-production-readiness.md) now passes through a direct native OAuth connection to `https://mcp.datocms.com`. All evaluated tasks and infrastructure sessions used **`gpt-5.6-luna` with medium reasoning**. No other model or provider contributes to these results.

| Evaluated task | Independent outcome | Strict execution | Parent versions |
| - | - | - | - |
| Change a title and preserve every other field | Pass | Pass | 1 → 2 |
| Edit English prose and an image caption, then append a paragraph | Pass | Pass | 1 → 2 |
| Make those edits on an already-published record with a second image block | Pass | Pass | 2 → 3 |

The three actors received natural edit requests and the checkout's installed skills. Each discovered the real project schema and method documentation, submitted one hosted write script, and read back the saved record. Reviewed scripts contained only record reads and the requested update; local commands only read skill references. No CLI or direct HTTP fallback was observed.

The outcome grade comes from separate, maintained read-only scripts executed before and after the actors. Local assertions compare the returned CMS records with the original snapshots plus the requested edits. They verify all other fields, the entire Italian locale including code whitespace, greeting marks, link metadata, block identities, complete image values, and the untargeted second image block. They also require one new parent version per record and unchanged published content and publication metadata. Only update timestamps, current-version IDs, and equivalent absent/empty mark or link-metadata arrays are normalized.

All three actors also passed the strict execution diagnostic. This small hosted smoke supplements the broader controlled and live suites; it does not establish a general success rate or perfect reliability. Strict passes remain diagnostic, and no skill guidance was added to improve that count.

## Fixture correction and evidence

The [sanitized evidence ledger](2026-09-18-hosted-mcp.json) records **14 native sessions: three evaluated tasks and eleven preflight, fixture, oracle, or cleanup sessions**. It retains transcript hashes, installed skill and harness snapshots, tool sequences, runtime configuration, version counts, and matching published-content hashes. Infrastructure sessions are not counted as skill-quality tasks.

The first fixture attempt omitted the required empty `structured_text_links` allowlist. Hosted compilation rejected that schema script before it could mutate the sandbox. Cleanup succeeded, and no evaluated actor ran in that attempt. The fixture was corrected and every fixed script was checked against the installed SDK with project-shaped types before the successful second run. The original failure remains recorded.

Fixture and oracle sessions must submit the exact maintained source once through the prescribed safe or unsafe script tool and return an actual execution receipt. The grader rejects rewritten source, duplicate execution, and unsupported success claims. An explicit project/environment guard was added afterward; all seven successful saved infrastructure receipts passed that check against their original source hashes, without additional model calls. The live server supplied its own current guidance while the actors also loaded the candidate skills locally; this does not test a future server refresh of unreleased guidance. Controlled candidate and older-guidance results remain separately recorded in the preceding report.

## Cleanup and release status

Both attempts removed their uniquely owned sandboxes. The final independent project audit found only `main`, zero models, zero uploads, and the original English locale. OAuth credentials were managed by the native client; no plaintext credential file was observed in the temporary registration home. The temporary test login was logged out, its registration home removed, and all per-session homes removed. Shell snapshots were disabled. No API token was supplied or committed.

The previously connected app route still returned an internal error; the successful direct OAuth route does not establish that the older connector was repaired or that every client works. It does resolve the outstanding hosted authentication and execution check for this release candidate.

The deterministic harness, contract, preservation, routing, and shipped-example checks pass **100/100**. Typechecking, Markdown formatting, and repository validation also pass. The preceding reports retain their original grades and unsuccessful attempts; they have not been reclassified.

The tested scope is ready for release review. The PR remains a draft, and no merge, version bump, tag, or package publication was performed. Reproduce this smoke using the [hosted MCP instructions](../README.md#hosted-mcp-smoke).
