# Maintenance

This page collects the contributor and maintainer workflows for the `datocms/agent-skills` repository. End users do not need anything on this page — see the root [README](../README.md) instead.

## Pre-commit automation

This repo uses [husky](https://typicode.github.io/husky/) to run a pre-commit hook that keeps artifacts in sync with skill changes. Dev tooling and its dependencies live in `dev/`. After cloning, run from the repo root:

```bash
npm ci --prefix dev
```

The `prepare` script wires `core.hooksPath` to `.husky/` automatically. From that point on, every `git commit` will:

1. Format staged markdown with remark (skipping `.remarkignore` paths) and re-stage it. A staged markdown file that also has unstaged changes is refused, since re-staging would commit those hunks too: stage the whole file, or `git stash push --keep-index` first.
2. Detect skills with staged changes, deletions included (anything under `skills/<name>/` except `agents/`, which is excluded from the claude.ai zips anyway).
3. Regenerate the `.zip` for each affected skill from a temp checkout of the **index** — so zips reflect _staged_ content only, never unstaged working-tree edits — and re-stage the regenerated zip. A skill deleted entirely has its zip removed.
4. Run `validate_skill_repo.py`. A non-zero exit blocks the commit.

The hook intentionally does **not** bump plugin versions or run evals — both are explicit release-time decisions (see below). To skip the hook for a specific commit, use the standard `git commit --no-verify`.

## Validation

Run from the repo root before publishing or opening a PR:

```bash
# Base validation: metadata sync, eval fixture coverage, repo invariants
python3 evals/scripts/validate_skill_repo.py

# Pre-publish gate: also requires a clean working tree
python3 evals/scripts/validate_skill_repo.py --require-clean-git

# Optional: fail if checked-in eval results are stale
python3 evals/scripts/validate_skill_repo.py --require-fresh-results-sync
```

Besides metadata and fixtures, the validator resolves every relative link (with exact case, as GitHub and Linux hosts do) and heading anchor in maintained markdown (`skills/`, `docs/`, `dev/`, `.claude/rules/`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `evals/README.md`); links from skill files must stay inside `skills/`, the only folder that ships. It also rejects `SKILL.md` frontmatter keys outside the Agent Skills spec (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`), because claude.ai and Skills API uploads of the zips refuse them, and fails if a CMA reference the [hosted MCP server](#hosted-mcp-dependency) fetches is missing.

For the full eval workflow (running and interpreting results) see [`evals/README.md`](../evals/README.md). **Do not run evals proactively** — they are expensive. Only run them when explicitly investigating trigger quality.

### Structured Text checks

The local converter tests copy the shipped runtime to scratch and install its locked dependencies there. They need Node >=20.19.0 and npm registry access for installation, but no DatoCMS credentials. Never install dependencies into the shipped skill directory.

```bash
npm --prefix dev test   # every offline test in dev/tests and the coexistence fixtures
(cd dev/tests/dastdown && npm ci --ignore-scripts --no-audit --no-fund && npm test)
npm --prefix dev run typecheck
npm --prefix dev run format:check
```

The Dastdown checks execute the canonical examples selected by named section in the specialist references. Live Markdown-create and HTML-update coverage runs through the existing disposable-project harness with `npm --prefix dev run test:e2e`; local document checks do not establish API acceptance. Keep routing scores, document correctness, instruction-loading observations, and live persistence results separate when reporting validation.

## Regenerate the claude.ai zips

The [`zips/`](../zips) folder ships a pre-built `.zip` per skill for the [claude.ai](https://claude.ai) upload flow. The pre-commit hook regenerates the affected zip on every commit that touches a skill, so this should rarely need to be done by hand.

To do a full rebuild (e.g. after editing the hook itself, or to recover from a corrupt zip):

```bash
rm -rf zips && mkdir zips && for s in skills/datocms-*/; do
  n=$(basename "$s")
  (cd skills && zip -r "../zips/${n}.zip" "$n/" -x "${n}/agents/*")
done
```

The `-x "${n}/agents/*"` exclusion strips the Codex `agents/openai.yaml` files, which are not relevant to the claude.ai upload flow.

## Bumping plugin versions

Updates only propagate to installed Claude Code and Codex plugins when the plugin version changes. Bump the `version` field in **both**:

- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`

Without a version bump, Claude Code and Codex consider their cached copies up to date and will not fetch your changes. `npm --prefix dev run bump` (or `bump:minor`, `bump:major`) updates both manifests together.

## Releasing

1. Land all skill changes on `master` (the pre-commit hook keeps zips and validation in sync as you go).
2. Bump the plugin version in both manifests (see above).
3. Run the validator with `--require-clean-git`.
4. Tag and publish.

## Hosted MCP dependency

The hosted [DatoCMS MCP server](https://www.datocms.com/docs/mcp-server) reads two CMA references straight from this repo's `master` branch. Its `get_api_methods` tool returns [`records.md`](../skills/datocms-cma/references/records.md) as the overview of the `items` resource and [`editing-records.md`](../skills/datocms-cma/references/editing-records.md) as the overview of the `items/update` action, in place of generated text. So:

- A push to `master` changes what MCP users read, with no version bump or release. The server caches each file until it restarts.
- Don't move, rename or delete either file. The server requests the exact path and has no fallback, so a failed fetch makes those lookups error. The validator fails if either path is missing.
- The server drops every line that contains `cma:`. Put CLI-only hints (`cma:docs`, `cma:call`) on lines of their own that say they are for the CLI, so nothing else is dropped with them.
- [`dev/tests/optional-mcp.test.mjs`](../dev/tests/optional-mcp.test.mjs) checks that the `cma:` filter keeps the Markdown structure intact, that the TypeScript examples parse, and that the main workflow sections match a reviewed baseline. An intended change to one of those sections must be added to the test's reviewed corrections. Run `npm --prefix dev test` after editing either file.

## Codex readiness

For a structural checklist that confirms the repo is ready for Codex-local plugin use, see [`codex-readiness.md`](codex-readiness.md).

## Repo-internal helper skills

This repo ships dev-only helper skills (`eval-triggers`, `validate`) under both `.claude/skills/` and `.agents/skills/` so Claude Code and Codex can trigger them while working _on_ the repo. These must **not** be installed by end users.

The Claude Code and Codex plugin manifests (`.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`) already scope `skills` to `./skills/`, so plugin installs are clean. The `npx skills` CLI, however, walks every known skills directory in the cloned repo. To hide a skill from `npx skills` discovery, add this to its frontmatter:

```yaml
---
name: my-internal-skill
description: …
metadata:
  internal: true
---
```

`npx skills` checks `data.metadata?.internal === true` and skips the entry unless `INSTALL_INTERNAL_SKILLS=1` is set. Any new helper skill added under `.claude/skills/` or `.agents/skills/` must include this flag.

## Authoring rules for skills

- Each public skill lives at `skills/<skill-name>/SKILL.md` with a YAML frontmatter block followed by markdown body.
- Each skill ships a Codex agent interface config at `skills/<skill-name>/agents/openai.yaml` that **must stay synced** with the SKILL.md frontmatter. The validator checks this.
- Detailed reference docs go under `skills/<skill-name>/references/`.
- `datocms-setup` holds no implementation facts (no code, env var names, packages, commands or API facts beyond what a question needs). Every pointer is a relative link to a sibling file or heading (`../../datocms-<sibling>/references/<file>.md#<heading>`) or FW › `Heading` (present in all four framework references); the validator fails when one does not resolve. Renaming a linked sibling heading means updating the setup link in the same change.
- Every public skill needs a canonical eval fixture at `evals/fixtures/trigger/<skill-name>.json`. Results are committed only from a deliberate eval run (see [`evals/README.md`](../evals/README.md)).
