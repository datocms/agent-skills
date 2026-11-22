# Skill evals

Three evals measure what the skills change for an agent, each against a baseline: the same agent with no skills, or with an older snapshot of `skills/`. They complement the [trigger check](../../evals/README.md) (does a skill load?) and the [end-to-end suite](../e2e/README.md) (does a Codex session complete a workflow against a live project?).

| Eval | Question | Judge | Needs |
| - | - | - | - |
| [`knowledge/`](knowledge) | Can the agent find a precise fact (a validator, an editor parameter, a limit, an error code)? | Patterns, plus a judge model for the answers that need one | A model |
| [`tasks/`](tasks) | Can it write a script that changes blocks, nested blocks, Structured Text, locales or the schema correctly? | Type-check, then the resulting project state | A model; nothing else (emulated API) or an empty DatoCMS project (real API) |
| [`design/`](design) | Does plugin UI it writes compile against `datocms-react-ui` and follow the design language? | Type-check, then rules read from the code | A model; npm registry once |

Runs make model calls: start them deliberately, and keep their output in `local/` (gitignored). The controls and the offline tests in `dev/tests/` need no model.

> **Cost.** One full round (knowledge on two models, tasks and design on two models, with a baseline) is about 100 agent runs.

## How a run works

Every eval has the same two steps around the agent:

1. `prepare` writes a run directory with `prompt.md` (and a workspace for `tasks/` and `design/`). The prompt lists the skills under `--skills-root` by name and description, as an agent's skill listing does, and tells the agent to use only those files. `--arm none` gives no skills.
2. An agent executes `prompt.md`. Any agent that can read files and run a shell works: a `claude -p` session, a Codex session, a subagent. Record its token use and tool calls in `<run dir>/usage.json` as `{ "tokens": n, "tool_uses": n, "duration_ms": n }`.
3. `check` (or `grade`) scores what the agent left in the run directory.

Run directories are named `<arm>-<model>-<case or chunk>`; the summaries group by `<arm>-<model>`. To compare two versions of the skills, snapshot the old one (`git archive <commit> skills | tar -x -C local/baseline-skills`) and pass it as `--skills-root`.

## Knowledge

`knowledge/questions/*.json` holds the questions. Each has the answer `key`, the `source` it was taken from (file and line of the API, a client, or the docs), and how to grade it: `all` (patterns that must match), `none` (patterns that must not), `judge` (a criterion for a judge model, for answers that patterns cannot grade).

```bash
node dev/evals/knowledge/prompt.mjs --out local/runs/cand-sonnet-fields-1 --areas fields --chunk 1/3
# ...the agent executes local/runs/cand-sonnet-fields-1/prompt.md and writes answers.json and reads.json...
node dev/evals/knowledge/grade.mjs --answers local/runs/cand-sonnet-fields-1/answers.json --pending local/runs/cand-sonnet-fields-1/pending.json
# ...a judge model applies knowledge/judge-prompt.md to pending.json and writes verdicts.json...
node dev/evals/knowledge/summarize.mjs local/runs
```

`--chunk i/n` gives every n-th question, so a chunk mixes areas and cannot be answered from one file. The summary reports the pass rate, the files and kilobytes of skill text read, tokens and tool calls per arm.

Write a question for a fact an agent needs in real work and would plausibly get wrong, never for wording that only this repo uses. Take the answer from the source, not from the skill.

## Tasks

`tasks/cases.mjs` holds the tasks. The agent writes `solution.ts`, a function that receives a CMA client; nothing is executed by the agent. `check` type-checks the solution against the project's generated types, runs it, and applies the case's assertions to the project state afterwards (the right blocks kept by ID, nothing else changed, nothing published).

```bash
node dev/evals/tasks/run.mjs prepare --case nested-block-edit --out local/runs/cand-sonnet-nested-block-edit
# ...the agent executes prompt.md...
node dev/evals/tasks/run.mjs check --case nested-block-edit --out local/runs/cand-sonnet-nested-block-edit
```

The project is emulated in process ([`tasks/emulator.mjs`](tasks/emulator.mjs)): the real SDK client with its HTTP boundary replaced by the API's rules for block slots, block IDs, locales, Structured Text, validators and editors. `tasks/solutions/` holds a reference solution per case and `tasks/controls/` solutions with one classic mistake each:

```bash
node dev/evals/tasks/run.mjs controls   # references pass, wrong ones fail; no model, no network
```

The same solutions run against the real API, to check the agent's work for real and to check the emulator against the API it imitates. Put a full-access token of an **empty** project in `dev/.env` (`E2E_DATOCMS_API_TOKEN`, `E2E_DATOCMS_SITE_ID`). The fixture is seeded into a sandbox environment, each check runs in its own fork of it, and the primary environment is never written to:

```bash
node dev/evals/tasks/live.mjs controls                 # emulator verdict beside the real API's, per solution
node dev/evals/tasks/live.mjs recheck local/runs       # every agent solution, against the real API
node dev/evals/tasks/live.mjs cleanup                  # destroys the eval environments
```

When the emulator and the API disagree, the API is right: fix the emulator and add the case to `tasks/controls/`.

## Design

`design/run.mjs` holds three plugin surfaces to build (config screen, record sidebar panel, custom page) in a small plugin project (`design/fixture/`). `check` type-checks the result against the installed `datocms-react-ui` and `datocms-plugin-sdk`, then applies rules of the design language that can be read from code: per-entry imports, `Canvas`, no raw colors or heading tags, no title stacked under the one the host draws, no page shell inside an embedded frame, the right component for facts, filters, dates and empty areas.

```bash
node dev/evals/design/run.mjs prepare --case config-screen --out local/runs/cand-sonnet-config-screen
# ...the agent executes prompt.md...
node dev/evals/design/run.mjs check --case config-screen --out local/runs/cand-sonnet-config-screen
```

A rule belongs here only when the documentation of the component library states it and code alone shows whether it holds. What needs eyes (spacing, density, how a screen reads) is not covered.

## Reading the results

- A case every arm passes, the no-skill one included, measures cost only: compare kilobytes read, tokens and tool calls.
- A case only the candidate passes is what the skill adds. A case the baseline passes and the candidate fails is a regression: read the agent's solution before changing the skill.
- One run per case is one sample. Repeat a case before acting on a single failure.
