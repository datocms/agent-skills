# Optional MCP workflow evaluation

This separate, opt-in evaluator measures whether an agent follows the skill's execution route and preserves content when CLI and MCP tools coexist. It leaves `npm run test:e2e`, its live-project harness, and the precommit hook unchanged.

## Run

```bash
# Free deterministic checks; no agent or DatoCMS account required
npm run test:coexistence:fixtures

# Paid native-agent evaluation: run only when explicitly requested
npm run eval:coexistence -- --repetitions 3 --jobs 2

# Choose an installed binary if the PATH version cannot run your model
CODEX_BIN=/path/to/codex npm run eval:coexistence -- --repetitions 3 --jobs 6

# Inspect cases, or select a bounded diagnostic run
npm run eval:coexistence -- --list
npm run eval:coexistence -- --cases explicit-mcp --arms base,candidate,none --repetitions 1

# Full comparison and context gates
node evals/coexistence/report.mjs local/coexistence/<run>/results.json local/coexistence/<run>/report.json

# Paid local-code regression: existing client + generated type reuse, three runs per arm
EVAL_MODEL=your-recorded-model EVAL_EFFORT=ultra node evals/coexistence/authoring.mjs local/coexistence/authoring-run
```

The runner reads only the configured model and reasoning effort from the user's top-level configuration, then passes the same values to every arm. An explicit `--model` and optional `--effort` override is available. It does not substitute a cheaper model. Authentication remains with the installed native agent; no authentication files or secrets are copied into fixtures.

The default baseline is commit `94e4bd8128e52963829f65bce8f202fcd68ac8d6`. `base` loads that skill tree, `candidate` snapshots the working tree, and `none` exposes no skill content. Each case uses the same task, tool contracts, starting record, assertions, and model across its applicable arms. The ordinary CLI, migration, unavailable-route, and explicit-legacy cases compare base/candidate; current-MCP cases, including the long follow-up and current connection beside legacy, also include the no-skill control. Results identify the source revision, fixture source hash, task/catalogue hashes, native binary version, model, and effort.

## What executes

The evaluator starts real native agent sessions and captures their actual MCP tool calls and responses. Three local stdio test providers expose workspace tools, a bounded current-MCP contract, and an unavailable legacy integration. The workspace `exec_command` tool simulates supported local CLI commands; it does not launch an operating-system shell. Native shell, browser, unrelated connectors, plugins, and memories are disabled. Host skills are disabled by their actual `SKILL.md` paths, following symlinks; the evaluator does not use a tiny catalogue budget that emits misleading skill-removal warnings. Skill catalogues are injected explicitly and their files are read through the workspace fixture, so this tests skill guidance rather than client installation or native discovery.

MCP scripts are typechecked against the installed CMA SDK and Structured Text packages using generated project types, then executed against a synthetic record. CLI stdin scripts retain their separate ambient-helper contract. No real CMA client, token, filesystem, network API, or host callback is exposed to the script. Real pure Structured Text helpers are bundled inside the VM; the block-type guard recognizes the fixture's simplified model discriminator. The fixture client supports only `items.find` and `items.update`; existing block diffs merge by ID. Executed calls, raw submitted source, applied effects, and errors are logged separately. This is a bounded test double, not a security sandbox or a complete reimplementation of the CMA.

The current runtime contract is recorded in [mcp-runtime-contract.json](mcp-runtime-contract.json), checked against the connected tool descriptions on September 18. MCP supplies `client` and `Schema`; helper values and types use named or namespace imports from its three allowed packages. Missing imports and nonexistent exports fail typechecking. `whoami` reports account identity and is not treated as a write-permission check. Historical reports retain their older fixture contract and must not be presented as current-runtime results. Its resource/action guidance behavior is simulated using the baseline's `records.md` and `editing-records.md`, filtered by the same removal of lines containing `cma:`. Those server-side documents remain identical across all arms. Resource/action `have` tokens suppress the corresponding guidance; method documentation is returned again. The fixture uses opaque synthetic verification tokens and limited signatures, rather than the server's token implementation. No source is fetched from a live server during an evaluation.

The long-follow-up case uses three actual native turns. The first selects the MCP route and target, then reads a schema containing at least 32,000 tokenizer tokens. The middle turn asks about image alt text and captions without accessing the project. The final turn resumes that exact native session with only the content request; it does not repeat the chosen route or target. Its native session ID is recorded. This checks a real follow-up after a large tool response and intervening conversation; it does not establish behavior after compaction or in every client. Other cases use ephemeral sessions.

## Assertions and artifacts

Success comes from the observed final record and execution log, never from an agent's claim. The complex record requires a marked span edit, an existing block caption change, and a root paragraph append, while preserving links, the block ID/image, the Italian locale, unrelated fields, and draft status. Critical assertions cover route/target changes, permission bypass, repeated or unauthorized writes, lost unrelated content, legacy execution, and false success without an available route. Script compilation and requested edits are reported separately. Known read-only access, a first permission denial, ordinary hosted-authentication/connection failure, and uncertain-write responses are distinct fixtures.

Each session writes `native.jsonl`, `tools.jsonl`, `result.json`, prompt files, and stderr under `local/coexistence/<run>/<case>/<arm>/<repetition>/`. Aggregate `results.json` is updated as sessions finish. Each run retains a frozen fixture source snapshot; existing output directories cannot be reused. Results include reference reads and tool-supplied guidance with source hashes and event order, output-token estimates, provider-reported usage summed across turns, source code, final content, and failures. Token estimates use `gpt-tokenizer`; they are not a claim of exact billing for every provider. Missing provider metrics remain unavailable. Read failures, repeated failed reads, and whether account identity was inspected are diagnostics. A first zero-effect permission rejection is legitimate discovery; bypassing an observed restriction is a critical failure.

The full report requires every expected three-repetition comparison. `requiredGatesPassed` combines the context/completeness checks with candidate route, scope, and duplicate-write assertions; content/script quality is reported separately. The stricter `gatesPassed` also requires every content/script assertion, and the report command exits 1 when that combined gate fails, including a recovered script exception. It checks that ordinary CLI runs do not load the MCP reference or exceed baseline loaded guidance, and that MCP tasks avoid unrelated CLI/bootstrap/migration/client setup references. Repeated logical sources and byte-identical repeated content are measured separately. Baseline failures remain visible and do not become candidate passes.

The separate `authoring.mjs` fixture adds synthetic project files with an existing configured client and generated model type. It asks for application code only, checks actual file reads and absence of setup/type-generation commands, compiles the returned module against a small fixture contract, and executes it against the existing-client test double. It rejects fabricated results and unexpected runtime dependencies. This checks local-code reuse; it does not run a real SDK request or type generator. The underlying workspace provider and original coexistence cases remain the same.

These synthetic results do not replace real execution. The retained CLI run is recorded in `terra-live-results.json`, and the authenticated production-hosted MCP smoke is recorded in `terra-host-mcp-results.json`. Other clients remain separate verification work.
