_Internal recipe for `datocms-setup`. Use this file only after the parent skill selects the `migrations` recipe and queues any prerequisites from `../../../references/recipe-manifest.json`._

# DatoCMS Migrations Setup

You are an expert at setting up DatoCMS CLI migrations in existing projects. This recipe creates the minimum migrations baseline on top of an already-linked project. It does **not** install the CLI or link a project — that is the job of the `cli-bootstrap` prerequisite recipe.

Follow these steps in order. Do not skip steps.

---

## Step 1: Detect Context (silent)

Silently examine the project:

Follow the shared repo inspection conventions in `../../../references/repo-conventions.md`, then inspect the recipe-specific signals below.

1. **Node project** — Check for `package.json`. If missing, stop and tell the user this skill expects a JavaScript or TypeScript project with a package manifest.
2. **Bootstrap state** — Check that the `datocms` npm package is installed and that `datocms.config.json` exists with a `siteId` in the active profile. If either is missing, surface `cli-bootstrap` as an unmet prerequisite and stop — do not install the CLI or touch `datocms.config.json` from this recipe.
3. **Migrations directory** — Check for `migrations/`.
4. **TypeScript** — Check for `tsconfig.json`.
5. **Scripts** — Check `package.json` for `datocms:migrations:run`, `datocms:migrations:dry-run`, and `datocms:environments:list`.

### Stop conditions

- If `package.json` is missing, stop and explain that this setup targets Node projects only.
- If the repo already has a materially different multi-profile CLI setup, patch in place by default and only ask if adopting the single-project baseline would override working behavior.
- If `datocms` is not installed or the active profile has no `siteId`, stop and route back to the `cli-bootstrap` recipe.

---

## Step 2: Ask Questions

Infer first from the repo.

Follow the zero-question default and question-format rules in `../../../patterns/MANDATORY_RULES.md`.

If you do ask, make it one concise question, put the recommended/default path first, and explain whether skipping it will leave placeholders, ownership, or project-specific values unresolved.

Only ask if the existing `datocms.config.json` clearly uses multiple profiles, custom migration directories, a custom migration template, a custom migrations tsconfig, or other working conventions that would be changed by the single-project baseline.

When you do ask, keep it narrow: confirm whether the current convention should be preserved in place or whether the repo wants to normalize to the default single-project baseline.

---

## Step 3: Load References

Read only these references:

- `../../../../datocms-cli/references/cli-setup.md`
- `../../../../datocms-cli/references/creating-migrations.md`
- `../../../../datocms-cli/references/running-migrations.md`

---

## Step 4: Generate Code

Make the minimum project changes needed for a working migrations workflow on top of the linked project.

### Required project changes

1. **Patch `datocms.config.json`** to add a `migrations` block to the active profile (created by `cli-bootstrap`):
   - `migrations.directory: "./migrations"`
   - `migrations.modelApiKey: "schema_migration"` Preserve `siteId`, `organizationId`, `logLevel`, and any existing fields.
2. **Create `migrations/`** if it does not exist.
3. **Patch `package.json` scripts** so it includes exactly these helpers:
   - `datocms:migrations:run`
   - `datocms:migrations:dry-run`
   - `datocms:environments:list`

### Mandatory rules

- Use `npx datocms` in generated scripts
- Preserve existing scripts and merge changes in place
- Do not install the `datocms` npm package — `cli-bootstrap` owns that
- Do not create or modify `datocms.config.json`'s `siteId` / `organizationId` / `apiTokenEnvName` — those are owned by `cli-bootstrap` (or, for CI-specific profiles, by `cli-profiles`)
- Do not write `DATOCMS_API_TOKEN=...` (or any CMA token placeholder) to `.env.example` — the linked default profile resolves the token via OAuth at runtime. Token-in-env setup belongs to CI-specific recipes, not the interactive migrations baseline.
- Do not create a custom migration template file
- Do not create a migrations-specific tsconfig file
- Do not add CI files
- Do not create multiple CLI profiles

---

## Step 5: Install Dependencies

No new dependencies in this recipe — the `datocms` npm package is installed by `cli-bootstrap`.

---

## Step 6: Next Steps

After generating the files, tell the user:

1. Create the first migration with the format that matches the repo:

   - If TypeScript is detected, use:

   ```bash
   npx datocms migrations:new "describe the change" --ts
   ```

   - If JavaScript is the repo convention, omit `--ts`.

2. Dry-run before applying:

   ```bash
   npm run datocms:migrations:dry-run
   ```

3. Optional follow-up recipe id: `migration-release-workflow` for a repeatable production rollout flow (may introduce CI-specific env token for unattended execution).

4. Optional follow-up recipe id: `blueprint-sync` when they need one migration history shared across multiple DatoCMS projects.

---

## Verification Checklist

Before presenting the result, verify:

1. `datocms.config.json` active profile has both the `siteId` (from `cli-bootstrap`) and the new `migrations` block
2. `migrations/` exists
3. `package.json` contains the three required helper scripts
4. No `DATOCMS_API_TOKEN` placeholder was written to `.env.example` by this recipe
5. No custom template, custom tsconfig, CI file, or multi-profile config was added by default
