# Targeted model comparison

With the skill text unchanged, `gpt-5.6-sol` at medium reasoning produced correct outcomes in **all six fresh sessions**: three upload CLI answers and three Content Link collection implementations. Each session read the relevant skill and canonical reference. This supports keeping the current guidance for these two cases rather than adding further instructions to chase the earlier failures. It does not establish universal model reliability or erase the [earlier acceptance failures](2026-09-19-guidance-acceptance.md).

| Case | Sol medium, fresh runs | Earlier Luna medium, saved outputs |
| - | - | - |
| Upload documentation and scoped read | 3/3 correct | 1/2 correct with identical CLI guidance; one answer used the nonexistent documentation action `find` instead of `self`. |
| Collection editing targets and plain badges | 3/3 correct | 0/1 completed on the identical final skill snapshot; the badge retained invisible editing metadata. |

The earlier collection history also contains two failures on preceding skill revisions and one session with no work before timeout. Those are preserved in the original ledger, not counted as additional identical-snapshot trials here. No new Luna sessions were run for this comparison.

## Controls and evidence

Three attempts per case were declared before execution. All six ran sequentially in fresh isolated workspaces using the final `candidate-3` skill snapshot from revision `173953bebff27a62ee68fd25e61892e6460539a0`. The prompts, initial fixture files, dependency versions, runtime settings and limits were held constant; only the requested model changed. Full skill hashes match the previous final collection attempt. For the earlier CLI attempts, the CLI skill files match exactly; intervening edits affected frontend references. The Vite dependency snapshot intentionally retains the previous optional-linter limitation to keep this comparison consistent.

The CLI evaluator parses the commands with CLI 4.2.0 and checks local resource metadata, argument values and flags without executing project calls. The collection evaluator builds each application and uses the real Content Link browser controller to check row, image, curator and count ownership, clean rendered badges, lowercase filtering values, preserved content and reordered rows. All three collection implementations pass these checks without competing-source warnings.

Two evaluator defects were corrected after the attempts started, without changing model prompts, skill text or generated outputs:

- Two correct Sol CLI answers used `pnpm datocms` and were initially rejected because the evaluator required `pnpm exec datocms`. The fixture has no conflicting script, so both forms run the same executable. This agrees with [pnpm's documented shorthand](https://pnpm.io/cli/exec), and both forms returned the same installed CLI version. Both are now accepted; invalid documentation flags and the wrong action still fail.
- The controller warning check previously matched only the word `collision`, while the SDK reports “Multiple stega-encoded payloads resolved to the same DOM element.” It now recognizes that actual warning. A negative control with competing sources and otherwise correct final targets proves the warning is rejected. An initial control also changed a target and failed the earlier target assertion; it was replaced with one that isolates the warning check.

All six immutable Sol outputs and the three comparable saved Luna outputs were rechecked with the corrected evaluators. Sol passes all six; Luna retains its one CLI pass, one CLI failure and final collection failure. Original scoring results remain intact alongside the corrected results in the [comparison ledger](2026-09-19-sol-comparison.json). Known-good implementations pass and deliberately incorrect controls fail. No failed implementation was repaired to obtain a pass.

## Interpretation

These are two already known regression cases with three Sol repetitions each, compared against historical Luna runs. They are not a randomized, equally sized benchmark, unseen holdouts or a general ranking of models. The results show that the current guidance can be applied correctly by Sol and that the observed failures are sensitive to model choice. They provide no reason to diagnose a DatoCMS backend defect, and no evidence that more prose would improve the tradeoff between reading cost and reliability.

Keep the small existing guidance corrections and regression checks. This comparison adds no skill text, changes no distributed archive, and does not change the default evaluation model. No usage reset, live project mutation, deployment, version bump or release was performed; the pull request remains draft.
