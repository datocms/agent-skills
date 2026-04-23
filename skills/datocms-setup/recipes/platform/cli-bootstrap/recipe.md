_Internal recipe for `datocms-setup`. Use this file only after the parent skill selects the `cli-bootstrap` recipe and queues any prerequisites from `../../../references/recipe-manifest.json`._


# DatoCMS CLI Bootstrap

You are an expert at wiring a repo to its DatoCMS project so every
subsequent CLI command and CMA operation authenticates transparently
through OAuth.

This recipe is the canonical "CLI + link" bootstrap. Every recipe that
needs the CLI (`migrations`, `cma-types`, `contentful-import`,
`wordpress-import`, `cli-profiles`, and everything that depends on
them) declares this recipe as a prerequisite. Keep this recipe
single-purpose: install the CLI, make sure an OAuth session exists,
and link the current directory to the right DatoCMS project. Do not
create migration directories, `.env` placeholders, or package scripts
here — those belong to the downstream recipes.

Follow these steps in order. Do not skip steps.

---

## Step 1: Detect Context (silent)

Silently examine the project:

Follow the shared repo inspection conventions in `../../../references/repo-conventions.md`, then inspect the recipe-specific signals below.

1. **Node project** — Check for `package.json`. If missing, stop and
   explain that this recipe targets Node projects only.
2. **CLI installation** — Check `package.json` for `datocms` in
   `devDependencies` or `dependencies`.
3. **Existing CLI config** — Check for `datocms.config.json` in the
   repo root.
4. **Linked state** — Inspect the active profile (default unless a
   different profile is in scope) for a `siteId`. A `siteId` means the
   profile is linked via OAuth; its absence (or an
   `apiTokenEnvName`-only profile) means this recipe still has work to
   do.
5. **OAuth session** — Run `npx datocms whoami` to confirm an account
   is authenticated. Treat a non-zero exit or an "Not logged in" message
   as "no session".
6. **Environment files** — Check `.env.example`, `.env`, and
   `.env.local`. Do not modify them in this recipe. Any
   token-in-env scaffolding belongs to downstream recipes that run in
   unattended contexts.

### Stop conditions

- If `package.json` is missing, stop.
- If the active profile already has a valid `siteId` and `npx datocms
  whoami` succeeds, the project is already bootstrapped — report that
  back and exit without changes.

---

## Step 2: Ask Questions

Follow the zero-question default and question-format rules in `../../../patterns/MANDATORY_RULES.md`.

Ask only when `npx datocms projects:list` returns more than one
candidate and the user intent does not clearly identify a single
project. Never silently pick a fuzzy-match winner — wiring the repo to
the wrong DatoCMS project is hard to detect later and causes silent
corruption of work.

When you do ask, keep it narrow:

> "I can see N projects in your DatoCMS account. Which one should I link this repo to?"

Present the candidates as a numbered list with `id`, `name`, `domain`,
and workspace (`Personal account` or org name). Include an "I want to
pick a different one / cancel" escape hatch.

If only one candidate matches the user's hint, proceed without asking.

---

## Step 3: Load References

Read only these references:

- `../../../../datocms-cli/references/cli-setup.md`

---

## Step 4: Drive the bootstrap

Unlike feature recipes, this recipe's "generate" step is a sequence of
CLI invocations, not file writes. The DatoCMS CLI itself is responsible
for writing `datocms.config.json` when `link` succeeds.

### Required actions

1. **Install `datocms`** if it is missing. Use the project's
   package manager (see `../../../patterns/MANDATORY_RULES.md`). Install
   as a `devDependency` — the CLI is a development-time tool.
2. **Ensure an OAuth session exists.** If `npx datocms whoami` fails,
   instruct the user to run `npx datocms login` themselves. This is the
   one step the agent cannot drive: it opens a browser for OAuth and
   requires an interactive terminal. Wait for the user to confirm
   before continuing.
3. **Discover accessible projects.** Run
   `npx datocms projects:list [hint] --json`, using the best hint
   available from conversation context (project name, domain). Parse the
   JSON output.
4. **Pick the right project.**
   - One result → proceed.
   - Multiple results → ask the user (see Step 2).
   - Zero results with a hint → retry without the hint; if still empty,
     surface the full list and ask.
5. **Link the project.** Run `npx datocms link --site-id=<ID>`, adding
   `--organization-id=<ID>` when the picked project belongs to an
   organization. With `--site-id` set and OAuth credentials present,
   `link` runs without prompts and writes `datocms.config.json` with the
   default profile populated (`siteId`, `organizationId`, `logLevel:
   NONE`, and default migrations values — downstream recipes may
   customize these).

### Mandatory rules

- Do not write `datocms.config.json` manually — always drive it through
  `datocms link`. Writing the file by hand bypasses project validation
  and is error-prone.
- Do not add any CMA token placeholder to `.env.example` in this recipe.
- Do not create a `migrations/` directory in this recipe.
- Do not patch `package.json` scripts in this recipe.
- Never silently auto-pick when `projects:list` returns multiple
  candidates. Present the list and let the user choose.
- Do not attempt to run `datocms login` on the user's behalf — it
  requires an interactive browser flow.

---

## Step 5: Install Dependencies

Install only:

- `datocms` (devDependency)

No other package is added by this recipe.

---

## Step 6: Next Steps

After the project is linked, report to the user:

1. `datocms.config.json` is now linked to `<project name>` (`<domain>`).
2. From here every CLI command (`cma:call`, `cma:script`, `cma:docs`,
   `migrations:*`, `schema:generate`, `environments:*`, ...) resolves
   the project's token automatically through OAuth. No env var, no
   token in chat.
3. Whether the result is `scaffolded` (user still needs to run
   `datocms login` once before the CLI works) or `production-ready`
   (login was already in place, link succeeded).
4. Optional follow-up recipe ids:
   - `migrations` — add the CLI migrations workflow on top of this bootstrap.
   - `cma-types` — generate typed CMA schema definitions.
   - `cli-profiles` — add extra named profiles when the repo manages multiple DatoCMS projects (e.g. blueprint + client projects).

Follow the shared final handoff rules in `../../../patterns/OUTPUT_STATUS.md`, including an explicit `Unresolved placeholders` section.

---

## Verification Checklist

Before presenting the result, verify:

1. `datocms` is present in `package.json` (devDependencies).
2. `datocms.config.json` exists and the active profile has a `siteId`.
3. The `siteId` belongs to the project the user intended (if ambiguity
   was possible, confirm that the user explicitly picked it).
4. No `.env.example`, `.env`, or `package.json` scripts were modified
   by this recipe.
5. If `datocms login` has not been run yet, the handoff note clearly
   states it is the user's next step and tags the result as `scaffolded`.
