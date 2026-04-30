# cma:script end-to-end tests

These tests drive a real coding-agent CLI (Claude Code by default, or opencode
via `E2E_AGENT=opencode`) against a fresh DatoCMS project and measure how well
— and in how many attempts — it can complete scripting tasks via
`npx datocms cma:script` (stdin-mode, "inline").

Each test:

1. Creates a fresh DatoCMS project (optionally applying fixtures) and gets back
   a full-access CMA API token.
2. Spawns the selected agent (`claude -p` or `opencode run --format json`) in
   an isolated `tmp/e2e/<slug>/` working directory, with the entire `skills/`
   tree of this repo mirrored into `.claude/skills/` so every local skill is
   discoverable (opencode reads that path natively too). The project's
   `node_modules/.bin` is prepended to PATH so the locally-installed `datocms`
   CLI resolves. The API token is embedded in the prompt.
3. Parses the agent's transcript, counting bash tool calls whose command
   matches `datocms ... cma:script` — those are the scripting "attempts".
4. After the agent exits, runs an assertion directly against the CMA to verify
   final project state.
5. Tears down the project.

The agent is not asked to self-report — attempts are counted externally from
the transcript, success is verified externally via the CMA.

## Setup

```bash
npm install
```

Then create `.env.local` at the repo root with:

- `TEST_DATOCMS_ACCOUNT_EMAIL` — one or more comma-separated emails of the
  test account pool (multiple accounts spread session rate limits across them).
- `TEST_DATOCMS_ACCOUNT_PASSWORD` — shared password for that pool.
- `TEST_DATOCMS_ORGANIZATION_ID` — the organization under which the test
  project is created.

No OAuth token is needed: the per-project full-access API token is minted at
project creation and passed straight to the agent.

## Running

```bash
npm run test:e2e                                  # all e2e cases
npm run test:e2e -- e2e/cases/<case>.e2e.test.ts  # one case
```

`.e2e.test.ts` files are picked up only by `vitest.e2e.config.ts`.

## Reading results

Each run writes to `tmp/e2e/<case-slug>/`:

- `raw.jsonl` — full stream-json transcript from `claude -p`.
- `transcript.simplified.log` — human-friendly plain-text rendering: skills
  loaded, scripts run, tool results. ANSI-free, readable in editors and pagers.
- `outcome.json` — pass/fail, attempts, tool call names, reason.

A failing test's error message includes `transcriptPath` so you can replay
exactly what Claude did.

## Writing a new case

Put `<name>.e2e.test.ts` under `e2e/cases/` and call `runE2ETest` with:

- `name` — short slug used in the project name and log line.
- `fixtures` (optional) — `async (cmaClient) => { ... }` to preload the
  project before Claude runs.
- `task(project)` — natural-language instructions. Include `project.siteId`
  (the API token is auto-embedded by the harness preamble). The preamble also
  reminds the agent to load `datocms-cma` and `datocms-cli`. Do not ask Claude
  to report attempts or success — the harness does that.
- `maxAttempts` — hard cap on `cma:script` invocations. When exceeded, the
  subprocess is killed and the test fails.
- `assert(project)` — throws on unmet invariants. Run CMA queries via
  `project.cmaClient`.
- `model`, `timeoutMs` — optional overrides.

The function returns an `E2ETestOutcome` with `attempts`, `toolCallNames`,
`transcriptPath` and `reason`. A failure throw from the test should include
`transcriptPath` so you can replay what Claude actually did.

## Notes

- Before every `npm run test:e2e` run, a global setup hook destroys any
  leftover test projects older than 30 minutes (orphans from a crashed
  previous run). Override with `E2E_CLEANUP_MAX_AGE_MS=<ms>` or force a
  full wipe with `E2E_CLEANUP_FORCE=1`.
- Projects are destroyed on every run. Set `E2E_KEEP_PROJECT=1` in the
  environment to skip teardown when debugging a failing run.
- Override the model for all cases with `E2E_MODEL=<id>` (e.g.
  `E2E_MODEL=claude-sonnet-4-6 npm run test:e2e`). Per-case `model` overrides
  still win.
- Run against [opencode](https://opencode.ai/) instead of `claude` with
  `E2E_AGENT=opencode npm run test:e2e`. Default is `claude`. opencode
  discovers skills via the same `.claude/skills/` mirror, runs with `--pure`
  (no external plugins / MCP) and `--dangerously-skip-permissions`, and emits
  its own JSON event stream into `raw.jsonl` (rendered into
  `transcript.simplified.log` by a dedicated opencode simplifier).
  Override the opencode model with `E2E_OPENCODE_MODEL=<provider/model>`;
  per-case `model` overrides still win.
- The harness uses a fresh temp dir as `cwd` for the Claude subprocess to
  avoid contamination from any `CLAUDE.md` in the repo. The repo's `skills/`
  tree is mirrored into that temp dir under `.claude/skills/` so local skills
  stay discoverable, then cleaned up on exit (only test artifacts remain).
- Transcripts live under `./tmp/e2e/<case-slug>/` (relative to the repo
  root). The whole `tmp/e2e/` dir is wiped at the start of every
  `npm run test:e2e` run.
- Tool whitelist passed to the Claude agent: `Bash,Read,Glob,Grep,Skill`. MCP
  is fully disabled via `--strict-mcp-config` with an empty server list. The
  opencode harness does not currently restrict the tool set — it relies on
  `--pure` to disable external plugins/MCP and on the prompt steering the
  agent toward `cma:script`.
