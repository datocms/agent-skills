# Reserved acceptance checks

These cases test ordinary requests without explicit skill names. Two pinned upstream starters provide different application layouts; separate utility fixtures cover CLI guidance, local document editing and modeling advice. A generic counter task checks whether unrelated work stays out of CMS workflows.

Freeze the skill snapshot, prompts and oracles before running. Once a result informs a skill edit, that case is a regression case, not an unseen acceptance case. Preserve failures and every repeat. These checks use independent execution and outcome oracles, but their author also reviews the results; they are not an author-blinded benchmark.

The shared native runner defaults to `gpt-6-luna` at medium reasoning, isolates workspace skills, records source hashes and usage, and stops on account usage exhaustion. An explicit `--model gpt-6-sol` selects a comparison run at the same reasoning effort; model selection is recorded in both session results and provenance. No usage resets, live CMS credentials, provider writes or deployment are needed. Build and browser checks use synthetic content. Advisory answers require transcript review; completion alone is never a pass.

Install the `dev/` dependencies and the existing catalog web, Astro and plugin fixture dependencies first. Then prepare the pinned upstream snapshots and React runtime:

```sh
node dev/e2e/acceptance/prepare.mjs --output local/acceptance/upstream-new
node dev/e2e/acceptance/validate.mjs --output local/acceptance/controls-new --dependencies local/acceptance/upstream-new/vite-dependencies
node dev/e2e/acceptance/run.mjs --skills-root local/frozen-candidate --fixtures local/acceptance/upstream-new --output local/acceptance/round-new
```

`--skills-root` must contain the frozen `skills/` tree and dependency lock. `--cases` selects comma-separated IDs. `--dependencies` can select an already prepared React runtime. `--recheck` reads existing actor artifacts and runs the oracles without another model session; always give it a fresh output directory.

For a controlled model comparison, keep the skill snapshot, fixture dependencies, prompts and checks identical. Select the two regression cases with `--cases asset-cli,collection-links --model gpt-6-sol`. Declare the number of attempts in advance and retain every result. Rechecks must specify the original model; Astro preview replay currently supports only the default model.

The controls accept both valid pnpm command forms and correct implementations, and reject unsupported documentation flags or actions, conflicting editing groups (including SDK warnings), an encoded display-only badge, and whole-document string replacement. The CLI oracle uses the installed parser and resource metadata without executing project commands. React checks compile the app and use the real editing controller. Astro reuses the production-server HTTP oracle. The document oracle checks structural validity and preservation separately.

Upstream revisions and original file hashes are retained in each fixture's `UPSTREAM.json`; downloaded sources and their licenses stay under ignored `local/`. The runner records its dependency substitutions, task files and all starting file hashes. Model transcripts, generated applications, caches and credentials must not be committed. Commit only sanitized results and the reusable test definitions.
