# Permissions

Use this reference when a plugin change adds, removes, or depends on a DatoCMS plugin permission.

## Core rules

- Keep permissions minimal. Add only the capability the touched flow actually uses.
- Update `datoCmsPlugin.permissions` in `package.json` together with the runtime code path.
- Guard permission-dependent branches at runtime (for example, `ctx.currentUserAccessToken` can be missing).
- Keep the visible UI honest: disable, hide, or explain actions that are unavailable without the permission.

## `currentUserAccessToken`

Use `currentUserAccessToken` only when the plugin must call the CMA directly from the iframe. Pair it with:

1. the package.json permission
2. a runtime null check
3. a user-visible fallback when the token is unavailable

For private plugins, remember the plugin permissions tab in DatoCMS still needs to allow the capability for the installed plugin.

## Verification

- `package.json` permissions match the code paths that use them
- permission-gated UI branches degrade cleanly for users without the capability
- no unused broad permission was added
