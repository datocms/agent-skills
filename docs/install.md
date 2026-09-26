# Install Guide

Use the root [README](../README.md#install) for the fast local install commands. This page keeps the deeper variants that are useful once you want something other than the default "install the full set into my local skills folder".

## When To Use This Page

- You only want one skill instead of the full set.
- You want a detached copy instead of symlinks.
- You want the canonical path map for each shipped skill.
- You want details on the Claude Code plugin install.
- You want to understand how updates work.
- You want to use skills with an optional remote MCP connection.

## Skills and Remote MCP

Installing these skills does not install or require an MCP server. Standalone CLI and CMA-client workflows remain available. For live reads or content operations, the CMA skill honors an explicit route; otherwise it keeps a usable CLI workflow and can use current remote MCP when appropriate. It does not bootstrap CLI just to displace a working remote connection.

Connect remote MCP separately using the [current DatoCMS setup guide](https://www.datocms.com/docs/mcp-server). For a confirmed legacy installation, stop using that server and follow the current setup guide; these skills do not execute or repair legacy servers. A connection error alone does not identify a legacy installation. An existing usable CLI route remains available, subject to the user's chosen route and target.

Skills must be enabled in the client running the conversation. A local coding-agent installation does not automatically upload skills to Claude chat or a ChatGPT workspace, and installing skills does not grant connector access. For Claude chat, upload and enable the [provided ZIPs](../README.md#claudeai-and-claude-desktop-chat); configure and authorize remote MCP separately. In other clients, use their supported skill installation and MCP connection paths.

Content-modeling advice needs no authentication. Live content work needs an authorized project connection; migrations and repo configuration still require local artifacts and CLI support. Schema changes retain the same migration choice and target-confirmation safeguards whichever route is used.

## Claude Code Plugin Install

This repo ships both `.claude-plugin/marketplace.json` (marketplace registry) and `.claude-plugin/plugin.json` (plugin manifest), so it can be installed as a Claude Code plugin. This is the recommended approach for Claude Code users.

```bash
# Add the marketplace (once)
/plugin marketplace add datocms/agent-skills

# Install the plugin
/plugin install datocms@datocms-skills
```

Skills are namespaced as `/datocms:<skill-name>` (e.g. `/datocms:datocms-cda`).

### Installation Scopes

In a session, `/plugin install datocms@datocms-skills` opens the plugin's details in the `/plugin` panel, where you choose the scope. From a shell, `claude plugin install datocms@datocms-skills` installs at user scope; pass `--scope project` or `--scope local` for the others.

| Scope | Recorded in | Who gets it |
| - | - | - |
| **User** | `enabledPlugins` in `~/.claude/settings.json` | You, in every project on this machine |
| **Project** | `.claude/settings.json`, which you commit | Everyone working in the repo, once they trust the folder. Also run `claude plugin marketplace add datocms/agent-skills --scope project` so the committed file declares the marketplace too |
| **Local** | `.claude/settings.local.json` | You, in this repo only |

Local overrides project, and project overrides user. See [Choose an install scope](https://code.claude.com/docs/en/plugins/install#choose-an-install-scope).

### Updates

Plugins are **cached locally** after installation. When the plugin is updated upstream (new commit + version bump in `plugin.json`), users need to update their local copy.

**Auto-update:** For third-party marketplaces (like this one), auto-update is disabled by default. To enable it:

1. Run `/plugin` to open the plugin manager
2. Go to the **Marketplaces** tab
3. Select the `datocms-skills` marketplace
4. Choose **Enable auto-update**

Once enabled, Claude Code updates the plugin in the background during a session; run `/reload-plugins` to use the new version right away, or it loads in your next session.

**Manual update:**

```bash
# Update the plugin to the latest version
claude plugin update datocms@datocms-skills

# Reload plugins in the current session
/reload-plugins
```

**Important:** If the plugin version number in `plugin.json` has not changed, Claude Code considers the cached copy up to date and will not fetch changes. Plugin authors must bump the version in `.claude-plugin/plugin.json` for updates to propagate.

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

This repo ships `.codex-plugin/plugin.json` and a repo-scoped marketplace entry at `.agents/plugins/marketplace.json`, so it can be installed as a local Codex plugin directly from the repo. This is the recommended approach for Codex users working on or validating this repository.

Inside a Codex session from this repo, open the plugin picker:

```
/plugins
```

Choose the **DatoCMS** marketplace and install `datocms`. The shipped skills are bundled into the plugin automatically. If the repo marketplace is not visible yet, restart Codex and open `/plugins` again.

To install from GitHub without cloning the repo, add it as a Git marketplace and install the plugin from it:

```bash
codex plugin marketplace add datocms/agent-skills
codex plugin add datocms@datocms-local
```

Codex refreshes Git marketplaces in the background, so installs from GitHub pick up new releases without reinstalling. Run `codex plugin marketplace upgrade datocms-local` to refresh immediately.

### Updates

The repo marketplace points to the local repo for development. After changing plugin files, restart Codex and reinstall or refresh the local plugin if the cached copy has not updated yet.

For published distribution, keep the plugin version in `.codex-plugin/plugin.json` bumped whenever you want downstream installs to pick up changes.

### Fallback: `$skill-installer`

Without the plugin, Codex's built-in `$skill-installer` installs a skill from its GitHub URL, such as `https://github.com/datocms/agent-skills/tree/master/skills/datocms-cda`, into `~/.codex/skills/<skill-name>` as a frozen snapshot with no auto-update. Keep `master` in the URL, because the installer otherwise assumes `main`. Install every skill, since they link to each other.

## Single-Skill Install

If you only need one skill, link just that folder by its canonical name.

Example:

```bash
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
skills_dir="${CODEX_HOME:-$HOME/.codex}/skills"

mkdir -p "$skills_dir"
ln -sfn "$repo_root/skills/datocms-cda" "$skills_dir/datocms-cda"
```

The folder names inside `skills/` match each skill's `name:` field, so the repo path and the canonical skill name stay aligned.

`datocms-structured-text` supports local document work independently. Record persistence, GraphQL reads, framework rendering, and plugin form writes use companion skills only when requested. If a referenced companion is absent, install that skill from `datocms/agent-skills` or update the full bundle before continuing the dependent portion.

`datocms-setup` does not work alone: it holds only the guided conversation and links to the sibling skills for every implementation step, so install it with the full set.

## Detached Snapshot Install

If you want a copy that still works after the repo is moved or deleted, copy the skill folders instead of symlinking them.

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
- `skills/datocms-structured-text`
- `skills/datocms-content-modeling`
- `skills/datocms-frontend-integrations`
- `skills/datocms-feedback`
- `skills/datocms-plugin`
- `skills/datocms-setup`

`datocms-setup` links to the sibling skill folders by relative path, so keep them installed next to it under the same parent folder.
