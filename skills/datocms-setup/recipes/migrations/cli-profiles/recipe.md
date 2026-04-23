_Internal recipe for `datocms-setup`. Use this file only after the parent skill selects the `cli-profiles` recipe and queues any prerequisites from `../../../references/recipe-manifest.json`._


# DatoCMS CLI Profiles Setup

You are an expert at adding named DatoCMS CLI profiles on top of the
OAuth-linked default created by `cli-bootstrap`. Named profiles exist for one
reason: **managing multiple DatoCMS projects from the same repo**, typically
a blueprint plus its client projects (see `blueprint-sync`).

Same-project environment separation (staging vs production of one project)
belongs to DatoCMS environments (`--environment=<id>`, `--source` /
`--destination` on migration commands), not to profiles. Parallel profiles
pointing at the same `siteId` duplicate work and invite drift.

Follow these steps in order. Do not skip steps.

---

## Step 1: Detect Context (silent)

Silently examine the project:

Follow the shared repo inspection conventions in `../../../references/repo-conventions.md`, then inspect the recipe-specific signals below.

1. **Node project** — Check for `package.json`
2. **Bootstrap state** — Confirm the `datocms` npm package is installed and that the
   active profile has a `siteId` (owned by `cli-bootstrap`). If missing,
   surface `cli-bootstrap` as an unmet prerequisite and stop.
3. **Existing profiles** — Inspect `datocms.config.json` for a `default`
   profile and any named profiles.
4. **Migrations convention** — Check whether the repo already has a clear
   migrations convention through existing CLI config, a `migrations/`
   directory, or package scripts.
5. **Environment files** — Check `.env.example`, `.env`, and `.env.local`.
6. **Existing scripts** — Check `package.json` for `datocms:environments:list`
   or another safe equivalent that already runs `npx datocms environments:list`.

### Stop conditions

- If `package.json` is missing, stop and explain that this setup targets Node
  projects only.
- If `datocms` is not installed or the default profile has no `siteId`,
  stop and route back to `cli-bootstrap`.
- If the request is "add staging/production profiles" and the user really
  means "separate environments of the same project", stop and point them at
  DatoCMS environments instead.
- If the repo already has a materially different profile scheme, patch it in
  place by default instead of normalizing names or removing profiles.

---

## Step 2: Ask Questions

Ask one grouped question that also confirms the intent is multi-project and
not "staging/production of the same project":

> "These named profiles will layer on top of the OAuth-linked default and are meant for managing multiple DatoCMS projects (blueprint-sync). Staging/production of the same project belongs to DatoCMS environments (`--environment`), not profiles — confirm that's not what you need. Then tell me which profile ids to create. Recommended default: preserve any existing profile ids and add only the new ids you name. If the repo does not already have a clear migrations convention, should these new profiles inherit a migrations block or stay environment-only? Recommended default: preserve the repo's strongest existing migrations convention; if none exists, stay environment-only. If you skip, I'll follow those defaults and derive env-var names from the chosen profile ids."

---

## Step 3: Load References

Read only these references:

- `../../../../datocms-cli/references/cli-setup.md`
- `../../../../datocms-cli/references/environment-commands.md`

---

## Step 4: Generate Code

Generate only these project changes:

1. **Patch `datocms.config.json`** to add the requested named profiles
   alongside the existing OAuth-linked `default`. Each new profile uses
   `apiTokenEnvName` (default naming: `DATOCMS_<PROFILE_ID>_PROFILE_API_TOKEN`
   uppercased) and **no `siteId`** — it points at a different project, not a
   different environment of the default one.
2. **Patch `.env.example`** with one token placeholder per named profile:

   ```env
   DATOCMS_BLUEPRINT_PROFILE_API_TOKEN=your_token_here
   DATOCMS_CLIENT_A_PROFILE_API_TOKEN=your_token_here
   ```

3. **Patch `package.json`** with `datocms:environments:list` only when no safe
   equivalent already exists.

### Required behavior

- Preserve the current `default` profile with its `siteId` — never overwrite
  or remove it.
- Only include a `migrations` block for new profiles when the repo already has
  one clear migrations convention.
- Use the profile id → env-var naming convention (e.g. profile `blueprint` →
  `DATOCMS_BLUEPRINT_PROFILE_API_TOKEN`) unless the user asks for a custom
  `apiTokenEnvName`.

### Mandatory rules

- Do not remove or rename existing profiles unless the user explicitly asks
- Never point two profiles at the same DatoCMS project (same `siteId`) —
  environments of one project are the job of DatoCMS environments
  (`--environment`), not of named profiles.
- Do not generate one package script per profile
- Do not force a fixed local, staging, production naming convention
- Do not create multi-project rollout helpers in this setup
- Do not write tokens into config files

---

## Step 5: Install Dependencies

No new dependencies in this recipe — the `datocms` npm package is installed by
`cli-bootstrap`.

---

## Step 6: Next Steps

After generating the files, tell the user:

1. Fill in the per-profile tokens locally
2. Test each new profile with `npx datocms environments:list --profile=<id>`
3. Whether the result is `scaffolded` or `production-ready`
4. Optional follow-up recipe id: `blueprint-sync` when they want shared
   multi-project rollout from one migration history

Follow the shared final handoff rules in `../../../patterns/OUTPUT_STATUS.md`, including an explicit `Unresolved placeholders` section.

---

## Verification Checklist

Before presenting the result, verify:

1. `datocms.config.json` preserves the existing OAuth-linked `default` profile (`siteId` untouched)
2. Requested profile ids exist in config after the patch, using `apiTokenEnvName` (not `siteId`) unless the user explicitly wires them at different DatoCMS projects
3. `.env.example` contains the per-profile token placeholders
4. `datocms:environments:list` is added only when no safe equivalent exists
5. No one-script-per-profile expansion was added
6. No new profile was given a `siteId` equal to an existing profile's `siteId` (that would mean using profiles to simulate environments)
