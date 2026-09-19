# Skill reading-cost comparisons

Compare a frozen release with one deletion candidate at a time, using identical tasks, fixtures, model, reasoning effort and budgets. Preserve every attempt. Review task outcomes against the evaluator-only rubrics; command recovery and token usage are diagnostics, not correctness gates. Never infer success from session completion or a preferred wording.

The initial protocol uses v1.6.4 as the baseline. Screen setup loading, CLI entrypoint compression and Content Link reference deduplication separately with two cases each. Combine only candidates without a material outcome regression, then freeze their hashes before running the reserved cases. Use the existing frontend suite for an additional paired Next.js draft-route build and HTTP check, explicitly invoking setup. Reserved cases were withheld from tuning, but are not author-blinded. They are a small regression sample, not statistical proof of equal performance on all tasks or models.

```sh
node e2e/ablation/run.mjs --skills-root local/ablation/baseline --cases cli-inspection,cli-release-plan --output local/ablation/baseline-cli
```

The skill root must contain `skills/`. Native sessions preserve source hashes, raw transcripts, usage and completion status. Record final artifact review separately. Use actual input-token counts, elapsed time and command count alongside static file sizes; cached input is already included in reported input tokens. No model-based grader is used. The React case additionally typechecks generated code and uses the installed Content Link controller in a real browser to verify resolved editing targets. Its dependencies come from the pinned catalog fixtures (`npm ci` in `e2e/catalog/web` and `e2e/catalog/plugin`). No live project credentials are needed.

Stop on a model usage-limit error. Do not redeem reset credits, silently rerun failures, or change a frozen candidate after seeing reserved results. A failed comparison can justify reverting a deletion; a new candidate requires a separately recorded comparison.
