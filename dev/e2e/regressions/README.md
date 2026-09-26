# Fact regressions

Each case guards a skill statement that was proven wrong against package source, CLI source or API behavior, or a behavior contract of a skill. The actor receives an ordinary task without expected answers (and without skill names, except the setup conversation cases, which invoke `$datocms-setup` on purpose), and an independent oracle runs the result against the real SDK, CLI or build tooling with the network boundary mocked. No live CMS credentials are needed.

Run from the repository root. Install the dependencies first: `npm ci --ignore-scripts --prefix dev`, then the same with `--prefix` for `dev/e2e/catalog/plugin`, `web`, `web-astro` and `web-sveltekit`. Chrome is required for browser checks; cases that need other package versions (CDA, React Router, Next.js 15) install pinned fixtures under ignored `local/` on first use, which needs npm registry access, as does the importer case.

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

`--cases` selects comma-separated IDs, `--repetitions` repeats each case, and `--recheck <output>` reruns the oracles on saved workspaces without another model session. Cases live in `cases/*.mjs`; each exports `{ id, guards, prompt, followUps?, setup?, check, controls }`. Oracle state belongs in `<case directory>/oracle`, outside the actor's workspace; a session whose commands or edits reference it or other evaluation state fails (`oracleAccess` in `session.json`).

`followUps` are later user messages, each sent by resuming the same native session after the previous turn completes. `check` receives `snapshots` (file hashes after setup, then after each turn, saved as `snapshots.json` for rechecks) and the session's per-turn `turns` and turn-tagged `commands`, so a case can assert, for example, that a planning turn changed nothing. A control is one simulated turn (`{ files, finalText, commands }`) or several (`{ turns: [...] }`). `budget.timeoutMs` applies to each turn; `budget.maxCommands` counts the whole session.
