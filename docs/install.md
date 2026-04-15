# Install Guide

Use the root [README](../README.md#install) for the fast local install commands.
This page keeps the deeper variants that are useful once you want something
other than the default "install the full set into my local skills folder".

## When To Use This Page

- You only want one skill instead of the full set.
- You want a detached copy instead of symlinks.
- You want the canonical path map for each shipped skill.
- You want details on the Claude Code plugin install.
- You want to understand how updates work.

## Claude Code Plugin Install

This repo ships both `.claude-plugin/marketplace.json` (marketplace registry)
and `.claude-plugin/plugin.json` (plugin manifest), so it can be installed as
a Claude Code plugin. This is the recommended approach for Claude Code users.

```bash
# Add the marketplace (once)
/plugin marketplace add marcelofinamorvieira/datocms-llm-skills

# Install the plugin
/plugin install datocms@datocms-skills
```

Skills are namespaced as `/datocms:<skill-name>` (e.g. `/datocms:datocms-cda`).

### Installation Scopes

Plugins can be installed at three scopes, each with different visibility and
persistence:

| Scope | Flag | Where it lives | Who sees it | Version-controlled? |
|-------|------|---------------|-------------|---------------------|
| **User** (default) | `--scope user` | `~/.claude/plugins/` | You, in every project | No |
| **Project** | `--scope project` | `.claude/plugins/` in the project root | Everyone who clones the repo | Yes |
| **Local** | `--scope local` | `.claude/plugins/` in the project root (gitignored) | Only you, only in this project | No |

```bash
# User scope (default) — available in all your projects on this machine
/plugin install datocms@datocms-skills --scope user

# Project scope — shared with the team via version control
# Good for teams that all use DatoCMS in the same repo
/plugin install datocms@datocms-skills --scope project

# Local scope — project-specific, gitignored
# Good for personal experimentation without affecting teammates
/plugin install datocms@datocms-skills --scope local
```

**Which scope should I use?**

- **Individual developer**: Use `user` (default). The DatoCMS skills are
  available in every project without any per-project setup.
- **Team standardization**: Use `project`. Every teammate who clones the repo
  gets the DatoCMS skills automatically.
- **Trying it out**: Use `local`. You can experiment without committing anything.

### Updates

Plugins are **cached locally** after installation. When the plugin is updated
upstream (new commit + version bump in `plugin.json`), users need to update
their local copy.

**Auto-update:** For third-party marketplaces (like this one), auto-update is
disabled by default. To enable it:

1. Run `/plugin` to open the plugin manager
2. Go to the **Marketplaces** tab
3. Select the `datocms-skills` marketplace
4. Choose **Enable auto-update**

Once enabled, Claude Code refreshes marketplace data at startup and prompts
you to run `/reload-plugins` when updates are available.

**Manual update:**

```bash
# Update the plugin to the latest version
claude plugin update datocms@datocms-skills

# Reload plugins in the current session
/reload-plugins
```

**Important:** If the plugin version number in `plugin.json` has not changed,
Claude Code considers the cached copy up to date and will not fetch changes.
Plugin authors must bump the version in `.claude-plugin/plugin.json` for
updates to propagate.

### Local Development

To test local changes during development without installing:

```bash
claude --plugin-dir /path/to/this/repo
```

After making changes, reload without restarting:

```bash
/reload-plugins
```

## Codex Plugin Install

This repo ships `.codex-plugin/plugin.json` and a repo-scoped marketplace entry
at `.agents/plugins/marketplace.json`, so it can be installed as a local Codex
plugin directly from the repo. This is the recommended approach for Codex users
working on or validating this repository.

Inside a Codex session from this repo, open the plugin picker:

```
/plugins
```

Choose the **DatoCMS Local Plugins** marketplace and install `datocms`. All 8
skills are bundled into the plugin automatically. If the repo marketplace is
not visible yet, restart Codex and open `/plugins` again.

### Updates

The repo marketplace points to the local repo for development. After changing
plugin files, restart Codex and reinstall or refresh the local plugin if the
cached copy has not updated yet.

For published distribution, keep the plugin version in
`.codex-plugin/plugin.json` bumped whenever you want downstream installs to
pick up changes.

### Fallback: `$skill-installer`

If the Plugin Directory is not available or you prefer manual control, use the
`$skill-installer` approach described in the
[README](../README.md#codex-fallback--skill-installer). The `$skill-installer`
copies skill files into `~/.codex/skills/` as frozen snapshots with no
auto-update.

## Single-Skill Install

If you only need one skill, link just that folder by its canonical name.

Example:

```bash
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
skills_dir="${CODEX_HOME:-$HOME/.codex}/skills"

mkdir -p "$skills_dir"
ln -sfn "$repo_root/skills/datocms-cda" "$skills_dir/datocms-cda"
```

The folder names inside `skills/` match each skill's `name:` field, so the repo
path and the canonical skill name stay aligned.

## Detached Snapshot Install

If you want a copy that still works after the repo is moved or deleted, copy the
skill folders instead of symlinking them.

Example:

```bash
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
skills_dir="${CODEX_HOME:-$HOME/.codex}/skills"

mkdir -p "$skills_dir/datocms-cda"
cp -R "$repo_root/skills/datocms-cda/." "$skills_dir/datocms-cda"
```

## Canonical Skill Paths

- `skills/datocms-cda`
- `skills/datocms-cli`
- `skills/datocms-cma`
- `skills/datocms-frontend-integrations`
- `skills/datocms-plugin-builder`
- `skills/datocms-plugin-design-system`
- `skills/datocms-plugin-scaffold`
- `skills/datocms-setup`

`datocms-setup` already contains its internal recipes, shared references, and
recipe-local scripts/assets, so there is no second setup bundle to install.
