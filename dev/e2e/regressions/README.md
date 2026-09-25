# Fact regressions

Each case guards a skill statement that was proven wrong against package source, CLI source or API behavior. The actor receives an ordinary task without skill names or expected answers, and an independent oracle runs the result against the real SDK, CLI or build tooling with the network boundary mocked. No live CMS credentials are needed.

Run from the repository root. Install the dependencies first: `npm ci --ignore-scripts --prefix dev`, then the same with `--prefix` for `dev/e2e/catalog/plugin`, `web`, `web-astro` and `web-sveltekit`. Chrome is required for browser checks; the CDA case installs its pinned fixture under ignored `local/` on first use, and the importer case needs npm registry access.

Every case also carries model-free controls: a correct reference must pass, and a reproduction of the previously documented wrong fact must fail. Run the controls whenever an oracle changes:

```sh
node dev/e2e/regressions/run.mjs --controls --output local/regressions/controls-01
```

Run the actor sessions with the pinned native model and effort. `--skills-root` selects the frozen `skills/` tree (default: this checkout). Use a snapshot of the previous release to measure the baseline:

```sh
node dev/e2e/regressions/run.mjs --output local/regressions/candidate-01
git archive <baseline> skills | tar -x -C local/regressions/baseline-skills
node dev/e2e/regressions/run.mjs --skills-root local/regressions/baseline-skills --output local/regressions/baseline-01
```

`--cases` selects comma-separated IDs, `--repetitions` repeats each case, and `--recheck <output>` reruns the oracles on saved workspaces without another model session. Cases live in `cases/*.mjs`; each exports `{ id, guards, prompt, setup?, check, controls }`. Oracle state belongs in `<case directory>/oracle`, outside the actor's workspace.
