# Mandatory Rules

These rules apply to every datocms-setup recipe. They are not repeated in individual recipe files. Run each recipe's steps in order; skip none.

## Contents

- TypeScript Strictness
- File Conflict Handling
- Shared Repo Inspection Defaults
- Framework Environment Variable Conventions
- Dependency Installation
- Zero Questions Default
- Question Format
- Project Link or Create
- Execution Route

## TypeScript Strictness

- **Never** use `as unknown as SomeType` — this is a forbidden anti-pattern
- Avoid `as SomeType` casts — use type guards or fix upstream types instead
- Prefer `import type { ... }` for type-only imports
- Let TypeScript infer types wherever possible — do not add redundant annotations

## File Conflict Handling

- Always read existing files before writing — never blindly overwrite
- Make targeted additions to existing files instead of full replacements
- Preserve existing imports, exports, and surrounding code
- If an existing setup is materially different, patch in place by default
- Only ask about full replacement when the current setup is clearly incompatible or the user explicitly asked for a rewrite

## Shared Repo Inspection Defaults

Follow `../references/repo-conventions.md` once per setup bundle for framework, layout, package manager, env files and existing code ownership. Recipes add only their task-specific checks.

## Framework Environment Variable Conventions

| Framework | Public prefix | Server-only | File |
| - | - | - | - |
| Next.js | `NEXT_PUBLIC_` | no prefix | `.env.local` |
| Nuxt | `NUXT_PUBLIC_` (runtime) | `NUXT_` (runtime) | `.env` |
| SvelteKit | `PUBLIC_` | no prefix | `.env` |
| Astro | `PUBLIC_` | no prefix | `.env` |

- Add variables to `.env.example` (with placeholder values) and the actual env file
- Never commit real tokens — use placeholder values in examples

## Dependency Installation

Detect the project's package manager before installing:

1. `pnpm-lock.yaml` -> `pnpm add`
2. `yarn.lock` -> `yarn add`
3. `bun.lock` / `bun.lockb` -> `bun add`
4. Otherwise -> `npm install`

Always install DatoCMS packages as regular dependencies (not devDependencies) unless the package is CLI-only.

## Zero Questions Default

Ask zero questions by default for straightforward frontend rendering or foundation setup when the repo already answers the important decisions. Proceed with sensible defaults and call out assumptions.

For operational recipes — especially migrations, imports into existing targets, and platform automation that can affect production workflows — ask the minimum clarification set needed when the repo cannot safely answer the critical questions.

Only ask when a safe implementation is blocked by something the repo cannot answer, such as:

- Missing model-to-route mappings required for correctness
- Ambiguous existing setup where patching the wrong file would break things
- Missing external service credentials that have no reasonable default
- Operational choices the repo cannot infer safely, such as release profiles, destructive importer tolerance, or whether to preserve an existing CLI convention

## Question Format

- Infer first from the repo, then ask only the smallest high-impact follow-up
- Default to one concise question unless the recipe explicitly calls for one grouped pass
- For implementation choices within a clear goal, put the supported recommended/default path first and explain what happens if the user skips
- If an implementation question is skipped, preserve the strongest existing owner or the documented safe default and record unresolved assumptions under `Unresolved placeholders`
- An unanswered goal or required target has no default: keep dependent work pending and state what input is missing

### Structured questions

Use an available structured-question tool when permitted by the current mode, following its actual schema and limits. For example, use `AskUserQuestion` or `request_user_input` when available and allowed; do not assume identical fields or capabilities. If a tool requires a recommended/default answer when none is justified, use the plain-text fallback for that question.

- Give each decision concrete options with a short label and one sentence explaining the result; adapt the number of options to the tool's limits
- When supported, use a short header naming the decision, e.g. `"Edit mode"`, `"Realtime"`, `"Index shape"`
- Label a justified recommendation `(Recommended)` and describe any safe skip default; a preselected option is not a submitted answer
- Use multiple selection only when the tool supports it and the choices are compatible
- Group related unresolved decisions within the tool's question limit; omit decisions already answered

Example for `AskUserQuestion` — visual-editing follow-up when both decisions remain unresolved (adapt to other tools' schemas):

```
questions: [
  {
    question: "Which editing modes should I set up?",
    header: "Edit mode",
    options: [
      { label: "Both (Recommended)", description: "Website click-to-edit overlays + side-by-side editing inside DatoCMS" },
      { label: "Website click-to-edit only", description: "Content Link overlays on your live site, no side-by-side panel" },
      { label: "Side-by-side only", description: "Preview panel inside DatoCMS editor, no website overlays" }
    ],
    multiSelect: false
  },
  {
    question: "Enable real-time updates while editors type?",
    header: "Realtime",
    options: [
      { label: "No (Recommended)", description: "Editors reload the preview manually. Simpler setup, fewer moving parts." },
      { label: "Yes", description: "Preview updates live as editors type. Requires an SSE subscription per page." }
    ],
    multiSelect: false
  }
]
```

### Plain-text fallback

When no suitable question tool is available or permitted, present the same choices as a concise numbered list in plain text. Explain each outcome and label a recommendation only when justified. If interaction is unavailable, report the missing input and continue only work that does not depend on it.

## Project Link or Create

Triggered during implementation by the SKILL.md greenfield gate: no `package.json`, no `datocms.config.json`, and project existence is still unknown. Reuse an existing project established by the user. Planning or choosing a preview outcome does not require linking, creating, or accessing a repository. Ask one structured question with `header: "Project"` only when this gate applies:

> "Do you already have a DatoCMS project, or should we create a new one?"

1. **Link existing project** — bootstrap the Node project per the requested lane, then route to `cli-bootstrap`.
2. **Create new project** — direct user to `https://dashboard.datocms.com/` (canonical; never `dato.com` or marketing/invented domains). Wait for explicit confirmation the project exists, then queue `datocms-content-modeling` for model design _before_ any frontend recipe (models must exist before queries). After modeling → `cli-bootstrap`.

Neither option is universally recommended — agent can't infer which applies. Do **not** append `(Recommended)` or set a default-on-skip — overrides the general "put recommended first" rule above. Order: "Link existing" first (more common), "Create new" second.

## Execution Route

Use **datocms-cli** for migrations, repo linking, profiles, and recipe steps requiring local CLI artifacts. Bootstrap only when selected local workflow requires it.

For live project reads or direct CMA operations, follow **datocms-cma** route selection; a working current remote MCP connection is optional. Don't install CLI solely to replace it. Preserve recipe prerequisites and schema authorization safeguards whichever route executes live operations.

Remote MCP doesn't create local config or migration files. Keep these CLI steps when required; modeling advice alone needs neither route.
