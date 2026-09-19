# Skill reading-cost comparison

The retained changes remove 557 net lines of repeated skill guidance, with no material outcome regression observed in this small comparison against v1.6.4 (`56265ef`). Twenty fresh sessions used `gpt-5.6-luna` with medium reasoning: separate setup, CLI and Content Link candidates, one paired repeat, then six sessions on a frozen combined candidate and baseline for reserved tasks. No skill instructions were changed in response to the runtime failures. No usage resets or live CMS/provider operations were used.

This supports a conservative reduction, not a claim of unchanged performance on every task or model. The [attempt ledger](2026-09-19-reading-cost.json) includes every model session, source/transcript hashes, errors, actual usage, independent checks and review limitations. Raw evidence remains under `local/ablation/`.

## What was reduced

| Area | Before → after, estimated tokens | Decision |
| - | - | - |
| CLI entrypoint | 5,054 → 2,881 (43% smaller) | Remove the duplicate task table and command reference material; retain workflow decisions, authorization, authentication, schema inspection and migration safety |
| React Content Link | 2,975 → 2,147 (28% smaller) | Link to canonical attribute/grouping and stega utility guidance; retain React imports, hooks, router integration and Structured Text examples |
| Vue Content Link | 3,428 → 2,602 (24% smaller) | Same deduplication; retain Nuxt timing, fullPath updates, router unsubscription and controller disposal |
| Svelte Content Link | 2,622 → 1,796 (32% smaller) | Same deduplication; retain framework APIs and renderer integration |
| Astro Content Link | 2,579 → 1,715 (34% smaller) | Same deduplication; retain subpath imports, automatic navigation and View Transitions behavior |
| Setup | Entry grows by 81 tokens; shared rules shrink by 60 | Preserve all 26 recipes and prerequisites. Select relevant manifest entries recursively instead of requesting the whole catalog; remove a duplicate shared-inspection checklist |

Migration signatures and filename conventions existed only in the CLI entrypoint, so they were moved into the migration reference. Their content was retained. The matching schema-inspection section reference was updated before the combined candidate was frozen. Skill discovery descriptions are unchanged. Across the nine changed documents, the net reduction is approximately 5,384 tokens; this is a file-size estimate using `gpt-tokenizer`, separate from observed runtime usage.

Setup legitimately needs framework, project and prerequisite context. Its complete catalog is about 5,130 estimated tokens, but a targeted task usually needs only a few entries. Selective lookup was followed in two of three candidate setup tasks; one still read a broader catalog slice. No claim is made that this instruction reliably caps reading cost. Recipes were not flattened or shortened to meet a size target.

## Outcome comparisons

| Task | Release baseline | Shorter candidate |
| - | - | - |
| Existing Nuxt preview discovery | Correct advisory outcome | Correct advisory outcome |
| Next.js visual-editing bundle plan | Correct advisory outcome | Correct advisory outcome |
| Scoped CLI inspection/types/record call | Wrong flag on documentation command | Same wrong flag |
| Migration release plan | Requested safety preserved; adds an unnecessary placeholder migration | Requested safety preserved without the placeholder |
| Nuxt Content Link guidance | Correct core guidance; schematic snippets | Same core guidance; schematic snippets |
| React card, first pair | Wrong editing target, established after oracle correction | Same wrong editing target |
| React card, fresh repeat | Same wrong editing target | Correct targets in a real browser for two data inputs |
| Reserved stdin/file/migration distinction | Correct advisory outcome | Correct advisory outcome |
| Reserved Astro/Svelte integration review | Correct advisory outcome | Correct advisory outcome |
| Reserved Next.js preview implementation | Production build and 20 HTTP observations pass | Production build and 20 HTTP observations pass |

The combined candidate was frozen before the reserved tasks ran. Those tasks were reserved from tuning, not author-blinded; the same reviewer authored and assessed the advisory cases. Focused prompts explicitly name the skill, so these results do not measure automatic skill discovery. Advisory snippets are not counted as compiled application evidence.

The React oracle typechecks generated code and uses the real Content Link controller in Chrome with synthetic content. It verifies card, author, video and numeric-field targets, clean filter values, visible content and collisions. The Next.js oracle independently builds and starts both applications, tests missing/incorrect secrets, hostile/local redirects, full query strings/fragments, disable behavior and embedded-cookie flags. Both generated implementations use native `draftMode()`; the baseline additionally creates an unnecessary signed cookie. These local tests do not repeat hosted-editor, live CMA, OAuth or Vercel validation.

## Failures and evaluator corrections

Both CLI inspection answers add `--profile` to `cma:docs`. An offline check against the installed CLI parser rejects that flag and accepts the command without it. This is a shared baseline error, not evidence that the deletion caused it. It remains recorded rather than being counted as a pass.

Both first React outputs leave category stega inside the title's group, causing the card to select the category. The baseline repeats this in the fresh pair; the candidate cleans the rendered category and passes. There were no guided repairs or added instructions tailored to this card. One success out of two candidate attempts does not establish robust grouping performance.

The baseline's first browser build could not resolve an optional Mux peer reached through the SDK barrel export. The oracle was corrected to permit tree-shaking that unused export while explicitly rejecting a bundle that still references the missing peer. Both original artifacts were then rechecked unchanged in new evidence directories; the original results remain intact. A hand-authored valid component passes the oracle, while removing its independent-target boundaries is rejected. Initial archive extraction also needed a host-Python compatibility correction before any model session began.

## Context and time

All ten pairs, including failures and the repeat, are included:

| Metric | Baseline | Candidate |
| - | - | - |
| Input tokens, including cached input | 1,319,727 | 927,347 |
| Uncached input tokens | 320,815 | 322,419 |
| Sum of session wall times | 765 seconds | 649 seconds |
| Recorded shell commands | 74 | 57 |

Total input is about 30% lower and summed session time about 15% lower, but uncached input is essentially unchanged and slightly higher. Some candidate sessions use more context or time. Tool grouping, caching, output choices and sampling variation affect these measurements; this small run does not prove monetary savings or a causal speedup. Static document reduction is the clearest evidence of lower potential reading cost.

## Validation and remaining uncertainty

Repository validation, TypeScript checks, the existing 19 deterministic harness tests, and targeted Markdown checks pass. The three refreshed skill ZIPs match the final source, and all skill hashes match the frozen combined candidate. The staged-file audit found no known credentials or private artifact paths. No version bump or release is part of this comparison.

The shared CLI-command error and inconsistent React grouping remain limitations. Other tasks, automatic routing, imports, providers, permission combinations and models were not reevaluated here. Keep these failures and reserved tasks in the ledger; future pruning should compare against a fixed baseline and use new reserved work instead of adding instructions for these exact examples.
