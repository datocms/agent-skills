_Internal recipe for `datocms-setup`. Use after parent skill selects `cli-profiles` recipe & queues prerequisites from `../../../references/recipe-manifest.json`._

# DatoCMS CLI Profiles Setup

Named profiles = managing **multiple DatoCMS projects from same repo**, typically blueprint + client projects (see `blueprint-sync`).

Same-project env separation (staging vs production) = DatoCMS environments (`--environment=<id>`, `--source` / `--destination`), NOT profiles. Parallel profiles at same `siteId` duplicate work + invite drift.

## Step 1: Detect Context (silent)

1. **Node project** — Check `package.json`
2. **Bootstrap state** — Confirm `datocms` npm package installed + active profile has `siteId` (owned by `cli-bootstrap`). If missing, surface `cli-bootstrap` as prerequisite + stop.
3. **Existing profiles** — Inspect `datocms.config.json` for `default` profile + named profiles.
4. **Migrations convention** — Check if repo has migrations convention via CLI config, `migrations/` dir, or package scripts.
5. **Environment files** — Check `.env.example`, `.env`, `.env.local`.
6. **Existing scripts** — Check `package.json` for `datocms:environments:list` or safe equivalent running `npx datocms environments:list`.

### Stop conditions

- Missing `package.json`? Stop — Node projects only.
- `datocms` not installed or default profile has no `siteId`? Stop — route to `cli-bootstrap`.
- Request is "add staging/production profiles" but user means same-project envs? Stop — point at DatoCMS environments.
- Repo has different profile scheme? Patch in place — don't normalize or remove.

## Step 2: Ask Questions

Ask one grouped question confirming multi-project intent:

> "These named profiles will layer on top of the OAuth-linked default and are meant for managing multiple DatoCMS projects (blueprint-sync). Staging/production of the same project belongs to DatoCMS environments (`--environment`), not profiles — confirm that's not what you need. Then tell me which profile ids to create. Recommended default: preserve any existing profile ids and add only the new ids you name. If the repo does not already have a clear migrations convention, should these new profiles inherit a migrations block or stay environment-only? Recommended default: preserve the repo's strongest existing migrations convention; if none exists, stay environment-only. If you skip, I'll follow those defaults and derive env-var names from the chosen profile ids."

## Step 3: Load References

Read only:

- `../../../../datocms-cli/references/cli-setup.md`
- `../../../../datocms-cli/references/environment-commands.md`

## Step 4: Generate Code

Generate only these changes:

1. **Patch `datocms.config.json`** — Add requested named profiles alongside existing OAuth-linked `default`. Each new profile uses `apiTokenEnvName` (default: `DATOCMS_<PROFILE_ID>_PROFILE_API_TOKEN` uppercased) + **no `siteId`** — points at different project.

2. **Patch `.env.example`** with token placeholder per named profile:

   ```env
   DATOCMS_BLUEPRINT_PROFILE_API_TOKEN=your_token_here
   DATOCMS_CLIENT_A_PROFILE_API_TOKEN=your_token_here
   ```

3. **Patch `package.json`** with `datocms:environments:list` only when no safe equivalent exists.

### Required behavior

- Preserve current `default` profile with `siteId` — never overwrite/remove.
- Include `migrations` block for new profiles only when repo has one clear migrations convention.
- Use profile id → env-var naming (e.g. `blueprint` → `DATOCMS_BLUEPRINT_PROFILE_API_TOKEN`) unless user asks for custom `apiTokenEnvName`.

### Mandatory rules

- Don't remove/rename existing profiles unless user asks
- Never point two profiles at same DatoCMS project (same `siteId`) — use DatoCMS environments (`--environment`)
- Don't generate one package script per profile
- Don't force local/staging/production naming
- Don't create multi-project rollout helpers
- Don't write tokens into config files

## Step 5: Install Dependencies

None — `datocms` npm package installed by `cli-bootstrap`.

## Step 6: Next Steps

After generating files, tell user:

1. Fill in per-profile tokens locally
2. Test each new profile with `npx datocms environments:list --profile=<id>`
3. Whether result is `scaffolded` or `production-ready`
4. Optional follow-up: `blueprint-sync` for shared multi-project rollout

## Verification Checklist

Before presenting, verify:

1. `datocms.config.json` preserves existing OAuth-linked `default` profile (`siteId` untouched)
2. Requested profile ids exist in config after patch, using `apiTokenEnvName` (not `siteId`) unless user explicitly wires them at different DatoCMS projects
3. `.env.example` contains per-profile token placeholders
4. `datocms:environments:list` added only when no safe equivalent exists
5. No one-script-per-profile expansion added
6. No new profile has `siteId` equal to existing profile's `siteId` (using profiles to simulate environments)
