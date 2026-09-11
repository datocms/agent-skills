# Install the DatoCMS skill

Every supported installation installs the self-contained `datocms` directory. Its detailed guidance is loaded only when relevant. Start with the [README](../README.md#install) for the shortest commands.

## Universal installer

```bash
npx skills add datocms/agent-skills --skill datocms
```

The installer prompts for agents and scope. Add `--global` for a global installation or select the project scope. Use `npx skills update` for subsequent updates.

## Plugin installations

The plugin remains `datocms` in the `datocms-skills` marketplace. Install it with:

```text
/plugin marketplace add datocms/agent-skills
/plugin install datocms@datocms-skills
```

For Claude Code, the namespaced skill is `/datocms:datocms`. Choose `--scope user`, `--scope project`, or `--scope local` when installing if you need a specific scope. Manage updates through the plugin manager or `claude plugin update datocms@datocms-skills`.

For Codex, add the marketplace using `codex plugin marketplace add datocms/agent-skills`, then install DatoCMS through `/plugins`. The repository also keeps its local development marketplace and symlinked plugin package for testing from a checkout.

The plugin manifests both discover `./skills/`. Update the existing plugin rather than installing the old individual skills alongside it.

## Detached installation

Copy the entire `skills/datocms/` directory into your agent's supported skills location, preserving all descendants. Copying only `SKILL.md` leaves out required references and recipes. A detached copy is a snapshot; replace it from the same source when updating.

[datocms.zip](../zips/datocms.zip) contains one top-level `datocms/` directory with the same files. Extract it into the supported skills location or upload it through a client's skill archive interface. Shell-based workflows still require a host that can run commands and access the project.

## Upgrading from version 1

1. If you installed the plugin, update it through your plugin manager and reload the session. Keep the existing plugin and marketplace names.
2. If you installed standalone skills, remove the old DatoCMS entries from the same scope and agents where they were installed. For `npx skills` installations, use:

   ```bash
   npx skills remove datocms-cda datocms-cli datocms-cma datocms-content-modeling datocms-frontend-integrations datocms-plugin datocms-setup datocms-feedback
   ```

   Add `--global` if the old installation was global. Review the selected entries before confirming removal. Preserve any personal edits separately.
3. Install the unified skill with `npx skills add datocms/agent-skills --skill datocms` in the intended scope.
4. Verify that the client exposes one DatoCMS skill. Update project instructions or saved prompts that explicitly name old skills to use `datocms`.

The old names are retired; they are not compatibility aliases. Setup no longer requires a special invocation. Asking to set something up is sufficient, and the workflow remains scoped to the requested outcome.

Upgrade the DatoCMS CLI before using reference retrieval after the repository migration. Updated versions accept both the canonical `datocms agents:reference datocms cma/editing-records` form and legacy command spellings. Old binaries that hard-code removed GitHub paths cannot be repaired by a plugin update.

## Local development

Use `claude --plugin-dir /path/to/agent-skills` to load a checkout, or the repository's local plugin marketplace in Codex. Reload the plugin after edits. Internal validation and evaluation helper skills are development tools and are not part of the distributed package.
