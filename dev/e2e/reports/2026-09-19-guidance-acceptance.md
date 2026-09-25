# Guidance corrections and reserved acceptance

The guidance defects identified in the [reading-cost comparison](2026-09-19-reading-cost.md) are corrected, but this follow-up does **not** establish a clean acceptance gate. The original two regression tasks pass after the first correction. New ordinary requests expose a persistent Content Link display-label failure and an intermittent CLI documentation-action mistake. Both remain in the [complete attempt ledger](2026-09-19-guidance-acceptance.json); the PR stays draft, without a version bump or release.

Eighteen native sessions used `gpt-5.6-luna` with medium reasoning: ten passing outcomes, five failed outcomes and three incomplete sessions. These totals include baseline comparisons and adaptive repeats, so they are not an unbiased success-rate estimate. No usage resets, live CMS credentials, provider changes or deployments were used.

## Small corrections, without entrypoint growth

- Public `cma:docs` reads do not accept project, environment or authentication flags. The CLI setup reference now calls its flags command-specific rather than global, and links to the canonical distinction between documentation and project calls.
- Content Link guidance distinguishes the editable group owner, independent editable descendants and intentionally plain text. The existing example now shows the cleanup, and a contradictory boundary explanation is corrected.
- The long duplicated stega verification paragraph is replaced with two concise outcome checks linked to the canonical rules. An application build alone is not verification of editing targets or invisible metadata.

Across these four references, the final text is approximately **23 tokens smaller** than the prior PR head, using the same tokenizer as the earlier comparison. No skill entrypoint, discovery description, invocation policy or setup recipe changed. The original reductions therefore remain intact. Test harness files are development assets and are not included in the distributed skill archives.

## Protocol and outcomes

The two original regression prompts explicitly name their skills. All seven new task families use ordinary requests without skill names. Each actor gets an isolated workspace and frozen skill copy; evaluators remain outside that workspace. The same reviewer wrote the cases and graded the advisory answer, so this is independent execution and outcome checking, **not author-blinded evaluation**.

The application fixtures come from the pinned [Vite React TypeScript starter](https://github.com/vitejs/vite/tree/e9078f865cdff6bed77cd729214a7e2868f126b5/packages/create-vite/template-react-ts) and [Astro basics example](https://github.com/withastro/astro/tree/db2eaf17ce84a5f75c5eab30f4ae15af32de1a13/examples/basics), with recorded dependency substitutions and task-specific components. Utility fixtures are locally authored. They are different from the earlier reading-cost fixtures; they are still small starter applications, not evidence from large customer repositories.

| Task | Evidence and outcome |
| - | - |
| Original CLI inspection/record task | Documentation and record commands parse correctly against installed CLI 4.2.0; schema command details reviewed separately. No project calls executed. |
| Original React editing card | Typecheck and real-controller target resolution pass for two data inputs. |
| New upload documentation/project read | Baseline passes twice. Candidate first uses invalid documentation action `find` instead of `self`, then passes an unchanged fresh repeat. Project flags are correct in both candidate answers. |
| New collection rows | Baseline fails; all three completed candidate variants still leave metadata in the display-only badge. Candidates clean the filtering attribute, but that does not satisfy the plain rendered-text requirement. One additional session produces no work before timeout. |
| Existing Astro starter preview endpoints | Production build and 20 HTTP observations pass: credentials, local/hostile redirects, query/fragment preservation, embedded cookies, disable and missing-secret behavior. Existing homepage retained. |
| Offline Structured Text brand rename | First session times out after implementation and typecheck; its partial artifact passes a separate diagnostic check. A fresh completed retry passes the independent DAST validity, preservation, empty/absent search and immutability checks. |
| Museum content-modeling advice | Correct core shared-record/local-block design, localization and migration considerations; no writes or project access. Optional section records add complexity that may not be needed. Advisory review, not implementation evidence. |
| Ordinary counter/reset change | Production build and browser sequence `0 → 2 → 4 → 0` pass. No DatoCMS skill read or CMS workflow observed. |
| New preview/published notice banner | Initial session produces no work before timeout. Unchanged retry passes production build and real-controller checks: heading/body targets, clean audience text and navigation URL, preserved query/fragment, and ordinary published strings. |

The initial six reserved cases were frozen before execution. Once the collection result informed revisions, it became a regression case. The notice case was written and frozen before any notice output and was not used to revise the skill. The final three sequential cases use the complete final skill tree; Astro, modeling and counter evidence uses the first snapshot. Later skill changes affect only shared Content Link concepts and verification. Exact per-attempt source hashes are in the ledger.

## Evaluation integrity

Known-good controls pass. Negative controls reject unsupported documentation flags, missing editing boundaries, encoded display-only labels, encoded navigation URLs and whole-document JSON replacement. CLI checks use the real parser and local resource metadata; React checks use the real browser controller; the document check separately asserts validity and content preservation. Failed actor artifacts are not repaired or relabeled as passing.

Before acceptance, the parser oracle was corrected to include inherited command flags. A separate schema-generator import stalled, so it is not claimed as an offline parser check. Upstream binary acquisition switched to the Git blob API before model runs. Initial Vite fixtures retained an upstream lint script without its linter; those optional lint failures remain recorded and were not treated as skill failures. The committed fixture lock now includes that pinned linter, and fixture preparation was verified from scratch.

Three timed-out sessions have no final token-usage report. The document timeout had useful partial work; the other two had no actor commands or answer. They remain incomplete attempts even though subsequent runs finished. Reported token usage must not be treated as complete consumption for the round.

Repository validation, TypeScript, Markdown formatting and the existing 19 deterministic harness tests pass. The acceptance controls also pass against a freshly prepared runtime. All nine distributed skill archives match their source; final skill hashes match the frozen candidate. The staged-file and expanded-archive scan found no known credentials or private artifacts.

## What remains

The documentation is clearer and smaller, and several fresh tasks generalize successfully. The collection-label behavior is still inconsistent with the request, and the CLI action-name distinction is not perfectly reliable. Further instruction repetition was stopped after the short canonical corrections: forcing this one fixture green would be weak evidence of general improvement.

Keep these cases as regressions and retain the failed attempts. A future change should have a new general explanation and new reserved tasks, not merely more repetitions of the same instruction. This round provides no cross-model guarantee, statistical non-inferiority result or blanket production sign-off. Imports remain deferred; previous live CMS, OAuth, hosted-editor and Vercel checks were not rerun.
